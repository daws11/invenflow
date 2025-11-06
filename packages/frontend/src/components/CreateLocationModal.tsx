import { useState, useEffect } from 'react';
import { CreateLocation, LocationType, DEFAULT_PHYSICAL_AREAS, DEFAULT_PERSON_AREAS } from '@invenflow/shared';
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
    type: 'physical',
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
        type: 'physical',
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
            {/* Location Type Selector - Enhanced */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What are you creating? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Physical Location Card */}
                <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  formData.type === 'physical'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="physical"
                    checked={formData.type === 'physical'}
                    onChange={(e) => {
                      handleFormChange('type', e.target.value as LocationType);
                      setFormData(prev => ({ ...prev, area: '' }));
                    }}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      formData.type === 'physical' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-7 h-7 ${formData.type === 'physical' ? 'text-blue-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className={`font-medium ${formData.type === 'physical' ? 'text-blue-900' : 'text-gray-900'}`}>
                      Physical Location
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Warehouse, office, storage
                    </span>
                  </div>
                  {formData.type === 'physical' && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>

                {/* Person Assignment Card */}
                <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  formData.type === 'person'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="person"
                    checked={formData.type === 'person'}
                    onChange={(e) => {
                      handleFormChange('type', e.target.value as LocationType);
                      setFormData(prev => ({ ...prev, area: '' }));
                    }}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      formData.type === 'person' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-7 h-7 ${formData.type === 'person' ? 'text-purple-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className={`font-medium ${formData.type === 'person' ? 'text-purple-900' : 'text-gray-900'}`}>
                      Person Assignment
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Individual, employee
                    </span>
                  </div>
                  {formData.type === 'person' && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              </div>
              
              {/* Info Box */}
              {formData.type === 'person' && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">💡 Tips for Person Assignment:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Use full names (e.g., "John Doe", "Jane Smith")</li>
                        <li>• Select appropriate team/department as area</li>
                        <li>• Track who's responsible for company assets</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'person' ? (
                  <>
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Person Name
                    </span>
                  </>
                ) : 'Location Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  formData.type === 'person' 
                    ? 'focus:ring-purple-500 border-purple-200' 
                    : 'focus:ring-blue-500 border-gray-300'
                } focus:border-transparent ${
                  errors.name ? 'border-red-300' : ''
                }`}
                placeholder={formData.type === 'physical' ? 'e.g., Rack A-1, Warehouse Section B' : 'e.g., John Doe, Jane Smith'}
                disabled={isSubmitting}
              />
              {formData.type === 'person' && !formData.name && (
                <p className="mt-1 text-xs text-purple-600">💡 Enter the employee's full name</p>
              )}
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'person' ? 'Department / Team' : 'Area'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.area}
                onChange={(e) => handleFormChange('area', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  formData.type === 'person' 
                    ? 'focus:ring-purple-500 border-purple-200' 
                    : 'focus:ring-blue-500 border-gray-300'
                } focus:border-transparent ${
                  errors.area ? 'border-red-300' : ''
                }`}
                placeholder={formData.type === 'physical' ? 'e.g., Gudang Utama, Main Office' : 'e.g., HR Team, IT Department'}
                disabled={isSubmitting}
              />
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1.5">
                  {formData.type === 'person' ? '👥 Quick select department:' : '📍 Or select from locations:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.type === 'physical' ? DEFAULT_PHYSICAL_AREAS : DEFAULT_PERSON_AREAS).slice(0, 6).map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleFormChange('area', area)}
                      disabled={isSubmitting}
                      className={`text-xs px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
                        formData.type === 'person'
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      }`}
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

