import axios from 'axios';
import {
  Kanban,
  Product,
  CreateKanban,
  CreateProduct,
  UpdateProduct,
  Location,
  CreateLocation,
  UpdateLocation,
  InventoryFilters,
  InventoryResponse,
  InventoryStats,
  GroupedInventoryResponse,
  User,
  CreateUser,
  UpdateUser,
  Login,
  AuthResponse,
  TransferLog,
  CreateBulkMovement,
  UpdateBulkMovement,
  ConfirmBulkMovement,
  BulkMovementFilters,
  BulkMovementListResponse,
  BulkMovementWithDetails,
  PublicBulkMovementResponse
} from '@invenflow/shared';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle both 401 (Unauthorized) and 403 (Forbidden) for token expiration
    // 401 is standard for expired/invalid tokens, 403 kept for backward compatibility
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Get store instance and call logout with redirect
      const logout = useAuthStore.getState().logout;
      logout(true); // Clear state and redirect to login
    }
    return Promise.reject(error);
  }
);

// Kanban API calls
export const kanbanApi = {
  getAll: async (): Promise<Kanban[]> => {
    const response = await api.get('/api/kanbans');
    return response.data;
  },

  getById: async (id: string): Promise<Kanban & { products: Product[] }> => {
    const response = await api.get(`/api/kanbans/${id}`);
    return response.data;
  },

  create: async (data: CreateKanban): Promise<Kanban> => {
    const response = await api.post('/api/kanbans', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Kanban>): Promise<Kanban> => {
    const response = await api.put(`/api/kanbans/${id}`, data);
    return response.data;
  },

  updatePublicFormSettings: async (id: string, isPublicFormEnabled: boolean): Promise<Kanban> => {
    const response = await api.put(`/api/kanbans/${id}/public-form-settings`, { isPublicFormEnabled });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/kanbans/${id}`);
  },
};

// Product API calls
export const productApi = {
  getById: async (id: string): Promise<Product> => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProduct): Promise<Product> => {
    const response = await api.post('/api/products', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProduct): Promise<Product> => {
    const response = await api.put(`/api/products/${id}`, data);
    return response.data;
  },

  move: async (id: string, columnStatus: string, locationId?: string, skipValidation?: boolean): Promise<Product> => {
    const response = await api.put(`/api/products/${id}/move`, { columnStatus, locationId, skipValidation });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/products/${id}`);
  },

  getByLocation: async (locationId: string): Promise<{
    location: Location;
    products: Product[];
    count: number;
  }> => {
    const response = await api.get(`/api/products/by-location/${locationId}`);
    return response.data;
  },
};

