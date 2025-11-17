import { z } from 'zod';

// Stock by Location Analytics
export const StockByLocationSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationCode: z.string(),
  locationArea: z.string(),
  locationBuilding: z.string().nullable(),
  locationCapacity: z.number().nullable(),
  totalProducts: z.number().int().min(0),
  totalStock: z.number().int().min(0),
  storedProducts: z.number().int().min(0),
  receivedProducts: z.number().int().min(0),
  purchasedProducts: z.number().int().min(0),
  lowStockProducts: z.number().int().min(0),
  outOfStockProducts: z.number().int().min(0),
  avgStockLevel: z.number().nullable(),
  totalValue: z.number().min(0),
  utilizationRate: z.number().nullable(),
  lastUpdated: z.date().nullable(),
});

export const StockByLocationResponseSchema = z.object({
  locations: z.array(StockByLocationSchema),
  summary: z.object({
    totalLocations: z.number().int().min(0),
    totalProducts: z.number().int().min(0),
    totalStock: z.number().int().min(0),
    totalValue: z.number().min(0),
  }),
});

// Movement Trends Analytics
export const MovementTrendSchema = z.object({
  period: z.date(),
  totalMovements: z.number().int().min(0),
  totalStockMoved: z.number().int(),
  avgStockPerMovement: z.number().min(0),
  totalValue: z.number().min(0),
  movementsByType: z.record(z.number().int().min(0)),
  topReasons: z.record(z.number().int().min(0)),
});

export const LocationMovementSummarySchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  incomingMovements: z.number().int().min(0),
  outgoingMovements: z.number().int().min(0),
  netStockChange: z.number().int(),
});

export const MovementTrendsResponseSchema = z.object({
  trends: z.array(MovementTrendSchema),
  locationSummary: z.array(LocationMovementSummarySchema),
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
    days: z.number().int().min(1),
    groupBy: z.enum(['day', 'week', 'month']),
  }),
});

// Stock Alerts
export const StockAlertItemSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().nullable(),
  productName: z.string(),
  category: z.string().nullable(),
  supplier: z.string().nullable(),
  currentStock: z.number().int().min(0).nullable(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
  lastMovement: z.date(),
  alertLevel: z.enum(['critical', 'high', 'medium', 'low']),
});

export const OverstockItemSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  capacity: z.number().int().min(0),
  currentCount: z.number().int().min(0),
  utilizationRate: z.number().min(0),
  excessItems: z.number().int().min(0),
});

export const StaleItemSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().nullable(),
  productName: z.string(),
  category: z.string().nullable(),
  currentStock: z.number().int().min(0).nullable(),
  locationName: z.string().nullable(),
  lastMovement: z.date(),
  daysStale: z.number().int().min(0),
});

export const StockAlertsResponseSchema = z.object({
  summary: z.object({
    lowStock: z.object({
      critical: z.number().int().min(0),
      high: z.number().int().min(0),
      medium: z.number().int().min(0),
      low: z.number().int().min(0),
    }),
    overstock: z.number().int().min(0),
    staleInventory: z.number().int().min(0),
    totalAlerts: z.number().int().min(0),
  }),
  alerts: z.object({
    lowStock: z.array(StockAlertItemSchema),
    overstock: z.array(OverstockItemSchema),
    staleInventory: z.array(StaleItemSchema),
  }),
});

// Location Utilization
export const LocationUtilizationSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationCode: z.string(),
  area: z.string(),
  building: z.string().nullable(),
  capacity: z.number().int().min(0),
  currentCount: z.number().int().min(0),
  storedCount: z.number().int().min(0),
  receivedCount: z.number().int().min(0),
  utilizationRate: z.number().min(0).max(100),
  availableCapacity: z.number().int().min(0),
  status: z.enum(['full', 'high', 'medium', 'low']),
  totalValue: z.number().min(0),
  lastActivity: z.date().nullable(),
});

export const LocationUtilizationResponseSchema = z.object({
  locations: z.array(LocationUtilizationSchema),
  summary: z.object({
    totalLocations: z.number().int().min(0),
    totalCapacity: z.number().int().min(0),
    totalUsed: z.number().int().min(0),
    averageUtilization: z.number().min(0).max(100),
    statusBreakdown: z.object({
      full: z.number().int().min(0),
      high: z.number().int().min(0),
      medium: z.number().int().min(0),
      low: z.number().int().min(0),
    }),
  }),
});

