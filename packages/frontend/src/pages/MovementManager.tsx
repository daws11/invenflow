import { useEffect, useState } from 'react';
import { useMovementStore } from '../store/movementStore';
import { MovementModal } from '../components/MovementModal';
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

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  useEffect(() => {
    fetchMovements();
    fetchStats();
  }, [fetchMovements, fetchStats]);

  const handleRefresh = () => {
    fetchMovements();
    fetchStats();
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
                      <dt className="text-sm font-medium text-gray-700 truncate">Top Location</dt>
                      <dd className="text-sm font-medium text-gray-900 truncate">
                        {stats.mostUsedLocations[0]?.locationName || 'N/A'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Most Used Locations */}
        {stats && stats.mostUsedLocations.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Most Used Locations Card */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <MapPinIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-semibold text-gray-800">Most Active Locations</h3>
              </div>
              <div className="space-y-2">
                {stats.mostUsedLocations.map((location) => {
                  // Find the location type from movements array
                  // First try to find in toLocation, then in fromLocation
                  const movementWithLocation = movements.find(m => 
                    m.toLocation?.id === location.locationId
                  );
                  
                  const locationType = movementWithLocation?.toLocation?.type || 
                    movements.find(m => m.fromLocation?.id === location.locationId)?.fromLocation?.type || 
                    'physical';
                  
                  const isPerson = locationType === 'person';
                  
                  return (
                  <div key={location.locationId} className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-md shadow-sm">
                    <div className="flex items-center space-x-2">
                      {isPerson ? (
                        <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <MapPinIcon className="h-4 w-4 text-blue-500" />
                      )}
                      <div>
                        <span className="text-gray-900 font-medium">{location.locationName}</span>
                        <span className="text-xs text-gray-500 ml-1.5">({location.locationCode})</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-700 font-semibold">{location.movementCount}</span>
                      <span className="text-xs text-gray-500">moves</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Movement Type Summary */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="flex items-center mb-3">
                <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Movement Types</h3>
              </div>
              <div className="space-y-2">
                {/* Physical Locations */}
                <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-md shadow-sm">
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-700">To Physical Locations</span>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    {movements.filter(m => m.toLocation?.type === 'physical').length}
                  </span>
                </div>
                {/* Person Assignments */}
                <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-md shadow-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700">To People (Assigned)</span>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    {movements.filter(m => m.toLocation?.type === 'person').length}
                  </span>
                </div>
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

        {loading && movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading movements...</p>
          </div>
        ) : movements.length === 0 ? (
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
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moved By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(movement.createdAt.toString())}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="max-w-xs truncate">
                            {movement.product?.productDetails || 'Unknown Product'}
                          </div>
                          {movement.product?.sku && (
                            <div className="text-xs text-gray-500">SKU: {movement.product.sku}</div>
                          )}
                        </div>
                        {(movement.notes?.includes('Batch distribution') || movement.product?.sourceProductId) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Batch
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {movement.fromLocation ? (
                        <div className="flex items-start space-x-2">
                          {movement.fromLocation.type === 'person' ? (
                            <svg className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : (
                            <MapPinIcon className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-medium">{movement.fromLocation.name}</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <span>{movement.fromLocation.area}</span>
                              <span>•</span>
                              <span>{movement.fromLocation.code}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {movement.toLocation ? (
                        <div className="flex items-start space-x-2">
                          {movement.toLocation.type === 'person' ? (
                            <svg className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : (
                            <MapPinIcon className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-medium">{movement.toLocation.name}</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <span>{movement.toLocation.area}</span>
                              <span>•</span>
                              <span>{movement.toLocation.code}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{movement.fromStockLevel || 0}</span>
                        <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-900">{movement.toStockLevel}</span>
                        {movement.toStockLevel !== (movement.fromStockLevel || 0) && (
                          <span className={`text-xs ${
                            movement.toStockLevel > (movement.fromStockLevel || 0)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            ({movement.toStockLevel > (movement.fromStockLevel || 0) ? '+' : ''}
                            {movement.toStockLevel - (movement.fromStockLevel || 0)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {movement.movedBy ? (
                        <div className="flex items-center space-x-1.5">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-gray-900 font-medium">{movement.movedBy}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">System</span>
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
    </div>
  );
}

