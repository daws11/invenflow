import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, productValidations, locations, persons, departments, movementLogs, skuAliases, importBatches } from '../db/schema';
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
  isNull,
  sql,
  getTableColumns,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';
import { z } from 'zod';
import { generateStableSku, buildProductFingerprint } from '../utils/sku';
import { invalidateInventoryCaches } from '../utils/cacheInvalidation';

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
router.get('/', cacheMiddleware({
  ttl: 60 * 1000,
  sharedAcrossUsers: true,
  tags: [{ resource: 'inventory' }],
}), async (req, res, next) => {
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
    const areaValues = toStringArray(req.query.area);
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

    // Exclude draft products from inventory
    pushCondition(eq(products.isDraft, false));

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

    if (areaValues.length > 0) {
      // Filter by area through locations table without relying on array literals
      pushCondition(
        sql`exists (
          select 1
          from ${locations}
          where ${locations.id} = ${products.locationId}
            and ${inArray(locations.area, areaValues)}
        )`
      );
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
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
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
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(filterCondition);

    const total = Number(totalResult[0]?.value ?? 0);

    const [categories, suppliers, locationsList, kanbansList] = await Promise.all([
      db
        .selectDistinct({ category: products.category })
        .from(products)
        .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            eq(products.isDraft, false),
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
        .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            eq(products.isDraft, false),
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
        .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(
          and(
            inArray(products.columnStatus, ['Received', 'Stored']),
            eq(products.isDraft, false),
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

      // Create virtual "Direct Import" kanban for items with null kanbanId
      // item.kanban can be null when products.kanbanId is null (direct import),
      // so guard the access safely.
      const kanbanData = (item.kanban && (item.kanban as any).id) ? item.kanban : {
        id: 'direct-import',
        name: 'Direct Import',
        type: 'direct-import',
        linkedKanbanId: null,
      };

      return {
        ...item,
        kanban: kanbanData,
        validations: productValidations,
        daysInInventory,
        displayImage,
        hasMultipleImages: availableImages.length > 1,
        availableImages,
      };
    });

    // Add virtual "Direct Import" kanban to the kanbans list if there are any direct import items
    const hasDirectImportItems = inventoryItems.some(item => !item.kanban || !(item.kanban as any).id);
    const enhancedKanbansList = hasDirectImportItems 
      ? [...kanbansList, { id: 'direct-import', name: 'Direct Import' }]
      : kanbansList;

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
        kanbans: enhancedKanbansList,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export inventory data (CSV/XLSX), supports grouped-by-SKU or raw
router.get('/export', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const format = (toStringValue(req.query.format) || 'csv').toLowerCase();
    const grouped = toStringValue(req.query.grouped) === 'true';

    // Reuse filters similar to GET /
    const searchValue = toStringValue(req.query.search);
    const categoryValues = toStringArray(req.query.category);
    const supplierValues = toStringArray(req.query.supplier);
    const locationValues = toStringArray(req.query.location);
    const columnStatusValues = toStringArray(req.query.columnStatus);
    const dateFromValue = toDateValue(req.query.dateFrom);
    const dateToValue = toDateValue(req.query.dateTo);

    const conditions: SQL<unknown>[] = [];
    const pushCondition = (clause: SQL<unknown> | undefined) => {
      if (clause) {
        conditions.push(clause);
      }
    };
    // Only receive kanban items
    pushCondition(eq(kanbans.type, 'receive'));
    // Status
    if (columnStatusValues.length > 0) {
      pushCondition(inArray(products.columnStatus, columnStatusValues));
    } else {
      pushCondition(inArray(products.columnStatus, ['Received', 'Stored']));
    }
    // Exclude draft products
    pushCondition(eq(products.isDraft, false));
    // Filters
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
    if (dateFromValue) {
      pushCondition(gte(products.updatedAt, dateFromValue));
    }
    if (dateToValue) {
      pushCondition(lte(products.updatedAt, dateToValue));
    }

    const whereCombined = combineConditions(conditions);

    const toCsv = (rows: any[]): string => {
      if (rows.length === 0) return '';
      const headers = Object.keys(rows[0]!);
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (/[",\n]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const lines = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
      ];
      return lines.join('\n');
    };

    const filenameBase = grouped ? 'inventory-grouped' : 'inventory';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${filenameBase}-${timestamp}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;

    if (grouped) {
      // Use raw grouped query similar to /grouped
      const whereClauses: string[] = ["k.type = 'receive'", "p.sku IS NOT NULL", "p.is_draft = false"];
      if (searchValue) {
        const escaped = searchValue.replace(/'/g, "''");
        whereClauses.push(`(p.product_details ILIKE '%${escaped}%' OR p.sku ILIKE '%${escaped}%')`);
      }
      if (categoryValues.length > 0) {
        const esc = categoryValues.map(c => `'${c.replace(/'/g, "''")}'`).join(', ');
        whereClauses.push(`p.category IN (${esc})`);
      }
      if (supplierValues.length > 0) {
        const esc = supplierValues.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
        whereClauses.push(`p.supplier IN (${esc})`);
      }
      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const groupedResult = await db.execute(
        sql`
          SELECT
            p.sku,
            MAX(p.product_details) as "productName",
            MAX(p.category) as category,
            MAX(p.supplier) as supplier,
            MAX(p.dimensions) as dimensions,
            COALESCE(SUM(CASE WHEN p.column_status = 'Purchased' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)::int as incoming,
            COALESCE(SUM(CASE WHEN p.column_status = 'Received' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)::int as received,
            COALESCE(SUM(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NULL THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)::int as stored,
            COALESCE(SUM(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NOT NULL THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)::int as used,
            (
              COALESCE(SUM(CASE WHEN p.column_status = 'Received' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0) +
              COALESCE(SUM(CASE WHEN p.column_status = 'Stored' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)
            )::int as "totalStock",
            MAX(p.unit) as unit,
            MAX(l.area) as area,
            MAX(l.name) as "locationName",
            MAX(p.unit_price) as "unitPrice",
            MAX(p.notes) as notes,
            MAX(p.original_purchase_date) as "originalPurchaseDate",
            MAX(p.updated_at) as "lastUpdated"
          FROM products p
          INNER JOIN kanbans k ON p.kanban_id = k.id
          LEFT JOIN locations l ON p.location_id = l.id
          ${sql.raw(whereClause)}
          GROUP BY p.sku
          ORDER BY MAX(p.updated_at) DESC
        `
      );
      const rows = Array.from(groupedResult).map((r: any) => ({
        SKU: r.sku,
        'Product Name': r.productName,
        Supplier: r.supplier,
        Category: r.category,
        Dimensions: r.dimensions ?? '',
        Incoming: Number(r.incoming ?? 0),
        Received: Number(r.received ?? 0),
        Stored: Number(r.stored ?? 0),
        Used: Number(r.used ?? 0),
        TotalStock: Number(r.totalStock ?? 0),
        Unit: r.unit ?? '',
        Area: r.area ?? '',
        'Location Name': r.locationName ?? '',
        'Unit Price': r.unitPrice ? Number(r.unitPrice) : '',
        Notes: r.notes ?? '',
        'Original Purchase Date': r.originalPurchaseDate ? new Date(r.originalPurchaseDate).toISOString().split('T')[0] : '',
        'Last Updated': r.lastUpdated ? new Date(r.lastUpdated).toISOString() : '',
      }));
      const csv = toCsv(rows);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
      return res.send(csv);
    } else {
      // Raw items
      const itemRows = await db
        .select({
          id: products.id,
          sku: products.sku,
          productDetails: products.productDetails,
          category: products.category,
          supplier: products.supplier,
          dimensions: products.dimensions,
          columnStatus: products.columnStatus,
          stockLevel: products.stockLevel,
          unit: products.unit,
          unitPrice: products.unitPrice,
          notes: products.notes,
          originalPurchaseDate: products.originalPurchaseDate,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          locationArea: locations.area,
          locationName: locations.name,
        })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .leftJoin(locations, eq(products.locationId, locations.id))
        .where(whereCombined)
        .orderBy(desc(products.updatedAt));

      const rows = itemRows.map((r: any) => ({
        SKU: r.sku,
        'Product Name': r.productDetails,
        Supplier: r.supplier,
        Category: r.category,
        Dimensions: r.dimensions ?? '',
        'New Stock Level': r.stockLevel ?? '',
        Unit: r.unit ?? '',
        Area: r.locationArea ?? '',
        'Location Name': r.locationName ?? '',
        'Unit Price': r.unitPrice ? Number(r.unitPrice) : '',
        Notes: r.notes ?? '',
        'Original Purchase Date': r.originalPurchaseDate ? new Date(r.originalPurchaseDate).toISOString().split('T')[0] : '',
        Status: r.columnStatus,
        'Created At': r.createdAt ? new Date(r.createdAt).toISOString() : '',
        'Updated At': r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      }));
      const csv = toCsv(rows);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
      return res.send(csv);
    }
  } catch (error) {
    next(error);
  }
});

// Get inventory statistics
router.get('/stats', cacheMiddleware({
  ttl: 5 * 60 * 1000,
  sharedAcrossUsers: true,
  tags: [{ resource: 'inventoryStats' }],
}), async (req, res, next) => {
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
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(products.isDraft, false),
          or(
            eq(kanbans.type, 'receive'),
            isNull(products.kanbanId) // Include direct import products
          )
        )
      );

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
        left join ${kanbans} on ${products.kanbanId} = ${kanbans.id}
        where ${products.isDraft} = false
          and ${products.columnStatus} in ('Received', 'Stored')
          and ${products.category} is not null
          and (${kanbans.type} = 'receive' OR ${products.kanbanId} IS NULL)
        group by ${products.category}
        order by count desc
      `
    );

    const supplierStatsResult = await db.execute(
      sql<{ supplier: string | null; count: number }>`
        select ${products.supplier} as supplier, count(*)::int as count
        from ${products}
        left join ${kanbans} on ${products.kanbanId} = ${kanbans.id}
        where ${products.isDraft} = false
          and ${products.columnStatus} in ('Received', 'Stored')
          and ${products.supplier} is not null
          and (${kanbans.type} = 'receive' OR ${products.kanbanId} IS NULL)
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
router.get('/grouped', cacheMiddleware({
  ttl: 2 * 60 * 1000,
  sharedAcrossUsers: true,
  tags: [{ resource: 'inventory' }],
}), async (req, res, next) => {
  try {
    const searchValue = toStringValue(req.query.search);
    const categoryValues = toStringArray(req.query.category);
    const supplierValues = toStringArray(req.query.supplier);
    const statusFilter = toStringValue(req.query.status);

    // Build WHERE conditions manually for raw SQL (to avoid Drizzle ORM conflicts)
    const whereClauses: string[] = [];
    
    // Base conditions: receive kanban products OR direct import products with SKU, exclude drafts
    whereClauses.push("(k.type = 'receive' OR p.kanban_id IS NULL)");
    whereClauses.push("p.sku IS NOT NULL");
    whereClauses.push("p.is_draft = false");

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
          MAX(p.unit) as unit,
          COALESCE(SUM(CASE 
            WHEN p.column_status = 'Purchased' 
            THEN COALESCE(p.stock_level, 1) 
            ELSE 0 
          END), 0)::int as incoming,
          COALESCE(SUM(CASE 
            WHEN p.column_status = 'Received' 
            THEN COALESCE(p.stock_level, 1) 
            ELSE 0 
          END), 0)::int as received,
          COALESCE(SUM(CASE 
            WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NULL 
            THEN COALESCE(p.stock_level, 1) 
            ELSE 0 
          END), 0)::int as stored,
          COALESCE(SUM(CASE 
            WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NOT NULL 
            THEN COALESCE(p.stock_level, 1) 
            ELSE 0 
          END), 0)::int as used,
          (
            COALESCE(SUM(CASE WHEN p.column_status = 'Received' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN p.column_status = 'Stored' THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)
          )::int as "totalStock",
          COALESCE(SUM(CASE WHEN p.column_status = 'Stored' AND p.assigned_to_person_id IS NULL THEN COALESCE(p.stock_level, 1) ELSE 0 END), 0)::int as available,
          array_agg(p.id) as "productIds",
          MAX(p.unit_price) as "unitPrice",
          MAX(p.updated_at) as "lastUpdated"
        FROM products p
        LEFT JOIN kanbans k ON p.kanban_id = k.id
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
      unit: row.unit,
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
    
    console.log('Fetching location details for SKU:', sku);
    
    // First get products with basic info
    const productsList = await db
      .select({
        id: products.id,
        productDetails: products.productDetails,
        columnStatus: products.columnStatus,
        stockLevel: products.stockLevel,
        locationId: products.locationId,
        assignedToPersonId: products.assignedToPersonId,
        kanbanId: products.kanbanId,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(products.sku, sku),
          or(
            eq(kanbans.type, 'receive'),
            isNull(products.kanbanId) // Include direct import items
          ),
          inArray(products.columnStatus, ['Received', 'Stored']),
          eq(products.isDraft, false)
        )
      )
      .orderBy(desc(products.updatedAt));

    console.log(`Found ${productsList.length} products for SKU ${sku}`);

    // Then fetch related data separately
    const locationIds = productsList.map(p => p.locationId).filter(Boolean) as string[];
    const personIds = productsList.map(p => p.assignedToPersonId).filter(Boolean) as string[];
    const kanbanIds = [...new Set(productsList.map(p => p.kanbanId).filter(id => id !== null))];

    const [locationsList, personsWithDepts, kanbansList] = await Promise.all([
      locationIds.length > 0 
        ? db.select().from(locations).where(inArray(locations.id, locationIds))
        : Promise.resolve([]),
      personIds.length > 0
        ? db.select({
          id: persons.id,
          name: persons.name,
          departmentId: persons.departmentId,
          isActive: persons.isActive,
          departmentName: departments.name,
        })
        .from(persons)
        .leftJoin(departments, eq(persons.departmentId, departments.id))
        .where(inArray(persons.id, personIds))
        : Promise.resolve([]),
      kanbanIds.length > 0
        ? db.select().from(kanbans).where(inArray(kanbans.id, kanbanIds))
        : Promise.resolve([])
    ]);

    // Map to create the response structure
    const items = productsList.map(product => {
      const location = locationsList.find(l => l.id === product.locationId) || null;
      const person = personsWithDepts.find(p => p.id === product.assignedToPersonId) || null;
      const kanban = kanbansList.find(k => k.id === product.kanbanId);

      return {
        id: product.id,
        productDetails: product.productDetails,
        columnStatus: product.columnStatus,
        stockLevel: product.stockLevel,
        locationId: product.locationId,
        assignedToPersonId: product.assignedToPersonId,
        kanbanId: product.kanbanId,
        updatedAt: product.updatedAt,
        location: location ? {
          id: location.id,
          name: location.name,
          code: location.code,
          area: location.area,
          building: location.building,
        } : null,
        person: person ? {
          id: person.id,
          name: person.name,
          department: person.departmentName || null,
        } : null,
        kanban: kanban ? {
          id: kanban.id,
          name: kanban.name,
        } : null,
      };
    });

    res.json({ items });
  } catch (error) {
    console.error('Error fetching location details:', error);
    next(error);
  }
});

// List import batches
router.get('/import/batches', authorizeRoles('admin', 'manager'), async (_req, res, next) => {
  try {
    const batches = await db
      .select()
      .from(importBatches)
      .orderBy(desc(importBatches.createdAt));
    res.json({ items: batches });
  } catch (error) {
    next(error);
  }
});

// Import batch summary
router.get('/import/batches/:id/summary', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const productsInBatch = await db
      .select({
        id: products.id,
        stockLevel: products.stockLevel,
        unitPrice: products.unitPrice,
        locationId: products.locationId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.importBatchId, id));

    const totalItems = productsInBatch.length;
    const totalValue = productsInBatch.reduce((sum, p: any) => {
      const qty = Number(p.stockLevel ?? 0);
      const price = p.unitPrice ? Number(p.unitPrice) : 0;
      return sum + qty * price;
    }, 0);

    const locationCounts: Record<string, number> = {};
    for (const p of productsInBatch as any[]) {
      const loc = p.locationId || 'unknown';
      locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;
    }

    res.json({
      batch,
      summary: {
        totalItems,
        totalValue,
        locations: locationCounts,
        importDate: (batch as any).createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Import Stored items (migration/stock adjustments)
const ImportItemSchema = z.object({
  sku: z.string().min(1).optional(),
  legacySku: z.string().min(1).optional(),
  legacyId: z.string().min(1).optional(),
  productName: z.string().min(1),
  supplier: z.string().min(1),
  category: z.string().min(1),
  dimensions: z.string().optional().nullable(),
  newStockLevel: z.number().int().min(0),
  unit: z.string().optional(),
  locationId: z.string().uuid().optional(),
  locationCode: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  locationName: z.string().min(1).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  originalPurchaseDate: z.union([z.string(), z.date()]).optional(),
});

const ImportStoredBodySchema = z.object({
  importBatchLabel: z.string().optional(),
  importBatchId: z.string().uuid().optional(),
  targetReceiveKanbanId: z.string().uuid().optional(),
  bypassKanban: z.boolean().optional().default(false),
  items: z.array(ImportItemSchema).min(1),
}).refine((data) => {
  // If bypassKanban is true, targetReceiveKanbanId is optional
  // If bypassKanban is false, targetReceiveKanbanId is required
  if (!data.bypassKanban && !data.targetReceiveKanbanId) {
    return false;
  }
  return true;
}, {
  message: "targetReceiveKanbanId is required when bypassKanban is false",
});

// Helper function to generate location code
const generateLocationCode = async (area: string, name: string): Promise<string> => {
  const baseCode = `${area.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  
  // Check if base code exists
  const [existing] = await db
    .select()
    .from(locations)
    .where(eq(locations.code, baseCode))
    .limit(1);
  
  if (!existing) {
    return baseCode;
  }
  
  // Find next available number
  let counter = 1;
  while (true) {
    const numberedCode = `${baseCode}-${counter.toString().padStart(3, '0')}`;
    const [existingNumbered] = await db
      .select()
      .from(locations)
      .where(eq(locations.code, numberedCode))
      .limit(1);
    
    if (!existingNumbered) {
      return numberedCode;
    }
    counter++;
  }
};

// Helper function to resolve or create location
const resolveOrCreateLocation = async (item: any): Promise<string | null> => {
  // Try locationId first
  if (item.locationId) {
    return item.locationId;
  }
  
  // Try locationCode
  if (item.locationCode) {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.code, item.locationCode))
      .limit(1);
    
    if (location) {
      return location.id;
    }
  }
  
  // Try area + locationName combination
  if (item.area && item.locationName) {
    const [location] = await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.area, item.area),
        eq(locations.name, item.locationName)
      ))
      .limit(1);
    
    if (location) {
      return location.id;
    }
    
    // Auto-create location
    const generatedCode = await generateLocationCode(item.area, item.locationName);
    const [newLocation] = await db
      .insert(locations)
      .values({
        name: item.locationName,
        area: item.area,
        code: generatedCode,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newLocation.id;
  }
  
  return null;
};

router.post('/import/stored', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const validated = ImportStoredBodySchema.parse(req.body);
    const { importBatchLabel, importBatchId, targetReceiveKanbanId, bypassKanban, items } = validated;

    // 1) Validate target kanban (only if not bypassing kanban)
    let targetKanban: any = null;
    if (!bypassKanban) {
      if (!targetReceiveKanbanId) {
        return res.status(400).json({ error: 'targetReceiveKanbanId is required when bypassKanban is false' });
      }
      
      const [kanban] = await db
      .select()
      .from(kanbans)
      .where(and(eq(kanbans.id, targetReceiveKanbanId), eq(kanbans.type, 'receive')))
      .limit(1);
      if (!kanban) {
      return res.status(400).json({ error: 'Invalid targetReceiveKanbanId (must be a receive kanban)' });
      }
      targetKanban = kanban;
    }

    // 2) Ensure/import batch
    let batchId = importBatchId ?? null;
    let batchCreatedAt: Date | null = null;
    if (batchId) {
      const [existingBatch] = await db
        .select()
        .from(importBatches)
        .where(eq(importBatches.id, batchId))
        .limit(1);
      if (existingBatch) {
        batchCreatedAt = existingBatch.createdAt as unknown as Date;
      } else {
        // if provided id not found, create with same id not trivial; just create a new one
        const [created] = await db.insert(importBatches).values({
          label: importBatchLabel ?? 'Inventory Import',
          createdBy: (req as any).user?.email || (req as any).user?.username || 'system',
        }).returning();
        batchId = created.id;
        batchCreatedAt = created.createdAt as unknown as Date;
      }
    } else {
      const [created] = await db.insert(importBatches).values({
        label: importBatchLabel ?? 'Inventory Import',
        createdBy: (req as any).user?.email || (req as any).user?.username || 'system',
      }).returning();
      batchId = created.id;
      batchCreatedAt = created.createdAt as unknown as Date;
    }

    const movedBy = (req as any).user?.email || (req as any).user?.username || 'system-import';
    const results: any[] = [];

    const normalizeDate = (value: any): Date | null => {
      if (!value) return null;
      const d = value instanceof Date ? value : new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    // Preload locations by code for faster resolution
    const allLocationCodes = Array.from(
      new Set(items.map(i => i.locationCode).filter((v): v is string => Boolean(v)))
    );
    const locationMapByCode = new Map<string, string>();
    if (allLocationCodes.length > 0) {
      const locs = await db.select().from(locations).where(inArray(locations.code, allLocationCodes));
      for (const l of locs) {
        locationMapByCode.set((l as any).code, (l as any).id);
      }
    }

    const now = new Date();

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]!;
      try {
        // Resolve location using new helper function
        let resolvedLocationId: string | null = null;
        
        if (bypassKanban) {
          // For direct import, use the enhanced location resolution
          resolvedLocationId = await resolveOrCreateLocation(item);
          
          if (!resolvedLocationId) {
            results.push({
              row: idx + 1,
              status: 'error',
              error: 'No location resolved: provide locationId, locationCode, or area+locationName',
            });
            continue;
          }
        } else {
          // For kanban import, use existing logic with fallback to kanban location
          resolvedLocationId =
          item.locationId ??
          (item.locationCode ? locationMapByCode.get(item.locationCode) : undefined) ??
            (targetKanban as any)?.locationId ??
          undefined;
          
        if (!resolvedLocationId) {
          results.push({
            row: idx + 1,
            status: 'error',
            error: 'No location resolved: receive kanban has no default location and row has no valid location',
          });
          continue;
          }
        }

        // Find product by SKU
        let productRecord: any | null = null;
        if (item.sku) {
          const [p] = await db.select().from(products).where(eq(products.sku, item.sku)).limit(1);
          if (p) productRecord = p;
        }
        // Or by alias
        if (!productRecord && (item.legacySku || item.legacyId)) {
          const aliasWhere = item.legacySku
            ? eq(skuAliases.legacySku, item.legacySku)
            : eq(skuAliases.legacyId, item.legacyId!);
          const aliasRows = await db
            .select()
            .from(skuAliases)
            .where(aliasWhere)
            .limit(1);
          const alias = aliasRows[0];
          if (alias) {
            const [p] = await db.select().from(products).where(eq(products.id, alias.productId)).limit(1);
            if (p) productRecord = p;
          }
        }
        // Or by fingerprint match (exact)
        if (!productRecord) {
          const fp = buildProductFingerprint({
            name: item.productName,
            supplier: item.supplier,
            category: item.category,
            dimensions: item.dimensions ?? undefined,
          });
          // naive exact match on normalized fields
          const normalizedName = item.productName.trim();
          const normalizedSupplier = item.supplier.trim();
          const normalizedCategory = item.category.trim();
          const [p] = await db
            .select()
            .from(products)
            .where(
              and(
                ilike(products.productDetails, normalizedName),
                ilike(products.supplier, normalizedSupplier),
                ilike(products.category, normalizedCategory)
              )
            )
            .limit(1);
          if (p) productRecord = p;
        }

        // Unit price normalization
        const unitPrice =
          item.unitPrice !== undefined
            ? Number(item.unitPrice)
            : undefined;
        const originalPurchaseDate = normalizeDate(item.originalPurchaseDate);

        if (productRecord) {
          // Update
          const oldStock = productRecord.stockLevel ?? 0;
          const prevLocationId = productRecord.locationId ?? null;
          const newStock = item.newStockLevel;

          // idempotent-ish: skip if no change and same batch already applied
          if (
            productRecord.importBatchId === batchId &&
            productRecord.stockLevel === newStock &&
            productRecord.locationId === resolvedLocationId &&
            productRecord.updatedAt &&
            batchCreatedAt &&
            new Date(productRecord.updatedAt) >= new Date(batchCreatedAt)
          ) {
            results.push({
              row: idx + 1,
              status: 'skipped',
              productId: productRecord.id,
              sku: productRecord.sku,
              reason: 'No changes (already applied in this batch)',
            });
            continue;
          }

          const [updated] = await db
            .update(products)
            .set({
              stockLevel: newStock,
              locationId: resolvedLocationId,
              unit: item.unit ?? productRecord.unit,
              unitPrice: unitPrice !== undefined ? String(unitPrice) : productRecord.unitPrice,
              columnStatus: 'Stored',
              importSource: 'bulk-import',
              importBatchId: batchId!,
              originalPurchaseDate: originalPurchaseDate ?? productRecord.originalPurchaseDate,
              updatedAt: now,
            })
            .where(eq(products.id, productRecord.id))
            .returning();

          // Get area information for movement log
          let fromAreaName: string | null = null;
          let toAreaName: string | null = null;
          
          if (prevLocationId) {
            const [prevLoc] = await db
              .select()
              .from(locations)
              .where(eq(locations.id, prevLocationId))
              .limit(1);
            fromAreaName = prevLoc?.area || null;
          }
          
          if (resolvedLocationId) {
            const [newLoc] = await db
              .select()
              .from(locations)
              .where(eq(locations.id, resolvedLocationId))
              .limit(1);
            toAreaName = newLoc?.area || null;
          }

          // Determine import type for better tracking
          const importType = bypassKanban ? 'direct-import' : 'bulk-import';
          const stockChange = Math.abs(newStock - oldStock);
          const changeDirection = newStock > oldStock ? 'increased' : 'decreased';
          
          await db.insert(movementLogs).values({
            productId: productRecord.id,
            fromLocationId: prevLocationId,
            toLocationId: resolvedLocationId,
            fromArea: fromAreaName,
            toArea: toAreaName,
            fromStockLevel: oldStock,
            quantityMoved: stockChange,
            notes: item.notes || `📦 Stock ${changeDirection} by ${stockChange} units via ${importType} (batch: ${batchId})`,
            movedBy: `system:${importType}:${movedBy}`,
            createdAt: now,
          });

          // Record alias if provided
          if (item.legacySku || item.legacyId) {
            try {
              await db.insert(skuAliases).values({
                productId: productRecord.id,
                legacySku: item.legacySku,
                legacyId: item.legacyId,
              });
            } catch {}
          }

          results.push({
            row: idx + 1,
            status: 'success',
            action: 'updated',
            productId: updated.id,
            sku: updated.sku,
            oldStock,
            newStock,
            stockChange: newStock - oldStock,
            locationId: resolvedLocationId,
          });
        } else {
          // Create new product
          const genSku = item.sku && item.sku.trim().length > 0
            ? item.sku.trim()
            : generateStableSku({
                name: item.productName,
                supplier: item.supplier,
                category: item.category,
                dimensions: item.dimensions ?? undefined,
              });

          const [created] = await db
            .insert(products)
            .values({
              kanbanId: bypassKanban ? null : targetReceiveKanbanId,
              columnStatus: 'Stored',
              productDetails: item.productName,
              productLink: null,
              locationId: resolvedLocationId,
              assignedToPersonId: null,
              priority: null,
              stockLevel: item.newStockLevel,
              sourceProductId: null,
              productImage: null,
              category: item.category,
              tags: null,
              supplier: item.supplier,
              sku: genSku,
              dimensions: item.dimensions ?? null,
              weight: null,
              unit: item.unit ?? null,
              unitPrice: unitPrice !== undefined ? String(unitPrice) : null,
              notes: item.notes ?? null,
              importSource: bypassKanban ? 'direct-import' : 'bulk-import',
              importBatchId: batchId!,
              originalPurchaseDate: originalPurchaseDate,
              columnEnteredAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          // Get area information for movement log
          let toAreaName: string | null = null;
          if (resolvedLocationId) {
            const [newLoc] = await db
              .select()
              .from(locations)
              .where(eq(locations.id, resolvedLocationId))
              .limit(1);
            toAreaName = newLoc?.area || null;
          }

          // Determine import type for better tracking
          const importType = bypassKanban ? 'direct-import' : 'bulk-import';
          
          await db.insert(movementLogs).values({
            productId: created.id,
            fromLocationId: null,
            toLocationId: resolvedLocationId,
            fromArea: null,
            toArea: toAreaName,
            fromStockLevel: 0,
            quantityMoved: item.newStockLevel, // Initial stock quantity
            notes: item.notes || `🆕 Initial stock of ${item.newStockLevel} units created via ${importType} (batch: ${batchId})`,
            movedBy: `system:${importType}:${movedBy}`,
            createdAt: now,
          });

          if (item.legacySku || item.legacyId) {
            try {
              await db.insert(skuAliases).values({
                productId: created.id,
                legacySku: item.legacySku,
                legacyId: item.legacyId,
              });
            } catch {}
          }

          results.push({
            row: idx + 1,
            status: 'success',
            action: 'created',
            productId: created.id,
            sku: created.sku,
            oldStock: 0,
            newStock: item.newStockLevel,
            stockChange: item.newStockLevel,
            locationId: resolvedLocationId,
          });
        }
      } catch (rowError: any) {
        results.push({
          row: idx + 1,
          status: 'error',
          error: rowError?.message || 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    // Invalidate caches so the UI receives fresh data immediately after import
    // This clears inventory lists (including grouped and sku location endpoints) and locations list
    await invalidateInventoryCaches([{ resource: 'location' }]);

    res.json({
      importBatchId: batchId,
      totals: {
        total: items.length,
        successful,
        failed,
        skipped,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
});

export { router as inventoryRouter };
