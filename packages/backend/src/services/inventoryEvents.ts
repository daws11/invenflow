import { EventEmitter } from "node:events";
import { products } from "../db/schema";

const INVENTORY_EVENT_ALL = "inventory:event";

export const INVENTORY_EVENTS = {
  PRODUCT_CREATED: "inventory:product-created",
  PRODUCT_UPDATED: "inventory:product-updated",
  PRODUCT_DELETED: "inventory:product-deleted",
  PRODUCT_MOVED: "inventory:product-moved",
  STOCK_CHANGED: "inventory:stock-changed",
  LOCATION_CHANGED: "inventory:location-changed",
  BULK_UPDATED: "inventory:bulk-updated",
  ALL: INVENTORY_EVENT_ALL,
} as const;

export type InventoryEventName =
  | typeof INVENTORY_EVENTS.PRODUCT_CREATED
  | typeof INVENTORY_EVENTS.PRODUCT_UPDATED
  | typeof INVENTORY_EVENTS.PRODUCT_DELETED
  | typeof INVENTORY_EVENTS.PRODUCT_MOVED
  | typeof INVENTORY_EVENTS.STOCK_CHANGED
  | typeof INVENTORY_EVENTS.LOCATION_CHANGED
  | typeof INVENTORY_EVENTS.BULK_UPDATED;

export interface InventoryEventContext {
  userId?: string;
  kanbanId?: string | null;
  source?: "api" | "system" | "websocket" | string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

type ProductRecord = typeof products.$inferSelect;

export interface InventoryEventBase<TType extends InventoryEventName> {
  type: TType;
  timestamp: number;
  context?: InventoryEventContext;
}

export type InventoryEventPayload =
  | (InventoryEventBase<typeof INVENTORY_EVENTS.PRODUCT_CREATED> & {
      product: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.PRODUCT_UPDATED> & {
      productId: string;
      changes: Partial<ProductRecord>;
      product?: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.PRODUCT_DELETED> & {
      productId: string;
      product?: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.PRODUCT_MOVED> & {
      productId: string;
      fromStatus?: string | null;
      toStatus: string;
      product?: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.STOCK_CHANGED> & {
      productId: string;
      stockLevel: number | null;
      delta?: number | null;
      product?: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.LOCATION_CHANGED> & {
      productId: string;
      fromLocationId?: string | null;
      toLocationId?: string | null;
      product?: ProductRecord;
    })
  | (InventoryEventBase<typeof INVENTORY_EVENTS.BULK_UPDATED> & {
      productIds: string[];
      changes?: Partial<ProductRecord>;
      products?: ProductRecord[];
    });

class InventoryEventEmitter extends EventEmitter {}

export const inventoryEventEmitter = new InventoryEventEmitter();
inventoryEventEmitter.setMaxListeners(0);

export const emitInventoryEvent = (
  payload: Omit<InventoryEventPayload, "timestamp">,
) => {
  const enriched: InventoryEventPayload = {
    ...payload,
    timestamp: Date.now(),
  } as InventoryEventPayload;

  inventoryEventEmitter.emit(payload.type, enriched);
  inventoryEventEmitter.emit(INVENTORY_EVENT_ALL, enriched);
};

export const onInventoryEvent = (
  handler: (payload: InventoryEventPayload) => void,
) => {
  inventoryEventEmitter.on(INVENTORY_EVENT_ALL, handler);
  return () => {
    inventoryEventEmitter.off(INVENTORY_EVENT_ALL, handler);
  };
};

