import { env } from "../config/env";

const DEFAULT_ENDPOINTS = [
  "/api/kanbans",
  "/api/inventory",
  "/api/inventory/grouped",
  "/api/inventory/stats",
  "/api/locations",
  "/api/departments",
  "/api/persons",
];

const INVENTORY_FILTERS: Array<Record<string, string>> = [
  { columnStatus: "Stored" },
  { columnStatus: "Received" },
  { category: "Electronics" },
];

const BASE_URL =
  process.env.CACHE_WARM_BASE_URL || `http://127.0.0.1:${env.PORT}`;

// Optional JWT token used for warming protected endpoints that require auth
const CACHE_WARM_JWT = process.env.CACHE_WARM_JWT;

let warmTimer: NodeJS.Timeout | null = null;
let isRunning = false;

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // Attach Authorization header if a cache warm token is configured
    if (CACHE_WARM_JWT) {
      headers.Authorization = `Bearer ${CACHE_WARM_JWT}`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }
    await response.text(); // Drain body
  } finally {
    clearTimeout(timeout);
  }
};

const warmEndpoints = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const endpoints = DEFAULT_ENDPOINTS;
    for (const endpoint of endpoints) {
      const url = `${BASE_URL}${endpoint}`;
      try {
        await fetchWithTimeout(url, 10_000);
        console.log(`[CacheWarming] warmed ${endpoint}`);
      } catch (error) {
        console.warn(`[CacheWarming] failed to warm ${endpoint}`, error);
      }
    }

    for (const filter of INVENTORY_FILTERS) {
      const queryString = new URLSearchParams(filter).toString();
      const endpoint = `/api/inventory?${queryString}`;
      try {
        await fetchWithTimeout(`${BASE_URL}${endpoint}`, 10_000);
        console.log(`[CacheWarming] warmed ${endpoint}`);
      } catch (error) {
        console.warn(`[CacheWarming] failed to warm ${endpoint}`, error);
      }
    }
  } finally {
    isRunning = false;
  }
};

export const startCacheWarming = () => {
  if (!env.CACHE_ENABLED || warmTimer) {
    return;
  }

  // Perform initial warm shortly after server start
  setTimeout(() => {
    warmEndpoints().catch((error) =>
      console.error("[CacheWarming] initial warm failed", error),
    );
  }, 5_000);

  warmTimer = setInterval(() => {
    warmEndpoints().catch((error) =>
      console.error("[CacheWarming] scheduled warm failed", error),
    );
  }, env.CACHE_WARM_INTERVAL_MS);
  console.log(
    `[CacheWarming] started with interval ${env.CACHE_WARM_INTERVAL_MS}ms`,
  );
};

export const stopCacheWarming = () => {
  if (warmTimer) {
    clearInterval(warmTimer);
    warmTimer = null;
  }
};

