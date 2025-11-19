import { cacheService } from "../services/cacheService";

export const CACHE_TAGS = {
  inventory: "inventory",
  inventoryStats: "inventory-stats",
  product: "product",
  sku: "sku",
  kanban: "kanban",
  location: "location",
  department: "department",
  person: "person",
  transferLog: "transfer-log",
} as const;

export type CacheTagResource = keyof typeof CACHE_TAGS;

export interface CacheTagDescriptor {
  resource: CacheTagResource;
  id?: string | number | null;
}

export const buildTag = (resource: CacheTagResource, id?: string | number | null): string => {
  const normalizedId =
    id === null || id === undefined || id === "" ? "*" : String(id);
  const prefix = CACHE_TAGS[resource];
  return `${prefix}:${normalizedId}`;
};

export const invalidateResource = async (
  resource: CacheTagResource,
  id?: string | number | null,
) => {
  const tag = buildTag(resource, id);
  await cacheService.deleteByTags([tag]);
};

export const invalidateResources = async (descriptors: CacheTagDescriptor[]) => {
  const tags = descriptors.map((descriptor) => buildTag(descriptor.resource, descriptor.id));
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheInvalidation] Deleting by tags:`, tags);
  }
  const deletedCount = await cacheService.deleteByTags(tags);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheInvalidation] Deleted ${deletedCount} cache entries`);
  }
  return deletedCount;
};

export const invalidateInventoryCaches = async (
  additionalDescriptors: CacheTagDescriptor[] = [],
) => {
  await invalidateResources([
    { resource: "inventory" },
    { resource: "inventoryStats" },
    ...additionalDescriptors,
  ]);
};

export const invalidateInventoryViews = async () => {
  await invalidateInventoryCaches();
};

export const invalidateKanbanCache = async (id?: string | number | null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheInvalidation] Invalidating kanban cache for id:`, id);
  }

  const descriptors: CacheTagDescriptor[] = [{ resource: "kanban" }];

  if (id !== undefined && id !== null && id !== "") {
    descriptors.push({ resource: "kanban", id });
  }

  // For kanban operations, we want to be aggressive and clear all kanban-related caches
  // This ensures that both list views and individual kanban views are updated
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheInvalidation] Invalidating descriptors:`, descriptors);
  }

  let invalidated = await invalidateResources(descriptors);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CacheInvalidation] Cache invalidation completed, invalidated entries:`, invalidated);
  }

  // As a fallback, also try to delete all HTTP cache entries that might be kanban-related
  // This handles cases where tag-based invalidation might miss some entries due to timing issues
  try {
    const { cacheService } = await import("../services/cacheService");
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheInvalidation] Attempting fallback cache cleanup for kanban`);
    }

    // Use pattern matching to catch HTTP cache entries for kanban endpoints
    // Pattern matches: /api/kanbans, /api/kanbans/:id, etc.
    const patternDeleted = await cacheService.deleteByPattern("http:GET:/api/kanbans");
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheInvalidation] Fallback deletion removed ${patternDeleted} additional entries`);
    }

    invalidated += patternDeleted;
  } catch (error) {
    console.error(`[CacheInvalidation] Error during fallback cleanup:`, error);
  }

  return invalidated;
};

