import { asc, eq, inArray, sql, max } from 'drizzle-orm';
import { db } from '../db';
import { productComments, products, users } from '../db/schema';
import { createError } from '../middleware/errorHandler';
import { commentEventEmitter, COMMENT_EVENTS } from './commentEvents';

export const MAX_COMMENT_LENGTH = 2000;

export type ProductCommentWithUser = {
  id: string;
  productId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

const mapRowToDto = (row: {
  comment: typeof productComments.$inferSelect;
  user: typeof users.$inferSelect;
}): ProductCommentWithUser => ({
  id: row.comment.id,
  productId: row.comment.productId,
  userId: row.comment.userId,
  content: row.comment.content,
  createdAt: row.comment.createdAt,
  updatedAt: row.comment.updatedAt,
  user: {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
  },
});

export type CommentSummary = {
  productId: string;
  count: number;
  latestCommentAt: Date | null;
};

export const ensureProductExists = async (productId: string) => {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw createError('Product not found', 404);
  }
};

export const listProductComments = async (
  productId: string,
): Promise<ProductCommentWithUser[]> => {
  const rows = await db
    .select({
      comment: productComments,
      user: users,
    })
    .from(productComments)
    .innerJoin(users, eq(productComments.userId, users.id))
    .where(eq(productComments.productId, productId))
    .orderBy(asc(productComments.createdAt));

  return rows.map(mapRowToDto);
};

export const createProductComment = async ({
  productId,
  userId,
  content,
}: {
  productId: string;
  userId: string;
  content: string;
}): Promise<ProductCommentWithUser> => {
  const [inserted] = await db
    .insert(productComments)
    .values({
      productId,
      userId,
      content,
    })
    .returning();

  if (!inserted) {
    throw createError('Failed to create comment', 500);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError('User not found', 404);
  }

  const comment = mapRowToDto({ comment: inserted, user });
  commentEventEmitter.emit(COMMENT_EVENTS.CREATED, {
    type: COMMENT_EVENTS.CREATED,
    comment,
  });

  return comment;
};

export const updateProductComment = async ({
  commentId,
  userId,
  content,
}: {
  commentId: string;
  userId: string;
  content: string;
}): Promise<ProductCommentWithUser> => {
  const [existing] = await db
    .select({
      comment: productComments,
      user: users,
    })
    .from(productComments)
    .innerJoin(users, eq(productComments.userId, users.id))
    .where(eq(productComments.id, commentId))
    .limit(1);

  if (!existing) {
    throw createError('Comment not found', 404);
  }

  if (existing.comment.userId !== userId) {
    throw createError('You can only modify your own comments', 403);
  }

  const [updated] = await db
    .update(productComments)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(eq(productComments.id, commentId))
    .returning();

  if (!updated) {
    throw createError('Failed to update comment', 500);
  }

  const comment = mapRowToDto({ comment: updated, user: existing.user });
  commentEventEmitter.emit(COMMENT_EVENTS.UPDATED, {
    type: COMMENT_EVENTS.UPDATED,
    comment,
  });

  return comment;
};

export const deleteProductComment = async ({
  commentId,
  userId,
}: {
  commentId: string;
  userId: string;
}) => {
  const [existing] = await db
    .select({
      id: productComments.id,
      ownerId: productComments.userId,
      productId: productComments.productId,
    })
    .from(productComments)
    .where(eq(productComments.id, commentId))
    .limit(1);

  if (!existing) {
    throw createError('Comment not found', 404);
  }

  if (existing.ownerId !== userId) {
    throw createError('You can only delete your own comments', 403);
  }

  await db.delete(productComments).where(eq(productComments.id, commentId));

  commentEventEmitter.emit(COMMENT_EVENTS.DELETED, {
    type: COMMENT_EVENTS.DELETED,
    commentId,
    productId: existing.productId,
  });
};

export const getCommentSummary = async (
  productIds: string[],
): Promise<CommentSummary[]> => {
  if (productIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      productId: productComments.productId,
      count: sql<number>`count(*)`,
      latestCommentAt: max(productComments.createdAt).as('latestCommentAt'),
    })
    .from(productComments)
    .where(inArray(productComments.productId, productIds))
    .groupBy(productComments.productId);

  const summaryMap = new Map<string, CommentSummary>();
  rows.forEach((row) => {
    summaryMap.set(row.productId, {
      productId: row.productId,
      count: Number(row.count),
      latestCommentAt: row.latestCommentAt ?? null,
    });
  });

  return productIds.map((productId) => summaryMap.get(productId) ?? { productId, count: 0, latestCommentAt: null });
};

