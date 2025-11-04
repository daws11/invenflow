import { Router } from 'express';
import { db } from '../db';
import { transferLogs, products, kanbans, locations } from '../db/schema';
import { eq, desc, and, gte, lte, sql, inArray, type SQL } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

type TransferLogRecord = typeof transferLogs.$inferSelect;
type ProductRecord = typeof products.$inferSelect;
type KanbanRecord = typeof kanbans.$inferSelect;
type LocationRecord = typeof locations.$inferSelect;

type EnrichedTransferLog = TransferLogRecord & {
  product: ProductRecord | null;
  fromKanban: KanbanRecord | null;
  toKanban: KanbanRecord | null;
  fromLocation: LocationRecord | null;
  toLocation: LocationRecord | null;
};

const enrichTransferLogs = async (logs: TransferLogRecord[]): Promise<EnrichedTransferLog[]> => {
  if (logs.length === 0) {
    return [];
  }

  const productIds = Array.from(new Set(logs.map((log) => log.productId)));
  const kanbanIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.fromKanbanId, log.toKanbanId])
    )
  );
  const locationIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.fromLocationId, log.toLocationId])
        .filter((id): id is string => Boolean(id))
    )
  );

  const productPromise = productIds.length
    ? db.select().from(products).where(inArray(products.id, productIds))
    : Promise.resolve<ProductRecord[]>([]);

  const kanbanPromise = kanbanIds.length
    ? db.select().from(kanbans).where(inArray(kanbans.id, kanbanIds))
    : Promise.resolve<KanbanRecord[]>([]);

  const locationPromise = locationIds.length
    ? db.select().from(locations).where(inArray(locations.id, locationIds))
    : Promise.resolve<LocationRecord[]>([]);

  const [productRows, kanbanRows, locationRows] = await Promise.all([
    productPromise,
    kanbanPromise,
    locationPromise,
  ]);

  const productMap = new Map(productRows.map((row) => [row.id, row]));
  const kanbanMap = new Map(kanbanRows.map((row) => [row.id, row]));
  const locationMap = new Map(locationRows.map((row) => [row.id, row]));

  return logs.map((log) => ({
    ...log,
    product: productMap.get(log.productId) ?? null,
    fromKanban: kanbanMap.get(log.fromKanbanId) ?? null,
    toKanban: kanbanMap.get(log.toKanbanId) ?? null,
    fromLocation: log.fromLocationId ? locationMap.get(log.fromLocationId) ?? null : null,
    toLocation: log.toLocationId ? locationMap.get(log.toLocationId) ?? null : null,
  }));
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
    const enrichedLogs = await enrichTransferLogs(logs);

    res.json(enrichedLogs);
  } catch (error) {
    next(error);
  }
});

// Get transfer logs by product ID
router.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const logs = await db
      .select()
      .from(transferLogs)
      .where(eq(transferLogs.productId, productId))
      .orderBy(desc(transferLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    const enrichedLogs = await enrichTransferLogs(logs);

    res.json(enrichedLogs);
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

    const enrichedLogs = await enrichTransferLogs(logs);

    res.json(enrichedLogs);
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
