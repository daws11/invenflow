import { createPool, type Pool } from "generic-pool";
import Redis, { type RedisOptions } from "ioredis";
import { env } from "./env";

export type RedisHealthStatus =
  | { status: "disabled" }
  | { status: "ok"; latencyMs: number }
  | { status: "error"; message: string };

const logPrefix = "[Redis]";

class RedisManager {
  private pool: Pool<Redis> | null = null;
  private healthy = false;
  private lastError?: string;

  constructor() {
    if (!env.CACHE_ENABLED) {
      console.warn(
        `${logPrefix} Cache is disabled via CACHE_ENABLED=false. Redis will not be used.`,
      );
      return;
    }

    this.pool = createPool<Redis>(
      {
        create: async () => {
          const client = this.createClient();
          client.on("error", (error) => this.handleError(error));
          client.on("ready", () => {
            this.healthy = true;
            console.log(`${logPrefix} connection ready`);
          });
          try {
            await client.connect();
          } catch (error) {
            this.handleError(error as Error);
            throw error;
          }
          return client;
        },
        destroy: async (client) => {
          try {
            await client.quit();
          } catch (error) {
            console.error(`${logPrefix} error closing client`, error);
          }
        },
        validate: async (client) => {
          try {
            await client.ping();
            return true;
          } catch {
            return false;
          }
        },
      },
      {
        min: env.REDIS_POOL_MIN,
        max: env.REDIS_POOL_MAX,
        testOnBorrow: true,
        acquireTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        fifo: true,
      },
    );

    this.pool.on("factoryCreateError", (error) => this.handleError(error));
    this.pool.on("factoryDestroyError", (error) => this.handleError(error));
  }

  private createClient(): Redis {
    const baseOptions: RedisOptions = {
      lazyConnect: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 2,
      connectionName: `invenflow-cache-${env.NODE_ENV}`,
      connectTimeout: 10_000,
      showFriendlyErrorStack: env.NODE_ENV !== "production",
    };

    if (env.REDIS_TLS) {
      baseOptions.tls = {};
    }

    if (env.REDIS_URL) {
      return new Redis(env.REDIS_URL, baseOptions);
    }

    return new Redis({
      ...baseOptions,
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      username: env.REDIS_USERNAME,
      password: env.REDIS_PASSWORD,
    });
  }

  private handleError(error: Error): void {
    this.healthy = false;
    this.lastError = error.message;
    console.error(`${logPrefix} error`, error);
  }

  isEnabled(): boolean {
    return Boolean(env.CACHE_ENABLED && this.pool);
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  async use<T>(fn: (client: Redis) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error("Redis pool not initialized");
    }

    const client = await this.pool.acquire();
    try {
      return await fn(client);
    } finally {
      this.pool.release(client);
    }
  }

  async healthCheck(): Promise<RedisHealthStatus> {
    if (!this.pool) {
      return { status: "disabled" };
    }

    try {
      const start = Date.now();
      await this.use(async (client) => {
        await client.ping();
      });
      const latencyMs = Date.now() - start;
      this.healthy = true;
      return { status: "ok", latencyMs };
    } catch (error) {
      this.handleError(error as Error);
      return {
        status: "error",
        message: (error as Error).message,
      };
    }
  }

  async shutdown(): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.drain();
    await this.pool.clear();
    this.pool = null;
    this.healthy = false;
    console.log(`${logPrefix} pool drained`);
  }
}

export const redisManager = new RedisManager();

