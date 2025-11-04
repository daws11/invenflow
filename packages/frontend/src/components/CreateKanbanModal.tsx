import { useState, useEffect } from 'react';
import { KanbanType } from '@invenflow/shared';

interface CreateKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: KanbanType;
  onCreate: (name: string, type: KanbanType, description?: string | null) => Promise<void>;
}

export function CreateKanbanModal({ isOpen, onClose, type, onCreate }: CreateKanbanModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

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

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedDescription = description.trim();
      await onCreate(
        name.trim(),
        type,
        normalizedDescription.length > 0 ? normalizedDescription : null
      );
      onClose();
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to create kanban:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl transform transition-all animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Create {type === 'order' ? 'Order' : 'Receive'} Kanban
          </h3>
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
                placeholder={`Enter ${type} kanban name...`}
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
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 ${
                  type === 'order' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {type === 'order'
                      ? 'Track purchasing requests and orders'
                      : 'Track inventory reception and storage'}
                  </p>
                </div>
              </div>
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
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                type === 'order'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
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
                'Create Kanban'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

