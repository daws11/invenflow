import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
  MAX_COMMENT_LENGTH,
  ensureProductExists,
  listProductComments,
  createProductComment,
  updateProductComment,
  deleteProductComment,
  getCommentSummary,
} from '../services/productCommentsService';

const router = Router();

const productIdParamsSchema = z.object({
  productId: z.string().uuid(),
});

const commentIdParamsSchema = z.object({
  commentId: z.string().uuid(),
});

const commentBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment content is required')
    .max(MAX_COMMENT_LENGTH, `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`),
});

const summaryBodySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(200),
});

router.use(authenticateToken);

router.get(
  '/products/:productId/comments',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { productId } = productIdParamsSchema.parse(req.params);
      await ensureProductExists(productId);
      const comments = await listProductComments(productId);
      res.json(comments);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/products/:productId/comments',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { productId } = productIdParamsSchema.parse(req.params);
      const { content } = commentBodySchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      await ensureProductExists(productId);
      const comment = await createProductComment({
        productId,
        userId,
        content,
      });
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  },
);

router.put('/comments/:commentId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { commentId } = commentIdParamsSchema.parse(req.params);
    const { content } = commentBodySchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const updated = await updateProductComment({
      commentId,
      userId,
      content,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/comments/:commentId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { commentId } = commentIdParamsSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    await deleteProductComment({
      commentId,
      userId,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/comments/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productIds } = summaryBodySchema.parse(req.body);
    const summary = await getCommentSummary(productIds);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export { router as productCommentsRouter };

