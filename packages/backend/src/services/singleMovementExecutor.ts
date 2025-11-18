import { and, eq, sql, isNull } from 'drizzle-orm';
import { movementLogs, products } from '../db/schema';
import { createError } from '../middleware/errorHandler';
import { db } from '../db';

type TransactionClient = Parameters<(typeof db)['transaction']>[0] extends (
  tx: infer T
) => any
  ? T
  : never;

type ProductRecord = typeof products.$inferSelect;
type MovementLogRecord = typeof movementLogs.$inferSelect;

interface ExecuteSingleMovementParams {
  tx: TransactionClient;
  product: ProductRecord;
  movementLog: MovementLogRecord;
  quantityToMove: number;
  toPersonId: string | null;
  toLocationId: string | null;
  notes?: string | null;
}

export const executeSingleMovement = async ({
  tx,
  product,
  movementLog,
  quantityToMove,
  toPersonId,
  toLocationId,
  notes,
}: ExecuteSingleMovementParams) => {
  const currentStock = product.stockLevel || 0;

  if (quantityToMove > currentStock) {
    throw createError(
      `Cannot move ${quantityToMove} units. Only ${currentStock} units available.`,
      400
    );
  }

  const remainingStock = currentStock - quantityToMove;
  const shouldMoveAllStock = remainingStock === 0;

  let updatedProduct: ProductRecord;
  let destinationProduct: ProductRecord | null = null;

  if (shouldMoveAllStock) {
    [updatedProduct] = await tx
      .update(products)
      .set({
        locationId: toLocationId ?? product.locationId,
        assignedToPersonId: toPersonId || product.assignedToPersonId,
        stockLevel: quantityToMove,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    destinationProduct = updatedProduct;
  } else {
    [updatedProduct] = await tx
      .update(products)
      .set({
        stockLevel: remainingStock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    const [newProduct] = await tx
      .insert(products)
      .values({
        kanbanId: product.kanbanId,
        columnStatus: 'Stored',
        productDetails: product.productDetails,
        productLink: product.productLink,
        locationId: toLocationId || null,
        assignedToPersonId: toPersonId || null,
        priority: product.priority,
        stockLevel: quantityToMove,
        sourceProductId: product.id,
        productImage: product.productImage,
        category: product.category,
        tags: product.tags,
        supplier: product.supplier,
        sku: product.sku,
        dimensions: product.dimensions,
        weight: product.weight,
        unitPrice: product.unitPrice,
        notes: product.notes,
        columnEnteredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    destinationProduct = newProduct ?? null;

    await tx
      .update(movementLogs)
      .set({
        notes: `${notes || 'Product movement'} - New product created at destination: ${newProduct.id}`,
      })
      .where(eq(movementLogs.id, movementLog.id));
  }

  let toStockLevel: number | null = null;

  if (toLocationId && destinationProduct) {
    const sku = destinationProduct.sku;

    if (sku) {
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
        })
        .from(products)
        .where(and(eq(products.locationId, toLocationId), eq(products.sku, sku)));

      toStockLevel = Number(row?.total ?? 0);
    } else {
      const kanbanIdCondition = destinationProduct.kanbanId
        ? eq(products.kanbanId, destinationProduct.kanbanId)
        : isNull(products.kanbanId);
      
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${products.stockLevel}), 0)`,
        })
        .from(products)
        .where(
          and(
            eq(products.locationId, toLocationId),
            kanbanIdCondition,
            eq(products.productDetails, destinationProduct.productDetails)
          )
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

  return {
    updatedProduct,
    destinationProduct,
    toStockLevel,
  };
};

