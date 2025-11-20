import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, transferLogs, locations, productValidations, kanbanLinks, skuAliases, productGroups } from '../db/schema';
import { eq, and, desc, getTableColumns, sql, inArray, isNull } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import type { NewProduct } from '../db/schema';
import { authenticateToken } from '../middleware/auth';
import { invalidateInventoryCaches, type CacheTagDescriptor } from '../utils/cacheInvalidation';
import { nanoid } from 'nanoid';
import { generateStableSku, normalizeSku } from '../utils/sku';
import { cacheMiddleware } from '../middleware/cache';

type ProductRecord = typeof products.$inferSelect;

const router = Router();

type ProductInvalidationContext = {
  productIds?: Array<string | null | undefined>;
  kanbanIds?: Array<string | null | undefined>;
  locationIds?: Array<string | null | undefined>;
  skuValues?: Array<string | null | undefined>;
};

const invalidateProductCaches = async (context: ProductInvalidationContext = {}) => {
  const tags: CacheTagDescriptor[] = [];

  const addUniqueTags = (
    values: Array<string | null | undefined> | undefined,
    resource: CacheTagDescriptor["resource"],
  ) => {
    if (!values) {
      return;
    }
    const unique = Array.from(
      new Set(values.filter((value): value is string => Boolean(value))),
    );
    unique.forEach((value) => tags.push({ resource, id: value }));
  };

  addUniqueTags(context.productIds, "product");
  addUniqueTags(context.kanbanIds, "kanban");
  addUniqueTags(context.locationIds, "location");
  addUniqueTags(context.skuValues, "sku");

  await invalidateInventoryCaches(tags);
};

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

