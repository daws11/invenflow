import { create } from 'zustand';
import { StoredLogWithRelations, StoredLogFilters } from '@invenflow/shared';
import { storedLogApi } from '../utils/api';

interface StoredLogState {
  items: StoredLogWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  fetchLogs: (params?: Partial<StoredLogFilters>) => Promise<void>;
}

export const useStoredLogStore = create<StoredLogState>((set) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  loading: false,
  error: null,
  fetchLogs: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await storedLogApi.list(params);
      set({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stored logs',
        loading: false,
      });
    }
  },
}));

