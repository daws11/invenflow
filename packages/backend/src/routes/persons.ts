import { Router } from 'express';
import { db } from '../db';
import { persons, products, departments } from '../db/schema';
import { eq, desc, asc, or, ilike, SQL, ne, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import {
  PersonSchema,
  CreatePersonSchema,
  UpdatePersonSchema
} from '@invenflow/shared';
import { authenticateToken } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

const SORTABLE_PERSON_COLUMNS = {
  name: persons.name,
  createdAt: persons.createdAt,
  updatedAt: persons.updatedAt,
} as const;

const combineSqlClauses = (clauses: SQL<unknown>[]): SQL<unknown> => {
  if (clauses.length === 0) {
    return sql`1 = 1`;
  }
  if (clauses.length === 1) {
    return clauses[0]!;
  }
  const combined = or(
    ...(clauses as [SQL<unknown>, SQL<unknown>, ...SQL<unknown>[]])
  );
  return combined ?? sql`1 = 1`;
};

// Get all persons (with optional search and department filter)
router.get('/', async (req, res, next) => {
  try {
    const { search, department, sortBy = 'name', sortOrder = 'asc', activeOnly = 'true' } = req.query;

    const searchValue = typeof search === 'string' ? search : undefined;
    const departmentValue = typeof department === 'string' ? department : undefined;
    const sortByValue = typeof sortBy === 'string' ? sortBy : 'name';
    const sortOrderValue = sortOrder === 'desc' ? 'desc' : 'asc';
    const activeOnlyValue = activeOnly === 'true';

    const conditions: SQL<unknown>[] = [];

    // join departments to allow search/filter by department name
    if (searchValue) {
      const searchCondition = or(
        ilike(persons.name, `%${searchValue}%`),
        ilike(departments.name, `%${searchValue}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (departmentValue) {
      conditions.push(ilike(departments.name, departmentValue));
    }

    if (activeOnlyValue) {
      conditions.push(eq(persons.isActive, true));
    }

    // base query with join to departments
    const baseQuery = db
      .select({
        id: persons.id,
        name: persons.name,
        departmentId: persons.departmentId,
        isActive: persons.isActive,
        createdAt: persons.createdAt,
        updatedAt: persons.updatedAt,
        departmentName: departments.name,
      })
      .from(persons)
      .leftJoin(departments, eq(persons.departmentId, departments.id));
    const whereClause = combineSqlClauses(conditions);
    const rows = await baseQuery.where(whereClause);

    // In-memory sort to avoid query builder type edge cases
    rows.sort((a, b) => {
      if (sortByValue === 'department') {
        const av = (a.departmentName || '').toLowerCase();
        const bv = (b.departmentName || '').toLowerCase();
        if (av < bv) return sortOrderValue === 'desc' ? 1 : -1;
        if (av > bv) return sortOrderValue === 'desc' ? -1 : 1;
        return 0;
      }
      if (sortByValue === 'createdAt' || sortByValue === 'updatedAt') {
        const av = new Date((a as any)[sortByValue]).getTime();
        const bv = new Date((b as any)[sortByValue]).getTime();
        return sortOrderValue === 'desc' ? bv - av : av - bv;
      }
      // default by name
      const av = (a.name || '').toLowerCase();
      const bv = (b.name || '').toLowerCase();
      if (av < bv) return sortOrderValue === 'desc' ? 1 : -1;
      if (av > bv) return sortOrderValue === 'desc' ? -1 : 1;
      return 0;
    });

    // Normalize response: persons array as schema type, plus department names list
    const personsResponse = rows.map((r) => ({
      id: r.id,
      name: r.name,
      departmentId: r.departmentId,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    const departmentsList = Array.from(new Set(rows.map((r) => r.departmentName).filter(Boolean))).sort() as string[];

    res.json({
      persons: personsResponse,
      groupedByDepartment: {},
      departments: departmentsList,
    });
  } catch (error) {
    next(error);
  }
});

// Get person by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [person] = await db
      .select()
      .from(persons)
      .where(eq(persons.id, id))
      .limit(1);

    if (!person) {
      throw createError('Person not found', 404);
    }

    res.json(person);
  } catch (error) {
    next(error);
  }
});

// Get products assigned to a person
router.get('/:id/products', async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify person exists
    const [person] = await db
      .select()
      .from(persons)
      .where(eq(persons.id, id))
      .limit(1);

    if (!person) {
      throw createError('Person not found', 404);
    }

    // Get products assigned to this person
    const assignedProducts = await db
      .select()
      .from(products)
      .where(eq(products.assignedToPersonId, id))
      .orderBy(desc(products.updatedAt));

    res.json({
      person,
      products: assignedProducts,
      count: assignedProducts.length,
    });
  } catch (error) {
    next(error);
  }
});

// Create person
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreatePersonSchema.parse(req.body);
    const { name, departmentId, isActive = true } = validatedData;

    // Verify department exists
    const [dep] = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
    if (!dep) {
      throw createError('Department not found', 404);
    }

    const [createdPerson] = await db
      .insert(persons)
      .values({ name, departmentId, isActive })
      .returning();

    // Invalidate cached persons list so new person appears immediately
    invalidateCache('/api/persons');

    res.status(201).json(createdPerson);
  } catch (error) {
    next(error);
  }
});

// Update person
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = UpdatePersonSchema.parse(req.body);
    const { name, departmentId, isActive } = validatedData;

    // Check if person exists
    const [existingPerson] = await db
      .select()
      .from(persons)
      .where(eq(persons.id, id))
      .limit(1);

    if (!existingPerson) {
      throw createError('Person not found', 404);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) {
      // verify department exists
      const [dep] = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
      if (!dep) {
        throw createError('Department not found', 404);
      }
      updateData.departmentId = departmentId;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedPerson] = await db
      .update(persons)
      .set(updateData)
      .where(eq(persons.id, id))
      .returning();

    // Invalidate cached persons list so updates are reflected immediately
    invalidateCache('/api/persons');

    res.json(updatedPerson);
  } catch (error) {
    next(error);
  }
});

// Delete person
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if person exists
    const [existingPerson] = await db
      .select()
      .from(persons)
      .where(eq(persons.id, id))
      .limit(1);

    if (!existingPerson) {
      throw createError('Person not found', 404);
    }

    // Check if there are products assigned to this person
    const productsAssignedToPerson = await db
      .select()
      .from(products)
      .where(eq(products.assignedToPersonId, id))
      .limit(1);

    if (productsAssignedToPerson.length > 0) {
      throw createError('Cannot delete person that has assigned products', 400);
    }

    const [deletedPerson] = await db
      .delete(persons)
      .where(eq(persons.id, id))
      .returning();

    // Invalidate cached persons list so deletions are reflected immediately
    invalidateCache('/api/persons');

    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get unique departments
router.get('/departments/list', async (req, res, next) => {
  try {
    const rows = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export { router as personsRouter };

