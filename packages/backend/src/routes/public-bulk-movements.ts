import { Router } from 'express';
import { db } from '../db';
import { 
  bulkMovements, 
  bulkMovementItems, 
  products, 
  locations,
  kanbans,
  movementLogs
} from '../db/schema';
import { 
  ConfirmBulkMovementSchema,
  type PublicBulkMovementResponse 
} from '@invenflow/shared';
import { eq, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Request, Response, NextFunction } from 'express';
import { invalidateCache } from '../middleware/cache';

const router = Router();

// Create aliases for locations table (to join twice for from/to locations)
const fromLocations = alias(locations, 'fromLocations');
const toLocations = alias(locations, 'toLocations');

// Helper to check if token is expired
const isTokenExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// GET /api/public/bulk-movements/:token - Get bulk movement by token
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    // Find bulk movement by token
    const [bulkMovementData] = await db
      .select({
        bulkMovement: bulkMovements,
        fromLocation: fromLocations,
        toLocation: toLocations,
      })
      .from(bulkMovements)
      .leftJoin(fromLocations, eq(bulkMovements.fromLocationId, fromLocations.id))
      .leftJoin(toLocations, eq(bulkMovements.toLocationId, toLocations.id))
      .where(eq(bulkMovements.publicToken, token))
      .limit(1);

    if (!bulkMovementData) {
      return res.status(404).json({ message: 'Bulk movement not found' });
    }

    // Get items
    const items = await db
      .select()
      .from(bulkMovementItems)
      .where(eq(bulkMovementItems.bulkMovementId, bulkMovementData.bulkMovement.id));

    const expired = isTokenExpired(bulkMovementData.bulkMovement.tokenExpiresAt);

    const response: PublicBulkMovementResponse = {
      id: bulkMovementData.bulkMovement.id,
      fromLocation: {
        name: bulkMovementData.fromLocation!.name,
        code: bulkMovementData.fromLocation!.code,
        area: bulkMovementData.fromLocation!.area,
      },
      toLocation: {
        name: bulkMovementData.toLocation!.name,
        code: bulkMovementData.toLocation!.code,
        area: bulkMovementData.toLocation!.area,
      },
      status: bulkMovementData.bulkMovement.status as any,
      items,
      notes: bulkMovementData.bulkMovement.notes,
      createdAt: bulkMovementData.bulkMovement.createdAt,
      tokenExpiresAt: bulkMovementData.bulkMovement.tokenExpiresAt,
      isExpired: expired,
      confirmedBy: bulkMovementData.bulkMovement.confirmedBy,
      confirmedAt: bulkMovementData.bulkMovement.confirmedAt,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/public/bulk-movements/:token/confirm - Confirm receipt
router.post('/:token/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const validatedData = ConfirmBulkMovementSchema.parse(req.body);
    const { confirmedBy, items: confirmedItems, notes } = validatedData;

    const result = await db.transaction(async (tx) => {
      // 1. Get bulk movement by token
      const [bulkMovement] = await tx
        .select()
        .from(bulkMovements)
        .where(eq(bulkMovements.publicToken, token))
        .limit(1);

      if (!bulkMovement) {
        throw new Error('Bulk movement not found');
      }

      // 2. Validate status and expiry
      if (bulkMovement.status === 'received') {
        throw new Error('Bulk movement has already been confirmed');
      }

      if (bulkMovement.status === 'expired') {
        throw new Error('Bulk movement has expired');
      }

      if (isTokenExpired(bulkMovement.tokenExpiresAt)) {
        // Mark as expired
        await tx
          .update(bulkMovements)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(bulkMovements.id, bulkMovement.id));
        
        throw new Error('Bulk movement token has expired');
      }

      // 3. Resolve source & destination areas for area-to-area tracking
      let fromArea: string | null = null;
      let toArea: string | null = null;

      if (bulkMovement.fromLocationId) {
        const [fromLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, bulkMovement.fromLocationId))
          .limit(1);

        fromArea = fromLocation?.area ?? null;
      }

      if (bulkMovement.toLocationId) {
        const [toLocation] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, bulkMovement.toLocationId))
          .limit(1);

        toArea = toLocation?.area ?? null;
      }

      // 4. Get all bulk movement items
      const allItems = await tx
        .select()
        .from(bulkMovementItems)
        .where(eq(bulkMovementItems.bulkMovementId, bulkMovement.id));

      // Create a map for quick lookup
      const itemsMap = new Map(allItems.map(item => [item.id, item]));

      // Validate all confirmed items exist
      for (const confirmedItem of confirmedItems) {
        const item = itemsMap.get(confirmedItem.itemId);
        if (!item) {
          throw new Error(`Item ${confirmedItem.itemId} not found in bulk movement`);
        }
        if (confirmedItem.quantityReceived > item.quantitySent) {
          throw new Error(`Quantity received (${confirmedItem.quantityReceived}) cannot exceed quantity sent (${item.quantitySent})`);
        }
      }

      // 5. Update bulk movement items with received quantities
      for (const confirmedItem of confirmedItems) {
        await tx
          .update(bulkMovementItems)
          .set({ quantityReceived: confirmedItem.quantityReceived })
          .where(eq(bulkMovementItems.id, confirmedItem.itemId));
      }

      // 6. For each item with quantityReceived > 0, create new products at destination
      const createdProducts: any[] = [];
      
      for (const confirmedItem of confirmedItems) {
        if (confirmedItem.quantityReceived > 0) {
          const item = itemsMap.get(confirmedItem.itemId)!;
          
          // Get original product to copy its details
          const [originalProduct] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (!originalProduct) {
            throw new Error(`Original product ${item.productId} not found`);
          }

          // Create new product at destination location with 'Stored' status
          const [newProduct] = await tx
            .insert(products)
            .values({
              kanbanId: originalProduct.kanbanId,
              columnStatus: 'Stored',
              productDetails: originalProduct.productDetails,
              productLink: originalProduct.productLink,
              locationId: bulkMovement.toLocationId,
              assignedToPersonId: null,
              priority: originalProduct.priority,
              stockLevel: confirmedItem.quantityReceived,
              sourceProductId: originalProduct.id,
              productImage: originalProduct.productImage,
              category: originalProduct.category,
              tags: originalProduct.tags,
              supplier: originalProduct.supplier,
              sku: originalProduct.sku,
              dimensions: originalProduct.dimensions,
              weight: originalProduct.weight,
              unitPrice: originalProduct.unitPrice,
              notes: notes || originalProduct.notes,
              columnEnteredAt: new Date(),
            })
            .returning();

          createdProducts.push(newProduct);

          // Create movement log entry for audit trail (area-to-area aware)
          const [movementLog] = await tx
            .insert(movementLogs)
            .values({
              productId: newProduct.id,
              fromArea,
              toArea,
              fromLocationId: bulkMovement.fromLocationId,
              toLocationId: bulkMovement.toLocationId,
              fromPersonId: null,
              toPersonId: null,
              // We treat fromStockLevel as the total quantity that left this bulk movement item.
              // Movement table will compute remainingFrom = fromStockLevel - quantityMoved,
              // which correctly models partial receipts (some units still in transit).
              fromStockLevel: item.quantitySent,
              quantityMoved: confirmedItem.quantityReceived, // Actual quantity received and moved
              notes: `Bulk movement confirmation. ${notes || ''}`,
              movedBy: confirmedBy,
            })
            .returning();

          // Compute destination total stock (toStockLevel) at the bulk destination location
          // Group primarily by SKU; if SKU is null, fall back to kanban + productDetails.
          let toStockLevel: number | null = null;
          if (bulkMovement.toLocationId) {
            const sku = newProduct.sku;

            if (sku) {
              const [row] = await tx
                .select({
                  total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
                })
                .from(products)
                .where(
                  and(
                    eq(products.locationId, bulkMovement.toLocationId),
                    eq(products.sku, sku),
                  ),
                );

              toStockLevel = Number(row?.total ?? 0);
            } else {
              const [row] = await tx
                .select({
                  total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
                })
                .from(products)
                .where(
                  and(
                    eq(products.locationId, bulkMovement.toLocationId),
                    eq(products.kanbanId, newProduct.kanbanId),
                    eq(products.productDetails, newProduct.productDetails),
                  ),
                );

              toStockLevel = Number(row?.total ?? 0);
            }

            await tx
              .update(movementLogs)
              .set({
                toStockLevel,
              })
              .where(eq(movementLogs.id, movementLog.id));
          }
        }
      }

      // 7. Update original products' status back to Stored if not all quantity was sent
      // (In this implementation, we already reduced stock when creating bulk movement)
      // The original product remains in 'In Transit' status with reduced stock
      
      // 8. Update bulk movement status to 'received'
      await tx
        .update(bulkMovements)
        .set({
          status: 'received',
          confirmedBy,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkMovements.id, bulkMovement.id));

      return {
        bulkMovementId: bulkMovement.id,
        createdProductsCount: createdProducts.length,
        confirmedItemsCount: confirmedItems.filter(i => i.quantityReceived > 0).length,
      };
    });

    // Confirming a bulk movement creates stored products; invalidate inventory caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/inventory/stats');
    invalidateCache('/api/locations');

    res.json({
      message: 'Bulk movement confirmed successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as publicBulkMovementsRouter };

