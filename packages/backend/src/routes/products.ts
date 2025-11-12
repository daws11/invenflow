import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, transferLogs, locations, productValidations, kanbanLinks, skuAliases } from '../db/schema';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import type { NewProduct } from '../db/schema';
import { authenticateToken } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';
import { nanoid } from 'nanoid';
import { generateStableSku, normalizeSku } from '../utils/sku';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

const coerceDecimal = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value.toString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return Number.isNaN(Number(trimmed)) ? null : trimmed;
  }
  return null;
};

const coerceInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const productColumns = getTableColumns(products);
    const locationColumns = getTableColumns(locations);

    const [product] = await db
      .select({
        ...productColumns,
        location: locationColumns,
      })
      .from(products)
      .leftJoin(locations, eq(products.locationId, locations.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw createError('Product not found', 404);
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req, res, next) => {
  try {
    const {
      kanbanId,
      columnStatus,
      productDetails,
      productLink,
      locationId,
      assignedToPersonId,
      priority,
      // Enhanced fields
      productImage,
      category,
      tags,
      supplier,
      dimensions,
      weight,
      unitPrice,
      notes,
    } = req.body;

    if (!kanbanId || !columnStatus || !productDetails) {
      throw createError('Missing required fields', 400);
    }

    // Get kanban info to determine if product should be draft
    const [kanban] = await db
      .select({ type: kanbans.type })
      .from(kanbans)
      .where(eq(kanbans.id, kanbanId))
      .limit(1);

    if (!kanban) {
      throw createError('Kanban not found', 404);
    }

    // Validate locationId if provided
    if (locationId) {
      const [locationExists] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!locationExists) {
        throw createError('Invalid locationId', 400);
      }
    }

    // Build final SKU (normalize provided or generate a stable SKU)
    const providedSku: unknown = req.body?.sku;
    const finalSku =
      (typeof providedSku === 'string' && providedSku.trim().length > 0
        ? normalizeSku(providedSku)
        : generateStableSku({
            name: productDetails,
            supplier: (typeof supplier === 'string' && supplier) ? supplier : '',
            category: (typeof category === 'string' && category) ? category : '',
            dimensions: (typeof dimensions === 'string' && dimensions) ? dimensions : undefined,
          }));

    // Determine if product should be draft
    const isDraft = kanban.type === 'order' && ['New Request', 'In Review'].includes(columnStatus);

    // For order kanbans, don't set locationId - products should only have preferred receive kanban
    // For receive kanbans, locationId is required
    const finalLocationId = kanban.type === 'receive' ? (locationId ?? null) : null;

    const newProduct: NewProduct = {
      kanbanId,
      columnStatus,
      productDetails,
      productLink: productLink ?? null,
      locationId: finalLocationId,
      assignedToPersonId: assignedToPersonId ?? null,
      preferredReceiveKanbanId: req.body.preferredReceiveKanbanId ?? null,
      priority: priority ?? null,
      stockLevel: null,
      productImage: productImage ?? null,
      category: category ?? null,
      tags: Array.isArray(tags) ? tags.map((tag: unknown) => String(tag)) : null,
      supplier: supplier ?? null,
      sku: finalSku,
      dimensions: dimensions ?? null,
      weight: coerceDecimal(weight),
      unitPrice: coerceDecimal(unitPrice),
      notes: notes ?? null,
      importSource: 'manual',
      isDraft,
      columnEnteredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdProduct] = await db
      .insert(products)
      .values(newProduct)
      .returning();

    // Invalidate relevant caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
});

