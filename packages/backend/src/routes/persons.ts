import { Router } from 'express';
import { db } from '../db';
import { persons, products } from '../db/schema';
import { eq, desc, asc, or, ilike, SQL, ne, sql } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import {
  PersonSchema,
  CreatePersonSchema,
  UpdatePersonSchema
} from '@invenflow/shared';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

const SORTABLE_PERSON_COLUMNS = {
  name: persons.name,
  department: persons.department,
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

    if (searchValue) {
      const searchCondition = or(
        ilike(persons.name, `%${searchValue}%`),
        ilike(persons.department, `%${searchValue}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (departmentValue) {
      conditions.push(eq(persons.department, departmentValue));
    }

    if (activeOnlyValue) {
      conditions.push(eq(persons.isActive, true));
    }

    const baseQuery = db.select().from(persons);
    const whereClause = combineSqlClauses(conditions);
    const queryWithWhere = baseQuery.where(whereClause);

    const orderField =
      SORTABLE_PERSON_COLUMNS[sortByValue as keyof typeof SORTABLE_PERSON_COLUMNS];
    const orderedQuery =
      orderField !== undefined
        ? queryWithWhere.orderBy(
            sortOrderValue === 'desc' ? desc(orderField) : asc(orderField)
          )
        : queryWithWhere;

    const allPersons = await orderedQuery;

    // Group persons by department for frontend convenience
    const groupedPersons = allPersons.reduce((acc, person) => {
      if (!acc[person.department]) {
        acc[person.department] = [];
      }
      acc[person.department].push(person);
      return acc;
    }, {} as Record<string, typeof allPersons>);

    res.json({
      persons: allPersons,
      groupedByDepartment: groupedPersons,
      departments: [...new Set(allPersons.map(p => p.department))].sort(),
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
    const { name, department, isActive = true } = validatedData;

    const newPerson = {
      name,
      department,
      isActive,
    };

    const [createdPerson] = await db
      .insert(persons)
      .values(newPerson)
      .returning();

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
    const { name, department, isActive } = validatedData;

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
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedPerson] = await db
      .update(persons)
      .set(updateData)
      .where(eq(persons.id, id))
      .returning();

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

    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get unique departments
router.get('/departments/list', async (req, res, next) => {
  try {
    const allPersons = await db
      .select({ department: persons.department })
      .from(persons)
      .orderBy(asc(persons.department));

    const departments = [...new Set(allPersons.map(p => p.department))];

    res.json(departments);
  } catch (error) {
    next(error);
  }
});

export { router as personsRouter };

