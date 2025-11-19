import { create } from 'zustand';
import type { ProductComment } from '@invenflow/shared';
import { commentApi, type CommentSummary } from '../utils/api';

type CommentMap = Record<string, ProductComment[]>;
type CountMap = Record<string, CommentSummary>;
type LoadingMap = Record<string, boolean>;

type WebsocketStatus = 'disconnected' | 'connecting' | 'connected';

type StoreSet = (
  partial:
    | Partial<CommentState>
    | ((state: CommentState) => Partial<CommentState>),
  replace?: boolean,
) => void;
type StoreGet = () => CommentState;

interface CommentState {
  commentsByProduct: CommentMap;
  countsByProduct: CountMap;
  loadingByProduct: LoadingMap;
  error: string | null;
  updatingCommentId: string | null;
  deletingCommentId: string | null;
  websocketStatus: WebsocketStatus;

  fetchComments: (productId: string) => Promise<void>;
  addComment: (productId: string, content: string) => Promise<ProductComment | null>;
  editComment: (productId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (productId: string, commentId: string) => Promise<void>;
  loadSummaries: (productIds: string[]) => Promise<void>;
  getCommentCount: (productId: string) => number;
  connectStream: () => void;
}

type CommentResponse = Omit<ProductComment, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

const normalizeComment = (comment: CommentResponse): ProductComment => ({
  ...comment,
  createdAt: comment.createdAt instanceof Date ? comment.createdAt : new Date(comment.createdAt),
  updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt : new Date(comment.updatedAt),
});

const updateCountForProduct = (
  countsByProduct: CountMap,
  productId: string,
  updater: (current: CommentSummary | undefined) => CommentSummary,
): CountMap => ({
  ...countsByProduct,
  [productId]: updater(countsByProduct[productId]),
});

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempts = 0;
let beforeUnloadAttached = false;

const buildWebSocketUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return null;
  }
  const apiUrl =
    import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api';
  const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/comments';
  url.searchParams.set('token', token);
  return url.toString();
};

const initializeWebSocket = (set: StoreSet, get: StoreGet) => {
  if (socket || typeof window === 'undefined') {
    return;
  }

  const url = buildWebSocketUrl();
  if (!url) {
    return;
  }

  set({ websocketStatus: 'connecting' });
  socket = new WebSocket(url);

  socket.onopen = () => {
    reconnectAttempts = 0;
    set({ websocketStatus: 'connected' });
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleIncomingEvent(data, set, get);
    } catch (error) {
      console.error('[commentStore] Failed to parse websocket message', error);
    }
  };

  socket.onerror = () => {
    socket?.close();
  };

  socket.onclose = () => {
    set({ websocketStatus: 'disconnected' });
    socket = null;
    scheduleReconnect(set, get);
  };

  if (!beforeUnloadAttached) {
    window.addEventListener('beforeunload', () => {
      socket?.close();
    });
    beforeUnloadAttached = true;
  }
};

const scheduleReconnect = (set: StoreSet, _get: StoreGet) => {
  void _get;
  if (typeof window === 'undefined') {
    return;
  }
  if (reconnectTimer) {
    return;
  }
  const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts);
  reconnectAttempts += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    initializeWebSocket(set, _get);
  }, delay);
};

const handleIncomingEvent = (data: any, set: StoreSet, get: StoreGet) => {
  void get;
  if (!data?.type) {
    return;
  }

  switch (data.type) {
    case 'comment:created': {
      const comment = normalizeComment(data.comment as CommentResponse);
      set((state) => {
        const existing = state.commentsByProduct[comment.productId];
        const alreadyExists = existing?.some((item) => item.id === comment.id);
        const updatedComments = existing
          ? alreadyExists
            ? existing.map((item) => (item.id === comment.id ? comment : item))
            : [...existing, comment]
          : undefined;
        return {
          commentsByProduct: updatedComments
            ? { ...state.commentsByProduct, [comment.productId]: updatedComments }
            : state.commentsByProduct,
          countsByProduct: updateCountForProduct(state.countsByProduct, comment.productId, (current) => ({
            productId: comment.productId,
            count: (current?.count ?? 0) + (alreadyExists ? 0 : 1),
            latestCommentAt: comment.createdAt.toISOString(),
          })),
        };
      });
      break;
    }
    case 'comment:updated': {
      const comment = normalizeComment(data.comment as CommentResponse);
      set((state) => {
        const existing = state.commentsByProduct[comment.productId];
        if (!existing) {
          return {};
        }
        return {
          commentsByProduct: {
            ...state.commentsByProduct,
            [comment.productId]: existing.map((item) =>
              item.id === comment.id ? comment : item,
            ),
          },
        };
      });
      break;
    }
    case 'comment:deleted': {
      const { commentId, productId } = data as { commentId: string; productId: string };
      set((state) => {
        const existing = state.commentsByProduct[productId];
        const updatedComments = existing?.filter((item) => item.id !== commentId);
        return {
          commentsByProduct: updatedComments
            ? { ...state.commentsByProduct, [productId]: updatedComments }
            : state.commentsByProduct,
          countsByProduct: updateCountForProduct(state.countsByProduct, productId, (current) => ({
            productId,
            count: Math.max(0, (current?.count ?? 0) - 1),
            latestCommentAt: current?.latestCommentAt ?? null,
          })),
        };
      });
      break;
    }
    default:
      break;
  }
};

