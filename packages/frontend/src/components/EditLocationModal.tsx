import { useState, useEffect } from 'react';
import { Location, UpdateLocation } from '@invenflow/shared';

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  onUpdate: (id: string, data: UpdateLocation) => Promise<void>;
}

export function EditLocationModal({ isOpen, onClose, location, onUpdate }: EditLocationModalProps) {
  const [formData, setFormData] = useState<UpdateLocation>({
    name: '',
    area: '',
    code: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateLocation, string>>>({});

  useEffect(() => {
    if (location && isOpen) {
      setFormData({
        name: location.name,
        area: location.area,
        code: location.code,
        description: location.description || '',
      });
      setErrors({});
    }
  }, [location, isOpen]);

  const handleFormChange = (field: keyof UpdateLocation, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateLocation, string>> = {};

    if (formData.name !== undefined && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.area !== undefined && !formData.area.trim()) {
      newErrors.area = 'Area is required';
    }

    if (formData.code !== undefined) {
      if (!formData.code.trim()) {
        newErrors.code = 'Location code is required';
      } else if (formData.code.length > 50) {
        newErrors.code = 'Location code must be 50 characters or less';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(location.id, formData);
      onClose();
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to update location:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Edit Location</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.area || ''}
                onChange={(e) => handleFormChange('area', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.area ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.area && (
                <p className="mt-1 text-sm text-red-600">{errors.area}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code || ''}
                onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description ?? ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Location'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

