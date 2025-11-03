import { useState, useEffect } from 'react';
import { Product, CreateProduct, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES, COMMON_TAGS } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import CompactLocationSelector from './LocationSelector';

interface ProductFormProps {
  kanbanId: string;
  initialColumn: string;
  product?: Product;
  onClose: () => void;
}

export default function ProductForm({ kanbanId, initialColumn, product, onClose }: ProductFormProps) {
  const { createProduct, updateProduct } = useKanbanStore();
  const [formData, setFormData] = useState({
    productDetails: product?.productDetails || '',
    productLink: product?.productLink || '',
    location: product?.location || '',
    locationId: product?.locationId || null,
    priority: product?.priority || '',
    stockLevel: product?.stockLevel?.toString() || '',
    // Enhanced fields
    productImage: product?.productImage || '',
    category: product?.category || '',
    tags: product?.tags?.join(', ') || '',
    supplier: product?.supplier || '',
    sku: product?.sku || '',
    dimensions: product?.dimensions || '',
    weight: product?.weight?.toString() || '',
    unitPrice: product?.unitPrice?.toString() || '',
    notes: product?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productDetails.trim()) {
      newErrors.productDetails = 'Product details are required';
    }

    if (formData.productLink && !isValidUrl(formData.productLink)) {
      newErrors.productLink = 'Please enter a valid URL';
    }

    if (formData.productImage && !isValidUrl(formData.productImage)) {
      newErrors.productImage = 'Please enter a valid image URL';
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

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
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
          productLink: formData.productLink || null,
          location: formData.location || null,
          locationId: formData.locationId,
          priority: formData.priority || null,
          // Enhanced fields
          productImage: formData.productImage || null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
          supplier: formData.supplier || null,
          sku: formData.sku || null,
          dimensions: formData.dimensions || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          notes: formData.notes || null,
        };

        // Only include stockLevel if it's allowed (product is in Stored status)
        if (product.columnStatus === 'Stored' && formData.stockLevel) {
          updateData.stockLevel = parseInt(formData.stockLevel, 10);
        }

        await updateProduct(product.id, updateData);
      } else {
        // Create new product
        const createData: CreateProduct = {
          kanbanId,
          columnStatus: initialColumn,
          productDetails: formData.productDetails,
          productLink: formData.productLink || null,
          location: formData.location || null,
          locationId: formData.locationId,
          priority: formData.priority || null,
          // Enhanced fields
          productImage: formData.productImage || null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
          supplier: formData.supplier || null,
          sku: formData.sku || null,
          dimensions: formData.dimensions || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Details *
                </label>
                <textarea
                  className={`w-full border rounded-md p-3 h-24 ${errors.productDetails ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter product details..."
                  value={formData.productDetails}
                  onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
                />
                {errors.productDetails && (
                  <p className="mt-1 text-sm text-red-600">{errors.productDetails}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3"
                  placeholder="Product SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-3"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {DEFAULT_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3"
                  placeholder="Supplier name"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Media & Links</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image URL
                </label>
                <input
                  type="url"
                  className={`w-full border rounded-md p-3 ${errors.productImage ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="https://example.com/image.jpg"
                  value={formData.productImage}
                  onChange={(e) => setFormData({ ...formData, productImage: e.target.value })}
                />
                {errors.productImage && (
                  <p className="mt-1 text-sm text-red-600">{errors.productImage}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Link
                </label>
                <input
                  type="url"
                  className={`w-full border rounded-md p-3 ${errors.productLink ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="https://example.com/product"
                  value={formData.productLink}
                  onChange={(e) => setFormData({ ...formData, productLink: e.target.value })}
                />
                {errors.productLink && (
                  <p className="mt-1 text-sm text-red-600">{errors.productLink}</p>
                )}
              </div>
            </div>
          </div>

          {/* Specifications Section */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Specifications</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimensions
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3"
                  placeholder="L x W x H"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full border rounded-md p-3 ${errors.weight ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0.00"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
                {errors.weight && (
                  <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full border rounded-md p-3 ${errors.unitPrice ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
                {errors.unitPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.unitPrice}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Priority Section */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Status & Priority</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <CompactLocationSelector
                  value={formData.locationId}
                  onChange={(locationId) => setFormData({ ...formData, locationId })}
                  placeholder="Select a location..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-3"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="">Select priority</option>
                  {DEFAULT_PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              {product && product.columnStatus === 'Stored' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full border rounded-md p-3 ${errors.stockLevel ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="0"
                    value={formData.stockLevel}
                    onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
                  />
                  {errors.stockLevel && (
                    <p className="mt-1 text-sm text-red-600">{errors.stockLevel}</p>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Notes
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3"
                  placeholder="Additional location details (optional)"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3"
                  placeholder="urgent, fragile, bulk"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated tags</p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Additional Notes</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 h-20"
                placeholder="Additional notes about this product..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary flex-1 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (product ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}