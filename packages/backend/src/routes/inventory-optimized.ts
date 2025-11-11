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
  sql,
  getTableColumns,
  placeholder,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { z } from 'zod';
import { generateStableSku, buildProductFingerprint } from '../utils/sku';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Utility functions (same as original)
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

// Prepared statements for better performance
const productColumns = getTableColumns(products);

// Base query for inventory items with prepared statement
const baseInventoryQuery = db
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
  .where(placeholder('filterCondition'))
  .orderBy(placeholder('sortDirection'))
  .limit(placeholder('pageSize'))
  .offset(placeholder('offset'))
  .prepare();

// Count query with prepared statement
const countQuery = db
  .select({ value: sql<number>`count(*)` })
  .from(products)
  .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
  .where(placeholder('filterCondition'))
  .prepare();

// Validations query with prepared statement
const validationsQuery = db
  .select()
  .from(productValidations)
  .where(inArray(productValidations.productId, placeholder('productIds')))
  .prepare();

// Filter options queries (can be cached)
const categoriesQuery = db
  .selectDistinct({ category: products.category })
  .from(products)
  .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
  .where(
    and(
      inArray(products.columnStatus, ['Received', 'Stored']),
      isNotNull(products.category)
    )
  )
  .prepare();

const suppliersQuery = db
  .selectDistinct({ supplier: products.supplier })
  .from(products)
  .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
  .where(
    and(
      inArray(products.columnStatus, ['Received', 'Stored']),
      isNotNull(products.supplier)
    )
  )
  .prepare();

const locationsQuery = db
  .selectDistinct({ locationId: products.locationId })
  .from(products)
  .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
  .where(
    and(
      inArray(products.columnStatus, ['Received', 'Stored']),
      isNotNull(products.locationId)
    )
  )
  .prepare();

const kanbansQuery = db
  .select({ id: kanbans.id, name: kanbans.name })
  .from(kanbans)
  .where(eq(kanbans.type, 'receive'))
  .orderBy(asc(kanbans.name))
  .prepare();

// Optimized inventory endpoint
router.get('/', async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Parse parameters (same as original)
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

    // Build filter conditions
    const conditions: SQL<unknown>[] = [];
    const pushCondition = (clause: SQL<unknown> | undefined) => {
      if (clause) {
        conditions.push(clause);
      }
    };

    // Column status filter
    const columnStatusValues = toStringArray(req.query.columnStatus);
    if (columnStatusValues.length > 0) {
      pushCondition(inArray(products.columnStatus, columnStatusValues));
    } else {
      pushCondition(inArray(products.columnStatus, ['Received', 'Stored']));
    }

    // Search filter - optimized to use full-text search index
    if (searchValue) {
      // Use the full-text search index we created
      pushCondition(
        sql`to_tsvector('english', ${products.productDetails} || ' ' || COALESCE(${products.notes}, '') || ' ' || COALESCE(${products.sku}, '')) @@ plainto_tsquery('english', ${searchValue})`
      );
    }

    // Other filters (same as original)
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
    const sortColumn = SORTABLE_COLUMNS[sortByValue as keyof typeof SORTABLE_COLUMNS] ?? products.updatedAt;
    const sortDirection = sortOrderValue === 'asc' ? asc : desc;

    // Execute main query and count in parallel
    const [inventoryItems, totalResult] = await Promise.all([
      // Main inventory query
      db
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
        .offset(offset),
      
      // Count query
      db
        .select({ value: sql<number>`count(*)` })
        .from(products)
        .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
        .where(filterCondition)
    ]);

    const total = Number(totalResult[0]?.value ?? 0);

    // Get validations and filter options in parallel
    const productIds = inventoryItems.map(item => item.id);
    
    const [validations, categories, suppliers, locationsList, kanbansList] = await Promise.all([
      // Validations query (only if we have products)
      productIds.length > 0 
        ? db
            .select()
            .from(productValidations)
            .where(inArray(productValidations.productId, productIds))
        : Promise.resolve([]),
      
      // Filter options queries
      categoriesQuery.execute(),
      suppliersQuery.execute(),
      locationsQuery.execute(),
      kanbansQuery.execute()
    ]);

    // Process validations map
    const validationsMap: Record<string, any[]> = {};
    validations.forEach(validation => {
      if (!validationsMap[validation.productId]) {
        validationsMap[validation.productId] = [];
      }
      validationsMap[validation.productId].push(validation);
    });

    // Process results (same logic as original but optimized)
    const itemsWithDaysInInventory = inventoryItems.map((item) => {
      const now = Date.now();
      const updatedAt = item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt);
      const daysInInventory = Math.floor((now - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      const productValidations = validationsMap[item.id] || [];
      
      // Enhanced image priority logic
      let displayImage = item.productImage;
      if (productValidations.length > 0) {
        const approvedValidation = productValidations.find(v => v.validationStatus === 'approved');
        if (approvedValidation?.validatedImage) {
          displayImage = approvedValidation.validatedImage;
        } else {
          const latestValidation = productValidations.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          if (latestValidation?.validatedImage) {
            displayImage = latestValidation.validatedImage;
          }
        }
      }

      return {
        ...item,
        daysInInventory,
        validations: productValidations,
        displayImage,
      };
    });

    // Process filter options
    const processedCategories = categories
      .map(r => r.category)
      .filter((value): value is string => Boolean(value));

    const processedSuppliers = suppliers
      .map(r => r.supplier)
      .filter((value): value is string => Boolean(value));

    const processedLocations = locationsList
      .map(r => r.locationId)
      .filter((value): value is string => Boolean(value));

    const queryTime = Date.now() - startTime;
    
    // Log performance for monitoring
    if (queryTime > 1000) {
      console.warn(`Slow inventory query: ${queryTime}ms for ${total} items`);
    }

    res.json({
      items: itemsWithDaysInInventory,
      filters: {
        categories: processedCategories,
        suppliers: processedSuppliers,
        locations: processedLocations,
        kanbans: kanbansList,
      },
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
      queryTime, // Include query time for monitoring
    });
  } catch (error) {
    console.error('Inventory query error:', error);
    next(error);
  }
});

