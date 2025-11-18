import { Router } from 'express';
import { db } from '../db';
import { storedLogs, kanbans, products } from '../db/schema';
import { authenticateToken } from '../middleware/auth';
import { and, desc, eq, ilike, lte, gte, or, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';

export const storedLogsRouter = Router();

storedLogsRouter.use(authenticateToken);

const parseDate = (value: string | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

storedLogsRouter.get('/', async (req, res, next) => {
  try {
    const {
      kanbanId,
      removalType,
      search,
      startDate,
      endDate,
      page = '1',
      pageSize = '25',
    } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedPageSize = Math.min(
      Math.max(parseInt(pageSize as string, 10) || 25, 1),
      100,
    );
    const offset = (parsedPage - 1) * parsedPageSize;

    const conditions = [];

    if (kanbanId && typeof kanbanId === 'string') {
      conditions.push(eq(storedLogs.kanbanId, kanbanId));
    }

    if (removalType && typeof removalType === 'string') {
      conditions.push(eq(storedLogs.removalType, removalType));
    }

    const parsedStart = typeof startDate === 'string' ? parseDate(startDate) : null;
    if (parsedStart) {
      conditions.push(gte(storedLogs.removedAt, parsedStart.toISOString()));
    }

    const parsedEnd = typeof endDate === 'string' ? parseDate(endDate) : null;
    if (parsedEnd) {
      conditions.push(lte(storedLogs.removedAt, parsedEnd.toISOString()));
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(storedLogs.productDetails, term),
          ilike(storedLogs.sku, term),
          ilike(storedLogs.removalReason, term),
        ),
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseListQuery = db
      .select({
        id: storedLogs.id,
        kanbanId: storedLogs.kanbanId,
        productId: storedLogs.productId,
        productDetails: storedLogs.productDetails,
        sku: storedLogs.sku,
        quantity: storedLogs.quantity,
        unit: storedLogs.unit,
        stockLevel: storedLogs.stockLevel,
        category: storedLogs.category,
        supplier: storedLogs.supplier,
        removalType: storedLogs.removalType,
        removalReason: storedLogs.removalReason,
        storedAt: storedLogs.storedAt,
        removedAt: storedLogs.removedAt,
        metadata: storedLogs.metadata,
        productSnapshot: storedLogs.productSnapshot,
        kanbanName: kanbans.name,
        kanbanLocationId: kanbans.locationId,
      })
      .from(storedLogs)
      .leftJoin(kanbans, eq(storedLogs.kanbanId, kanbans.id));

    const pagedQuery = whereClause
      ? baseListQuery.where(whereClause).orderBy(desc(storedLogs.removedAt)).limit(parsedPageSize).offset(offset)
      : baseListQuery.orderBy(desc(storedLogs.removedAt)).limit(parsedPageSize).offset(offset);

    const baseCountQuery = db
      .select({ count: sql<number>`cast(count(${storedLogs.id}) as integer)` })
      .from(storedLogs);

    const countQuery = whereClause ? baseCountQuery.where(whereClause) : baseCountQuery;

    const [items, totalResult] = await Promise.all([pagedQuery, countQuery]);

    res.json({
      items,
      total: totalResult[0]?.count ?? 0,
      page: parsedPage,
      pageSize: parsedPageSize,
    });
  } catch (error) {
    next(error);
  }
});

storedLogsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [log] = await db
      .select({
        id: storedLogs.id,
        kanbanId: storedLogs.kanbanId,
        productId: storedLogs.productId,
        productDetails: storedLogs.productDetails,
        sku: storedLogs.sku,
        quantity: storedLogs.quantity,
        unit: storedLogs.unit,
        stockLevel: storedLogs.stockLevel,
        category: storedLogs.category,
        supplier: storedLogs.supplier,
        removalType: storedLogs.removalType,
        removalReason: storedLogs.removalReason,
        storedAt: storedLogs.storedAt,
        removedAt: storedLogs.removedAt,
        metadata: storedLogs.metadata,
        productSnapshot: storedLogs.productSnapshot,
        kanbanName: kanbans.name,
        kanbanType: kanbans.type,
        kanbanLocationId: kanbans.locationId,
        productCurrentStatus: products.columnStatus,
      })
      .from(storedLogs)
      .leftJoin(kanbans, eq(storedLogs.kanbanId, kanbans.id))
      .leftJoin(products, eq(storedLogs.productId, products.id))
      .where(eq(storedLogs.id, id))
      .limit(1);

    if (!log) {
      throw createError('Stored log not found', 404);
    }

    res.json(log);
  } catch (error) {
    next(error);
  }
});

