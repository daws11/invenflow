import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { Location, CreateLocation, UpdateLocation } from '@invenflow/shared';
import { LocationList } from '../components/LocationList';
import { LocationViewModeToggle } from '../components/LocationViewModeToggle';
import { CreateLocationModal } from '../components/CreateLocationModal';
import { EditLocationModal } from '../components/EditLocationModal';
import { DeleteLocationModal } from '../components/DeleteLocationModal';
import { useToast } from '../store/toastStore';
import { MapPinIcon } from '@heroicons/react/24/outline';

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

  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
    fetchAreas();
  }, [fetchLocations, fetchAreas]);

  useEffect(() => {
    const params: { search?: string; area?: string } = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedArea) params.area = selectedArea;
    fetchLocations(params);
  }, [searchTerm, selectedArea, fetchLocations]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
              <p className="text-gray-600 mt-1">Manage warehouse locations and areas</p>
            </div>
            <div className="flex items-center space-x-3">
              <LocationViewModeToggle currentMode={viewMode} onModeChange={setViewMode} />
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add New Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow">
            <LocationList
              locations={locations}
              loading={loading}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          </div>
        ) : (
          <div>
            {Object.entries(groupedLocations).map(([area, areaLocations]) => (
              <div key={area} className="mb-8 animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {area}
                  </span>
                  <span className="ml-2 text-gray-500 text-sm">
                    ({areaLocations.length} locations)
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {areaLocations.map(location => (
                    <div
                      key={location.id}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-6 transform hover:-translate-y-1"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{location.name}</h3>
                          <p className="text-sm text-gray-500 font-mono">{location.code}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(location)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(location)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {location.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{location.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        Created: {new Date(location.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(groupedLocations).length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedArea
                    ? 'No locations match your search criteria. Try adjusting your filters.'
                    : 'Create your first location to get started'}
                </p>
                {!searchTerm && !selectedArea && (
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

      {/* Modals */}
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