// Update product details
router.put('/:id', async (req, res, next) => {
  let locationIdInput: string | null | undefined = undefined;
  try {
    const { id } = req.params;
    const {
      productDetails,
      productLink,
      location,
      priority,
      stockLevel,
      productImage,
      category,
      tags,
      supplier,
      sku,
      dimensions,
      weight,
      unit,
      unitPrice,
      notes,
      assignedToPersonId,
    } = req.body;

    locationIdInput = req.body?.locationId as string | null | undefined;

    // Get current product to check location changes
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!currentProduct) {
      throw createError('Product not found', 404);
    }

    const updateData: Partial<NewProduct> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (productDetails !== undefined) updateData.productDetails = productDetails;
    if (productLink !== undefined) updateData.productLink = productLink;
    // Note: location is now handled via locationId, not as a separate field
    if (priority !== undefined) updateData.priority = priority;
    if (stockLevel !== undefined) {
      updateData.stockLevel = coerceInteger(stockLevel);
    }

    // Handle locationId changes
    if (locationIdInput !== undefined) {
      if (locationIdInput && locationIdInput !== currentProduct.locationId) {
        // Validate the new locationId
        const [locationExists] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, locationIdInput))
          .limit(1);

        if (!locationExists) {
          throw createError('Invalid locationId', 400);
        }
      }
      updateData.locationId = locationIdInput ?? null;
    }
    // Enhanced fields
    if (productImage !== undefined) updateData.productImage = productImage;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? tags.map((tag: unknown) => String(tag))
        : null;
    }
    if (supplier !== undefined) updateData.supplier = supplier;
    if (sku !== undefined) {
      const normalized = sku ? normalizeSku(sku) : null;
      if (currentProduct.sku && normalized && normalized !== currentProduct.sku) {
        try {
          await db.insert(skuAliases).values({
            productId: currentProduct.id,
            legacySku: currentProduct.sku,
            legacyId: null,
          });
        } catch {}
      }
      updateData.sku = normalized;
    }
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (weight !== undefined) updateData.weight = coerceDecimal(weight);
    if (unit !== undefined) updateData.unit = unit;
    if (unitPrice !== undefined) updateData.unitPrice = coerceDecimal(unitPrice);
    if (notes !== undefined) updateData.notes = notes;
    if (assignedToPersonId !== undefined) updateData.assignedToPersonId = assignedToPersonId;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw createError('Product not found', 404);
    }

    // Invalidate relevant caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
});

