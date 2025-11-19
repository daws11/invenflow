import { useState, useEffect } from 'react';
import { Product, CreateProduct, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, DEFAULT_UNITS } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { Slider } from './Slider';
import { BottomSheet } from './BottomSheet';

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
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Product Name *</h4>
        <textarea
          className={`w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y shadow-sm ${errors.productDetails ? 'border-red-500' : 'border-gray-300 hover:border-blue-200 hover:bg-blue-50/50'}`}
          placeholder="Enter product name"
          value={formData.productDetails}
          onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
          rows={2}
          maxLength={1000}
        />
        {errors.productDetails && (
          <p className="mt-1 text-sm text-red-600">{errors.productDetails}</p>
        )}
      </div>

      {/* Compact Basic Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Category</h4>
          <select
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">Select category</option>
            {DEFAULT_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Supplier</h4>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            placeholder="Enter supplier"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            maxLength={255}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Priority</h4>
          <select
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="">Select priority</option>
            {DEFAULT_PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Tags</h4>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            placeholder="urgent, fragile, bulk"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </div>
      </div>


      {/* Compact Physical Properties */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Dimensions</h4>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            placeholder="L x W x H"
            value={formData.dimensions}
            onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Weight</h4>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50 ${errors.weight ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="0.00"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          />
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Unit</h4>
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
              value={formData.unit === 'Custom' || !DEFAULT_UNITS.includes(formData.unit as any) ? 'Custom' : formData.unit}
              onChange={(e) => {
                if (e.target.value === 'Custom') {
                  setFormData({ ...formData, unit: '' });
                } else {
                  setFormData({ ...formData, unit: e.target.value });
                }
              }}
            >
              <option value="">Select unit...</option>
              {DEFAULT_UNITS.filter(unit => unit !== 'Custom').map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
              <option value="Custom">Custom</option>
            </select>
            {(formData.unit === 'Custom' || !DEFAULT_UNITS.includes(formData.unit as any)) && formData.unit !== '' && (
              <input
                type="text"
                className="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
                placeholder="Custom unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                maxLength={20}
              />
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Unit Price</h4>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50 ${errors.unitPrice ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="0.00"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
          />
          {errors.unitPrice && (
            <p className="mt-1 text-sm text-red-600">{errors.unitPrice}</p>
          )}
        </div>
      </div>

        {/* Location dropdown only for receive kanbans */}
        {currentKanban?.type === 'receive' && (
          <div className="sm:col-span-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Location</h4>
            <select
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
              value={formData.locationId || ''}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value || null })}
            >
              <option value="">Select a location...</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code}) - {location.area}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Preferred receive kanban dropdown only for order kanbans */}
        {currentKanban?.type === 'order' && currentKanban.linkedKanbans && currentKanban.linkedKanbans.length > 0 && (
          <div className="sm:col-span-3">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Preferred Transfer Destination</h4>
            <select
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
              value={formData.preferredReceiveKanbanId || ''}
              onChange={(e) => setFormData({ ...formData, preferredReceiveKanbanId: e.target.value || '' })}
            >
              <option value="">{usingKanbanDefaultLabel}</option>
              {currentKanban.linkedKanbans.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.name}
                  {link.locationName && ` - ${link.locationName}`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This product will be transferred to the selected receive kanban when moved to "Purchased"
            </p>
          </div>
        )}

        {product && product.columnStatus === 'Stored' && (
          <div className="sm:col-span-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Stock Level</h4>
            <input
              type="number"
              min="0"
              className={`w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50 ${errors.stockLevel ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0"
              value={formData.stockLevel}
              onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
            />
            {errors.stockLevel && (
              <p className="mt-1 text-sm text-red-600">{errors.stockLevel}</p>
            )}
          </div>
        )}

        <div className="sm:col-span-3">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Location Notes</h4>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            placeholder="Additional location details (optional)"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        <div className="sm:col-span-3">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Notes</h4>
          <textarea
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
            placeholder="Add any special handling instructions or context..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
