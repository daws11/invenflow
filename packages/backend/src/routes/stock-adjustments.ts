import { Router } from 'express';
import { db } from '../db';
import { movementLogs, products, locations } from '../db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { 
  CreateStockAdjustmentSchema, 
  InlineStockAdjustmentSchema,
  UpdateStockAdjustmentSchema,
  StockAdjustmentFiltersSchema 
} from '@invenflow/shared';
import { invalidateInventoryCaches, type CacheTagDescriptor } from '../utils/cacheInvalidation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/stock-adjustments - Create stock adjustment
 * Requires manager or admin role
 */
router.post('/', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const validatedData = CreateStockAdjustmentSchema.parse(req.body);
    const {
      productId,
      locationId,
      adjustmentType,
      quantityChange,
      reason,
      referenceNumber,
      notes,
    } = validatedData;

    const adjustedBy = (req as any).user?.email || (req as any).user?.username || 'unknown';

    const result = await db.transaction(async (tx) => {
      // 1. Get product
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.columnStatus !== 'Stored') {
        throw createError('Only stored products can be adjusted', 400);
      }

      const currentStock = product.stockLevel || 0;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        throw createError(
          `Cannot adjust stock to negative value. Current: ${currentStock}, Change: ${quantityChange}`,
          400
        );
      }

      // 2. Update product stock
      const [updatedProduct] = await tx
        .update(products)
        .set({
          stockLevel: newStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      // 3. Calculate new total stock at location (if applicable)
      let toStockLevel: number | null = null;
      if (locationId && product.sku) {
        const [row] = await tx
          .select({
            total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
          })
          .from(products)
          .where(
            and(
              eq(products.locationId, locationId),
              eq(products.sku, product.sku)
            )
          );
        toStockLevel = Number(row?.total ?? 0);
      }

      // 4. Create adjustment log as movement log entry
      const [adjustmentLog] = await tx
        .insert(movementLogs)
        .values({
          productId,
          fromLocationId: product.locationId,
          toLocationId: locationId || product.locationId,
          fromStockLevel: currentStock,
          toStockLevel,
          quantityMoved: quantityChange,
          movementType: 'adjustment',
          adjustmentType,
          adjustmentReason: reason,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          movedBy: adjustedBy,
          approvedBy: adjustedBy, // Auto-approved for manager/admin
          approvedAt: new Date(),
          status: 'approved',
        })
        .returning();

      return {
        adjustment: adjustmentLog,
        product: updatedProduct,
        stockBefore: currentStock,
        stockAfter: newStock,
      };
    });

    // Invalidate caches
    const invalidationTags: CacheTagDescriptor[] = [
      { resource: 'inventory' },
      { resource: 'inventoryStats' },
      { resource: 'product', id: result.product.id },
    ];

    if (result.product.locationId) {
      invalidationTags.push({
        resource: 'location',
        id: result.product.locationId,
      });
    }

    await invalidateInventoryCaches(invalidationTags);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stock-adjustments/inline - Inline stock adjustment
 * Quick adjustment by setting new quantity directly
 */
router.post('/inline', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const validatedData = InlineStockAdjustmentSchema.parse(req.body);
    const { productId, locationId, newQuantity, reason, notes } = validatedData;

    const adjustedBy = (req as any).user?.email || (req as any).user?.username || 'unknown';

    const result = await db.transaction(async (tx) => {
      // 1. Get product
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.columnStatus !== 'Stored') {
        throw createError('Only stored products can be adjusted', 400);
      }

      const currentStock = product.stockLevel || 0;
      const quantityChange = newQuantity - currentStock;

      if (quantityChange === 0) {
        return {
          message: 'No adjustment needed - quantity unchanged',
          product,
          stockBefore: currentStock,
          stockAfter: newQuantity,
        };
      }

      // 2. Update product stock
      const [updatedProduct] = await tx
        .update(products)
        .set({
          stockLevel: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      // 3. Calculate new total stock at location
      let toStockLevel: number | null = null;
      const effectiveLocationId = locationId || product.locationId;
      
      if (effectiveLocationId && product.sku) {
        const [row] = await tx
          .select({
            total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
          })
          .from(products)
          .where(
            and(
              eq(products.locationId, effectiveLocationId),
              eq(products.sku, product.sku)
            )
          );
        toStockLevel = Number(row?.total ?? 0);
      }

      // 4. Determine adjustment type based on change
      const adjustmentType = quantityChange > 0 ? 'manual_increase' : 'manual_decrease';

      // 5. Create adjustment log
      const [adjustmentLog] = await tx
        .insert(movementLogs)
        .values({
          productId,
          fromLocationId: product.locationId,
          toLocationId: effectiveLocationId,
          fromStockLevel: currentStock,
          toStockLevel,
          quantityMoved: quantityChange,
          movementType: 'adjustment',
          adjustmentType,
          adjustmentReason: reason,
          notes: notes || null,
          movedBy: adjustedBy,
          approvedBy: adjustedBy,
          approvedAt: new Date(),
          status: 'approved',
        })
        .returning();

      return {
        adjustment: adjustmentLog,
        product: updatedProduct,
        stockBefore: currentStock,
        stockAfter: newQuantity,
        quantityChange,
      };
    });

    if ('message' in result) {
      return res.json(result);
    }

    // Invalidate caches
    const invalidationTags: CacheTagDescriptor[] = [
      { resource: 'inventory' },
      { resource: 'inventoryStats' },
      { resource: 'product', id: result.product.id },
    ];

    if (result.product.locationId) {
      invalidationTags.push({
        resource: 'location',
        id: result.product.locationId,
      });
    }

    await invalidateInventoryCaches(invalidationTags);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stock-adjustments - List stock adjustments
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = StockAdjustmentFiltersSchema.parse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    const { 
      productId, 
      locationId, 
      adjustmentType, 
      status, 
      dateFrom, 
      dateTo, 
      adjustedBy,
      page,
      pageSize 
    } = filters;

    // Build where conditions
    const conditions: any[] = [eq(movementLogs.movementType, 'adjustment')];

    if (productId) {
      conditions.push(eq(movementLogs.productId, productId));
    }

    if (locationId) {
      conditions.push(eq(movementLogs.toLocationId, locationId));
    }

    if (adjustmentType) {
      conditions.push(eq(movementLogs.adjustmentType, adjustmentType));
    }

    if (status) {
      conditions.push(eq(movementLogs.status, status));
    }

    if (dateFrom) {
      conditions.push(sql`${movementLogs.createdAt} >= ${new Date(dateFrom)}`);
    }

    if (dateTo) {
      conditions.push(sql`${movementLogs.createdAt} <= ${new Date(dateTo)}`);
    }

    if (adjustedBy) {
      conditions.push(eq(movementLogs.movedBy, adjustedBy));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(movementLogs)
      .where(whereClause);

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // Get paginated results
    const adjustments = await db
      .select({
        adjustment: movementLogs,
        product: products,
        location: locations,
      })
      .from(movementLogs)
      .leftJoin(products, eq(movementLogs.productId, products.id))
      .leftJoin(locations, eq(movementLogs.toLocationId, locations.id))
      .where(whereClause)
      .orderBy(desc(movementLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      items: adjustments.map(a => ({
        ...a.adjustment,
        product: a.product,
        location: a.location,
      })),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stock-adjustments/:id - Get single stock adjustment
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db
      .select({
        adjustment: movementLogs,
        product: products,
        location: locations,
      })
      .from(movementLogs)
      .leftJoin(products, eq(movementLogs.productId, products.id))
      .leftJoin(locations, eq(movementLogs.toLocationId, locations.id))
      .where(
        and(
          eq(movementLogs.id, id),
          eq(movementLogs.movementType, 'adjustment')
        )
      )
      .limit(1);

    if (!result) {
      throw createError('Stock adjustment not found', 404);
    }

    res.json({
      ...result.adjustment,
      product: result.product,
      location: result.location,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/stock-adjustments/:id - Update pending stock adjustment
 */
router.patch('/:id', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = UpdateStockAdjustmentSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [adjustment] = await tx
        .select()
        .from(movementLogs)
        .where(
          and(
            eq(movementLogs.id, id),
            eq(movementLogs.movementType, 'adjustment')
          )
        )
        .limit(1);

      if (!adjustment) {
        throw createError('Stock adjustment not found', 404);
      }

      if (adjustment.status !== 'pending') {
        throw createError('Only pending adjustments can be edited', 400);
      }

      // Build update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (validated.quantityChange !== undefined) {
        updateData.quantityMoved = validated.quantityChange;
      }

      if (validated.reason !== undefined) {
        updateData.adjustmentReason = validated.reason;
      }

      if (validated.referenceNumber !== undefined) {
        updateData.referenceNumber = validated.referenceNumber;
      }

      if (validated.notes !== undefined) {
        updateData.notes = validated.notes;
      }

      if (validated.status !== undefined) {
        updateData.status = validated.status;
        
        if (validated.status === 'approved') {
          const approver = (req as any).user?.email || (req as any).user?.username || 'unknown';
          updateData.approvedBy = approver;
          updateData.approvedAt = new Date();
        }
      }

      const [updated] = await tx
        .update(movementLogs)
        .set(updateData)
        .where(eq(movementLogs.id, id))
        .returning();

      return updated;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/stock-adjustments/:id - Cancel pending stock adjustment
 */
router.delete('/:id', authorizeRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.transaction(async (tx) => {
      const [adjustment] = await tx
        .select()
        .from(movementLogs)
        .where(
          and(
            eq(movementLogs.id, id),
            eq(movementLogs.movementType, 'adjustment')
          )
        )
        .limit(1);

      if (!adjustment) {
        throw createError('Stock adjustment not found', 404);
      }

      if (adjustment.status !== 'pending') {
        throw createError('Only pending adjustments can be cancelled', 400);
      }

      const [cancelled] = await tx
        .update(movementLogs)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
        })
        .where(eq(movementLogs.id, id))
        .returning();

      return cancelled;
    });

    res.json({ message: 'Stock adjustment cancelled', id: result.id });
  } catch (error) {
    next(error);
  }
});

export { router as stockAdjustmentsRouter };

