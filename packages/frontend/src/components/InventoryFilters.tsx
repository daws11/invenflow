import { useState, useEffect } from 'react';
import { useInventoryStore } from '../store/inventoryStore';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { STOCK_RANGES, SORT_OPTIONS } from '@invenflow/shared';

interface InventoryFiltersProps {
  onClose?: () => void;
}

export function InventoryFilters({ onClose }: InventoryFiltersProps) {
  const {
    filters,
    availableFilters,
    displayMode,
    setFilters,
    clearFilters,
    fetchGroupedInventory,
  } = useInventoryStore();

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    category: true,
    supplier: true,
    status: true,
    location: true,
    stock: true,
    date: true,
    kanban: true,
    sort: true,
  });

  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    category: filters.category || [],
    supplier: filters.supplier || [],
    status: '',
    location: filters.location || [],
    kanbanIds: filters.kanbanIds || [],
    stockRange: { min: '', max: '' },
    dateRange: { start: '', end: '' },
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const [stockRangeType, setStockRangeType] = useState('custom');

  useEffect(() => {
    setLocalFilters({
      search: filters.search || '',
      category: filters.category || [],
      supplier: filters.supplier || [],
      status: '',
      location: filters.location || [],
      kanbanIds: filters.kanbanIds || [],
      stockRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  }, [filters]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryChange = (category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category]
    }));
  };

  const handleSupplierChange = (supplier: string) => {
    setLocalFilters(prev => ({
      ...prev,
      supplier: prev.supplier.includes(supplier)
        ? prev.supplier.filter(s => s !== supplier)
        : [...prev.supplier, supplier]
    }));
  };

  const handleLocationChange = (location: string) => {
    setLocalFilters(prev => ({
      ...prev,
      location: prev.location.includes(location)
        ? prev.location.filter(l => l !== location)
        : [...prev.location, location]
    }));
  };

  const handleKanbanChange = (kanbanId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      kanbanIds: prev.kanbanIds.includes(kanbanId)
        ? prev.kanbanIds.filter(id => id !== kanbanId)
        : [...prev.kanbanIds, kanbanId]
    }));
  };

  const handleStockRangePreset = (preset: typeof STOCK_RANGES[number]) => {
    setStockRangeType('preset');
    setLocalFilters(prev => ({
      ...prev,
      stockRange: {
        min: preset.min === Infinity ? '' : preset.min.toString(),
        max: preset.max === Infinity ? '' : preset.max.toString(),
      }
    }));
  };

  const handleStockRangeCustom = () => {
    setStockRangeType('custom');
  };

  const applyFilters = () => {
    // For grouped mode, apply filters differently
    if (displayMode === 'grouped') {
      const groupedParams: any = {};
      if (localFilters.search) groupedParams.search = localFilters.search;
      if (localFilters.category.length > 0) groupedParams.category = localFilters.category;
      if (localFilters.supplier.length > 0) groupedParams.supplier = localFilters.supplier;
      if (localFilters.status) groupedParams.status = localFilters.status;
      
      fetchGroupedInventory(groupedParams);
      if (onClose) onClose();
      return;
    }

    // For individual mode, use existing filter logic
    const newFilters: any = {
      search: localFilters.search || undefined,
      category: localFilters.category.length > 0 ? localFilters.category : undefined,
      supplier: localFilters.supplier.length > 0 ? localFilters.supplier : undefined,
      location: localFilters.location.length > 0 ? localFilters.location : undefined,
      kanbanIds: localFilters.kanbanIds.length > 0 ? localFilters.kanbanIds : undefined,
      sortBy: localFilters.sortBy,
      sortOrder: localFilters.sortOrder,
    };

    // Add stock range filter
    if (localFilters.stockRange.min !== '' || localFilters.stockRange.max !== '') {
      if (localFilters.stockRange.min !== '') {
        newFilters.stockMin = parseInt(localFilters.stockRange.min);
      }
      if (localFilters.stockRange.max !== '') {
        newFilters.stockMax = parseInt(localFilters.stockRange.max);
      }
    }

    // Add date range filter
    if (localFilters.dateRange.start !== '') {
      newFilters.dateFrom = new Date(localFilters.dateRange.start);
    }
    if (localFilters.dateRange.end !== '') {
      newFilters.dateTo = new Date(localFilters.dateRange.end);
    }

    setFilters(newFilters);
    if (onClose) onClose();
  };

  const resetFilters = () => {
    clearFilters();
    setLocalFilters({
      search: '',
      category: [],
      supplier: [],
      status: '',
      location: [],
      kanbanIds: [],
      stockRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    setStockRangeType('custom');
    
    // Reload data based on display mode
    if (displayMode === 'grouped') {
      fetchGroupedInventory();
    }
  };

  const hasActiveFilters = localFilters.category.length > 0 ||
    localFilters.supplier.length > 0 ||
    localFilters.location.length > 0 ||
    localFilters.kanbanIds.length > 0 ||
    localFilters.stockRange.min !== '' ||
    localFilters.stockRange.max !== '' ||
    localFilters.dateRange.start !== '' ||
    localFilters.dateRange.end !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filter Inventory</h3>
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Section */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('search')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Search</h4>
          {expandedSections.search ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.search && (
          <div className="mt-3">
            <input
              type="text"
              value={localFilters.search}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by product name, SKU, or notes..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Category</h4>
          {expandedSections.category ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.category && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {availableFilters.categories.length > 0 ? (
              availableFilters.categories.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.category.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{category}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">No categories available</p>
            )}
          </div>
        )}
      </div>

      {/* Supplier Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('supplier')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Supplier</h4>
          {expandedSections.supplier ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.supplier && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {availableFilters.suppliers.length > 0 ? (
              availableFilters.suppliers.map((supplier) => (
                <label key={supplier} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.supplier.includes(supplier)}
                    onChange={() => handleSupplierChange(supplier)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{supplier}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">No suppliers available</p>
            )}
          </div>
        )}
      </div>

      {/* Status Filter (Only for Grouped Mode) */}
      {displayMode === 'grouped' && (
        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={() => toggleSection('status')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">Product Status</h4>
            {expandedSections.status ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {expandedSections.status && (
            <div className="mt-3 space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === ''}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: '' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All Statuses</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === 'incoming'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: 'incoming' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  Incoming (Purchased)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === 'received'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: 'received' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  Received
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === 'stored'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: 'stored' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  Stored
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === 'used'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: 'used' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Used (Assigned)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={localFilters.status === 'available'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, status: 'available' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  Available (Stored & Not Assigned)
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Location Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('location')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Location</h4>
          {expandedSections.location ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.location && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {availableFilters.locations.length > 0 ? (
              availableFilters.locations.map((location) => (
                <label key={location} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.location.includes(location)}
                    onChange={() => handleLocationChange(location)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{location}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">No locations available</p>
            )}
          </div>
        )}
      </div>

      {/* Stock Level Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('stock')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Stock Level</h4>
          {expandedSections.stock ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.stock && (
          <div className="mt-3 space-y-3">
            {/* Preset Ranges */}
            <div className="grid grid-cols-2 gap-2">
              {STOCK_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleStockRangePreset(preset)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                    stockRangeType === 'preset' &&
                    localFilters.stockRange.min === (preset.min === Infinity ? '' : preset.min.toString()) &&
                    localFilters.stockRange.max === (preset.max === Infinity ? '' : preset.max.toString())
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div>
              <button
                onClick={handleStockRangeCustom}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md border transition-colors mb-2 ${
                  stockRangeType === 'custom'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Custom Range
              </button>
              {stockRangeType === 'custom' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localFilters.stockRange.min}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      stockRange: { ...prev.stockRange, min: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localFilters.stockRange.max}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      stockRange: { ...prev.stockRange, max: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('date')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Date Range</h4>
          {expandedSections.date ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.date && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={localFilters.dateRange.start}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={localFilters.dateRange.end}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Kanban Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('kanban')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Kanban</h4>
          {expandedSections.kanban ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.kanban && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {availableFilters.kanbans.length > 0 ? (
              availableFilters.kanbans.map((kanban) => (
                <label key={kanban.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilters.kanbanIds.includes(kanban.id)}
                    onChange={() => handleKanbanChange(kanban.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{kanban.name}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">No kanbans available</p>
            )}
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('sort')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900">Sort By</h4>
          {expandedSections.sort ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {expandedSections.sort && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Field
              </label>
              <select
                value={localFilters.sortBy}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <select
                value={localFilters.sortOrder}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={resetFilters}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reset All Filters
        </button>
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            onClick={applyFilters}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}