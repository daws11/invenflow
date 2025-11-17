import { create } from 'zustand';
import {
  ProductGroupWithDetails,
  CreateProductGroup,
  UpdateProductGroup,
  AddProductsToGroup,
  RemoveProductsFromGroup,
} from '@invenflow/shared';
import { productGroupApi } from '../utils/productGroupApi';

interface ProductGroupState {
  groups: ProductGroupWithDetails[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchGroupsByKanban: (kanbanId: string) => Promise<void>;
  createGroup: (data: CreateProductGroup) => Promise<ProductGroupWithDetails>;
  updateGroup: (id: string, data: UpdateProductGroup) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addProductsToGroup: (groupId: string, data: AddProductsToGroup) => Promise<void>;
  removeProductsFromGroup: (groupId: string, data: RemoveProductsFromGroup) => Promise<void>;
  clearError: () => void;
}

export const useProductGroupStore = create<ProductGroupState>((set, _get) => ({
  groups: [],
  loading: false,
  error: null,

  fetchGroupsByKanban: async (_kanbanId: string) => {
    set({ loading: true, error: null });
    try {
      // For now, groups will be fetched as part of kanban data
      // This is a placeholder for future dedicated endpoint
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch product groups',
        loading: false,
      });
    }
  },

  createGroup: async (data: CreateProductGroup) => {
    set({ loading: true, error: null });
    try {
      const newGroup = await productGroupApi.create(data);
      set((state) => ({
        groups: [...state.groups, newGroup],
        loading: false,
      }));
      return newGroup;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create product group',
        loading: false,
      });
      throw error;
    }
  },

  updateGroup: async (id: string, data: UpdateProductGroup) => {
    set({ loading: true, error: null });
    try {
      await productGroupApi.update(id, data);
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === id ? { ...g, ...data } : g
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update product group',
        loading: false,
      });
      throw error;
    }
  },

  deleteGroup: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await productGroupApi.delete(id);
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete product group',
        loading: false,
      });
      throw error;
    }
  },

  addProductsToGroup: async (groupId: string, data: AddProductsToGroup) => {
    set({ loading: true, error: null });
    try {
      await productGroupApi.addProducts(groupId, data);
      // Refresh the group data
      const updatedGroup = await productGroupApi.getById(groupId);
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? updatedGroup : g
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add products to group',
        loading: false,
      });
      throw error;
    }
  },

  removeProductsFromGroup: async (groupId: string, data: RemoveProductsFromGroup) => {
    set({ loading: true, error: null });
    try {
      await productGroupApi.removeProducts(groupId, data);
      // Refresh the group data
      const updatedGroup = await productGroupApi.getById(groupId);
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? updatedGroup : g
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove products from group',
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

