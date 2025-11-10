import { Router } from 'express';
import { db } from '../db';
import { kanbans, products, departments, locations } from '../db/schema';
import { eq, or, ilike, asc, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { nanoid } from 'nanoid';

const router = Router();

// Get active departments for public form
router.get('/departments', async (req, res, next) => {
  try {
    const activeDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));

    res.json(activeDepartments);
  } catch (error) {
    next(error);
  }
});

// Get unique areas from locations for public form
router.get('/areas', async (req, res, next) => {
  try {
    const allLocations = await db
      .select({ area: locations.area })
      .from(locations)
      .where(eq(locations.isActive, true))
      .orderBy(asc(locations.area));

    // Get unique areas
    const uniqueAreas = [...new Set(allLocations.map(loc => loc.area))];

    res.json(uniqueAreas);
  } catch (error) {
    next(error);
  }
});

// Search products for autocomplete in public form
router.get('/products/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const searchQuery = q.trim();
    
    if (searchQuery.length < 2) {
      return res.json([]);
    }

    // Search by product name or SKU
    const searchResults = await db
      .select({
        id: products.id,
        productDetails: products.productDetails,
        sku: products.sku,
        category: products.category,
        supplier: products.supplier,
        unitPrice: products.unitPrice,
      })
      .from(products)
      .where(
        or(
          ilike(products.productDetails, `%${searchQuery}%`),
          ilike(products.sku, `%${searchQuery}%`)
        )
      )
      .limit(10);

    res.json(searchResults);
  } catch (error) {
    next(error);
  }
});

// Get kanban info for public form
router.get('/form/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const [kanban] = await db
      .select({
        id: kanbans.id,
        name: kanbans.name,
        type: kanbans.type,
        isPublicFormEnabled: kanbans.isPublicFormEnabled,
        formFieldSettings: kanbans.formFieldSettings,
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

    if (!kanban.isPublicFormEnabled) {
      throw createError('This form has been disabled by administrator', 403);
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
      requesterName,
      departmentId,
      area,
      itemName,
      itemUrl,
      quantity,
      details,
      priority,
      notes,
      // Optional fields from existing product selection
      productId,
      category,
      supplier,
      sku,
      unitPrice,
    } = req.body;

    // Validate required fields
    if (!requesterName || !requesterName.trim()) {
      throw createError('Requester name is required', 400);
    }

    if (!departmentId) {
      throw createError('Department is required', 400);
    }

    if (!itemName || !itemName.trim()) {
      throw createError('Item name is required', 400);
    }

    if (!quantity || quantity < 1) {
      throw createError('Quantity must be at least 1', 400);
    }

    if (!priority) {
      throw createError('Priority is required', 400);
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

    if (!kanban.isPublicFormEnabled) {
      throw createError('This form has been disabled by administrator', 403);
    }

    // Get department name for notes
    const [department] = await db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);

    if (!department) {
      throw createError('Department not found', 400);
    }

    // Format requester information in notes
    const requesterInfo = `Requester: ${requesterName.trim()} | Department: ${department.name}`;
    const finalNotes = notes 
      ? `${requesterInfo}\n\n${notes.trim()}`
      : requesterInfo;

    // Generate SKU if not provided (new product)
    const finalSku = sku || `SKU-${nanoid(10)}`;

    // Create product in "New Request" column
    const newProduct = {
      kanbanId: kanban.id,
      columnStatus: 'New Request',
      productDetails: itemName.trim(),
      productLink: itemUrl?.trim() || null,
      priority: priority,
      category: category || null,
      supplier: supplier || null,
      sku: finalSku,
      unitPrice: unitPrice || null,
      notes: finalNotes,
      stockLevel: parseInt(String(quantity)),
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