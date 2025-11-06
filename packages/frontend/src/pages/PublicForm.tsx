import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../utils/api';
import { useLocationStore } from '../store/locationStore';
import { PRODUCT_CATEGORIES } from '@invenflow/shared';

interface KanbanInfo {
  id: string;
  name: string;
  type: string;
}

export default function PublicForm() {
  const { token } = useParams<{ token: string }>();
  const { locations, fetchLocations } = useLocationStore();
  const [kanbanInfo, setKanbanInfo] = useState<KanbanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    productDetails: '',
    productLink: '',
    location: '',
    locationId: '',
    priority: '',
    category: '',
    supplier: '',
    productImage: '',
    dimensions: '',
    weight: '',
    unitPrice: '',
    tags: '',
    notes: '',
    stockLevel: '',
  });

  useEffect(() => {
    if (token) {
      fetchKanbanInfo();
    }
  }, [token]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchKanbanInfo = async () => {
    try {
      setLoading(true);
      const info = await publicApi.getKanbanInfo(token!);
      setKanbanInfo(info);
      setError(null);
    } catch (error) {
      setError('Public form not found or has been disabled');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productDetails.trim()) {
      alert('Product details are required');
      return;
    }

    try {
      setSubmitting(true);
      await publicApi.submitForm(token!, {
        productDetails: formData.productDetails.trim(),
        productLink: formData.productLink.trim() || undefined,
        location: formData.location.trim() || undefined,
        locationId: formData.locationId || undefined,
        priority: formData.priority || undefined,
        category: formData.category || undefined,
        supplier: formData.supplier.trim() || undefined,
        productImage: formData.productImage.trim() || undefined,
        dimensions: formData.dimensions.trim() || undefined,
        weight: formData.weight || undefined,
        unitPrice: formData.unitPrice || undefined,
        tags: formData.tags.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        stockLevel: formData.stockLevel || undefined,
      });

      setSubmitted(true);
      setFormData({
        productDetails: '',
        productLink: '',
        location: '',
        locationId: '',
        priority: '',
        category: '',
        supplier: '',
        productImage: '',
        dimensions: '',
        weight: '',
        unitPrice: '',
        tags: '',
        notes: '',
        stockLevel: '',
      });
    } catch (error) {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading form...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your product request has been successfully submitted to <strong>{kanbanInfo?.name}</strong>.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="btn-primary"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Product Request</h2>
          {kanbanInfo && (
            <p className="text-gray-600">
              Submitting to: <strong>{kanbanInfo.name}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Details *
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 h-32"
              placeholder="Enter product details..."
              value={formData.productDetails}
              onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            {locations.length > 0 ? (
              <select
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.locationId}
                onChange={(e) => {
                  const selectedLocation = locations.find(loc => loc.id === e.target.value);
                  setFormData({
                    ...formData,
                    locationId: e.target.value,
                    location: selectedLocation?.name || '',
                  });
                }}
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
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Storage location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            )}
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Supplier name"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Stock Level and Unit Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Level
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Quantity"
                min="0"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Price per unit"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              />
            </div>
          </div>

          {/* Product Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image URL
            </label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg"
              value={formData.productImage}
              onChange={(e) => setFormData({ ...formData, productImage: e.target.value })}
            />
          </div>

          {/* Dimensions and Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensions
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10x20x5 cm"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Weight in kg"
                step="0.01"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Separate tags with commas"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or comments..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}