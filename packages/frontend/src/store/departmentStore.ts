import { create } from 'zustand';
import type { Department, CreateDepartment, UpdateDepartment } from '@invenflow/shared';
import { api } from '../utils/api';

interface DepartmentStore {
  departments: Department[];
  activeDepartments: Department[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDepartments: (params?: { 
    search?: string; 
    activeOnly?: boolean;
  }) => Promise<void>;
  fetchActiveDepartments: () => Promise<void>;
  fetchDepartmentById: (id: string) => Promise<Department | null>;
  createDepartment: (data: CreateDepartment) => Promise<Department>;
  updateDepartment: (id: string, data: UpdateDepartment) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: [],
  activeDepartments: [],
  loading: false,
  error: null,

  fetchDepartments: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/departments', {
        params: {
          ...(params?.search && { search: params.search }),
          ...(params?.activeOnly !== undefined && { activeOnly: params.activeOnly }),
        },
      });

      set({ departments: response.data.departments || [], loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch departments';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchActiveDepartments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/departments/active');

      set({ activeDepartments: response.data || [], loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch active departments';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchDepartmentById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/api/departments/${id}`);

      set({ loading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch department';
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  createDepartment: async (data: CreateDepartment) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/departments', data);

      const newDepartment = response.data;
      set((state) => ({
        departments: [...state.departments, newDepartment],
        loading: false
      }));

      // Refresh active departments if new one is active
      if (newDepartment.isActive) {
        await get().fetchActiveDepartments();
      }

      return newDepartment;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create department';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateDepartment: async (id: string, data: UpdateDepartment) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/api/departments/${id}`, data);

      const updatedDepartment = response.data;
      set((state) => ({
        departments: state.departments.map((dept) =>
          dept.id === id ? updatedDepartment : dept
        ),
        loading: false
      }));

      // Refresh active departments
      await get().fetchActiveDepartments();

      return updatedDepartment;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update department';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deleteDepartment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/api/departments/${id}`);

      set((state) => ({
        departments: state.departments.filter((dept) => dept.id !== id),
        activeDepartments: state.activeDepartments.filter((dept) => dept.id !== id),
        loading: false
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete department';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

