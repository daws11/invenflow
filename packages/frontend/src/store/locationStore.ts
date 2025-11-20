import { create } from 'zustand';
import { Location, CreateLocation, UpdateLocation } from '@invenflow/shared';
import { locationApi } from '../utils/api';

interface LocationState {
  locations: Location[];
  groupedLocations: Record<string, Location[]>;
  areas: string[];
  currentLocation: Location | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchLocations: (params?: { search?: string; area?: string }) => Promise<void>;
  fetchLocationById: (id: string) => Promise<void>;
  createLocation: (data: CreateLocation) => Promise<Location>;
  updateLocation: (id: string, data: UpdateLocation) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  fetchAreas: () => Promise<void>;

  // Utility actions
  clearCurrentLocation: () => void;
  clearError: () => void;
  refreshLocations: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  groupedLocations: {},
  areas: [],
  currentLocation: null,
  loading: false,
  error: null,

  fetchLocations: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await locationApi.getAll(params);
      set({
        locations: response.locations,
        groupedLocations: response.groupedByArea,
        areas: response.areas,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch locations',
        loading: false
      });
    }
  },

  fetchLocationById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const location = await locationApi.getById(id);
      set({ currentLocation: location, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch location',
        loading: false
      });
    }
  },

  createLocation: async (data: CreateLocation) => {
    set({ loading: true, error: null });
    try {
      const newLocation = await locationApi.create(data);

      // Update state optimistically
      const { locations, groupedLocations, areas } = get();
      const updatedLocations = [...locations, newLocation];

      // Update grouped locations
      const updatedGroupedLocations = { ...groupedLocations };
      if (!updatedGroupedLocations[newLocation.area]) {
        updatedGroupedLocations[newLocation.area] = [];
      }
      updatedGroupedLocations[newLocation.area].push(newLocation);

      // Update areas if new
      const updatedAreas = areas.includes(newLocation.area)
        ? areas
        : [...areas, newLocation.area].sort();

      set({
        locations: updatedLocations,
        groupedLocations: updatedGroupedLocations,
        areas: updatedAreas,
        loading: false
      });

      return newLocation;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create location',
        loading: false
      });
      throw error;
    }
  },

  updateLocation: async (id: string, data: UpdateLocation) => {
    set({ loading: true, error: null });
    try {
      const updatedLocation = await locationApi.update(id, data);

      // Update state
      const { locations, groupedLocations } = get();

      // Update locations array
      const updatedLocations = locations.map(loc =>
        loc.id === id ? updatedLocation : loc
      );

      // Update grouped locations
      const updatedGroupedLocations = { ...groupedLocations };

      // Remove from old area if area changed
      const oldLocation = locations.find(loc => loc.id === id);
      if (oldLocation && oldLocation.area !== updatedLocation.area) {
        updatedGroupedLocations[oldLocation.area] = updatedGroupedLocations[oldLocation.area]
          .filter(loc => loc.id !== id);

        // Add to new area
        if (!updatedGroupedLocations[updatedLocation.area]) {
          updatedGroupedLocations[updatedLocation.area] = [];
        }
        updatedGroupedLocations[updatedLocation.area].push(updatedLocation);
      } else {
        // Update in same area
        updatedGroupedLocations[updatedLocation.area] = updatedGroupedLocations[updatedLocation.area]
          .map(loc => loc.id === id ? updatedLocation : loc);
      }

      set({
        locations: updatedLocations,
        groupedLocations: updatedGroupedLocations,
        currentLocation: updatedLocation,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update location',
        loading: false
      });
      throw error;
    }
  },

  deleteLocation: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await locationApi.delete(id);

      // Update state
      const { locations, groupedLocations, currentLocation } = get();
      const locationToDelete = locations.find(loc => loc.id === id);

      if (locationToDelete) {
        // Remove from locations array
        const updatedLocations = locations.filter(loc => loc.id !== id);

        // Remove from grouped locations
        const updatedGroupedLocations = { ...groupedLocations };
        updatedGroupedLocations[locationToDelete.area] = updatedGroupedLocations[locationToDelete.area]
          .filter(loc => loc.id !== id);

        // Clean up empty areas
        if (updatedGroupedLocations[locationToDelete.area].length === 0) {
          delete updatedGroupedLocations[locationToDelete.area];
        }

        // Update areas list
        const remainingAreas = Object.keys(updatedGroupedLocations).sort();

        set({
          locations: updatedLocations,
          groupedLocations: updatedGroupedLocations,
          areas: remainingAreas,
          currentLocation: currentLocation?.id === id ? null : currentLocation,
          loading: false
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete location',
        loading: false
      });
      throw error;
    }
  },

  fetchAreas: async () => {
    try {
      const areas = await locationApi.getAreas();
      set({ areas });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch areas'
      });
    }
  },

  clearCurrentLocation: () => {
    set({ currentLocation: null });
  },

  clearError: () => {
    set({ error: null });
  },

  refreshLocations: async () => {
    const currentParams = {
      search: undefined,
      area: undefined
    };
    await get().fetchLocations(currentParams);
  }
}));