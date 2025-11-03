import { Router } from 'express';
import { db } from '../db';
import { kanbans, products } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get kanban info for public form
router.get('/form/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const [kanban] = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        type: kanbans.type,
      })
      .from(kanbans)
      .where(eq(kanbans.publicFormToken, token))
      .limit(1);

    if (!kanban) {
      throw createError('Public form not found', 404);
    }

    if (kanban.type !== 'order') {
      throw createError('Public forms are only available for Order kanbans', 400);
    }

    res.json(kanban);
  } catch (error) {
    next(error);
  }
});

// Submit public form
router.post('/form/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const {
      productDetails,
      productLink,
      location,
      priority,
    } = req.body;

    if (!productDetails) {
      throw createError('Product details are required', 400);
    }

    // Verify kanban exists and is an Order kanban
    const [kanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.publicFormToken, token))
      .limit(1);

    if (!kanban) {
      throw createError('Public form not found', 404);
    }

    if (kanban.type !== 'order') {
      throw createError('Public forms are only available for Order kanbans', 400);
    }

    // Create product in "New Request" column
    const newProduct = {
      kanbanId: kanban.id,
      columnStatus: 'New Request',
      productDetails,
      productLink: productLink || null,
      location: location || null,
      priority: priority || null,
      stockLevel: null,
    };

    const [createdProduct] = await db
      .insert(products)
      .values(newProduct)
      .returning();

    res.status(201).json({
      message: 'Product request submitted successfully',
      product: createdProduct,
    });
  } catch (error) {
    next(error);
  }
});

export { router as publicRouter };