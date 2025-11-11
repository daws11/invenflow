import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private generateKey(req: Request): string {
    const { method, originalUrl, query, body } = req;
    
    // Create a stable key from request parameters
    const keyParts = [
      method,
      originalUrl,
      JSON.stringify(query),
      // Only include body for POST requests to avoid large cache keys
      method === 'POST' ? JSON.stringify(body) : ''
    ];
    
    return keyParts.join('|');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.size = this.cache.size;
    
    if (deletedCount > 0) {
      console.log(`Cache cleanup: removed ${deletedCount} expired entries, ${this.cache.size} remaining`);
    }
  }

  private evictOldest(): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries (simple FIFO eviction)
      const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxSize * 0.1));
      
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.stats.deletes++;
      });
      
      console.log(`Cache eviction: removed ${keysToDelete.length} entries to make space`);
    }
  }

  get(req: Request): any | null {
    const key = this.generateKey(req);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  set(req: Request, data: any, ttl: number): void {
    const key = this.generateKey(req);
    
    // Evict old entries if cache is full
    this.evictOldest();

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  delete(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.stats.deletes += this.stats.size;
      this.stats.size = 0;
      return;
    }

    // Delete entries matching pattern
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    this.stats.size = this.cache.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Global cache instance
const globalCache = new InMemoryCache(2000); // Increased size for production

// Cache configuration for different endpoints
const CACHE_CONFIG = {
  '/api/inventory': { ttl: 2 * 60 * 1000, enabled: true }, // 2 minutes
  '/api/inventory/grouped': { ttl: 5 * 60 * 1000, enabled: true }, // 5 minutes
  '/api/inventory/stats': { ttl: 10 * 60 * 1000, enabled: true }, // 10 minutes
  '/api/locations': { ttl: 15 * 60 * 1000, enabled: true }, // 15 minutes
  '/api/kanbans': { ttl: 10 * 60 * 1000, enabled: true }, // 10 minutes
  '/api/departments': { ttl: 30 * 60 * 1000, enabled: true }, // 30 minutes
  '/api/persons': { ttl: 15 * 60 * 1000, enabled: true }, // 15 minutes
} as const;

export const cacheMiddleware = (options?: { 
  ttl?: number; 
  enabled?: boolean;
  skipCache?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if explicitly disabled
    if (options?.enabled === false || options?.skipCache) {
      return next();
    }

    // Get cache configuration for this endpoint
    const endpoint = req.route?.path ? req.baseUrl + req.route.path : req.originalUrl;
    const config = CACHE_CONFIG[endpoint as keyof typeof CACHE_CONFIG] || { ttl: 5 * 60 * 1000, enabled: true };
    
    // Use provided TTL or default from config
    const ttl = options?.ttl || config.ttl;
    
    // Skip if caching is disabled for this endpoint
    if (!config.enabled) {
      return next();
    }

    // Skip caching if client requests fresh data
    if (req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    try {
      // Try to get cached response
      const cachedData = globalCache.get(req);
      
      if (cachedData) {
        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', Math.floor(ttl / 1000).toString());
        return res.json(cachedData);
      }

      // Cache miss - intercept response to cache it
      const originalJson = res.json;
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          globalCache.set(req, data, ttl);
        }
        
        // Add cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-TTL', Math.floor(ttl / 1000).toString());
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

// Cache invalidation helper
export const invalidateCache = (pattern?: string) => {
  globalCache.delete(pattern);
};

// Cache statistics endpoint
export const getCacheStats = () => {
  return globalCache.getStats();
};

// Graceful shutdown
process.on('SIGINT', () => {
  globalCache.destroy();
});

process.on('SIGTERM', () => {
  globalCache.destroy();
});

export { globalCache };
