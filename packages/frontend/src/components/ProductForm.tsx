import { useState } from 'react';
import { Product, CreateProduct, UpdateProduct } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';

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
    priority: product?.priority || '',
    stockLevel: product?.stockLevel?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (product) {
        // Update existing product
        const updateData: UpdateProduct = {
          productDetails: formData.productDetails,
          productLink: formData.productLink || null,
          location: formData.location || null,
          priority: formData.priority || null,
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
          priority: formData.priority || null,
        };

        await createProduct(createData);
      }

      onClose();
    } catch (error) {
      alert('Failed to save product');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {product ? 'Edit Product' : 'Add New Product'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Details *
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 h-24"
              placeholder="Enter product details..."
              value={formData.productDetails}
              onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Link
            </label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded-md p-3"
              placeholder="https://example.com/product"
              value={formData.productLink}
              onChange={(e) => setFormData({ ...formData, productLink: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3"
              placeholder="Storage location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
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
                className="w-full border border-gray-300 rounded-md p-3"
                placeholder="0"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {product ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}