import { Router } from 'express';
import { db } from '../db';
import { departments, persons } from '../db/schema';
import { eq, desc, asc, ilike, or, SQL, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import {
  DepartmentSchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema
} from '@invenflow/shared';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

// Get all departments (with optional search and active filter)
router.get('/', async (req, res, next) => {
  try {
    const { search, activeOnly = 'false', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const searchValue = typeof search === 'string' ? search : undefined;
    const activeOnlyValue = activeOnly === 'true';
    const sortByValue = typeof sortBy === 'string' ? sortBy : 'name';
    const sortOrderValue = sortOrder === 'desc' ? 'desc' : 'asc';

    const conditions: SQL<unknown>[] = [];

    if (searchValue) {
      const searchCondition = or(
        ilike(departments.name, `%${searchValue}%`),
        ilike(departments.description, `%${searchValue}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (activeOnlyValue) {
      conditions.push(eq(departments.isActive, true));
    }

    const baseQuery = db.select().from(departments);
    const whereClause = combineSqlClauses(conditions);
    const allDepartments = await baseQuery.where(whereClause);

    // Sort in memory to avoid type issues with query builder chaining
    allDepartments.sort((a, b) => {
      if (sortByValue === 'createdAt') {
        const av = new Date(a.createdAt).getTime();
        const bv = new Date(b.createdAt).getTime();
        return sortOrderValue === 'desc' ? bv - av : av - bv;
      }
      // default: name
      const av = (a.name || '').toLowerCase();
      const bv = (b.name || '').toLowerCase();
      if (av < bv) return sortOrderValue === 'desc' ? 1 : -1;
      if (av > bv) return sortOrderValue === 'desc' ? -1 : 1;
      return 0;
    });

    // Get person counts for each department
    const departmentsWithCounts = await Promise.all(
      allDepartments.map(async (dept) => {
        const personCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(persons)
          .where(eq(persons.departmentId, dept.id));

        return {
          ...dept,
          personCount: Number(personCount[0]?.count ?? 0),
        };
      })
    );

    res.json({
      departments: departmentsWithCounts,
      total: departmentsWithCounts.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get active departments only (for dropdowns)
router.get('/active', async (req, res, next) => {
  try {
    const activeDepartments = await db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));

    res.json(activeDepartments);
  } catch (error) {
    next(error);
  }
});

// Get department by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!department) {
      throw createError('Department not found', 404);
    }

    // Get person count
    const personCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(persons)
      .where(eq(persons.departmentId, id));

    res.json({
      ...department,
      personCount: Number(personCount[0]?.count ?? 0),
    });
  } catch (error) {
    next(error);
  }
});

// Create department
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreateDepartmentSchema.parse(req.body);
    const { name, description, isActive = true } = validatedData;

    // Check if department with same name already exists
    const [existingDepartment] = await db
      .select()
      .from(departments)
      .where(eq(departments.name, name))
      .limit(1);

    if (existingDepartment) {
      throw createError('Department with this name already exists', 400);
    }

    const newDepartment = {
      name,
      description: description ?? null,
      isActive,
    };

    const [createdDepartment] = await db
      .insert(departments)
      .values(newDepartment)
      .returning();

    res.status(201).json(createdDepartment);
  } catch (error) {
    next(error);
  }
});

// Update department
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateDepartmentSchema.parse(req.body);
    const { name, description, isActive } = validatedData;

    // Check if department exists
    const [existingDepartment] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!existingDepartment) {
      throw createError('Department not found', 404);
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== existingDepartment.name) {
      const [duplicateDepartment] = await db
        .select()
        .from(departments)
        .where(eq(departments.name, name))
        .limit(1);

      if (duplicateDepartment) {
        throw createError('Department with this name already exists', 400);
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description ?? null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedDepartment] = await db
      .update(departments)
      .set(updateData)
      .where(eq(departments.id, id))
      .returning();

    res.json(updatedDepartment);
  } catch (error) {
    next(error);
  }
});

// Delete department
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const [existingDepartment] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!existingDepartment) {
      throw createError('Department not found', 404);
    }

    // Check if there are persons assigned to this department
    const personsInDepartment = await db
      .select()
      .from(persons)
      .where(eq(persons.departmentId, id))
      .limit(1);

    if (personsInDepartment.length > 0) {
      throw createError('Cannot delete department that has assigned personnel', 400);
    }

    const [deletedDepartment] = await db
      .delete(departments)
      .where(eq(departments.id, id))
      .returning();

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as departmentsRouter };

