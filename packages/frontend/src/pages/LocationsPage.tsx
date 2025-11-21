import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { Location, CreateLocation, UpdateLocation } from '@invenflow/shared';
import { LocationList } from '../components/LocationList';
import { LocationViewModeToggle } from '../components/LocationViewModeToggle';
import { CreateLocationModal } from '../components/CreateLocationModal';
import { EditLocationModal } from '../components/EditLocationModal';
import { DeleteLocationModal } from '../components/DeleteLocationModal';
import { LocationInventoryModal } from '../components/LocationInventoryModal';
import { useToast } from '../store/toastStore';
import { MapPinIcon, ArchiveBoxIcon, CubeIcon as Package, BuildingOfficeIcon } from '@heroicons/react/24/outline';

type ViewMode = 'grid' | 'list';

export default function LocationsPage() {
  const {
    locations,
    groupedLocations,
    areas,
    loading,
    error,
    fetchLocations,
    fetchAreas,
    createLocation,
    updateLocation,
    deleteLocation,
    clearError
  } = useLocationStore();

  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'admin';

  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
      fetchLocations();
      fetchAreas();
  }, [fetchLocations, fetchAreas]);

  useEffect(() => {
    const params: { search?: string; area?: string; type?: string } = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedArea) params.area = selectedArea;
    if (selectedType) params.type = selectedType;
    fetchLocations(params);
  }, [searchTerm, selectedArea, selectedType, fetchLocations]);

  const handleCreateLocation = async (data: CreateLocation) => {
    try {
      await createLocation(data);
      toast.success('Location created successfully');
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error('Failed to create location. Please try again.');
      throw error;
    }
  };

  const handleUpdateLocation = async (id: string, data: UpdateLocation) => {
    try {
      await updateLocation(id, data);
      toast.success('Location updated successfully');
      setIsEditModalOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      toast.error('Failed to update location. Please try again.');
      throw error;
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await deleteLocation(id);
      toast.success('Location deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      toast.error('Failed to delete location. Please try again.');
      throw error;
    }
  };

  const openEditModal = (location: Location) => {
    setSelectedLocation(location);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (location: Location) => {
    setSelectedLocation(location);
    setIsDeleteModalOpen(true);
  };

  const openInventoryModal = (location: Location) => {
    setSelectedLocation(location);
    setIsInventoryModalOpen(true);
  };

  if (loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Location Management</h1>
              <p className="text-gray-600 mt-1">Manage warehouse locations and areas</p>
            </div>
            <div className="flex items-center space-x-2">
              <LocationViewModeToggle currentMode={viewMode} onModeChange={setViewMode} />
              
              {/* Quick Actions */}
              <div className="hidden md:flex items-center space-x-2">
                {selectedType && (
                  <button
                    onClick={() => setSelectedType('')}
                    className="px-2 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    title="Clear filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Add button with dropdown - Admin only */}
              {isAdmin && (
              <div className="relative inline-block">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Add Location</span>
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Banner */}
      {locations.length > 0 && (
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Locations */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Locations</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{locations.length}</p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <MapPinIcon className="w-8 h-8 text-gray-600" />
                </div>
              </div>
            </div>

            {/* Total Areas */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Total Areas</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">
                    {areas.length > 0 ? areas.length : new Set(locations.map(l => l.area)).size}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Stock */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Total Stock</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {locations.reduce((sum, loc) => sum + (loc.stats?.totalStock || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <ArchiveBoxIcon className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Total Products</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {locations.reduce((sum, loc) => sum + (loc.stats?.productCount || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3">
        <div className="bg-white rounded-lg shadow p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Locations
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, code, or area..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center">
              <p className="text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locations Display */}
      <div className="w-full px-3 sm:px-4 lg:px-6 pb-4">
        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow">
            <LocationList
              locations={locations}
              loading={loading}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              onViewProducts={openInventoryModal}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <div>
            {Object.entries(groupedLocations).map(([area, areaLocations]) => {
              // Calculate area stats
              const areaProductCount = areaLocations.reduce((sum, loc) => sum + (loc.stats?.productCount || 0), 0);
              const areaTotalStock = areaLocations.reduce((sum, loc) => sum + (loc.stats?.totalStock || 0), 0);

              return (
              <div key={area} className="mb-8 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {area}
                  </span>
                  <span className="ml-2 text-gray-500 text-sm">
                    ({areaLocations.length} locations)
                  </span>
                </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2 sm:mt-0 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="font-medium">{areaProductCount}</span> products
                      </div>
                      <div className="flex items-center border-l pl-4 border-gray-300">
                        <ArchiveBoxIcon className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="font-medium">{areaTotalStock}</span> items
                      </div>
                    </div>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {areaLocations.map(location => (
                    <div
                      key={location.id}
                      className="relative bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 p-5 transform hover:-translate-y-1 border-l-4 border-blue-500 hover:border-blue-600"
                    >
                      {/* Header with Icon and Type Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                          📍 Physical Location
                        </span>
                      </div>

                      {/* Location Name */}
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">
                          {location.name}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {location.area}
                        </p>
                        <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-50 px-2 py-1 rounded inline-block">
                          {location.code}
                        </p>
                      </div>

                        {/* Stats Mini-Summary */}
                        <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <div className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {location.stats?.productCount || 0} Products
                          </div>
                          <div className="flex items-center">
                            <ArchiveBoxIcon className="w-3 h-3 mr-1" />
                            {location.stats?.totalStock || 0} Stock
                          </div>
                        </div>

                      {/* Description */}
                      {location.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 italic border-l-2 border-gray-200 pl-3">
                          {location.description}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(location.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex space-x-1.5">
                            <button
                              onClick={() => openInventoryModal(location)}
                              className="p-1.5 rounded-lg transition-colors text-teal-600 hover:bg-teal-50"
                              title="View Inventory"
                            >
                              <ArchiveBoxIcon className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <>
                          <button
                            onClick={() => openEditModal(location)}
                            className="p-1.5 rounded-lg transition-colors text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(location)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                              </>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}

            {Object.keys(groupedLocations).length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedArea
                    ? 'No locations match your search criteria. Try adjusting your filters.'
                    : 'Create your first location to get started'}
                </p>
                {!searchTerm && !selectedArea && isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Location
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <LocationInventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        location={selectedLocation}
      />

      <CreateLocationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateLocation}
      />

      <EditLocationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        onUpdate={handleUpdateLocation}
      />

      <DeleteLocationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        onDelete={handleDeleteLocation}
      />
    </div>
  );
}
