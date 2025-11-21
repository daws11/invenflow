import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db';
import {
  kanbans,
  products,
  kanbanLinks,
  locations,
  productGroups,
  productGroupSettings,
  storedLogs,
  kanbanUserRoles,
} from '../db/schema';
import { eq, and, asc, sql, isNull } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin, requireKanbanAccess } from '../utils/authorization';
// import { emitInventoryEvent } from '../services/inventoryEvents'; // Temporarily disabled due to TypeScript issues
import { UpdateKanbanSchema, FormFieldSettingsSchema, DEFAULT_FORM_FIELD_SETTINGS, CreateKanbanSchema } from '@invenflow/shared';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all kanbans
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const fallbackRole = isAdmin ? 'admin' : 'viewer';

    const baseQuery = db
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
        storedAutoArchiveEnabled: kanbans.storedAutoArchiveEnabled,
        storedAutoArchiveAfterMinutes: kanbans.storedAutoArchiveAfterMinutes,
        createdAt: kanbans.createdAt,
        updatedAt: kanbans.updatedAt,
        userRole: sql<string>`coalesce(max(${kanbanUserRoles.role}), ${fallbackRole})`,
        // Only count non-rejected products so summary counts match board view
        productCount: sql<number>`cast(count(*) filter (where ${products.isRejected} = false) as integer)`.as(
          'productCount',
        ),
      })
      .from(kanbans)
      .leftJoin(products, eq(kanbans.id, products.kanbanId))
      .leftJoin(
        kanbanUserRoles,
        and(
          eq(kanbanUserRoles.kanbanId, kanbans.id),
          eq(kanbanUserRoles.userId, userId),
        ),
      );

    let kanbanQuery = baseQuery;

    if (!isAdmin) {
      kanbanQuery = kanbanQuery.where(eq(kanbanUserRoles.userId, userId));
    }

    const allKanbans = await kanbanQuery
      .groupBy(kanbans.id)
      .orderBy(asc(kanbans.createdAt));

    res.json(allKanbans);
  } catch (error) {
    next(error);
  }
});

// Get kanban with products
router.get('/:id', requireKanbanAccess(), async (req, res, next) => {
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
        storedAutoArchiveEnabled: kanbans.storedAutoArchiveEnabled,
        storedAutoArchiveAfterMinutes: kanbans.storedAutoArchiveAfterMinutes,
        createdAt: kanbans.createdAt,
        updatedAt: kanbans.updatedAt,
        // Keep detail-level productCount aligned with non-rejected products
        productCount: sql<number>`cast(count(*) filter (where ${products.isRejected} = false) as integer)`.as(
          'productCount',
        ),
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

    const [assignment] = await db
      .select({ role: kanbanUserRoles.role })
      .from(kanbanUserRoles)
      .where(
        and(
          eq(kanbanUserRoles.kanbanId, id),
          eq(kanbanUserRoles.userId, req.user?.id ?? ''),
        ),
      )
      .limit(1);

    const userRole =
      req.user?.role === 'admin'
        ? 'admin'
        : (assignment?.role as string | undefined) ?? 'viewer';

    // Get products for this kanban
    const kanbanProductsQuery = await db
      .select()
      .from(products)
      .leftJoin(storedLogs, eq(products.id, storedLogs.productId))
      .where(
        and(
          eq(products.kanbanId, id),
          // Hide rejected products from the live kanban board
          eq(products.isRejected, false),
          // Hide products that have been auto-archived to stored logs
          isNull(storedLogs.id),
        ),
      )
      .orderBy(asc(products.columnPosition), asc(products.createdAt));

    // Extract products from the joined result
    const kanbanProducts = kanbanProductsQuery.map(result => result.products);

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
      userRole,
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
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    // Validate request body against schema
    const validationResult = CreateKanbanSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw createError('Invalid kanban data: ' + validationResult.error.message, 400);
    }

    const { name, type, description, locationId } = validationResult.data;

    // Verify location exists if locationId is provided
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

    const newKanban: any = {
      name,
      type,
      description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : null,
      linkedKanbanId: null,
      locationId: type === 'receive' ? locationId : null,
      publicFormToken: type === 'order' ? nanoid(10) : null,
      formFieldSettings: type === 'order' ? DEFAULT_FORM_FIELD_SETTINGS : null,
    };

    const [createdKanban] = await db
      .insert(kanbans)
      .values(newKanban)
      .returning();

    res.status(201).json(createdKanban);
  } catch (error) {
    console.error('CreateKanban - Error:', error);
    next(error);
  }
});

