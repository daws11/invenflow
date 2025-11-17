import { useState, useEffect } from 'react';
import { XMarkIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import { Product, UNIFIED_FIELD_OPTIONS, DEFAULT_PRIORITIES, DEFAULT_CATEGORIES } from '@invenflow/shared';
import { usePersonStore } from '../store/personStore';
import { useKanbanStore } from '../store/kanbanStore';

interface GroupItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirm: (
    groupTitle: string,
    unifiedFields: Record<string, boolean>,
    unifiedValues: Record<string, any>
  ) => Promise<void>;
}

export function GroupItemsModal({
  isOpen,
  onClose,
  products,
  onConfirm,
}: GroupItemsModalProps) {
  const [groupTitle, setGroupTitle] = useState('');
  const [unifiedFields, setUnifiedFields] = useState<Record<string, boolean>>({});
  const [unifiedValues, setUnifiedValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { persons } = usePersonStore();
  const { kanbans } = useKanbanStore();

  // Get receive kanbans for preferred receive kanban selection
  const receiveKanbans = kanbans.filter(k => k.type === 'receive');

  useEffect(() => {
    if (isOpen) {
      setGroupTitle('');
      setUnifiedFields({});
      setUnifiedValues({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUnifiedField = (fieldName: string) => {
    setUnifiedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
    
    // Remove value if unchecking
    if (unifiedFields[fieldName]) {
      const newValues = { ...unifiedValues };
      delete newValues[fieldName];
      setUnifiedValues(newValues);
    }
  };

  const setUnifiedValue = (fieldName: string, value: any) => {
    setUnifiedValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!groupTitle.trim()) return;

    // Validate that all checked fields have values
    const checkedFields = Object.keys(unifiedFields).filter(key => unifiedFields[key]);
    const missingValues = checkedFields.filter(key => !unifiedValues[key]);
    
    if (missingValues.length > 0) {
      alert('Please provide values for all selected unified fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(groupTitle.trim(), unifiedFields, unifiedValues);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setGroupTitle('');
      setUnifiedFields({});
      setUnifiedValues({});
      onClose();
    }
  };

  const renderUnifiedFieldInput = (fieldName: string) => {
    if (!unifiedFields[fieldName]) return null;

    switch (fieldName) {
      case 'priority':
        return (
          <select
            value={unifiedValues[fieldName] || ''}
            onChange={(e) => setUnifiedValue(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select priority...</option>
            {DEFAULT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        );

      case 'category':
        return (
          <select
            value={unifiedValues[fieldName] || ''}
            onChange={(e) => setUnifiedValue(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select category...</option>
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        );

      case 'supplier':
        return (
          <input
            type="text"
            value={unifiedValues[fieldName] || ''}
            onChange={(e) => setUnifiedValue(fieldName, e.target.value)}
            placeholder="Enter supplier name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
            maxLength={255}
          />
        );

      case 'assignedToPersonId':
        return (
          <select
            value={unifiedValues[fieldName] || ''}
            onChange={(e) => setUnifiedValue(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select person...</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        );

      case 'preferredReceiveKanbanId':
        return (
          <select
            value={unifiedValues[fieldName] || ''}
            onChange={(e) => setUnifiedValue(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select receive kanban...</option>
            {receiveKanbans.map((kanban) => (
              <option key={kanban.id} value={kanban.id}>
                {kanban.name}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      priority: 'Priority',
      category: 'Category',
      supplier: 'Supplier',
      assignedToPersonId: 'Assigned Person',
      preferredReceiveKanbanId: 'Preferred Receive Kanban',
    };
    return labels[fieldName] || fieldName;
  };

  // Slider-style panel content
  const content = (
    <div className="space-y-6">
      {/* Products Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Grouping {products.length} {products.length === 1 ? 'product' : 'products'}:
        </h4>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          <ul className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.id} className="px-3 py-2 text-sm text-gray-700">
                {product.productDetails}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Group Title */}
      <div>
        <label
          htmlFor="group-title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Group Title <span className="text-red-500">*</span>
        </label>
        <input
          id="group-title"
          type="text"
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
          placeholder="Enter group title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          maxLength={255}
          required
        />
      </div>

      {/* Unified Fields Selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Unified Settings (Optional)
        </h4>
        <p className="text-xs text-gray-600 mb-4">
          Select fields that should have the same value across all products in this group.
        </p>

        <div className="space-y-4">
          {UNIFIED_FIELD_OPTIONS.map((fieldName) => (
            <div key={fieldName} className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={unifiedFields[fieldName] || false}
                  onChange={() => toggleUnifiedField(fieldName)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-gray-700">
                  {getFieldLabel(fieldName)}
                </span>
              </label>

              {unifiedFields[fieldName] && (
                <div className="ml-6">
                  {renderUnifiedFieldInput(fieldName)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Right slider panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[480px] lg:w-[520px] bg-white shadow-2xl transform transition-transform duration-300 ease-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center">
              <RectangleGroupIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Create Product Group
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
              type="button"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {content}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !groupTitle.trim()}
              type="button"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

