import { create } from 'zustand';
import { Kanban, Product, CreateKanban, CreateProduct, LinkedReceiveKanban } from '@invenflow/shared';
import { kanbanApi, productApi, ProductMoveResponse } from '../utils/api';

interface KanbanState {
  kanbans: Kanban[];
  currentKanban: (Kanban & { products: Product[]; linkedKanbans?: LinkedReceiveKanban[] }) | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchKanbans: () => Promise<void>;
  fetchKanbanById: (id: string) => Promise<void>;
  createKanban: (data: CreateKanban) => Promise<Kanban>;
  updateKanban: (id: string, data: Partial<Kanban>) => Promise<void>;
  togglePublicForm: (id: string, enabled: boolean) => Promise<void>;
  deleteKanban: (id: string) => Promise<void>;

  // Kanban links
  addKanbanLink: (orderKanbanId: string, receiveKanbanId: string) => Promise<void>;
  removeKanbanLink: (orderKanbanId: string, linkId: string) => Promise<void>;

  createProduct: (data: CreateProduct) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  moveProduct: (id: string, columnStatus: string, locationId?: string, skipValidation?: boolean) => Promise<ProductMoveResponse | undefined>;
  transferProduct: (id: string, targetKanbanId: string) => Promise<void>;
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

  togglePublicForm: async (id: string, enabled: boolean) => {
    set({ loading: true, error: null });
    try {
      const updatedKanban = await kanbanApi.updatePublicFormSettings(id, { isPublicFormEnabled: enabled });
      set(state => ({
        kanbans: state.kanbans.map(k => k.id === id ? updatedKanban : k),
        currentKanban: state.currentKanban?.id === id
          ? { ...state.currentKanban, isPublicFormEnabled: enabled }
          : state.currentKanban,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update public form settings',
        loading: false
      });
      throw error;
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
    // OPTIMISTIC UPDATE: Update UI immediately without loading state
    set(state => ({
      currentKanban: state.currentKanban
        ? {
            ...state.currentKanban,
            products: state.currentKanban.products.map(p =>
              p.id === id ? { ...p, ...data } : p
            )
          }
        : null,
      error: null
    }));

    try {
      // Make API call in background
      await productApi.update(id, data);
    } catch (error) {
      // Revert optimistic update on error by refreshing kanban
      get().refreshCurrentKanban();
      
      set({
        error: error instanceof Error ? error.message : 'Failed to update product',
      });
      
      throw error; // Re-throw to let the component handle the error
    }
  },

  moveProduct: async (id: string, columnStatus: string, locationId?: string, skipValidation?: boolean) => {
    const { currentKanban } = get();
    if (!currentKanban) return;
    
    // Find the product to move
    const productToMove = currentKanban.products.find(p => p.id === id);
    if (!productToMove) return;
    
    // Store previous state for rollback
    const previousProducts = currentKanban.products;
    
    // OPTIMISTIC UPDATE: Update UI immediately
    set(state => ({
      currentKanban: state.currentKanban
        ? {
            ...state.currentKanban,
              products: state.currentKanban.products.map(p =>
                p.id === id 
                ? { ...p, columnStatus, columnEnteredAt: new Date() as unknown as Date }
                : p
            )
          }
        : null,
      error: null
    }));
    
    try {
      // Make API call in background
      const response = await productApi.move(id, columnStatus, locationId, skipValidation);
      
      // Update with server response
      if (currentKanban && response.kanbanId !== currentKanban.id) {
        // Product transferred to another kanban
        set(state => ({
          currentKanban: state.currentKanban
            ? {
                ...state.currentKanban,
                products: state.currentKanban.products.filter(p => p.id !== id)
              }
            : null
        }));
      } else {
        // Update with actual server data
        set(state => ({
          currentKanban: state.currentKanban
            ? {
                ...state.currentKanban,
                products: state.currentKanban.products.map(p =>
                  p.id === id ? response : p
                )
              }
            : null
        }));
      }
      
      // Return the response so caller can access transferInfo
      return response;
    } catch (error) {
      // ROLLBACK: Revert to previous state on error
      set(state => ({
        currentKanban: state.currentKanban
          ? {
              ...state.currentKanban,
              products: previousProducts
            }
          : null
      }));
      
      // Re-throw error for component to handle validation
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

  transferProduct: async (id: string, targetKanbanId: string) => {
    const { currentKanban } = get();
    if (!currentKanban) return;
    
    // Find the product to transfer
    const productToTransfer = currentKanban.products.find(p => p.id === id);
    if (!productToTransfer) return;
    
    // Store previous state for rollback
    const previousProducts = currentKanban.products;
    
    // OPTIMISTIC UPDATE: Remove product from current kanban immediately
    set(state => ({
      currentKanban: state.currentKanban
        ? {
            ...state.currentKanban,
            products: state.currentKanban.products.filter(p => p.id !== id)
          }
        : null,
      error: null
    }));
    
    try {
      // Make API call to transfer
      await productApi.transfer(id, targetKanbanId);
      // Product successfully transferred - already removed from UI
    } catch (error) {
      // ROLLBACK: Restore product on error
      set(state => ({
        currentKanban: state.currentKanban
          ? {
              ...state.currentKanban,
              products: previousProducts
            }
          : null,
        error: error instanceof Error ? error.message : 'Failed to transfer product'
      }));
      throw error;
    }
  },

  addKanbanLink: async (orderKanbanId: string, receiveKanbanId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedLinks = await kanbanApi.addLink(orderKanbanId, receiveKanbanId);
      set(state => ({
        currentKanban: state.currentKanban?.id === orderKanbanId
          ? {
              ...state.currentKanban,
              linkedKanbans: updatedLinks
            }
          : state.currentKanban,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add kanban link',
        loading: false
      });
      throw error;
    }
  },

  removeKanbanLink: async (orderKanbanId: string, linkId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedLinks = await kanbanApi.removeLink(orderKanbanId, linkId);
      set(state => ({
        currentKanban: state.currentKanban?.id === orderKanbanId
          ? {
              ...state.currentKanban,
              linkedKanbans: updatedLinks
            }
          : state.currentKanban,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove kanban link',
        loading: false
      });
      throw error;
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