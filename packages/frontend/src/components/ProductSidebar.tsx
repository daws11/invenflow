import { useState, useEffect } from 'react';
import { Product, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useLocationStore } from '../store/locationStore';
import { useToast } from '../store/toastStore';
import { Slider } from './Slider';
import { BottomSheet } from './BottomSheet';
import { BasicInlineEdit } from './BasicInlineEdit';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import {
  TagIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ClockIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface ProductSidebarProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: UpdateProduct) => void;
}

export default function ProductSidebar({ product, isOpen, onClose, onUpdate }: ProductSidebarProps) {
  const { updateProduct, deleteProduct, currentKanban } = useKanbanStore();
  const { locations, fetchLocations } = useLocationStore();
  const { success, error } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleFieldUpdate = async (field: keyof UpdateProduct, value: string | number | string[]) => {
    if (!product) return;

    const updateData: UpdateProduct = {
      [field]: value || undefined,
    };

    try {
      await updateProduct(product.id, updateData);
      success('Product updated successfully');
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
        await deleteProduct(product.id);
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {/* Product Image */}
                {product.productImage && (
                  <div className="rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={product.productImage}
                      alt={product.productDetails}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

      {/* Basic Info Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Product Name *</h3>
          <BasicInlineEdit
            value={product.productDetails}
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
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">SKU</h4>
          <BasicInlineEdit
            value={product.sku || ''}
            onSave={(value) => handleFieldUpdate('sku', value)}
            placeholder="Enter SKU"
            maxLength={100}
            className="text-sm text-gray-600"
          />
                </div>

                  <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Supplier</h4>
          <BasicInlineEdit
            value={product.supplier || ''}
            onSave={(value) => handleFieldUpdate('supplier', value)}
            placeholder="Enter supplier name"
            maxLength={255}
            className="text-sm text-gray-600"
          />
                    </div>
                  </div>

      {/* Categories and Priority */}
        <div className="space-y-4">
                <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
          <BasicInlineEdit
            value={product.category || ''}
            onSave={(value) => handleFieldUpdate('category', value)}
            type="select"
            options={categoryOptions}
            placeholder="Select category"
            displayValue={product.category ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(product.category)}`}>
                <TagIcon className="h-4 w-4 mr-1" />
                {product.category}
              </span>
            ) : undefined}
                  />
                </div>

                <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
          <BasicInlineEdit
            value={product.priority || ''}
            onSave={(value) => handleFieldUpdate('priority', value)}
            type="select"
            options={priorityOptions}
            placeholder="Select priority"
            displayValue={product.priority ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(product.priority)}`}>
                {product.priority}
              </span>
            ) : undefined}
          />
        </div>
                </div>

      {/* Location (only for receive kanbans) */}
                {currentKanban?.type === 'receive' && (
                  <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
          <BasicInlineEdit
            value={product.locationId || ''}
            onSave={(value) => handleFieldUpdate('locationId', value)}
            type="select"
            options={locationOptions}
            placeholder="Select location"
            displayValue={product.locationId ? (() => {
              const loc = locations.find(l => l.id === product.locationId);
              return loc ? (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  {loc.name} ({loc.code}) - {loc.area}
                </div>
              ) : 'Unknown location';
            })() : undefined}
          />
                  </div>
                )}

      {/* Transfer Destination (only for order kanbans) */}
      {currentKanban?.type === 'order' && linkedKanbanOptions.length > 0 && (
                  <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Transfer Destination</h4>
          <BasicInlineEdit
            value={product.preferredReceiveKanbanId || ''}
            onSave={(value) => handleFieldUpdate('preferredReceiveKanbanId', value)}
            type="select"
            options={linkedKanbanOptions}
            placeholder="Use kanban default setting"
            displayValue={product.preferredReceiveKanbanId ? (() => {
              const kanban = currentKanban?.linkedKanbans?.find(k => k.id === product.preferredReceiveKanbanId);
              return kanban ? `${kanban.name}${kanban.locationName ? ` - ${kanban.locationName}` : ''}` : 'Unknown kanban';
            })() : 'Using kanban default'}
          />
                    <p className="mt-1 text-xs text-gray-500">
                      This product will be transferred to the selected receive kanban when moved to "Purchased"
                    </p>
                  </div>
                )}

      {/* Product Details */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Product Link</h4>
          <BasicInlineEdit
            value={product.productLink || ''}
            onSave={(value) => handleFieldUpdate('productLink', value)}
            placeholder="Enter product URL"
            displayValue={product.productLink ? (
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm break-all"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                {product.productLink}
              </a>
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

                <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Product Image URL</h4>
          <BasicInlineEdit
            value={product.productImage || ''}
            onSave={(value) => handleFieldUpdate('productImage', value)}
            placeholder="Enter image URL"
            displayValue={product.productImage ? (
              <div className="flex items-center text-sm text-gray-600">
                <PhotoIcon className="h-4 w-4 mr-1" />
                Image URL set
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Weight</h4>
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Unit</h4>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Level</h4>
            <BasicInlineEdit
              value={product.stockLevel || ''}
              onSave={(value) => handleFieldUpdate('stockLevel', value)}
                      type="number"
              placeholder="0"
              displayValue={product.stockLevel !== null ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <CubeIcon className="h-4 w-4 mr-1" />
                  Stock: {product.stockLevel}
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Unit Price</h4>
            <BasicInlineEdit
              value={product.unitPrice || ''}
              onSave={(value) => handleFieldUpdate('unitPrice', value)}
                      type="number"
              placeholder="0.00"
              displayValue={product.unitPrice ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
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

                <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Dimensions</h4>
          <BasicInlineEdit
            value={product.dimensions || ''}
            onSave={(value) => handleFieldUpdate('dimensions', value)}
            placeholder="e.g., 10x20x5 cm"
            maxLength={255}
                  />
                </div>

                  <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
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
                    className="inline-flex items-center px-2 py-1 rounded text-sm bg-gray-50 text-gray-600 border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : undefined}
                    />
                  </div>

                  <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
          <BasicInlineEdit
            value={product.notes || ''}
            onSave={(value) => handleFieldUpdate('notes', value)}
            type="textarea"
            placeholder="Enter notes..."
            rows={3}
            maxLength={1000}
            displayValue={product.notes ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                {product.notes}
              </div>
            ) : undefined}
                    />
                  </div>
                </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500 mb-1">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Created: {formatDateWithTime(product.createdAt)}
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <ClockIcon className="h-3 w-3 mr-1" />
          Updated: {new Date(product.updatedAt).toLocaleDateString()}
                  </div>
                </div>

      {/* Delete Section */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
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
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Product Details" heightClassName="h-[85%]">
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