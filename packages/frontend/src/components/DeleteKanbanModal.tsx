import { useState } from 'react';
import { Kanban } from '@invenflow/shared';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeleteKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanban: Kanban | null;
  onDelete: (id: string) => Promise<void>;
  productCount?: number;
}

export function DeleteKanbanModal({ isOpen, onClose, kanban, onDelete, productCount = 0 }: DeleteKanbanModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!kanban) return;

    setIsDeleting(true);
    try {
      await onDelete(kanban.id);
      onClose();
      setConfirmText('');
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to delete kanban:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  if (!isOpen || !kanban) return null;

  const requiresConfirmation = true;
  const confirmationMatch = confirmText === kanban.name;
  const canDelete = !requiresConfirmation || confirmationMatch;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl transform transition-all animate-scale-in">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Kanban</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this kanban board? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Name:</span>
                    <span className="text-sm text-gray-900 ml-2">{kanban.name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kanban.type === 'order'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {kanban.type === 'order' ? 'Order' : 'Receive'}
                    </span>
                  </div>
                  {productCount > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Products:</span>
                      <span className="text-sm text-gray-900 ml-2">{productCount} product(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {requiresConfirmation && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-mono font-semibold">{kanban.name}</span> to confirm deletion:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={kanban.name}
                    disabled={isDeleting}
                    autoFocus
                  />
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Warning:</strong> Deleting this kanban will permanently remove the board and{' '}
                  {productCount > 0 ? (
                    <strong>all {productCount} product(s) associated with it</strong>
                  ) : (
                    'all associated products'
                  )}. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Kanban'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

