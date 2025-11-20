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

      set({ loading: false });
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

      set({ loading: false });
      return updatedLocation;
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

      set({ loading: false });
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