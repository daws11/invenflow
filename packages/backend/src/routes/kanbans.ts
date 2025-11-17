import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { kanbans, products, kanbanLinks, locations, productGroups, productGroupSettings } from '../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { UpdateKanbanSchema, FormFieldSettingsSchema, DEFAULT_FORM_FIELD_SETTINGS } from '@invenflow/shared';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all kanbans
router.get('/', cacheMiddleware({ ttl: 10 * 60 * 1000 }), async (req, res, next) => {
  try {
    const allKanbans = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        type: kanbans.type,
        description: kanbans.description,
        linkedKanbanId: kanbans.linkedKanbanId,
        defaultLinkedKanbanId: kanbans.defaultLinkedKanbanId,
        locationId: kanbans.locationId,
        publicFormToken: kanbans.publicFormToken,
        isPublicFormEnabled: kanbans.isPublicFormEnabled,
        formFieldSettings: kanbans.formFieldSettings,
        thresholdRules: kanbans.thresholdRules,
        createdAt: kanbans.createdAt,
        updatedAt: kanbans.updatedAt,
        productCount: sql<number>`cast(count(${products.id}) as integer)`.as('productCount'),
      })
      .from(kanbans)
      .leftJoin(products, eq(kanbans.id, products.kanbanId))
      .groupBy(kanbans.id)
      .orderBy(asc(kanbans.createdAt));

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
        defaultLinkedKanbanId: kanbans.defaultLinkedKanbanId,
        locationId: kanbans.locationId,
        publicFormToken: kanbans.publicFormToken,
        isPublicFormEnabled: kanbans.isPublicFormEnabled,
        formFieldSettings: kanbans.formFieldSettings,
        thresholdRules: kanbans.thresholdRules,
        createdAt: kanbans.createdAt,
        updatedAt: kanbans.updatedAt,
        productCount: sql<number>`cast(count(${products.id}) as integer)`.as('productCount'),
      })
      .from(kanbans)
      .leftJoin(products, eq(kanbans.id, products.kanbanId))
      .where(eq(kanbans.id, id))
      .groupBy(kanbans.id)
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
      .orderBy(asc(products.columnPosition), asc(products.createdAt));

    // Get location details if this is a receive kanban
    let location = null;
    if (kanban.type === 'receive' && kanban.locationId) {
      const [locationData] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, kanban.locationId))
        .limit(1);
      location = locationData || null;
    }

    // Get linked receive kanbans if this is an order kanban
    let linkedKanbans: any[] = [];
    if (kanban.type === 'order') {
      linkedKanbans = await db
        .select({
          id: kanbans.id,
          name: kanbans.name,
          locationId: kanbans.locationId,
          locationName: locations.name,
          locationArea: locations.area,
          locationBuilding: locations.building,
          locationFloor: locations.floor,
          linkId: kanbanLinks.id,
        })
        .from(kanbanLinks)
        .innerJoin(kanbans, eq(kanbanLinks.receiveKanbanId, kanbans.id))
        .leftJoin(locations, eq(kanbans.locationId, locations.id))
        .where(eq(kanbanLinks.orderKanbanId, id));
    }

    // Get product groups for this kanban
    const groups = await db
      .select({
        id: productGroups.id,
        kanbanId: productGroups.kanbanId,
        groupTitle: productGroups.groupTitle,
        columnStatus: productGroups.columnStatus,
        createdAt: productGroups.createdAt,
        updatedAt: productGroups.updatedAt,
        settings: {
          id: productGroupSettings.id,
          productGroupId: productGroupSettings.productGroupId,
          unifiedFields: productGroupSettings.unifiedFields,
          unifiedValues: productGroupSettings.unifiedValues,
          createdAt: productGroupSettings.createdAt,
          updatedAt: productGroupSettings.updatedAt,
        }
      })
      .from(productGroups)
      .leftJoin(productGroupSettings, eq(productGroups.id, productGroupSettings.productGroupId))
      .where(eq(productGroups.kanbanId, id))
      .orderBy(asc(productGroups.createdAt));

    // Group products by their group ID and add to groups
    const groupsWithProducts = groups.map(group => {
      const groupProducts = kanbanProducts.filter(p => p.productGroupId === group.id);
      return {
        ...group,
        products: groupProducts,
      };
    });

    res.json({ 
      ...kanban, 
      products: kanbanProducts,
      location,
      linkedKanbans,
      productGroups: groupsWithProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Create kanban
router.post('/', async (req, res, next) => {
  try {
    const { name, type, description, thresholdRules, locationId } = req.body;

    if (!name || !type || !['order', 'receive'].includes(type)) {
      throw createError('Invalid kanban data', 400);
    }

    // Validate locationId is required for receive kanbans
    if (type === 'receive') {
      if (!locationId) {
        throw createError('Location is required for receive kanbans', 400);
      }

      // Verify location exists
      const [locationExists] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!locationExists) {
        throw createError('Invalid locationId', 400);
      }
    }

    const newKanban: any = {
      name,
      type,
      description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : null,
      linkedKanbanId: null,
      locationId: type === 'receive' ? locationId : null,
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

    // Invalidate cache setelah pembuatan berhasil
    invalidateCache('/api/kanbans');

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

    const { name, linkedKanbanId, defaultLinkedKanbanId, description, thresholdRules, formFieldSettings, locationId } = validationResult.data;

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

    // Validate locationId if provided
    if (locationId !== undefined && locationId !== null) {
      const [locationExists] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!locationExists) {
        throw createError('Invalid locationId', 400);
      }
    }

    // Validate defaultLinkedKanbanId if provided
    if (defaultLinkedKanbanId !== undefined && defaultLinkedKanbanId !== null) {
      // Only order kanbans can have default linked kanbans
      if (existingKanban.type !== 'order') {
        throw createError('Default linked kanban is only available for Order kanbans', 400);
      }

      // Verify the default linked kanban exists and is a receive kanban
      const [defaultKanban] = await db
        .select({ type: kanbans.type })
        .from(kanbans)
        .where(eq(kanbans.id, defaultLinkedKanbanId))
        .limit(1);

      if (!defaultKanban) {
        throw createError('Default linked kanban not found', 400);
      }

      if (defaultKanban.type !== 'receive') {
        throw createError('Default linked kanban must be a receive kanban', 400);
      }

      // Verify the default kanban is among the linked kanbans
      const [linkExists] = await db
        .select()
        .from(kanbanLinks)
        .where(
          and(
            eq(kanbanLinks.orderKanbanId, id),
            eq(kanbanLinks.receiveKanbanId, defaultLinkedKanbanId)
          )
        )
        .limit(1);

      if (!linkExists) {
        throw createError('Default linked kanban must be among the linked receive kanbans', 400);
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (linkedKanbanId !== undefined) updateData.linkedKanbanId = linkedKanbanId;
    if (defaultLinkedKanbanId !== undefined) updateData.defaultLinkedKanbanId = defaultLinkedKanbanId;
    if (locationId !== undefined) updateData.locationId = locationId;
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

    // Invalidate cache setelah update berhasil
    invalidateCache('/api/kanbans');

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

    // Invalidate cache setelah update public form settings berhasil
    invalidateCache('/api/kanbans');

    res.json(updatedKanban);
  } catch (error) {
    next(error);
  }
});

// Get linked receive kanbans for an order kanban
router.get('/:id/links', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify kanban exists and is an order kanban
    const [kanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (!kanban) {
      throw createError('Kanban not found', 404);
    }

    if (kanban.type !== 'order') {
      throw createError('Only order kanbans can have links', 400);
    }

    // Get linked receive kanbans with location info
    const linkedKanbans = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        locationId: kanbans.locationId,
        locationName: locations.name,
        locationArea: locations.area,
        locationBuilding: locations.building,
        locationFloor: locations.floor,
        linkId: kanbanLinks.id,
      })
      .from(kanbanLinks)
      .innerJoin(kanbans, eq(kanbanLinks.receiveKanbanId, kanbans.id))
      .leftJoin(locations, eq(kanbans.locationId, locations.id))
      .where(eq(kanbanLinks.orderKanbanId, id));

    res.json(linkedKanbans);
  } catch (error) {
    next(error);
  }
});

