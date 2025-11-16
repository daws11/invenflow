import axios from 'axios';
import {
  ProductGroupWithDetails,
  CreateProductGroup,
  UpdateProductGroup,
  AddProductsToGroup,
  RemoveProductsFromGroup,
} from '@invenflow/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('auth_token');
  return token ? `Bearer ${token}` : '';
};

export const productGroupApi = {
  create: async (data: CreateProductGroup): Promise<ProductGroupWithDetails> => {
    const response = await axios.post(`${API_URL}/api/product-groups`, data, {
      headers: { Authorization: getAuthToken() },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ProductGroupWithDetails> => {
    const response = await axios.get(`${API_URL}/api/product-groups/${id}`, {
      headers: { Authorization: getAuthToken() },
    });
    return response.data;
  },

  update: async (id: string, data: UpdateProductGroup): Promise<ProductGroupWithDetails> => {
    const response = await axios.put(`${API_URL}/api/product-groups/${id}`, data, {
      headers: { Authorization: getAuthToken() },
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/product-groups/${id}`, {
      headers: { Authorization: getAuthToken() },
    });
  },

  addProducts: async (groupId: string, data: AddProductsToGroup): Promise<void> => {
    await axios.post(`${API_URL}/api/product-groups/${groupId}/add-products`, data, {
      headers: { Authorization: getAuthToken() },
    });
  },

  removeProducts: async (groupId: string, data: RemoveProductsFromGroup): Promise<void> => {
    await axios.post(`${API_URL}/api/product-groups/${groupId}/remove-products`, data, {
      headers: { Authorization: getAuthToken() },
    });
  },
};

