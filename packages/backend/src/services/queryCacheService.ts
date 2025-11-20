import { cacheService } from "./cacheService";

export interface QueryCacheOptions {
  ttlMs?: number;
  tags?: string[];
}

export class QueryCacheService {
  async cacheAggregation<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {},
  ): Promise<T> {
    const ttlMs = options.ttlMs ?? 600_000;
    const tags = options.tags ?? ["aggregation"];

    const cached = await cacheService.get(key);
    if (cached) {
      return cached.body as T;
    }

    const result = await queryFn();

    await cacheService.set({
      key,
      body: result,
      ttlMs,
      tags,
      statusCode: 200,
      etag: cacheService.generateEtag(result),
    });

    return result;
  }
}

export const queryCacheService = new QueryCacheService();

