import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useKanbanStore } from '../store/kanbanStore';
import { KanbanType } from '@invenflow/shared';

export default function KanbanList() {
  const { kanbans, loading, error, fetchKanbans, createKanban, deleteKanban } = useKanbanStore();

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
            <div key={kanban.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{kanban.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kanban.type === 'order'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {kanban.type === 'order' ? 'Order' : 'Receive'}
                    </span>
                    {kanban.linkedKanbanId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Linked
                      </span>
                    )}
                  </div>
                </div>
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

              {kanban.type === 'order' && kanban.publicFormToken && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Public Form URL:</p>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 break-all">
                    {window.location.origin}/form/{kanban.publicFormToken}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Link
                  to={`/kanban/${kanban.id}`}
                  className="btn-secondary text-sm flex-1 text-center"
                >
                  View Board
                </Link>
                <button className="btn-secondary text-sm">
                  Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}