// Location API calls
export const locationApi = {
  getAll: async (params?: { search?: string; area?: string }): Promise<{
    locations: Location[];
    groupedByArea: Record<string, Location[]>;
    areas: string[];
  }> => {
    const response = await api.get('/api/locations', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Location> => {
    const response = await api.get(`/api/locations/${id}`);
    return response.data;
  },

  create: async (data: CreateLocation): Promise<Location> => {
    const response = await api.post('/api/locations', data);
    return response.data;
  },

  update: async (id: string, data: UpdateLocation): Promise<Location> => {
    const response = await api.put(`/api/locations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/locations/${id}`);
  },

  getProducts: async (id: string): Promise<{
    location: Location;
    products: Product[];
    count: number;
  }> => {
    const response = await api.get(`/api/locations/${id}/products`);
    return response.data;
  },

  getAreas: async (): Promise<string[]> => {
    const response = await api.get('/api/locations/areas/list');
    return response.data;
  },
};

export interface TransferLogWithRelations extends Omit<TransferLog, 'createdAt'> {
  createdAt: string;
  product: Product | null;
  fromKanban: Kanban | null;
  toKanban: Kanban | null;
  fromLocation: Location | null;
  toLocation: Location | null;
}

// Transfer log API calls
export const transferLogApi = {
  getAll: async (params?: {
    productId?: string;
    fromKanbanId?: string;
    toKanbanId?: string;
    transferType?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<TransferLogWithRelations[]> => {
    const response = await api.get('/api/transfer-logs', { params });
    return response.data;
  },

  getByProduct: async (
    productId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<TransferLogWithRelations[]> => {
    const response = await api.get(`/api/transfer-logs/product/${productId}`, { params });
    return response.data;
  },

  getByKanban: async (
    kanbanId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<TransferLogWithRelations[]> => {
    const response = await api.get(`/api/transfer-logs/kanban/${kanbanId}`, { params });
    return response.data;
  },
};

// Public Form API calls
export interface ProductSearchResult {
  id: string;
  productDetails: string;
  sku: string | null;
  category: string | null;
  supplier: string | null;
  unitPrice: string | null;
}

export const publicApi = {
  getKanbanInfo: async (token: string): Promise<{ id: string; name: string; type: string }> => {
    const response = await api.get(`/api/public/form/${token}`);
    return response.data;
  },

  getDepartments: async (): Promise<{ id: string; name: string }[]> => {
    const response = await api.get('/api/public/departments');
    return response.data;
  },

  getAreas: async (): Promise<string[]> => {
    const response = await api.get('/api/public/areas');
    return response.data;
  },

  searchProducts: async (query: string): Promise<ProductSearchResult[]> => {
    const response = await api.get('/api/public/products/search', {
      params: { q: query }
    });
    return response.data;
  },

  submitForm: async (token: string, data: {
    requesterName: string;
    departmentId: string;
    area?: string;
    itemName: string;
    itemUrl?: string;
    quantity: number;
    details?: string;
    priority: string;
    notes?: string;
    // Optional fields from existing product selection
    productId?: string;
    category?: string;
    supplier?: string;
    sku?: string;
    unitPrice?: string;
  }): Promise<{ message: string; product: Product }> => {
    const response = await api.post(`/api/public/form/${token}`, data);
    return response.data;
  },
};

// Inventory API calls
export const inventoryApi = {
  getInventory: async (params: InventoryFilters & { page?: number; pageSize?: number }): Promise<InventoryResponse> => {
    const response = await api.get('/api/inventory', { params });
    return response.data;
  },

  getGroupedInventory: async (params?: { search?: string; category?: string[]; supplier?: string[]; status?: string }): Promise<GroupedInventoryResponse> => {
    const response = await api.get('/api/inventory/grouped', { params });
    return response.data;
  },

  getStats: async (): Promise<InventoryStats> => {
    const response = await api.get('/api/inventory/stats');
    return response.data;
  },
};

// Bulk Movement API calls
export const bulkMovementApi = {
  getAll: async (filters?: Partial<BulkMovementFilters>): Promise<BulkMovementListResponse> => {
    const response = await api.get('/api/bulk-movements', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<BulkMovementWithDetails> => {
    const response = await api.get(`/api/bulk-movements/${id}`);
    return response.data;
  },

  create: async (data: CreateBulkMovement): Promise<BulkMovementWithDetails & { publicUrl: string }> => {
    const response = await api.post('/api/bulk-movements', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBulkMovement): Promise<BulkMovementWithDetails> => {
    const response = await api.patch(`/api/bulk-movements/${id}`, data);
    return response.data;
  },

  cancel: async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/bulk-movements/${id}/cancel`);
    return response.data;
  },

  checkExpired: async (): Promise<{ expiredCount: number }> => {
    const response = await api.post('/api/bulk-movements/check-expired');
    return response.data;
  },

  // Public endpoints (no authentication required)
  getByToken: async (token: string): Promise<PublicBulkMovementResponse> => {
    const response = await axios.get(`${API_BASE_URL}/api/public/bulk-movements/${token}`);
    return response.data;
  },

  confirm: async (token: string, data: ConfirmBulkMovement): Promise<{ message: string; bulkMovementId: string; createdProductsCount: number; confirmedItemsCount: number }> => {
    const response = await axios.post(`${API_BASE_URL}/api/public/bulk-movements/${token}/confirm`, data);
    return response.data;
  },
};

// User API calls
export const userApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/api/users');
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUser): Promise<User> => {
    const response = await api.post('/api/users', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUser): Promise<User> => {
    const response = await api.put(`/api/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/users/${id}`);
  },
};

// Auth API calls
export const authApi = {
  login: async (data: Login): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  register: async (data: CreateUser): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/refresh');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string; uptime: number }> => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

// Export api instance for direct use
export { api };

export default api;
