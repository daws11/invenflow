import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type KanbanBoardViewMode = 'board' | 'compact';
type KanbanListViewMode = 'grid' | 'compact';

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: {
    supplierFilter?: string | null;
    categoryFilter?: string[];
    priorityFilter?: string[];
    locationFilter?: string[];
    tagFilter?: string[];
    stockLevelMin?: number | null;
    stockLevelMax?: number | null;
    priceMin?: number | null;
    priceMax?: number | null;
    createdFrom?: string | null;
    createdTo?: string | null;
    createdPreset?: '7d' | '30d' | '90d' | null;
    updatedFrom?: string | null;
    updatedTo?: string | null;
    updatedPreset?: '7d' | '30d' | '90d' | null;
  };
  createdAt: string;
}

interface ViewPreferencesState {
  kanbanBoardViewMode: KanbanBoardViewMode;
  kanbanListViewMode: KanbanListViewMode;
  collapsedColumns: Record<string, boolean>; // Track collapsed state of columns in compact view
  collapsedKanbans: Record<string, boolean>; // Track collapsed state of kanbans in list compact view

  // Actions
  setKanbanBoardViewMode: (mode: KanbanBoardViewMode) => void;
  setKanbanListViewMode: (mode: KanbanListViewMode) => void;
  toggleColumnCollapsed: (kanbanId: string, columnId: string) => void;
  toggleKanbanCollapsed: (kanbanId: string) => void;
  isColumnCollapsed: (kanbanId: string, columnId: string) => boolean;
  isKanbanCollapsed: (kanbanId: string) => boolean;

  // Enhanced Filters
  supplierFilter: string | null;
  categoryFilter: string[]; // multi
  priorityFilter: string[]; // multi
  locationFilter: string[]; // multi - new
  tagFilter: string[]; // multi - new
  stockLevelMin: number | null; // new
  stockLevelMax: number | null; // new
  priceMin: number | null; // new
  priceMax: number | null; // new
  createdFrom: string | null;
  createdTo: string | null;
  createdPreset: '7d' | '30d' | '90d' | null; // enhanced
  updatedFrom: string | null;
  updatedTo: string | null;
  updatedPreset: '7d' | '30d' | '90d' | null; // enhanced

  // Filter Presets
  filterPresets: FilterPreset[];
  activePresetId: string | null;

  // Enhanced Filter actions
  setSupplierFilter: (supplier: string | null) => void;
  setCategoryFilter: (categories: string[]) => void;
  setPriorityFilter: (priorities: string[]) => void;
  setLocationFilter: (locations: string[]) => void; // new
  setTagFilter: (tags: string[]) => void; // new
  setStockLevelRange: (min: number | null, max: number | null) => void; // new
  setPriceRange: (min: number | null, max: number | null) => void; // new
  setCreatedRange: (from: string | null, to: string | null) => void;
  setCreatedPreset: (preset: '7d' | '30d' | '90d' | null) => void; // enhanced
  setUpdatedRange: (from: string | null, to: string | null) => void;
  setUpdatedPreset: (preset: '7d' | '30d' | '90d' | null) => void; // enhanced
  resetFilters: () => void;

  // Filter Preset actions
  saveFilterPreset: (name: string, description?: string) => void;
  loadFilterPreset: (presetId: string) => void;
  deleteFilterPreset: (presetId: string) => void;
  updateFilterPreset: (presetId: string, updates: Partial<FilterPreset>) => void;
  clearActivePreset: () => void;
  
  // Quick filter helpers
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;
}

