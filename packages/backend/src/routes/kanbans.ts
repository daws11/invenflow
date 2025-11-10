import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { kanbans, products } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { UpdateKanbanSchema, FormFieldSettingsSchema, DEFAULT_FORM_FIELD_SETTINGS } from '@invenflow/shared';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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
        description: kanbans.description,
        linkedKanbanId: kanbans.linkedKanbanId,
        publicFormToken: kanbans.publicFormToken,
        isPublicFormEnabled: kanbans.isPublicFormEnabled,
        formFieldSettings: kanbans.formFieldSettings,
        thresholdRules: kanbans.thresholdRules,
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
      .orderBy(asc(products.createdAt));

    res.json({ ...kanban, products: kanbanProducts });
  } catch (error) {
    next(error);
  }
});

// Create kanban
router.post('/', async (req, res, next) => {
  try {
    const { name, type, description, thresholdRules } = req.body;

    if (!name || !type || !['order', 'receive'].includes(type)) {
      throw createError('Invalid kanban data', 400);
    }

    const newKanban: any = {
      name,
      type,
      description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : null,
      linkedKanbanId: null,
      publicFormToken: type === 'order' ? nanoid(10) : null,
      formFieldSettings: type === 'order' ? DEFAULT_FORM_FIELD_SETTINGS : null,
    };

    // Add thresholdRules if provided
    if (thresholdRules !== undefined) {
      newKanban.thresholdRules = thresholdRules;
    }

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
    
    // Validate request body against schema
    const validationResult = UpdateKanbanSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw createError('Invalid kanban data: ' + validationResult.error.message, 400);
    }

    const { name, linkedKanbanId, description, thresholdRules, formFieldSettings } = validationResult.data;

    // Check if kanban exists and get its type for validation
    const [existingKanban] = await db
      .select({ type: kanbans.type })
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (!existingKanban) {
      throw createError('Kanban not found', 404);
    }

    // Validate formFieldSettings is only for order kanbans
    if (formFieldSettings !== undefined && existingKanban.type !== 'order') {
      throw createError('Form field settings are only available for Order kanbans', 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (linkedKanbanId !== undefined) updateData.linkedKanbanId = linkedKanbanId;
    if (description !== undefined) {
      updateData.description = typeof description === 'string' && description.trim().length > 0 ? description.trim() : null;
    }
    if (thresholdRules !== undefined) {
      updateData.thresholdRules = thresholdRules;
    }
    if (formFieldSettings !== undefined) {
      updateData.formFieldSettings = formFieldSettings;
    }
    updateData.updatedAt = new Date().toISOString();

    const [updatedKanban] = await db
      .update(kanbans)
      .set(updateData)
      .where(eq(kanbans.id, id))
      .returning();

    res.json(updatedKanban);
  } catch (error) {
    next(error);
  }
});

// Update public form settings
router.put('/:id/public-form-settings', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublicFormEnabled, formFieldSettings } = req.body;

    // Validate inputs
    if (isPublicFormEnabled !== undefined && typeof isPublicFormEnabled !== 'boolean') {
      throw createError('isPublicFormEnabled must be a boolean', 400);
    }

    if (formFieldSettings !== undefined) {
      const validationResult = FormFieldSettingsSchema.safeParse(formFieldSettings);
      if (!validationResult.success) {
        throw createError('Invalid form field settings: ' + validationResult.error.message, 400);
      }
    }

    // Check if kanban exists and is an order kanban
    const [kanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (!kanban) {
      throw createError('Kanban not found', 404);
    }

    if (kanban.type !== 'order') {
      throw createError('Public form settings are only available for Order kanbans', 400);
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (isPublicFormEnabled !== undefined) {
      updateData.isPublicFormEnabled = isPublicFormEnabled;
    }

    if (formFieldSettings !== undefined) {
      updateData.formFieldSettings = formFieldSettings;
    }

    // Update the settings
    const [updatedKanban] = await db
      .update(kanbans)
      .set(updateData)
      .where(eq(kanbans.id, id))
      .returning();

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