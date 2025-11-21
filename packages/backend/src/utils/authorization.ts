import { NextFunction, Response } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { kanbanUserRoles } from '../db/schema';
import type { KanbanUserRole } from '@invenflow/shared';

const ROLE_PRIORITY: Record<KanbanUserRole, number> = {
  viewer: 0,
  editor: 1,
};

type KanbanIdResolver = (
  req: AuthenticatedRequest
) => string | undefined | Promise<string | undefined>;

const defaultGetKanbanId: KanbanIdResolver = (req) => {
  const body = req.body as Record<string, unknown> | undefined;
  return (
    req.params?.kanbanId ??
    req.params?.id ??
    body?.kanbanId ??
    body?.id
  );
};

export interface KanbanAccessRequest extends AuthenticatedRequest {
  kanbanAccessRole?: KanbanUserRole;
}

export const requireAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }
  if (req.user.role !== 'admin') {
    return next(createError('Admin access required', 403));
  }
  next();
};

interface RequireKanbanAccessOptions {
  minRole?: KanbanUserRole;
  getKanbanId?: KanbanIdResolver;
}

export const requireKanbanAccess =
  (options: RequireKanbanAccessOptions = {}) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const { minRole = 'viewer', getKanbanId = defaultGetKanbanId } = options;

    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (req.user.role === 'admin') {
      (req as KanbanAccessRequest).kanbanAccessRole = 'editor';
      return next();
    }

    const kanbanId = await Promise.resolve(getKanbanId(req));
    if (!kanbanId) {
      return next(createError('Kanban ID is required', 400));
    }

    const [assignment] = await db
      .select()
      .from(kanbanUserRoles)
      .where(
        and(
          eq(kanbanUserRoles.kanbanId, kanbanId),
          eq(kanbanUserRoles.userId, req.user.id)
        )
      )
      .limit(1);

    const assignedRole = assignment?.role as KanbanUserRole | undefined;

    if (
      !assignedRole ||
      ROLE_PRIORITY[assignedRole] < ROLE_PRIORITY[minRole]
    ) {
      return next(createError('Forbidden', 403));
    }

    (req as KanbanAccessRequest).kanbanAccessRole = assignedRole;
    next();
  };

export const ensureUserHasKanbanAccess = async (
  req: AuthenticatedRequest,
  kanbanIds: string[],
  minRole: KanbanUserRole = 'viewer'
) => {
  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (req.user.role === 'admin') {
    return;
  }

  const normalizedKanbanIds = Array.from(
    new Set(kanbanIds.filter((id): id is string => Boolean(id)))
  );
  if (normalizedKanbanIds.length === 0) {
    return;
  }

  const assignments = await db
    .select({
      kanbanId: kanbanUserRoles.kanbanId,
      role: kanbanUserRoles.role,
    })
    .from(kanbanUserRoles)
    .where(
      and(
        eq(kanbanUserRoles.userId, req.user.id),
        inArray(kanbanUserRoles.kanbanId, normalizedKanbanIds)
      )
    );

  const allowedKanbanIds = assignments
    .filter((assignment) => ROLE_PRIORITY[assignment.role as KanbanUserRole] >= ROLE_PRIORITY[minRole])
    .map((assignment) => assignment.kanbanId);

  const missingKanbanIds = normalizedKanbanIds.filter(
    (kanbanId) => !allowedKanbanIds.includes(kanbanId)
  );

  if (missingKanbanIds.length > 0) {
    throw createError('Forbidden', 403);
  }
};

