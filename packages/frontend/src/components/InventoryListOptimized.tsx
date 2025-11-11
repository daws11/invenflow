import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
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
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import { MovementModal } from './MovementModal';
import { memoize } from '../utils/debounce';

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

// Memoized row component to prevent unnecessary re-renders
const InventoryRow = memo(({ 
  item, 
  isExpanded, 
  onToggleExpand, 
  onProductClick, 
  onMoveClick,
  locationName,
  assignedPersonName 
}: {
  item: InventoryItem;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onProductClick: (item: InventoryItem) => void;
  onMoveClick: (item: InventoryItem) => void;
  locationName?: string;
  assignedPersonName?: string;
}) => {
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(item.id);
  }, [item.id, onToggleExpand]);

  const handleProductClick = useCallback(() => {
    onProductClick(item);
  }, [item, onProductClick]);

  const handleMoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveClick(item);
  }, [item, onMoveClick]);

  // Memoize expensive calculations
  const displayImage = useMemo(() => {
    return item.displayImage || item.productImage;
  }, [item.displayImage, item.productImage]);

  const statusColor = useMemo(() => {
    switch (item.columnStatus) {
      case 'Received':
        return 'bg-blue-100 text-blue-800';
      case 'Stored':
        return item.assignedToPersonId 
          ? 'bg-orange-100 text-orange-800' 
          : 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, [item.columnStatus, item.assignedToPersonId]);

  const daysColor = useMemo(() => {
    if (item.daysInInventory > 30) return 'text-red-600';
    if (item.daysInInventory > 14) return 'text-yellow-600';
    return 'text-green-600';
  }, [item.daysInInventory]);

  return (
    <>
      <tr 
        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
        onClick={handleProductClick}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={handleToggleExpand}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-150"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </td>
        
        <td className="px-6 py-4">
          <div className="flex items-center space-x-3">
            {displayImage && (
              <div className="flex-shrink-0 h-12 w-12">
                <img
                  className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                  src={displayImage}
                  alt={item.productDetails}
                  loading="lazy"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.productDetails}
              </p>
              {item.sku && (
                <p className="text-sm text-gray-500 truncate">SKU: {item.sku}</p>
              )}
            </div>
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {item.columnStatus}
          </span>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center">
            <CubeIcon className="h-4 w-4 text-gray-400 mr-1" />
            {item.stockLevel || 1}
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center">
            <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
            {locationName || 'No location'}
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`font-medium ${daysColor}`}>
            {item.daysInInventory} days
          </span>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDateWithTime(item.updatedAt)}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleMoveClick}
              className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors duration-150"
              title="Move product"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleProductClick}
              className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors duration-150"
              title="View details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {item.category && (
                <div className="flex items-center">
                  <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-1 font-medium">{item.category}</span>
                </div>
              )}
              
              {item.supplier && (
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Supplier:</span>
                  <span className="ml-1 font-medium">{item.supplier}</span>
                </div>
              )}
              
              {item.unitPrice && (
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="ml-1 font-medium">{formatCurrency(Number(item.unitPrice))}</span>
                </div>
              )}
              
              {assignedPersonName && (
                <div className="flex items-center">
                  <span className="text-gray-600">Assigned to:</span>
                  <span className="ml-1 font-medium">{assignedPersonName}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Created:</span>
                <span className="ml-1 font-medium">{formatDateWithTime(item.createdAt)}</span>
              </div>
              
              {item.notes && (
                <div className="md:col-span-2 lg:col-span-3">
                  <span className="text-gray-600">Notes:</span>
                  <p className="mt-1 text-gray-900">{item.notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

InventoryRow.displayName = 'InventoryRow';

// Memoized sort function
const sortItems = memoize((items: InventoryItem[], sortConfig: SortConfig, locations: any[], persons: any[]) => {
  return [...items].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortConfig.field) {
      case 'productDetails':
        aValue = a.productDetails.toLowerCase();
        bValue = b.productDetails.toLowerCase();
        break;
      case 'location':
        const aLocation = locations.find(l => l.id === a.locationId);
        const bLocation = locations.find(l => l.id === b.locationId);
        aValue = aLocation?.name?.toLowerCase() || '';
        bValue = bLocation?.name?.toLowerCase() || '';
        break;
      case 'stockLevel':
        aValue = a.stockLevel || 0;
        bValue = b.stockLevel || 0;
        break;
      case 'daysInInventory':
        aValue = a.daysInInventory || 0;
        bValue = b.daysInInventory || 0;
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
});

export const InventoryListOptimized = memo(({ items, loading, onProductClick }: InventoryListProps) => {
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'updatedAt', direction: 'desc' });
  const [selectedProductForMove, setSelectedProductForMove] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: true });
  }, [fetchLocations, fetchPersons]);

  // Memoized sorted items
  const sortedItems = useMemo(() => {
    return sortItems(items, sortConfig, locations, persons);
  }, [items, sortConfig, locations, persons]);

  // Memoized location and person maps for faster lookups
  const locationMap = useMemo(() => {
    return new Map(locations.map(location => [location.id, location]));
  }, [locations]);

  const personMap = useMemo(() => {
    return new Map(persons.map(person => [person.id, person]));
  }, [persons]);

  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleMoveClick = useCallback((item: InventoryItem) => {
    setSelectedProductForMove(item);
    setIsMovementModalOpen(true);
  }, []);

  const handleCloseMovementModal = useCallback(() => {
    setIsMovementModalOpen(false);
    setSelectedProductForMove(null);
  }, []);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUpIcon className="h-4 w-4 text-gray-600" />
      : <ArrowDownIcon className="h-4 w-4 text-gray-600" />;
  }, [sortConfig]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6 text-center">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
          <p className="mt-1 text-sm text-gray-500">
            No items match your current filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {/* Expand column */}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleSort('productDetails')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Product</span>
                    {getSortIcon('productDetails')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleSort('stockLevel')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock</span>
                    {getSortIcon('stockLevel')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Location</span>
                    {getSortIcon('location')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleSort('daysInInventory')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Days in Inventory</span>
                    {getSortIcon('daysInInventory')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Updated</span>
                    {getSortIcon('updatedAt')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedItems.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedRows.has(item.id)}
                  onToggleExpand={handleToggleExpand}
                  onProductClick={onProductClick}
                  onMoveClick={handleMoveClick}
                  locationName={locationMap.get(item.locationId || '')?.name}
                  assignedPersonName={personMap.get(item.assignedToPersonId || '')?.name}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProductForMove && (
        <MovementModal
          isOpen={isMovementModalOpen}
          onClose={handleCloseMovementModal}
          product={selectedProductForMove}
        />
      )}
    </>
  );
});

InventoryListOptimized.displayName = 'InventoryListOptimized';
