import { z } from 'zod';

/**
 * Stock adjustment types for manual inventory corrections
 */
export const StockAdjustmentType = z.enum([
  'manual_increase',     // Manual stock increase (e.g., found missing items)
  'manual_decrease',     // Manual stock decrease (e.g., damaged/lost items)
  'correction',          // Correction of recording error
  'reconciliation',      // Periodic physical count reconciliation
  'damaged',             // Items damaged and removed from inventory
  'expired',             // Items expired and removed from inventory
  'lost',                // Items lost/stolen
  'returned',            // Items returned from customer/person
  'transfer_correction', // Correction of previous transfer
]);

export type StockAdjustmentType = z.infer<typeof StockAdjustmentType>;

/**
 * Stock adjustment reason
 */
export const StockAdjustmentReason = z.object({
  type: StockAdjustmentType,
  description: z.string().min(1, 'Description is required'),
  referenceNumber: z.string().optional(),
  adjustedBy: z.string().optional(),
  approvedBy: z.string().optional(),
});

export type StockAdjustmentReason = z.infer<typeof StockAdjustmentReason>;

/**
 * Create stock adjustment schema
 */
export const CreateStockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  locationId: z.string().uuid('Invalid location ID').optional().nullable(),
  adjustmentType: StockAdjustmentType,
  quantityChange: z.number().int('Quantity must be an integer'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateStockAdjustmentSchema = z.infer<typeof CreateStockAdjustmentSchema>;

/**
 * Update stock adjustment schema (for pending adjustments)
 */
export const UpdateStockAdjustmentSchema = z.object({
  quantityChange: z.number().int('Quantity must be an integer').optional(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long').optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type UpdateStockAdjustmentSchema = z.infer<typeof UpdateStockAdjustmentSchema>;

/**
 * Stock adjustment log entry (extends movement log)
 */
export const StockAdjustmentLog = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  adjustmentType: StockAdjustmentType,
  quantityBefore: z.number().int(),
  quantityChange: z.number().int(),
  quantityAfter: z.number().int(),
  reason: z.string(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().nullable(),
  adjustedBy: z.string(),
  approvedBy: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.date(),
  updatedAt: z.date(),
  approvedAt: z.date().nullable(),
});

export type StockAdjustmentLog = z.infer<typeof StockAdjustmentLog>;

/**
 * Batch stock adjustment schema
 */
export const CreateBatchStockAdjustmentSchema = z.object({
  adjustments: z.array(
    z.object({
      productId: z.string().uuid('Invalid product ID'),
      quantityChange: z.number().int('Quantity must be an integer'),
      reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
      notes: z.string().max(1000).optional().nullable(),
    })
  ).min(1, 'At least one adjustment is required'),
  adjustmentType: StockAdjustmentType,
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateBatchStockAdjustmentSchema = z.infer<typeof CreateBatchStockAdjustmentSchema>;

/**
 * Stock adjustment filters
 */
export const StockAdjustmentFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  adjustmentType: StockAdjustmentType.optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  adjustedBy: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type StockAdjustmentFiltersSchema = z.infer<typeof StockAdjustmentFiltersSchema>;

/**
 * Inline stock adjustment (quick adjustment from movement history)
 */
export const InlineStockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  locationId: z.string().uuid('Invalid location ID').optional().nullable(),
  newQuantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  notes: z.string().max(1000).optional().nullable(),
});

export type InlineStockAdjustmentSchema = z.infer<typeof InlineStockAdjustmentSchema>;

/**
 * Helper to determine if quantity change is increase or decrease
 */
export function getAdjustmentDirection(quantityChange: number): 'increase' | 'decrease' | 'no_change' {
  if (quantityChange > 0) return 'increase';
  if (quantityChange < 0) return 'decrease';
  return 'no_change';
}

/**
 * Helper to get user-friendly adjustment type label
 */
export function getAdjustmentTypeLabel(type: StockAdjustmentType): string {
  const labels: Record<StockAdjustmentType, string> = {
    manual_increase: 'Manual Increase',
    manual_decrease: 'Manual Decrease',
    correction: 'Correction',
    reconciliation: 'Reconciliation',
    damaged: 'Damaged Items',
    expired: 'Expired Items',
    lost: 'Lost/Stolen Items',
    returned: 'Returned Items',
    transfer_correction: 'Transfer Correction',
  };
  return labels[type];
}

