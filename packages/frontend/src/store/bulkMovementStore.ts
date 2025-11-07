import { create } from 'zustand';
import type {
  BulkMovementWithDetails,
  CreateBulkMovement,
  UpdateBulkMovement,
  BulkMovementFilters,
  BulkMovementListResponse,
} from '@invenflow/shared';
import { bulkMovementApi } from '../utils/api';
import { useToastStore } from './toastStore';

interface BulkMovementState {
  // Data
  bulkMovements: BulkMovementWithDetails[];
  selectedBulkMovement: BulkMovementWithDetails | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  
  // Filters
  filters: Partial<BulkMovementFilters>;
  
  // Actions
  fetchBulkMovements: (filters?: Partial<BulkMovementFilters>) => Promise<void>;
  getBulkMovement: (id: string) => Promise<void>;
  createBulkMovement: (data: CreateBulkMovement) => Promise<BulkMovementWithDetails & { publicUrl: string }>;
  updateBulkMovement: (id: string, data: UpdateBulkMovement) => Promise<void>;
  cancelBulkMovement: (id: string) => Promise<void>;
  checkExpired: () => Promise<void>;
  setFilters: (filters: Partial<BulkMovementFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  setSelectedBulkMovement: (bulkMovement: BulkMovementWithDetails | null) => void;
}

export const useBulkMovementStore = create<BulkMovementState>((set, get) => ({
  // Initial state
  bulkMovements: [],
  selectedBulkMovement: null,
  loading: false,
  error: null,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  totalItems: 0,
  filters: {},

  // Fetch bulk movements with filters and pagination
  fetchBulkMovements: async (newFilters) => {
    set({ loading: true, error: null });

    try {
      const { filters, currentPage, pageSize } = get();
      const mergedFilters = { ...filters, ...newFilters, page: currentPage, pageSize };

      const response: BulkMovementListResponse = await bulkMovementApi.getAll(mergedFilters);

      set({
        bulkMovements: response.items,
        currentPage: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        totalItems: response.total,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bulk movements';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast({
        type: 'error',
        message: errorMessage,
      });
    }
  },

  // Get single bulk movement by ID
  getBulkMovement: async (id) => {
    set({ loading: true, error: null });

    try {
      const bulkMovement = await bulkMovementApi.getById(id);
      set({ selectedBulkMovement: bulkMovement, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bulk movement';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast({
        type: 'error',
        message: errorMessage,
      });
    }
  },

  // Create new bulk movement
  createBulkMovement: async (data) => {
    set({ loading: true, error: null });

    try {
      const result = await bulkMovementApi.create(data);
      
      // Refresh the list
      await get().fetchBulkMovements();
      
      set({ loading: false });
      
      useToastStore.getState().addToast({
        type: 'success',
        message: 'Bulk movement created successfully',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bulk movement';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast({
        type: 'error',
        message: errorMessage,
      });
      throw error;
    }
  },

  // Update bulk movement
  updateBulkMovement: async (id, data) => {
    set({ loading: true, error: null });

    try {
      await bulkMovementApi.update(id, data);
      
      // Refresh the list
      await get().fetchBulkMovements();
      
      set({ loading: false });
      
      useToastStore.getState().addToast({
        type: 'success',
        message: 'Bulk movement updated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update bulk movement';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast({
        type: 'error',
        message: errorMessage,
      });
      throw error;
    }
  },

  // Cancel bulk movement
  cancelBulkMovement: async (id) => {
    set({ loading: true, error: null });

    try {
      await bulkMovementApi.cancel(id);
      
      // Refresh the list
      await get().fetchBulkMovements();
      
      set({ loading: false });
      
      useToastStore.getState().addToast({
        type: 'success',
        message: 'Bulk movement cancelled successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel bulk movement';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addToast({
        type: 'error',
        message: errorMessage,
      });
      throw error;
    }
  },

  // Check and mark expired bulk movements
  checkExpired: async () => {
    try {
      const result = await bulkMovementApi.checkExpired();
      
      if (result.expiredCount > 0) {
        // Refresh the list if any were expired
        await get().fetchBulkMovements();
        
        useToastStore.getState().addToast({
          type: 'info',
          message: `${result.expiredCount} bulk movement(s) marked as expired`,
        });
      }
    } catch (error) {
      console.error('Failed to check expired bulk movements:', error);
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    set({
      filters: { ...get().filters, ...newFilters },
      currentPage: 1, // Reset to first page when filters change
    });
    get().fetchBulkMovements();
  },

  // Clear all filters
  clearFilters: () => {
    set({ filters: {}, currentPage: 1 });
    get().fetchBulkMovements();
  },

  // Set page
  setPage: (page) => {
    set({ currentPage: page });
    get().fetchBulkMovements();
  },

  // Set page size
  setPageSize: (size) => {
    set({ pageSize: size, currentPage: 1 });
    get().fetchBulkMovements();
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set selected bulk movement
  setSelectedBulkMovement: (bulkMovement) => {
    set({ selectedBulkMovement: bulkMovement });
  },
}));

