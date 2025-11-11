import { useEffect } from 'react';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

/**
 * Initialize Kanban board view preference based on screen size for the current session.
 * - On small screens (<= 640px), default to 'compact' on first visit in a session.
 * - Do not override if already initialized in this tab/session.
 */
export function useResponsivePreference() {
  const { kanbanBoardViewMode, setKanbanBoardViewMode } = useViewPreferencesStore();

  useEffect(() => {
    try {
      const initializedKey = 'kanbanViewPrefInitialized';
      const alreadyInitialized = sessionStorage.getItem(initializedKey) === '1';
      if (!alreadyInitialized) {
        const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
        if (isSmall && kanbanBoardViewMode !== 'compact') {
          setKanbanBoardViewMode('compact');
        }
        sessionStorage.setItem(initializedKey, '1');
      }
    } catch {
      // no-op
    }
  }, [kanbanBoardViewMode, setKanbanBoardViewMode]);
}


