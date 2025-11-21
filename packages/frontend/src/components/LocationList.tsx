import React, { useState, useMemo } from 'react';
import { Location } from '@invenflow/shared';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsUpDownIcon,
  MapPinIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ArchiveBoxIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface LocationListProps {
  locations: Location[];
  loading: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onViewProducts: (location: Location) => void;
  isAdmin: boolean;
}

type SortField = 'name' | 'area' | 'code' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function LocationList({ locations, loading, onEdit, onDelete, onViewProducts, isAdmin }: LocationListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' });
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Sort locations
  const sortedLocations = useMemo(() => {
    const sorted = [...locations].sort((a, b) => {
      const { field, direction } = sortConfig;

      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'area':
          aValue = a.area.toLowerCase();
          bValue = b.area.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [locations, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-blue-600" /> :
      <ArrowDownIcon className="h-4 w-4 text-blue-600" />;
  };

  const getAreaColor = (area: string) => {
    // Generate consistent color based on area name
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
    ];
    const index = area.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Group locations by area
  const locationsByArea = useMemo(() => {
    return sortedLocations.reduce((acc, loc) => {
      if (!acc[loc.area]) acc[loc.area] = [];
      acc[loc.area].push(loc);
      return acc;
    }, {} as Record<string, Location[]>);
  }, [sortedLocations]);

  const toggleAreaDropdown = (area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No locations match your search criteria. Try adjusting your filters or create a new location.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="divide-y divide-gray-200 w-full">
        {Object.entries(locationsByArea).map(([area, areaLocations]) => {
          const areaProductCount = areaLocations.reduce((sum, loc) => sum + (loc.stats?.productCount || 0), 0);
          const areaTotalStock = areaLocations.reduce((sum, loc) => sum + (loc.stats?.totalStock || 0), 0);

          return (
            <div key={area} className="">
              <button
                className="flex items-center w-full px-4 py-3 text-left bg-gray-100 hover:bg-gray-200 transition-colors rounded-t group justify-between"
                onClick={() => toggleAreaDropdown(area)}
                aria-expanded={expandedAreas.has(area)}
              >
                <div className="flex items-center">
                  <span>
                    {expandedAreas.has(area) ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-700 mr-2" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-700 mr-2" />
                    )}
                  </span>
                  <span className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <BuildingOfficeIcon className="h-4 w-4 mr-1 text-primary-500" />
                    {area}
                    <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 rounded px-2 py-0.5">
                      {areaLocations.length} lokasi
                    </span>
                  </span>
                </div>
                
                {/* Area Statistics */}
                <div className="flex items-center space-x-4 text-sm text-gray-600 mr-4">
                  <div className="flex items-center" title="Total Products in Area">
                    <CubeIcon className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="font-medium">{areaProductCount}</span> products
                  </div>
                  <div className="flex items-center border-l pl-4 border-gray-300" title="Total Stock in Area">
                    <ArchiveBoxIcon className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="font-medium">{areaTotalStock}</span> items
                  </div>
                </div>
              </button>
              <div className={expandedAreas.has(area) ? '' : 'hidden'}>
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>{/* eslint-disable-next-line */}<div className="flex items-center space-x-1"><span>Name</span>{getSortIcon('name')}</div></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('area')}>{/* eslint-disable-next-line */}<div className="flex items-center space-x-1"><span>Area</span>{getSortIcon('area')}</div></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('code')}>{/* eslint-disable-next-line */}<div className="flex items-center space-x-1"><span>Code</span>{getSortIcon('code')}</div></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>{/* eslint-disable-next-line */}<div className="flex items-center space-x-1"><span>Created</span>{getSortIcon('createdAt')}</div></th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {areaLocations.map(location => {
                      return (
                        <tr key={location.id} className="group hover:bg-gray-50 transition-colors">
                          <td 
                            className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => onViewProducts(location)}
                            title="Click to view inventory"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              <div>
                                <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">{location.name}</div>
                                {location.building && (
                                  <div className="text-xs text-gray-500">{location.building}{location.floor && ` • ${location.floor}`}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAreaColor(location.area)}`}>
                              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                              {location.area}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">{location.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1 text-xs text-gray-500">
                              <div className="flex items-center" title="Product Count">
                                <CubeIcon className="w-3.5 h-3.5 mr-1.5" />
                                <span>{location.stats?.productCount || 0} prod</span>
                              </div>
                              <div className="flex items-center" title="Total Stock">
                                <ArchiveBoxIcon className="w-3.5 h-3.5 mr-1.5" />
                                <span>{location.stats?.totalStock || 0} stock</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-600">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span>{new Date(location.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {isAdmin && (
                                <>
                                  <button onClick={() => onEdit(location)} className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50" title="Edit location"><PencilIcon className="h-4 w-4" /></button>
                                  <button onClick={() => onDelete(location)} className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50" title="Delete location"><TrashIcon className="h-4 w-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
