import { create } from 'zustand';
import type { Person, CreatePerson, UpdatePerson } from '@invenflow/shared';
import { api } from '../utils/api';

interface PersonStore {
  persons: Person[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchPersons: (params?: { 
    search?: string; 
    department?: string; 
    activeOnly?: boolean;
  }) => Promise<void>;
  fetchPersonById: (id: string) => Promise<Person | null>;
  createPerson: (data: CreatePerson) => Promise<Person>;
  updatePerson: (id: string, data: UpdatePerson) => Promise<Person>;
  deletePerson: (id: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export const usePersonStore = create<PersonStore>((set, get) => ({
  persons: [],
  loading: false,
  error: null,

  fetchPersons: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/persons', {
        params: {
          ...(params?.search && { search: params.search }),
          ...(params?.department && { department: params.department }),
          ...(params?.activeOnly !== undefined && { activeOnly: params.activeOnly }),
        },
      });

      set({ persons: response.data.persons || [], loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch persons';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchPersonById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/api/persons/${id}`);

      set({ loading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch person';
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  createPerson: async (data: CreatePerson) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/persons', data);
      const newPerson = response.data;

      // Re-fetch all persons to ensure cache invalidation works
      await get().fetchPersons();

      set({ loading: false });
      return newPerson;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create person';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updatePerson: async (id: string, data: UpdatePerson) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/api/persons/${id}`, data);
      const updatedPerson = response.data;

      // Re-fetch all persons to ensure cache invalidation works
      await get().fetchPersons();

      set({ loading: false });
      return updatedPerson;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update person';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deletePerson: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/api/persons/${id}`);

      // Re-fetch all persons to ensure cache invalidation works
      await get().fetchPersons();

      set({ loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete person';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

