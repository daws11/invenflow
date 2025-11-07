import { useState } from 'react';
import { Product, CreateProduct, UpdateProduct, DEFAULT_CATEGORIES, DEFAULT_PRIORITIES } from '@invenflow/shared';
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
    location: '',
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
          locationId: formData.locationId,
          assignedToPersonId: null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6 sm:px-6">
      <div className="w-full max-w-lg sm:max-w-2xl lg:max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="flex h-full max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:max-h-[calc(100vh-4rem)]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {product ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-sm text-gray-500">
                Provide key details so teammates know exactly what to handle.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="space-y-8">
              {/* Basic Information Section */}
              <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Basic Information</h4>
                  <span className="text-xs text-gray-400">Required</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Product Details *
                    </label>
                    <textarea
                      className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.productDetails ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Add a short description or key attributes..."
                      value={formData.productDetails}
                      onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
                      rows={4}
                    />
                    {errors.productDetails && (
                      <p className="mt-1 text-sm text-red-600">{errors.productDetails}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Product SKU"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Supplier name"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Media Section */}
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Media & Links</h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Product Image URL
                    </label>
                    <input
                      type="url"
                      className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.productImage ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="https://example.com/image.jpg"
                      value={formData.productImage}
                      onChange={(e) => setFormData({ ...formData, productImage: e.target.value })}
                    />
                    {errors.productImage && (
                      <p className="mt-1 text-sm text-red-600">{errors.productImage}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Product Link
                    </label>
                    <input
                      type="url"
                      className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.productLink ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="https://example.com/product"
                      value={formData.productLink}
                      onChange={(e) => setFormData({ ...formData, productLink: e.target.value })}
                    />
                    {errors.productLink && (
                      <p className="mt-1 text-sm text-red-600">{errors.productLink}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Specifications Section */}
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Specifications</h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Dimensions</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="L x W x H"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.weight ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="0.00"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.unitPrice ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="0.00"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                    {errors.unitPrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.unitPrice}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Status & Priority Section */}
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Status & Priority</h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                    <CompactLocationSelector
                      value={formData.locationId}
                      onChange={(locationId) => setFormData({ ...formData, locationId })}
                      placeholder="Select a location..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Stock Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        className={`w-full rounded-lg border p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${errors.stockLevel ? 'border-red-500' : 'border-gray-300'}`}
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Location Notes
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Additional location details (optional)"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="urgent, fragile, bulk"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Comma-separated tags</p>
                  </div>
                </div>
              </section>

              {/* Notes Section */}
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Additional Notes</h4>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Add any special handling instructions or context..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
        </form>
      </div>
    </div>
  );
}
