import axios from 'axios';
import { Kanban, Product, CreateKanban, CreateProduct, UpdateProduct } from '@invenflow/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  move: async (id: string, columnStatus: string): Promise<Product> => {
    const response = await api.put(`/api/products/${id}/move`, { columnStatus });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/products/${id}`);
  },
};

// Public Form API calls
export const publicApi = {
  getKanbanInfo: async (token: string): Promise<{ id: string; name: string; type: string }> => {
    const response = await api.get(`/api/public/form/${token}`);
    return response.data;
  },

  submitForm: async (token: string, data: {
    productDetails: string;
    productLink?: string;
    location?: string;
    priority?: string;
  }): Promise<{ message: string; product: Product }> => {
    const response = await api.post(`/api/public/form/${token}`, data);
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

export default api;