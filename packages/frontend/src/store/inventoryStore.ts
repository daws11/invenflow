import { create } from 'zustand';
import {
  InventoryItem,
  InventoryFilters,
  InventoryResponse,
  InventoryStats,
  GroupedInventoryItem,
  GroupedInventoryResponse,
} from '@invenflow/shared';
import { inventoryApi } from '../utils/api';
import { useToastStore } from './toastStore';
import { debounce } from '../utils/debounce';
import { globalRequestDeduplicator } from '../utils/requestDeduplicator';
import type {
  InventoryWebSocketEvent,
  InventoryWebSocketStatus,
} from '../hooks/useInventoryWebSocket';

interface InventoryState {
  // Data
  items: InventoryItem[];
  groupedItems: GroupedInventoryItem[];
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
  viewMode: 'unified' | 'by-kanban' | 'list';
  displayMode: 'individual' | 'grouped';
  groupedViewMode: 'grid' | 'list';
  lastGroupedParams?: {
    search?: string;
    category?: string[];
    supplier?: string[];
    status?: string;
  };

  // Selected item for detail view
  selectedItem: InventoryItem | null;
  showDetailModal: boolean;

  // Actions
  fetchInventory: (params?: Partial<InventoryFilters> & { page?: number; pageSize?: number }) => Promise<void>;
  fetchGroupedInventory: (params?: { search?: string; category?: string[]; supplier?: string[]; status?: string }) => Promise<void>;
  fetchProductsBySku: (sku: string) => Promise<InventoryItem[]>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<InventoryFilters>) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'unified' | 'by-kanban' | 'list') => void;
  setDisplayMode: (mode: 'individual' | 'grouped') => void;
  setGroupedViewMode: (mode: 'grid' | 'list') => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  setShowDetailModal: (show: boolean) => void;
  realtimeStatus: InventoryWebSocketStatus;
  setRealtimeStatus: (status: InventoryWebSocketStatus) => void;
  handleRealtimeEvent: (event: InventoryWebSocketEvent) => void;
  updateProduct: (productId: string, updateData: Record<string, any>) => Promise<void>;
  updateProductStock: (productId: string, stockLevel: number) => Promise<void>;
  updateProductLocation: (productId: string, location: string, locationId?: string) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  refreshInventory: () => Promise<void>;
  syncAfterMutation: () => Promise<void>;
}

const defaultFilters: InventoryFilters = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'unified',
};

