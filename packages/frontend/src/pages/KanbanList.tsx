import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKanbanStore } from '../store/kanbanStore';
import { KanbanType, Kanban } from '@invenflow/shared';
import BoardLinkingModal from '../components/BoardLinkingModal';

export default function KanbanList() {
  const { kanbans, loading, error, fetchKanbans, createKanban, deleteKanban } = useKanbanStore();
  const [selectedKanban, setSelectedKanban] = useState<Kanban | null>(null);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  useEffect(() => {
    fetchKanbans();
  }, [fetchKanbans]);

  const handleCreateKanban = async (type: KanbanType) => {
    const name = prompt(`Enter name for new ${type} kanban:`);
    if (name) {
      try {
        await createKanban({ name, type });
      } catch (error) {
        alert('Failed to create kanban');
      }
    }
  };

  const handleDeleteKanban = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteKanban(id);
      } catch (error) {
        alert('Failed to delete kanban');
      }
    }
  };

  const handleOpenLinkingModal = (kanban: Kanban) => {
    setSelectedKanban(kanban);
    setIsLinkingModalOpen(true);
  };

  const handleCloseLinkingModal = () => {
    setSelectedKanban(null);
    setIsLinkingModalOpen(false);
  };

  const getLinkedKanbanName = (kanban: Kanban) => {
    if (!kanban.linkedKanbanId) return null;
    const linkedKanban = kanbans.find(k => k.id === kanban.linkedKanbanId);
    return linkedKanban ? linkedKanban.name : null;
  };

  if (loading && kanbans.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading kanbans...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Kanban Boards</h2>
        <div className="flex space-x-4">
          <button
            className="btn-secondary"
            onClick={() => handleCreateKanban('order')}
          >
            Create Order Kanban
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleCreateKanban('receive')}
          >
            Create Receive Kanban
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {kanbans.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No kanbans yet</div>
          <p className="text-gray-400 mb-6">Create your first kanban board to get started</p>
          <div className="flex justify-center space-x-4">
            <button
              className="btn-primary"
              onClick={() => handleCreateKanban('order')}
            >
              Create Order Kanban
            </button>
            <button
              className="btn-primary"
              onClick={() => handleCreateKanban('receive')}
            >
              Create Receive Kanban
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kanbans.map((kanban) => (
            <div key={kanban.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{kanban.name}</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kanban.type === 'order'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {kanban.type === 'order' ? 'Order' : 'Receive'}
                    </span>
                    {kanban.linkedKanbanId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Linked
                      </span>
                    )}
                  </div>

                  {/* Linked Board Info */}
                  {kanban.linkedKanbanId && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3">
                      <div className="flex items-center text-xs text-purple-700">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium">Linked to:</span>
                        <span className="ml-1">{getLinkedKanbanName(kanban) || 'Unknown Board'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-1">
                  <button
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    onClick={() => handleOpenLinkingModal(kanban)}
                    title="Manage board linking"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                  <button
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => handleDeleteKanban(kanban.id, kanban.name)}
                    title="Delete kanban"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {kanban.type === 'order' && kanban.publicFormToken && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Public Form URL:</p>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 break-all border border-gray-200">
                    {window.location.origin}/form/{kanban.publicFormToken}
                  </div>
                </div>
              )}

              {/* Board Actions */}
              <div className="space-y-2">
                <Link
                  to={`/kanban/${kanban.id}`}
                  className="btn-primary text-sm flex-1 text-center w-full block"
                >
                  View Board
                </Link>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenLinkingModal(kanban)}
                    className="btn-secondary text-sm flex-1"
                  >
                    {kanban.linkedKanbanId ? 'Manage Link' : 'Link Board'}
                  </button>
                  {kanban.type === 'order' && kanban.publicFormToken && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/form/${kanban.publicFormToken}`);
                        alert('Form URL copied to clipboard!');
                      }}
                      className="btn-secondary text-sm"
                      title="Copy public form URL"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Board Linking Modal */}
      {selectedKanban && (
        <BoardLinkingModal
          isOpen={isLinkingModalOpen}
          onClose={handleCloseLinkingModal}
          currentKanban={selectedKanban}
        />
      )}
    </div>
  )
}