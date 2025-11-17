import { Router } from 'express';
import { db } from '../db';
import { locations, products } from '../db/schema';
import { eq, desc, asc, and, or, ilike, SQL, ne, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { invalidateCache } from '../middleware/cache';
import {
  LocationSchema,
  CreateLocationSchema,
  UpdateLocationSchema
} from '@invenflow/shared';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

const SORTABLE_LOCATION_COLUMNS = {
  name: locations.name,
  area: locations.area,
  code: locations.code,
  createdAt: locations.createdAt,
  updatedAt: locations.updatedAt,
} as const;

const combineSqlClauses = (clauses: SQL<unknown>[]): SQL<unknown> => {
  if (clauses.length === 0) {
    return sql`1 = 1`;
  }
  if (clauses.length === 1) {
    return clauses[0]!;
  }
  const combined = and(
    ...(clauses as [SQL<unknown>, SQL<unknown>, ...SQL<unknown>[]])
  );
  return combined ?? sql`1 = 1`;
};

// Get all locations (with optional search and area filter)
router.get('/', async (req, res, next) => {
  try {
    const { search, area, sortBy = 'name', sortOrder = 'asc', activeOnly = 'true' } = req.query;

    const searchValue = typeof search === 'string' ? search : undefined;
    const areaValue = typeof area === 'string' ? area : undefined;
    const sortByValue = typeof sortBy === 'string' ? sortBy : 'name';
    const sortOrderValue = sortOrder === 'desc' ? 'desc' : 'asc';
    const activeOnlyValue = activeOnly === 'true';

    const conditions: SQL<unknown>[] = [];

    if (searchValue) {
      const searchCondition = or(
        ilike(locations.name, `%${searchValue}%`),
        ilike(locations.code, `%${searchValue}%`),
        ilike(locations.area, `%${searchValue}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (areaValue) {
      conditions.push(eq(locations.area, areaValue));
    }

    if (activeOnlyValue) {
      conditions.push(eq(locations.isActive, true));
    }

    const baseQuery = db.select().from(locations);
    const whereClause = combineSqlClauses(conditions);
    const queryWithWhere = baseQuery.where(whereClause);

    const orderField =
      SORTABLE_LOCATION_COLUMNS[sortByValue as keyof typeof SORTABLE_LOCATION_COLUMNS];
    const orderedQuery =
      orderField !== undefined
        ? queryWithWhere.orderBy(
            sortOrderValue === 'desc' ? desc(orderField) : asc(orderField)
          )
        : queryWithWhere;

    const allLocations = await orderedQuery;

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
    const validatedData = CreateLocationSchema.parse(req.body);
    const { name, area, code, building, floor, capacity, isActive = true, description } = validatedData;

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
      building: building || null,
      floor: floor || null,
      capacity: capacity || null,
      isActive,
      description: description || null,
    };

    const [createdLocation] = await db
      .insert(locations)
      .values(newLocation)
      .returning();

    // Invalidate cache setelah pembuatan berhasil
    invalidateCache('/api/locations');

    res.status(201).json(createdLocation);
  } catch (error) {
    next(error);
  }
});

// Update location
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateLocationSchema.parse(req.body);
    const { name, area, code, building, floor, capacity, isActive, description } = validatedData;

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
    if (building !== undefined) updateData.building = building;
    if (floor !== undefined) updateData.floor = floor;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (code !== undefined) {
      const newCode = code.toUpperCase().replace(/\s+/g, '-');

      // Check if new code conflicts with existing location (excluding current)
      if (newCode !== existingLocation.code) {
        const codeConflict = await db
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.code, newCode),
              ne(locations.id, existingLocation.id)
            )
          )
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

    // Invalidate cache setelah update berhasil
    invalidateCache('/api/locations');

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

    // Invalidate cache setelah penghapusan berhasil
    invalidateCache('/api/locations');

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
