import { useState, useEffect } from 'react';
import { Product, UpdateProduct, PRODUCT_CATEGORIES } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useLocationStore } from '../store/locationStore';
import { useToast } from '../store/toastStore';
import { Slider } from './Slider';
import { SliderTabs } from './SliderTabs';
import { formatCurrency } from '../utils/formatters';

interface ProductSidebarProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: UpdateProduct) => void;
}

type TabType = 'view' | 'edit' | 'delete';

export default function ProductSidebar({ product, isOpen, onClose, onUpdate }: ProductSidebarProps) {
  const { updateProduct, deleteProduct } = useKanbanStore();
  const { locations, fetchLocations } = useLocationStore();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('view');
  const [formData, setFormData] = useState({
    productDetails: '',
    productLink: '',
    location: '',
    locationId: '',
    priority: '',
    stockLevel: '',
    productImage: '',
    category: '',
    tags: '',
    supplier: '',
    sku: '',
    dimensions: '',
    weight: '',
    unitPrice: '',
    notes: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        productDetails: product.productDetails || '',
        productLink: product.productLink || '',
        location: product.location || '',
        locationId: product.locationId || '',
        priority: product.priority || '',
        stockLevel: product.stockLevel?.toString() || '',
        productImage: product.productImage || '',
        category: product.category || '',
        tags: product.tags?.join(', ') || '',
        supplier: product.supplier || '',
        sku: product.sku || '',
        dimensions: product.dimensions || '',
        weight: product.weight?.toString() || '',
        unitPrice: product.unitPrice?.toString() || '',
        notes: product.notes || '',
      });
    }
    // Reset to view tab when product changes
    setActiveTab('view');
  }, [product]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleUpdate = async () => {
    if (!product) return;

    const updateData: UpdateProduct = {
      productDetails: formData.productDetails,
      productLink: formData.productLink || undefined,
      location: formData.location || undefined,
      priority: formData.priority || undefined,
      stockLevel: formData.stockLevel ? parseInt(formData.stockLevel) : undefined,
      productImage: formData.productImage || undefined,
      category: formData.category || undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      supplier: formData.supplier || undefined,
      sku: formData.sku || undefined,
      dimensions: formData.dimensions || undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
      notes: formData.notes || undefined,
    };

    setIsUpdating(true);
    try {
      await updateProduct(product.id, updateData);
      success('Product updated successfully');
      onUpdate?.(product.id, updateData);
      onClose();
    } catch (err) {
      error(`Failed to update product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.productDetails}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await deleteProduct(product.id);
        success('Product deleted successfully');
        onClose();
      } catch (err) {
        error(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsDeleting(false);
      }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!product) return null;

  // Define tabs for SliderTabs component
  const tabs = [
    {
      id: 'view',
      label: 'View',
      content: (
        <div className="space-y-6">
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

                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.productDetails}</h3>
                  {product.sku && (
                    <p className="text-sm text-gray-600 mb-1">SKU: {product.sku}</p>
                  )}
                  {product.supplier && (
                    <p className="text-sm text-gray-600 mb-1">Supplier: {product.supplier}</p>
                  )}
                  {product.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {product.location}
                    </div>
                  )}
                </div>

                {/* Tags and Categories */}
                <div className="flex flex-wrap gap-2">
                  {product.category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(product.category)}`}>
                      {product.category}
                    </span>
                  )}
                  {product.priority && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(product.priority)}`}>
                      {product.priority}
                    </span>
                  )}
                  {product.stockLevel !== null && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      Stock: {product.stockLevel}
                    </span>
                  )}
                  {product.unitPrice !== null && formatCurrency(product.unitPrice) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      {formatCurrency(product.unitPrice)}
                    </span>
                  )}
                </div>

                {/* Product Tags */}
                {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
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
                  </div>
                )}

                {/* Additional Details */}
                <div className="space-y-3">
                  {product.dimensions && (
                    <div>
                      <span className="font-medium text-gray-700">Dimensions:</span>
                      <span className="ml-2 text-gray-600">{product.dimensions}</span>
                    </div>
                  )}
                  {product.weight !== null && (
                    <div>
                      <span className="font-medium text-gray-700">Weight:</span>
                      <span className="ml-2 text-gray-600">{product.weight} kg</span>
                    </div>
                  )}
                  {product.productLink && (
                    <div>
                      <span className="font-medium text-gray-700">Product Link:</span>
                      <a
                        href={product.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:text-blue-800 break-all block"
                      >
                        {product.productLink}
                      </a>
                    </div>
                  )}
                  {product.notes && (
                    <div>
                      <span className="font-medium text-gray-700">Notes:</span>
                      <p className="mt-1 text-gray-600 text-sm bg-gray-50 p-3 rounded">{product.notes}</p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Created: {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Updated: {new Date(product.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
      )
    },
    {
      id: 'edit',
      label: 'Edit',
      content: (
        <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Product</h3>

                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Details *
                  </label>
                  <textarea
                    name="productDetails"
                    value={formData.productDetails}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {locations.length > 0 ? (
                    <select
                      name="location"
                      value={formData.locationId}
                      onChange={(e) => {
                        const selectedLocation = locations.find(loc => loc.id === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          locationId: e.target.value,
                          location: selectedLocation?.name || '',
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.code}) - {location.area}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
                  <input
                    type="url"
                    name="productLink"
                    value={formData.productLink}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {PRODUCT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
                    <input
                      type="number"
                      name="stockLevel"
                      value={formData.stockLevel}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image URL</label>
                  <input
                    type="url"
                    name="productImage"
                    value={formData.productImage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="e.g., 10x20x5 cm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="Separate tags with commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Update Button */}
                <div className="pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : 'Update Product'}
                  </button>
                </div>
              </div>
      )
    },
    {
      id: 'delete',
      label: 'Delete',
      content: (
        <div className="space-y-6">
                <h3 className="text-lg font-medium text-red-900 mb-4">Delete Product</h3>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Warning</h4>
                  <p className="text-red-700 text-sm">
                    Deleting this product is a permanent action and cannot be undone. All data associated with this product will be permanently removed.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Product to be deleted:</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Name:</span>
                      <p className="text-gray-900">{product.productDetails}</p>
                    </div>
                    {product.sku && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">SKU:</span>
                        <p className="text-gray-900">{product.sku}</p>
                      </div>
                    )}
                    {product.supplier && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Supplier:</span>
                        <p className="text-gray-900">{product.supplier}</p>
                      </div>
                    )}
                    {product.category && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Category:</span>
                        <p className="text-gray-900">{product.category}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Product Permanently'}
                </button>
              </div>
      )
    }
  ];

  return (
    <Slider
      isOpen={isOpen}
      onClose={onClose}
      title="Product Details"
    >
      <SliderTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />
    </Slider>
  );
}
