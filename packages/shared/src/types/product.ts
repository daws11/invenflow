import { z } from 'zod';
import { KanbanType, ColumnStatus, ORDER_COLUMNS, RECEIVE_COLUMNS } from './kanban';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  locationId: z.string().uuid().nullable(),
  priority: z.string().max(100).nullable(),
  stockLevel: z.number().int().min(0).nullable(),
  // Enhanced fields
  productImage: z.string().url().nullable(),
  category: z.string().max(100).nullable(),
  tags: z.array(z.string().max(50)).nullable(),
  supplier: z.string().max(255).nullable(),
  sku: z.string().max(100).nullable(),
  dimensions: z.string().max(255).nullable(),
  weight: z.number().positive().nullable(),
  unitPrice: z.number().positive().nullable(),
  notes: z.string().max(1000).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProductSchema = z.object({
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  locationId: z.string().uuid().nullable(),
  priority: z.string().max(100).nullable(),
  // Enhanced fields
  productImage: z.string().url().nullable(),
  category: z.string().max(100).nullable(),
  tags: z.array(z.string().max(50)).nullable(),
  supplier: z.string().max(255).nullable(),
  sku: z.string().max(100).nullable(),
  dimensions: z.string().max(255).nullable(),
  weight: z.number().positive().nullable(),
  unitPrice: z.number().positive().nullable(),
  notes: z.string().max(1000).nullable(),
});

export const UpdateProductSchema = z.object({
  productDetails: z.string().min(1).max(1000).optional(),
  productLink: z.string().url().nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  priority: z.string().max(100).nullable().optional(),
  stockLevel: z.number().int().min(0).nullable().optional(),
  // Enhanced fields
  productImage: z.string().url().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).nullable().optional(),
  supplier: z.string().max(255).nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  dimensions: z.string().max(255).nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  unitPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const MoveProductSchema = z.object({
  columnStatus: z.string(),
});

export const PublicFormSubmitSchema = z.object({
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  locationId: z.string().uuid().nullable(),
  priority: z.string().max(100).nullable(),
  // Enhanced fields for public forms
  category: z.string().max(100).nullable(),
  supplier: z.string().max(255).nullable(),
  notes: z.string().max(1000).nullable(),
});

export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type MoveProduct = z.infer<typeof MoveProductSchema>;
export type PublicFormSubmit = z.infer<typeof PublicFormSubmitSchema>;

export const DEFAULT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = typeof DEFAULT_PRIORITIES[number];

export const DEFAULT_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Office Supplies',
  'Raw Materials',
  'Tools & Equipment',
  'Packaging',
  'Safety Equipment',
  'Cleaning Supplies',
  'Software',
  'Services',
  'Other'
] as const;
export type Category = typeof DEFAULT_CATEGORIES[number];

export const COMMON_TAGS = [
  'urgent',
  'bulk',
  'fragile',
  'hazardous',
  'perishable',
  'expensive',
  'custom',
  'standard',
  'discontinued',
  'new',
  'popular'
] as const;

export function getValidColumns(kanbanType: KanbanType): readonly string[] {
  return kanbanType === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
}

export function isValidColumn(column: string, kanbanType: KanbanType): boolean {
  return getValidColumns(kanbanType).includes(column);
}

export function isStockTrackingEnabled(columnStatus: ColumnStatus): boolean {
  return columnStatus === 'Stored';
}