import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number;
}

interface ToastStore {
  toasts: Toast[];
  maxToasts: number;
  pausedToasts: Set<string>;

  // Queue management
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;

  // Progress tracking for async operations
  updateToastProgress: (id: string, progress: number) => void;

  // Batch operations
  addSuccessToast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  addErrorToast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  addWarningToast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  addInfoToast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  maxToasts: 5,
  pausedToasts: new Set(),

  addToast: (toast) => {
    const state = get();
    const newToast = {
      ...toast,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      duration: toast.duration ?? (toast.type === 'error' ? 5000 : 3000),
    };

    set((prevState) => {
      const updatedToasts = [...prevState.toasts];

      // Remove oldest toast if we exceed maxToasts
      if (updatedToasts.length >= state.maxToasts) {
        updatedToasts.shift();
      }

      return {
        toasts: [...updatedToasts, newToast]
      };
    });

    return newToast.id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
      pausedToasts: new Set([...state.pausedToasts].filter(pId => pId !== id))
    })),

  clearToasts: () => set({ toasts: [], pausedToasts: new Set() }),

  pauseToast: (id) =>
    set((state) => ({
      pausedToasts: new Set([...state.pausedToasts, id])
    })),

  resumeToast: (id) =>
    set((state) => {
      const newPausedToasts = new Set(state.pausedToasts);
      newPausedToasts.delete(id);
      return { pausedToasts: newPausedToasts };
    }),

  updateToastProgress: (id, progress) =>
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, progress } : toast
      )
    })),

  // Batch operations
  addSuccessToast: (message, options = {}) => {
    const { addToast } = get();
    return addToast({ message, type: 'success', ...options });
  },

  addErrorToast: (message, options = {}) => {
    const { addToast } = get();
    return addToast({ message, type: 'error', persistent: true, ...options });
  },

  addWarningToast: (message, options = {}) => {
    const { addToast } = get();
    return addToast({ message, type: 'warning', ...options });
  },

  addInfoToast: (message, options = {}) => {
    const { addToast } = get();
    return addToast({ message, type: 'info', ...options });
  },
}));

// Enhanced convenience functions
export const useToast = () => {
  const store = useToastStore();

  return {
    success: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) =>
      store.addSuccessToast(message, options),

    error: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) =>
      store.addErrorToast(message, options),

    warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) =>
      store.addWarningToast(message, options),

    info: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) =>
      store.addInfoToast(message, options),

    // Async operation helpers
    loading: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
      const id = store.addToast({
        message,
        type: 'info',
        persistent: true,
        duration: 0,
        ...options
      });

      return {
        updateProgress: (progress: number) => store.updateToastProgress(id, progress),
        success: (successMessage: string) => {
          store.removeToast(id);
          store.addSuccessToast(successMessage);
        },
        error: (errorMessage: string) => {
          store.removeToast(id);
          store.addErrorToast(errorMessage);
        }
      };
    },

    // Queue management
    clear: () => store.clearToasts(),
    remove: (id: string) => store.removeToast(id),
  };
};