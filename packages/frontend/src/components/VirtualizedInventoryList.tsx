import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { InventoryItem } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import {
  EyeIcon,
  MapPinIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatDateWithTime } from '../utils/formatters';

interface VirtualizedInventoryListProps {
  items: InventoryItem[];
  loading: boolean;
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void>;
  onProductClick: (item: InventoryItem) => void;
  onMoveClick: (item: InventoryItem) => void;
}

interface ItemData {
  items: InventoryItem[];
  locationMap: Map<string, any>;
  personMap: Map<string, any>;
  onProductClick: (item: InventoryItem) => void;
  onMoveClick: (item: InventoryItem) => void;
}

// Memoized row component for virtual scrolling
const VirtualizedRow = memo(({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { items, locationMap, personMap, onProductClick, onMoveClick } = data;
  const item = items[index];

  const handleProductClick = useCallback(() => {
    onProductClick(item);
  }, [item, onProductClick]);

  const handleMoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveClick(item);
  }, [item, onMoveClick]);

  if (!item) {
    // Loading placeholder
    return (
      <div style={style} className="flex items-center p-4 border-b border-gray-200">
        <div className="animate-pulse flex space-x-4 w-full">
          <div className="rounded-lg bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const locationName = locationMap.get(item.locationId || '')?.name;
  const assignedPersonName = personMap.get(item.assignedToPersonId || '')?.name;
  const displayImage = item.displayImage || item.productImage;

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
    <div 
      style={style} 
      className="flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      onClick={handleProductClick}
    >
      {/* Product Image and Details */}
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {displayImage && (
          <div className="flex-shrink-0">
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
          <div className="flex items-center space-x-4 mt-1">
            {item.sku && (
              <span className="text-xs text-gray-500">SKU: {item.sku}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {item.columnStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Stock Level */}
      <div className="flex items-center space-x-1 px-4">
        <CubeIcon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-900">{item.stockLevel || 1}</span>
      </div>

      {/* Location */}
      <div className="flex items-center space-x-1 px-4 min-w-0">
        <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-900 truncate">
          {locationName || 'No location'}
        </span>
      </div>

      {/* Days in Inventory */}
      <div className="px-4">
        <span className={`text-sm font-medium ${daysColor}`}>
          {item.daysInInventory}d
        </span>
      </div>

      {/* Last Updated */}
      <div className="px-4 hidden md:block">
        <span className="text-sm text-gray-500">
          {formatDateWithTime(item.updatedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 px-4">
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
    </div>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

export const VirtualizedInventoryList = memo(({
  items,
  loading,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  onProductClick,
  onMoveClick,
}: VirtualizedInventoryListProps) => {
  const { locations } = useLocationStore();
  const { persons } = usePersonStore();
  const listRef = useRef<List>(null);

  // Memoized location and person maps for faster lookups
  const locationMap = useMemo(() => {
    return new Map(locations.map(location => [location.id, location]));
  }, [locations]);

  const personMap = useMemo(() => {
    return new Map(persons.map(person => [person.id, person]));
  }, [persons]);

  // Item data for virtual list
  const itemData = useMemo((): ItemData => ({
    items,
    locationMap,
    personMap,
    onProductClick,
    onMoveClick,
  }), [items, locationMap, personMap, onProductClick, onMoveClick]);

  // Calculate total item count (including loading placeholders)
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!items[index];
  }, [items]);

  // Handle scroll to load more items
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }: any) => {
    // Load more items when we're near the end
    const endIndex = Math.min(visibleStopIndex + 5, itemCount - 1);
    if (hasNextPage && !isNextPageLoading && endIndex >= items.length - 1) {
      loadNextPage();
    }
  }, [hasNextPage, isNextPageLoading, itemCount, items.length, loadNextPage]);

  // Reset scroll position when items change significantly
  useEffect(() => {
    if (listRef.current && items.length === 0) {
      listRef.current.scrollToItem(0);
    }
  }, [items.length]);

  if (loading && items.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="animate-pulse p-4">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="rounded-lg bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
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
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Inventory Items ({items.length})
          </h3>
          <div className="text-xs text-gray-500">
            Virtual scrolling enabled for performance
          </div>
        </div>
      </div>

      {/* Virtualized List */}
      <div className="relative">
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadNextPage}
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={(list) => {
                listRef.current = list;
                ref(list);
              }}
              height={600} // Fixed height for virtual scrolling
              itemCount={itemCount}
              itemSize={80} // Height of each row
              itemData={itemData}
              onItemsRendered={onItemsRendered}
              overscanCount={5} // Render extra items for smooth scrolling
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {VirtualizedRow}
            </List>
          )}
        </InfiniteLoader>

        {/* Loading indicator */}
        {isNextPageLoading && (
          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-sm text-gray-600">Loading more items...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

VirtualizedInventoryList.displayName = 'VirtualizedInventoryList';
