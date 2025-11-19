import { useState, useEffect } from 'react';
import { Product, CreateProduct, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { Slider } from './Slider';
import { BottomSheet } from './BottomSheet';
import { BasicInlineEdit } from './BasicInlineEdit';
import {
  TagIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface ProductFormProps {
  kanbanId: string;
  initialColumn: string;
  product?: Product;
  onClose: () => void;
}

export default function ProductForm({ kanbanId, initialColumn, product, onClose }: ProductFormProps) {
  const { createProduct, updateProduct: kanbanUpdateProduct, currentKanban } = useKanbanStore();
  const { updateProduct: inventoryUpdateProduct } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    productDetails: product?.productDetails || '',
    productLink: product?.productLink || '',
    location: '',
    locationId: product?.locationId || null,
    preferredReceiveKanbanId: product?.preferredReceiveKanbanId || '',
    priority: product?.priority || '',
    stockLevel: product?.stockLevel?.toString() || '',
    // Enhanced fields
    category: product?.category || '',
    tags: product?.tags?.join(', ') || '',
    supplier: product?.supplier || '',
    dimensions: product?.dimensions || '',
    weight: product?.weight?.toString() || '',
    unit: product?.unit || '',
    unitPrice: product?.unitPrice?.toString() || '',
    notes: product?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Options for select fields
  const categoryOptions = DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const priorityOptions = DEFAULT_PRIORITIES.map(pri => ({ value: pri, label: pri }));
  const unitOptions = DEFAULT_UNITS.filter(unit => unit !== 'Custom').map(unit => ({ value: unit, label: unit }));

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

  // Compute label for using kanban default destination
  const defaultReceiveKanban = currentKanban?.defaultLinkedKanbanId
    ? currentKanban?.linkedKanbans?.find(k => k.id === currentKanban.defaultLinkedKanbanId)
    : undefined;
  const usingKanbanDefaultLabel = defaultReceiveKanban
    ? `${defaultReceiveKanban.locationName || defaultReceiveKanban.name}`
    : 'default not set in kanban setting';

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productDetails.trim()) {
      newErrors.productDetails = 'Product details are required';
    }


    if (formData.stockLevel && (isNaN(parseInt(formData.stockLevel)) || parseInt(formData.stockLevel) < 0)) {
      newErrors.stockLevel = 'Stock level must be a positive number';
    }

    if (formData.weight && (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0)) {
      newErrors.weight = 'Weight must be a positive number';
    }

    if (formData.unitPrice && (isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) <= 0)) {
      newErrors.unitPrice = 'Unit price must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (product) {
        // Update existing product
        const updateData: UpdateProduct = {
          productDetails: formData.productDetails,
          locationId: currentKanban?.type === 'receive' ? formData.locationId : null, // Only set location for receive kanbans
          preferredReceiveKanbanId: currentKanban?.type === 'order' ? (formData.preferredReceiveKanbanId || null) : undefined,
          priority: formData.priority || null,
          // Enhanced fields
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
          supplier: formData.supplier || null,
          dimensions: formData.dimensions || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          unit: formData.unit || null,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          notes: formData.notes || null,
        };

          // Only include stockLevel if it's allowed (product is in Stored status)
        if (product.columnStatus === 'Stored' && formData.stockLevel) {
          updateData.stockLevel = parseInt(formData.stockLevel, 10);
        }

        // Update both kanban and inventory stores for optimistic updates
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
      } else {
        // Create new product
        const createData: CreateProduct = {
          kanbanId,
          columnStatus: initialColumn,
          productDetails: formData.productDetails,
          locationId: currentKanban?.type === 'receive' ? formData.locationId : null, // Only set location for receive kanbans
          assignedToPersonId: null,
          preferredReceiveKanbanId: currentKanban?.type === 'order' ? (formData.preferredReceiveKanbanId || undefined) : undefined,
          priority: formData.priority || null,
          // Enhanced fields
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
          supplier: formData.supplier || null,
          dimensions: formData.dimensions || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          unit: formData.unit || null,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          notes: formData.notes || null,
        };

        await createProduct(createData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formBody = (
    <div className="space-y-4">
      {/* Product Name - Compact */}
      <div className="mb-3">
        <BasicInlineEdit
          value={formData.productDetails}
          onSave={(value) => setFormData({ ...formData, productDetails: value })}
          type="textarea"
          placeholder="Enter product name"
          rows={2}
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

      {/* Compact Basic Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Category</h4>
          <BasicInlineEdit
            value={formData.category}
            onSave={(value) => setFormData({ ...formData, category: value })}
            type="select"
            options={categoryOptions}
            placeholder="Select category"
            displayValue={formData.category ? (
              <div className="flex items-center">
                <TagIcon className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600">{formData.category}</span>
              </div>
            ) : undefined}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Supplier</h4>
          <BasicInlineEdit
            value={formData.supplier}
            onSave={(value) => setFormData({ ...formData, supplier: value })}
            placeholder="Enter supplier"
            maxLength={255}
            displayValue={formData.supplier ? (
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600 truncate">{formData.supplier}</span>
              </div>
            ) : undefined}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Priority</h4>
          <BasicInlineEdit
            value={formData.priority}
            onSave={(value) => setFormData({ ...formData, priority: value })}
            type="select"
            options={priorityOptions}
            placeholder="Select priority"
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Tags</h4>
          <BasicInlineEdit
            value={formData.tags}
            onSave={(value) => setFormData({ ...formData, tags: value })}
            placeholder="urgent, fragile, bulk"
          />
        </div>
      </div>


      {/* Compact Physical Properties */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Dimensions</h4>
          <BasicInlineEdit
            value={formData.dimensions}
            onSave={(value) => setFormData({ ...formData, dimensions: value })}
            placeholder="L x W x H"
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Weight</h4>
          <BasicInlineEdit
            value={formData.weight}
            onSave={(value) => setFormData({ ...formData, weight: value })}
            type="number"
            placeholder="0.00"
            displayValue={formData.weight ? (
              <div className="flex items-center">
                <CubeIcon className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600">{formData.weight} {formData.unit || 'kg'}</span>
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
            value={formData.unit}
            onSave={(value) => setFormData({ ...formData, unit: value })}
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
            value={formData.unitPrice}
            onSave={(value) => setFormData({ ...formData, unitPrice: value })}
            type="number"
            placeholder="0.00"
            displayValue={formData.unitPrice ? (
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600">{formData.unitPrice}</span>
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

        {/* Location dropdown only for receive kanbans */}
        {currentKanban?.type === 'receive' && (
          <div className="sm:col-span-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Location</h4>
            <BasicInlineEdit
              value={formData.locationId || ''}
              onSave={(value) => setFormData({ ...formData, locationId: value || null })}
              type="select"
              options={locations.map(location => ({
                value: location.id,
                label: `${location.name} (${location.code}) - ${location.area}`
              }))}
              placeholder="Select a location..."
            />
          </div>
        )}

        {/* Preferred receive kanban dropdown only for order kanbans */}
        {currentKanban?.type === 'order' && currentKanban.linkedKanbans && currentKanban.linkedKanbans.length > 0 && (
          <div className="sm:col-span-3">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Preferred Transfer Destination</h4>
            <BasicInlineEdit
              value={formData.preferredReceiveKanbanId || ''}
              onSave={(value) => setFormData({ ...formData, preferredReceiveKanbanId: value || '' })}
              type="select"
              options={[
                { value: '', label: usingKanbanDefaultLabel },
                ...currentKanban.linkedKanbans.map((link) => ({
                  value: link.id,
                  label: link.locationName ? `${link.name} - ${link.locationName}` : link.name
                }))
              ]}
              placeholder="Select destination"
            />
            <p className="mt-1 text-xs text-gray-500">
              This product will be transferred to the selected receive kanban when moved to "Purchased"
            </p>
          </div>
        )}

        {product && product.columnStatus === 'Stored' && (
          <div className="sm:col-span-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Stock Level</h4>
            <BasicInlineEdit
              value={formData.stockLevel}
              onSave={(value) => setFormData({ ...formData, stockLevel: value })}
              type="number"
              placeholder="0"
              validation={(value) => {
                if (value && (isNaN(Number(value)) || Number(value) < 0)) {
                  return 'Stock level must be a positive number';
                }
                return null;
              }}
            />
          </div>
        )}

        <div className="sm:col-span-3">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Location Notes</h4>
          <BasicInlineEdit
            value={formData.location}
            onSave={(value) => setFormData({ ...formData, location: value })}
            placeholder="Additional location details (optional)"
          />
        </div>

        <div className="sm:col-span-3">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Notes</h4>
          <BasicInlineEdit
            value={formData.notes}
            onSave={(value) => setFormData({ ...formData, notes: value })}
            type="textarea"
            placeholder="Add any special handling instructions or context..."
            rows={3}
            maxLength={1000}
          />
        </div>
    </div>
  );

  const footerButtons = (
    <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-0 py-0 sm:flex-row sm:justify-end sm:px-0">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="btn-secondary w-full sm:w-auto sm:px-6 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full sm:w-auto sm:px-6 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
      </button>
    </div>
  );

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <div className="flex-1">{formBody}</div>
      <div className="mt-4">{footerButtons}</div>
    </form>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={true} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'}>
        {form}
      </BottomSheet>
    );
  }

  return (
    <Slider isOpen={true} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'}>
      {form}
    </Slider>
  );
}
