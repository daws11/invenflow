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
  await cacheService.deleteByTags(tags);
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
  const descriptors: CacheTagDescriptor[] = [{ resource: "kanban" }];

  if (id !== undefined && id !== null && id !== "") {
    descriptors.push({ resource: "kanban", id });
  }

  await invalidateResources(descriptors);
};