export const useViewPreferencesStore = create<ViewPreferencesState>()(
  persist(
    (set, get) => ({
      kanbanBoardViewMode: 'board',
      kanbanListViewMode: 'grid',
      collapsedColumns: {},
      collapsedKanbans: {},

      setKanbanBoardViewMode: (mode: KanbanBoardViewMode) => {
        set({ kanbanBoardViewMode: mode });
      },

      setKanbanListViewMode: (mode: KanbanListViewMode) => {
        set({ kanbanListViewMode: mode });
      },

      toggleColumnCollapsed: (kanbanId: string, columnId: string) => {
        const key = `${kanbanId}-${columnId}`;
        set((state) => ({
          collapsedColumns: {
            ...state.collapsedColumns,
            [key]: !state.collapsedColumns[key],
          },
        }));
      },

      toggleKanbanCollapsed: (kanbanId: string) => {
        set((state) => ({
          collapsedKanbans: {
            ...state.collapsedKanbans,
            [kanbanId]: !state.collapsedKanbans[kanbanId],
          },
        }));
      },

      isColumnCollapsed: (kanbanId: string, columnId: string) => {
        const key = `${kanbanId}-${columnId}`;
        return get().collapsedColumns[key] || false;
      },

      isKanbanCollapsed: (kanbanId: string) => {
        return get().collapsedKanbans[kanbanId] || false;
      },

      // Enhanced Filters defaults
      supplierFilter: null,
      categoryFilter: [],
      priorityFilter: [],
      locationFilter: [],
      tagFilter: [],
      stockLevelMin: null,
      stockLevelMax: null,
      priceMin: null,
      priceMax: null,
      createdFrom: null,
      createdTo: null,
      createdPreset: null,
      updatedFrom: null,
      updatedTo: null,
      updatedPreset: null,

      // Filter Presets
      filterPresets: [],
      activePresetId: null,

      // Enhanced Filter actions
      setSupplierFilter: (supplier: string | null) => {
        set({ supplierFilter: supplier, activePresetId: null });
      },
      setCategoryFilter: (categories: string[]) => {
        set({ categoryFilter: categories, activePresetId: null });
      },
      setPriorityFilter: (priorities: string[]) => {
        set({ priorityFilter: priorities, activePresetId: null });
      },
      setLocationFilter: (locations: string[]) => {
        set({ locationFilter: locations, activePresetId: null });
      },
      setTagFilter: (tags: string[]) => {
        set({ tagFilter: tags, activePresetId: null });
      },
      setStockLevelRange: (min: number | null, max: number | null) => {
        set({ stockLevelMin: min, stockLevelMax: max, activePresetId: null });
      },
      setPriceRange: (min: number | null, max: number | null) => {
        set({ priceMin: min, priceMax: max, activePresetId: null });
      },
      setCreatedRange: (from: string | null, to: string | null) => {
        set({ createdFrom: from, createdTo: to, activePresetId: null });
      },
      setCreatedPreset: (preset: '7d' | '30d' | '90d' | null) => {
        set({ createdPreset: preset, activePresetId: null });
      },
      setUpdatedRange: (from: string | null, to: string | null) => {
        set({ updatedFrom: from, updatedTo: to, activePresetId: null });
      },
      setUpdatedPreset: (preset: '7d' | '30d' | '90d' | null) => {
        set({ updatedPreset: preset, activePresetId: null });
      },
      resetFilters: () => set({
        supplierFilter: null,
        categoryFilter: [],
        priorityFilter: [],
        locationFilter: [],
        tagFilter: [],
        stockLevelMin: null,
        stockLevelMax: null,
        priceMin: null,
        priceMax: null,
        createdFrom: null,
        createdTo: null,
        createdPreset: null,
        updatedFrom: null,
        updatedTo: null,
        updatedPreset: null,
        activePresetId: null,
      }),

      // Filter Preset actions
      saveFilterPreset: (name: string, description?: string) => {
        const state = get();
        const preset: FilterPreset = {
          id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description,
          filters: {
            supplierFilter: state.supplierFilter,
            categoryFilter: state.categoryFilter,
            priorityFilter: state.priorityFilter,
            locationFilter: state.locationFilter,
            tagFilter: state.tagFilter,
            stockLevelMin: state.stockLevelMin,
            stockLevelMax: state.stockLevelMax,
            priceMin: state.priceMin,
            priceMax: state.priceMax,
            createdFrom: state.createdFrom,
            createdTo: state.createdTo,
            createdPreset: state.createdPreset,
            updatedFrom: state.updatedFrom,
            updatedTo: state.updatedTo,
            updatedPreset: state.updatedPreset,
          },
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          filterPresets: [...state.filterPresets, preset],
          activePresetId: preset.id,
        }));
      },

      loadFilterPreset: (presetId: string) => {
        const state = get();
        const preset = state.filterPresets.find(p => p.id === presetId);
        if (preset) {
          set({
            supplierFilter: preset.filters.supplierFilter || null,
            categoryFilter: preset.filters.categoryFilter || [],
            priorityFilter: preset.filters.priorityFilter || [],
            locationFilter: preset.filters.locationFilter || [],
            tagFilter: preset.filters.tagFilter || [],
            stockLevelMin: preset.filters.stockLevelMin || null,
            stockLevelMax: preset.filters.stockLevelMax || null,
            priceMin: preset.filters.priceMin || null,
            priceMax: preset.filters.priceMax || null,
            createdFrom: preset.filters.createdFrom || null,
            createdTo: preset.filters.createdTo || null,
            createdPreset: preset.filters.createdPreset || null,
            updatedFrom: preset.filters.updatedFrom || null,
            updatedTo: preset.filters.updatedTo || null,
            updatedPreset: preset.filters.updatedPreset || null,
            activePresetId: presetId,
          });
        }
      },

      deleteFilterPreset: (presetId: string) => {
        set((state) => ({
          filterPresets: state.filterPresets.filter(p => p.id !== presetId),
          activePresetId: state.activePresetId === presetId ? null : state.activePresetId,
        }));
      },

      updateFilterPreset: (presetId: string, updates: Partial<FilterPreset>) => {
        set((state) => ({
          filterPresets: state.filterPresets.map(p =>
            p.id === presetId ? { ...p, ...updates } : p
          ),
        }));
      },

      clearActivePreset: () => {
        set({ activePresetId: null });
      },

      // Quick filter helpers
      hasActiveFilters: () => {
        const state = get();
        return !!(
          state.supplierFilter ||
          state.categoryFilter.length > 0 ||
          state.priorityFilter.length > 0 ||
          state.locationFilter.length > 0 ||
          state.tagFilter.length > 0 ||
          state.stockLevelMin !== null ||
          state.stockLevelMax !== null ||
          state.priceMin !== null ||
          state.priceMax !== null ||
          state.createdFrom ||
          state.createdTo ||
          state.createdPreset ||
          state.updatedFrom ||
          state.updatedTo ||
          state.updatedPreset
        );
      },

      getActiveFilterCount: () => {
        const state = get();
        let count = 0;
        if (state.supplierFilter) count++;
        if (state.categoryFilter.length > 0) count++;
        if (state.priorityFilter.length > 0) count++;
        if (state.locationFilter.length > 0) count++;
        if (state.tagFilter.length > 0) count++;
        if (state.stockLevelMin !== null || state.stockLevelMax !== null) count++;
        if (state.priceMin !== null || state.priceMax !== null) count++;
        if (state.createdFrom || state.createdTo || state.createdPreset) count++;
        if (state.updatedFrom || state.updatedTo || state.updatedPreset) count++;
        return count;
      },
    }),
    {
      name: 'view-preferences-storage',
    }
  )
);

