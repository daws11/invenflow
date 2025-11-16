import { z } from 'zod';

// Unified field settings schema
export const UnifiedFieldsSchema = z.record(z.boolean());
export const UnifiedValuesSchema = z.record(z.any());

// Product Group Schema
export const ProductGroupSchema = z.object({
  id: z.string().uuid(),
  kanbanId: z.string().uuid(),
  groupTitle: z.string().min(1).max(255),
  columnStatus: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Product Group Settings Schema
export const ProductGroupSettingsSchema = z.object({
  id: z.string().uuid(),
  productGroupId: z.string().uuid(),
  unifiedFields: UnifiedFieldsSchema,
  unifiedValues: UnifiedValuesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Product Group with Settings and Products
export const ProductGroupWithDetailsSchema = ProductGroupSchema.extend({
  settings: ProductGroupSettingsSchema.nullable().optional(),
  products: z.array(z.any()).optional(), // Will be Product[] from product.ts
});

// Create Product Group Schema
export const CreateProductGroupSchema = z.object({
  kanbanId: z.string().uuid(),
  groupTitle: z.string().min(1).max(255),
  columnStatus: z.string(),
  productIds: z.array(z.string().uuid()).min(1),
  unifiedFields: UnifiedFieldsSchema.optional(),
  unifiedValues: UnifiedValuesSchema.optional(),
});

// Update Product Group Schema
export const UpdateProductGroupSchema = z.object({
  groupTitle: z.string().min(1).max(255).optional(),
  unifiedFields: UnifiedFieldsSchema.optional(),
  unifiedValues: UnifiedValuesSchema.optional(),
});

// Add Products to Group Schema
export const AddProductsToGroupSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

// Remove Products from Group Schema
export const RemoveProductsFromGroupSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

// Type exports
export type ProductGroup = z.infer<typeof ProductGroupSchema>;
export type ProductGroupSettings = z.infer<typeof ProductGroupSettingsSchema>;
export type ProductGroupWithDetails = z.infer<typeof ProductGroupWithDetailsSchema>;
export type CreateProductGroup = z.infer<typeof CreateProductGroupSchema>;
export type UpdateProductGroup = z.infer<typeof UpdateProductGroupSchema>;
export type AddProductsToGroup = z.infer<typeof AddProductsToGroupSchema>;
export type RemoveProductsFromGroup = z.infer<typeof RemoveProductsFromGroupSchema>;
export type UnifiedFields = z.infer<typeof UnifiedFieldsSchema>;
export type UnifiedValues = z.infer<typeof UnifiedValuesSchema>;

// Available unified field options
export const UNIFIED_FIELD_OPTIONS = [
  'priority',
  'category',
  'supplier',
  'assignedToPersonId',
  'preferredReceiveKanbanId',
] as const;

export type UnifiedFieldOption = typeof UNIFIED_FIELD_OPTIONS[number];

