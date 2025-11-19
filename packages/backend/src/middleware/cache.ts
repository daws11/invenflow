import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { cacheService } from "../services/cacheService";
import {
  buildTag,
  type CacheTagDescriptor,
} from "../utils/cacheInvalidation";

interface CacheMiddlewareOptions {
  ttl?: number;
  enabled?: boolean;
  sharedAcrossUsers?: boolean;
  varyByHeaders?: string[];
  tags?: CacheTagDescriptor[];
  buildTags?: (req: Request) => CacheTagDescriptor[];
}

type CachedUser = {
  id?: string;
  role?: string;
};

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item)).sort();
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeValue(
          (value as Record<string, unknown>)[key],
        );
        return acc;
      }, {});
  }

  return value;
};

const extractUser = (req: Request): CachedUser | undefined => {
  const candidate = (req as Request & { user?: CachedUser }).user;
  if (!candidate) {
    return undefined;
  }
  return { id: candidate.id, role: candidate.role };
};

const calculateCacheKey = (
  req: Request,
  sharedAcrossUsers: boolean,
  varyHeaders: string[],
) => {
  const user = extractUser(req);
  const userKey = sharedAcrossUsers ? "shared" : user?.id ?? "anonymous";
  const headerValues = varyHeaders.reduce<Record<string, string | string[] | undefined>>(
    (acc, header) => {
      acc[header] = req.headers[header];
      return acc;
    },
    {},
  );

  return cacheService.generateKey({
    method: req.method,
    url: req.baseUrl + (req.path || ""),
    query: normalizeValue(req.query),
    body: req.method === "GET" ? undefined : normalizeValue(req.body),
    user: userKey,
    headers: normalizeValue(headerValues),
  });
};

const setCachingHeaders = (
  res: Response,
  {
    ttl,
    etag,
    tags,
    cacheState,
    varyHeaders,
    storedAt,
    remainingTtlMs,
  }: {
    ttl: number;
    etag: string;
    tags: string[];
    cacheState: "HIT" | "MISS";
    varyHeaders: string[];
    storedAt?: number;
    remainingTtlMs?: number;
  },
) => {
  const ttlSeconds = Math.max(1, Math.floor(ttl / 1000));
  const remainingSeconds =
    remainingTtlMs && remainingTtlMs > 0
      ? Math.max(1, Math.floor(remainingTtlMs / 1000))
      : ttlSeconds;

  res.setHeader(
    "Cache-Control",
    `public, max-age=${ttlSeconds}, must-revalidate`,
  );
  res.setHeader("ETag", etag);
  res.setHeader("X-Cache", cacheState);
  res.setHeader("X-Cache-TTL", remainingSeconds.toString());

  if (tags.length) {
    res.setHeader("X-Cache-Tags", tags.join(","));
  }

  if (varyHeaders.length) {
    res.setHeader(
      "Vary",
      Array.from(new Set(varyHeaders.map((header) => header.toLowerCase()))).join(", "),
    );
  }

  if (storedAt) {
    res.setHeader("Last-Modified", new Date(storedAt).toUTCString());
  }
};

export const cacheMiddleware = (options?: CacheMiddlewareOptions) => {
  const ttl = options?.ttl ?? env.CACHE_DEFAULT_TTL_MS;
  const sharedAcrossUsers = options?.sharedAcrossUsers ?? false;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || !env.CACHE_ENABLED) {
      return next();
    }

    if (options?.enabled === false) {
      return next();
    }

    if (req.headers["cache-control"] === "no-cache") {
      return next();
    }

    const varyHeaders = [...(options?.varyByHeaders ?? [])];
    if (!sharedAcrossUsers) {
      varyHeaders.push("authorization");
    }

    const descriptorTags = [
      ...(options?.tags ?? []),
      ...(options?.buildTags ? options.buildTags(req) : []),
    ];
    const tags = descriptorTags.map((descriptor) =>
      buildTag(descriptor.resource, descriptor.id),
    );

    const cacheKey = calculateCacheKey(req, sharedAcrossUsers, varyHeaders);

    try {
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && ifNoneMatch === cached.etag) {
          setCachingHeaders(res, {
            ttl,
            etag: cached.etag,
            tags: cached.tags,
            cacheState: "HIT",
            varyHeaders,
            storedAt: cached.storedAt,
            remainingTtlMs: Math.max(0, cached.ttlMs - (Date.now() - cached.storedAt)),
          });
          return res.status(304).end();
        }

        setCachingHeaders(res, {
          ttl,
          etag: cached.etag,
          tags: cached.tags,
          cacheState: "HIT",
          varyHeaders,
          storedAt: cached.storedAt,
          remainingTtlMs: Math.max(0, cached.ttlMs - (Date.now() - cached.storedAt)),
        });
        return res.status(cached.statusCode).json(cached.body);
      }

      const originalJson = res.json.bind(res);

      res.json = (body: unknown) => {
        const statusCode = res.statusCode;

        if (statusCode >= 200 && statusCode < 300) {
          const etag = cacheService.generateEtag(body);
          const storedAt = Date.now();
          setCachingHeaders(res, {
            ttl,
            etag,
            tags,
            cacheState: "MISS",
            varyHeaders,
            storedAt,
          });

          cacheService
            .set({
              key: cacheKey,
              body,
              ttlMs: ttl,
              tags,
              statusCode,
              headers: {},
              etag,
              storedAt,
            })
            .catch((error) =>
              console.error("[CacheMiddleware] Failed to cache response", error),
            );
        }

        return originalJson(body);
      };

      return next();
    } catch (error) {
      console.error("[CacheMiddleware] Error while handling cache", error);
      return next();
    }
  };
};

export const getCacheStats = async () => {
  return cacheService.getStats();
};
