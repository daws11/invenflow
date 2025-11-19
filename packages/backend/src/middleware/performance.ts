import { Request, Response, NextFunction } from 'express';
import { getCacheStats } from './cache';
import { getConnectionStats } from '../db';

interface PerformanceMetrics {
  timestamp: number;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  userAgent?: string;
  ip?: string;
}

interface SlowQueryLog {
  timestamp: number;
  query: string;
  duration: number;
  params?: any;
  stack?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private slowQueries: SlowQueryLog[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests
  private readonly maxSlowQueries = 100; // Keep last 100 slow queries
  private readonly slowQueryThreshold = 1000; // 1 second

  logRequest(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests
    if (metric.responseTime > this.slowQueryThreshold) {
      console.warn(`🐌 Slow request: ${metric.method} ${metric.url} - ${metric.responseTime}ms`);
    }

    // Log error responses
    if (metric.statusCode >= 400) {
      console.error(`❌ Error response: ${metric.method} ${metric.url} - ${metric.statusCode} (${metric.responseTime}ms)`);
    }
  }

  logSlowQuery(log: SlowQueryLog) {
    this.slowQueries.push(log);
    
    // Keep only recent slow queries
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries = this.slowQueries.slice(-this.maxSlowQueries);
    }

    console.warn(`🐌 Slow query: ${log.duration}ms - ${log.query.substring(0, 100)}...`);
  }

  getMetrics() {
    const now = Date.now();
    const last5Minutes = now - (5 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > last5Minutes);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        requestsPerMinute: 0,
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const slowRequests = recentMetrics.filter(m => m.responseTime > this.slowQueryThreshold).length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;
    const requestsPerMinute = (totalRequests / 5); // 5-minute window

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerMinute: Math.round(requestsPerMinute),
    };
  }

  getSlowQueries() {
    return this.slowQueries.slice(-10); // Return last 10 slow queries
  }

  getSystemStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}

const performanceMonitor = new PerformanceMonitor();

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Capture original end method
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Log performance metrics
    const metric: PerformanceMetrics = {
      timestamp: endTime,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      memoryUsage: endMemory,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };

    performanceMonitor.logRequest(metric);

    // Add performance headers (pastikan header belum terkirim)
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      res.setHeader('X-Memory-Usage', `${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`);
    }

    // Call original end method with proper typing
    return originalEnd(chunk, encoding as BufferEncoding, cb);
  };

  next();
};

// Slow query logging utility
export const logSlowQuery = (query: string, duration: number, params?: any) => {
  if (duration > 1000) { // Log queries slower than 1 second
    performanceMonitor.logSlowQuery({
      timestamp: Date.now(),
      query,
      duration,
      params,
      stack: new Error().stack,
    });
  }
};

// Performance stats endpoint
export const getPerformanceStats = async () => {
  const requestMetrics = performanceMonitor.getMetrics();
  const systemStats = performanceMonitor.getSystemStats();
  const slowQueries = performanceMonitor.getSlowQueries();
  const cacheStats = await getCacheStats();
  const dbStats = getConnectionStats();

  return {
    timestamp: new Date().toISOString(),
    requests: requestMetrics,
    system: systemStats,
    database: dbStats,
    cache: cacheStats,
    slowQueries: slowQueries.map(q => ({
      timestamp: new Date(q.timestamp).toISOString(),
      query: q.query.substring(0, 200) + (q.query.length > 200 ? '...' : ''),
      duration: q.duration,
    })),
  };
};

// Health check with performance data
export const healthCheckWithPerformance = async () => {
  const stats = await getPerformanceStats();
  const isHealthy = stats.system.memory.used < 500 && // Less than 500MB
                   stats.requests.errorRate < 10 && // Less than 10% error rate
                   stats.requests.averageResponseTime < 2000; // Less than 2s average

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: stats.timestamp,
    uptime: stats.system.uptime,
    memory: stats.system.memory,
    performance: {
      averageResponseTime: stats.requests.averageResponseTime,
      requestsPerMinute: stats.requests.requestsPerMinute,
      errorRate: stats.requests.errorRate,
    },
    cache: {
      hitRate: stats.cache.hits > 0 ? 
        Math.round((stats.cache.hits / (stats.cache.hits + stats.cache.misses)) * 100) : 0,
      size: stats.cache.keys,
    },
  };
};

// Periodic performance logging
let performanceLogInterval: NodeJS.Timeout | null = null;

export const startPerformanceLogging = (intervalMs = 60000) => { // Default: 1 minute
  if (performanceLogInterval) {
    clearInterval(performanceLogInterval);
  }

  performanceLogInterval = setInterval(async () => {
    const stats = await getPerformanceStats();
    console.log('📊 Performance Stats:', {
      requests: stats.requests,
      memory: `${stats.system.memory.used}MB / ${stats.system.memory.total}MB`,
      uptime: `${Math.floor(stats.system.uptime / 60)}m`,
      cache: `${stats.cache.hits} hits, ${stats.cache.misses} misses`,
    });
  }, intervalMs);
};

export const stopPerformanceLogging = () => {
  if (performanceLogInterval) {
    clearInterval(performanceLogInterval);
    performanceLogInterval = null;
  }
};

// Graceful shutdown
process.on('SIGINT', stopPerformanceLogging);
process.on('SIGTERM', stopPerformanceLogging);

export { performanceMonitor };
