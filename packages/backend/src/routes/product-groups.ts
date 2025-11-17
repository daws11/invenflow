import { Router } from 'express';
import { db } from '../db';
import { productGroups, productGroupSettings, products, kanbans } from '../db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new product group
router.post('/', async (req, res, next) => {
  try {
    const { kanbanId, groupTitle, columnStatus, productIds, unifiedFields, unifiedValues } = req.body;

    if (!kanbanId) {
      throw createError('Kanban ID is required', 400);
    }

    if (!groupTitle || groupTitle.trim().length === 0) {
      throw createError('Group title is required', 400);
    }

    if (!columnStatus) {
      throw createError('Column status is required', 400);
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    // Validate that all products exist and are in the same column
    const productsToGroup = await db
      .select()
      .from(products)
      .where(and(
        eq(products.kanbanId, kanbanId),
        inArray(products.id, productIds)
      ));

    if (productsToGroup.length !== productIds.length) {
      throw createError('Some products not found or do not belong to this kanban', 400);
    }

    // Validate all products are in the same column
    const differentColumn = productsToGroup.find(p => p.columnStatus !== columnStatus);
    if (differentColumn) {
      throw createError('All products must be in the same column', 400);
    }

    // Determine initial columnPosition for the new group so it fits into the global column ordering
    let initialColumnPosition: number | null = null;
    try {
      // Look at existing groups in this kanban & column and place the new group at the bottom
      const existingGroupsInColumn = await db
        .select({ columnPosition: productGroups.columnPosition })
        .from(productGroups)
        .where(
          and(
            eq(productGroups.kanbanId, kanbanId),
            eq(productGroups.columnStatus, columnStatus)
          )
        );

      if (existingGroupsInColumn.length > 0) {
        const maxPos = existingGroupsInColumn.reduce((max, g) => {
          const pos = g.columnPosition ?? 0;
          return pos > max ? pos : max;
        }, 0);
        initialColumnPosition = maxPos + 1;
      } else {
        initialColumnPosition = 0;
      }
    } catch {
      // If anything goes wrong calculating the position, fall back to null
      initialColumnPosition = null;
    }

    // Create the group
    const [newGroup] = await db
      .insert(productGroups)
      .values({
        kanbanId,
        groupTitle: groupTitle.trim(),
        columnStatus,
        columnPosition: initialColumnPosition,
      })
      .returning();

    // Create group settings if provided
    let settings = null;
    if (unifiedFields && unifiedValues) {
      [settings] = await db
        .insert(productGroupSettings)
        .values({
          productGroupId: newGroup.id,
          unifiedFields: unifiedFields as any,
          unifiedValues: unifiedValues as any,
        })
        .returning();
    }

    // Update products to belong to this group
    const updatedProducts = [];
    for (let i = 0; i < productIds.length; i++) {
      const [updated] = await db
        .update(products)
        .set({
          productGroupId: newGroup.id,
          groupPosition: i,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productIds[i]))
        .returning();
      
      if (updated) {
        updatedProducts.push(updated);
      }
    }

    // Invalidate caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({
      ...newGroup,
      settings,
      products: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Get a product group by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    if (!group) {
      throw createError('Product group not found', 404);
    }

    // Get settings
    const [settings] = await db
      .select()
      .from(productGroupSettings)
      .where(eq(productGroupSettings.productGroupId, id));

    // Get products in this group
    const groupProducts = await db
      .select()
      .from(products)
      .where(eq(products.productGroupId, id))
      .orderBy(products.groupPosition);

    res.json({
      ...group,
      settings: settings || null,
      products: groupProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Update a product group
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupTitle, unifiedFields, unifiedValues, columnStatus } = req.body;

    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    if (!group) {
      throw createError('Product group not found', 404);
    }

    // Update group title / column if provided
    if (groupTitle !== undefined || columnStatus !== undefined) {
      await db
        .update(productGroups)
        .set({
          groupTitle: groupTitle !== undefined ? groupTitle.trim() : group.groupTitle,
          columnStatus: columnStatus !== undefined ? columnStatus : group.columnStatus,
          updatedAt: new Date(),
        })
        .where(eq(productGroups.id, id));
    }

    // Update or create settings if provided
    if (unifiedFields !== undefined || unifiedValues !== undefined) {
      const [existingSettings] = await db
        .select()
        .from(productGroupSettings)
        .where(eq(productGroupSettings.productGroupId, id));

      if (existingSettings) {
        await db
          .update(productGroupSettings)
          .set({
            unifiedFields: unifiedFields as any || existingSettings.unifiedFields,
            unifiedValues: unifiedValues as any || existingSettings.unifiedValues,
            updatedAt: new Date(),
          })
          .where(eq(productGroupSettings.productGroupId, id));
      } else if (unifiedFields && unifiedValues) {
        await db
          .insert(productGroupSettings)
          .values({
            productGroupId: id,
            unifiedFields: unifiedFields as any,
            unifiedValues: unifiedValues as any,
          });
      }
    }

    // Fetch updated group with settings
    const [updatedGroup] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    const [settings] = await db
      .select()
      .from(productGroupSettings)
      .where(eq(productGroupSettings.productGroupId, id));

    // Invalidate caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({
      ...updatedGroup,
      settings: settings || null,
    });
  } catch (error) {
    next(error);
  }
});

