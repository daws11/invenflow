import { z } from 'zod';

// Bulk Reject Schema
export const BulkRejectSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  rejectionReason: z.string().max(500).optional(),
});

// Bulk Delete Schema
export const BulkDeleteSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

// Bulk Move Schema
export const BulkMoveSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  targetColumn: z.string(),
  locationId: z.string().uuid().optional(),
});

// Bulk Group Schema (for creating a group from selected products)
export const BulkGroupSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  groupTitle: z.string().min(1).max(255),
  unifiedFields: z.record(z.boolean()).optional(),
  unifiedValues: z.record(z.any()).optional(),
});

// Type exports
export type BulkReject = z.infer<typeof BulkRejectSchema>;
export type BulkDelete = z.infer<typeof BulkDeleteSchema>;
export type BulkMove = z.infer<typeof BulkMoveSchema>;
export type BulkGroup = z.infer<typeof BulkGroupSchema>;

// Response schemas
export const BulkActionResponseSchema = z.object({
  message: z.string(),
  affectedCount: z.number().int().min(0),
  successIds: z.array(z.string().uuid()).optional(),
  failedIds: z.array(z.string().uuid()).optional(),
});

export type BulkActionResponse = z.infer<typeof BulkActionResponseSchema>;

