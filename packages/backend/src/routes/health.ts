import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getPerformanceStats, healthCheckWithPerformance } from '../middleware/performance';
import { checkDatabaseHealth } from '../db';
import { getCacheStats } from '../middleware/cache';
import { redisManager } from '../config/redis';

const router = Router();

// Enhanced health check with performance monitoring
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbHealthy = await checkDatabaseHealth();
    const performanceHealth = await healthCheckWithPerformance();
    const cacheStats = await getCacheStats();
    const redisHealth = await redisManager.healthCheck();
    
    const status =
      dbHealthy && performanceHealth.status === 'healthy' && redisHealth.status === 'ok'
        ? 'healthy'
        : 'degraded';
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Server is running',
      database: dbHealthy ? 'connected' : 'disconnected',
      performance: performanceHealth.performance,
      cache: {
        stats: cacheStats,
        redis: redisHealth,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed performance stats endpoint
router.get('/health/performance', (req, res) => {
  try {
    const stats = getPerformanceStats();
    res.json(stats);
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({
      error: 'Failed to get performance stats',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/health/cache', async (req, res) => {
  try {
    const [stats, redisHealth] = await Promise.all([
      getCacheStats(),
      redisManager.healthCheck(),
    ]);

    res.json({
      stats,
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache health error:', error);
    res.status(500).json({
      error: 'Failed to get cache health',
      timestamp: new Date().toISOString(),
    });
  }
});

// Simple ping endpoint for load balancer health checks
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'pong',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