// Delete a product group (ungroup products)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    if (!group) {
      throw createError('Product group not found', 404);
    }

    // Ungroup products and normalize their column positions so they appear in a sensible order
    await db.transaction(async (tx) => {
      // Get group products before ungrouping
      const groupProducts = await tx
        .select()
        .from(products)
        .where(eq(products.productGroupId, id));

    // Remove products from group
      await tx
      .update(products)
      .set({
        productGroupId: null,
        groupPosition: null,
        updatedAt: new Date(),
      })
      .where(eq(products.productGroupId, id));

    // Delete group (settings will cascade delete)
      await tx
      .delete(productGroups)
      .where(eq(productGroups.id, id));

      // If we have group metadata and products, normalize columnPosition for all ungrouped products
      if (group && groupProducts.length > 0) {
        const kanbanId = group.kanbanId;
        const columnStatus = group.columnStatus;

        const ungroupedProducts = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.kanbanId, kanbanId),
              eq(products.columnStatus, columnStatus),
              isNull(products.productGroupId)
            )
          );

        // Order ungrouped products by createdAt to get a stable, predictable sequence
        const ordered = [...ungroupedProducts].sort((a, b) => {
          const createdA = new Date(a.createdAt as unknown as string).getTime();
          const createdB = new Date(b.createdAt as unknown as string).getTime();
          return createdA - createdB;
        });

        for (let index = 0; index < ordered.length; index++) {
          const product = ordered[index];
          await tx
            .update(products)
            .set({
              columnPosition: index,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));
        }
      }
    });

    // Invalidate caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({ message: 'Product group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add products to existing group
router.post('/:id/add-products', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    if (!group) {
      throw createError('Product group not found', 404);
    }

    // Validate products are in the same column as the group
    const productsToAdd = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const wrongColumn = productsToAdd.find(p => p.columnStatus !== group.columnStatus);
    if (wrongColumn) {
      throw createError('Products must be in the same column as the group', 400);
    }

    // Get current max position in group
    const existingProducts = await db
      .select()
      .from(products)
      .where(eq(products.productGroupId, id));

    let maxPosition = existingProducts.length > 0 
      ? Math.max(...existingProducts.map(p => p.groupPosition || 0))
      : -1;

    // Add products to group
    const updatedProducts = [];
    for (const productId of productIds) {
      maxPosition++;
      const [updated] = await db
        .update(products)
        .set({
          productGroupId: id,
          groupPosition: maxPosition,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      if (updated) {
        updatedProducts.push(updated);
      }
    }

    // Invalidate caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({
      message: `${updatedProducts.length} products added to group`,
      products: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Remove products from group
router.post('/:id/remove-products', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw createError('Product IDs array is required', 400);
    }

    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.id, id));

    if (!group) {
      throw createError('Product group not found', 404);
    }

    // Remove products from group
    const updatedProducts = [];
    for (const productId of productIds) {
      const [updated] = await db
        .update(products)
        .set({
          productGroupId: null,
          groupPosition: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(products.id, productId),
          eq(products.productGroupId, id)
        ))
        .returning();

      if (updated) {
        updatedProducts.push(updated);
      }
    }

    // Invalidate caches
    invalidateCache('/api/inventory');
    invalidateCache('/api/kanbans');

    res.json({
      message: `${updatedProducts.length} products removed from group`,
      products: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

