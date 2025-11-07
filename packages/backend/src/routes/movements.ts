import { Router } from 'express';
import { db } from '../db';
import { movementLogs, products, locations, persons } from '../db/schema';
import { eq, desc, and, gte, lte, sql, inArray, type SQL } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { CreateMovementSchema, CreateBatchDistributionSchema } from '@invenflow/shared';

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

type MovementLogRecord = typeof movementLogs.$inferSelect;
type ProductRecord = typeof products.$inferSelect;
type LocationRecord = typeof locations.$inferSelect;
type PersonRecord = typeof persons.$inferSelect;

type EnrichedMovementLog = MovementLogRecord & {
  product: ProductRecord | null;
  fromLocation: LocationRecord | null;
  toLocation: LocationRecord | null;
  fromPerson: PersonRecord | null;
  toPerson: PersonRecord | null;
};

const enrichMovementLogs = async (logs: MovementLogRecord[]): Promise<EnrichedMovementLog[]> => {
  if (logs.length === 0) {
    return [];
  }

  const productIds = Array.from(new Set(logs.map((log) => log.productId)));
  const locationIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.fromLocationId, log.toLocationId])
        .filter((id): id is string => Boolean(id))
    )
  );
  const personIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.fromPersonId, log.toPersonId])
        .filter((id): id is string => Boolean(id))
    )
  );

  const productPromise = productIds.length
    ? db.select().from(products).where(inArray(products.id, productIds))
    : Promise.resolve<ProductRecord[]>([]);

  const locationPromise = locationIds.length
    ? db.select().from(locations).where(inArray(locations.id, locationIds))
    : Promise.resolve<LocationRecord[]>([]);

  const personPromise = personIds.length
    ? db.select().from(persons).where(inArray(persons.id, personIds))
    : Promise.resolve<PersonRecord[]>([]);

  const [productRows, locationRows, personRows] = await Promise.all([
    productPromise,
    locationPromise,
    personPromise,
  ]);

  const productMap = new Map(productRows.map((row) => [row.id, row]));
  const locationMap = new Map(locationRows.map((row) => [row.id, row]));
  const personMap = new Map(personRows.map((row) => [row.id, row]));

  return logs.map((log) => ({
    ...log,
    product: productMap.get(log.productId) ?? null,
    fromLocation: log.fromLocationId ? locationMap.get(log.fromLocationId) ?? null : null,
    toLocation: log.toLocationId ? locationMap.get(log.toLocationId) ?? null : null,
    fromPerson: log.fromPersonId ? personMap.get(log.fromPersonId) ?? null : null,
    toPerson: log.toPersonId ? personMap.get(log.toPersonId) ?? null : null,
  }));
};

// Get movement logs with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      productId,
      locationId,
      limit = '50',
      offset = '0',
      startDate,
      endDate,
    } = req.query;

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const whereConditions: SQL<unknown>[] = [];

    if (productId) {
      whereConditions.push(eq(movementLogs.productId, productId as string));
    }

    if (locationId) {
      whereConditions.push(
        sql`(${movementLogs.fromLocationId} = ${locationId} OR ${movementLogs.toLocationId} = ${locationId})`
      );
    }

    if (startDate) {
      whereConditions.push(gte(movementLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(movementLogs.createdAt, new Date(endDate as string)));
    }

    const logs = await db
      .select()
      .from(movementLogs)
      .where(combineConditions(whereConditions))
      .orderBy(desc(movementLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Enrich with related data
    const enrichedLogs = await enrichMovementLogs(logs);

    res.json(enrichedLogs);
  } catch (error) {
    next(error);
  }
});

// Get movement logs by product ID
router.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const logs = await db
      .select()
      .from(movementLogs)
      .where(eq(movementLogs.productId, productId))
      .orderBy(desc(movementLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    const enrichedLogs = await enrichMovementLogs(logs);

    res.json(enrichedLogs);
  } catch (error) {
    next(error);
  }
});

