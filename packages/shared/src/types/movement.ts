import { z } from 'zod';

export const MovementLogSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid().nullable(),
  toLocationId: z.string().uuid(),
  fromStockLevel: z.number().int().min(0).nullable(),
  toStockLevel: z.number().int().min(0),
  notes: z.string().nullable(),
  movedBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateMovementSchema = z.object({
  productId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  toStockLevel: z.number().int().min(0),
  notes: z.string().max(1000).nullable().optional(),
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
export type MovementFilters = z.infer<typeof MovementFiltersSchema>;
export type MovementStats = z.infer<typeof MovementStatsSchema>;

// Constants
export const MAX_MOVEMENT_HISTORY = 100;
export const DEFAULT_MOVEMENT_LIMIT = 50;

