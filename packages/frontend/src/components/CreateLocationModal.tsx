import { useState, useEffect } from 'react';
import { CreateLocation, DEFAULT_AREAS } from '@invenflow/shared';
import { Slider } from './Slider';

interface CreateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateLocation) => Promise<void>;
}

export function CreateLocationModal({ isOpen, onClose, onCreate }: CreateLocationModalProps) {
  const [formData, setFormData] = useState<CreateLocation>({
    name: '',
    area: '',
    code: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateLocation, string>>>({});

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        name: '',
        area: '',
        code: '',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const generateCode = (area: string, name: string) => {
    const areaCode = area.toUpperCase().replace(/\s+/g, '-').substring(0, 10);
    const nameCode = name.toUpperCase().replace(/\s+/g, '-').substring(0, 15);
    return `${areaCode}-${nameCode}`;
  };

  const handleFormChange = (field: keyof CreateLocation, value: string) => {
    const newFormData = { ...formData, [field]: value };

    // Auto-generate code if name or area changes and code is empty
    if ((field === 'name' || field === 'area') && !formData.code) {
      if (field === 'name' && formData.area) {
        newFormData.code = generateCode(formData.area, value);
      } else if (field === 'area' && formData.name) {
        newFormData.code = generateCode(value, formData.name);
      }
    }

    setFormData(newFormData);
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateLocation, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'Area is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Location code is required';
    } else if (formData.code.length > 50) {
      newErrors.code = 'Location code must be 50 characters or less';
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
      await onCreate(formData);
      onClose();
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to create location:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end space-x-3">
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
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating...
          </>
        ) : (
          'Create Location'
        )}
      </button>
    </div>
  );

  return (
    <Slider
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Location"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Rack A-1"
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
                value={formData.area}
                onChange={(e) => handleFormChange('area', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.area ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Gudang Utama"
                disabled={isSubmitting}
              />
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Or select from common areas:</p>
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_AREAS.slice(0, 5).map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleFormChange('area', area)}
                      disabled={isSubmitting}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
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
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., GUDANG-UTAMA-RACK-A1"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated based on area and name</p>
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
                placeholder="Optional description of this location"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
    </Slider>
  );
}