// Add link between order kanban and receive kanban
router.post('/:id/links', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receiveKanbanId } = req.body;

    if (!receiveKanbanId) {
      throw createError('receiveKanbanId is required', 400);
    }

    // Verify order kanban exists and is an order type
    const [orderKanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (!orderKanban) {
      throw createError('Order kanban not found', 404);
    }

    if (orderKanban.type !== 'order') {
      throw createError('Only order kanbans can have links', 400);
    }

    // Verify receive kanban exists and is a receive type
    const [receiveKanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.id, receiveKanbanId))
      .limit(1);

    if (!receiveKanban) {
      throw createError('Receive kanban not found', 404);
    }

    if (receiveKanban.type !== 'receive') {
      throw createError('Can only link to receive kanbans', 400);
    }

    // Check current link count (max 5)
    const existingLinks = await db
      .select()
      .from(kanbanLinks)
      .where(eq(kanbanLinks.orderKanbanId, id));

    if (existingLinks.length >= 5) {
      throw createError('Maximum of 5 linked kanbans allowed', 400);
    }

    // Check if link already exists
    const [existingLink] = await db
      .select()
      .from(kanbanLinks)
      .where(
        and(
          eq(kanbanLinks.orderKanbanId, id),
          eq(kanbanLinks.receiveKanbanId, receiveKanbanId)
        )
      )
      .limit(1);

    if (existingLink) {
      throw createError('Link already exists', 400);
    }

    // Create the link
    const [createdLink] = await db
      .insert(kanbanLinks)
      .values({
        orderKanbanId: id,
        receiveKanbanId,
      })
      .returning();

    // Get updated links list with location info
    const linkedKanbans = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        locationId: kanbans.locationId,
        locationName: locations.name,
        locationArea: locations.area,
        locationBuilding: locations.building,
        locationFloor: locations.floor,
        linkId: kanbanLinks.id,
      })
      .from(kanbanLinks)
      .innerJoin(kanbans, eq(kanbanLinks.receiveKanbanId, kanbans.id))
      .leftJoin(locations, eq(kanbans.locationId, locations.id))
      .where(eq(kanbanLinks.orderKanbanId, id));

    // Auto-set as default if this is the first link and no default exists
    if (linkedKanbans.length === 1) {
      const [orderKanbanCheck] = await db
        .select({ defaultLinkedKanbanId: kanbans.defaultLinkedKanbanId })
        .from(kanbans)
        .where(eq(kanbans.id, id))
        .limit(1);

      if (!orderKanbanCheck?.defaultLinkedKanbanId) {
        await db
          .update(kanbans)
          .set({ defaultLinkedKanbanId: receiveKanbanId })
          .where(eq(kanbans.id, id));
      }
    }

    // Invalidate cache setelah menambah link berhasil
    invalidateCache('/api/kanbans');

    res.status(201).json(linkedKanbans);
  } catch (error) {
    next(error);
  }
});

