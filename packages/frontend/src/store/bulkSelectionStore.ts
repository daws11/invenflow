import { create } from 'zustand';
import { Product } from '@invenflow/shared';

interface BulkSelectionState {
  selectedProductIds: Set<string>;
  
  // Actions
  toggleSelection: (productId: string) => void;
  selectAll: (productIds: string[]) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  getSelectedColumn: (products: Product[]) => string | null;
  isSelected: (productId: string) => boolean;
}

export const useBulkSelectionStore = create<BulkSelectionState>((set, get) => ({
  selectedProductIds: new Set<string>(),

  toggleSelection: (productId: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedProductIds);
      if (newSelected.has(productId)) {
        newSelected.delete(productId);
      } else {
        newSelected.add(productId);
      }
      return { selectedProductIds: newSelected };
    });
  },

  selectAll: (productIds: string[]) => {
    set({ selectedProductIds: new Set(productIds) });
  },

  clearSelection: () => {
    set({ selectedProductIds: new Set<string>() });
  },

  getSelectedCount: () => {
    return get().selectedProductIds.size;
  },

  getSelectedColumn: (products: Product[]) => {
    const selectedIds = get().selectedProductIds;
    if (selectedIds.size === 0) return null;

    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return null;

    // Check if all selected products are in the same column
    const firstColumn = selectedProducts[0].columnStatus;
    const allSameColumn = selectedProducts.every(p => p.columnStatus === firstColumn);

    return allSameColumn ? firstColumn : null;
  },

  isSelected: (productId: string) => {
    return get().selectedProductIds.has(productId);
  },
}));

