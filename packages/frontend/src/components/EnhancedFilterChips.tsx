import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Product } from '@invenflow/shared';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useLocationStore } from '../store/locationStore';

interface EnhancedFilterChipsProps {
  searchQuery: string;
  onClearSearch: () => void;
  className?: string;
  showCount?: boolean;
  products?: Product[];
}

const EnhancedFilterChips = React.memo(function EnhancedFilterChips({ 
  searchQuery, 
  onClearSearch, 
  className,
  showCount = false,
  products = []
}: EnhancedFilterChipsProps) {
  const {
    supplierFilter, setSupplierFilter,
    categoryFilter, setCategoryFilter,
    priorityFilter, setPriorityFilter,
    locationFilter, setLocationFilter,
    tagFilter, setTagFilter,
    stockLevelMin, stockLevelMax, setStockLevelRange,
    priceMin, priceMax, setPriceRange,
    createdFrom, createdTo, createdPreset, setCreatedRange, setCreatedPreset,
    updatedFrom, updatedTo, updatedPreset, setUpdatedRange, setUpdatedPreset,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
  } = useViewPreferencesStore();

  const { locations } = useLocationStore();

  const removeFromArray = (arr: string[], value: string) => {
    return arr.filter(item => item !== value);
  };

  const formatDateRange = (from: string | null, to: string | null, preset: string | null) => {
    if (preset) {
      return preset === '7d' ? 'Last 7 days' : preset === '30d' ? 'Last 30 days' : 'Last 90 days';
    }
    if (from && to) {
      return `${from} → ${to}`;
    }
    if (from) {
      return `From ${from}`;
    }
    if (to) {
      return `Until ${to}`;
    }
    return '';
  };

  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || locationId;
  };

  if (!hasActiveFilters() && !searchQuery) {
    return null;
  }

  const activeFilterCount = getActiveFilterCount();
  const filteredProductCount = showCount ? products.length : 0;

  return (
    <div className={`${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Active Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount}
            </span>
          )}
          {showCount && filteredProductCount > 0 && (
            <span className="text-sm text-gray-500">
              • {filteredProductCount} result{filteredProductCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasActiveFilters() && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Search Query */}
        {searchQuery && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <span className="mr-2">Search: "{searchQuery}"</span>
            <button
              onClick={onClearSearch}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-600 hover:bg-green-200 hover:text-green-800 transition-colors"
              aria-label="Remove search filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Supplier Filter */}
        {supplierFilter && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <span className="mr-2">Supplier: {supplierFilter}</span>
            <button
              onClick={() => setSupplierFilter(null)}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-colors"
              aria-label="Remove supplier filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Category Filters */}
        {categoryFilter.map((category) => (
          <div key={category} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
            <span className="mr-2">Category: {category}</span>
            <button
              onClick={() => setCategoryFilter(removeFromArray(categoryFilter, category))}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
              aria-label={`Remove ${category} category filter`}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Priority Filters */}
        {priorityFilter.map((priority) => (
          <div key={priority} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <span className="mr-2">Priority: {priority}</span>
            <button
              onClick={() => setPriorityFilter(removeFromArray(priorityFilter, priority))}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-colors"
              aria-label={`Remove ${priority} priority filter`}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Location Filters */}
        {locationFilter.map((locationName) => (
          <div key={locationName} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <span className="mr-2">Location: {locationName}</span>
            <button
              onClick={() => setLocationFilter(removeFromArray(locationFilter, locationName))}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-600 hover:bg-green-200 hover:text-green-800 transition-colors"
              aria-label={`Remove ${locationName} location filter`}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Tag Filters */}
        {tagFilter.map((tag) => (
          <div key={tag} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <span className="mr-2">Tag: {tag}</span>
            <button
              onClick={() => setTagFilter(removeFromArray(tagFilter, tag))}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-purple-600 hover:bg-purple-200 hover:text-purple-800 transition-colors"
              aria-label={`Remove ${tag} tag filter`}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Stock Level Range */}
        {(stockLevelMin !== null || stockLevelMax !== null) && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span className="mr-2">
              Stock: {stockLevelMin || 0} - {stockLevelMax || '∞'}
            </span>
            <button
              onClick={() => setStockLevelRange(null, null)}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-600 hover:bg-indigo-200 hover:text-indigo-800 transition-colors"
              aria-label="Remove stock level filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Price Range */}
        {(priceMin !== null || priceMax !== null) && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="mr-2">
              Price: ${priceMin || 0} - ${priceMax || '∞'}
            </span>
            <button
              onClick={() => setPriceRange(null, null)}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 transition-colors"
              aria-label="Remove price range filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Created Date Range */}
        {(createdPreset || createdFrom || createdTo) && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 text-rose-800 border border-rose-200">
            <span className="mr-2">
              Created: {formatDateRange(createdFrom, createdTo, createdPreset)}
            </span>
            <button
              onClick={() => {
                setCreatedRange(null, null);
                setCreatedPreset(null);
              }}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-rose-600 hover:bg-rose-200 hover:text-rose-800 transition-colors"
              aria-label="Remove created date filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Updated Date Range */}
        {(updatedPreset || updatedFrom || updatedTo) && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800 border border-violet-200">
            <span className="mr-2">
              Updated: {formatDateRange(updatedFrom, updatedTo, updatedPreset)}
            </span>
            <button
              onClick={() => {
                setUpdatedRange(null, null);
                setUpdatedPreset(null);
              }}
              className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-violet-600 hover:bg-violet-200 hover:text-violet-800 transition-colors"
              aria-label="Remove updated date filter"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Mobile: Show truncated view with "and X more" */}
        {activeFilterCount > 5 && (
          <div className="sm:hidden inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <span>+{activeFilterCount - 5} more filters</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default EnhancedFilterChips;
