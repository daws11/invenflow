import { useEffect } from 'react';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface UseKanbanKeyboardShortcutsProps {
  onAddProduct: () => void;
  onToggleFilters: () => void;
  onToggleSettings: () => void;
  onToggleView: () => void;
  onFocusSearch: () => void;
}

export function useKanbanKeyboardShortcuts({
  onAddProduct,
  onToggleFilters,
  onToggleSettings,
  onToggleView,
  onFocusSearch,
}: UseKanbanKeyboardShortcutsProps) {
  const { 
    resetFilters, 
    setCreatedPreset, 
    createdPreset,
    setPriorityFilter,
    priorityFilter,
  } = useViewPreferencesStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const isInputFocused = 
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if (isInputFocused && !event.metaKey && !event.ctrlKey) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Global shortcuts (with Cmd/Ctrl)
      if (modifierKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            onFocusSearch();
            break;
          case 'n':
            event.preventDefault();
            onAddProduct();
            break;
          case 'f':
            event.preventDefault();
            onToggleFilters();
            break;
          case ',':
            event.preventDefault();
            onToggleSettings();
            break;
          case 'r':
            event.preventDefault();
            resetFilters();
            break;
          case 'v':
            event.preventDefault();
            onToggleView();
            break;
        }
      }
      
      // Quick filter shortcuts (without modifier keys)
      if (!modifierKey && !event.shiftKey && !event.altKey) {
        switch (event.key) {
          case '1':
            if (!isInputFocused) {
              event.preventDefault();
              setCreatedPreset(createdPreset === '7d' ? null : '7d');
            }
            break;
          case '2':
            if (!isInputFocused) {
              event.preventDefault();
              setCreatedPreset(createdPreset === '30d' ? null : '30d');
            }
            break;
          case '3':
            if (!isInputFocused) {
              event.preventDefault();
              setCreatedPreset(createdPreset === '90d' ? null : '90d');
            }
            break;
          case 'u':
            if (!isInputFocused) {
              event.preventDefault();
              const hasUrgent = priorityFilter.includes('Urgent');
              if (hasUrgent) {
                setPriorityFilter(priorityFilter.filter(p => p !== 'Urgent'));
              } else {
                setPriorityFilter([...priorityFilter, 'Urgent']);
              }
            }
            break;
          case 'h':
            if (!isInputFocused) {
              event.preventDefault();
              const hasHigh = priorityFilter.includes('High');
              if (hasHigh) {
                setPriorityFilter(priorityFilter.filter(p => p !== 'High'));
              } else {
                setPriorityFilter([...priorityFilter, 'High']);
              }
            }
            break;
          case 'Escape':
            event.preventDefault();
            resetFilters();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onAddProduct,
    onToggleFilters,
    onToggleSettings,
    onToggleView,
    onFocusSearch,
    resetFilters,
    setCreatedPreset,
    createdPreset,
    setPriorityFilter,
    priorityFilter,
  ]);

  // Return the keyboard shortcuts for display in help/tooltip
  return {
    shortcuts: [
      { key: 'Cmd/Ctrl + K', description: 'Focus search' },
      { key: 'Cmd/Ctrl + N', description: 'Add new product' },
      { key: 'Cmd/Ctrl + F', description: 'Toggle filters' },
      { key: 'Cmd/Ctrl + ,', description: 'Open settings' },
      { key: 'Cmd/Ctrl + R', description: 'Reset all filters' },
      { key: 'Cmd/Ctrl + V', description: 'Toggle view mode' },
      { key: '1', description: 'Toggle 7-day filter' },
      { key: '2', description: 'Toggle 30-day filter' },
      { key: '3', description: 'Toggle 90-day filter' },
      { key: 'U', description: 'Toggle urgent priority' },
      { key: 'H', description: 'Toggle high priority' },
      { key: 'Escape', description: 'Reset all filters' },
    ],
  };
}
