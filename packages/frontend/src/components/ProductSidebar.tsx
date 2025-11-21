import { useState, useEffect, useRef } from 'react';
import { Product, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useLocationStore } from '../store/locationStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useToast } from '../store/toastStore';
import { Slider } from './Slider';
import { BottomSheet } from './BottomSheet';
import { BasicInlineEdit } from './BasicInlineEdit';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import { publicApi, ProductSearchResult } from '../utils/api';
import { generateStableSku } from '../utils/sku';
import { globalRequestDeduplicator } from '../utils/requestDeduplicator';
import {
  TagIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ClockIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { useCommentStore } from '../store/commentStore';
import { CommentForm, CommentList } from './comments';

interface ProductSidebarProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: UpdateProduct) => void;
}

export default function ProductSidebar({ product, isOpen, onClose, onUpdate }: ProductSidebarProps) {
  const { updateProduct: kanbanUpdateProduct, deleteProduct, currentKanban } = useKanbanStore();
  const { updateProduct: inventoryUpdateProduct, syncAfterMutation, displayMode, fetchGroupedInventory } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const { success, error } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Autocomplete state for draft product name on Order kanban
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productId = product?.id ?? '';
  const currentUser = useAuthStore((state) => state.user);
  const comments = useCommentStore((state) =>
    productId ? state.commentsByProduct[productId] ?? [] : [],
  );
  const isCommentsLoading = useCommentStore((state) =>
    productId ? state.loadingByProduct[productId] ?? false : false,
  );
  const fetchComments = useCommentStore((state) => state.fetchComments);
  const addComment = useCommentStore((state) => state.addComment);
  const editComment = useCommentStore((state) => state.editComment);
  const deleteCommentAction = useCommentStore((state) => state.deleteComment);
  const updatingCommentId = useCommentStore((state) => state.updatingCommentId);
  const deletingCommentId = useCommentStore((state) => state.deletingCommentId);
  const connectStream = useCommentStore((state) => state.connectStream);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const update = () => {
      const small = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(small);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Initialize search query when product changes
  useEffect(() => {
    if (product) {
      setProductSearchQuery(product.productDetails || '');
    }
  }, [product]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!productId) return;
    connectStream();
    fetchComments(productId);
  }, [productId, fetchComments, connectStream]);

  const handleAddComment = async (content: string) => {
    if (!productId) return;
    await addComment(productId, content);
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!productId) return;
    await editComment(productId, commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!productId) return;
    await deleteCommentAction(productId, commentId);
  };

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProductSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await publicApi.searchProducts(query);
      setProductSearchResults(results);
    } catch (e) {
      setProductSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchQuery(value);
    setShowProductDropdown(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(value);
    }, 200);
  };

  const handleSelectProduct = async (result: ProductSearchResult) => {
    setProductSearchQuery(result.productDetails);
    setShowProductDropdown(false);
    if (!product) return;
    try {
      await Promise.all([
        handleFieldUpdate('productDetails', result.productDetails),
        handleFieldUpdate('sku', result.sku || '')
      ]);
      // Optionally sync other fields if present
      const extraUpdates: Array<Promise<any>> = [];
      if (result.category) extraUpdates.push(handleFieldUpdate('category', result.category));
      if (result.supplier) extraUpdates.push(handleFieldUpdate('supplier', result.supplier));
      if (result.unitPrice) extraUpdates.push(handleFieldUpdate('unitPrice', result.unitPrice as unknown as number));
      if (extraUpdates.length > 0) {
        await Promise.all(extraUpdates);
      }
    } catch {
      // handled in handleFieldUpdate toast
    }
  };

  const handleSelectNewProduct = async () => {
    setShowProductDropdown(false);
    const newName = productSearchQuery.trim();
    if (!product || !newName) return;

    // Generate a stable SKU to keep it consistent with backend rules
    const newSku = generateStableSku({
      name: newName,
      supplier: product.supplier || '',
      category: product.category || '',
      dimensions: product.dimensions || undefined,
    });

    try {
      await Promise.all([
        handleFieldUpdate('productDetails', newName),
        handleFieldUpdate('sku', newSku),
      ]);
    } catch {
      // handled in handleFieldUpdate toast
    }
  };

  const handleFieldUpdate = async (field: keyof UpdateProduct, value: string | number | string[]) => {
    if (!product) return;

    const updateData: UpdateProduct = {
      [field]: value || undefined,
    };

    try {
      // Update both kanban and inventory stores for optimistic updates
      // Use Promise.all to update both stores simultaneously
      await Promise.all([
        kanbanUpdateProduct(product.id, updateData),
        inventoryUpdateProduct(product.id, updateData)
      ]);

      // For grouped view, we need to refresh the grouped data since it's aggregated
      // and can't be easily updated optimistically
      const { displayMode, fetchGroupedInventory } = useInventoryStore.getState();
      if (displayMode === 'grouped') {
        // Refresh grouped inventory to reflect the changes
        fetchGroupedInventory();
      }

      // success('Product updated successfully');
      onUpdate?.(product.id, updateData);
    } catch (err) {
      error(`Failed to update product: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err; // Re-throw to let BasicInlineEdit handle the error state
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    setIsDeleting(true);
    try {
      // Delete from kanban store (optimistic update)
      await deleteProduct(product.id);
      
      // Clear request deduplicator cache to force fresh fetch
      globalRequestDeduplicator.clear();
      
      // Sync with inventory store to ensure table view is updated
      await syncAfterMutation();
      
      // If in grouped view, refresh grouped data as well
      if (displayMode === 'grouped') {
        await fetchGroupedInventory();
      }
      
      success('Product deleted successfully');
      onClose();
    } catch (err) {
      error(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string | null) => {
    const colors: { [key: string]: string } = {
      'electronics': 'bg-purple-100 text-purple-800 border-purple-200',
      'furniture': 'bg-amber-100 text-amber-800 border-amber-200',
      'office supplies': 'bg-blue-100 text-blue-800 border-blue-200',
      'raw materials': 'bg-stone-100 text-stone-800 border-stone-200',
      'tools & equipment': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'packaging': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'safety equipment': 'bg-red-100 text-red-800 border-red-200',
      'cleaning supplies': 'bg-green-100 text-green-800 border-green-200',
      'software': 'bg-violet-100 text-violet-800 border-violet-200',
      'services': 'bg-pink-100 text-pink-800 border-pink-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!product) return null;

  const categoryOptions = DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const priorityOptions = DEFAULT_PRIORITIES.map(pri => ({ value: pri, label: pri }));
  const unitOptions = DEFAULT_UNITS.filter(unit => unit !== 'Custom').map(unit => ({ value: unit, label: unit }));
  const locationOptions = locations.map(loc => ({ 
    value: loc.id, 
    label: `${loc.name} (${loc.code}) - ${loc.area}` 
  }));

  const linkedKanbanOptions = currentKanban?.linkedKanbans?.map(link => ({
    value: link.id,
    label: `${link.name}${link.locationName ? ` - ${link.locationName}` : ''}`
  })) || [];

  const content = (
    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                {/* Product Image */}
                {product.productImage && (
                  <div className="rounded-lg overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={product.productImage}
                      alt={product.productDetails}
                      className="w-full h-32 sm:h-40 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

      {/* Basic Info Section */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Product Name *</h3>
          {(currentKanban?.type === 'order' && product.isDraft) ? (
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg font-semibold text-gray-900"
                placeholder="Search for existing product or enter new item name"
                value={productSearchQuery}
                onChange={(e) => handleProductSearchChange(e.target.value)}
                onFocus={() => setShowProductDropdown(true)}
              />
              {showProductDropdown && (productSearchQuery.length >= 2) && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isSearching ? (
                    <div className="p-3 text-gray-500 text-center">Searching...</div>
                  ) : productSearchResults.length > 0 ? (
                    <>
                      {productSearchResults.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                          onClick={() => handleSelectProduct(result)}
                        >
                          <div className="font-medium text-gray-900">{result.productDetails}</div>
                          <div className="text-sm text-gray-500">
                            {result.sku && `SKU: ${result.sku}`}
                            {result.category && ` | Category: ${result.category}`}
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="w-full text-left p-3 hover:bg-gray-100 text-blue-600 font-medium"
                        onClick={handleSelectNewProduct}
                      >
                        + Use new product name: "{productSearchQuery}"
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left p-3 hover:bg-gray-100 text-blue-600 font-medium"
                      onClick={handleSelectNewProduct}
                    >
                      + Use new product name: "{productSearchQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <BasicInlineEdit
              value={product.productDetails}
              onSave={(value) => handleFieldUpdate('productDetails', value)}
              type="textarea"
              placeholder="Enter product name"
              rows={2}
              maxLength={1000}
              className="text-base sm:text-lg font-semibold text-gray-900"
              validation={(value) => {
                if (!value || value.toString().trim().length === 0) {
                  return 'Product name is required';
                }
                return null;
              }}
            />
          )}
        </div>

        {/* Requester Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Requester</h4>
            <BasicInlineEdit
              value={product.requesterName || ''}
              onSave={(value) => handleFieldUpdate('requesterName', value)}
              placeholder="Enter requester name"
              maxLength={255}
              className="text-sm text-gray-700"
            />
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Department</h4>
            <BasicInlineEdit
              value={product.requesterDepartment || ''}
              onSave={(value) => handleFieldUpdate('requesterDepartment', value)}
              placeholder="Enter department"
              maxLength={255}
              className="text-sm text-gray-700"
            />
          </div>
        </div>

        {/* Compact SKU and Supplier row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">SKU</h4>
            <BasicInlineEdit
              value={product.sku || ''}
              onSave={(value) => handleFieldUpdate('sku', value)}
              placeholder="Enter SKU"
              maxLength={100}
              className="text-sm text-gray-600"
            />
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Supplier</h4>
            <BasicInlineEdit
              value={product.supplier || ''}
              onSave={(value) => handleFieldUpdate('supplier', value)}
              placeholder="Enter supplier"
              maxLength={255}
              className="text-sm text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Categories and Priority - Compact row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Category</h4>
          <BasicInlineEdit
            value={product.category || ''}
            onSave={(value) => handleFieldUpdate('category', value)}
            type="select"
            options={categoryOptions}
            placeholder="Select category"
            renderValue={(val) => val ? (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(val as string)}`}>
                <TagIcon className="h-3 w-3 mr-1" />
                {val}
              </span>
            ) : null}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Priority</h4>
          <BasicInlineEdit
            value={product.priority || ''}
            onSave={(value) => handleFieldUpdate('priority', value)}
            type="select"
            options={priorityOptions}
            placeholder="Select priority"
            renderValue={(val) => val ? (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(val as string)}`}>
                {val}
              </span>
            ) : null}
          />
        </div>
      </div>

      {/* Location (only for receive kanbans) */}
      {currentKanban?.type === 'receive' && (
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Location</h4>
          <BasicInlineEdit
            value={product.locationId || ''}
            onSave={(value) => handleFieldUpdate('locationId', value)}
            type="select"
            options={locationOptions}
            placeholder="Select location"
            displayValue={product.locationId ? (() => {
              const loc = locations.find(l => l.id === product.locationId);
              return loc ? (
                <div className="flex items-center text-xs text-gray-600">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  {loc.name} ({loc.code})
                </div>
              ) : 'Unknown location';
            })() : undefined}
          />
        </div>
      )}

      {/* Transfer Destination (only for order kanbans) */}
      {currentKanban?.type === 'order' && linkedKanbanOptions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Transfer Destination</h4>
          <BasicInlineEdit
            value={product.preferredReceiveKanbanId || ''}
            onSave={(value) => handleFieldUpdate('preferredReceiveKanbanId', value)}
            type="select"
            options={linkedKanbanOptions}
            placeholder="Use kanban default"
            displayValue={(() => {
              // 1) Product-specific preference
              if (product.preferredReceiveKanbanId && currentKanban?.linkedKanbans) {
                const preferred = currentKanban.linkedKanbans.find(
                  k => k.id === product.preferredReceiveKanbanId,
                );
                if (preferred) {
                  return `${preferred.name}${
                    preferred.locationName ? ` - ${preferred.locationName}` : ''
                  }`;
                }
              }

              // 2) Fallback to kanban default linked receive board (actual effective destination)
              if (currentKanban?.defaultLinkedKanbanId && currentKanban.linkedKanbans) {
                const def = currentKanban.linkedKanbans.find(
                  k => k.id === currentKanban.defaultLinkedKanbanId,
                );
                if (def) {
                  return `${def.name}${def.locationName ? ` - ${def.locationName}` : ''}`;
                }
              }

              // 3) No default configured at kanban-level
              return 'Default transfer not set';
            })()}
          />
          <p className="mt-1 text-xs text-gray-500">
            Transfers when moved to "Purchased"
          </p>
        </div>
      )}

      {/* Product Details - Compact Layout */}
      <div className="space-y-2">
        {/* Links Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Image URL</h4>
            <BasicInlineEdit
              value={product.productImage || ''}
              onSave={(value) => handleFieldUpdate('productImage', value)}
              placeholder="Enter image URL"
              displayValue={product.productImage ? (
                <div className="flex items-center text-xs text-gray-600">
                  <PhotoIcon className="h-3 w-3 mr-1" />
                  Image set
                </div>
              ) : undefined}
              validation={(value) => {
                if (value && value.toString().trim()) {
                  try {
                    new URL(value.toString());
                    return null;
                  } catch {
                    return 'Please enter a valid URL';
                  }
                }
                return null;
              }}
            />
          </div>
        </div>

        {/* Weight and Unit Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Weight</h4>
            <BasicInlineEdit
              value={product.weight || ''}
              onSave={(value) => handleFieldUpdate('weight', value)}
              type="number"
              placeholder="0.00"
              displayValue={product.weight ? `${product.weight} ${product.unit || 'kg'}` : undefined}
              validation={(value) => {
                if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
                  return 'Weight must be a positive number';
                }
                return null;
              }}
            />
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Unit</h4>
            <BasicInlineEdit
              value={product.unit || ''}
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

        {/* Stock Level and Unit Price Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Request Quantity</h4>
            <BasicInlineEdit
              value={product.stockLevel || ''}
              onSave={(value) => handleFieldUpdate('stockLevel', value)}
              type="number"
              placeholder="0"
              displayValue={product.stockLevel !== null ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <CubeIcon className="h-3 w-3 mr-1" />
                  {product.stockLevel}
                </span>
              ) : undefined}
              validation={(value) => {
                if (value && (isNaN(Number(value)) || Number(value) < 0)) {
                  return 'Stock level must be a non-negative number';
                }
                return null;
              }}
            />
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Unit Price</h4>
            <BasicInlineEdit
              value={product.unitPrice || ''}
              onSave={(value) => handleFieldUpdate('unitPrice', value)}
              type="number"
              placeholder="0.00"
              displayValue={product.unitPrice ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                  {formatCurrency(product.unitPrice)}
                </span>
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

        {/* Dimensions */}
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Dimensions</h4>
          <BasicInlineEdit
            value={product.dimensions || ''}
            onSave={(value) => handleFieldUpdate('dimensions', value)}
            placeholder="e.g., 10x20x5 cm"
            maxLength={255}
          />
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Tags</h4>
          <BasicInlineEdit
            value={Array.isArray(product.tags) ? product.tags.join(', ') : ''}
            onSave={(value) => {
              const tags = value.toString().split(',').map(tag => tag.trim()).filter(Boolean);
              return handleFieldUpdate('tags', tags);
            }}
            placeholder="Separate tags with commas"
            displayValue={Array.isArray(product.tags) && product.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : undefined}
          />
        </div>

        {/* Notes */}
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1">Notes</h4>
          <BasicInlineEdit
            value={product.notes || ''}
            onSave={(value) => handleFieldUpdate('notes', value)}
            type="textarea"
            placeholder="Enter notes..."
            rows={2}
            maxLength={1000}
            displayValue={product.notes ? (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                {product.notes}
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
            placeholder="Share updates or ask a question..."
            submitLabel="Add Comment"
          />
        </div>
                </div>

      {/* Metadata - Compact */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Created: {formatDateWithTime(product.createdAt)}
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            Updated: {new Date(product.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Delete Section - Less Prominent */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon className="h-3 w-3 mr-1.5" />
          Delete Product
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Product</h3>
                </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{product.productDetails}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
                  <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
                      </div>
                    )}
                  </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Product Details">
        {content}
      </BottomSheet>
    );
  }

  return (
    <Slider isOpen={isOpen} onClose={onClose} title="Product Details">
      {content}
    </Slider>
  );
}