// Optimized grouped inventory endpoint
router.get('/grouped', async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    const searchValue = toStringValue(req.query.search);
    const categoryValues = toStringArray(req.query.category);
    const supplierValues = toStringArray(req.query.supplier);
    const statusFilter = toStringValue(req.query.status);

    // Build parameterized query conditions for better performance and security
    const conditions: SQL<unknown>[] = [];
    
    // Base conditions
    conditions.push(eq(kanbans.type, 'receive'));
    conditions.push(isNotNull(products.sku));

    // Search filter using full-text search index
    if (searchValue) {
      conditions.push(
        sql`to_tsvector('english', ${products.productDetails} || ' ' || COALESCE(${products.sku}, '')) @@ plainto_tsquery('english', ${searchValue})`
      );
    }

    // Category filter
    if (categoryValues.length > 0) {
      conditions.push(inArray(products.category, categoryValues));
    }

    // Supplier filter
    if (supplierValues.length > 0) {
      conditions.push(inArray(products.supplier, supplierValues));
    }

    const whereCondition = combineConditions(conditions);

    // Optimized grouped query using the new composite indexes
    const groupedResult = await db.execute(
      sql`
        SELECT
          p.sku,
          MAX(p.product_details) as "productName",
          MAX(p.category) as category,
          MAX(p.supplier) as supplier,
          MAX(p.product_image) as "productImage",
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
        INNER JOIN kanbans k ON p.kanban_id = k.id
        WHERE ${whereCondition}
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

    // Filter by status if specified
    const filteredItems = statusFilter 
      ? groupedItems.filter(item => {
          switch (statusFilter) {
            case 'available':
              return item.available > 0;
            case 'low-stock':
              return item.totalStock > 0 && item.totalStock <= 10;
            case 'out-of-stock':
              return item.totalStock === 0;
            default:
              return true;
          }
        })
      : groupedItems;

    const queryTime = Date.now() - startTime;
    
    // Log performance for monitoring
    if (queryTime > 500) {
      console.warn(`Slow grouped inventory query: ${queryTime}ms for ${filteredItems.length} groups`);
    }

    res.json({
      items: filteredItems,
      total: filteredItems.length,
      queryTime,
    });
  } catch (error) {
    console.error('Grouped inventory query error:', error);
    next(error);
  }
});

export { router as inventoryOptimizedRouter };
