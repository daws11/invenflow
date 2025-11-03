import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

export { router as healthRouter };