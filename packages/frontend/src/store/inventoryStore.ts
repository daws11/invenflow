import { create } from 'zustand';
import {
  InventoryItem,
  InventoryFilters,
  InventoryResponse,
  InventoryStats,
} from '@invenflow/shared';
import { inventoryApi } from '../utils/api';
import { useToastStore } from './toastStore';

interface InventoryState {
  // Data
  items: InventoryItem[];
  stats: InventoryStats | null;
  availableFilters: {
    categories: string[];
    suppliers: string[];
    locations: string[];
    kanbans: { id: string; name: string }[];
  };

  // UI State
  loading: boolean;
  statsLoading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;

  // Filters
  filters: InventoryFilters;
  viewMode: 'unified' | 'by-kanban';

  // Selected item for detail view
  selectedItem: InventoryItem | null;
  showDetailModal: boolean;

  // Actions
  fetchInventory: (params?: Partial<InventoryFilters> & { page?: number; pageSize?: number }) => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<InventoryFilters>) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'unified' | 'by-kanban') => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  setShowDetailModal: (show: boolean) => void;
  updateProductStock: (productId: string, stockLevel: number) => Promise<void>;
  updateProductLocation: (productId: string, location: string, locationId?: string) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  refreshInventory: () => Promise<void>;
}

const defaultFilters: InventoryFilters = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'unified',
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial state
  items: [],
  stats: null,
  availableFilters: {
    categories: [],
    suppliers: [],
    locations: [],
    kanbans: [],
  },
  loading: false,
  statsLoading: false,
  error: null,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  totalItems: 0,
  filters: defaultFilters,
  viewMode: 'unified',
  selectedItem: null,
  showDetailModal: false,

  fetchInventory: async (params = {}) => {
    set({ loading: true, error: null });

    try {
      const { filters, currentPage, pageSize, viewMode } = get();
      const mergedParams = {
        ...filters,
        viewMode,
        page: currentPage,
        pageSize,
        ...params,
      };

      const response: InventoryResponse = await inventoryApi.getInventory(mergedParams);

      set({
        items: response.items,
        availableFilters: response.filters,
        currentPage: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        totalItems: response.total,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
        loading: false,
      });
    }
  },

  fetchStats: async () => {
    set({ statsLoading: true });

    try {
      const stats = await inventoryApi.getStats();
      set({ stats, statsLoading: false });
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
      set({ statsLoading: false });
    }
  },

  setFilters: (newFilters) => {
    const { filters } = get();
    const updatedFilters = { ...filters, ...newFilters };

    set({
      filters: updatedFilters,
      currentPage: 1, // Reset to first page when filters change
    });

    // Trigger fetch with new filters
    get().fetchInventory();
  },

  clearFilters: () => {
    set({
      filters: defaultFilters,
      currentPage: 1,
    });
    get().fetchInventory();
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    get().fetchInventory();
  },

  setSelectedItem: (item) => {
    set({ selectedItem: item });
  },

  setShowDetailModal: (show) => {
    set({ showDetailModal: show });
    if (!show) {
      set({ selectedItem: null });
    }
  },

  updateProductStock: async (productId, stockLevel) => {
    set({ loading: true, error: null });

    try {
      // Use productApi to update the stock
      const { productApi } = await import('../utils/api');
      await productApi.update(productId, { stockLevel });

      // Update local state
      set(state => ({
        items: state.items.map(item =>
          item.id === productId ? { ...item, stockLevel } : item
        ),
        selectedItem: state.selectedItem?.id === productId
          ? { ...state.selectedItem, stockLevel }
          : state.selectedItem,
        loading: false,
      }));

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Stock level updated successfully',
        type: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update stock level';
      set({ error: errorMessage, loading: false });

      useToastStore.getState().addToast({
        message: errorMessage,
        type: 'error',
      });
    }
  },

  updateProductLocation: async (productId, location, locationId) => {
    set({ loading: true, error: null });

    try {
      // Use productApi to update the location
      const { productApi } = await import('../utils/api');
      await productApi.update(productId, { location, locationId: locationId ?? null });

      // Update local state
      set(state => ({
        items: state.items.map(item =>
          item.id === productId ? { ...item, location, locationId: locationId ?? null } : item
        ),
        selectedItem: state.selectedItem?.id === productId
          ? { ...state.selectedItem, location, locationId: locationId ?? null }
          : state.selectedItem,
        loading: false,
      }));

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Location updated successfully',
        type: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      set({ error: errorMessage, loading: false });

      useToastStore.getState().addToast({
        message: errorMessage,
        type: 'error',
      });
    }
  },

  setPage: (page) => {
    set({ currentPage: page });
    get().fetchInventory();
  },

  setPageSize: (size) => {
    set({ pageSize: size, currentPage: 1 });
    get().fetchInventory();
  },

  clearError: () => set({ error: null }),

  refreshInventory: () => Promise.all([get().fetchInventory(), get().fetchStats()]).then(() => {}),
}));
