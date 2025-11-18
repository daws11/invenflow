import { create } from 'zustand';
import type { MovementLog, CreateMovement, MovementStats, Location, InventoryItem, Person } from '@invenflow/shared';
import { api } from '../utils/api';
import { useToastStore } from './toastStore';

// Enriched movement log from API with related data
export interface EnrichedMovementLog extends MovementLog {
  product?: InventoryItem | null;
  fromLocation?: Location | null;
  toLocation?: Location | null;
  fromPerson?: Person | null;
  toPerson?: Person | null;
}

// Type alias for the stats response
export type MovementStatsResponse = MovementStats;

interface MovementFilters {
  productId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

type ImmediateMovementResponse = {
  kind: 'immediate';
  movementLog: MovementLog;
  product: InventoryItem;
  status?: 'received';
};

type PendingMovementResponse = {
  kind?: 'pending';
  movementLog: MovementLog;
  status: 'pending';
  publicToken: string;
  publicUrl?: string;
  tokenExpiresAt?: string;
};

type MovementCreateResponse = ImmediateMovementResponse | PendingMovementResponse;

interface MovementState {
  movements: EnrichedMovementLog[];
  stats: MovementStats | null;
  loading: boolean;
  error: string | null;
  filters: MovementFilters;
  
  // Actions
  fetchMovements: () => Promise<void>;
  fetchMovementHistory: (productId: string) => Promise<EnrichedMovementLog[]>;
  createMovement: (movement: CreateMovement) => Promise<MovementCreateResponse>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<MovementFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useMovementStore = create<MovementState>((set, get) => ({
  movements: [],
  stats: null,
  loading: false,
  error: null,
  filters: {
    limit: 50,
    offset: 0,
  },

  fetchMovements: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await api.get(`/api/movements?${params.toString()}`);
      set({ movements: response.data, loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch movements';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addErrorToast(errorMessage);
    }
  },

  fetchMovementHistory: async (productId: string) => {
    try {
      const response = await api.get(`/api/movements/product/${productId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch movement history';
      useToastStore.getState().addErrorToast(errorMessage);
      throw error;
    }
  },

  createMovement: async (movement: CreateMovement) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/movements', movement);
      const data = response.data as MovementCreateResponse;
      
      // Refresh movements list
      await get().fetchMovements();
      
      const successMessage =
        (data as any)?.status === 'pending'
          ? 'Movement confirmation link created'
          : 'Product moved successfully';
      useToastStore.getState().addSuccessToast(successMessage);
      set({ loading: false });
      
      return data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to move product';
      set({ error: errorMessage, loading: false });
      useToastStore.getState().addErrorToast(errorMessage);
      throw error;
    }
  },

  fetchStats: async () => {
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/api/movements/stats?${params.toString()}`);
      set({ stats: response.data });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch movement statistics';
      useToastStore.getState().addErrorToast(errorMessage);
    }
  },

  setFilters: (newFilters: Partial<MovementFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Auto-fetch when filters change
    get().fetchMovements();
  },

  clearFilters: () => {
    set({
      filters: {
        limit: 50,
        offset: 0,
      },
    });
    get().fetchMovements();
  },

  clearError: () => set({ error: null }),
}));

