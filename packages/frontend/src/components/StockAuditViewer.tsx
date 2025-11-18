import { useState, useEffect } from 'react';
import {
  ClockIcon,
  ArrowRightIcon,
  UserIcon,
  MapPinIcon,
  CubeIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { movementApi, type MovementLog } from '../utils/api';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';

type UIMovement = MovementLog & {
  movementType?: string;
  reasonCode?: string | null;
  batchId?: string | null;
  referenceNumber?: string | null;
  totalValue?: number | string | null;
};

interface StockAuditViewerProps {
  productId?: string;
  locationId?: string;
  onClose?: () => void;
}

interface MovementFilters {
  productId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  movedBy?: string;
  movementType?: string;
}

export function StockAuditViewer({ productId, locationId, onClose }: StockAuditViewerProps) {
  const [movements, setMovements] = useState<UIMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({
    productId,
    locationId,
    startDate: '',
    endDate: '',
    movedBy: '',
    movementType: ''
  });

  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();

  useEffect(() => {
    fetchLocations();
    fetchPersons({ activeOnly: false });
    loadMovements();
  }, [fetchLocations, fetchPersons]);

  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit: 100,
        offset: 0
      };

      if (filters.productId) params.productId = filters.productId;
      if (filters.locationId) params.locationId = filters.locationId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await movementApi.getAll(params);
      
      // Filter by additional criteria that aren't supported by the API
      let filteredMovements: UIMovement[] = response as UIMovement[];
      
      if (filters.movedBy) {
        filteredMovements = filteredMovements.filter((m) => 
          m.movedBy?.toLowerCase().includes(filters.movedBy!.toLowerCase())
        );
      }

      if (filters.movementType) {
        filteredMovements = filteredMovements.filter((m) => 
          m.movementType === filters.movementType
        );
      }

      setMovements(filteredMovements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movement history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<MovementFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      productId,
      locationId,
      startDate: '',
      endDate: '',
      movedBy: '',
      movementType: ''
    });
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return 'Unknown Location';
    const location = locations.find(l => l.id === locationId);
    return location ? `${location.name} - ${location.area}` : 'Unknown Location';
  };

  const getPersonName = (personId: string | null) => {
    if (!personId) return null;
    const person = persons.find(p => p.id === personId);
    return person ? person.name : 'Unknown Person';
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'bulk': return 'bg-purple-100 text-purple-800';
      case 'automatic': return 'bg-green-100 text-green-800';
      case 'split': return 'bg-orange-100 text-orange-800';
      case 'merge': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockChangeIndicator = (quantityMoved: number) => {
    if (quantityMoved === 0) return { icon: '↔️', color: 'text-blue-600', text: 'No change' };
    return { icon: '📦', color: 'text-blue-600', text: `Moved ${quantityMoved} units` };
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-500">Loading movement history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading movement history</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadMovements}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Audit Trail</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive movement history and audit trail for inventory tracking
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm leading-4 font-medium transition-colors ${
                showFilters
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={loadMovements}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Movement Type</label>
                <select
                  value={filters.movementType}
                  onChange={(e) => handleFilterChange({ movementType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="manual">Manual</option>
                  <option value="bulk">Bulk</option>
                  <option value="automatic">Automatic</option>
                  <option value="split">Split</option>
                  <option value="merge">Merge</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Moved By</label>
                <input
                  type="text"
                  value={filters.movedBy}
                  onChange={(e) => handleFilterChange({ movedBy: e.target.value })}
                  placeholder="Search by user..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <select
                  value={filters.locationId}
                  onChange={(e) => handleFilterChange({ locationId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.area})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movement Timeline */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Movement Timeline</h3>
          <p className="mt-1 text-sm text-gray-500">
            {movements.length} movement{movements.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {movements.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No movements found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No movement history matches the current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {movements.map((movement, index) => {
              const stockChange = getStockChangeIndicator(movement.quantityMoved);
              const fromPersonName = getPersonName(movement.fromPersonId);
              const toPersonName = getPersonName(movement.toPersonId);

              return (
                <div key={movement.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Timeline indicator */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <CubeIcon className={`h-4 w-4 ${
                          index === 0 ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                    </div>

                    {/* Movement details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMovementTypeColor(movement.movementType || 'manual')}`}>
                            {movement.movementType || 'manual'}
                          </span>
                          {movement.reasonCode && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {movement.reasonCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(movement.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Movement path */}
                      <div className="mt-2 flex items-center space-x-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {getLocationName(movement.fromLocationId)}
                          </span>
                          {fromPersonName && (
                            <span className="text-gray-500">
                              → {fromPersonName}
                            </span>
                          )}
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {getLocationName(movement.toLocationId)}
                          </span>
                          {toPersonName && (
                            <span className="text-gray-500">
                              → {toPersonName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock change */}
                      <div className="mt-2 flex items-center space-x-4">
                        <div className={`flex items-center space-x-1 ${stockChange.color}`}>
                          <span className="text-lg">{stockChange.icon}</span>
                          <span className="text-sm font-medium">{stockChange.text}</span>
                        </div>
                        {movement.fromStockLevel !== null && (
                        <div className="text-sm text-gray-500">
                            Source Stock: {movement.fromStockLevel} → {Math.max(0, movement.fromStockLevel - movement.quantityMoved)}
                        </div>
                        )}
                      </div>

                      {/* User and notes */}
                      <div className="mt-2 flex items-start justify-between">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <UserIcon className="h-4 w-4" />
                          <span>Moved by: {movement.movedBy || 'Unknown'}</span>
                        </div>
                        {movement.notes && (
                          <div className="max-w-md">
                            <p className="text-sm text-gray-600 italic">"{movement.notes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Additional metadata */}
                      {(movement.batchId || movement.referenceNumber || movement.totalValue) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                            {movement.batchId && (
                              <div>
                                <span className="font-medium text-gray-700">Batch ID:</span>
                                <span className="ml-1 text-gray-600">{movement.batchId}</span>
                              </div>
                            )}
                            {movement.referenceNumber && (
                              <div>
                                <span className="font-medium text-gray-700">Reference:</span>
                                <span className="ml-1 text-gray-600">{movement.referenceNumber}</span>
                              </div>
                            )}
                            {movement.totalValue && (
                              <div>
                                <span className="font-medium text-gray-700">Value:</span>
                                <span className="ml-1 text-gray-600">${movement.totalValue.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
