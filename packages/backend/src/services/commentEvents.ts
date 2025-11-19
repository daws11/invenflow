import { EventEmitter } from 'node:events';
import type { ProductCommentWithUser } from './productCommentsService';

export const COMMENT_EVENTS = {
  CREATED: 'comment:created',
  UPDATED: 'comment:updated',
  DELETED: 'comment:deleted',
} as const;

export type CommentEventPayload =
  | {
      type: typeof COMMENT_EVENTS.CREATED | typeof COMMENT_EVENTS.UPDATED;
      comment: ProductCommentWithUser;
    }
  | {
      type: typeof COMMENT_EVENTS.DELETED;
      commentId: string;
      productId: string;
    };

class CommentEmitter extends EventEmitter {}

export const commentEventEmitter = new CommentEmitter();
commentEventEmitter.setMaxListeners(0);