// Remove link between order kanban and receive kanban
router.delete('/:id/links/:linkId', async (req, res, next) => {
  try {
    const { id, linkId } = req.params;

    // Verify the link exists and belongs to this kanban
    const [link] = await db
      .select()
      .from(kanbanLinks)
      .where(
        and(
          eq(kanbanLinks.id, linkId),
          eq(kanbanLinks.orderKanbanId, id)
        )
      )
      .limit(1);

    if (!link) {
      throw createError('Link not found', 404);
    }

    // Delete the link
    await db
      .delete(kanbanLinks)
      .where(eq(kanbanLinks.id, linkId));

    // Clear default linked kanban if the removed kanban was the default
    const [orderKanban] = await db
      .select({ defaultLinkedKanbanId: kanbans.defaultLinkedKanbanId })
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (orderKanban?.defaultLinkedKanbanId === link.receiveKanbanId) {
      await db
        .update(kanbans)
        .set({ defaultLinkedKanbanId: null })
        .where(eq(kanbans.id, id));
    }

    // Return updated links list
    const linkedKanbans = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        locationId: kanbans.locationId,
        locationName: locations.name,
        locationArea: locations.area,
        locationBuilding: locations.building,
        locationFloor: locations.floor,
        linkId: kanbanLinks.id,
      })
      .from(kanbanLinks)
      .innerJoin(kanbans, eq(kanbanLinks.receiveKanbanId, kanbans.id))
      .leftJoin(locations, eq(kanbans.locationId, locations.id))
      .where(eq(kanbanLinks.orderKanbanId, id));

    // Invalidate cache setelah menghapus link berhasil
    invalidateCache('/api/kanbans');

    res.json(linkedKanbans);
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

    // Invalidate cache setelah penghapusan berhasil
    invalidateCache('/api/kanbans');

    res.json({ message: 'Kanban deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as kanbansRouter };