// Move product to different column
router.put('/:id/move', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columnStatus, locationId, skipValidation } = req.body;

    if (!columnStatus) {
      throw createError('Column status is required', 400);
    }

    // Get current product with kanban info
    const [currentProduct] = await db
      .select({
        id: products.id,
        kanbanId: products.kanbanId,
        columnStatus: products.columnStatus,
        productDetails: products.productDetails,
        productLink: products.productLink,
        locationId: products.locationId,
        assignedToPersonId: products.assignedToPersonId,
        preferredReceiveKanbanId: products.preferredReceiveKanbanId,
        priority: products.priority,
        stockLevel: products.stockLevel,
        kanbanType: kanbans.type,
        linkedKanbanId: kanbans.linkedKanbanId,
        defaultLinkedKanbanId: kanbans.defaultLinkedKanbanId,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!currentProduct) {
      throw createError('Product not found', 404);
    }

    // Check if validation is required for receive kanbans
    if (!skipValidation && currentProduct.kanbanType === 'receive' &&
        (columnStatus === 'Received' || columnStatus === 'Stored')) {

      // Check if validation exists for this product and target status
      const [existingValidation] = await db
        .select()
        .from(productValidations)
        .where(
          and(
            eq(productValidations.productId, id),
            eq(productValidations.columnStatus, columnStatus)
          )
        )
        .limit(1);

      // If no validation exists, throw error to trigger validation modal
      if (!existingValidation) {
        const error: any = createError('Validation required', 400);
        error.details = {
          requiresValidation: true,
          productId: id,
          columnStatus,
        };
        throw error;
      }
    }

    let updateData: any = {
      columnStatus,
      updatedAt: new Date(),
    };

    // Reset columnEnteredAt if column status is changing
    if (currentProduct.columnStatus !== columnStatus) {
      updateData.columnEnteredAt = new Date();
    }

    // Handle locationId if provided
    if (locationId !== undefined) {
      if (locationId && locationId !== currentProduct.locationId) {
        // Validate the new locationId
        const [locationExists] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, locationId))
          .limit(1);

        if (!locationExists) {
          throw createError('Invalid locationId', 400);
        }
      }
      updateData.locationId = locationId ?? null;
    }

    // Handle stock tracking for "Stored" status
    if (columnStatus === 'Stored' && currentProduct.stockLevel === null) {
      updateData.stockLevel = 0; // Initialize stock level
    }

    // Handle draft status for Order kanbans
    if (currentProduct.kanbanType === 'order') {
      // Product becomes actual when moved to "Purchased", becomes draft when moved back to "New Request" or "In Review"
      updateData.isDraft = ['New Request', 'In Review'].includes(columnStatus);
    }

    // Handle automatic transfer for order kanbans moving to "Purchased"
    let transferInfo = null;
    if (currentProduct.kanbanType === 'order' && columnStatus === 'Purchased' && !currentProduct.isDraft) {
      // Determine target kanban based on priority: per-product preference > kanban default
      let targetKanbanId = currentProduct.preferredReceiveKanbanId || currentProduct.defaultLinkedKanbanId;
      
      if (targetKanbanId) {
        // Verify the target kanban exists and is linked
        const [targetKanban] = await db
          .select({
            id: kanbans.id,
            name: kanbans.name,
            type: kanbans.type,
            locationId: kanbans.locationId,
          })
          .from(kanbans)
          .where(eq(kanbans.id, targetKanbanId))
          .limit(1);

        if (targetKanban && targetKanban.type === 'receive') {
          // Verify the link exists
          const [linkExists] = await db
            .select()
            .from(kanbanLinks)
            .where(
              and(
                eq(kanbanLinks.orderKanbanId, currentProduct.kanbanId),
                eq(kanbanLinks.receiveKanbanId, targetKanbanId)
              )
            )
            .limit(1);

          if (linkExists) {
            // Perform automatic transfer
            updateData.kanbanId = targetKanbanId;
            // Always use target kanban's location for automatic transfers
            updateData.locationId = targetKanban.locationId;
            
            transferInfo = {
              targetKanbanId,
              targetKanbanName: targetKanban.name,
              wasAutoTransferred: true,
              transferSource: currentProduct.preferredReceiveKanbanId ? 'product-preference' : 'kanban-default'
            };

            // Create transfer log
            await db.insert(transferLogs).values({
              productId: id,
              fromKanbanId: currentProduct.kanbanId,
              toKanbanId: targetKanbanId,
              fromColumn: currentProduct.columnStatus,
              toColumn: columnStatus,
              toLocationId: targetKanban.locationId,
              transferType: 'automatic',
              notes: `Automatically transferred to receive kanban based on ${transferInfo.transferSource === 'product-preference' ? 'product preference' : 'kanban default setting'}. Location set to target kanban default.`,
              transferredBy: 'system',
            });
          }
        }
      }
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    // Log location change if happened
    if (locationId !== undefined && locationId !== currentProduct.locationId) {
      await db.insert(transferLogs).values({
        productId: id,
        fromKanbanId: currentProduct.kanbanId,
        toKanbanId: currentProduct.kanbanId, // Same kanban, just location change
        fromColumn: currentProduct.columnStatus,
        toColumn: currentProduct.columnStatus, // Same column, just location change
        fromLocationId: currentProduct.locationId,
        toLocationId: locationId ?? null,
        transferType: 'manual',
        notes: `Location changed from ${currentProduct.locationId || 'unspecified'} to ${locationId || 'unspecified'}`,
        transferredBy: 'user', // TODO: Get actual user from auth
      });
    }

    // Include transfer info in response for frontend notifications
    const response = {
      ...updatedProduct,
      ...(transferInfo && { transferInfo })
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Transfer product from order kanban to receive kanban
router.post('/:id/transfer', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetKanbanId } = req.body;

    if (!targetKanbanId) {
      throw createError('targetKanbanId is required', 400);
    }

    // Get current product with kanban info
    const [currentProduct] = await db
      .select({
        id: products.id,
        kanbanId: products.kanbanId,
        columnStatus: products.columnStatus,
        productDetails: products.productDetails,
        kanbanType: kanbans.type,
        isDraft: products.isDraft,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!currentProduct) {
      throw createError('Product not found', 404);
    }

    // Verify source is an order kanban
    if (currentProduct.kanbanType !== 'order') {
      throw createError('Can only transfer from order kanbans', 400);
    }

    // Verify product is in "Purchased" column
    if (currentProduct.columnStatus !== 'Purchased') {
      throw createError('Product must be in Purchased column to transfer', 400);
    }

    // Verify product is not a draft
    if (currentProduct.isDraft) {
      throw createError('Cannot transfer draft products. Product must be moved to Purchased column first to become an actual product.', 400);
    }

    // Get target kanban and verify it's linked and is receive type
    const [targetKanban] = await db
      .select({
        id: kanbans.id,
        type: kanbans.type,
        locationId: kanbans.locationId,
      })
      .from(kanbans)
      .where(eq(kanbans.id, targetKanbanId))
      .limit(1);

    if (!targetKanban) {
      throw createError('Target kanban not found', 404);
    }

    if (targetKanban.type !== 'receive') {
      throw createError('Target must be a receive kanban', 400);
    }

    // Verify the link exists
    const [linkExists] = await db
      .select()
      .from(kanbanLinks)
      .where(
        and(
          eq(kanbanLinks.orderKanbanId, currentProduct.kanbanId),
          eq(kanbanLinks.receiveKanbanId, targetKanbanId)
        )
      )
      .limit(1);

    if (!linkExists) {
      throw createError('Target kanban is not linked to this order kanban', 400);
    }

    // Transfer the product
    const [transferredProduct] = await db
      .update(products)
      .set({
        kanbanId: targetKanbanId,
        columnStatus: 'Purchased',
        locationId: targetKanban.locationId, // Set location from target kanban
        columnEnteredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    // Create transfer log
    await db.insert(transferLogs).values({
      productId: id,
      fromKanbanId: currentProduct.kanbanId,
      toKanbanId: targetKanbanId,
      fromColumn: currentProduct.columnStatus,
      toColumn: 'Purchased',
      toLocationId: targetKanban.locationId,
      transferType: 'manual',
      notes: `Product transferred to receive kanban with location automatically set`,
      transferredBy: 'user', // TODO: Get actual user from auth
    });

    res.json(transferredProduct);
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (!deletedProduct) {
      throw createError('Product not found', 404);
    }

    // Invalidate relevant caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Bulk operations
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    const deletedProducts = await db
      .delete(products)
      .where(eq(products.id, productIds[0])) // This would need to be updated to handle multiple IDs
      .returning();

    // For now, delete one by one (not optimal, but works)
    const results = [];
    for (const id of productIds) {
      try {
        const [deleted] = await db
          .delete(products)
          .where(eq(products.id, id))
          .returning();
        if (deleted) {
          results.push(deleted);
        }
      } catch (err) {
        console.error(`Failed to delete product ${id}:`, err);
      }
    }

    // Invalidate relevant caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({ 
      message: `${results.length} products deleted successfully`,
      deletedCount: results.length,
      requestedCount: productIds.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-update', async (req, res, next) => {
  try {
    const { productIds, updateData } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    if (!updateData || typeof updateData !== 'object') {
      throw createError('Update data is required', 400);
    }

    // Update products one by one (not optimal, but works for now)
    const results = [];
    for (const id of productIds) {
      try {
        const [updated] = await db
          .update(products)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning();
        if (updated) {
          results.push(updated);
        }
      } catch (err) {
        console.error(`Failed to update product ${id}:`, err);
      }
    }

    // Invalidate relevant caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({ 
      message: `${results.length} products updated successfully`,
      updatedProducts: results,
      updatedCount: results.length,
      requestedCount: productIds.length
    });
  } catch (error) {
    next(error);
  }
});

// Get products by location
router.get('/by-location/:locationId', async (req, res, next) => {
  try {
    const { locationId } = req.params;

    // Verify location exists
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);

    if (!location) {
      throw createError('Location not found', 404);
    }

    // Get products at this location with kanban info
    const productColumns = getTableColumns(products);
    const kanbanColumns = {
      id: kanbans.id,
      name: kanbans.name,
      type: kanbans.type,
    };
    const locationColumns = getTableColumns(locations);

    const locationProducts = await db
      .select({
        ...productColumns,
        kanban: kanbanColumns,
        location: locationColumns,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .leftJoin(locations, eq(products.locationId, locations.id))
      .where(eq(products.locationId, locationId))
      .orderBy(desc(products.updatedAt));

    res.json({
      location,
      products: locationProducts,
      count: locationProducts.length,
    });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };
