import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Department, CreateDepartment } from '@invenflow/shared';
import { useDepartmentStore } from '../store/departmentStore';
import { useToastStore } from '../store/toastStore';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
  onSuccess?: () => void;
}

export function DepartmentModal({ isOpen, onClose, department, onSuccess }: DepartmentModalProps) {
  const { createDepartment, updateDepartment, loading } = useDepartmentStore();
  const { addSuccessToast, addErrorToast } = useToastStore();

  const [formData, setFormData] = useState<CreateDepartment>({
    name: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        description: department.description || '',
        isActive: department.isActive,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [department, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (department) {
        await updateDepartment(department.id, formData);
        addSuccessToast(`${formData.name} updated successfully`);
      } else {
        await createDepartment(formData);
        addSuccessToast(`${formData.name} added successfully`);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
        (department ? 'Failed to update department' : 'Failed to create department');
      addErrorToast(errorMessage);
    }
  };

  const handleChange = (field: keyof CreateDepartment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {department ? 'Edit Department' : 'Add New Department'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {department ? 'Update department information' : 'Create a new department'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter department name"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter department description (optional)"
                    rows={4}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                      errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      Active
                    </span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500 ml-8">
                    Inactive departments won't appear in dropdowns
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : department ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

