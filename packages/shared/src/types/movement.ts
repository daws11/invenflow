import { z } from 'zod';

export const MovementLogSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid().nullable(),
  toLocationId: z.string().uuid().nullable(),
  fromPersonId: z.string().uuid().nullable(),
  toPersonId: z.string().uuid().nullable(),
  fromStockLevel: z.number().int().min(0).nullable(),
  toStockLevel: z.number().int().min(0),
  notes: z.string().nullable(),
  movedBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateMovementSchema = z.object({
  productId: z.string().uuid(),
  toLocationId: z.string().uuid().nullable().optional(),
  toPersonId: z.string().uuid().nullable().optional(),
  toStockLevel: z.number().int().min(0),
  notes: z.string().max(1000).nullable().optional(),
}).refine(
  (data) => data.toLocationId || data.toPersonId,
  {
    message: 'Either toLocationId or toPersonId must be provided',
  }
);

export const BatchDistributionItemSchema = z.object({
  toLocationId: z.string().uuid().nullable().optional(),
  toPersonId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
  notes: z.string().max(1000).nullable().optional(),
}).refine(
  (data) => data.toLocationId || data.toPersonId,
  {
    message: 'Either toLocationId or toPersonId must be provided',
  }
);

export const CreateBatchDistributionSchema = z.object({
  sourceProductId: z.string().uuid(),
  distributions: z.array(BatchDistributionItemSchema).min(1),
});

export const MovementFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});

export const MovementStatsSchema = z.object({
  totalMovements: z.number().int().min(0),
  activeProducts: z.number().int().min(0),
  mostUsedLocations: z.array(z.object({
    locationId: z.string().uuid(),
    locationName: z.string(),
    locationCode: z.string(),
    movementCount: z.number().int().min(0),
  })),
  recentMovements: z.array(MovementLogSchema),
});

export type MovementLog = z.infer<typeof MovementLogSchema>;
export type CreateMovement = z.infer<typeof CreateMovementSchema>;
export type BatchDistributionItem = z.infer<typeof BatchDistributionItemSchema>;
export type CreateBatchDistribution = z.infer<typeof CreateBatchDistributionSchema>;
export type MovementFilters = z.infer<typeof MovementFiltersSchema>;
export type MovementStats = z.infer<typeof MovementStatsSchema>;

// Constants
export const MAX_MOVEMENT_HISTORY = 100;
export const DEFAULT_MOVEMENT_LIMIT = 50;

