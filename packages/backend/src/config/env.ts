// Load dotenv configuration first
import './dotenv';

const toNumber = (value: string | undefined, fallback: number, min?: number) => {
  const parsed = parseInt(value || "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (typeof min === "number" && parsed < min) {
    return min;
  }
  return parsed;
};

export const env = {
  PORT: toNumber(process.env.PORT, 3001),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  STORED_SWEEP_ENABLED: process.env.STORED_SWEEP_ENABLED !== "false",
  STORED_SWEEP_INTERVAL_MINUTES: Math.max(
    1,
    toNumber(process.env.STORED_SWEEP_INTERVAL_MINUTES, 30),
  ),
  STORED_SWEEP_BATCH_LIMIT: Math.max(
    10,
    toNumber(process.env.STORED_SWEEP_BATCH_LIMIT, 100),
  ),
  CACHE_ENABLED: process.env.CACHE_ENABLED !== "false",
  CACHE_DEFAULT_TTL_MS: Math.max(
    1000,
    toNumber(process.env.CACHE_DEFAULT_TTL_MS, 5 * 60 * 1000),
  ),
  CACHE_TAG_TTL_MS: Math.max(
    5 * 60 * 1000,
    toNumber(process.env.CACHE_TAG_TTL_MS, 60 * 60 * 1000),
  ),
  CACHE_MAX_KEYS: Math.max(100, toNumber(process.env.CACHE_MAX_KEYS, 10_000)),
  CACHE_WARM_INTERVAL_MS: Math.max(
    60 * 1000,
    toNumber(process.env.CACHE_WARM_INTERVAL_MS, 5 * 60 * 1000),
  ),
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: Math.max(1, toNumber(process.env.REDIS_PORT, 6379)),
  REDIS_USERNAME: process.env.REDIS_USERNAME || undefined,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_TLS: process.env.REDIS_TLS === "true",
  REDIS_POOL_MIN: Math.max(1, toNumber(process.env.REDIS_POOL_MIN, 2)),
  REDIS_POOL_MAX: Math.max(2, toNumber(process.env.REDIS_POOL_MAX, 10)),
};
