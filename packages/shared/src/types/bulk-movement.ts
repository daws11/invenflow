import { z } from 'zod';

// Bulk Movement Status
export const BulkMovementStatusSchema = z.enum(['pending', 'in_transit', 'received', 'expired']);
export type BulkMovementStatus = z.infer<typeof BulkMovementStatusSchema>;

// Bulk Movement Item
export const BulkMovementItemSchema = z.object({
  id: z.string().uuid(),
  bulkMovementId: z.string().uuid(),
  productId: z.string().uuid(),
  quantitySent: z.number().int().positive(),
  quantityReceived: z.number().int().min(0).nullable(),
  sku: z.string().nullable(),
  productDetails: z.string(),
  productImage: z.string().url().nullable(),
  createdAt: z.coerce.date(),
});

export type BulkMovementItem = z.infer<typeof BulkMovementItemSchema>;

// Main Bulk Movement
export const BulkMovementSchema = z.object({
  id: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  status: BulkMovementStatusSchema,
  requiresConfirmation: z.boolean().default(false),
  publicToken: z.string(),
  tokenExpiresAt: z.coerce.date(),
  createdBy: z.string(),
  confirmedBy: z.string().nullable(),
  confirmedAt: z.coerce.date().nullable(),
  cancelledAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BulkMovement = z.infer<typeof BulkMovementSchema>;

// Bulk Movement with related data (for API responses)
export const BulkMovementWithDetailsSchema = BulkMovementSchema.extend({
  items: z.array(BulkMovementItemSchema),
  fromLocation: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    area: z.string(),
  }),
  toLocation: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    area: z.string(),
  }),
});

export type BulkMovementWithDetails = z.infer<typeof BulkMovementWithDetailsSchema>;

// Create Bulk Movement Item (input)
export const CreateBulkMovementItemSchema = z.object({
  productId: z.string().uuid(),
  quantitySent: z.number().int().positive(),
});

export type CreateBulkMovementItem = z.infer<typeof CreateBulkMovementItemSchema>;

// Create Bulk Movement (input)
export const CreateBulkMovementSchema = z.object({
  // Source can be specified by concrete location or by area (for general-location source)
  fromLocationId: z.string().uuid().nullable().optional(),
  fromArea: z.string().min(1).max(255).nullable().optional(),
  // Destination can be specified by area (resolved to general location) or explicit location
  toArea: z.string().min(1).max(255).nullable().optional(),
  toLocationId: z.string().uuid().nullable().optional(),
  items: z.array(CreateBulkMovementItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000).nullable().optional(),
  requiresConfirmation: z.boolean().optional().default(false),
})
  // Ensure we have at least a source area or a concrete source location
  .refine(
    (data) => Boolean(data.fromArea || data.fromLocationId),
    {
      message: 'Either fromArea or fromLocationId must be provided',
      path: ['fromArea'],
    },
  )
  // Ensure we have at least a destination area or a concrete destination location
  .refine(
    (data) => Boolean(data.toArea || data.toLocationId),
    {
      message: 'Either toArea or toLocationId must be provided',
      path: ['toArea'],
    },
  )
  // If both from/to locations are provided, they must be different
  .refine(
    (data) =>
      !data.toLocationId ||
      !data.fromLocationId ||
      data.fromLocationId !== data.toLocationId,
    {
      message: 'Source and destination locations must be different',
      path: ['toLocationId'],
    },
  );

export type CreateBulkMovement = z.infer<typeof CreateBulkMovementSchema>;

// Update Bulk Movement (input)
export const UpdateBulkMovementSchema = z.object({
  toLocationId: z.string().uuid().optional(),
  items: z.array(CreateBulkMovementItemSchema).min(1).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type UpdateBulkMovement = z.infer<typeof UpdateBulkMovementSchema>;

// Confirm Bulk Movement Item (input for partial confirmation)
export const ConfirmBulkMovementItemSchema = z.object({
  itemId: z.string().uuid(),
  quantityReceived: z.number().int().min(0),
});

export type ConfirmBulkMovementItem = z.infer<typeof ConfirmBulkMovementItemSchema>;

// Confirm Bulk Movement (input)
export const ConfirmBulkMovementSchema = z.object({
  confirmedBy: z.string().min(1, 'Receiver name is required').max(255),
  items: z.array(ConfirmBulkMovementItemSchema).min(1),
  notes: z.string().max(1000).nullable().optional(),
});

export type ConfirmBulkMovement = z.infer<typeof ConfirmBulkMovementSchema>;

// Bulk Movement Filters (for list queries)
export const BulkMovementFiltersSchema = z.object({
  status: z.array(BulkMovementStatusSchema).optional(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type BulkMovementFilters = z.infer<typeof BulkMovementFiltersSchema>;

// Bulk Movement List Response
export const BulkMovementListResponseSchema = z.object({
  items: z.array(BulkMovementWithDetailsSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type BulkMovementListResponse = z.infer<typeof BulkMovementListResponseSchema>;

// Public Bulk Movement Response (for validation page)
export const PublicBulkMovementResponseSchema = z.object({
  id: z.string().uuid(),
  fromLocation: z.object({
    name: z.string(),
    code: z.string(),
    area: z.string(),
  }),
  toLocation: z.object({
    name: z.string(),
    code: z.string(),
    area: z.string(),
  }),
  status: BulkMovementStatusSchema,
  requiresConfirmation: z.boolean(),
  items: z.array(BulkMovementItemSchema),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  tokenExpiresAt: z.coerce.date(),
  isExpired: z.boolean(),
  confirmedBy: z.string().nullable(),
  confirmedAt: z.coerce.date().nullable(),
});

export type PublicBulkMovementResponse = z.infer<typeof PublicBulkMovementResponseSchema>;

// Status labels for UI
export const BULK_MOVEMENT_STATUS_LABELS: Record<BulkMovementStatus, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  received: 'Received',
  expired: 'Expired',
};

// Status colors for UI (Tailwind classes)
export const BULK_MOVEMENT_STATUS_COLORS: Record<BulkMovementStatus, { bg: string; text: string; border: string }> = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
  },
  in_transit: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  received: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  expired: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
  },
};

