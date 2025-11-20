import { z } from 'zod';
import { KanbanType, ColumnStatus, ORDER_COLUMNS, RECEIVE_COLUMNS } from './kanban.js';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  requesterName: z.string().max(255).nullable(),
  locationId: z.string().uuid().nullable(),
  assignedToPersonId: z.string().uuid().nullable(),
  preferredReceiveKanbanId: z.string().uuid().nullable(), // Per-product preferred receive kanban
  priority: z.string().max(100).nullable(),
  stockLevel: z.number().int().min(0).nullable(),
  sourceProductId: z.string().uuid().nullable(),
  // Enhanced fields
  productImage: z.string().url().nullable(),
  category: z.string().max(100).nullable(),
  tags: z.array(z.string().max(50)).nullable(),
  supplier: z.string().max(255).nullable(),
  sku: z.string().max(100).nullable(),
  dimensions: z.string().max(255).nullable(),
  weight: z.number().positive().nullable(),
  unit: z.string().max(20).nullable(),
  unitPrice: z.number().positive().nullable(),
  notes: z.string().max(1000).nullable(),
  // Import metadata
  importSource: z.string().nullable(),
  importBatchId: z.string().uuid().nullable(),
  originalPurchaseDate: z.date().nullable(),
  isDraft: z.boolean(),
  // Rejection fields
  isRejected: z.boolean(),
  rejectedAt: z.date().nullable(),
  rejectionReason: z.string().max(500).nullable(),
  // Grouping fields
  productGroupId: z.string().uuid().nullable(),
  groupPosition: z.number().int().nullable(),
  columnPosition: z.number().int().nullable(),
  columnEnteredAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProductSchema = z.object({
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable().optional(),
  locationId: z.string().uuid().nullable(),
  assignedToPersonId: z.string().uuid().nullable(),
  preferredReceiveKanbanId: z.string().uuid().nullable().optional(), // Per-product preferred receive kanban
  priority: z.string().max(100).nullable(),
  // Enhanced fields
  productImage: z.string().url().nullable().optional(),
  category: z.string().max(100).nullable(),
  tags: z.array(z.string().max(50)).nullable(),
  supplier: z.string().max(255).nullable(),
  sku: z.string().max(100).nullable().optional(),
  dimensions: z.string().max(255).nullable(),
  weight: z.number().positive().nullable(),
  unit: z.string().max(20).nullable(),
  unitPrice: z.number().positive().nullable(),
  notes: z.string().max(1000).nullable(),
  // Import metadata
  importSource: z.string().nullable().optional(),
  importBatchId: z.string().uuid().nullable().optional(),
  originalPurchaseDate: z.date().nullable().optional(),
  isDraft: z.boolean().optional(),
  columnEnteredAt: z.date().optional(),
  columnPosition: z.number().int().nullable().optional(),
});

export const UpdateProductSchema = z.object({
  productDetails: z.string().min(1).max(1000).optional(),
  productLink: z.string().url().nullable().optional(),
  requesterName: z.string().max(255).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  assignedToPersonId: z.string().uuid().nullable().optional(),
  preferredReceiveKanbanId: z.string().uuid().nullable().optional(), // Per-product preferred receive kanban
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
  unit: z.string().max(20).nullable().optional(),
  unitPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  // Import metadata
  importSource: z.string().nullable().optional(),
  importBatchId: z.string().uuid().nullable().optional(),
  originalPurchaseDate: z.date().nullable().optional(),
  isDraft: z.boolean().optional(),
  columnPosition: z.number().int().nullable().optional(),
});

export const UpdateStockLevelSchema = z.object({
  newStockLevel: z.number().int().min(0, 'Stock level must be non-negative'),
});

export const MoveProductSchema = z.object({
  columnStatus: z.string(),
});

export const TransferProductSchema = z.object({
  targetKanbanId: z.string().uuid(),
});

export const PublicFormSubmitSchema = z.object({
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  locationId: z.string().uuid().nullable(),
  assignedToPersonId: z.string().uuid().nullable(),
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
export type TransferProduct = z.infer<typeof TransferProductSchema>;
export type PublicFormSubmit = z.infer<typeof PublicFormSubmitSchema>;
export type UpdateStockLevel = z.infer<typeof UpdateStockLevelSchema>;

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

export const DEFAULT_UNITS = [
  'pcs',
  'kg',
  'g',
  'liters',
  'ml',
  'meters',
  'cm',
  'boxes',
  'sets',
  'Custom'
] as const;
export type Unit = typeof DEFAULT_UNITS[number];

export function getValidColumns(kanbanType: KanbanType): readonly string[] {
  return kanbanType === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
}

export function isValidColumn(column: string, kanbanType: KanbanType): boolean {
  return getValidColumns(kanbanType).includes(column);
}

export function isStockTrackingEnabled(columnStatus: ColumnStatus): boolean {
  return columnStatus === 'Stored';
}

// Import (Stored) adjustment item schema for migration/import flows
export const ImportAdjustmentItemSchema = z.object({
  sku: z.string().max(100).optional(),
  legacySku: z.string().max(100).optional(),
  legacyId: z.string().max(100).optional(),
  productName: z.string().min(1).max(1000),
  supplier: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  dimensions: z.string().max(255).optional(),
  unit: z.string().max(20).optional(),
  newStockLevel: z.number().int().min(0),
  locationId: z.string().uuid().optional(),
  locationCode: z.string().max(50).optional(),
  unitPrice: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  originalPurchaseDate: z.date().optional(),
});

export type ImportAdjustmentItem = z.infer<typeof ImportAdjustmentItemSchema>;