import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) }
      ]
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    })),
  clearToasts: () => set({ toasts: [] })
}));

// Convenience functions for common toast types
export const useToast = () => {
  const { addToast } = useToastStore();

  return {
    success: (message: string, duration?: number) =>
      addToast({ message, type: 'success', duration }),
    error: (message: string, duration?: number) =>
      addToast({ message, type: 'error', duration }),
    warning: (message: string, duration?: number) =>
      addToast({ message, type: 'warning', duration }),
    info: (message: string, duration?: number) =>
      addToast({ message, type: 'info', duration })
  };
};