// Get rejected products (used by Rejection Log)
router.get('/rejected', async (req, res, next) => {
  try {
    const { kanbanId } = req.query as { kanbanId?: string };

    const rejectedProducts = await db
      .select()
      .from(products)
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(products.isRejected, true),
          // Only include products from order kanbans
          eq(kanbans.type, 'order'),
          // Optional filter by specific kanbanId if provided
          kanbanId ? eq(products.kanbanId, kanbanId) : sql`true`,
        ),
      )
      .orderBy(desc(products.rejectedAt));

    res.json(rejectedProducts.map((p) => p.products));
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get(
  '/:id',
  cacheMiddleware({
    ttl: 3 * 60 * 1000,
    tags: [{ resource: 'product' }],
    buildTags: (req) => [{ resource: 'product', id: req.params.id }],
  }),
  async (req, res, next) => {
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

    // Determine next column position within this kanban & column
    // New products should appear at the TOP of the column, so we take current MIN position and subtract 1
    const [positionResult] = await db
      .select({
        min: sql<number>`coalesce(min(${products.columnPosition}), 0)`,
      })
      .from(products)
      .where(
        and(
          eq(products.kanbanId, kanbanId),
          eq(products.columnStatus, columnStatus)
        )
      );

    const nextPosition = (positionResult?.min ?? 0) - 1;

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
      columnPosition: nextPosition,
    };

    const [createdProduct] = await db
      .insert(products)
      .values(newProduct)
      .returning();

    await invalidateProductCaches({
      productIds: [createdProduct.id],
      kanbanIds: [createdProduct.kanbanId],
      locationIds: [createdProduct.locationId],
      skuValues: [createdProduct.sku],
    });

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
      preferredReceiveKanbanId,
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
    if (preferredReceiveKanbanId !== undefined) updateData.preferredReceiveKanbanId = preferredReceiveKanbanId;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw createError('Product not found', 404);
    }

    await invalidateProductCaches({
      productIds: [updatedProduct.id],
      kanbanIds: [updatedProduct.kanbanId, currentProduct.kanbanId],
      locationIds: [updatedProduct.locationId, currentProduct.locationId],
      skuValues: [updatedProduct.sku, currentProduct.sku],
    });

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
        isDraft: products.isDraft,
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

    const isColumnChanging = currentProduct.columnStatus !== columnStatus;

    // Reset columnEnteredAt if column status is changing
    if (isColumnChanging) {
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

        if (targetKanban && targetKanban.type === 'receive' && currentProduct.kanbanId) {
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

    // If column status is changing, determine new columnPosition so the product appears at the TOP of the target column
    if (isColumnChanging) {
      const targetKanbanIdForPosition = (updateData.kanbanId as string | undefined) ?? currentProduct.kanbanId;

      if (targetKanbanIdForPosition) {
        const [positionResult] = await db
          .select({
            min: sql<number>`coalesce(min(${products.columnPosition}), 0)`,
          })
          .from(products)
          .where(
            and(
              eq(products.kanbanId, targetKanbanIdForPosition),
              eq(products.columnStatus, columnStatus)
            )
          );

        const nextPosition = (positionResult?.min ?? 0) - 1;
        updateData.columnPosition = nextPosition;
      }
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    // Log location change if happened
    if (locationId !== undefined && locationId !== currentProduct.locationId && currentProduct.kanbanId) {
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

    if (!currentProduct.kanbanId) {
      throw createError('Product has no kanban association and cannot be transferred', 400);
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

    await invalidateProductCaches({
      productIds: [deletedProduct.id],
      kanbanIds: [deletedProduct.kanbanId],
      locationIds: [deletedProduct.locationId],
      skuValues: [deletedProduct.sku],
    });

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

    const uniqueIds = Array.from(new Set(productIds));

    const deletedProducts = await db
      .delete(products)
      .where(inArray(products.id, uniqueIds))
      .returning();

    const deletedIdSet = new Set(deletedProducts.map((product) => product.id));
    const failedIds = productIds.filter((id) => !deletedIdSet.has(id));

    await invalidateProductCaches({
      productIds: deletedProducts.map((product) => product.id),
      kanbanIds: deletedProducts.map((product) => product.kanbanId),
      locationIds: deletedProducts.map((product) => product.locationId),
      skuValues: deletedProducts.map((product) => product.sku),
    });

    res.json({
      message: `${deletedProducts.length} products deleted successfully`,
      deletedCount: deletedProducts.length,
      requestedCount: productIds.length,
      deletedProducts,
      failedIds,
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

    const sanitizedUpdateEntries = Object.entries(updateData).filter(
      ([, value]) => value !== undefined,
    );

    if (sanitizedUpdateEntries.length === 0) {
      throw createError('Update data is required', 400);
    }

    const sanitizedUpdateData = Object.fromEntries(sanitizedUpdateEntries);
    const uniqueIds = Array.from(new Set(productIds));

    const updatedProducts = await db
      .update(products)
      .set({
        ...sanitizedUpdateData,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, uniqueIds))
      .returning();

    const updatedIdSet = new Set(updatedProducts.map((product) => product.id));
    const failedIds = productIds.filter((id) => !updatedIdSet.has(id));

    await invalidateProductCaches({
      productIds: updatedProducts.map((product) => product.id),
      kanbanIds: updatedProducts.map((product) => product.kanbanId),
      locationIds: updatedProducts.map((product) => product.locationId),
      skuValues: updatedProducts.map((product) => product.sku),
    });

    res.json({
      message: `${updatedProducts.length} products updated successfully`,
      updatedProducts,
      updatedCount: updatedProducts.length,
      requestedCount: productIds.length,
      failedIds,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk reject products
router.post('/bulk-reject', async (req, res, next) => {
  try {
    const { productIds, rejectionReason } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    const uniqueIds = Array.from(new Set(productIds));

    const productsToReject = await db
      .select()
      .from(products)
      .where(inArray(products.id, uniqueIds));

    const validColumns = ['New Request', 'In Review'];
    const validIds = productsToReject
      .filter((product) => validColumns.includes(product.columnStatus))
      .map((product) => product.id);

    if (validIds.length === 0) {
      return res.json({
        message: '0 products rejected successfully',
        affectedCount: 0,
        successIds: [],
        failedIds: productIds,
        rejectedProducts: [],
      });
    }

    const updatedProducts = await db
      .update(products)
      .set({
        isRejected: true,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, validIds))
      .returning();

    const updatedIdSet = new Set(updatedProducts.map((product) => product.id));
    const failedIds = productIds.filter((id) => !updatedIdSet.has(id));

    await invalidateProductCaches({
      productIds: updatedProducts.map((product) => product.id),
      kanbanIds: updatedProducts.map((product) => product.kanbanId),
      locationIds: updatedProducts.map((product) => product.locationId),
      skuValues: updatedProducts.map((product) => product.sku),
    });

    res.json({
      message: `${updatedProducts.length} products rejected successfully`,
      affectedCount: updatedProducts.length,
      successIds: updatedProducts.map((product) => product.id),
      failedIds,
      rejectedProducts: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Unreject a single product
router.post('/:id/unreject', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) {
      throw createError('Product not found', 404);
    }

    if (!product.isRejected) {
      throw createError('Product is not rejected', 400);
    }

    const [updated] = await db
      .update(products)
      .set({
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await invalidateProductCaches({
      productIds: [updated.id, product.id],
      kanbanIds: [updated.kanbanId, product.kanbanId],
      locationIds: [updated.locationId, product.locationId],
      skuValues: [updated.sku, product.sku],
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Bulk move products
router.post('/bulk-move', async (req, res, next) => {
  try {
    const { productIds, targetColumn, locationId } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    if (!targetColumn) {
      throw createError('Target column is required', 400);
    }

    if (targetColumn === 'Stored' && !locationId) {
      throw createError('Location ID is required when moving to Stored', 400);
    }

    const uniqueIds = Array.from(new Set(productIds));

    const productsToMove = await db
      .select()
      .from(products)
      .where(inArray(products.id, uniqueIds));

    if (productsToMove.length === 0) {
      return res.json({
        message: '0 products moved successfully',
        affectedCount: 0,
        successIds: [],
        failedIds: productIds,
        movedProducts: [],
      });
    }

    const columnStatuses = Array.from(
      new Set(productsToMove.map((product) => product.columnStatus)),
    );

    if (columnStatuses.length > 1) {
      throw createError('All products must be in the same column for bulk move', 400);
    }

    const sourceColumn = columnStatuses[0];

    const updateData: any = {
      columnStatus: targetColumn,
      columnEnteredAt: new Date(),
      updatedAt: new Date(),
    };

    if (targetColumn === 'Stored') {
      updateData.locationId = locationId;
    }

    const updatedProducts = await db
      .update(products)
      .set(updateData)
      .where(
        and(
          inArray(products.id, uniqueIds),
          eq(products.columnStatus, sourceColumn),
        ),
      )
      .returning();

    const updatedIdSet = new Set(updatedProducts.map((product) => product.id));
    const failedIds = productIds.filter((id) => !updatedIdSet.has(id));

    await invalidateProductCaches({
      productIds: updatedProducts.map((product) => product.id),
      kanbanIds: updatedProducts.map((product) => product.kanbanId),
      locationIds: [
        ...updatedProducts.map((product) => product.locationId),
        locationId,
      ],
      skuValues: updatedProducts.map((product) => product.sku),
    });

    res.json({
      message: `${updatedProducts.length} products moved successfully`,
      affectedCount: updatedProducts.length,
      successIds: updatedProducts.map((product) => product.id),
      failedIds,
      movedProducts: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Reorder products and groups within a single kanban column
router.post('/reorder', async (req, res, next) => {
  try {
    const {
      kanbanId,
      columnStatus,
      orderedProductIds,
      orderedItems,
    } = req.body as {
      kanbanId?: string;
      columnStatus?: string;
      orderedProductIds?: string[];
      orderedItems?: { id: string; type: 'product' | 'group' }[];
    };

    if (!kanbanId || !columnStatus) {
      throw createError('kanbanId and columnStatus are required', 400);
    }

    // Build normalized ordered items: prefer explicit orderedItems,
    // but fall back to orderedProductIds for backward-compatibility.
    let normalizedOrderedItems: { id: string; type: 'product' | 'group' }[] = [];

    if (Array.isArray(orderedItems) && orderedItems.length > 0) {
      normalizedOrderedItems = orderedItems;
    } else if (Array.isArray(orderedProductIds) && orderedProductIds.length > 0) {
      normalizedOrderedItems = orderedProductIds.map((id) => ({
        id,
        type: 'product' as const,
      }));
    } else {
      throw createError('orderedItems or orderedProductIds are required', 400);
    }

    // Verify kanban exists and get its type
    const [kanban] = await db
      .select({
        id: kanbans.id,
        type: kanbans.type,
      })
      .from(kanbans)
      .where(eq(kanbans.id, kanbanId))
      .limit(1);

    if (!kanban) {
      throw createError('Kanban not found', 404);
    }

    // Optional: validate columnStatus for kanban type
    const validColumns =
      kanban.type === 'order'
        ? ['New Request', 'In Review', 'Purchased']
        : ['Purchased', 'Received', 'Stored'];

    if (!validColumns.includes(columnStatus)) {
      throw createError('Invalid columnStatus for this kanban type', 400);
    }

    // Fetch existing ungrouped products and groups in this kanban & column
    const existingProducts = await db
      .select({
        id: products.id,
      })
      .from(products)
      .where(
        and(
          eq(products.kanbanId, kanbanId),
          eq(products.columnStatus, columnStatus),
          isNull(products.productGroupId)
        )
      );

    const existingGroups = await db
      .select({
        id: productGroups.id,
      })
      .from(productGroups)
      .where(
        and(
          eq(productGroups.kanbanId, kanbanId),
          eq(productGroups.columnStatus, columnStatus)
        )
      );

    const existingProductIds = existingProducts.map((p) => p.id);
    const existingGroupIds = existingGroups.map((g) => g.id);

    const productIdsInOrder = normalizedOrderedItems
      .filter((item) => item.type === 'product')
      .map((item) => item.id);
    const groupIdsInOrder = normalizedOrderedItems
      .filter((item) => item.type === 'group')
      .map((item) => item.id);

    const productIdSet = new Set(productIdsInOrder);
    const groupIdSet = new Set(groupIdsInOrder);

    // Ensure ordered items exactly match existing ungrouped products and groups
    const productsLengthMatches = existingProductIds.length === productIdsInOrder.length;
    const groupsLengthMatches = existingGroupIds.length === groupIdsInOrder.length;
    const noDuplicateProducts = productIdSet.size === productIdsInOrder.length;
    const noDuplicateGroups = groupIdSet.size === groupIdsInOrder.length;
    const allProductIdsMatch = existingProductIds.every((id) => productIdSet.has(id));
    const allGroupIdsMatch = existingGroupIds.every((id) => groupIdSet.has(id));

    if (
      !productsLengthMatches ||
      !groupsLengthMatches ||
      !noDuplicateProducts ||
      !noDuplicateGroups ||
      !allProductIdsMatch ||
      !allGroupIdsMatch
    ) {
      throw createError(
        'orderedItems must match all ungrouped products and product groups in the target kanban column',
        400
      );
    }

    // Apply new positions inside a transaction for consistency
    const updatedProducts: ProductRecord[] = [];
    const updatedGroups: typeof productGroups.$inferSelect[] = [];

    await db.transaction(async (tx) => {
      for (let index = 0; index < normalizedOrderedItems.length; index++) {
        const item = normalizedOrderedItems[index];

        if (item.type === 'product') {
          const [updated] = await tx
        .update(products)
        .set({
          columnPosition: index,
          updatedAt: new Date(),
        })
        .where(
          and(
                eq(products.id, item.id),
            eq(products.kanbanId, kanbanId),
                eq(products.columnStatus, columnStatus),
                isNull(products.productGroupId)
          )
        )
        .returning();

      if (updated) {
        updatedProducts.push(updated);
      }
        } else if (item.type === 'group') {
          const [updated] = await tx
            .update(productGroups)
            .set({
              columnPosition: index,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(productGroups.id, item.id),
                eq(productGroups.kanbanId, kanbanId),
                eq(productGroups.columnStatus, columnStatus)
              )
            )
            .returning();

          if (updated) {
            updatedGroups.push(updated);
          }
        }
      }
    });

    await invalidateProductCaches({
      productIds: updatedProducts.map((product) => product.id),
      kanbanIds: [kanbanId],
    });

    res.json({
      message: 'Items reordered successfully',
      affectedCount: updatedProducts.length + updatedGroups.length,
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