// Create movement log
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreateMovementSchema.parse(req.body);
    const { productId, toLocationId, toPersonId, toStockLevel, notes } = validatedData;

    // Get user from auth token
    const movedBy = (req as any).user?.email || (req as any).user?.username || null;

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Verify product exists and is stored
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.columnStatus !== 'Stored') {
        throw createError('Only products with "Stored" status can be moved', 400);
      }

      // 2. Verify target location or person exists
      if (toLocationId) {
        const [targetLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, toLocationId))
          .limit(1);

        if (!targetLocation) {
          throw createError('Target location not found', 404);
        }
      }

      if (toPersonId) {
        const [targetPerson] = await tx
          .select()
          .from(persons)
          .where(eq(persons.id, toPersonId))
          .limit(1);

        if (!targetPerson) {
          throw createError('Target person not found', 404);
        }
      }

      // 3. Create movement log
      const [movementLog] = await tx
        .insert(movementLogs)
        .values({
          productId,
          fromLocationId: product.locationId,
          toLocationId: toLocationId || null,
          fromPersonId: product.assignedToPersonId,
          toPersonId: toPersonId || null,
          fromStockLevel: product.stockLevel,
          toStockLevel,
          notes: notes || null,
          movedBy,
        })
        .returning();

      // 4. Update product location/person and stock level
      const [updatedProduct] = await tx
        .update(products)
        .set({
          locationId: toLocationId || product.locationId,
          assignedToPersonId: toPersonId || product.assignedToPersonId,
          stockLevel: toStockLevel,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      return {
        movementLog,
        product: updatedProduct,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Batch distribute product to multiple locations
router.post('/batch-distribute', async (req, res, next) => {
  try {
    const validatedData = CreateBatchDistributionSchema.parse(req.body);
    const { sourceProductId, distributions } = validatedData;

    // Get user from auth token
    const movedBy = (req as any).user?.email || (req as any).user?.username || null;

    // Validate total quantity doesn't exceed available stock
    const totalQuantity = distributions.reduce((sum, dist) => sum + dist.quantity, 0);

    // Check for duplicate destinations (location + person combination)
    // Valid: Same location with different persons
    // Invalid: Same location without person (multiple times), or same location + person combination
    const destinationKeys = distributions.map(d => {
      // Create unique key based on location and person combination
      if (d.toPersonId) {
        return `person:${d.toPersonId}`;
      } else if (d.toLocationId) {
        return `location:${d.toLocationId}`;
      }
      return 'unknown';
    });
    
    const uniqueDestinations = new Set(destinationKeys);
    if (destinationKeys.length !== uniqueDestinations.size) {
      throw createError('Cannot distribute to the same destination (location or person) multiple times in one batch', 400);
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Verify source product exists and is stored
      const [sourceProduct] = await tx
        .select()
        .from(products)
        .where(eq(products.id, sourceProductId))
        .limit(1);

      if (!sourceProduct) {
        throw createError('Source product not found', 404);
      }

      if (sourceProduct.columnStatus !== 'Stored') {
        throw createError('Only products with "Stored" status can be distributed', 400);
      }

      const availableStock = sourceProduct.stockLevel || 0;
      if (totalQuantity > availableStock) {
        throw createError(
          `Total quantity (${totalQuantity}) exceeds available stock (${availableStock})`,
          400
        );
      }

      // 2. Verify all target locations and persons exist
      const targetLocationIds = distributions.filter(d => d.toLocationId).map(d => d.toLocationId!);
      const targetPersonIds = distributions.filter(d => d.toPersonId).map(d => d.toPersonId!);
      
      if (targetLocationIds.length > 0) {
        const targetLocations = await tx
          .select()
          .from(locations)
          .where(inArray(locations.id, targetLocationIds));

        if (targetLocations.length !== targetLocationIds.length) {
          throw createError('One or more target locations not found', 404);
        }
      }

      if (targetPersonIds.length > 0) {
        const targetPersons = await tx
          .select()
          .from(persons)
          .where(inArray(persons.id, targetPersonIds));

        if (targetPersons.length !== targetPersonIds.length) {
          throw createError('One or more target persons not found', 404);
        }
      }

      // 3. Create new product records and movement logs for each distribution
      const createdProducts = [];
      const createdMovementLogs = [];

      for (const distribution of distributions) {
        // Create new product record (copy all fields from source)
        const [newProduct] = await tx
          .insert(products)
          .values({
            kanbanId: sourceProduct.kanbanId,
            columnStatus: 'Stored',
            productDetails: sourceProduct.productDetails,
            productLink: sourceProduct.productLink,
            locationId: distribution.toLocationId || null,
            assignedToPersonId: distribution.toPersonId || null,
            priority: sourceProduct.priority,
            stockLevel: distribution.quantity,
            sourceProductId: sourceProductId, // Track parent product
            productImage: sourceProduct.productImage,
            category: sourceProduct.category,
            tags: sourceProduct.tags,
            supplier: sourceProduct.supplier,
            sku: sourceProduct.sku,
            dimensions: sourceProduct.dimensions,
            weight: sourceProduct.weight,
            unitPrice: sourceProduct.unitPrice,
            notes: distribution.notes || sourceProduct.notes,
            columnEnteredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        createdProducts.push(newProduct);

        // Create movement log
        const [movementLog] = await tx
          .insert(movementLogs)
          .values({
            productId: newProduct!.id,
            fromLocationId: sourceProduct.locationId,
            toLocationId: distribution.toLocationId || null,
            fromPersonId: sourceProduct.assignedToPersonId,
            toPersonId: distribution.toPersonId || null,
            fromStockLevel: availableStock,
            toStockLevel: distribution.quantity,
            notes: distribution.notes || `Batch distribution from ${sourceProduct.productDetails}`,
            movedBy,
          })
          .returning();

        createdMovementLogs.push(movementLog);
      }

      // 4. Update source product stock level
      const remainingStock = availableStock - totalQuantity;
      
      const [updatedSourceProduct] = await tx
        .update(products)
        .set({
          stockLevel: remainingStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, sourceProductId))
        .returning();

      return {
        sourceProduct: updatedSourceProduct,
        distributedProducts: createdProducts,
        movementLogs: createdMovementLogs,
        totalDistributed: totalQuantity,
        remainingStock,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get movement statistics
router.get('/stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const whereConditions: SQL<unknown>[] = [];

    if (startDate) {
      whereConditions.push(gte(movementLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(movementLogs.createdAt, new Date(endDate as string)));
    }

    const whereClause = combineConditions(whereConditions);

    // Total movements count
    const [stats] = await db
      .select({
        totalMovements: sql<number>`count(*)`,
      })
      .from(movementLogs)
      .where(whereClause);

    // Active products count (products that have been moved)
    const [activeProductsResult] = await db
      .select({
        activeProducts: sql<number>`count(distinct ${movementLogs.productId})`,
      })
      .from(movementLogs)
      .where(whereClause);

    // Most active recipients (locations and persons combined, top 5)
    // Build WHERE clause conditions as SQL fragments
    const dateConditions: SQL<unknown>[] = [];
    if (startDate) {
      dateConditions.push(sql`created_at >= ${new Date(startDate as string)}`);
    }
    if (endDate) {
      dateConditions.push(sql`created_at <= ${new Date(endDate as string)}`);
    }
    const dateWhereClause = dateConditions.length > 0 
      ? sql`WHERE ${sql.join(dateConditions, sql` AND `)} AND`
      : sql`WHERE`;

    const mostActiveRecipientsResult = await db.execute(
      sql<{ recipientId: string; recipientName: string; recipientCode: string; recipientType: string; movementCount: number }>`
        WITH movement_recipients AS (
          -- Movements to locations
          SELECT 
            to_location_id as recipient_id,
            'location' as recipient_type
          FROM movement_logs
          ${dateWhereClause} to_location_id IS NOT NULL
          UNION ALL
          -- Movements from locations
          SELECT 
            from_location_id as recipient_id,
            'location' as recipient_type
          FROM movement_logs
          ${dateWhereClause} from_location_id IS NOT NULL
          UNION ALL
          -- Movements to persons
          SELECT 
            to_person_id as recipient_id,
            'person' as recipient_type
          FROM movement_logs
          ${dateWhereClause} to_person_id IS NOT NULL
          UNION ALL
          -- Movements from persons
          SELECT 
            from_person_id as recipient_id,
            'person' as recipient_type
          FROM movement_logs
          ${dateWhereClause} from_person_id IS NOT NULL
        )
        SELECT 
          mr.recipient_id as "recipientId",
          COALESCE(loc.name, per.name) as "recipientName",
          COALESCE(loc.code, dep.name) as "recipientCode",
          mr.recipient_type as "recipientType",
          count(*)::int as "movementCount"
        FROM movement_recipients mr
        LEFT JOIN locations loc ON mr.recipient_id = loc.id AND mr.recipient_type = 'location'
        LEFT JOIN persons per ON mr.recipient_id = per.id AND mr.recipient_type = 'person'
        LEFT JOIN departments dep ON per.department_id = dep.id
        WHERE mr.recipient_id IS NOT NULL
        GROUP BY mr.recipient_id, mr.recipient_type, loc.name, loc.code, per.name, dep.name
        ORDER BY "movementCount" DESC
        LIMIT 5
      `
    );

    // Recent movements (last 10)
    const recentLogs = await db
      .select()
      .from(movementLogs)
      .where(whereClause)
      .orderBy(desc(movementLogs.createdAt))
      .limit(10);

    const enrichedRecentLogs = await enrichMovementLogs(recentLogs);

    res.json({
      totalMovements: Number(stats?.totalMovements ?? 0),
      activeProducts: Number(activeProductsResult?.activeProducts ?? 0),
      mostActiveRecipients: Array.from(mostActiveRecipientsResult) as Array<{
        recipientId: string;
        recipientName: string;
        recipientCode: string;
        recipientType: 'location' | 'person';
        movementCount: number;
      }>,
      recentMovements: enrichedRecentLogs,
    });
  } catch (error) {
    next(error);
  }
});

export { router as movementsRouter };

