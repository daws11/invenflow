import { useState } from 'react';
import { Kanban, KanbanType } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';

interface BoardLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKanban: Kanban;
}

export default function BoardLinkingModal({ isOpen, onClose, currentKanban }: BoardLinkingModalProps) {
  const { kanbans, updateKanban } = useKanbanStore();
  const [selectedKanbanId, setSelectedKanbanId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  // Filter kanbans that can be linked (opposite type and not already linked)
  const availableKanbans = kanbans.filter(kanban => {
    if (kanban.id === currentKanban.id) return false;
    if (kanban.type === currentKanban.type) return false;
    if (kanban.linkedKanbanId) return false;
    return true;
  });

  // Find the linked kanban if any
  const linkedKanban = currentKanban.linkedKanbanId
    ? kanbans.find(k => k.id === currentKanban.linkedKanbanId)
    : null;

  const handleLink = async () => {
    if (!selectedKanbanId) return;

    setIsLinking(true);
    try {
      await updateKanban(currentKanban.id, { linkedKanbanId: selectedKanbanId });
      await updateKanban(selectedKanbanId, { linkedKanbanId: currentKanban.id });
      onClose();
    } catch (error) {
      console.error('Failed to link kanbans:', error);
      alert('Failed to link kanbans. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentKanban.linkedKanbanId) return;

    setIsLinking(true);
    try {
      await updateKanban(currentKanban.id, { linkedKanbanId: null });
      await updateKanban(currentKanban.linkedKanbanId, { linkedKanbanId: null });
      onClose();
    } catch (error) {
      console.error('Failed to unlink kanbans:', error);
      alert('Failed to unlink kanbans. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Board Linking</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Board Info */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Board</h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{currentKanban.name}</p>
                <p className="text-sm text-gray-600">
                  {currentKanban.type === 'order' ? 'Order Board' : 'Receive Board'}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentKanban.type === 'order'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentKanban.type === 'order' ? 'Order' : 'Receive'}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Board Info */}
        {linkedKanban ? (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Linked Board</h4>
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{linkedKanban.name}</p>
                  <p className="text-sm text-gray-600">
                    {linkedKanban.type === 'order' ? 'Order Board' : 'Receive Board'}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  linkedKanban.type === 'order'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {linkedKanban.type === 'order' ? 'Order' : 'Receive'}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-xs text-green-700">
                  ✓ Boards are linked. Products will automatically transfer when moved to "Purchased" column.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Available {currentKanban.type === 'order' ? 'Receive' : 'Order'} Boards
            </h4>

            {availableKanbans.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">
                  No {currentKanban.type === 'order' ? 'Receive' : 'Order'} boards available for linking.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Create a {currentKanban.type === 'order' ? 'Receive' : 'Order'} board first.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableKanbans.map(kanban => (
                  <label
                    key={kanban.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="kanban-selection"
                      value={kanban.id}
                      checked={selectedKanbanId === kanban.id}
                      onChange={(e) => setSelectedKanbanId(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{kanban.name}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          kanban.type === 'order'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {kanban.type === 'order' ? 'Order' : 'Receive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {kanban.type === 'order' ? 'Order Board' : 'Receive Board'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Link Visualization */}
        <div className="mb-6">
          <div className="flex items-center justify-center text-gray-400">
            {linkedKanban ? (
              <>
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                    currentKanban.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {currentKanban.name}
                  </div>
                  <p className="text-xs mt-1">{currentKanban.type === 'order' ? 'Order' : 'Receive'}</p>
                </div>
                <svg className="w-8 h-8 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                    linkedKanban.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {linkedKanban.name}
                  </div>
                  <p className="text-xs mt-1">{linkedKanban.type === 'order' ? 'Order' : 'Receive'}</p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-sm mt-2">Select a board to link</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLinking}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            Cancel
          </button>

          {linkedKanban ? (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={isLinking}
              className="btn-danger flex-1 disabled:opacity-50"
            >
              {isLinking ? 'Unlinking...' : 'Unlink Boards'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLink}
              disabled={isLinking || !selectedKanbanId}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isLinking ? 'Linking...' : 'Link Boards'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}