// Stock Snapshot
export const StockSnapshotSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  sku: z.string().nullable(),
  stockLevel: z.number().int().min(0),
  columnStatus: z.string(),
  snapshotDate: z.date(),
  snapshotType: z.enum(['daily', 'movement', 'manual']),
  createdAt: z.date(),
});

export const CreateStockSnapshotSchema = z.object({
  snapshotType: z.enum(['daily', 'movement', 'manual']).default('manual'),
  locationIds: z.array(z.string().uuid()).optional(),
});

export const StockSnapshotResponseSchema = z.object({
  message: z.string(),
  snapshotCount: z.number().int().min(0),
  snapshotType: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
});

// Stock Alert Configuration
export const StockAlertConfigSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().nullable(),
  locationId: z.string().uuid().nullable(),
  category: z.string().nullable(),
  alertType: z.enum(['low_stock', 'out_of_stock', 'overstock']),
  threshold: z.number().int().min(0),
  isActive: z.boolean(),
  notificationEmail: z.string().email().nullable(),
  lastTriggered: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateStockAlertConfigSchema = z.object({
  sku: z.string().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  alertType: z.enum(['low_stock', 'out_of_stock', 'overstock']),
  threshold: z.number().int().min(0),
  isActive: z.boolean().default(true),
  notificationEmail: z.string().email().nullable().optional(),
});

// Enhanced Movement Log
export const EnhancedMovementLogSchema = z.object({
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
  movementType: z.enum(['manual', 'bulk', 'automatic', 'split', 'merge']),
  reasonCode: z.enum(['restock', 'transfer', 'adjustment', 'damage', 'expired', 'return']).nullable(),
  batchId: z.string().uuid().nullable(),
  referenceNumber: z.string().nullable(),
  unitCost: z.number().min(0).nullable(),
  totalValue: z.number().min(0).nullable(),
  metadata: z.record(z.any()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  sessionId: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateEnhancedMovementLogSchema = z.object({
  productId: z.string().uuid(),
  toLocationId: z.string().uuid().nullable().optional(),
  toPersonId: z.string().uuid().nullable().optional(),
  toStockLevel: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  movementType: z.enum(['manual', 'bulk', 'automatic', 'split', 'merge']).default('manual'),
  reasonCode: z.enum(['restock', 'transfer', 'adjustment', 'damage', 'expired', 'return']).nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  unitCost: z.number().min(0).nullable().optional(),
  totalValue: z.number().min(0).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

// Type exports
export type StockByLocation = z.infer<typeof StockByLocationSchema>;
export type StockByLocationResponse = z.infer<typeof StockByLocationResponseSchema>;
export type MovementTrend = z.infer<typeof MovementTrendSchema>;
export type LocationMovementSummary = z.infer<typeof LocationMovementSummarySchema>;
export type MovementTrendsResponse = z.infer<typeof MovementTrendsResponseSchema>;
export type StockAlertItem = z.infer<typeof StockAlertItemSchema>;
export type OverstockItem = z.infer<typeof OverstockItemSchema>;
export type StaleItem = z.infer<typeof StaleItemSchema>;
export type StockAlertsResponse = z.infer<typeof StockAlertsResponseSchema>;
export type LocationUtilization = z.infer<typeof LocationUtilizationSchema>;
export type LocationUtilizationResponse = z.infer<typeof LocationUtilizationResponseSchema>;
export type StockSnapshot = z.infer<typeof StockSnapshotSchema>;
export type CreateStockSnapshot = z.infer<typeof CreateStockSnapshotSchema>;
export type StockSnapshotResponse = z.infer<typeof StockSnapshotResponseSchema>;
export type StockAlertConfig = z.infer<typeof StockAlertConfigSchema>;
export type CreateStockAlertConfig = z.infer<typeof CreateStockAlertConfigSchema>;
export type EnhancedMovementLog = z.infer<typeof EnhancedMovementLogSchema>;
export type CreateEnhancedMovementLog = z.infer<typeof CreateEnhancedMovementLogSchema>;


