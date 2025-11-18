import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { useKanbanStore } from '../store/kanbanStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useToast } from '../store/toastStore';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  EyeIcon,
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
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import { MovementModal } from './MovementModal';
import { InventoryTableActions } from './InventoryTableActions';
import { BasicInlineEdit } from './BasicInlineEdit';

interface InventoryListProps {
  items?: InventoryItem[]; // Optional since we use store data primarily
  loading: boolean;
  onProductClick: (item: InventoryItem) => void;
  onCreateNew?: () => void;
  onShowFilters?: () => void;
  onShowColumnManager?: () => void;
  onExport?: (items?: InventoryItem[]) => void;
  onMovementSuccess?: () => void;
}

type SortField = 'productDetails' | 'location' | 'stockLevel' | 'daysInInventory' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function InventoryList({
  items: _items, // Keep for backward compatibility but use store data
  loading,
  onProductClick,
  onCreateNew,
  onShowFilters,
  onShowColumnManager,
  onExport,
  onMovementSuccess,
}: InventoryListProps) {
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();
  const { deleteProduct } = useKanbanStore();
  const { items: storeItems, updateProduct, updateProductStock } = useInventoryStore();
  const { success, error, warning } = useToast();

  // Use store items for real-time updates, fallback to props for compatibility
  const items = storeItems.length > 0 ? storeItems : (_items || []);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'updatedAt', direction: 'desc' });
  const [selectedProductForMove, setSelectedProductForMove] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showRowActions, setShowRowActions] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: true });
  }, [fetchLocations, fetchPersons]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowRowActions(null);
    };

    if (showRowActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showRowActions]);

  const handleMoveClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setSelectedProductForMove(item);
    setIsMovementModalOpen(true);
  };

  const handleMovementSuccess = () => {
    setSelectedProductForMove(null);
    onMovementSuccess?.(); // Trigger refresh after successful movement
  };

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.productDetails}"? This action cannot be undone.`)) {
      try {
        await deleteProduct(item.id);
        success('Product deleted successfully');
      } catch (err) {
        error(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleBulkDelete = async (itemsToDelete: InventoryItem[]) => {
    try {
      await Promise.all(itemsToDelete.map(item => deleteProduct(item.id)));
      success(`${itemsToDelete.length} products deleted successfully`);
      setSelectedItems(new Set());
    } catch (err) {
      error(`Failed to delete products: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBulkArchive = async (itemsToArchive: InventoryItem[]) => {
    // Archive is not implemented yet – show clear warning instead of fake success
    warning(
      `Archive ${itemsToArchive.length} product(s) is not available yet. Please contact the administrator if you need this feature.`,
    );
    setSelectedItems(new Set());
  };

  const handleBulkUnarchive = async (itemsToUnarchive: InventoryItem[]) => {
    // Unarchive is not implemented yet – show clear warning instead of fake success
    warning(
      `Unarchive ${itemsToUnarchive.length} product(s) is not available yet. Please contact the administrator if you need this feature.`,
    );
    setSelectedItems(new Set());
  };

  const handleDuplicateItem = (item: InventoryItem) => {
    // Duplicate is not implemented yet – show clear warning instead of fake success
    warning(
      `Duplicate for "${item.productDetails}" is not available yet. Please contact the administrator if you need this feature.`,
    );
  };

  // Inline editing handlers
  const handleUpdateProductDetails = async (itemId: string, newValue: string | number) => {
    try {
      await updateProduct(itemId, { productDetails: newValue.toString() });
    } catch (err) {
      error(`Failed to update product name: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };

  const handleUpdateSku = async (itemId: string, newValue: string | number) => {
    try {
      await updateProduct(itemId, { sku: newValue.toString() });
    } catch (err) {
      error(`Failed to update SKU: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };

  const handleUpdateStockLevel = async (itemId: string, newValue: string | number) => {
    try {
      // Use inventory store's optimistic update for stock level
      await updateProductStock(itemId, Number(newValue));
    } catch (err) {
      error(`Failed to update stock level: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };

  // Create location and person lookup maps
  const locationMap = useMemo(() => {
    return new Map(locations.map(loc => [loc.id, loc]));
  }, [locations]);

  const personMap = useMemo(() => {
    return new Map(persons.map(p => [p.id, p]));
  }, [persons]);

  // Get structured assignment display (location or person)
  const getAssignmentDisplay = (item: InventoryItem) => {
    // Check for person assignment first
    if (item.assignedToPersonId && personMap.has(item.assignedToPersonId)) {
      const person = personMap.get(item.assignedToPersonId)!;
      return {
        type: 'person' as const,
        name: person.name,
        area: '',
        code: '',
        display: `👤 ${person.name}`
      };
    }
    
    // Check for location assignment
    if (item.locationId && locationMap.has(item.locationId)) {
      const location = locationMap.get(item.locationId)!;
      return {
        type: 'location' as const,
        name: location.name,
        area: location.area,
        code: location.code,
        display: `${location.name} (${location.area})`
      };
    }
    
    // No assignment
    return {
      type: 'none' as const,
      name: 'No assignment',
      area: '',
      code: '',
      display: 'No assignment'
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
          aValue = getAssignmentDisplay(a).display.toLowerCase();
          bValue = getAssignmentDisplay(b).display.toLowerCase();
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

  const selectedItemsArray = items.filter(item => selectedItems.has(item.id));

  return (
    <div>
      {/* Table Actions */}
      <InventoryTableActions
        selectedItems={selectedItemsArray}
        onCreateNew={onCreateNew || (() => {})}
        onBulkDelete={handleBulkDelete}
        onBulkArchive={handleBulkArchive}
        onBulkUnarchive={handleBulkUnarchive}
        onExport={onExport || (() => {})}
        onShowFilters={onShowFilters || (() => {})}
        onShowColumnManager={onShowColumnManager || (() => {})}
        totalItems={items.length}
        loading={loading}
      />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={selectedItems.size === items.length && items.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
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
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
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
              Unit
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedItems.map((item) => {
            const assignment = getAssignmentDisplay(item);
            const isExpanded = expandedRows.has(item.id);

            return (
              <React.Fragment key={item.id}>
                <tr className={`hover:bg-gray-50 transition-colors ${selectedItems.has(item.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                    />
                  </td>
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
                      <BasicInlineEdit
                        value={item.productDetails}
                        onSave={(value) => handleUpdateProductDetails(item.id, value)}
                        placeholder="Product name"
                        className="text-sm font-medium text-gray-900 mb-1"
                        validation={(value) => {
                          if (!value || value.toString().trim().length === 0) {
                            return 'Product name is required';
                          }
                          if (value.toString().length > 1000) {
                            return 'Product name must be less than 1000 characters';
                          }
                          return null;
                        }}
                      />
                      <BasicInlineEdit
                        value={item.sku || ''}
                        onSave={(value) => handleUpdateSku(item.id, value)}
                        placeholder="Enter SKU"
                        displayValue={item.sku ? `SKU: ${item.sku}` : ''}
                        className="text-sm text-gray-500"
                        validation={(value) => {
                          if (value && value.toString().length > 100) {
                            return 'SKU must be less than 100 characters';
                          }
                          return null;
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      {assignment.type === 'person' ? (
                        <svg className="w-4 h-4 text-purple-600 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : assignment.type === 'location' ? (
                        <MapPinIcon className="h-4 w-4 text-blue-500 mr-1 flex-shrink-0" />
                      ) : (
                        <MapPinIcon className="h-4 w-4 text-gray-300 mr-1 flex-shrink-0" />
                      )}
                      <span className={assignment.type === 'person' ? 'text-purple-700 font-medium' : ''}>
                        {assignment.display}
                      </span>
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
                        <BasicInlineEdit
                          value={item.stockLevel || 0}
                          onSave={(value) => handleUpdateStockLevel(item.id, value)}
                          type="number"
                          placeholder="0"
                          displayValue={item.stockLevel !== null ? `${item.stockLevel}` : 'Not set'}
                          className={`text-sm font-semibold ${getStockStatusColor(item.stockLevel).split(' ')[0]}`}
                          validation={(value) => {
                            const num = Number(value);
                            if (isNaN(num) || num < 0) {
                              return 'Stock level must be a positive number';
                            }
                            return null;
                          }}
                        />
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
                    {item.kanban ? (
                      <div className="flex items-center text-sm text-gray-900">
                        {item.kanban.id === 'direct-import' ? (
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            <span className="text-green-700 font-medium">Direct Import</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002-2M9 7a2 2 0 012 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 002-2" />
                            </svg>
                            <span className="text-blue-700">{item.kanban.name}</span>
                          </div>
                        )}
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
                    <span className="text-sm text-gray-900">
                      {item.unit || '#'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      {/* Quick Actions */}
                      <button
                        onClick={() => onProductClick(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => onProductClick(item)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                        title="Edit item"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>

                      {item.columnStatus === 'Stored' && (
                        <button
                          onClick={(e) => handleMoveClick(e, item)}
                          disabled={isMovementModalOpen}
                          className={`text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 ${
                            isMovementModalOpen ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={isMovementModalOpen ? "Movement modal is already open" : "Move product"}
                        >
                          <ArrowsRightLeftIcon className="h-4 w-4" />
                        </button>
                      )}

                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRowActions(showRowActions === item.id ? null : item.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50"
                          title="More actions"
                        >
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>

                        {showRowActions === item.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateItem(item);
                                  setShowRowActions(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                                Duplicate
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement archive
                                  setShowRowActions(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                                Archive
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item);
                                  setShowRowActions(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
                                <span className="font-medium">Weight:</span> {item.weight} {item.unit || 'kg'}
                              </div>
                            )}
                            {item.unit && !item.weight && (
                              <div className="text-gray-600">
                                <span className="font-medium">Unit:</span> {item.unit}
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
                              <span>Created: {formatDateWithTime(item.createdAt)}</span>
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
      </div>

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