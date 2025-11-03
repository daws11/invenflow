import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../utils/api';

interface KanbanInfo {
  id: string;
  name: string;
  type: string;
}

export default function PublicForm() {
  const { token } = useParams<{ token: string }>();
  const [kanbanInfo, setKanbanInfo] = useState<KanbanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    productDetails: '',
    productLink: '',
    location: '',
    priority: '',
  });

  useEffect(() => {
    if (token) {
      fetchKanbanInfo();
    }
  }, [token]);

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
        priority: formData.priority || undefined,
      });

      setSubmitted(true);
      setFormData({
        productDetails: '',
        productLink: '',
        location: '',
        priority: '',
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
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3"
              placeholder="Storage location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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