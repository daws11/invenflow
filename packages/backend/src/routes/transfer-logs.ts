import { Router } from 'express';
import { db } from '../db';
import { transferLogs, products, kanbans, locations } from '../db/schema';
import { eq, desc, and, isNotNull, gte, lte, sql, type SQL } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';

const router = Router();

const combineConditions = (conditions: SQL<unknown>[]): SQL<unknown> => {
  if (conditions.length === 0) {
    return sql`1 = 1`;
  }
  if (conditions.length === 1) {
    return conditions[0]!;
  }
  const combined = and(
    ...(conditions as [SQL<unknown>, SQL<unknown>, ...SQL<unknown>[]])
  );
  return combined ?? sql`1 = 1`;
};

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

    const whereConditions: SQL<unknown>[] = [];

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
      .where(combineConditions(whereConditions))
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

    const whereConditions: SQL<unknown>[] = [];

    if (startDate) {
      whereConditions.push(gte(transferLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(transferLogs.createdAt, new Date(endDate as string)));
    }

    const whereClause = combineConditions(whereConditions);

    const [stats] = await db
      .select({
        totalTransfers: sql<number>`count(*)`,
        automaticTransfers: sql<number>`sum(case when ${transferLogs.transferType} = 'automatic' then 1 else 0 end)` ,
        manualTransfers: sql<number>`sum(case when ${transferLogs.transferType} = 'manual' then 1 else 0 end)` ,
      })
      .from(transferLogs)
      .where(whereClause);

    const transfersByTypeResult = await db.execute(
      sql<{ transferType: string; count: number }>`
        select ${transferLogs.transferType} as "transferType", count(*)::int as count
        from ${transferLogs}
        where ${whereClause}
        group by ${transferLogs.transferType}
        order by count desc
      `
    );

    const activeKanbansResult = await db.execute(
      sql<{ kanbanId: string; kanbanName: string | null; transferCount: number }>`
        select ${transferLogs.fromKanbanId} as "kanbanId",
               ${kanbans.name} as "kanbanName",
               count(*)::int as "transferCount"
        from ${transferLogs}
        left join ${kanbans} on ${transferLogs.fromKanbanId} = ${kanbans.id}
        where ${whereClause}
        group by ${transferLogs.fromKanbanId}, ${kanbans.name}
        order by "transferCount" desc
        limit 10
      `
    );

    res.json({
      totalTransfers: Number(stats?.totalTransfers ?? 0),
      automaticTransfers: Number(stats?.automaticTransfers ?? 0),
      manualTransfers: Number(stats?.manualTransfers ?? 0),
      transfersByType: Array.from(transfersByTypeResult) as Array<{
        transferType: string;
        count: number;
      }>,
      activeKanbans: Array.from(activeKanbansResult) as Array<{
        kanbanId: string;
        kanbanName: string | null;
        transferCount: number;
      }>,
    });
  } catch (error) {
    next(error);
  }
});

export { router as transferLogsRouter };
