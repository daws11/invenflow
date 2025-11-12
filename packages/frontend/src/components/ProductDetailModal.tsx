import { useState, useEffect } from 'react';
import { InventoryItem, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { useKanbanStore } from '../store/kanbanStore';
import { useToast } from '../store/toastStore';
import {
  TagIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Slider } from './Slider';
import { BasicInlineEdit } from './BasicInlineEdit';
import { ProductMovementHistory } from './ProductMovementHistory';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';

interface ProductDetailModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export function ProductDetailModal({ item, onClose }: ProductDetailModalProps) {
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();
  const { updateProduct, deleteProduct, currentKanban } = useKanbanStore();
  const { success, error } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMovementHistory, setShowMovementHistory] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: true });
  }, [fetchLocations, fetchPersons]);

  const handleFieldUpdate = async (field: keyof UpdateProduct, value: string | number) => {
    try {
      const updateData: UpdateProduct = {
        [field]: value || undefined,
      };

      await updateProduct(item.id, updateData);
      success('Product updated successfully');
    } catch (err) {
      console.error('Failed to update product:', err);
      error('Failed to update product');
      throw err; // Re-throw to let BasicInlineEdit handle the error state
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteProduct(item.id);
      success('Product deleted successfully');
      onClose();
    } catch (err) {
      console.error('Failed to delete product:', err);
      error('Failed to delete product');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
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

  const categoryOptions = DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const priorityOptions = DEFAULT_PRIORITIES.map(pri => ({ value: pri, label: pri }));
  const unitOptions = DEFAULT_UNITS.filter(unit => unit !== 'Custom').map(unit => ({ value: unit, label: unit }));

  const linkedKanbanOptions = currentKanban?.linkedKanbans?.map(link => ({
    value: link.id,
    label: `${link.name}${link.locationName ? ` - ${link.locationName}` : ''}`
  })) || [];

  return (
    <>
      <Slider
        isOpen={true}
        onClose={onClose}
        title="Product Details"
      >
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {item.isDraft && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                DRAFT
              </span>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
              {item.columnStatus}
            </span>
            {item.priority && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                {item.priority}
              </span>
            )}
            {item.stockLevel !== null && item.columnStatus === 'Stored' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Stock: {item.stockLevel}
              </span>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Product Name *</h4>
              <BasicInlineEdit
                value={item.productDetails}
                onSave={(value) => handleFieldUpdate('productDetails', value)}
                type="textarea"
                placeholder="Enter product name"
                rows={2}
                maxLength={1000}
                className="text-lg font-semibold text-gray-900"
                validation={(value) => {
                  if (!value || value.toString().trim().length === 0) {
                    return 'Product name is required';
                  }
                  return null;
                }}
              />
              <p className="text-sm text-gray-500 mt-1">From: {item.kanban.name}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">SKU</h4>
              <BasicInlineEdit
                value={item.sku || ''}
                onSave={(value) => handleFieldUpdate('sku', value)}
                placeholder="Enter SKU"
                maxLength={100}
                className="text-sm text-gray-600"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
              <BasicInlineEdit
                value={item.category || ''}
                onSave={(value) => handleFieldUpdate('category', value)}
                type="select"
                options={categoryOptions}
                placeholder="Select category"
                displayValue={item.category ? (
                  <div className="flex items-center mt-1">
                    <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                ) : undefined}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Supplier</h4>
              <BasicInlineEdit
                value={item.supplier || ''}
                onSave={(value) => handleFieldUpdate('supplier', value)}
                placeholder="Enter supplier name"
                maxLength={255}
                displayValue={item.supplier ? (
                  <div className="flex items-center mt-1">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-600">{item.supplier}</p>
                  </div>
                ) : undefined}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
              <BasicInlineEdit
                value={item.priority || ''}
                onSave={(value) => handleFieldUpdate('priority', value)}
                type="select"
                options={priorityOptions}
                placeholder="Select priority"
              />
            </div>
          </div>

          {/* Physical Properties */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Weight</h4>
                <BasicInlineEdit
                  value={item.weight || ''}
                  onSave={(value) => handleFieldUpdate('weight', value)}
                  type="number"
                  placeholder="0.00"
                  displayValue={item.weight !== null ? (
                    <div className="flex items-center mt-1">
                      <CubeIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-600">{item.weight} {item.unit || 'kg'}</p>
                    </div>
                  ) : undefined}
                  validation={(value) => {
                    if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
                      return 'Weight must be a positive number';
                    }
                    return null;
                  }}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Unit</h4>
                <BasicInlineEdit
                  value={item.unit || ''}
                  onSave={(value) => handleFieldUpdate('unit', value)}
                  type="select"
                  options={unitOptions}
                  allowCustom={true}
                  customPlaceholder="Enter custom unit"
                  placeholder="Select unit"
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Unit Price</h4>
              <BasicInlineEdit
                value={item.unitPrice || ''}
                onSave={(value) => handleFieldUpdate('unitPrice', value)}
                type="number"
                placeholder="0.00"
                displayValue={item.unitPrice && formatCurrency(item.unitPrice) ? (
                  <div className="flex items-center mt-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-600">{formatCurrency(item.unitPrice)}</p>
                  </div>
                ) : undefined}
                validation={(value) => {
                  if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
                    return 'Unit price must be a positive number';
                  }
                  return null;
                }}
              />
            </div>

            {/* Stock Level (only for stored items) */}
            {item.columnStatus === 'Stored' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  <CubeIcon className="h-4 w-4 inline mr-1" />
                  Stock Level
                </h4>
                <BasicInlineEdit
                  value={item.stockLevel || ''}
                  onSave={(value) => handleFieldUpdate('stockLevel', value)}
                  type="number"
                  placeholder="0"
                  validation={(value) => {
                    if (value && (isNaN(Number(value)) || Number(value) < 0)) {
                      return 'Stock level must be a non-negative number';
                    }
                    return null;
                  }}
                />
              </div>
            )}
          </div>

          {/* Location/Assignment - Read Only Display */}
          {(item.locationId || item.assignedToPersonId) && (() => {
            const hasPerson = !!item.assignedToPersonId;
            const location = item.locationId ? locations.find(loc => loc.id === item.locationId) : null;
            const person = item.assignedToPersonId ? persons.find(p => p.id === item.assignedToPersonId) : null;
            
            return (
              <div className={`p-4 rounded-lg border-2 ${
                hasPerson 
                  ? 'bg-purple-50 border-purple-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h4 className={`text-sm font-semibold mb-2 flex items-center ${
                  hasPerson ? 'text-purple-900' : 'text-blue-900'
                }`}>
                  {hasPerson ? (
                    <>
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      👤 Assigned To Person
                    </>
                  ) : (
                    <>
                      <MapPinIcon className="w-5 h-5 mr-1.5" />
                      📍 Physical Location
                    </>
                  )}
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className={`font-bold text-base ${
                      hasPerson ? 'text-purple-900' : 'text-blue-900'
                    }`}>
                      {hasPerson ? person?.name : location?.name}
                    </p>
                    {(person || location) && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        {hasPerson ? (
                          <>
                            <svg className="w-4 h-4 inline mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </>
                        ) : (
                          <>Area: {location?.area}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-current opacity-30">
                  <p className="text-xs text-gray-500">
                    Use the Movement feature to change location or assignment
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Preferred Receive Kanban - Only for Order Kanbans */}
          {currentKanban?.type === 'order' && linkedKanbanOptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preferred Receive Kanban
              </h4>
              <BasicInlineEdit
                value={item.preferredReceiveKanbanId || ''}
                onSave={(value) => handleFieldUpdate('preferredReceiveKanbanId', value)}
                type="select"
                options={linkedKanbanOptions}
                placeholder="Use kanban default setting"
              />
              <p className="mt-1 text-xs text-gray-500">
                When this product moves to "Purchased", it will transfer to the selected receive kanban. 
                If not set, the kanban's default setting will be used.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
            <BasicInlineEdit
              value={item.notes || ''}
              onSave={(value) => handleFieldUpdate('notes', value)}
              type="textarea"
              placeholder="Enter notes..."
              rows={3}
              maxLength={1000}
              displayValue={item.notes ? (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                  {item.notes}
                </div>
              ) : undefined}
            />
          </div>

          {/* Movement History Section */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowMovementHistory(!showMovementHistory)}
              className="flex items-center justify-between w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <ArrowsRightLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Movement History</span>
              </div>
              {showMovementHistory ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {showMovementHistory && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <ProductMovementHistory productId={item.id} />
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-3 w-3 mr-1" />
              Created: {formatDateWithTime(item.createdAt)}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <ClockIcon className="h-3 w-3 mr-1" />
              Updated: {new Date(item.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Delete Section */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </Slider>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Product</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{item.productDetails}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}