export const useCommentStore = create<CommentState>((set, get) => ({
  commentsByProduct: {},
  countsByProduct: {},
  loadingByProduct: {},
  error: null,
  updatingCommentId: null,
  deletingCommentId: null,
  websocketStatus: 'disconnected',

  fetchComments: async (productId: string) => {
    if (!productId) return;
    set((state) => ({
      loadingByProduct: { ...state.loadingByProduct, [productId]: true },
      error: null,
    }));
    try {
      const response = await commentApi.list(productId);
      const normalized = response.map((comment) => normalizeComment(comment as CommentResponse));
      set((state) => ({
        commentsByProduct: { ...state.commentsByProduct, [productId]: normalized },
        loadingByProduct: { ...state.loadingByProduct, [productId]: false },
        countsByProduct: updateCountForProduct(state.countsByProduct, productId, () => ({
          productId,
          count: normalized.length,
          latestCommentAt:
            normalized.length > 0
              ? normalized[normalized.length - 1].createdAt.toISOString()
              : null,
        })),
      }));
    } catch (error) {
      console.error('[commentStore] Failed to fetch comments', error);
      set((state) => ({
        loadingByProduct: { ...state.loadingByProduct, [productId]: false },
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
      }));
    }
  },

  addComment: async (productId: string, content: string) => {
    if (!productId || !content.trim()) return null;
    try {
      const response = await commentApi.create(productId, { content });
      const comment = normalizeComment(response as CommentResponse);
      set((state) => {
        const comments = state.commentsByProduct[productId] ?? [];
        const alreadyExists = comments.some((item) => item.id === comment.id);
        const updatedComments = alreadyExists
          ? comments.map((item) => (item.id === comment.id ? comment : item))
          : [...comments, comment];
        return {
          commentsByProduct: {
            ...state.commentsByProduct,
            [productId]: updatedComments,
          },
          countsByProduct: updateCountForProduct(state.countsByProduct, productId, (current) => ({
            productId,
            count: alreadyExists
              ? current?.count ?? updatedComments.length
              : (current?.count ?? comments.length) + 1,
            latestCommentAt: comment.createdAt.toISOString(),
          })),
        };
      });
      return comment;
    } catch (error) {
      console.error('[commentStore] Failed to create comment', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create comment',
      });
      throw error;
    }
  },

  editComment: async (productId: string, commentId: string, content: string) => {
    if (!productId || !commentId || !content.trim()) return;
    set({ updatingCommentId: commentId, error: null });
    try {
      const response = await commentApi.update(commentId, { content });
      const updated = normalizeComment(response as CommentResponse);
      set((state) => ({
        updatingCommentId: null,
        commentsByProduct: {
          ...state.commentsByProduct,
          [productId]: (state.commentsByProduct[productId] ?? []).map((comment) =>
            comment.id === commentId ? updated : comment,
          ),
        },
      }));
    } catch (error) {
      console.error('[commentStore] Failed to update comment', error);
      set({
        updatingCommentId: null,
        error: error instanceof Error ? error.message : 'Failed to update comment',
      });
      throw error;
    }
  },

  deleteComment: async (productId: string, commentId: string) => {
    if (!productId || !commentId) return;
    set({ deletingCommentId: commentId, error: null });
    try {
      await commentApi.remove(commentId);
      set((state) => {
        const comments = (state.commentsByProduct[productId] ?? []).filter(
          (comment) => comment.id !== commentId,
        );
        return {
          deletingCommentId: null,
          commentsByProduct: { ...state.commentsByProduct, [productId]: comments },
          countsByProduct: updateCountForProduct(state.countsByProduct, productId, (current) => ({
            productId,
            count: Math.max(0, (current?.count ?? comments.length + 1) - 1),
            latestCommentAt: current?.latestCommentAt ?? null,
          })),
        };
      });
    } catch (error) {
      console.error('[commentStore] Failed to delete comment', error);
      set({
        deletingCommentId: null,
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      });
      throw error;
    }
  },

  loadSummaries: async (productIds: string[]) => {
    const unique = Array.from(new Set(productIds.filter(Boolean)));
    if (unique.length === 0) return;
    try {
      const summary = await commentApi.getSummary(unique);
      set((state) => {
        const next: CountMap = { ...state.countsByProduct };
        summary.forEach((item) => {
          next[item.productId] = item;
        });
        return { countsByProduct: next };
      });
    } catch (error) {
      console.error('[commentStore] Failed to load comment summaries', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load comment summaries',
      });
    }
  },

  getCommentCount: (productId: string) => {
    return get().countsByProduct[productId]?.count ?? 0;
  },

  connectStream: () => {
    initializeWebSocket(set, get);
  },
}));

