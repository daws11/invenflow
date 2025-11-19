import crypto from "crypto";
import type { Redis } from "ioredis";
import { env } from "../config/env";
import { redisManager } from "../config/redis";

interface CacheRecord {
  body: unknown;
  statusCode: number;
  headers?: Record<string, string>;
  etag: string;
  storedAt: number;
  ttlMs: number;
  tags: string[];
}

export interface CacheSetPayload {
  key: string;
  body: unknown;
  ttlMs: number;
  tags: string[];
  statusCode: number;
  headers?: Record<string, string>;
  etag: string;
  storedAt?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  keys: number;
  tags: number;
  healthy: boolean;
  lastError?: string;
  usedMemoryBytes?: number;
}

const KEY_PREFIX = "cache:http:";
const TAG_PREFIX = "cache:tag:";
const STATS_KEY = "cache:stats";

class CacheService {
  private getKey(key: string): string {
    return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
  }

  private getTagKey(tag: string): string {
    return `${TAG_PREFIX}${tag}`;
  }

  generateKey(parts: Record<string, unknown>): string {
    const serialized = JSON.stringify(parts);
    return crypto.createHash("sha1").update(serialized).digest("hex");
  }

  generateEtag(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    return crypto.createHash("sha1").update(serialized).digest("hex");
  }

  async get(key: string): Promise<CacheRecord | null> {
    return this.withRedis(async (client) => {
      const cached = await client.get(this.getKey(key));
      if (!cached) {
        await client.hincrby(STATS_KEY, "misses", 1);
        return null;
      }

      await client.hincrby(STATS_KEY, "hits", 1);
      return JSON.parse(cached) as CacheRecord;
    }, null);
  }

  async set(payload: CacheSetPayload): Promise<void> {
    await this.withRedis(async (client) => {
      const record: CacheRecord = {
        body: payload.body,
        statusCode: payload.statusCode,
        headers: payload.headers,
        etag: payload.etag,
        storedAt: payload.storedAt ?? Date.now(),
        ttlMs: payload.ttlMs,
        tags: [...new Set(payload.tags)],
      };

      const key = this.getKey(payload.key);
      await client.set(key, JSON.stringify(record), "PX", payload.ttlMs);

      if (record.tags.length) {
        const tagPipeline = client.pipeline();
        record.tags.forEach((tag) => {
          const tagKey = this.getTagKey(tag);
          tagPipeline.sadd(tagKey, key);
          tagPipeline.pexpire(
            tagKey,
            Math.max(env.CACHE_TAG_TTL_MS, payload.ttlMs),
          );
        });
        await tagPipeline.exec();
      }

      await client.hincrby(STATS_KEY, "sets", 1);
    });
  }

  async delete(key: string): Promise<number> {
    return this.withRedis(async (client) => {
      const deleted = await client.del(this.getKey(key));
      if (deleted) {
        await client.hincrby(STATS_KEY, "deletes", deleted);
      }
      return deleted;
    }, 0);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    return this.withRedis(async (client) => {
      let cursor = "0";
      let deleted = 0;
      const matchPattern = `${this.getKey(
        pattern.endsWith("*") ? pattern : `${pattern}*`,
      )}`;

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          matchPattern,
          "COUNT",
          200,
        );
        cursor = nextCursor;
        if (keys.length) {
          deleted += await client.del(...keys);
        }
      } while (cursor !== "0");

      if (deleted) {
        await client.hincrby(STATS_KEY, "deletes", deleted);
      }

      return deleted;
    }, 0);
  }

  async deleteByTags(tags: string[]): Promise<number> {
    const uniqueTags = [...new Set(tags)].filter(Boolean);
    if (!uniqueTags.length) {
      return 0;
    }

    return this.withRedis(async (client) => {
      let totalDeleted = 0;
      for (const tag of uniqueTags) {
        const tagKey = this.getTagKey(tag);
        const members = await client.smembers(tagKey);
        if (members.length) {
          totalDeleted += await client.del(...members);
        }
        await client.del(tagKey);
      }

      if (totalDeleted) {
        await client.hincrby(STATS_KEY, "deletes", totalDeleted);
      }

      return totalDeleted;
    }, 0);
  }

  async getStats(): Promise<CacheStats> {
    return this.withRedis(async (client) => {
      const stats = await client.hgetall(STATS_KEY);
      const hits = Number(stats.hits ?? 0);
      const misses = Number(stats.misses ?? 0);
      const sets = Number(stats.sets ?? 0);
      const deletes = Number(stats.deletes ?? 0);
      const keys = await this.countKeys(client, KEY_PREFIX);
      const tagKeys = await this.countKeys(client, TAG_PREFIX);
      const usedMemoryBytes = await this.getUsedMemory(client);

      return {
        hits,
        misses,
        sets,
        deletes,
        keys,
        tags: tagKeys,
        usedMemoryBytes,
        healthy: redisManager.isHealthy(),
        lastError: redisManager.getLastError(),
      };
    }, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      keys: 0,
      tags: 0,
      usedMemoryBytes: 0,
      healthy: false,
      lastError: redisManager.getLastError(),
    });
  }

  private async countKeys(client: Redis, prefix: string): Promise<number> {
    let cursor = "0";
    let count = 0;
    const match = `${prefix}*`;

    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        match,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== "0");

    return count;
  }

  private async getUsedMemory(client: Redis): Promise<number | undefined> {
    const info = await client.info("memory");
    const line = info
      .split("\n")
      .find((entry) => entry.startsWith("used_memory:"));

    if (!line) {
      return undefined;
    }

    const [, value] = line.split(":");
    return Number(value);
  }

  private async withRedis<T>(
    fn: (client: Redis) => Promise<T>,
    fallback?: T,
  ): Promise<T> {
    if (!redisManager.isEnabled()) {
      return fallback as T;
    }

    try {
      return await redisManager.use(fn);
    } catch (error) {
      console.error("[CacheService] Redis operation failed", error);
      return fallback as T;
    }
  }
}

export const cacheService = new CacheService();

