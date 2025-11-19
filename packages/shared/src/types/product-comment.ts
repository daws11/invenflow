import { z } from 'zod';

const COMMENT_MAX_LENGTH = 2000;

export const CommentAuthorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export const ProductCommentSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1).max(COMMENT_MAX_LENGTH),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: CommentAuthorSchema,
});

export const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
});

export const UpdateCommentSchema = CreateCommentSchema;

export type CommentAuthor = z.infer<typeof CommentAuthorSchema>;
export type ProductComment = z.infer<typeof ProductCommentSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export const COMMENT_CHAR_LIMIT = COMMENT_MAX_LENGTH;

