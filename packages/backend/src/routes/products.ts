import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, transferLogs, locations } from '../db/schema';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import type { NewProduct } from '../db/schema';

const router = Router();

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
      location,
      locationId,
      priority,
      // Enhanced fields
      productImage,
      category,
      tags,
      supplier,
      sku,
      dimensions,
      weight,
      unitPrice,
      notes,
    } = req.body;

    if (!kanbanId || !columnStatus || !productDetails) {
      throw createError('Missing required fields', 400);
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

    const newProduct: NewProduct = {
      kanbanId,
      columnStatus,
      productDetails,
      productLink: productLink ?? null,
      location: location ?? null,
      locationId: locationId ?? null,
      priority: priority ?? null,
      stockLevel: null,
      productImage: productImage ?? null,
      category: category ?? null,
      tags: Array.isArray(tags) ? tags.map((tag: unknown) => String(tag)) : null,
      supplier: supplier ?? null,
      sku: sku ?? null,
      dimensions: dimensions ?? null,
      weight: coerceDecimal(weight),
      unitPrice: coerceDecimal(unitPrice),
      notes: notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdProduct] = await db
      .insert(products)
      .values(newProduct)
      .returning();

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
      unitPrice,
      notes,
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
    if (location !== undefined) updateData.location = location;
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
    if (sku !== undefined) updateData.sku = sku;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (weight !== undefined) updateData.weight = coerceDecimal(weight);
    if (unitPrice !== undefined) updateData.unitPrice = coerceDecimal(unitPrice);
    if (notes !== undefined) updateData.notes = notes;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw createError('Product not found', 404);
    }

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
});

// Move product to different column
router.put('/:id/move', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columnStatus } = req.body;

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
        location: products.location,
        locationId: products.locationId,
        priority: products.priority,
        stockLevel: products.stockLevel,
        kanbanType: kanbans.type,
        linkedKanbanId: kanbans.linkedKanbanId,
      })
      .from(products)
      .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!currentProduct) {
      throw createError('Product not found', 404);
    }

    let updateData: any = {
      columnStatus,
      updatedAt: new Date(),
    };

    // Handle stock tracking for "Stored" status
    if (columnStatus === 'Stored' && currentProduct.stockLevel === null) {
      updateData.stockLevel = 0; // Initialize stock level
    }

    // Handle automatic transfer for Order -> Receive kanbans
    if (
      currentProduct.kanbanType === 'order' &&
      columnStatus === 'Purchased' &&
      currentProduct.linkedKanbanId
    ) {
      // Create transfer log
      await db.insert(transferLogs).values({
        productId: id,
        fromKanbanId: currentProduct.kanbanId,
        toKanbanId: currentProduct.linkedKanbanId,
        fromColumn: currentProduct.columnStatus,
        toColumn: 'Purchased',
        transferType: 'automatic',
        notes: 'Automatic transfer when product moved to Purchased column',
        transferredBy: 'system',
      });

      // Move product to linked receive kanban
      const [transferredProduct] = await db
        .update(products)
        .set({
          kanbanId: currentProduct.linkedKanbanId,
          columnStatus: 'Purchased',
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      return res.json(transferredProduct);
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    // Log location change if happened
    if (locationIdInput !== undefined && locationIdInput !== currentProduct.locationId) {
      await db.insert(transferLogs).values({
        productId: id,
        fromKanbanId: currentProduct.kanbanId,
        toKanbanId: currentProduct.kanbanId, // Same kanban, just location change
        fromColumn: currentProduct.columnStatus,
        toColumn: currentProduct.columnStatus, // Same column, just location change
        fromLocationId: currentProduct.locationId,
        toLocationId: locationIdInput ?? null,
        transferType: 'manual',
        notes: `Location changed from ${currentProduct.locationId || 'unspecified'} to ${locationIdInput || 'unspecified'}`,
        transferredBy: 'user', // TODO: Get actual user from auth
      });
    }

    res.json(updatedProduct);
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

    res.json({ message: 'Product deleted successfully' });
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
