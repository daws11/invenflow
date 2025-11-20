import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { onInventoryEvent, type InventoryEventPayload } from "./inventoryEvents";

type WebSocketWithHeartbeat = WebSocket & { isAlive?: boolean };

let isInitialized = false;

const serializeEvent = (event: InventoryEventPayload) =>
  JSON.stringify({
    ...event,
    // Ensure dates are serialized as ISO strings when included
    ...(event.type !== 'inventory:bulk-updated' && 'product' in event && event.product
      ? {
          product: {
            ...event.product,
            createdAt: event.product.createdAt
              ? new Date(event.product.createdAt).toISOString()
              : undefined,
            updatedAt: event.product.updatedAt
              ? new Date(event.product.updatedAt).toISOString()
              : undefined,
          },
        }
      : {}),
  });

const CACHE_TTL_MS = 5000;
const serializationCache = new Map<
  string,
  { payload: string; timeout: NodeJS.Timeout }
>();

const getSerializedPayload = (event: InventoryEventPayload): string => {
  const productId =
    'product' in event && event.product?.id ? event.product.id : 'bulk';
  const cacheKey = `${event.type}-${productId}`;
  const cached = serializationCache.get(cacheKey);
  if (cached) {
    clearTimeout(cached.timeout);
    cached.timeout = setTimeout(() => serializationCache.delete(cacheKey), CACHE_TTL_MS);
    return cached.payload;
  }

  const payload = serializeEvent(event);
  const timeout = setTimeout(() => serializationCache.delete(cacheKey), CACHE_TTL_MS);
  serializationCache.set(cacheKey, { payload, timeout });
  return payload;
};

export const initializeInventoryWebSocket = (server: Server) => {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const wss = new WebSocketServer({ server, path: "/ws/inventory" });

  const broadcast = (event: InventoryEventPayload) => {
    const payload = getSerializedPayload(event);
    wss.clients.forEach((client: WebSocketWithHeartbeat) => {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  };

  const unsubscribe = onInventoryEvent(broadcast);

  wss.on(
    "connection",
    (socket: WebSocketWithHeartbeat, request: IncomingMessage) => {
      const originProtocol =
        (request.headers["x-forwarded-proto"] as string | undefined) ?? "http";
      const host = request.headers.host ?? "localhost";
      const url = new URL(request.url ?? "", `${originProtocol}://${host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.close(1008, "Authentication required");
        return;
      }

      try {
        jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        console.error("[InventoryWebSocket] Invalid token", error);
        socket.close(1008, "Invalid token");
        return;
      }

      socket.isAlive = true;
      socket.on("pong", () => {
        socket.isAlive = true;
      });

      socket.send(
        JSON.stringify({
          type: "inventory:connected",
          timestamp: Date.now(),
        }),
      );
    },
  );

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client: WebSocketWithHeartbeat) => {
      const tracked = client as WebSocketWithHeartbeat;
      if (tracked.isAlive === false) {
        tracked.terminate();
        return;
      }
      tracked.isAlive = false;
      tracked.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    isInitialized = false;
  });

  console.log("📡 Inventory WebSocket initialized at /ws/inventory");
};

