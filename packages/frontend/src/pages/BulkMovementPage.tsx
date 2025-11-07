import { useEffect, useState } from 'react';
import { useBulkMovementStore } from '../store/bulkMovementStore';
import { 
  getBulkMovementStatusColor, 
  getBulkMovementStatusLabel, 
  formatBulkMovementDate,
  canCancelBulkMovement,
  copyToClipboard,
  generatePublicUrl 
} from '../utils/bulkMovementHelpers';
import { BulkMovementCreateModal } from '../components/BulkMovementCreateModal';
import { BulkMovementDetailModal } from '../components/BulkMovementDetailModal';
import { BulkMovementEditModal } from '../components/BulkMovementEditModal';
import type { BulkMovementWithDetails } from '@invenflow/shared';
import { 
  PlusIcon, 
  EyeIcon, 
  LinkIcon, 
  XMarkIcon,
  TruckIcon,
  PencilIcon 
} from '@heroicons/react/24/outline';

export default function BulkMovementPage() {
  const {
    bulkMovements,
    loading,
    currentPage,
    totalPages,
    totalItems,
    fetchBulkMovements,
    setPage,
    cancelBulkMovement,
    checkExpired,
  } = useBulkMovementStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBulkMovement, setSelectedBulkMovement] = useState<BulkMovementWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchBulkMovements();
    // Check for expired movements on mount
    checkExpired();
  }, [fetchBulkMovements, checkExpired]);

  const canModifyBulkMovement = (status: string) => {
    return status === 'pending' || status === 'in_transit';
  };

  const handleCopyLink = async (token: string) => {
    const url = generatePublicUrl(token);
    const success = await copyToClipboard(url);
    if (success) {
      // Toast will be shown by the store
      alert('Link copied to clipboard!');
    }
  };

  const handleCancelBulkMovement = async (id: string) => {
    if (confirm('Are you sure you want to cancel this bulk movement? This will restore the stock at the source location.')) {
      await cancelBulkMovement(id);
    }
  };

  const handleViewDetails = (bulkMovement: BulkMovementWithDetails) => {
    setSelectedBulkMovement(bulkMovement);
    setShowDetailModal(true);
  };

  const handleEditBulkMovement = (bulkMovement: BulkMovementWithDetails) => {
    setSelectedBulkMovement(bulkMovement);
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TruckIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Movement</h1>
              <p className="text-sm text-gray-600">Manage bulk shipments between locations</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Bulk Movement</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Movements</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <p className="text-sm text-yellow-700">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">
              {bulkMovements.filter(bm => bm.status === 'pending').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-sm text-blue-700">In Transit</p>
            <p className="text-2xl font-bold text-blue-900">
              {bulkMovements.filter(bm => bm.status === 'in_transit').length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <p className="text-sm text-green-700">Received</p>
            <p className="text-2xl font-bold text-green-900">
              {bulkMovements.filter(bm => bm.status === 'received').length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : bulkMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <TruckIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No bulk movements yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Create your first bulk movement
              </button>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From → To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkMovements.map((bulkMovement) => {
                    const statusColors = getBulkMovementStatusColor(bulkMovement.status);
                    const canCancel = canCancelBulkMovement(bulkMovement.status);

                    return (
                      <tr key={bulkMovement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {bulkMovement.fromLocation.name}
                            </div>
                            <div className="text-gray-500 flex items-center space-x-1">
                              <span>→</span>
                              <span>{bulkMovement.toLocation.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {bulkMovement.items.length} items
                          </div>
                          <div className="text-xs text-gray-500">
                            {bulkMovement.items.reduce((sum, item) => sum + item.quantitySent, 0)} units
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors.bg} ${statusColors.text}`}>
                            {getBulkMovementStatusLabel(bulkMovement.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatBulkMovementDate(bulkMovement.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetails(bulkMovement)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            {canModifyBulkMovement(bulkMovement.status) && (
                              <button
                                onClick={() => handleEditBulkMovement(bulkMovement)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit"
                              >
                                <PencilIcon className="w-5 h-5" />
                              </button>
                            )}
                            {bulkMovement.status !== 'received' && (
                              <button
                                onClick={() => handleCopyLink(bulkMovement.publicToken)}
                                className="text-green-600 hover:text-green-900"
                                title="Copy Link"
                              >
                                <LinkIcon className="w-5 h-5" />
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => handleCancelBulkMovement(bulkMovement.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel"
                              >
                                <XMarkIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <BulkMovementCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showDetailModal && selectedBulkMovement && (
        <BulkMovementDetailModal
          isOpen={showDetailModal}
          bulkMovement={selectedBulkMovement}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBulkMovement(null);
          }}
        />
      )}

      {showEditModal && selectedBulkMovement && (
        <BulkMovementEditModal
          isOpen={showEditModal}
          bulkMovement={selectedBulkMovement}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBulkMovement(null);
          }}
        />
      )}
    </div>
  );
}

