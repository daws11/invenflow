import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { kanbans, products } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get all kanbans
router.get('/', async (req, res, next) => {
  try {
    const allKanbans = await db.select().from(kanbans);
    res.json(allKanbans);
  } catch (error) {
    next(error);
  }
});

// Get kanban with products
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const kanbanData = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        type: kanbans.type,
        linkedKanbanId: kanbans.linkedKanbanId,
        publicFormToken: kanbans.publicFormToken,
        createdAt: kanbans.createdAt,
        updatedAt: kanbans.updatedAt,
      })
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (kanbanData.length === 0) {
      throw createError('Kanban not found', 404);
    }

    const kanban = kanbanData[0];

    // Get products for this kanban
    const kanbanProducts = await db
      .select()
      .from(products)
      .where(eq(products.kanbanId, id))
      .orderBy(products.createdAt);

    res.json({ ...kanban, products: kanbanProducts });
  } catch (error) {
    next(error);
  }
});

// Create kanban
router.post('/', async (req, res, next) => {
  try {
    const { name, type } = req.body;

    if (!name || !type || !['order', 'receive'].includes(type)) {
      throw createError('Invalid kanban data', 400);
    }

    const newKanban = {
      name,
      type,
      linkedKanbanId: null,
      publicFormToken: type === 'order' ? nanoid(10) : null,
    };

    const [createdKanban] = await db
      .insert(kanbans)
      .values(newKanban)
      .returning();

    res.status(201).json(createdKanban);
  } catch (error) {
    next(error);
  }
});

// Update kanban
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, linkedKanbanId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (linkedKanbanId !== undefined) updateData.linkedKanbanId = linkedKanbanId;
    updateData.updatedAt = new Date();

    const [updatedKanban] = await db
      .update(kanbans)
      .set(updateData)
      .where(eq(kanbans.id, id))
      .returning();

    if (!updatedKanban) {
      throw createError('Kanban not found', 404);
    }

    res.json(updatedKanban);
  } catch (error) {
    next(error);
  }
});

// Delete kanban
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deletedKanban] = await db
      .delete(kanbans)
      .where(eq(kanbans.id, id))
      .returning();

    if (!deletedKanban) {
      throw createError('Kanban not found', 404);
    }

    res.json({ message: 'Kanban deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as kanbansRouter };