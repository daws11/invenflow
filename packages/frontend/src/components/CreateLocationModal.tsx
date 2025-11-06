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
    building: null,
    floor: null,
    capacity: null,
    isActive: true,
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
        building: null,
        floor: null,
        capacity: null,
        isActive: true,
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

  const handleFormChange = (field: keyof CreateLocation, value: any) => {
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
      // Error is handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const availableAreas = DEFAULT_AREAS;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Physical Location</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add a new storage or warehouse location
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-300 focus:border-transparent ${
                  errors.name ? 'border-red-300' : ''
                }`}
                placeholder="e.g., Rack A-1, Warehouse Section B"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => handleFormChange('area', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-300 focus:border-transparent ${
                  errors.area ? 'border-red-300' : ''
                }`}
                placeholder="e.g., Gudang Utama, Workshop"
                disabled={isSubmitting}
              />
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1.5">
                  📍 Quick select from common areas:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleFormChange('area', area)}
                      disabled={isSubmitting}
                      className="text-xs px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 bg-blue-100 hover:bg-blue-200 text-blue-700"
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

            {/* Location Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-300 focus:border-transparent ${
                  errors.code ? 'border-red-300' : ''
                }`}
                placeholder="e.g., GUDANG-UTAMA-RACK-A1"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 Will be auto-generated from area + name
              </p>
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            {/* Building */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building (Optional)
              </label>
              <input
                type="text"
                value={formData.building || ''}
                onChange={(e) => handleFormChange('building', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Building A, Main Warehouse"
                disabled={isSubmitting}
              />
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor (Optional)
              </label>
              <input
                type="text"
                value={formData.floor || ''}
                onChange={(e) => handleFormChange('floor', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Ground Floor, Floor 2"
                disabled={isSubmitting}
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity || ''}
                onChange={(e) => handleFormChange('capacity', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Maximum storage capacity"
                disabled={isSubmitting}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleFormChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Location is active
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value || null)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Additional notes about this location..."
                disabled={isSubmitting}
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
