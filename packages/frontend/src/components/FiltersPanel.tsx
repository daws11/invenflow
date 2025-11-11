import { DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, Product } from '@invenflow/shared';
import React, { useMemo, useCallback } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useLocationStore } from '../store/locationStore';

interface FiltersPanelProps {
  products: Product[];
  className?: string;
  showAdvanced?: boolean;
}

const FiltersPanel = React.memo(function FiltersPanel({ products, className, showAdvanced = true }: FiltersPanelProps) {
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
  } = useViewPreferencesStore();

  const { locations } = useLocationStore();

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.supplier) set.add(p.supplier);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => set.add(tag));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const locationOptions = useMemo(() => {
    return locations.map(loc => loc.name).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const toggleInArray = useCallback((arr: string[], v: string) => {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }, []);

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Basic Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supplier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
          <div className="relative">
            <select
              className="w-full rounded-lg border border-gray-300 p-2.5 pr-8 appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={supplierFilter || ''}
              onChange={(e) => setSupplierFilter(e.target.value || null)}
            >
              <option value="">All suppliers</option>
              {supplierOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreatedPreset(createdPreset === '7d' ? null : '7d')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                createdPreset === '7d' 
                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setCreatedPreset(createdPreset === '30d' ? null : '30d')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                createdPreset === '30d' 
                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => setCreatedPreset(createdPreset === '90d' ? null : '90d')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                createdPreset === '90d' 
                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              90d
            </button>
          </div>
        </div>

        {/* Stock Level Range */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Level</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={stockLevelMin || ''}
                onChange={(e) => setStockLevelRange(
                  e.target.value ? parseInt(e.target.value) : null,
                  stockLevelMax
                )}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <input
                type="number"
                placeholder="Max"
                value={stockLevelMax || ''}
                onChange={(e) => setStockLevelRange(
                  stockLevelMin,
                  e.target.value ? parseInt(e.target.value) : null
                )}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters()}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(toggleInArray(categoryFilter, cat))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter.includes(cat)
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {cat}
              {categoryFilter.includes(cat) && (
                <XMarkIcon className="w-3 h-3 ml-1 inline" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_PRIORITIES.map(priority => (
            <button
              key={priority}
              type="button"
              onClick={() => setPriorityFilter(toggleInArray(priorityFilter, priority))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                priorityFilter.includes(priority)
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {priority}
              {priorityFilter.includes(priority) && (
                <XMarkIcon className="w-3 h-3 ml-1 inline" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <>
          {/* Location Filter */}
          {locationOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map(location => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => setLocationFilter(toggleInArray(locationFilter, location))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      locationFilter.includes(location)
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {location}
                    {locationFilter.includes(location) && (
                      <XMarkIcon className="w-3 h-3 ml-1 inline" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags Filter */}
          {tagOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.slice(0, 15).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(toggleInArray(tagFilter, tag))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      tagFilter.includes(tag)
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                    {tagFilter.includes(tag) && (
                      <XMarkIcon className="w-3 h-3 ml-1 inline" />
                    )}
                  </button>
                ))}
                {tagOptions.length > 15 && (
                  <span className="px-3 py-1.5 text-sm text-gray-500">
                    +{tagOptions.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <input
                type="number"
                placeholder="Min price"
                value={priceMin || ''}
                onChange={(e) => setPriceRange(
                  e.target.value ? parseFloat(e.target.value) : null,
                  priceMax
                )}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <input
                type="number"
                placeholder="Max price"
                value={priceMax || ''}
                onChange={(e) => setPriceRange(
                  priceMin,
                  e.target.value ? parseFloat(e.target.value) : null
                )}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Created Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={createdFrom || ''}
                  onChange={(e) => setCreatedRange(e.target.value || null, createdTo)}
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={createdTo || ''}
                  onChange={(e) => setCreatedRange(createdFrom, e.target.value || null)}
                />
              </div>
            </div>

            {/* Updated Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Updated Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={updatedFrom || ''}
                  onChange={(e) => setUpdatedRange(e.target.value || null, updatedTo)}
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={updatedTo || ''}
                  onChange={(e) => setUpdatedRange(updatedFrom, e.target.value || null)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default FiltersPanel;


