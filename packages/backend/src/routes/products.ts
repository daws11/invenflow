import { Router } from 'express';
import { db } from '../db';
import { products, kanbans, transferLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
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

    const newProduct = {
      kanbanId,
      columnStatus,
      productDetails,
      productLink: productLink || null,
      location: location || null,
      priority: priority || null,
      stockLevel: null,
      // Enhanced fields
      productImage: productImage || null,
      category: category || null,
      tags: tags && Array.isArray(tags) ? tags : null,
      supplier: supplier || null,
      sku: sku || null,
      dimensions: dimensions || null,
      weight: weight ? parseFloat(weight) : null,
      unitPrice: unitPrice ? parseFloat(unitPrice) : null,
      notes: notes || null,
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
  try {
    const { id } = req.params;
    const {
      productDetails,
      productLink,
      location,
      priority,
      stockLevel,
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

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (productDetails !== undefined) updateData.productDetails = productDetails;
    if (productLink !== undefined) updateData.productLink = productLink;
    if (location !== undefined) updateData.location = location;
    if (priority !== undefined) updateData.priority = priority;
    if (stockLevel !== undefined) updateData.stockLevel = stockLevel;
    // Enhanced fields
    if (productImage !== undefined) updateData.productImage = productImage;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags && Array.isArray(tags) ? tags : null;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (sku !== undefined) updateData.sku = sku;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice ? parseFloat(unitPrice) : null;
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

export { router as productsRouter };