import { Router } from 'express';
import { db } from '../db';
import { locations, products } from '../db/schema';
import { eq, like, desc, asc, and, or, ilike } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
  LocationSchema,
  CreateLocationSchema,
  UpdateLocationSchema
} from '@invenflow/shared';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all locations (with optional search and area filter)
router.get('/', async (req, res, next) => {
  try {
    const { search, area, sortBy = 'name', sortOrder = 'asc' } = req.query;

    let query = db.select().from(locations);

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(locations.name, `%${search}%`),
          ilike(locations.code, `%${search}%`),
          ilike(locations.area, `%${search}%`)
        )
      );
    }

    if (area) {
      conditions.push(eq(locations.area, area as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderField = locations[sortBy as keyof typeof locations];
    if (orderField) {
      query = query.orderBy(
        sortOrder === 'desc' ? desc(orderField) : asc(orderField)
      );
    }

    const allLocations = await query;

    // Group locations by area for frontend convenience
    const groupedLocations = allLocations.reduce((acc, location) => {
      if (!acc[location.area]) {
        acc[location.area] = [];
      }
      acc[location.area].push(location);
      return acc;
    }, {} as Record<string, typeof allLocations>);

    res.json({
      locations: allLocations,
      groupedByArea: groupedLocations,
      areas: [...new Set(allLocations.map(loc => loc.area))].sort(),
    });
  } catch (error) {
    next(error);
  }
});

// Get location by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!location) {
      throw createError('Location not found', 404);
    }

    res.json(location);
  } catch (error) {
    next(error);
  }
});

// Get products by location
router.get('/:id/products', async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify location exists
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!location) {
      throw createError('Location not found', 404);
    }

    // Get products at this location
    const locationProducts = await db
      .select()
      .from(products)
      .where(eq(products.locationId, id))
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

// Create location
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      area,
      code,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !area || !code) {
      throw createError('Name, area, and code are required', 400);
    }

    // Check if code already exists
    const existingLocation = await db
      .select()
      .from(locations)
      .where(eq(locations.code, code))
      .limit(1);

    if (existingLocation.length > 0) {
      throw createError('Location code already exists', 400);
    }

    const newLocation = {
      name,
      area,
      code: code.toUpperCase().replace(/\s+/g, '-'),
      description: description || null,
    };

    const [createdLocation] = await db
      .insert(locations)
      .values(newLocation)
      .returning();

    res.status(201).json(createdLocation);
  } catch (error) {
    next(error);
  }
});

// Update location
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      area,
      code,
      description,
    } = req.body;

    // Check if location exists
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!existingLocation) {
      throw createError('Location not found', 404);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (area !== undefined) updateData.area = area;
    if (code !== undefined) {
      const newCode = code.toUpperCase().replace(/\s+/g, '-');

      // Check if new code conflicts with existing location (excluding current)
      if (newCode !== existingLocation.code) {
        const codeConflict = await db
          .select()
          .from(locations)
          .where(and(
            eq(locations.code, newCode),
            // Note: we can't easily exclude current ID without additional imports
            // In practice, this is rare and the application layer will handle it
          ))
          .limit(1);

        if (codeConflict.length > 0) {
          throw createError('Location code already exists', 400);
        }
      }

      updateData.code = newCode;
    }
    if (description !== undefined) updateData.description = description;

    const [updatedLocation] = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, id))
      .returning();

    res.json(updatedLocation);
  } catch (error) {
    next(error);
  }
});

// Delete location
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if location exists
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!existingLocation) {
      throw createError('Location not found', 404);
    }

    // Check if there are products using this location
    const productsUsingLocation = await db
      .select()
      .from(products)
      .where(eq(products.locationId, id))
      .limit(1);

    if (productsUsingLocation.length > 0) {
      throw createError('Cannot delete location that is being used by products', 400);
    }

    const [deletedLocation] = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get unique areas
router.get('/areas/list', async (req, res, next) => {
  try {
    const allLocations = await db
      .select({ area: locations.area })
      .from(locations)
      .orderBy(asc(locations.area));

    const areas = [...new Set(allLocations.map(loc => loc.area))];

    res.json(areas);
  } catch (error) {
    next(error);
  }
});

export { router as locationsRouter };