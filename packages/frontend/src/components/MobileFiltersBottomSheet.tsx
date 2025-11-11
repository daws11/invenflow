import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { XMarkIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, Product } from '@invenflow/shared';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useLocationStore } from '../store/locationStore';

interface MobileFiltersBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface FilterSection {
  id: string;
  title: string;
  isExpanded: boolean;
}

const MobileFiltersBottomSheet = React.memo(function MobileFiltersBottomSheet({ 
  isOpen, 
  onClose, 
  products 
}: MobileFiltersBottomSheetProps) {
  const {
    supplierFilter, setSupplierFilter,
    categoryFilter, setCategoryFilter,
    priorityFilter, setPriorityFilter,
    locationFilter, setLocationFilter,
    tagFilter, setTagFilter,
    stockLevelMin, stockLevelMax, setStockLevelRange,
    priceMin, priceMax, setPriceRange,
    createdFrom, createdTo, createdPreset, setCreatedRange, setCreatedPreset,
    updatedFrom, updatedTo, setUpdatedRange,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
  } = useViewPreferencesStore();

  const { locations } = useLocationStore();

  const [filterSections, setFilterSections] = useState<FilterSection[]>([
    { id: 'quick', title: 'Quick Filters', isExpanded: true },
    { id: 'basic', title: 'Basic Filters', isExpanded: true },
    { id: 'advanced', title: 'Advanced Filters', isExpanded: false },
    { id: 'dates', title: 'Date Filters', isExpanded: false },
  ]);

  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get unique suppliers and tags from products
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

  const toggleInArray = useCallback((arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setFilterSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  }, []);

  // Handle touch gestures for closing
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target === e.currentTarget) {
      setDragStartY(e.touches[0].clientY);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || dragStartY === null) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;
    
    // If dragging down more than 100px, close the sheet
    if (deltaY > 100) {
      onClose();
      setIsDragging(false);
      setDragStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStartY(null);
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeFilterCount = getActiveFilterCount();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true" 
      />
      
      {/* Bottom Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FunnelIcon className="w-6 h-6 text-gray-700" />
            <h3 id="filters-title" className="text-lg font-semibold text-gray-900">
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Filters Section */}
          {filterSections.find(s => s.id === 'quick')?.isExpanded && (
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('quick')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Quick Filters</h4>
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCreatedPreset(createdPreset === '7d' ? null : '7d')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    createdPreset === '7d'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Last 7 days
                </button>
                <button
                  onClick={() => setCreatedPreset(createdPreset === '30d' ? null : '30d')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    createdPreset === '30d'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Last 30 days
                </button>
              </div>
            </div>
          )}

          {!filterSections.find(s => s.id === 'quick')?.isExpanded && (
            <button
              onClick={() => toggleSection('quick')}
              className="flex items-center justify-between w-full text-left py-2"
            >
              <h4 className="text-base font-medium text-gray-900">Quick Filters</h4>
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Basic Filters Section */}
          {filterSections.find(s => s.id === 'basic')?.isExpanded && (
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('basic')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Basic Filters</h4>
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              </button>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <select
                  className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  value={supplierFilter || ''}
                  onChange={(e) => setSupplierFilter(e.target.value || null)}
                >
                  <option value="">All suppliers</option>
                  {supplierOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(toggleInArray(categoryFilter, cat))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] ${
                        categoryFilter.includes(cat)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_PRIORITIES.map(priority => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setPriorityFilter(toggleInArray(priorityFilter, priority))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] ${
                        priorityFilter.includes(priority)
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!filterSections.find(s => s.id === 'basic')?.isExpanded && (
            <button
              onClick={() => toggleSection('basic')}
              className="flex items-center justify-between w-full text-left py-2"
            >
              <h4 className="text-base font-medium text-gray-900">Basic Filters</h4>
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Advanced Filters Section */}
          {filterSections.find(s => s.id === 'advanced')?.isExpanded && (
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('advanced')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Advanced Filters</h4>
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              </button>

              {/* Location */}
              {locationOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map(location => (
                      <button
                        key={location}
                        type="button"
                        onClick={() => setLocationFilter(toggleInArray(locationFilter, location))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] ${
                          locationFilter.includes(location)
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tagOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTagFilter(toggleInArray(tagFilter, tag))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] ${
                          tagFilter.includes(tag)
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Level Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Level</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={stockLevelMin || ''}
                    onChange={(e) => setStockLevelRange(
                      e.target.value ? parseInt(e.target.value) : null,
                      stockLevelMax
                    )}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={stockLevelMax || ''}
                    onChange={(e) => setStockLevelRange(
                      stockLevelMin,
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Min price"
                    value={priceMin || ''}
                    onChange={(e) => setPriceRange(
                      e.target.value ? parseFloat(e.target.value) : null,
                      priceMax
                    )}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                  <input
                    type="number"
                    placeholder="Max price"
                    value={priceMax || ''}
                    onChange={(e) => setPriceRange(
                      priceMin,
                      e.target.value ? parseFloat(e.target.value) : null
                    )}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {!filterSections.find(s => s.id === 'advanced')?.isExpanded && (
            <button
              onClick={() => toggleSection('advanced')}
              className="flex items-center justify-between w-full text-left py-2"
            >
              <h4 className="text-base font-medium text-gray-900">Advanced Filters</h4>
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Date Filters Section */}
          {filterSections.find(s => s.id === 'dates')?.isExpanded && (
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('dates')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Date Filters</h4>
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              </button>

              {/* Created Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={createdFrom || ''}
                    onChange={(e) => setCreatedRange(e.target.value || null, createdTo)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                  <input
                    type="date"
                    value={createdTo || ''}
                    onChange={(e) => setCreatedRange(createdFrom, e.target.value || null)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </div>
              </div>

              {/* Updated Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Updated Date</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={updatedFrom || ''}
                    onChange={(e) => setUpdatedRange(e.target.value || null, updatedTo)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                  <input
                    type="date"
                    value={updatedTo || ''}
                    onChange={(e) => setUpdatedRange(updatedFrom, e.target.value || null)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {!filterSections.find(s => s.id === 'dates')?.isExpanded && (
            <button
              onClick={() => toggleSection('dates')}
              className="flex items-center justify-between w-full text-left py-2"
            >
              <h4 className="text-base font-medium text-gray-900">Date Filters</h4>
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default MobileFiltersBottomSheet;
