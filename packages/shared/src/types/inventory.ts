import { z } from 'zod';
import { ProductSchema } from './product';
import { KanbanSchema } from './kanban';

// Validation data schema for inventory items
export const InventoryValidationSchema = z.object({
  receivedImage: z.string().url().nullable(),
  storagePhoto: z.string().url().nullable(),
  validatedAt: z.coerce.date().nullable(),
});

// Available image with metadata schema
export const AvailableImageSchema = z.object({
  url: z.string().url(),
  type: z.enum(['received', 'stored']),
  validatedAt: z.string(),
});

// Enhanced product type for inventory with additional computed fields
export const InventoryItemSchema = ProductSchema.extend({
  kanban: KanbanSchema,
  kanbanId: z.string().uuid(),
  daysInInventory: z.number(),
  validations: z.array(InventoryValidationSchema).nullable(),
  displayImage: z.string().url().nullable(),
  hasMultipleImages: z.boolean().optional(),
  availableImages: z.array(AvailableImageSchema).optional(),
});

// Location schema for inventory
export const InventoryLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  area: z.string(),
  description: z.string().nullable(),
}).nullable();

// Inventory filter types
export const InventoryFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.array(z.string()).optional(),
  supplier: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  stockMin: z.number().int().min(0).optional(),
  stockMax: z.number().int().min(0).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  kanbanIds: z.array(z.string().uuid()).optional(),
  sortBy: z.enum(['updatedAt', 'createdAt', 'productDetails', 'stockLevel', 'category', 'supplier']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  viewMode: z.enum(['unified', 'by-kanban']).default('unified'),
});

// Inventory API response types
export const InventoryResponseSchema = z.object({
  items: z.array(InventoryItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  filters: z.object({
    categories: z.array(z.string()),
    suppliers: z.array(z.string()),
    locations: z.array(z.string()),
    kanbans: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
    })),
  }),
});

export const InventoryStatsSchema = z.object({
  totalStats: z.object({
    total: z.number(),
    purchased: z.number(),
    received: z.number(),
    stored: z.number(),
    lowStock: z.number(),
  }),
  categoryStats: z.array(z.object({
    category: z.string(),
    count: z.number(),
  })),
  supplierStats: z.array(z.object({
    supplier: z.string(),
    count: z.number(),
  })),
});

// Export types
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;
export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;
export type InventoryStats = z.infer<typeof InventoryStatsSchema>;
export type InventoryLocation = z.infer<typeof InventoryLocationSchema>;
export type AvailableImage = z.infer<typeof AvailableImageSchema>;

// Stock level ranges for filtering
export const STOCK_RANGES = [
  { label: 'Out of Stock', min: 0, max: 0 },
  { label: 'Low Stock (1-10)', min: 1, max: 10 },
  { label: 'Medium Stock (11-50)', min: 11, max: 50 },
  { label: 'High Stock (51+)', min: 51, max: Infinity },
] as const;

export type StockRange = typeof STOCK_RANGES[number];

// Sort options
export const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'productDetails', label: 'Product Name' },
  { value: 'stockLevel', label: 'Stock Level' },
  { value: 'category', label: 'Category' },
  { value: 'supplier', label: 'Supplier' },
] as const;

export type SortOption = typeof SORT_OPTIONS[number]['value'];