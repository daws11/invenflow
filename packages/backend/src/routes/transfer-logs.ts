import { Router } from 'express';
import { db } from '../db';
import { transferLogs, products, kanbans, locations } from '../db/schema';
import { eq, desc, and, isNotNull, gte, lte } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get transfer logs with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      productId,
      fromKanbanId,
      toKanbanId,
      transferType,
      limit = '50',
      offset = '0',
      startDate,
      endDate,
    } = req.query;

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    let whereConditions = [];

    if (productId) {
      whereConditions.push(eq(transferLogs.productId, productId as string));
    }

    if (fromKanbanId) {
      whereConditions.push(eq(transferLogs.fromKanbanId, fromKanbanId as string));
    }

    if (toKanbanId) {
      whereConditions.push(eq(transferLogs.toKanbanId, toKanbanId as string));
    }

    if (transferType) {
      whereConditions.push(eq(transferLogs.transferType, transferType as string));
    }

    if (startDate) {
      whereConditions.push(gte(transferLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(transferLogs.createdAt, new Date(endDate as string)));
    }

    // Note: Drizzle doesn't support table aliasing well in joins
    // We'll do a simpler approach and join locations twice with different aliases
    const logs = await db
      .select({
        // Transfer log fields
        id: transferLogs.id,
        productId: transferLogs.productId,
        fromKanbanId: transferLogs.fromKanbanId,
        toKanbanId: transferLogs.toKanbanId,
        fromColumn: transferLogs.fromColumn,
        toColumn: transferLogs.toColumn,
        fromLocationId: transferLogs.fromLocationId,
        toLocationId: transferLogs.toLocationId,
        transferType: transferLogs.transferType,
        notes: transferLogs.notes,
        transferredBy: transferLogs.transferredBy,
        createdAt: transferLogs.createdAt,
      })
      .from(transferLogs)
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      )
      .orderBy(desc(transferLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Enrich with related data
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, log.productId))
          .limit(1);

        const [fromKanban] = await db
          .select()
          .from(kanbans)
          .where(eq(kanbans.id, log.fromKanbanId))
          .limit(1);

        const [toKanban] = await db
          .select()
          .from(kanbans)
          .where(eq(kanbans.id, log.toKanbanId))
          .limit(1);

        const [fromLocation] = log.fromLocationId
          ? await db.select().from(locations).where(eq(locations.id, log.fromLocationId!)).limit(1)
          : [null];

        const [toLocation] = log.toLocationId
          ? await db.select().from(locations).where(eq(locations.id, log.toLocationId!)).limit(1)
          : [null];

        return {
          ...log,
          product: product || null,
          fromKanban: fromKanban || null,
          toKanban: toKanban || null,
          fromLocation: fromLocation || null,
          toLocation: toLocation || null,
        };
      })
    );

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Get transfer logs by product ID
router.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    const logs = await db
      .select()
      .from(transferLogs)
      .where(eq(transferLogs.productId, productId))
      .orderBy(desc(transferLogs.createdAt));

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Get transfer logs by kanban ID
router.get('/kanban/:kanbanId', async (req, res, next) => {
  try {
    const { kanbanId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const logs = await db
      .select()
      .from(transferLogs)
      .where(eq(transferLogs.fromKanbanId, kanbanId))
      .orderBy(desc(transferLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Create transfer log
router.post('/', async (req, res, next) => {
  try {
    const {
      productId,
      fromKanbanId,
      toKanbanId,
      fromColumn,
      toColumn,
      transferType,
      notes,
      transferredBy,
    } = req.body;

    if (!productId || !fromKanbanId || !toKanbanId || !fromColumn || !toColumn || !transferType) {
      throw createError('Missing required fields', 400);
    }

    const newTransferLog = {
      productId,
      fromKanbanId,
      toKanbanId,
      fromColumn,
      toColumn,
      transferType,
      notes: notes || null,
      transferredBy: transferredBy || null,
    };

    const [createdLog] = await db
      .insert(transferLogs)
      .values(newTransferLog)
      .returning();

    res.status(201).json(createdLog);
  } catch (error) {
    next(error);
  }
});

// Get transfer statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(transferLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(transferLogs.createdAt, new Date(endDate as string)));
    }

    const stats = await db
      .select({
        totalTransfers: { count: transferLogs.id },
        automaticTransfers: { count: transferLogs.id },
        manualTransfers: { count: transferLogs.id },
      })
      .from(transferLogs)
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      );

    // Get transfers by type
    const transfersByType = await db
      .select({
        transferType: transferLogs.transferType,
        count: { count: transferLogs.id },
      })
      .from(transferLogs)
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      )
      .groupBy(transferLogs.transferType);

    // Get most active kanbans
    const activeKanbans = await db
      .select({
        kanbanId: transferLogs.fromKanbanId,
        kanbanName: kanbans.name,
        transferCount: { count: transferLogs.id },
      })
      .from(transferLogs)
      .leftJoin(kanbans, eq(transferLogs.fromKanbanId, kanbans.id))
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      )
      .groupBy(transferLogs.fromKanbanId, kanbans.name)
      .orderBy(desc({ count: transferLogs.id }))
      .limit(10);

    res.json({
      totalTransfers: stats[0]?.totalTransfers || 0,
      transfersByType,
      activeKanbans,
    });
  } catch (error) {
    next(error);
  }
});

export { router as transferLogsRouter };