// Update kanban
router.put('/:id', requireKanbanAccess({ minRole: 'editor' }), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Normalize empty strings to null before validation
    // This prevents Zod validation errors when empty strings are sent
    const normalizedBody = {
      ...req.body,
      locationId: req.body.locationId === '' || req.body.locationId === undefined 
        ? null 
        : req.body.locationId,
      linkedKanbanId: req.body.linkedKanbanId === '' || req.body.linkedKanbanId === undefined 
        ? null 
        : req.body.linkedKanbanId,
      defaultLinkedKanbanId: req.body.defaultLinkedKanbanId === '' || req.body.defaultLinkedKanbanId === undefined 
        ? null 
        : req.body.defaultLinkedKanbanId,
    };
    
    // Validate request body against schema
    const validationResult = UpdateKanbanSchema.safeParse(normalizedBody);
    if (!validationResult.success) {
      throw createError('Invalid kanban data: ' + validationResult.error.message, 400);
    }

    const {
      name,
      linkedKanbanId,
      defaultLinkedKanbanId,
      description,
      thresholdRules,
      formFieldSettings,
      locationId,
      storedAutoArchiveEnabled,
      storedAutoArchiveAfterMinutes,
    } = validationResult.data;

    // Check if kanban exists and get its type for validation
    const [existingKanban] = await db
      .select({
        type: kanbans.type,
        storedAutoArchiveAfterMinutes: kanbans.storedAutoArchiveAfterMinutes,
      })
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

    if (
      (storedAutoArchiveEnabled !== undefined ||
        storedAutoArchiveAfterMinutes !== undefined) &&
      existingKanban.type !== 'receive'
    ) {
      throw createError('Stored column automation is only available for Receive kanbans', 400);
    }

    if (
      storedAutoArchiveAfterMinutes !== undefined &&
      storedAutoArchiveAfterMinutes !== null &&
      (storedAutoArchiveAfterMinutes < 1 || storedAutoArchiveAfterMinutes > 43200)
    ) {
      throw createError('storedAutoArchiveAfterMinutes must be between 1 minute and 30 days', 400);
    }

    // Validate locationId if provided
    // locationId is already normalized to null if empty string was sent
    if (locationId !== null && locationId !== undefined) {
      // Validate UUID format first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(locationId)) {
        console.error('Invalid UUID format for locationId:', locationId);
        throw createError('Invalid locationId format', 400);
      }

      const [locationExists] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!locationExists) {
        console.error('Location not found in database:', locationId);
        throw createError(`Location with ID ${locationId} not found`, 400);
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
    if (storedAutoArchiveEnabled !== undefined) {
      updateData.storedAutoArchiveEnabled = storedAutoArchiveEnabled;
      if (!storedAutoArchiveEnabled && storedAutoArchiveAfterMinutes === undefined) {
        updateData.storedAutoArchiveAfterMinutes = null;
      }
    }
    if (storedAutoArchiveAfterMinutes !== undefined) {
      updateData.storedAutoArchiveAfterMinutes = storedAutoArchiveAfterMinutes;
    }
    updateData.updatedAt = new Date();

    console.log('UpdateKanban - Before update:', { id, updateData });

    const [updatedKanban] = await db
      .update(kanbans)
      .set(updateData)
      .where(eq(kanbans.id, id))
      .returning();

    console.log('UpdateKanban - After update:', updatedKanban);

    res.json(updatedKanban);
  } catch (error) {
    console.error('UpdateKanban - Error:', error);
    next(error);
  }
});

// Update public form settings
router.put(
  '/:id/public-form-settings',
  requireKanbanAccess({ minRole: 'editor' }),
  async (req, res, next) => {
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

// Get linked receive kanbans for an order kanban
router.get('/:id/links', requireKanbanAccess(), async (req, res, next) => {
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
router.post(
  '/:id/links',
  requireKanbanAccess({ minRole: 'editor' }),
  async (req, res, next) => {
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

    res.status(201).json(linkedKanbans);
  } catch (error) {
    next(error);
  }
});

// Remove link between order kanban and receive kanban
router.delete(
  '/:id/links/:linkId',
  requireKanbanAccess({ minRole: 'editor' }),
  async (req, res, next) => {
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

    res.json(linkedKanbans);
  } catch (error) {
    next(error);
  }
});

// Delete kanban
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cek apakah kanban ada sebelum delete
    const [existingKanban] = await db
      .select()
      .from(kanbans)
      .where(eq(kanbans.id, id))
      .limit(1);

    if (!existingKanban) {
      throw createError('Kanban not found', 404);
    }

    console.log('DeleteKanban - Attempting to delete kanban:', { id, name: existingKanban.name });

    // Lakukan delete dengan returning untuk memastikan berhasil
    const deletedResult = await db
      .delete(kanbans)
      .where(eq(kanbans.id, id))
      .returning();

    if (deletedResult.length === 0) {
      console.error('DeleteKanban - Delete operation returned empty result:', { id });
      throw createError('Failed to delete kanban', 500);
    }

    console.log('DeleteKanban - Successfully deleted kanban:', { id, deletedKanban: deletedResult[0] });

    res.json({
      message: 'Kanban deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('DeleteKanban - Error:', error);
    next(error);
  }
});

export { router as kanbansRouter };