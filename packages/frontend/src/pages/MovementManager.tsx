import { useEffect, useMemo, useState } from 'react';
import { useMovementStore } from '../store/movementStore';
import { useBulkMovementStore } from '../store/bulkMovementStore';
import { MovementModal } from '../components/MovementModal';
import { BulkMovementDetailModal } from '../components/BulkMovementDetailModal';
import { BulkMovementEditModal } from '../components/BulkMovementEditModal';
import {
  ArrowPathIcon,
  PlusIcon,
  MapPinIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function MovementManager() {
  const {
    movements,
    stats,
    loading,
    error,
    fetchMovements,
    fetchStats,
    clearError,
  } = useMovementStore();

  const {
    bulkMovements,
    loading: bulkLoading,
    fetchBulkMovements,
    cancelBulkMovement,
  } = useBulkMovementStore();

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedBulkId, setSelectedBulkId] = useState<string | null>(null);
  const selectedBulk = useMemo(() => bulkMovements.find(b => b.id === selectedBulkId) || null, [bulkMovements, selectedBulkId]);
  const [isBulkDetailOpen, setIsBulkDetailOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  useEffect(() => {
    fetchMovements();
    fetchStats();
    fetchBulkMovements();
  }, [fetchMovements, fetchStats, fetchBulkMovements]);

  const handleRefresh = () => {
    fetchMovements();
    fetchStats();
    fetchBulkMovements();
  };

  const handleMovementSuccess = () => {
    fetchMovements();
    fetchStats();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const combinedRows = useMemo(() => {
    // Map movement logs to unified shape
    const singleRows = movements.map((movement) => ({
      kind: 'single' as const,
      id: movement.id,
      date: movement.createdAt.toString(),
      productLabel: movement.product?.productDetails || 'Unknown Product',
      fromLocation: movement.fromLocation?.name || movement.fromPerson?.name || null,
      toLocation: movement.toLocation?.name || movement.toPerson?.name || null,
      stockChange: `${movement.fromStockLevel || 0} → ${movement.toStockLevel}`,
      movedBy: movement.movedBy || 'System',
    }));

    // Map bulk movements to unified shape
    const bulkRows = bulkMovements.map((bm) => {
      const isConfirmed = bm.status === 'received' || !!bm.confirmedAt;
      const isCancelled = !!(bm as any).cancelledAt; // included from API if present
      const statusLabel = isCancelled
        ? 'Cancelled'
        : isConfirmed
        ? 'Confirmed'
        : 'Pending';

      return {
        kind: 'bulk' as const,
        id: bm.id,
        date: bm.createdAt.toString(),
        productLabel: `Bulk items (${bm.items.length})`,
        fromLocation: bm.fromLocation?.name || null,
        toLocation: bm.toLocation?.name || null,
        stockChange: `${bm.items.reduce((sum, i) => sum + (i.quantitySent || 0), 0)} items`,
        movedBy: bm.createdBy,
        statusLabel,
        editable: !isConfirmed && !isCancelled,
      };
    });

    return [...bulkRows, ...singleRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, bulkMovements]);

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading movements</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    clearError();
                    handleRefresh();
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Product Movements</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage product movements between locations
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setIsMovementModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Movement
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-blue-500 rounded-md p-3">
                      <ArrowRightIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">Total Movements</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalMovements.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">Active Products</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.activeProducts.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-purple-500 rounded-md p-3">
                      <MapPinIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">Top Recipient</dt>
                      <dd className="text-sm font-medium text-gray-900 truncate">
                        {stats.mostActiveRecipients[0]?.recipientName || 'N/A'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Most Active Recipients */}
        {stats && stats.mostActiveRecipients.length > 0 && (
          <div className="mt-3">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Most Active Recipients</h3>
              </div>
              <div className="space-y-2">
                {stats.mostActiveRecipients.map((recipient) => (
                  <div key={recipient.recipientId} className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-2">
                      {recipient.recipientType === 'person' ? (
                        <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <MapPinIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-gray-900 font-medium">{recipient.recipientName}</span>
                        <span className="text-xs text-gray-500 ml-1.5">({recipient.recipientCode})</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-700 font-semibold">{recipient.movementCount}</span>
                      <span className="text-xs text-gray-500">moves</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movement History Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Movement History</h2>
        </div>

        {(loading || bulkLoading) && combinedRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading movements...</p>
          </div>
        ) : combinedRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No movements recorded yet</p>
            <button
              onClick={() => setIsMovementModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Movement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moved By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combinedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-700">
                      {row.kind === 'bulk' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">Bulk</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Single</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(row.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="max-w-xs truncate">
                            {row.productLabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.kind === 'single' && (movements.find(m => m.id === row.id)?.fromPerson) ? (
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div>
                            <div className="font-medium text-purple-900">{movements.find(m => m.id === row.id)?.fromPerson?.name}</div>
                            
                          </div>
                        </div>
                      ) : row.fromLocation ? (
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-blue-900">{row.fromLocation}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.kind === 'single' && (movements.find(m => m.id === row.id)?.toPerson) ? (
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div>
                            <div className="font-medium text-purple-900">{movements.find(m => m.id === row.id)?.toPerson?.name}</div>
                            
                          </div>
                        </div>
                      ) : row.toLocation ? (
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-blue-900">{row.toLocation}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.kind === 'single' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">{movements.find(m => m.id === row.id)?.fromStockLevel || 0}</span>
                          <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                          <span className="font-medium text-gray-900">{movements.find(m => m.id === row.id)?.toStockLevel}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">{row.stockChange}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.movedBy ? (
                        <div className="flex items-center space-x-1.5">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-gray-900 font-medium">{row.movedBy}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.kind === 'bulk' ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          row.statusLabel === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : row.statusLabel === 'Confirmed'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-red-100 text-red-700 border-red-300'
                        }`}>
                          {row.statusLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.kind === 'bulk' ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedBulkId(row.id);
                              setIsBulkDetailOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBulkId(row.id);
                              setIsBulkEditOpen(true);
                            }}
                            disabled={!('editable' in row && row.editable)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!('editable' in row && row.editable)) return;
                              if (confirm('Cancel this bulk movement? This will restore stock.')) {
                                await cancelBulkMovement(row.id);
                                handleRefresh();
                              }
                            }}
                            disabled={!('editable' in row && row.editable)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Modal */}
      <MovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={handleMovementSuccess}
      />

      {/* Bulk Movement Modals */}
      {selectedBulk && (
        <BulkMovementDetailModal
          isOpen={isBulkDetailOpen}
          onClose={() => setIsBulkDetailOpen(false)}
          bulkMovement={selectedBulk}
        />
      )}
      {selectedBulk && (
        <BulkMovementEditModal
          isOpen={isBulkEditOpen}
          onClose={() => {
            setIsBulkEditOpen(false);
            handleRefresh();
          }}
          bulkMovement={selectedBulk}
        />
      )}
    </div>
  );
}

