import { useEffect, useMemo, useState } from 'react';
import { useMovementStore } from '../store/movementStore';
import { useBulkMovementStore } from '../store/bulkMovementStore';
import { MovementModal } from '../components/MovementModal';
import { BulkMovementDetailModal } from '../components/BulkMovementDetailModal';
import { BulkMovementEditModal } from '../components/BulkMovementEditModal';
import SingleMovementDetailModal from '../components/SingleMovementDetailModal';
import SingleMovementEditModal from '../components/SingleMovementEditModal';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import {
  ArrowPathIcon,
  PlusIcon,
  MapPinIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useToastStore } from '../store/toastStore';

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
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [isSingleDetailOpen, setIsSingleDetailOpen] = useState(false);
  const [isSingleEditOpen, setIsSingleEditOpen] = useState(false);
  const selectedMovement = useMemo(
    () => movements.find(m => m.id === selectedMovementId) || null,
    [movements, selectedMovementId]
  );
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();

  useEffect(() => {
    fetchMovements();
    fetchStats();
    fetchBulkMovements();
    fetchLocations();
    fetchPersons({ activeOnly: true });
  }, [fetchMovements, fetchStats, fetchBulkMovements, fetchLocations, fetchPersons]);

  const handleRefresh = () => {
    fetchMovements();
    fetchStats();
    fetchBulkMovements();
  };

  const handleMovementSuccess = () => {
    fetchMovements();
    fetchStats();
  };

  const copyConfirmationLink = (token: string) => {
    const url = `${window.location.origin}/movement/confirm/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        useToastStore.getState().addSuccessToast('Confirmation link copied');
      })
      .catch(() => {
        useToastStore.getState().addErrorToast('Failed to copy link');
      });
  };

  const canEditSingle = (row: any) => row.kind === 'single' && row.statusLabel === 'Pending Confirmation';
  const canCancelSingle = canEditSingle;

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
    const singleRows = movements.map((movement) => {
      // Parse movedBy to detect system imports
      const isSystemImport = movement.movedBy?.startsWith('system:');
      const importType = isSystemImport 
        ? movement.movedBy?.split(':')[1] 
        : null;
      const statusMeta = (() => {
        switch (movement.status) {
          case 'pending':
            return { label: 'Pending Confirmation', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
          case 'cancelled':
            return { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border-gray-300' };
          case 'expired':
            return { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-300' };
          case 'in_transit':
            return { label: 'In Transit', className: 'bg-blue-100 text-blue-700 border-blue-300' };
          default:
            return { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-300' };
        }
      })();
      
      return {
        kind: 'single' as const,
        id: movement.id,
        date: movement.createdAt.toString(),
        productLabel: movement.product?.productDetails || 'Unknown Product',
        fromLocation: movement.fromLocation,
        toLocation: movement.toLocation,
        fromPerson: movement.fromPerson,
        toPerson: movement.toPerson,
        stockChange: `${movement.fromStockLevel || 0} → ${movement.quantityMoved}`,
        movedBy: movement.movedBy || 'System',
        isSystemImport,
        importType,
        statusLabel: statusMeta.label,
        statusBadgeClass: statusMeta.className,
        publicToken: movement.publicToken,
      };
    });

    // Map bulk movements to unified shape
    const bulkRows = bulkMovements.map((bm) => {
      const isConfirmed = bm.status === 'received' || !!bm.confirmedAt;
      const isCancelled = !!(bm as any).cancelledAt; // included from API if present
      const statusLabel = isCancelled
        ? 'Cancelled'
        : isConfirmed
        ? 'Confirmed'
        : 'Pending';
      const statusBadgeClass = isCancelled
        ? 'bg-red-100 text-red-700 border-red-300'
        : isConfirmed
        ? 'bg-green-100 text-green-700 border-green-300'
        : 'bg-yellow-100 text-yellow-700 border-yellow-300';

      return {
        kind: 'bulk' as const,
        id: bm.id,
        date: bm.createdAt.toString(),
        productLabel: `Bulk items (${bm.items.length})`,
        fromLocation: bm.fromLocation,
        toLocation: bm.toLocation,
        stockChange: `${bm.items.reduce((sum, i) => sum + (i.quantitySent || 0), 0)} items`,
        movedBy: bm.createdBy,
        statusLabel,
        editable: !isConfirmed && !isCancelled,
        statusBadgeClass,
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    From
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
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
                      ) : 'isSystemImport' in row && row.isSystemImport ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {'importType' in row && row.importType === 'direct-import' ? '📦 Direct Import' : '📦 Bulk Import'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Manual</span>
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
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {row.kind === 'single' && (row.fromPerson) ? (
                        <div className="flex items-start space-x-2 group">
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-purple-900 text-sm sm:text-base leading-tight truncate" title={row.fromPerson.name}>
                              {row.fromPerson.name}
                            </div>
                          </div>
                        </div>
                      ) : row.fromLocation ? (
                        <div className="flex items-start space-x-2 group">
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                            <MapPinIcon className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-blue-900 text-sm sm:text-base leading-tight truncate" title={row.fromLocation.name}>
                              {row.fromLocation.name}
                            </div>
                            <div className="text-xs text-blue-700/80 mt-0.5 truncate" title={row.fromLocation.area}>
                              {row.fromLocation.area}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">—</span>
                          </div>
                        <span className="text-gray-400 italic text-xs">—</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {row.kind === 'single' && (row.toPerson) ? (
                        <div className="flex items-start space-x-2 group">
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-green-900 text-sm sm:text-base leading-tight truncate" title={row.toPerson.name}>
                              {row.toPerson.name}
                            </div>
                          </div>
                        </div>
                      ) : row.toLocation ? (
                        <div className="flex items-start space-x-2 group">
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                            <MapPinIcon className="w-3 h-3 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-green-900 text-sm sm:text-base leading-tight truncate" title={row.toLocation.name}>
                              {row.toLocation.name}
                            </div>
                            <div className="text-xs text-green-700/80 mt-0.5 truncate" title={row.toLocation.area}>
                              {row.toLocation.area}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">—</span>
                          </div>
                        <span className="text-gray-400 italic text-xs">—</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.kind === 'single' ? (
                        (() => {
                          const movement = movements.find(m => m.id === row.id);
                          if (!movement) return <span className="text-gray-400">—</span>;

                          const fromStock = movement.fromStockLevel ?? 0;
                          const quantityMoved = movement.quantityMoved ?? 0;
                          const remainingFrom = Math.max(0, fromStock - quantityMoved);
                          const toStockLevel = movement.toStockLevel ?? null;

                          return (
                            <div className="flex items-center space-x-3">
                              {/* FROM location: remaining stock and negative delta */}
                              <div className="text-center">
                                <div className="font-medium text-gray-900 text-sm">
                                  {remainingFrom}
                                </div>
                                <div className="text-red-600 text-xs">
                                  (-{quantityMoved})
                                </div>
                              </div>

                              {/* Arrow */}
                              <ArrowRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />

                              {/* TO location: show total stock at destination if known, plus positive delta */}
                              <div className="text-center">
                                <div className="font-medium text-gray-900 text-sm">
                                  {toStockLevel !== null ? toStockLevel : '—'}
                                </div>
                                <div className="text-green-600 text-xs">
                                  (+{quantityMoved})
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-sm text-gray-900">{row.stockChange}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.movedBy ? (
                        <div className="flex items-center space-x-1.5">
                          {'isSystemImport' in row && row.isSystemImport ? (
                            <>
                              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-emerald-700 font-medium text-xs">Import System</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-gray-900 font-medium">{row.movedBy}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          row.statusBadgeClass || 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {row.statusLabel || '—'}
                        </span>
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedMovementId(row.id);
                              setIsSingleDetailOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMovementId(row.id);
                              setIsSingleEditOpen(true);
                            }}
                            disabled={!canEditSingle(row)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!canCancelSingle(row)) return;
                              if (confirm('Cancel this movement?')) {
                                const { movementApi } = await import('../utils/api');
                                await movementApi.cancel(row.id);
                                handleRefresh();
                              }
                            }}
                            disabled={!canCancelSingle(row)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          {row.statusLabel === 'Pending Confirmation' && row.publicToken && (
                            <button
                              onClick={() => copyConfirmationLink(row.publicToken!)}
                              className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                            >
                              Copy Link
                            </button>
                          )}
                        </div>
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

      <SingleMovementDetailModal
        isOpen={isSingleDetailOpen}
        onClose={() => setIsSingleDetailOpen(false)}
        movement={selectedMovement}
      />
      <SingleMovementEditModal
        isOpen={isSingleEditOpen}
        onClose={() => setIsSingleEditOpen(false)}
        movement={selectedMovement}
        locations={locations}
        persons={persons}
        onSave={async (data) => {
          if (!selectedMovement) return;
          const { movementApi } = await import('../utils/api');
          await movementApi.update(selectedMovement.id, data);
          setIsSingleEditOpen(false);
          handleRefresh();
        }}
      />
    </div>
  );
}

