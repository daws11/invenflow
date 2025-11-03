import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { Location } from '@invenflow/shared';

interface LocationFilterProps {
  selectedLocationId?: string | null;
  onLocationChange: (locationId: string | null) => void;
  disabled?: boolean;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export default function LocationFilter({
  selectedLocationId,
  onLocationChange,
  disabled = false,
  className = '',
  showAllOption = true,
  allOptionLabel = 'All Locations'
}: LocationFilterProps) {
  const { locations, groupedLocations, areas, loading, fetchLocations } = useLocationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Filter locations based on search
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleSelectLocation = (location: Location | null) => {
    onLocationChange(location?.id || null);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayText = selectedLocation
    ? `${selectedLocation.area} - ${selectedLocation.name}`
    : allOptionLabel;

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-lg
          bg-white border-gray-300 text-gray-900 text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-gray-400 transition-colors
          disabled:bg-gray-50 disabled:text-gray-500
          flex items-center justify-between
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className={selectedLocation ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {displayText}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {selectedLocation && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectLocation(null);
              }}
              className="text-gray-400 hover:text-gray-600"
              title="Clear filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search locations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Location Options */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Loading locations...</p>
              </div>
            ) : (
              <div className="py-1">
                {/* All Locations Option */}
                {showAllOption && (
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(null)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm
                      ${!selectedLocationId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span>{allOptionLabel}</span>
                    </div>
                  </button>
                )}

                {/* Grouped by Area */}
                {Object.entries(groupedLocations).map(([area, areaLocations]) => {
                  const filteredAreaLocations = areaLocations.filter(location =>
                    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    location.code.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (filteredAreaLocations.length === 0) return null;

                  return (
                    <div key={area}>
                      {/* Area Header */}
                      <div className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {area}
                      </div>

                      {/* Locations in this area */}
                      {filteredAreaLocations.map(location => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => handleSelectLocation(location)}
                          className={`
                            w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm pl-6
                            ${selectedLocationId === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span>{location.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{location.code}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* No Results */}
                {Object.keys(groupedLocations).length === 0 && !loading && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No locations available</p>
                    <p className="text-xs mt-1">
                      <a href="/locations" className="text-blue-600 hover:text-blue-800">
                        Create your first location
                      </a>
                    </p>
                  </div>
                )}

                {/* No Search Results */}
                {searchTerm && Object.values(groupedLocations).every(areaLocations =>
                  areaLocations.every(location =>
                    !location.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !location.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                ) && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <p>No locations found matching "{searchTerm}"</p>
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Minimal version for tight spaces
interface MinimalLocationFilterProps {
  selectedLocationId?: string | null;
  onLocationChange: (locationId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function MinimalLocationFilter({
  selectedLocationId,
  onLocationChange,
  disabled = false,
  className = ''
}: MinimalLocationFilterProps) {
  const { locations, loading, fetchLocations } = useLocationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleSelectLocation = (location: Location | null) => {
    onLocationChange(location?.id || null);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          px-2 py-1 text-xs border rounded
          bg-white border-gray-300 text-gray-700
          hover:border-gray-400 transition-colors
          disabled:bg-gray-50 disabled:text-gray-500
          flex items-center space-x-1
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="max-w-20 truncate">
          {selectedLocation ? selectedLocation.name : 'All'}
        </span>
        {selectedLocation && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectLocation(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-48 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500 text-xs">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
                Loading...
              </div>
            ) : (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => handleSelectLocation(null)}
                  className={`
                    w-full px-2 py-1.5 text-left hover:bg-gray-100 transition-colors text-xs
                    ${!selectedLocationId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  All Locations
                </button>

                {Object.entries(
                  locations.reduce((acc, location) => {
                    if (!acc[location.area]) acc[location.area] = [];
                    acc[location.area].push(location);
                    return acc;
                  }, {} as Record<string, typeof locations>)
                ).map(([area, areaLocations]) => (
                  <div key={area}>
                    <div className="px-2 py-1 bg-gray-50 text-xs font-semibold text-gray-600">
                      {area}
                    </div>
                    {areaLocations.map(location => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => handleSelectLocation(location)}
                        className={`
                          w-full px-2 py-1.5 text-left hover:bg-gray-100 transition-colors text-xs pl-4
                          ${selectedLocationId === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                        `}
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}