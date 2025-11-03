import { z } from 'zod';
import { KanbanType, ColumnStatus, ORDER_COLUMNS, RECEIVE_COLUMNS } from './kanban';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  priority: z.string().max(100).nullable(),
  stockLevel: z.number().int().min(0).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProductSchema = z.object({
  kanbanId: z.string().uuid(),
  columnStatus: z.string(),
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  priority: z.string().max(100).nullable(),
});

export const UpdateProductSchema = z.object({
  productDetails: z.string().min(1).max(1000).optional(),
  productLink: z.string().url().nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  priority: z.string().max(100).nullable().optional(),
  stockLevel: z.number().int().min(0).nullable().optional(),
});

export const MoveProductSchema = z.object({
  columnStatus: z.string(),
});

export const PublicFormSubmitSchema = z.object({
  productDetails: z.string().min(1).max(1000),
  productLink: z.string().url().nullable(),
  location: z.string().max(255).nullable(),
  priority: z.string().max(100).nullable(),
});

export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type MoveProduct = z.infer<typeof MoveProductSchema>;
export type PublicFormSubmit = z.infer<typeof PublicFormSubmitSchema>;

export const DEFAULT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = typeof DEFAULT_PRIORITIES[number];

export function getValidColumns(kanbanType: KanbanType): readonly string[] {
  return kanbanType === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
}

export function isValidColumn(column: string, kanbanType: KanbanType): boolean {
  return getValidColumns(kanbanType).includes(column);
}

export function isStockTrackingEnabled(columnStatus: ColumnStatus): boolean {
  return columnStatus === 'Stored';
}