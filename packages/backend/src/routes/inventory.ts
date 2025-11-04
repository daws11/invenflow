import { Router } from 'express';
import { db } from '../db';
import { products, kanbans } from '../db/schema';
import {
  eq,
  and,
  inArray,
  ilike,
  or,
  gte,
  lte,
  desc,
  asc,
  isNotNull,
  sql,
  getTableColumns,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

const router = Router();

const isString = (value: unknown): value is string => typeof value === 'string';

const toStringValue = (value: unknown, fallback?: string): string | undefined => {
  if (isString(value)) return value;
  if (Array.isArray(value)) {
    const first = value.find(isString);
    return first ?? fallback;
  }
  return fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(isString);
  }
  if (isString(value)) return [value];
  return [];
};

const toNumberValue = (value: unknown): number | undefined => {
  const stringValue = toStringValue(value);
  if (!stringValue) return undefined;
  const parsed = Number.parseInt(stringValue, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toDateValue = (value: unknown): Date | undefined => {
  const stringValue = toStringValue(value);
  if (!stringValue) return undefined;
  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const combineConditions = (clauses: SQL<unknown>[]): SQL<unknown> => {
  if (clauses.length === 0) {
    return sql`1 = 1`;
  }
  if (clauses.length === 1) {
    return clauses[0]!;
  }
  const combined = and(
    ...(clauses as [SQL<unknown>, SQL<unknown>, ...SQL<unknown>[]])
  );
  return combined ?? sql`1 = 1`;
};

const SORTABLE_COLUMNS = {
  updatedAt: products.updatedAt,
  createdAt: products.createdAt,
  productDetails: products.productDetails,
  stockLevel: products.stockLevel,
  category: products.category,
  supplier: products.supplier,
} as const;

// Get inventory items (products from receive kanbans with 'received' or 'stored' status)
router.get('/', async (req, res, next) => {
  try {
    const pageNumber = toNumberValue(req.query.page) ?? 1;
    const pageSizeNumber = toNumberValue(req.query.pageSize) ?? 20;
    const page = pageNumber > 0 ? pageNumber : 1;
    const pageSize = pageSizeNumber > 0 ? pageSizeNumber : 20;
    const offset = (page - 1) * pageSize;

    const searchValue = toStringValue(req.query.search);
    const categoryValues = toStringArray(req.query.category);
    const supplierValues = toStringArray(req.query.supplier);
    const locationValues = toStringArray(req.query.location);
    const stockMinValue = toNumberValue(req.query.stockMin);
    const stockMaxValue = toNumberValue(req.query.stockMax);
    const dateFromValue = toDateValue(req.query.dateFrom);
    const dateToValue = toDateValue(req.query.dateTo);
    const kanbanIdValues = toStringArray(req.query.kanbanIds);

    const sortByValue = toStringValue(req.query.sortBy, 'updatedAt') ?? 'updatedAt';
    const sortOrderValue = toStringValue(req.query.sortOrder, 'desc') === 'asc' ? 'asc' : 'desc';

    const conditions: SQL<unknown>[] = [];
    const pushCondition = (clause: SQL<unknown> | undefined) => {
      if (clause) {
        conditions.push(clause);
      }
    };

    pushCondition(inArray(products.columnStatus, ['Received', 'Stored']));

    if (searchValue) {
      pushCondition(
        or(
          ilike(products.productDetails, `%${searchValue}%`),
          ilike(products.notes, `%${searchValue}%`),
          ilike(products.sku, `%${searchValue}%`)
        )
      );
    }

    if (categoryValues.length > 0) {
      pushCondition(inArray(products.category, categoryValues));
    }

    if (supplierValues.length > 0) {
      pushCondition(inArray(products.supplier, supplierValues));
    }

    if (locationValues.length > 0) {
      pushCondition(inArray(products.location, locationValues));
    }

    if (stockMinValue !== undefined) {
      pushCondition(gte(products.stockLevel, stockMinValue));
    }

    if (stockMaxValue !== undefined) {
      pushCondition(lte(products.stockLevel, stockMaxValue));
    }

    if (dateFromValue) {
      pushCondition(gte(products.updatedAt, dateFromValue));
    }

    if (dateToValue) {
      pushCondition(lte(products.updatedAt, dateToValue));
    }

    if (kanbanIdValues.length > 0) {
      pushCondition(inArray(products.kanbanId, kanbanIdValues));
    }

    const filterCondition = combineConditions(conditions);

    const sortColumn =
      SORTABLE_COLUMNS[sortByValue as keyof typeof SORTABLE_COLUMNS] ??
      products.updatedAt;
    const sortDirection = sortOrderValue === 'asc' ? asc : desc;

    const productColumns = getTableColumns(products);

    const inventoryItems = await db
      .select({
        ...productColumns,
        kanban: {
          id: kanbans.id,
          name: kanbans.name,
          type: kanbans.type,
          linkedKanbanId: kanbans.linkedKanbanId,
        },
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(filterCondition)
      .orderBy(sortDirection(sortColumn))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ value: sql<number>`count(*)` })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(filterCondition);

    const total = Number(totalResult[0]?.value ?? 0);

    const [categories, suppliers, locationsList, kanbansList] = await Promise.all([
      db
        .selectDistinct({ category: products.category })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            isNotNull(products.category)
          )
        )
        .then((result) =>
          result
            .map((r) => r.category)
            .filter((value): value is string => Boolean(value))
        ),

      db
        .selectDistinct({ supplier: products.supplier })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            isNotNull(products.supplier)
          )
        )
        .then((result) =>
          result
            .map((r) => r.supplier)
            .filter((value): value is string => Boolean(value))
        ),

      db
        .selectDistinct({ location: products.location })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            isNotNull(products.location)
          )
        )
        .then((result) =>
          result
            .map((r) => r.location)
            .filter((value): value is string => Boolean(value))
        ),

      db
        .select({ id: kanbans.id, name: kanbans.name })
        .from(kanbans)
        .where(eq(kanbans.type, 'receive'))
        .orderBy(asc(kanbans.name)),
    ]);

    const itemsWithDaysInInventory = inventoryItems.map((item) => {
      const now = Date.now();
      const updatedAt =
        item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt);
      const daysInInventory = Math.floor(
        (now - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...item,
        daysInInventory,
      };
    });

    res.json({
      items: itemsWithDaysInInventory,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters: {
        categories,
        suppliers,
        locations: locationsList,
        kanbans: kanbansList,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get inventory statistics
router.get('/stats', async (req, res, next) => {
  try {
    // Get total inventory count
    const [rawTotalStats] = await db
      .select({
        total: sql<number>`count(*)`,
        received: sql<number>`sum(case when ${products.columnStatus} = 'Received' then 1 else 0 end)`,
        stored: sql<number>`sum(case when ${products.columnStatus} = 'Stored' then 1 else 0 end)`,
        lowStock: sql<number>`sum(case when ${products.stockLevel} is not null and ${products.stockLevel} <= 10 then 1 else 0 end)`,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(eq(kanbans.type, 'receive'));

    const totalsRow = rawTotalStats ?? {
      total: 0,
      received: 0,
      stored: 0,
      lowStock: 0,
    };

    const categoryStatsResult = await db.execute(
      sql<{ category: string | null; count: number }>`
        select ${products.category} as category, count(*)::int as count
        from ${products}
        inner join ${kanbans} on ${products.kanbanId} = ${kanbans.id}
        where ${kanbans.type} = 'receive'
          and ${products.columnStatus} in ('Received', 'Stored')
          and ${products.category} is not null
        group by ${products.category}
        order by count desc
      `
    );

    const supplierStatsResult = await db.execute(
      sql<{ supplier: string | null; count: number }>`
        select ${products.supplier} as supplier, count(*)::int as count
        from ${products}
        inner join ${kanbans} on ${products.kanbanId} = ${kanbans.id}
        where ${kanbans.type} = 'receive'
          and ${products.columnStatus} in ('Received', 'Stored')
          and ${products.supplier} is not null
        group by ${products.supplier}
        order by count desc
      `
    );

    const categoryStatsRows = Array.from(categoryStatsResult) as Array<{
      category: string | null;
      count: number;
    }>;

    const supplierStatsRows = Array.from(supplierStatsResult) as Array<{
      supplier: string | null;
      count: number;
    }>;

    const normalizedCategoryStats = categoryStatsRows
      .filter((row) => row.category)
      .map((row) => ({
        category: row.category as string,
        count: Number(row.count ?? 0),
      }));

    const normalizedSupplierStats = supplierStatsRows
      .filter((row) => row.supplier)
      .map((row) => ({
        supplier: row.supplier as string,
        count: Number(row.count ?? 0),
      }));

    res.json({
      totalStats: {
        total: Number(totalsRow.total ?? 0),
        received: Number(totalsRow.received ?? 0),
        stored: Number(totalsRow.stored ?? 0),
        lowStock: Number(totalsRow.lowStock ?? 0),
      },
      categoryStats: normalizedCategoryStats,
      supplierStats: normalizedSupplierStats,
    });
  } catch (error) {
    next(error);
  }
});

export { router as inventoryRouter };
