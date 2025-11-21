import { Router } from 'express';
import { db } from '../db';
import { kanbans, kanbanUserRoles, users } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../utils/authorization';
import { AssignKanbanUserSchema } from '@invenflow/shared';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireAdmin);

const ensureKanbanExists = async (kanbanId: string) => {
  const [kanban] = await db
    .select()
    .from(kanbans)
    .where(eq(kanbans.id, kanbanId))
    .limit(1);
  if (!kanban) {
    throw createError('Kanban not found', 404);
  }
};

const fetchAssignmentWithUser = async (kanbanId: string, userId: string) => {
  const [assignment] = await db
    .select({
      id: kanbanUserRoles.id,
      role: kanbanUserRoles.role,
      createdAt: kanbanUserRoles.createdAt,
      updatedAt: kanbanUserRoles.updatedAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      },
    })
    .from(kanbanUserRoles)
    .innerJoin(users, eq(kanbanUserRoles.userId, users.id))
    .where(
      and(
        eq(kanbanUserRoles.kanbanId, kanbanId),
        eq(kanbanUserRoles.userId, userId),
      ),
    )
    .limit(1);
  return assignment;
};

router.get('/', async (req, res, next) => {
  try {
    const { kanbanId } = req.params as { kanbanId: string };
    if (!kanbanId) {
      throw createError('Kanban ID is required', 400);
    }

    await ensureKanbanExists(kanbanId);

    const assignments = await db
      .select({
        id: kanbanUserRoles.id,
        role: kanbanUserRoles.role,
        createdAt: kanbanUserRoles.createdAt,
        updatedAt: kanbanUserRoles.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        },
      })
      .from(kanbanUserRoles)
      .innerJoin(users, eq(kanbanUserRoles.userId, users.id))
      .where(eq(kanbanUserRoles.kanbanId, kanbanId))
      .orderBy(asc(users.name));

    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { kanbanId } = req.params as { kanbanId: string };
    if (!kanbanId) {
      throw createError('Kanban ID is required', 400);
    }

    await ensureKanbanExists(kanbanId);

    const { userId, role } = AssignKanbanUserSchema.omit({
      kanbanId: true,
    }).parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw createError('User not found', 404);
    }

    const [existingAssignment] = await db
      .select()
      .from(kanbanUserRoles)
      .where(
        and(
          eq(kanbanUserRoles.kanbanId, kanbanId),
          eq(kanbanUserRoles.userId, userId),
        ),
      )
      .limit(1);

    if (existingAssignment) {
      await db
        .update(kanbanUserRoles)
        .set({ role, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(kanbanUserRoles.kanbanId, kanbanId),
            eq(kanbanUserRoles.userId, userId),
          ),
        )
        .returning();
    } else {
      await db
        .insert(kanbanUserRoles)
        .values({
          kanbanId,
          userId,
          role,
        })
        .returning();
    }

    const assignmentWithUser = await fetchAssignmentWithUser(kanbanId, userId);

    if (!assignmentWithUser) {
      throw createError('Failed to load assignment', 500);
    }

    res.status(201).json(assignmentWithUser);
  } catch (error) {
    next(error);
  }
});

router.delete('/:userId', async (req, res, next) => {
  try {
    const { kanbanId, userId } = req.params as { kanbanId: string; userId: string };
    if (!kanbanId || !userId) {
      throw createError('Kanban ID and user ID are required', 400);
    }

    await ensureKanbanExists(kanbanId);

    const [existingAssignment] = await db
      .select()
      .from(kanbanUserRoles)
      .where(
        and(
          eq(kanbanUserRoles.kanbanId, kanbanId),
          eq(kanbanUserRoles.userId, userId),
        ),
      )
      .limit(1);

    if (!existingAssignment) {
      throw createError('Assignment not found', 404);
    }

    await db
      .delete(kanbanUserRoles)
      .where(eq(kanbanUserRoles.id, existingAssignment.id));

    res.json({
      message: 'User access removed from kanban',
      kanbanId,
      userId,
    });
  } catch (error) {
    next(error);
  }
});

export { router as kanbanUsersRouter };

