import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  ConfirmMovementSchema,
  PublicMovementResponseSchema,
} from '@invenflow/shared';
import { db } from '../db';
import {
  movementLogs,
  products,
  locations,
  persons,
  departments,
} from '../db/schema';
import { createError } from '../middleware/errorHandler';
import { executeSingleMovement } from '../services/singleMovementExecutor';
import { invalidateCache } from '../middleware/cache';

const router = Router();
const fromLocations = alias(locations, 'fromLocations');
const toLocations = alias(locations, 'toLocations');
const toPersons = alias(persons, 'toPersons');
const toDepartments = alias(departments, 'toDepartments');

const isTokenExpired = (expiresAt: Date | null) => {
  if (!expiresAt) {
    return false;
  }
  return new Date() > expiresAt;
};

router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const [movementData] = await db
      .select({
        movement: movementLogs,
        product: products,
        fromLocation: fromLocations,
        toLocation: toLocations,
        toPerson: toPersons,
        department: toDepartments,
      })
      .from(movementLogs)
      .leftJoin(products, eq(movementLogs.productId, products.id))
      .leftJoin(fromLocations, eq(movementLogs.fromLocationId, fromLocations.id))
      .leftJoin(toLocations, eq(movementLogs.toLocationId, toLocations.id))
      .leftJoin(toPersons, eq(movementLogs.toPersonId, toPersons.id))
      .leftJoin(toDepartments, eq(toPersons.departmentId, toDepartments.id))
      .where(eq(movementLogs.publicToken, token))
      .limit(1);

    if (!movementData || !movementData.movement.requiresConfirmation) {
      throw createError('Movement not found', 404);
    }

    if (!movementData.product) {
      throw createError('Product not found', 404);
    }

    const expired = isTokenExpired(movementData.movement.tokenExpiresAt);

    if (expired && movementData.movement.status !== 'expired') {
      await db
        .update(movementLogs)
        .set({
          status: 'expired',
        })
        .where(eq(movementLogs.id, movementData.movement.id));
    }

    const response = PublicMovementResponseSchema.parse({
      id: movementData.movement.id,
      product: {
        id: movementData.product.id,
        productDetails: movementData.product.productDetails,
        sku: movementData.product.sku,
        productImage: movementData.product.productImage,
      },
      fromLocation: movementData.fromLocation
        ? {
            id: movementData.fromLocation.id,
            name: movementData.fromLocation.name,
            code: movementData.fromLocation.code,
            area: movementData.fromLocation.area,
          }
        : null,
      toLocation: movementData.toLocation
        ? {
            id: movementData.toLocation.id,
            name: movementData.toLocation.name,
            code: movementData.toLocation.code,
            area: movementData.toLocation.area,
          }
        : null,
      toPerson: movementData.toPerson
        ? {
            id: movementData.toPerson.id,
            name: movementData.toPerson.name,
            departmentName: movementData.department?.name ?? null,
          }
        : null,
      quantityMoved: movementData.movement.quantityMoved,
      requiresConfirmation: movementData.movement.requiresConfirmation,
      status: expired ? 'expired' : (movementData.movement.status as any),
      tokenExpiresAt: movementData.movement.tokenExpiresAt,
      confirmedBy: movementData.movement.confirmedBy,
      confirmedAt: movementData.movement.confirmedAt,
      notes: movementData.movement.notes,
      createdAt: movementData.movement.createdAt,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/:token/confirm', async (req, res, next) => {
  try {
    const { token } = req.params;
    const validatedData = ConfirmMovementSchema.parse(req.body);
    const { confirmedBy, quantityReceived, notes } = validatedData;

    const result = await db.transaction(async (tx) => {
      const [movementLog] = await tx
        .select()
        .from(movementLogs)
        .where(eq(movementLogs.publicToken, token))
        .limit(1);

      if (!movementLog || !movementLog.requiresConfirmation) {
        throw createError('Movement not found', 404);
      }

      if (movementLog.status === 'received') {
        throw createError('Movement already confirmed', 400);
      }
      if (movementLog.status === 'cancelled') {
        throw createError('Movement has been cancelled', 400);
      }

      if (movementLog.status === 'expired') {
        throw createError('Movement has expired', 400);
      }

      if (!movementLog.tokenExpiresAt) {
        throw createError('Movement token invalid', 400);
      }

      if (isTokenExpired(movementLog.tokenExpiresAt)) {
        await tx
          .update(movementLogs)
          .set({ status: 'expired' })
          .where(eq(movementLogs.id, movementLog.id));
        throw createError('Movement token has expired', 400);
      }

      if (quantityReceived > movementLog.quantityMoved) {
        throw createError(
          'Quantity received cannot exceed quantity sent',
          400
        );
      }

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, movementLog.productId))
        .limit(1);

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.columnStatus !== 'Stored') {
        throw createError('Only products with "Stored" status can be moved', 400);
      }

      if (quantityReceived === 0) {
        await tx
          .update(movementLogs)
          .set({
            status: 'received',
            confirmedBy,
            confirmedAt: new Date(),
            quantityMoved: 0,
            notes: notes || movementLog.notes,
            requiresConfirmation: false,
          })
          .where(eq(movementLogs.id, movementLog.id));

        return {
          movementLogId: movementLog.id,
          quantityProcessed: 0,
        };
      }

      const executionResult = await executeSingleMovement({
        tx,
        product,
        movementLog,
        quantityToMove: quantityReceived,
        toPersonId: movementLog.toPersonId,
        toLocationId: movementLog.toLocationId,
        notes: notes || movementLog.notes || null,
      });

      await tx
        .update(movementLogs)
        .set({
          status: 'received',
          confirmedBy,
          confirmedAt: new Date(),
          quantityMoved: quantityReceived,
          notes: notes || movementLog.notes,
          requiresConfirmation: false,
          toStockLevel: executionResult.toStockLevel,
        })
        .where(eq(movementLogs.id, movementLog.id));

      return {
        movementLogId: movementLog.id,
        quantityProcessed: quantityReceived,
      };
    });

    invalidateCache('/api/inventory');
    invalidateCache('/api/locations');

    res.json({
      message: 'Movement confirmed successfully',
      movementLogId: result.movementLogId,
      quantityProcessed: result.quantityProcessed,
    });
  } catch (error) {
    next(error);
  }
});

export { router as publicMovementsRouter };

