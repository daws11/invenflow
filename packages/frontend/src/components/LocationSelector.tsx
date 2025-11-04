import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { Location } from '@invenflow/shared';

interface LocationSelectorProps {
  value?: string | null;
  onChange: (locationId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export default function LocationSelector({
  value,
  onChange,
  placeholder = 'Select a location...',
  disabled = false,
  allowClear = true,
  className = ''
}: LocationSelectorProps) {
  const { locations, areas, loading, fetchLocations } = useLocationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Filter locations based on search and area
  const filteredLocations = locations.filter(location => {
    const matchesSearch = !searchTerm ||
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.area.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = !selectedArea || location.area === selectedArea;

    return matchesSearch && matchesArea;
  });

  const selectedLocation = locations.find(loc => loc.id === value);

  const handleSelectLocation = (location: Location) => {
    onChange(location.id);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedArea('');
  };

  const handleClear = () => {
    onChange(null);
  };

  const displayText = selectedLocation
    ? `${selectedLocation.area} - ${selectedLocation.name} (${selectedLocation.code})`
    : placeholder;

  return (
    <div className={`relative ${className}`}>
      {/* Selected Location Display */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-left border rounded-lg
            bg-white border-gray-300 text-gray-900
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-400 transition-colors
            disabled:bg-gray-50 disabled:text-gray-500
            flex items-center justify-between
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className={selectedLocation ? 'text-gray-900' : 'text-gray-500'}>
            {displayText}
          </span>
          <div className="flex items-center space-x-2">
            {selectedLocation && allowClear && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search and Filter */}
          <div className="p-3 border-b border-gray-200">
            <div className="space-y-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading locations...
              </div>
            ) : filteredLocations.length > 0 ? (
              <div className="py-1">
                {filteredLocations.map(location => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors
                      ${value === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.code}</div>
                      </div>
                      <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">
                        {location.area}
                      </div>
                    </div>
                    {location.description && (
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        {location.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm || selectedArea ? (
                  <div>
                    <p>No locations found matching your criteria</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedArea('');
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>No locations available</p>
                    <p className="text-xs mt-1">
                      <a href="/locations" className="text-blue-600 hover:text-blue-800">
                        Create your first location
                      </a>
                    </p>
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

// Compact version for forms with limited space
interface CompactLocationSelectorProps extends Omit<LocationSelectorProps, 'className'> {
  showCode?: boolean;
}

export function CompactLocationSelector({
  value,
  onChange,
  placeholder = 'Select location...',
  disabled = false,
  allowClear = true,
  showCode = true
}: CompactLocationSelectorProps) {
  const { locations, loading, fetchLocations } = useLocationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLocation = locations.find(loc => loc.id === value);

  const handleSelectLocation = (location: Location) => {
    onChange(location.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayText = selectedLocation
    ? showCode
      ? `${selectedLocation.name} (${selectedLocation.code})`
      : selectedLocation.name
    : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-gray-300 rounded-lg
          bg-white text-gray-900 text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-gray-400 transition-colors
          disabled:bg-gray-50 disabled:text-gray-500
          flex items-center justify-between
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={selectedLocation ? 'text-gray-900' : 'text-gray-500'}>
          {displayText}
        </span>
        <div className="flex items-center space-x-2">
          {selectedLocation && allowClear && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-gray-400 hover:text-gray-600"
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

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Location List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
                Loading...
              </div>
            ) : filteredLocations.length > 0 ? (
              <div className="py-1">
                {filteredLocations.map(location => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm
                      ${value === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-xs text-gray-500">
                      {location.area} • {location.code}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-gray-500 text-sm">
                {searchTerm ? 'No locations found' : 'No locations available'}
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
