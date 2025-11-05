import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type KanbanBoardViewMode = 'board' | 'compact';
type KanbanListViewMode = 'grid' | 'compact';

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
    }),
    {
      name: 'view-preferences-storage',
    }
  )
);

