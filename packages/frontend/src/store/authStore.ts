import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Login } from '@invenflow/shared';
import { authApi } from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: Login) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      isAuthenticated: false,

      login: async (credentials: Login) => {
        try {
          set({ loading: true, error: null });

          const response = await authApi.login(credentials);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });

          // Store token in localStorage for API calls
          if (response.token) {
            localStorage.setItem('auth_token', response.token);
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Login failed',
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      logout: () => {
        // Remove token from localStorage
        localStorage.removeItem('auth_token');

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          loading: false,
        });
      },

      fetchCurrentUser: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            set({ isAuthenticated: false });
            return;
          }

          set({ loading: true, error: null });

          const user = await authApi.getCurrentUser();

          set({
            user: user,
            token: token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          // Token is invalid or expired
          localStorage.removeItem('auth_token');
          set({
            loading: false,
            error: null,
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading: boolean) => set({ loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);