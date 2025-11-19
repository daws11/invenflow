import { api } from "./api";
import {
  ProductGroupWithDetails,
  CreateProductGroup,
  UpdateProductGroup,
  AddProductsToGroup,
  RemoveProductsFromGroup,
} from "@invenflow/shared";

export const productGroupApi = {
  create: async (
    data: CreateProductGroup,
  ): Promise<ProductGroupWithDetails> => {
    const response = await api.post("/api/product-groups", data);
    return response.data;
  },

  getById: async (id: string): Promise<ProductGroupWithDetails> => {
    const response = await api.get(`/api/product-groups/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateProductGroup,
  ): Promise<ProductGroupWithDetails> => {
    const response = await api.put(`/api/product-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/product-groups/${id}`);
  },

  addProducts: async (
    groupId: string,
    data: AddProductsToGroup,
  ): Promise<void> => {
    await api.post(`/api/product-groups/${groupId}/add-products`, data);
  },

  removeProducts: async (
    groupId: string,
    data: RemoveProductsFromGroup,
  ): Promise<void> => {
    await api.post(`/api/product-groups/${groupId}/remove-products`, data);
  },
};
