import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { 
  bulkMovements, 
  bulkMovementItems, 
  products, 
  locations,
  kanbans 
} from '../db/schema';
import { 
  CreateBulkMovementSchema, 
  UpdateBulkMovementSchema,
  BulkMovementFiltersSchema,
  type BulkMovementWithDetails 
} from '@invenflow/shared';
import { eq, and, gte, lte, inArray, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authenticateToken } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import { invalidateCache } from '../middleware/cache';
import { getOrCreateGeneralLocation } from '../utils/generalLocation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create aliases for locations table (to join twice for from/to locations)
const fromLocations = alias(locations, 'fromLocations');
const toLocations = alias(locations, 'toLocations');

// Helper to check if token is expired
const isTokenExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// POST /api/bulk-movements - Create new bulk movement
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateBulkMovementSchema.parse(req.body);
    const {
      fromLocationId,
      fromArea,
      toArea,
      toLocationId,
      items,
      notes,
    } = validatedData;

    // Get user from auth token
    const createdBy = (req as any).user?.email || (req as any).user?.username || 'unknown';

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Resolve source location & area (support area-to-area using general locations)
      let effectiveFromLocationId: string;
      let fromLocationRow: typeof locations.$inferSelect | null = null;
      let resolvedFromArea: string | null = fromArea ?? null;

      if (fromLocationId) {
        const [fromLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, fromLocationId))
          .limit(1);

        if (!fromLocation) {
          throw new Error('Source location not found');
        }

        fromLocationRow = fromLocation;
        effectiveFromLocationId = fromLocation.id;
        if (!resolvedFromArea) {
          resolvedFromArea = fromLocation.area;
        }
      } else if (fromArea) {
        // No explicit source location, but area provided:
        // use (or create) the general location for this area
        effectiveFromLocationId = await getOrCreateGeneralLocation(tx, fromArea);

        const [fromLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, effectiveFromLocationId))
          .limit(1);

        if (!fromLocation) {
          throw new Error('Source location not found');
        }

        fromLocationRow = fromLocation;
        resolvedFromArea = fromLocation.area;
      } else {
        // Should be prevented by Zod refine, but keep a runtime guard
        throw new Error('Either fromArea or fromLocationId must be provided');
      }

      // 2. Resolve destination location & area
      let effectiveToLocationId: string | null = toLocationId ?? null;
      let resolvedToArea: string | null = toArea ?? null;

      let toLocationRow: typeof locations.$inferSelect | null = null;

      if (effectiveToLocationId) {
        const [toLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, effectiveToLocationId))
          .limit(1);

        if (!toLocation) {
          throw new Error('Destination location not found');
        }

        toLocationRow = toLocation;
        if (!resolvedToArea) {
          resolvedToArea = toLocation.area;
        }
      } else if (toArea) {
        // No explicit destination location, but area provided:
        // use (or create) the general location for this area
        effectiveToLocationId = await getOrCreateGeneralLocation(tx, toArea);

        const [toLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, effectiveToLocationId))
          .limit(1);

        if (!toLocation) {
        throw new Error('Destination location not found');
        }

        toLocationRow = toLocation;
        resolvedToArea = toLocation.area;
      } else {
        throw new Error('Either toArea or toLocationId must be provided');
      }

      // 3. Fetch all products and verify they exist, are stored, and (for location-based flows) at the expected source location
      const productIds = items.map(item => item.productId);
      const baseProductsQuery = tx
        .select()
        .from(products)
        .leftJoin(kanbans, eq(products.kanbanId, kanbans.id));

      const productsData = fromLocationId
        // If caller specified a concrete source location, enforce it strictly
        ? await baseProductsQuery.where(
            and(
              inArray(products.id, productIds),
              eq(products.locationId, effectiveFromLocationId),
              eq(products.columnStatus, 'Stored'),
            ),
          )
        // If source is area-only (resolved via general location), allow products
        // from any underlying location as long as they are stored and IDs match.
        : await baseProductsQuery.where(
            and(
              inArray(products.id, productIds),
              eq(products.columnStatus, 'Stored'),
            ),
          );

      if (productsData.length !== items.length) {
        throw new Error('Some products not found, not stored, or not at source location');
      }

      // Create a map for quick lookup
      const productsMap = new Map(productsData.map(p => [p.products.id, p.products]));

      // Verify stock levels
      for (const item of items) {
        const product = productsMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const availableStock = product.stockLevel || 0;
        if (item.quantitySent > availableStock) {
          throw new Error(`Insufficient stock for ${product.productDetails}. Available: ${availableStock}, Requested: ${item.quantitySent}`);
        }
      }

      // 4. Generate unique public token
      const publicToken = nanoid(32);
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // 5. Create bulk movement record
      const [bulkMovement] = await tx
        .insert(bulkMovements)
        .values({
          fromLocationId: effectiveFromLocationId,
          toLocationId: effectiveToLocationId!,
          status: 'in_transit',
          publicToken,
          tokenExpiresAt,
          createdBy,
          notes: notes || null,
        })
        .returning();

      // 6. Create bulk movement items with denormalized data
      const bulkMovementItemsData = items.map(item => {
        const product = productsMap.get(item.productId)!;
        return {
          bulkMovementId: bulkMovement.id,
          productId: item.productId,
          quantitySent: item.quantitySent,
          sku: product.sku || null,
          productDetails: product.productDetails,
          productImage: product.productImage || null,
        };
      });

      const createdItems = await tx
        .insert(bulkMovementItems)
        .values(bulkMovementItemsData)
        .returning();

      // 7. Update product stock and status (only change status if ALL stock is moved)
      for (const item of items) {
        const product = productsMap.get(item.productId)!;
        const newStockLevel = (product.stockLevel || 0) - item.quantitySent;

        // Only change status to 'In Transit' if ALL stock is being moved (newStockLevel becomes 0)
        // If partial movement, keep status as 'Stored' since there's still stock at source location
        const shouldChangeStatus = newStockLevel === 0;

        await tx
          .update(products)
          .set({
            // Only change status if moving all stock
            ...(shouldChangeStatus && { columnStatus: 'In Transit' }),
            stockLevel: newStockLevel,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      return {
        bulkMovement,
        items: createdItems,
        fromLocation: fromLocationRow!,
        toLocation: toLocationRow!,
      };
    });

    // Invalidate inventory-related caches so stock changes are reflected immediately
    invalidateCache('/api/inventory');
    invalidateCache('/api/inventory/stats');
    invalidateCache('/api/locations');

    res.status(201).json({
      ...result.bulkMovement,
      items: result.items,
      fromLocation: {
        id: result.fromLocation.id,
        name: result.fromLocation.name,
        code: result.fromLocation.code,
        area: result.fromLocation.area,
      },
      toLocation: {
        id: result.toLocation.id,
        name: result.toLocation.name,
        code: result.toLocation.code,
        area: result.toLocation.area,
      },
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bulk-movement/confirm/${result.bulkMovement.publicToken}`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bulk-movements - List bulk movements with filters and pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = BulkMovementFiltersSchema.parse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    const { status, fromLocationId, toLocationId, dateFrom, dateTo, page, pageSize } = filters;

    // Build where conditions
    const conditions: any[] = [];

    if (status && status.length > 0) {
      conditions.push(inArray(bulkMovements.status, status));
    }

    if (fromLocationId) {
      conditions.push(eq(bulkMovements.fromLocationId, fromLocationId));
    }

    if (toLocationId) {
      conditions.push(eq(bulkMovements.toLocationId, toLocationId));
    }

    if (dateFrom) {
      conditions.push(gte(bulkMovements.createdAt, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(bulkMovements.createdAt, dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bulkMovements)
      .where(whereClause);

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // Get paginated results with related data
    const bulkMovementsData = await db
      .select({
        bulkMovement: bulkMovements,
        fromLocation: fromLocations,
        toLocation: toLocations,
      })
      .from(bulkMovements)
      .leftJoin(fromLocations, eq(bulkMovements.fromLocationId, fromLocations.id))
      .leftJoin(toLocations, eq(bulkMovements.toLocationId, toLocations.id))
      .where(whereClause)
      .orderBy(desc(bulkMovements.createdAt))
      .limit(pageSize)
      .offset(offset);

    // For each bulk movement, get its items
    const bulkMovementIds = bulkMovementsData.map(bm => bm.bulkMovement.id);
    const items = bulkMovementIds.length > 0
      ? await db
          .select()
          .from(bulkMovementItems)
          .where(inArray(bulkMovementItems.bulkMovementId, bulkMovementIds))
      : [];

    // Group items by bulk movement ID
    const itemsMap = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsMap.has(item.bulkMovementId)) {
        itemsMap.set(item.bulkMovementId, []);
      }
      itemsMap.get(item.bulkMovementId)!.push(item);
    }

    // Combine data
    const results: BulkMovementWithDetails[] = bulkMovementsData.map(data => ({
      ...data.bulkMovement,
      status: data.bulkMovement.status as 'pending' | 'in_transit' | 'received' | 'expired',
      items: itemsMap.get(data.bulkMovement.id) || [],
      fromLocation: {
        id: data.fromLocation!.id,
        name: data.fromLocation!.name,
        code: data.fromLocation!.code,
        area: data.fromLocation!.area,
      },
      toLocation: {
        id: data.toLocation!.id,
        name: data.toLocation!.name,
        code: data.toLocation!.code,
        area: data.toLocation!.area,
      },
    }));

    res.json({
      items: results,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bulk-movements/:id - Get single bulk movement by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [bulkMovementData] = await db
      .select({
        bulkMovement: bulkMovements,
        fromLocation: fromLocations,
        toLocation: toLocations,
      })
      .from(bulkMovements)
      .leftJoin(fromLocations, eq(bulkMovements.fromLocationId, fromLocations.id))
      .leftJoin(toLocations, eq(bulkMovements.toLocationId, toLocations.id))
      .where(eq(bulkMovements.id, id))
      .limit(1);

    if (!bulkMovementData) {
      return res.status(404).json({ message: 'Bulk movement not found' });
    }

    const items = await db
      .select()
      .from(bulkMovementItems)
      .where(eq(bulkMovementItems.bulkMovementId, id));

    const result: BulkMovementWithDetails = {
      ...bulkMovementData.bulkMovement,
      status: bulkMovementData.bulkMovement.status as 'pending' | 'in_transit' | 'received' | 'expired',
      items,
      fromLocation: {
        id: bulkMovementData.fromLocation!.id,
        name: bulkMovementData.fromLocation!.name,
        code: bulkMovementData.fromLocation!.code,
        area: bulkMovementData.fromLocation!.area,
      },
      toLocation: {
        id: bulkMovementData.toLocation!.id,
        name: bulkMovementData.toLocation!.name,
        code: bulkMovementData.toLocation!.code,
        area: bulkMovementData.toLocation!.area,
      },
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/bulk-movements/:id - Cancel bulk movement (only if pending or in_transit)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db.transaction(async (tx) => {
      // 1. Get bulk movement and verify it exists and can be cancelled
      const [bulkMovement] = await tx
        .select()
        .from(bulkMovements)
        .where(eq(bulkMovements.id, id))
        .limit(1);

      if (!bulkMovement) {
        throw new Error('Bulk movement not found');
      }

      if (bulkMovement.status !== 'pending' && bulkMovement.status !== 'in_transit') {
        throw new Error(`Cannot cancel bulk movement with status: ${bulkMovement.status}`);
      }

      // 2. Get all items
      const items = await tx
        .select()
        .from(bulkMovementItems)
        .where(eq(bulkMovementItems.bulkMovementId, id));

      // 3. Restore stock and revert product status if it was changed to 'In Transit'
      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product) {
          const restoredStockLevel = (product.stockLevel || 0) + item.quantitySent;

          await tx
            .update(products)
            .set({
              // Only revert status if it was changed to 'In Transit'
              columnStatus: product.columnStatus === 'In Transit' ? 'Stored' : product.columnStatus,
              stockLevel: restoredStockLevel,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));
        }
      }

      // 4. Mark bulk movement as expired instead of deleting
      await tx
        .update(bulkMovements)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(bulkMovements.id, id));

      return { success: true };
    });

    // Cancelling a bulk movement restores stock; invalidate inventory caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/locations');

    res.json({ message: 'Bulk movement cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/bulk-movements/:id/cancel - Cancel bulk movement (only if pending or in_transit)
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db.transaction(async (tx) => {
      // 1. Get bulk movement and verify it exists and can be cancelled
      const [bulkMovement] = await tx
        .select()
        .from(bulkMovements)
        .where(eq(bulkMovements.id, id))
        .limit(1);

      if (!bulkMovement) {
        throw new Error('Bulk movement not found');
      }

      if (bulkMovement.status !== 'pending' && bulkMovement.status !== 'in_transit') {
        throw new Error(`Cannot cancel bulk movement with status: ${bulkMovement.status}`);
      }

      // 2. Get all items
      const items = await tx
        .select()
        .from(bulkMovementItems)
        .where(eq(bulkMovementItems.bulkMovementId, id));

      // 3. Restore stock and revert product status if it was changed to 'In Transit'
      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product) {
          const restoredStockLevel = (product.stockLevel || 0) + item.quantitySent;

          await tx
            .update(products)
            .set({
              // Only revert status if it was changed to 'In Transit'
              columnStatus: product.columnStatus === 'In Transit' ? 'Stored' : product.columnStatus,
              stockLevel: restoredStockLevel,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));
        }
      }

      // 4. Mark bulk movement as expired and set cancelledAt
      await tx
        .update(bulkMovements)
        .set({
          status: 'expired',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkMovements.id, id));

      return { success: true };
    });

    res.json({ message: 'Bulk movement cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/bulk-movements/:id - Update bulk movement (only if pending or in_transit)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateBulkMovementSchema.parse(req.body);
    const { toLocationId, items, notes } = validatedData;

    const result = await db.transaction(async (tx) => {
      // 1. Get bulk movement and verify it exists and can be edited
      const [bulkMovement] = await tx
        .select()
        .from(bulkMovements)
        .where(eq(bulkMovements.id, id))
        .limit(1);

      if (!bulkMovement) {
        throw new Error('Bulk movement not found');
      }

      if (bulkMovement.status !== 'pending' && bulkMovement.status !== 'in_transit') {
        throw new Error(`Cannot edit bulk movement with status: ${bulkMovement.status}`);
      }

      // 2. If toLocationId is being updated, verify it exists and is different from fromLocation
      if (toLocationId) {
        if (toLocationId === bulkMovement.fromLocationId) {
          throw new Error('Destination location cannot be the same as source location');
        }

        const [targetLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, toLocationId))
          .limit(1);

        if (!targetLocation) {
          throw new Error('Target location not found');
        }
      }

      // 3. If items are being updated, handle stock adjustments
      if (items && items.length > 0) {
        // Get current items
        const currentItems = await tx
          .select()
          .from(bulkMovementItems)
          .where(eq(bulkMovementItems.bulkMovementId, id));

        // Create maps for easier comparison
        const currentItemsMap = new Map(currentItems.map(item => [item.productId, item]));
        const newItemsMap = new Map(items.map(item => [item.productId, item]));

        // Handle removed items - restore stock
        for (const currentItem of currentItems) {
          if (!newItemsMap.has(currentItem.productId)) {
            const [product] = await tx
              .select()
              .from(products)
              .where(eq(products.id, currentItem.productId))
              .limit(1);

            if (product) {
              const restoredStock = (product.stockLevel || 0) + currentItem.quantitySent;
              await tx
                .update(products)
                .set({
                  stockLevel: restoredStock,
                  // Revert status if it was changed to 'In Transit' and stock becomes > 0
                  columnStatus: product.columnStatus === 'In Transit' && restoredStock > 0 ? 'Stored' : product.columnStatus,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, currentItem.productId));
            }
          }
        }

        // Handle new items and quantity changes
        for (const newItem of items) {
          const currentItem = currentItemsMap.get(newItem.productId);
          
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, newItem.productId))
            .limit(1);

          if (!product) {
            throw new Error(`Product ${newItem.productId} not found`);
          }

          if (currentItem) {
            // Item exists, check if quantity changed
            const quantityDiff = newItem.quantitySent - currentItem.quantitySent;
            
            if (quantityDiff !== 0) {
              // Verify available stock for increase
              const availableStock = (product.stockLevel || 0);
              if (quantityDiff > 0 && quantityDiff > availableStock) {
                throw new Error(`Insufficient stock for ${product.productDetails}. Available: ${availableStock}, Requested: ${quantityDiff}`);
              }

              // Update product stock
              const newStockLevel = availableStock - quantityDiff;
              const shouldChangeStatus = newStockLevel === 0;

              await tx
                .update(products)
                .set({
                  stockLevel: newStockLevel,
                  ...(shouldChangeStatus && { columnStatus: 'In Transit' }),
                  // If stock increased (quantity reduced), revert status if was 'In Transit'
                  ...(quantityDiff < 0 && product.columnStatus === 'In Transit' && newStockLevel > 0 && { columnStatus: 'Stored' }),
                  updatedAt: new Date(),
                })
                .where(eq(products.id, newItem.productId));
            }
          } else {
            // New item, verify stock and deduct
            const availableStock = product.stockLevel || 0;
            if (newItem.quantitySent > availableStock) {
              throw new Error(`Insufficient stock for ${product.productDetails}. Available: ${availableStock}, Requested: ${newItem.quantitySent}`);
            }

            const newStockLevel = availableStock - newItem.quantitySent;
            const shouldChangeStatus = newStockLevel === 0;

            await tx
              .update(products)
              .set({
                stockLevel: newStockLevel,
                ...(shouldChangeStatus && { columnStatus: 'In Transit' }),
                updatedAt: new Date(),
              })
              .where(eq(products.id, newItem.productId));
          }
        }

        // Delete old items and insert new ones
        await tx
          .delete(bulkMovementItems)
          .where(eq(bulkMovementItems.bulkMovementId, id));

        // Get product details for new items
        const productIds = items.map(item => item.productId);
        const productsData = await tx
          .select()
          .from(products)
          .where(inArray(products.id, productIds));

        const productsMap = new Map(productsData.map(p => [p.id, p]));

        const newBulkMovementItems = items.map(item => {
          const product = productsMap.get(item.productId)!;
          return {
            bulkMovementId: id,
            productId: item.productId,
            quantitySent: item.quantitySent,
            sku: product.sku || null,
            productDetails: product.productDetails,
            productImage: product.productImage || null,
          };
        });

        await tx
          .insert(bulkMovementItems)
          .values(newBulkMovementItems);
      }

      // 4. Update bulk movement
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (toLocationId) {
        updateData.toLocationId = toLocationId;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      await tx
        .update(bulkMovements)
        .set(updateData)
        .where(eq(bulkMovements.id, id));

      // 5. Fetch updated bulk movement with details
      const [updatedBulkMovementData] = await tx
        .select({
          bulkMovement: bulkMovements,
          fromLocation: fromLocations,
          toLocation: toLocations,
        })
        .from(bulkMovements)
        .leftJoin(fromLocations, eq(bulkMovements.fromLocationId, fromLocations.id))
        .leftJoin(toLocations, eq(bulkMovements.toLocationId, toLocations.id))
        .where(eq(bulkMovements.id, id))
        .limit(1);

      const updatedItems = await tx
        .select()
        .from(bulkMovementItems)
        .where(eq(bulkMovementItems.bulkMovementId, id));

      return {
        ...updatedBulkMovementData.bulkMovement,
        status: updatedBulkMovementData.bulkMovement.status as 'pending' | 'in_transit' | 'received' | 'expired',
        items: updatedItems,
        fromLocation: {
          id: updatedBulkMovementData.fromLocation!.id,
          name: updatedBulkMovementData.fromLocation!.name,
          code: updatedBulkMovementData.fromLocation!.code,
          area: updatedBulkMovementData.fromLocation!.area,
        },
        toLocation: {
          id: updatedBulkMovementData.toLocation!.id,
          name: updatedBulkMovementData.toLocation!.name,
          code: updatedBulkMovementData.toLocation!.code,
          area: updatedBulkMovementData.toLocation!.area,
        },
      };
    });

    // Editing a bulk movement can adjust reserved stock; invalidate inventory caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/locations');

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/bulk-movements/check-expired - Mark expired bulk movements
router.post('/check-expired', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Find expired bulk movements that are still pending or in_transit
      const expiredMovements = await tx
        .select()
        .from(bulkMovements)
        .where(
          and(
            sql`${bulkMovements.tokenExpiresAt} < NOW()`,
            inArray(bulkMovements.status, ['pending', 'in_transit'])
          )
        );

      if (expiredMovements.length === 0) {
        return { expiredCount: 0 };
      }

      // Update status to expired
      const expiredIds = expiredMovements.map(bm => bm.id);
      await tx
        .update(bulkMovements)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(inArray(bulkMovements.id, expiredIds));

      // Optionally, revert products back to 'Stored' status for pending movements
      for (const movement of expiredMovements) {
        if (movement.status === 'pending') {
          const items = await tx
            .select()
            .from(bulkMovementItems)
            .where(eq(bulkMovementItems.bulkMovementId, movement.id));

          for (const item of items) {
            const [product] = await tx
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);

            if (product && product.columnStatus === 'In Transit') {
              const restoredStockLevel = (product.stockLevel || 0) + item.quantitySent;

              await tx
                .update(products)
                .set({
                  columnStatus: 'Stored',
                  stockLevel: restoredStockLevel,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, item.productId));
            }
          }
        }
      }

      return { expiredCount: expiredMovements.length };
    });

    // Expiring bulk movements can adjust product states; invalidate inventory caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/locations');

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as bulkMovementsRouter };

