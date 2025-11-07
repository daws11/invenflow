import { create } from 'zustand';
import axios from 'axios';
import type { Person, CreatePerson, UpdatePerson } from '@invenflow/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export const usePersonStore = create<PersonStore>((set, _get) => ({
  persons: [],
  loading: false,
  error: null,

  fetchPersons: async (params) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.department) queryParams.append('department', params.department);
      if (params?.activeOnly !== undefined) {
        queryParams.append('activeOnly', params.activeOnly.toString());
      }

      const response = await axios.get(
        `${API_URL}/api/persons?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

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
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/persons/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`${API_URL}/api/persons`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newPerson = response.data;
      set((state) => ({
        persons: [...state.persons, newPerson],
        loading: false
      }));

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
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`${API_URL}/api/persons/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedPerson = response.data;
      set((state) => ({
        persons: state.persons.map((person) =>
          person.id === id ? updatedPerson : person
        ),
        loading: false
      }));

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
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${API_URL}/api/persons/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set((state) => ({
        persons: state.persons.filter((person) => person.id !== id),
        loading: false
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete person';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

