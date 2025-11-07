import { useState, useEffect } from 'react';
import { InventoryItem } from '@invenflow/shared';
import {
  CubeIcon,
  TagIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatters';
import { ValidationImageDisplay } from './ValidationImageDisplay';
import { MovementModal } from './MovementModal';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';

interface InventoryGridProps {
  items: InventoryItem[];
  loading: boolean;
  viewMode: 'unified' | 'by-kanban';
  onProductClick: (item: InventoryItem) => void;
}

export function InventoryGrid({ items, loading, viewMode, onProductClick }: InventoryGridProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedProductForMove, setSelectedProductForMove] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: true });
  }, [fetchLocations, fetchPersons]);

  const handleImageError = (itemId: string) => {
    setImageErrors(prev => new Set(prev).add(itemId));
  };

  const handleMoveClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation(); // Prevent card click
    setSelectedProductForMove(item);
    setIsMovementModalOpen(true);
  };

  const handleMovementSuccess = () => {
    setSelectedProductForMove(null);
    // The parent component will refresh the inventory
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-yellow-100 text-yellow-800';
      case 'Stored':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (stockLevel: number | null, status: string) => {
    if (status !== 'Stored') return null;

    if (stockLevel === null || stockLevel === 0) {
      return { color: 'text-red-600 bg-red-50', label: 'Out of Stock' };
    } else if (stockLevel <= 10) {
      return { color: 'text-orange-600 bg-orange-50', label: 'Low Stock' };
    } else if (stockLevel <= 50) {
      return { color: 'text-yellow-600 bg-yellow-50', label: 'Medium Stock' };
    } else {
      return { color: 'text-green-600 bg-green-50', label: 'In Stock' };
    }
  };

  const groupItemsByKanban = (items: InventoryItem[]) => {
    const groups: Record<string, InventoryItem[]> = {};
    items.forEach(item => {
      const kanbanId = item.kanbanId;
      if (!groups[kanbanId]) {
        groups[kanbanId] = [];
      }
      groups[kanbanId].push(item);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
          <p className="mt-1 text-sm text-gray-500">
            No items found in the inventory. Items will appear here when they are marked as "Received" or "Stored" in receive kanbans.
          </p>
        </div>
      </div>
    );
  }

  // Unified View
  if (viewMode === 'unified') {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const stockStatus = getStockStatus(item.stockLevel, item.columnStatus);

            return (
              <div
                key={item.id}
                onClick={() => onProductClick(item)}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gray-50">
                  {item.availableImages && item.availableImages.length > 0 ? (
                    <ValidationImageDisplay
                      availableImages={item.availableImages}
                      onError={() => handleImageError(item.id)}
                    />
                  ) : item.displayImage && !imageErrors.has(item.id) ? (
                    <img
                      src={item.displayImage}
                      alt={item.productDetails}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CubeIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
                      {item.columnStatus}
                    </span>
                  </div>

                  {/* Stock Status */}
                  {stockStatus && (
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </div>
                  )}

                  {/* Priority Badge */}
                  {item.priority && (
                    <div className="absolute bottom-2 left-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {item.productDetails}
                  </h3>

                  {/* SKU */}
                  {item.sku && (
                    <p className="text-sm text-gray-500 mt-1">
                      SKU: {item.sku}
                    </p>
                  )}

                  {/* Category */}
                  {item.category && (
                    <div className="flex items-center mt-2">
                      <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </div>
                  )}

                  {/* Supplier */}
                  {item.supplier && (
                    <div className="flex items-center mt-1">
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600 truncate">{item.supplier}</span>
                    </div>
                  )}

                  {/* Location or Person Assignment */}
                  {item.locationId && (() => {
                    const location = locations.find(loc => loc.id === item.locationId);
                    return location ? (
                      <div className="flex items-center mt-1">
                        <MapPinIcon className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-gray-600 truncate">{location.name} • {location.area}</span>
                      </div>
                    ) : null;
                  })()}
                  {item.assignedToPersonId && (() => {
                    const person = persons.find(p => p.id === item.assignedToPersonId);
                    return person ? (
                      <div className="flex items-center mt-1">
                        <svg className="w-4 h-4 text-purple-600 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-purple-700 truncate font-medium">{person.name}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Stock Level (only for stored items) */}
                  {item.columnStatus === 'Stored' && item.stockLevel !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Stock</span>
                        <span className={`text-sm font-semibold ${
                          item.stockLevel === 0 ? 'text-red-600' :
                          item.stockLevel <= 10 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {item.stockLevel} units
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleMoveClick(e, item)}
                        className="mt-2 w-full flex items-center justify-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4 mr-1.5" />
                        Move Product
                      </button>
                    </div>
                  )}

                  {/* Price */}
                  {item.unitPrice && formatCurrency(item.unitPrice) && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">Unit Price</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  )}

                  {/* Days in Inventory */}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      <span>{item.daysInInventory} days</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // By-Kanban View
  const groupedItems = groupItemsByKanban(items);

  return (
    <div className="p-6 space-y-8">
      {Object.entries(groupedItems).map(([kanbanId, kanbanItems]) => {
        const kanban = kanbanItems[0]?.kanban;
        if (!kanban) return null;

        return (
          <div key={kanbanId}>
            {/* Kanban Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{kanban.name}</h2>
                <p className="text-sm text-gray-500">
                  {kanbanItems.length} items • {kanbanItems.filter(item => item.columnStatus === 'Stored').length} stored
                </p>
              </div>
            </div>

            {/* Kanban Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {kanbanItems.map((item) => {
                const stockStatus = getStockStatus(item.stockLevel, item.columnStatus);

                return (
                  <div
                    key={item.id}
                    onClick={() => onProductClick(item)}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-50">
                      {item.availableImages && item.availableImages.length > 0 ? (
                        <ValidationImageDisplay
                          availableImages={item.availableImages}
                          onError={() => handleImageError(item.id)}
                        />
                      ) : item.displayImage && !imageErrors.has(item.id) ? (
                        <img
                          src={item.displayImage}
                          alt={item.productDetails}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CubeIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
                          {item.columnStatus}
                        </span>
                      </div>

                      {/* Stock Status */}
                      {stockStatus && (
                        <div className="absolute top-2 left-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </div>
                      )}

                      {/* Priority Badge */}
                      {item.priority && (
                        <div className="absolute bottom-2 left-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.productDetails}
                      </h3>

                      {/* SKU */}
                      {item.sku && (
                        <p className="text-sm text-gray-500 mt-1">
                          SKU: {item.sku}
                        </p>
                      )}

                      {/* Category */}
                      {item.category && (
                        <div className="flex items-center mt-2">
                          <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-600">{item.category}</span>
                        </div>
                      )}

                      {/* Supplier */}
                      {item.supplier && (
                        <div className="flex items-center mt-1">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-600 truncate">{item.supplier}</span>
                        </div>
                      )}

                      {/* Location or Person Assignment */}
                      {(item.assignedToPersonId || item.locationId) && (() => {
                        const hasPerson = !!item.assignedToPersonId;
                        const location = item.locationId ? locations.find(loc => loc.id === item.locationId) : null;
                        const person = item.assignedToPersonId ? persons.find(p => p.id === item.assignedToPersonId) : null;
                        return (
                          <div className="flex items-center mt-1">
                            {hasPerson ? (
                              <svg className="w-4 h-4 text-purple-600 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                            )}
                            <span className="text-sm text-gray-600 truncate">{hasPerson ? person?.name : location?.name}</span>
                          </div>
                        );
                      })()}

                      {/* Stock Level (only for stored items) */}
                      {item.columnStatus === 'Stored' && item.stockLevel !== null && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Stock</span>
                            <span className={`text-sm font-semibold ${
                              item.stockLevel === 0 ? 'text-red-600' :
                              item.stockLevel <= 10 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {item.stockLevel} units
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleMoveClick(e, item)}
                            className="mt-2 w-full flex items-center justify-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4 mr-1.5" />
                            Move Product
                          </button>
                        </div>
                      )}

                      {/* Price */}
                      {item.unitPrice && formatCurrency(item.unitPrice) && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Unit Price</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                      )}

                      {/* Days in Inventory */}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span>{item.daysInInventory} days</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Movement Modal */}
      <MovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setSelectedProductForMove(null);
        }}
        preselectedProduct={selectedProductForMove || undefined}
        onSuccess={handleMovementSuccess}
      />
    </div>
  );
}
