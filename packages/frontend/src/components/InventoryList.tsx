import React, { useState, useMemo } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  EyeIcon,
  PhotoIcon,
  MapPinIcon,
  TagIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsUpDownIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatters';
import { MovementModal } from './MovementModal';

interface InventoryListProps {
  items: InventoryItem[];
  loading: boolean;
  onProductClick: (item: InventoryItem) => void;
}

type SortField = 'productDetails' | 'location' | 'stockLevel' | 'daysInInventory' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function InventoryList({ items, loading, onProductClick }: InventoryListProps) {
  const { locations } = useLocationStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'updatedAt', direction: 'desc' });
  const [selectedProductForMove, setSelectedProductForMove] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const handleMoveClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setSelectedProductForMove(item);
    setIsMovementModalOpen(true);
  };

  const handleMovementSuccess = () => {
    setSelectedProductForMove(null);
  };

  // Create location lookup map
  const locationMap = useMemo(() => {
    return new Map(locations.map(loc => [loc.id, loc]));
  }, [locations]);

  // Get structured location display
  const getStructuredLocation = (item: InventoryItem) => {
    if (item.locationId && locationMap.has(item.locationId)) {
      const location = locationMap.get(item.locationId)!;
      return {
        name: location.name,
        area: location.area,
        code: location.code,
        display: `${location.name} (${location.area})`
      };
    }
    return {
      name: item.location || 'No location specified',
      area: '',
      code: '',
      display: item.location || 'No location specified'
    };
  };

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const { field, direction } = sortConfig;

      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'productDetails':
          aValue = a.productDetails?.toLowerCase() || '';
          bValue = b.productDetails?.toLowerCase() || '';
          break;
        case 'location':
          aValue = getStructuredLocation(a).display.toLowerCase();
          bValue = getStructuredLocation(b).display.toLowerCase();
          break;
        case 'stockLevel':
          aValue = a.stockLevel ?? 0;
          bValue = b.stockLevel ?? 0;
          break;
        case 'daysInInventory':
          aValue = a.daysInInventory ?? 0;
          bValue = b.daysInInventory ?? 0;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortConfig, locationMap]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-blue-600" /> :
      <ArrowDownIcon className="h-4 w-4 text-blue-600" />;
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

  const getStockStatusColor = (stockLevel: number | null) => {
    if (stockLevel === null || stockLevel === 0) {
      return 'text-red-600 bg-red-50';
    } else if (stockLevel <= 10) {
      return 'text-orange-600 bg-orange-50';
    } else {
      return 'text-green-600 bg-green-50';
    }
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left w-8">
              <span className="sr-only">Expand</span>
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('productDetails')}
            >
              <div className="flex items-center space-x-1">
                <span>Product</span>
                {getSortIcon('productDetails')}
              </div>
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('location')}
            >
              <div className="flex items-center space-x-1">
                <span>Location</span>
                {getSortIcon('location')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('stockLevel')}
            >
              <div className="flex items-center space-x-1">
                <span>Stock</span>
                {getSortIcon('stockLevel')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('daysInInventory')}
            >
              <div className="flex items-center space-x-1">
                <span>Days in Inventory</span>
                {getSortIcon('daysInInventory')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Images
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedItems.map((item) => {
            const location = getStructuredLocation(item);
            const isExpanded = expandedRows.has(item.id);
            const hasImages = Boolean(item.availableImages && item.availableImages.length > 0);

            return (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleRowExpansion(item.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => onProductClick(item)}>
                        {item.productDetails}
                      </div>
                      {item.sku && (
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
                      <span>{location.display}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
                        {item.columnStatus}
                      </span>
                      {item.priority && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.columnStatus === 'Stored' ? (
                      <div className="flex items-center">
                        <span className={`text-sm font-semibold ${getStockStatusColor(item.stockLevel).split(' ')[0]}`}>
                          {item.stockLevel !== null ? `${item.stockLevel} units` : 'Not set'}
                        </span>
                        {item.stockLevel !== null && item.stockLevel <= 10 && (
                          <span className={`ml-2 text-xs ${getStockStatusColor(item.stockLevel)} px-2 py-1 rounded-full`}>
                            Low Stock
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {item.category}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.supplier ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {item.supplier}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span>{item.daysInInventory} days</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hasImages ? (
                      <div className="flex items-center text-sm text-blue-600">
                        <PhotoIcon className="h-4 w-4 mr-1" />
                        <span>{item.availableImages!.length}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No images</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onProductClick(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {item.columnStatus === 'Stored' && (
                        <>
                          <button
                            onClick={(e) => handleMoveClick(e, item)}
                            className="text-green-600 hover:text-green-900"
                            title="Move product"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onProductClick(item)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit item"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expandable Row */}
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {/* Product Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                          <div className="space-y-1">
                            {item.unitPrice && formatCurrency(item.unitPrice) && (
                              <div className="flex items-center">
                                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">Unit Price: </span>
                                <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                              </div>
                            )}
                            {item.dimensions && (
                              <div className="text-gray-600">
                                <span className="font-medium">Dimensions:</span> {item.dimensions}
                              </div>
                            )}
                            {item.weight && (
                              <div className="text-gray-600">
                                <span className="font-medium">Weight:</span> {item.weight} kg
                              </div>
                            )}
                            {item.productLink && (
                              <div>
                                <a
                                  href={item.productLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  View Product Link
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                          <div className="space-y-1">
                            <div className="flex items-center text-gray-600">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className="md:col-span-2 lg:col-span-3">
                            <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                            <p className="text-gray-700 bg-white p-3 rounded-md border border-gray-200">
                              {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

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