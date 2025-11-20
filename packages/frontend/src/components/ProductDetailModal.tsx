import { useState, useEffect } from 'react';
import { InventoryItem, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS, ProductLocationDetail } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { useKanbanStore } from '../store/kanbanStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useToast } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { useCommentStore } from '../store/commentStore';
import { CommentForm, CommentList } from './comments';
import { globalRequestDeduplicator } from '../utils/requestDeduplicator';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
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
  const { fetchLocations } = useLocationStore();
  const { fetchPersons } = usePersonStore();
  const { deleteProduct, currentKanban, updateProduct: kanbanUpdateProduct } = useKanbanStore();
  const { updateProduct: inventoryUpdateProduct, selectedItem, syncAfterMutation, displayMode, fetchGroupedInventory } = useInventoryStore();
  const { success: _success, error } = useToast();

  // Use the selectedItem from inventory store if available (always up-to-date),
  // otherwise fall back to the item prop
  // Ensure we always have the most up-to-date item data
  const currentItem = selectedItem?.id === item.id ? selectedItem : item;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  const [locationBreakdown, setLocationBreakdown] = useState<ProductLocationDetail[]>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const productId = currentItem.id;
  const currentUser = useAuthStore((state) => state.user);
  const comments = useCommentStore((state) => state.commentsByProduct[productId] ?? []);
  const isCommentsLoading = useCommentStore((state) => state.loadingByProduct[productId] ?? false);
  const fetchComments = useCommentStore((state) => state.fetchComments);
  const addComment = useCommentStore((state) => state.addComment);
  const editComment = useCommentStore((state) => state.editComment);
  const deleteCommentAction = useCommentStore((state) => state.deleteComment);
  const updatingCommentId = useCommentStore((state) => state.updatingCommentId);
  const deletingCommentId = useCommentStore((state) => state.deletingCommentId);
  const connectStream = useCommentStore((state) => state.connectStream);

  const fetchLocationBreakdown = async () => {
    if (!currentItem.sku) return;

    setLoadingBreakdown(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/sku/${encodeURIComponent(currentItem.sku)}/locations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLocationBreakdown(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch location breakdown:', error);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: true });
    fetchLocationBreakdown();
  }, [fetchLocations, fetchPersons, currentItem.sku]);

  useEffect(() => {
    connectStream();
    fetchComments(productId);
  }, [productId, fetchComments, connectStream]);

  const handleAddComment = async (content: string) => {
    await addComment(productId, content);
  };

  const handleEditComment = async (commentId: string, content: string) => {
    await editComment(productId, commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentAction(productId, commentId);
  };

  const handleFieldUpdate = async (field: keyof UpdateProduct, value: string | number) => {
    try {
      const updateData: UpdateProduct = {
        [field]: value || undefined,
      };

      // Update both kanban and inventory stores for optimistic updates
      // This ensures consistency across all views (kanban, inventory list, etc.)
      await Promise.all([
        inventoryUpdateProduct(currentItem.id, updateData),
        kanbanUpdateProduct(currentItem.id, updateData)
      ]);
    } catch (err) {
      console.error('Failed to update product:', err);
      error('Failed to update product');
      throw err; // Re-throw to let BasicInlineEdit handle the error state
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      // Delete from kanban store (optimistic update)
      await deleteProduct(currentItem.id);
      _success('Product deleted successfully');
      
      // Clear request deduplicator cache to force fresh fetch
      globalRequestDeduplicator.clear();
      
      // Sync with inventory store to ensure table view is updated
      await syncAfterMutation();
      
      // If in grouped view, refresh grouped data as well
      if (displayMode === 'grouped') {
        await fetchGroupedInventory();
      }
      
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
    label: `${link?.name || 'Unknown'}${link?.locationName ? ` - ${link.locationName}` : ''}`
  })) || [];

  return (
    <>
      <Slider
        isOpen={true}
        onClose={onClose}
        title="Product Name"
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Compact Header with Badges */}
          <div className="-mx-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex flex-wrap gap-1.5">
            {currentItem.isDraft && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                DRAFT
              </span>
            )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentItem.columnStatus)}`}>
              {currentItem.columnStatus}
            </span>
            {currentItem.priority && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(currentItem.priority)}`}>
                {currentItem.priority}
              </span>
            )}
            {currentItem.stockLevel !== null && currentItem.columnStatus === 'Stored' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Stock: {currentItem.stockLevel}
              </span>
            )}
              </div>
              <p className="text-xs text-gray-500 shrink-0 ml-2">{currentItem.kanban?.name || 'Unknown Kanban'}</p>
          </div>

            {/* Product Name - Compact */}
            <div className="mb-3">
              <BasicInlineEdit
                value={currentItem.productDetails}
                onSave={(value) => handleFieldUpdate('productDetails', value)}
                type="textarea"
                placeholder="Enter product name"
                rows={1}
                maxLength={1000}
                className="text-base font-semibold text-gray-900 leading-tight"
                validation={(value) => {
                  if (!value || value.toString().trim().length === 0) {
                    return 'Product name is required';
                  }
                  return null;
                }}
              />
            </div>
            </div>

          {/* Compact Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">SKU</h4>
              <BasicInlineEdit
                value={currentItem.sku || ''}
                onSave={(value) => handleFieldUpdate('sku', value)}
                placeholder="Enter SKU"
                maxLength={100}
                className="text-sm text-gray-700"
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Category</h4>
              <BasicInlineEdit
                value={currentItem.category || ''}
                onSave={(value) => handleFieldUpdate('category', value)}
                type="select"
                options={categoryOptions}
                placeholder="Select category"
                displayValue={currentItem.category ? (
                  <div className="flex items-center">
                    <TagIcon className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600">{currentItem.category}</span>
                  </div>
                ) : undefined}
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Supplier</h4>
              <BasicInlineEdit
                value={currentItem.supplier || ''}
                onSave={(value) => handleFieldUpdate('supplier', value)}
                placeholder="Enter supplier"
                maxLength={255}
                displayValue={currentItem.supplier ? (
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600 truncate">{currentItem.supplier}</span>
                  </div>
                ) : undefined}
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Priority</h4>
              <BasicInlineEdit
                value={currentItem.priority || ''}
                onSave={(value) => handleFieldUpdate('priority', value)}
                type="select"
                options={priorityOptions}
                placeholder="Select priority"
              />
            </div>
          </div>

          {/* Compact Physical Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Weight</h4>
                <BasicInlineEdit
                  value={currentItem.weight || ''}
                  onSave={(value) => handleFieldUpdate('weight', value)}
                  type="number"
                  placeholder="0.00"
                  displayValue={currentItem.weight !== null ? (
                  <div className="flex items-center">
                    <CubeIcon className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600">{currentItem.weight} {currentItem.unit || 'kg'}</span>
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
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Unit</h4>
                <BasicInlineEdit
                  value={currentItem.unit || ''}
                  onSave={(value) => handleFieldUpdate('unit', value)}
                  type="select"
                  options={unitOptions}
                  allowCustom={true}
                customPlaceholder="Custom unit"
                  placeholder="Select unit"
                  maxLength={20}
                />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Unit Price</h4>
              <BasicInlineEdit
                value={currentItem.unitPrice || ''}
                onSave={(value) => handleFieldUpdate('unitPrice', value)}
                type="number"
                placeholder="0.00"
                displayValue={currentItem.unitPrice && formatCurrency(currentItem.unitPrice) ? (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600">{formatCurrency(currentItem.unitPrice)}</span>
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
            </div>

          {/* Stock Level & Location Breakdown */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                <CubeIcon className="h-4 w-4 mr-2 text-gray-600" />
                Stock & Location Breakdown
              </h4>
              {loadingBreakdown && (
                <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {locationBreakdown.filter(item => item).length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-600 border-b border-gray-200 pb-2">
                  <span className="font-medium">Total Locations:</span>
                  <span className="font-bold text-gray-900">{locationBreakdown.filter(item => item).length}</span>
                </div>

                {locationBreakdown.filter(item => item).map((item, index) => (
                  <div key={`${item.locationId || item.assignedToPersonId}-${index}`}
                       className="bg-white rounded-md p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      {/* Location/Person Info */}
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          {item.location ? (
                            <MapPinIcon className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.productDetails}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span className="truncate">
                              {item.location?.name || item.person?.name || 'Unknown'}
                            </span>
                            {item.location?.area && (
                              <>
                                <span>•</span>
                                <span>{item.location.area}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock Level */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {item.stockLevel !== null ? item.stockLevel : '—'}
                        </div>
                        <div className="text-xs text-gray-500">Stock</div>
                      </div>
                    </div>

                    {/* Kanban Info */}
                    {item.kanban && item.kanban.name && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Kanban:</span>
                          <span className="text-gray-700 font-medium">{item.kanban.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CubeIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm">No location data available</p>
                {currentItem.sku && (
                  <p className="text-xs mt-1">SKU: {currentItem.sku}</p>
                )}
              </div>
            )}

            {/* Stock Level Edit (for backward compatibility) */}
            {currentItem.columnStatus === 'Stored' && locationBreakdown.length === 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  <CubeIcon className="h-3 w-3 inline mr-1" />
                  Stock Level
                </h4>
                <BasicInlineEdit
                  value={currentItem.stockLevel || ''}
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

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Use the Movement feature to change location or assignment
              </p>
            </div>
          </div>

          {/* Preferred Receive Kanban - Only for Order Kanbans */}
          {currentKanban?.type === 'order' && linkedKanbanOptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preferred Receive Kanban
              </h4>
              <BasicInlineEdit
                value={currentItem.preferredReceiveKanbanId || ''}
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

          {/* Compact Notes */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Notes</h4>
            <BasicInlineEdit
              value={currentItem.notes || ''}
              onSave={(value) => handleFieldUpdate('notes', value)}
              type="textarea"
              placeholder="Enter notes..."
              rows={2}
              maxLength={1000}
              displayValue={currentItem.notes ? (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap leading-relaxed">
                  {currentItem.notes}
                </div>
              ) : undefined}
            />
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
              <span className="text-xs text-gray-500">{comments.length} total</span>
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              <CommentList
                comments={comments}
                currentUserId={currentUser?.id ?? null}
                isLoading={isCommentsLoading}
                updatingCommentId={updatingCommentId}
                deletingCommentId={deletingCommentId}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
              />
            </div>
            <CommentForm
              onSubmit={handleAddComment}
              placeholder="Share updates or leave notes..."
              submitLabel="Add Comment"
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
                <ProductMovementHistory productId={currentItem.id} />
              </div>
            )}
          </div>


          {/* Compact Footer */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <div className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
                  {formatDateWithTime(currentItem.createdAt)}
            </div>
                <div className="flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
                  {new Date(currentItem.updatedAt).toLocaleDateString()}
                </div>
            </div>
          </div>

            {/* Compact Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
              Delete Product
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
              Are you sure you want to delete "{currentItem.productDetails}"? This action cannot be undone.
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