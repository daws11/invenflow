import { useState, useEffect } from 'react';
import { Kanban } from '@invenflow/shared';
import { Slider } from './Slider';

interface EditKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanban: Kanban | null;
  onUpdate: (id: string, name: string, description?: string | null) => Promise<void>;
}

export function EditKanbanModal({ isOpen, onClose, kanban, onUpdate }: EditKanbanModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kanban && isOpen) {
      setName(kanban.name);
      setDescription(kanban.description ?? '');
      setError(null);
    }
  }, [kanban, isOpen]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Kanban name is required');
      return false;
    }
    if (name.trim().length < 3) {
      setError('Kanban name must be at least 3 characters');
      return false;
    }
    if (name.trim().length > 255) {
      setError('Kanban name must be less than 255 characters');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kanban || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedDescription = description.trim();
      await onUpdate(
        kanban.id,
        name.trim(),
        normalizedDescription.length > 0 ? normalizedDescription : null
      );
      onClose();
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to update kanban:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !kanban) return null;

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
            Updating...
          </>
        ) : (
          'Update Kanban'
        )}
      </button>
    </div>
  );

  return (
    <Slider
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Kanban"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kanban Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                autoFocus
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Minimum 3 characters, maximum 255 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                placeholder="Optional short description for this kanban board"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank to use the default fallback text.</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 ${
                    kanban.type === 'order' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {kanban.type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
                    </p>
                    <p className="text-xs text-gray-600">Type cannot be changed</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  kanban.type === 'order'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {kanban.type === 'order' ? 'Order' : 'Receive'}
                </span>
              </div>
            </div>
          </div>
        </form>
    </Slider>
  );
}

