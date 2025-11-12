import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { InventoryFilters } from '@invenflow/shared';

interface SavedFilter {
  id: string;
  name: string;
  filters: Partial<InventoryFilters>;
  createdAt: Date;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: InventoryFilters;
  onApplyFilters: (filters: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
  availableOptions: {
    categories: string[];
    suppliers: string[];
    locations: string[];
    kanbans: { id: string; name: string }[];
  };
}

const QUICK_FILTERS = [
  { name: 'Low Stock', filters: { stockMin: 0, stockMax: 10 } },
  { name: 'Recent Items', filters: { sortBy: 'updatedAt' as const, sortOrder: 'desc' as const } },
  { name: 'Stored Items', filters: { columnStatus: ['Stored'] } },
  { name: 'Received Items', filters: { columnStatus: ['Received'] } },
  { name: 'Electronics', filters: { category: ['Electronics'] } },
];

export function AdvancedFilters({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onClearFilters,
  availableOptions,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Partial<InventoryFilters>>(currentFilters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('inventory-saved-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }, []);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const handleQuickFilter = (quickFilter: typeof QUICK_FILTERS[0]) => {
    const newFilters = { ...localFilters, ...quickFilter.filters };
    setLocalFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName.trim(),
      filters: localFilters,
      createdAt: new Date(),
    };

    const updatedSaved = [...savedFilters, newFilter];
    setSavedFilters(updatedSaved);
    localStorage.setItem('inventory-saved-filters', JSON.stringify(updatedSaved));
    
    setSaveFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadSavedFilter = (savedFilter: SavedFilter) => {
    setLocalFilters(savedFilter.filters);
    onApplyFilters(savedFilter.filters);
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    const updatedSaved = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedSaved);
    localStorage.setItem('inventory-saved-filters', JSON.stringify(updatedSaved));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FunnelIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Filters */}
              <div className="lg:col-span-1">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Filters</h4>
                <div className="space-y-2">
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => handleQuickFilter(filter)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200"
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>

                {/* Saved Filters */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Saved Filters</h4>
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {savedFilters.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No saved filters</p>
                  ) : (
                    <div className="space-y-2">
                      {savedFilters.map((savedFilter) => (
                        <div key={savedFilter.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                          <button
                            onClick={() => handleLoadSavedFilter(savedFilter)}
                            className="flex-1 text-left text-sm text-gray-700 hover:text-blue-600"
                          >
                            {savedFilter.name}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={localFilters.search || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                        placeholder="Search products..."
                        className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories
                    </label>
                    <select
                      multiple
                      value={localFilters.category || []}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setLocalFilters({ ...localFilters, category: values });
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      size={4}
                    >
                      {availableOptions.categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suppliers
                    </label>
                    <select
                      multiple
                      value={localFilters.supplier || []}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setLocalFilters({ ...localFilters, supplier: values });
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      size={4}
                    >
                      {availableOptions.suppliers.map((supplier) => (
                        <option key={supplier} value={supplier}>
                          {supplier}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Locations
                    </label>
                    <select
                      multiple
                      value={localFilters.location || []}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setLocalFilters({ ...localFilters, location: values });
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      size={4}
                    >
                      {availableOptions.locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      multiple
                      value={localFilters.columnStatus || []}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setLocalFilters({ ...localFilters, columnStatus: values });
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="New Request">New Request</option>
                      <option value="In Review">In Review</option>
                      <option value="Purchased">Purchased</option>
                      <option value="Received">Received</option>
                      <option value="Stored">Stored</option>
                    </select>
                  </div>

                  {/* Stock Level Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Level
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min stock"
                        value={localFilters.stockMin || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, stockMin: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max stock"
                        value={localFilters.stockMax || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, stockMax: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Filter Dialog */}
          {showSaveDialog && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  placeholder="Enter filter name..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveFilter();
                    if (e.key === 'Escape') setShowSaveDialog(false);
                  }}
                />
                <button
                  onClick={handleSaveFilter}
                  disabled={!saveFilterName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleApply}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
