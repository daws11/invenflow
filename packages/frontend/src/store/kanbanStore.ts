import { create } from 'zustand';
import { Kanban, Product, CreateKanban, CreateProduct } from '@invenflow/shared';
import { kanbanApi, productApi } from '../utils/api';

interface KanbanState {
  kanbans: Kanban[];
  currentKanban: (Kanban & { products: Product[] }) | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchKanbans: () => Promise<void>;
  fetchKanbanById: (id: string) => Promise<void>;
  createKanban: (data: CreateKanban) => Promise<Kanban>;
  updateKanban: (id: string, data: Partial<Kanban>) => Promise<void>;
  deleteKanban: (id: string) => Promise<void>;

  createProduct: (data: CreateProduct) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  moveProduct: (id: string, columnStatus: string, skipValidation?: boolean) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  refreshCurrentKanban: () => Promise<void>;
  clearError: () => void;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  kanbans: [],
  currentKanban: null,
  loading: false,
  error: null,

  fetchKanbans: async () => {
    set({ loading: true, error: null });
    try {
      const kanbans = await kanbanApi.getAll();
      set({ kanbans, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch kanbans',
        loading: false
      });
    }
  },

  fetchKanbanById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const kanban = await kanbanApi.getById(id);
      set({ currentKanban: kanban, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch kanban',
        loading: false
      });
    }
  },

  createKanban: async (data: CreateKanban) => {
    set({ loading: true, error: null });
    try {
      const newKanban = await kanbanApi.create(data);
      set(state => ({
        kanbans: [...state.kanbans, newKanban],
        loading: false
      }));
      return newKanban;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create kanban',
        loading: false
      });
      throw error;
    }
  },

  updateKanban: async (id: string, data: Partial<Kanban>) => {
    set({ loading: true, error: null });
    try {
      await kanbanApi.update(id, data);
      set(state => ({
        kanbans: state.kanbans.map(k => k.id === id ? { ...k, ...data } : k),
        currentKanban: state.currentKanban?.id === id
          ? { ...state.currentKanban, ...data }
          : state.currentKanban,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update kanban',
        loading: false
      });
    }
  },

  deleteKanban: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await kanbanApi.delete(id);
      set(state => ({
        kanbans: state.kanbans.filter(k => k.id !== id),
        currentKanban: state.currentKanban?.id === id ? null : state.currentKanban,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete kanban',
        loading: false
      });
    }
  },

  createProduct: async (data: CreateProduct) => {
    set({ loading: true, error: null });
    try {
      const newProduct = await productApi.create(data);
      const { currentKanban } = get();
      if (currentKanban && currentKanban.id === data.kanbanId) {
        set(state => ({
          currentKanban: state.currentKanban
            ? { ...state.currentKanban, products: [...state.currentKanban.products, newProduct] }
            : null,
          loading: false
        }));
      } else {
        set({ loading: false });
      }
      return newProduct;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create product',
        loading: false
      });
      throw error;
    }
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    set({ loading: true, error: null });
    try {
      await productApi.update(id, data);
      set(state => ({
        currentKanban: state.currentKanban
          ? {
              ...state.currentKanban,
              products: state.currentKanban.products.map(p =>
                p.id === id ? { ...p, ...data } : p
              )
            }
          : null,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update product',
        loading: false
      });
    }
  },

  moveProduct: async (id: string, columnStatus: string, skipValidation = false) => {
    set({ loading: true, error: null });
    try {
      const updatedProduct = await productApi.move(id, columnStatus, skipValidation);
      const { currentKanban } = get();

      // If product moved to a different kanban (auto-transfer), we need to refresh
      if (currentKanban && updatedProduct.kanbanId !== currentKanban.id) {
        // Product was transferred to another kanban
        set(state => ({
          currentKanban: state.currentKanban
            ? {
                ...state.currentKanban,
                products: state.currentKanban.products.filter(p => p.id !== id)
              }
            : null,
          loading: false
        }));
      } else if (currentKanban) {
        // Product moved within the same kanban
        set(state => ({
          currentKanban: state.currentKanban
            ? {
                ...state.currentKanban,
                products: state.currentKanban.products.map(p =>
                  p.id === id ? updatedProduct : p
                )
              }
            : null,
          loading: false
        }));
      } else {
        set({ loading: false });
      }
    } catch (error) {
      // Re-throw error to let component handle validation requirements
      set({ loading: false });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await productApi.delete(id);
      set(state => ({
        currentKanban: state.currentKanban
          ? {
              ...state.currentKanban,
              products: state.currentKanban.products.filter(p => p.id !== id)
            }
          : null,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete product',
        loading: false
      });
    }
  },

  refreshCurrentKanban: async () => {
    const { currentKanban } = get();
    if (currentKanban) {
      get().fetchKanbanById(currentKanban.id);
    }
  },

  clearError: () => set({ error: null }),
}));