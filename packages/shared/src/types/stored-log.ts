import { z } from 'zod';
import { KanbanTypeSchema } from './kanban';

export const StoredLogRemovalTypeSchema = z.enum(['auto', 'manual']);
export type StoredLogRemovalType = z.infer<typeof StoredLogRemovalTypeSchema>;

export const StoredLogSchema = z.object({
  id: z.string().uuid(),
  kanbanId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productDetails: z.string(),
  sku: z.string().nullable(),
  quantity: z.number().int().nullable(),
  unit: z.string().nullable(),
  stockLevel: z.number().int().nullable(),
  category: z.string().nullable(),
  supplier: z.string().nullable(),
  storedAt: z.date(),
  removedAt: z.date(),
  removalType: StoredLogRemovalTypeSchema,
  removalReason: z.string().nullable(),
  productSnapshot: z.record(z.string(), z.any()).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.date(),
});

export type StoredLog = z.infer<typeof StoredLogSchema>;

export const StoredLogWithRelationsSchema = StoredLogSchema.extend({
  kanbanName: z.string().nullable().optional(),
  kanbanLocationId: z.string().uuid().nullable().optional(),
  kanbanType: KanbanTypeSchema.optional(),
  productCurrentStatus: z.string().nullable().optional(),
});

export type StoredLogWithRelations = z.infer<typeof StoredLogWithRelationsSchema>;

export const StoredLogFiltersSchema = z.object({
  kanbanId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  removalType: StoredLogRemovalTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type StoredLogFilters = z.infer<typeof StoredLogFiltersSchema>;

export const StoredLogListResponseSchema = z.object({
  items: z.array(StoredLogWithRelationsSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type StoredLogListResponse = z.infer<typeof StoredLogListResponseSchema>;

