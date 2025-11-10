import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, productValidations, locations, persons } from '../db/schema';
import type { ProductValidation } from '@invenflow/shared';
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
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

    // Allow filtering by specific column statuses, or default to Received/Stored
    const columnStatusValues = toStringArray(req.query.columnStatus);
    if (columnStatusValues.length > 0) {
      pushCondition(inArray(products.columnStatus, columnStatusValues));
    } else {
      // Default: only show Received and Stored products
      pushCondition(inArray(products.columnStatus, ['Received', 'Stored']));
    }

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
      pushCondition(inArray(products.locationId, locationValues));
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

    // Simplified approach: Get products first, then validations separately
    // This avoids complex SQL subquery issues with Drizzle ORM
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

    // Get validations for these products in a separate query
    const productIds = inventoryItems.map(item => item.id);
    let validationsMap: Record<string, any[]> = {};
    
    if (productIds.length > 0) {
      const allValidations = await db
        .select()
        .from(productValidations)
        .where(inArray(productValidations.productId, productIds));
      
      // Group validations by productId for efficient lookup
      validationsMap = allValidations.reduce((acc, validation) => {
        if (!acc[validation.productId]) {
          acc[validation.productId] = [];
        }
        acc[validation.productId].push(validation);
        return acc;
      }, {} as Record<string, any[]>);
    }

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
        .selectDistinct({ locationId: products.locationId })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            isNotNull(products.locationId)
          )
        )
        .then((result) =>
          result
            .map((r) => r.locationId)
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

      // Get validations for this product from the map
      const productValidations = validationsMap[item.id] || [];

      // Enhanced image priority logic for multiple validation records
      let displayImage = item.productImage; // Default fallback
      let availableImages: Array<{
        url: string;
        type: 'received' | 'stored';
        validatedAt: string;
      }> = [];

      if (productValidations.length > 0) {
        // Build available images array with metadata
        productValidations.forEach(validation => {
          if (validation.columnStatus === 'Received' && validation.receivedImage) {
            availableImages.push({
              url: validation.receivedImage,
              type: 'received',
              validatedAt: validation.createdAt.toISOString()
            });
          }
          if (validation.columnStatus === 'Stored' && validation.storagePhoto) {
            availableImages.push({
              url: validation.storagePhoto,
              type: 'stored',
              validatedAt: validation.createdAt.toISOString()
            });
          }
        });

        // Sort by validation date (newest first)
        availableImages.sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime());

        // Find the most appropriate image based on current product status
        if (item.columnStatus === 'Stored') {
          // For Stored products: prioritize storagePhoto > receivedImage
          const storedValidation = productValidations.find(v => v.columnStatus === 'Stored');
          if (storedValidation?.storagePhoto) {
            displayImage = storedValidation.storagePhoto;
          } else {
            // Fallback to Received image if no Stored image
            const receivedValidation = productValidations.find(v => v.columnStatus === 'Received');
            if (receivedValidation?.receivedImage) {
              displayImage = receivedValidation.receivedImage;
            }
          }
        } else if (item.columnStatus === 'Received') {
          // For Received products: prioritize receivedImage
          const receivedValidation = productValidations.find(v => v.columnStatus === 'Received');
          if (receivedValidation?.receivedImage) {
            displayImage = receivedValidation.receivedImage;
          }
        }
      }

      return {
        ...item,
        validations: productValidations,
        daysInInventory,
        displayImage,
        hasMultipleImages: availableImages.length > 1,
        availableImages,
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
        purchased: sql<number>`sum(case when ${products.columnStatus} = 'Purchased' then 1 else 0 end)`,
        received: sql<number>`sum(case when ${products.columnStatus} = 'Received' then 1 else 0 end)`,
        stored: sql<number>`sum(case when ${products.columnStatus} = 'Stored' then 1 else 0 end)`,
        lowStock: sql<number>`sum(case when ${products.stockLevel} is not null and ${products.stockLevel} <= 10 then 1 else 0 end)`,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(eq(kanbans.type, 'receive'));

    const totalsRow = rawTotalStats ?? {
      total: 0,
      purchased: 0,
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
        purchased: Number(totalsRow.purchased ?? 0),
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

// Get grouped inventory items (products grouped by SKU with status breakdown)
router.get('/grouped', async (req, res, next) => {
  try {
    const searchValue = toStringValue(req.query.search);
    const categoryValues = toStringArray(req.query.category);
    const supplierValues = toStringArray(req.query.supplier);
    const statusFilter = toStringValue(req.query.status);

    // Build WHERE conditions manually for raw SQL (to avoid Drizzle ORM conflicts)
    const whereClauses: string[] = [];
    
    // Base conditions: only receive kanban products with SKU
    whereClauses.push("k.type = 'receive'");
    whereClauses.push("p.sku IS NOT NULL");

    // Search filter
    if (searchValue) {
      // Escape single quotes to prevent SQL injection
      const escapedSearch = searchValue.replace(/'/g, "''");
      whereClauses.push(`(p.product_details ILIKE '%${escapedSearch}%' OR p.sku ILIKE '%${escapedSearch}%')`);
    }

    // Category filter
    if (categoryValues.length > 0) {
      const escapedCategories = categoryValues.map(c => `'${c.replace(/'/g, "''")}'`).join(', ');
      whereClauses.push(`p.category IN (${escapedCategories})`);
    }

    // Supplier filter
    if (supplierValues.length > 0) {
      const escapedSuppliers = supplierValues.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
      whereClauses.push(`p.supplier IN (${escapedSuppliers})`);
    }

    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';

    // Execute raw SQL query to group by SKU and calculate status breakdown
    const groupedResult = await db.execute(
      sql`
        SELECT
          p.sku,
          MAX(p.product_details) as "productName",
          MAX(p.category) as category,
          MAX(p.supplier) as supplier,
          MAX(p.product_image) as "productImage",
          COUNT(CASE WHEN p.column_status = 'Purchased' THEN 1 END)::int as incoming,
          COUNT(CASE WHEN p.column_status = 'Received' THEN 1 END)::int as received,
          COUNT(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NULL THEN 1 END)::int as stored,
          COUNT(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NOT NULL THEN 1 END)::int as used,
          (
            COUNT(CASE WHEN p.column_status = 'Received' THEN 1 END) +
            COALESCE(SUM(CASE WHEN p.column_status = 'Stored' THEN COALESCE(p.stock_level, 1) END), 0)
          )::int as "totalStock",
          COALESCE(SUM(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NULL THEN COALESCE(p.stock_level, 1) END), 0)::int as available,
          array_agg(p.id) as "productIds",
          MAX(p.unit_price) as "unitPrice",
          MAX(p.updated_at) as "lastUpdated"
        FROM products p
        INNER JOIN kanbans k ON p.kanban_id = k.id
        ${sql.raw(whereClause)}
        GROUP BY p.sku
        ORDER BY MAX(p.updated_at) DESC
      `
    );

    const groupedItems = Array.from(groupedResult).map((row: any) => ({
      sku: row.sku,
      productName: row.productName,
      category: row.category,
      supplier: row.supplier,
      productImage: row.productImage,
      statusBreakdown: {
        incoming: Number(row.incoming ?? 0),
        received: Number(row.received ?? 0),
        stored: Number(row.stored ?? 0),
        used: Number(row.used ?? 0),
      },
      totalStock: Number(row.totalStock ?? 0),
      available: Number(row.available ?? 0),
      productIds: row.productIds as string[],
      unitPrice: row.unitPrice ? Number(row.unitPrice) : null,
      lastUpdated: row.lastUpdated,
    }));

    // Apply status filter if specified
    let filteredItems = groupedItems;
    if (statusFilter) {
      filteredItems = groupedItems.filter((item) => {
        switch (statusFilter) {
          case 'incoming':
            return item.statusBreakdown.incoming > 0;
          case 'received':
            return item.statusBreakdown.received > 0;
          case 'stored':
            return item.statusBreakdown.stored > 0;
          case 'used':
            return item.statusBreakdown.used > 0;
          case 'available':
            return item.available > 0;
          default:
            return true;
        }
      });
    }

    res.json({
      items: filteredItems,
      total: filteredItems.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get product location breakdown by SKU
router.get('/sku/:sku/locations', async (req, res, next) => {
  try {
    const { sku } = req.params;
    
    const items = await db
      .select({
        id: products.id,
        productDetails: products.productDetails,
        columnStatus: products.columnStatus,
        stockLevel: products.stockLevel,
        locationId: products.locationId,
        assignedToPersonId: products.assignedToPersonId,
        kanbanId: products.kanbanId,
        updatedAt: products.updatedAt,
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
          area: locations.area,
          building: locations.building,
        },
        person: {
          id: persons.id,
          name: persons.name,
          code: persons.code,
          department: persons.department,
        },
        kanban: {
          id: kanbans.id,
          name: kanbans.name,
        }
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .leftJoin(locations, eq(products.locationId, locations.id))
      .leftJoin(persons, eq(products.assignedToPersonId, persons.id))
      .where(
        and(
          eq(products.sku, sku),
          eq(kanbans.type, 'receive'),
          inArray(products.columnStatus, ['Received', 'Stored'])
        )
      )
      .orderBy(desc(products.updatedAt));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export { router as inventoryRouter };