export const useInventoryStore = create<InventoryState>((set, get) => {
  let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const runInventoryRefresh = async () => {
    await get().refreshInventory();
    const { displayMode, lastGroupedParams } = get();
    if (displayMode === 'grouped') {
      await get().fetchGroupedInventory(lastGroupedParams);
    }
  };

  const triggerRealtimeSync = async () => {
    try {
      await runInventoryRefresh();
    } catch (error) {
      console.error('[inventoryStore] Failed to refresh after realtime event', error);
    }
  };

  const scheduleRealtimeRefresh = () => {
    if (typeof window === 'undefined') {
      void triggerRealtimeSync();
      return;
    }
    if (realtimeRefreshTimer) {
      return;
    }
    realtimeRefreshTimer = setTimeout(() => {
      realtimeRefreshTimer = null;
      void triggerRealtimeSync();
    }, 400) as ReturnType<typeof setTimeout>;
  };

  const upsertProductInState = (product: InventoryItem) => {
    set((state) => {
      const index = state.items.findIndex((item) => item.id === product.id);
      if (index === -1) {
        return {};
      }
      const updatedItems = [...state.items];
      updatedItems[index] = { ...updatedItems[index], ...product };
      return {
        items: updatedItems,
        selectedItem:
          state.selectedItem?.id === product.id
            ? { ...state.selectedItem, ...product }
            : state.selectedItem,
      };
    });
  };

  const removeProductFromState = (productId: string) => {
    set((state) => {
      const filtered = state.items.filter((item) => item.id !== productId);
      if (filtered.length === state.items.length) {
        return {};
      }
      const shouldCloseDetail = state.selectedItem?.id === productId;
      return {
        items: filtered,
        selectedItem: shouldCloseDetail ? null : state.selectedItem,
        showDetailModal: shouldCloseDetail ? false : state.showDetailModal,
      };
    });
  };

  const hasProductInState = (productId?: string | null) => {
    if (!productId) {
      return false;
    }
    const { items } = get();
    return items.some((item) => item.id === productId);
  };

  return {
    // Initial state
  items: [],
  groupedItems: [],
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
  viewMode: 'list',
  displayMode: 'grouped', // Default to grouped view
  groupedViewMode: 'list', // Default grouped view as list
  lastGroupedParams: {},
  selectedItem: null,
  showDetailModal: false,
  realtimeStatus: 'idle',

  fetchInventory: async (params = {}) => {
    set({ loading: true, error: null });

    try {
      const { filters, currentPage, pageSize, viewMode } = get();
      // Convert 'list' viewMode to 'unified' for API compatibility
      const apiViewMode = viewMode === 'list' ? 'unified' : viewMode;
      const mergedParams = {
        ...filters,
        viewMode: apiViewMode,
        page: currentPage,
        pageSize,
        ...params,
      };

      const response: InventoryResponse = await globalRequestDeduplicator.run(
        `inventory:list:${JSON.stringify(mergedParams)}`,
        () => inventoryApi.getInventory(mergedParams),
      );

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
      const stats = await globalRequestDeduplicator.run(
        'inventory:stats',
        () => inventoryApi.getStats(),
      );
      set({ stats, statsLoading: false });
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
      set({ statsLoading: false });
    }
  },

  setFilters: (newFilters) => {
    const { filters } = get();
    const updatedFilters = { ...filters, ...newFilters };

    // Only update if filters actually changed (performance optimization)
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(updatedFilters);
    
    if (!filtersChanged) {
      return;
    }

    set({
      filters: updatedFilters,
      currentPage: 1, // Reset to first page when filters change
    });

    // Debounce API calls to avoid excessive requests
    const debouncedFetch = debounce(() => {
    get().fetchInventory();
    }, 300);
    
    debouncedFetch();
  },

  clearFilters: () => {
    set({
      filters: defaultFilters,
      currentPage: 1,
    });
    get().fetchInventory();
  },

  fetchGroupedInventory: async (params = {}) => {
    set({ loading: true, error: null, lastGroupedParams: { ...params } });

    try {
      const response: GroupedInventoryResponse = await globalRequestDeduplicator.run(
        `inventory:grouped:${JSON.stringify(params)}`,
        () => inventoryApi.getGroupedInventory(params),
      );

      set({
        groupedItems: response.items,
        totalItems: response.total,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch grouped inventory',
        loading: false,
      });
    }
  },

  fetchProductsBySku: async (sku: string) => {
    try {
      const response: InventoryResponse = await inventoryApi.getInventory({ 
        search: sku,
        pageSize: 1000, // Get all products with this SKU
        columnStatus: ['Purchased', 'Received', 'Stored'], // Include all statuses including incoming (Purchased)
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        viewMode: 'unified',
      });
      return response.items;
    } catch (error) {
      console.error('Failed to fetch products by SKU:', error);
      return [];
    }
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    get().fetchInventory();
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode });
    // Fetch appropriate data based on display mode
    if (mode === 'grouped') {
      get().fetchGroupedInventory();
    } else {
      get().fetchInventory();
    }
  },

  setGroupedViewMode: (mode) => {
    set({ groupedViewMode: mode });
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
  handleRealtimeEvent: (event) => {
    if (!event || !event.type) {
      return;
    }

    const product = (event as { product?: InventoryItem }).product;

    switch (event.type) {
      case 'inventory:product-updated':
      case 'inventory:product-moved':
      case 'inventory:stock-changed':
      case 'inventory:location-changed': {
        if (product && hasProductInState(product.id)) {
          upsertProductInState(product);
        } else if (hasProductInState((event as { productId?: string }).productId)) {
          scheduleRealtimeRefresh();
        }
        break;
      }
      case 'inventory:product-deleted': {
        const productId = (event as { productId?: string }).productId;
        if (productId) {
          removeProductFromState(productId);
        } else {
          scheduleRealtimeRefresh();
        }
        break;
      }
      case 'inventory:product-created':
      case 'inventory:bulk-updated': {
        scheduleRealtimeRefresh();
        break;
      }
      default:
        break;
    }
  },
  setRealtimeStatus: (status) => {
    set({ realtimeStatus: status });
  },

  updateProduct: async (productId, updateData) => {
    // OPTIMISTIC UPDATE: Update UI immediately without loading state
    set(state => ({
      items: state.items.map(item =>
        item.id === productId ? { ...item, ...updateData } : item
      ),
      selectedItem: state.selectedItem?.id === productId
        ? { ...state.selectedItem, ...updateData }
        : state.selectedItem,
      error: null,
    }));

    try {
      // Make API call in background
      const { productApi } = await import('../utils/api');
      await productApi.update(productId, updateData);
      await get().syncAfterMutation();
    } catch (error) {
      // Revert optimistic update on error by fetching fresh data
      get().fetchInventory();

      const errorMessage = error instanceof Error ? error.message : 'Failed to update product';
      set({ error: errorMessage });

      useToastStore.getState().addToast({
        message: errorMessage,
        type: 'error',
      });
      
      throw error; // Re-throw to let the component handle the error
    }
  },

  updateProductStock: async (productId, stockLevel) => {
    // OPTIMISTIC UPDATE: Update UI immediately without loading state
    set(state => ({
      items: state.items.map(item =>
        item.id === productId ? { ...item, stockLevel } : item
      ),
      selectedItem: state.selectedItem?.id === productId
        ? { ...state.selectedItem, stockLevel }
        : state.selectedItem,
      error: null,
    }));

    try {
      // Make API call in background
      const { productApi } = await import('../utils/api');
      await productApi.update(productId, { stockLevel });

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Stock level updated successfully',
        type: 'success',
      });

      await get().syncAfterMutation();
    } catch (error) {
      // Revert optimistic update on error
      const { items } = get();
      const originalItem = items.find(item => item.id === productId);
      if (originalItem) {
        // We need to revert to the original value, but we don't have it
        // So we'll fetch fresh data instead
        get().fetchInventory();
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to update stock level';
      set({ error: errorMessage });

      useToastStore.getState().addToast({
        message: errorMessage,
        type: 'error',
      });
      
      throw error; // Re-throw to let the component handle the error
    }
  },

  updateProductLocation: async (productId, _location, locationId) => {
    set({ loading: true, error: null });

    try {
      // Use productApi to update the location
      const { productApi } = await import('../utils/api');
      await productApi.update(productId, { locationId: locationId ?? null });

      // Update local state
      set(state => ({
        items: state.items.map(item =>
          item.id === productId ? { ...item, locationId: locationId ?? null } : item
        ),
        selectedItem: state.selectedItem?.id === productId
          ? { ...state.selectedItem, locationId: locationId ?? null }
          : state.selectedItem,
        loading: false,
      }));

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Location updated successfully',
        type: 'success',
      });

      await get().syncAfterMutation();
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

  syncAfterMutation: async () => {
    // Clear pending requests to force fresh fetch after mutations
    globalRequestDeduplicator.clear();
    await runInventoryRefresh();
  },
  };
});
