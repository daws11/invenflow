import { useCallback, useRef, useState } from 'react';
import { useToast } from '../store/toastStore';

interface AutoSaveOptions {
  delay?: number; // Delay in milliseconds before auto-save triggers
  enabled?: boolean; // Whether auto-save is enabled
  onSave: (value: any) => Promise<void>;
  onError?: (error: Error) => void;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export function useAutoSave({
  delay = 2000,
  enabled = true,
  onSave,
  onError,
}: AutoSaveOptions) {
  const { error: showError } = useToast();
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<any>(null);

  const clearSaveTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const save = useCallback(async (value: any) => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(value);
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null,
      }));
      lastValueRef.current = value;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Auto-save failed';
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      } else {
        showError(`Auto-save failed: ${errorMessage}`);
      }
    }
  }, [enabled, onSave, onError, showError]);

  const scheduleAutoSave = useCallback((value: any) => {
    if (!enabled) return;

    // Don't auto-save if value hasn't changed
    if (lastValueRef.current === value) return;

    clearSaveTimeout();
    
    setState(prev => ({ ...prev, hasUnsavedChanges: true, error: null }));

    timeoutRef.current = setTimeout(() => {
      save(value);
    }, delay);
  }, [enabled, delay, save, clearTimeout]);

  const saveNow = useCallback((value: any) => {
    clearSaveTimeout();
    return save(value);
  }, [save, clearTimeout]);

  const reset = useCallback(() => {
    clearSaveTimeout();
    setState({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      error: null,
    });
    lastValueRef.current = null;
  }, [clearTimeout]);

  return {
    ...state,
    scheduleAutoSave,
    saveNow,
    reset,
  };
}
