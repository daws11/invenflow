import { useEffect, useState } from 'react';
import { useMovementStore, type EnrichedMovementLog } from '../store/movementStore';
import {
  MapPinIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface ProductMovementHistoryProps {
  productId: string;
}

export function ProductMovementHistory({ productId }: ProductMovementHistoryProps) {
  const { fetchMovementHistory } = useMovementStore();
  const [movements, setMovements] = useState<EnrichedMovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovements = async () => {
      try {
        setLoading(true);
        const data = await fetchMovementHistory(productId);
        setMovements(data);
      } catch (err) {
        setError('Failed to load movement history');
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, [productId, fetchMovementHistory]);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No movement history</h3>
        <p className="mt-1 text-sm text-gray-500">
          This product hasn't been moved between locations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Movement History ({movements.length})
        </h3>
      </div>

      <div className="flow-root">
        <ul className="-mb-8">
          {movements.map((movement, idx) => {
            const hasToPerson = !!movement.toPerson;
            const hasFromPerson = !!movement.fromPerson;
            const isPersonMovement = hasToPerson;
            
            return (
            <li key={movement.id}>
              <div className="relative pb-8">
                {idx !== movements.length - 1 && (
                  <span
                    className={`absolute top-5 left-5 -ml-px h-full w-0.5 ${
                      isPersonMovement ? 'bg-purple-200' : 'bg-blue-200'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  {/* Timeline Icon */}
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                      isPersonMovement ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {isPersonMovement ? (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <MapPinIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    {/* Header with action and date */}
                    <div className={`rounded-lg border-l-4 p-3 ${
                      isPersonMovement 
                        ? 'bg-purple-50 border-purple-500' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 flex items-center">
                            {isPersonMovement ? (
                              <>
                                <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                👤 Assigned to Person
                              </>
                            ) : (
                              <>
                                <MapPinIcon className="w-4 h-4 mr-1.5 text-blue-600" />
                                📍 Moved to Location
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-600 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(movement.createdAt)}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          isPersonMovement 
                            ? 'bg-purple-200 text-purple-800' 
                            : 'bg-blue-200 text-blue-800'
                        }`}>
                          {isPersonMovement ? 'Person' : 'Location'}
                        </span>
                      </div>

                      {/* Movement Details */}
                      <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-sm">
                        {/* From */}
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-500 mb-1.5">From</div>
                          {movement.fromPerson ? (
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium text-sm text-purple-900">{movement.fromPerson.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                {movement.fromPerson.department}
                              </div>
                            </div>
                          ) : movement.fromLocation ? (
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span className="font-medium text-sm text-blue-900">{movement.fromLocation.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                {movement.fromLocation.area}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 italic text-sm">—</div>
                          )}
                        </div>

                        <ArrowRightIcon className={`h-5 w-5 flex-shrink-0 ${
                          isPersonMovement ? 'text-purple-400' : 'text-blue-400'
                        }`} />

                        {/* To */}
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-500 mb-1.5">To</div>
                          {movement.toPerson ? (
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium text-sm text-purple-900">{movement.toPerson.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                {movement.toPerson.department}
                              </div>
                            </div>
                          ) : movement.toLocation ? (
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span className="font-medium text-sm text-blue-900">{movement.toLocation.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                {movement.toLocation.area}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 italic text-sm">Unknown</div>
                          )}
                        </div>
                      </div>

                      {/* Stock Level Change */}
                      {(movement.fromStockLevel !== null || movement.toStockLevel !== null) && (
                        <div className="mt-2 flex items-center space-x-2 text-xs">
                          <span className="text-gray-500">Stock:</span>
                          <span className="text-gray-700">{movement.fromStockLevel || 0}</span>
                          <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                          <span className="font-medium text-gray-900">{movement.toStockLevel}</span>
                          {movement.toStockLevel !== (movement.fromStockLevel || 0) && (
                            <span className={`font-medium ${
                              movement.toStockLevel > (movement.fromStockLevel || 0)
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              ({movement.toStockLevel > (movement.fromStockLevel || 0) ? '+' : ''}
                              {movement.toStockLevel - (movement.fromStockLevel || 0)})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Moved By and Notes */}
                      <div className="mt-3 space-y-2">
                        {movement.movedBy && (
                          <div className="flex items-center text-xs bg-gradient-to-r from-gray-50 to-white px-3 py-2 rounded-md border border-gray-200">
                            <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-gray-600">Moved by:</span>
                            <span className="ml-1.5 font-semibold text-gray-900">{movement.movedBy}</span>
                          </div>
                        )}
                        
                        {movement.notes && (
                          <div className="text-sm bg-amber-50 border-l-4 border-amber-400 px-3 py-2 rounded-r-md">
                            <div className="flex items-start">
                              <svg className="w-4 h-4 mr-1.5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-amber-900">Notes</span>
                                <p className="mt-0.5 text-sm text-amber-800">{movement.notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
          })}
        </ul>
      </div>
    </div>
  );
}

