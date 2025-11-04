import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute(sql`select 1`);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Server is running',
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as healthRouter };
