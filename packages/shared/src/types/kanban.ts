import { z } from 'zod';

export const KanbanTypeSchema = z.enum(['order', 'receive']);
export type KanbanType = z.infer<typeof KanbanTypeSchema>;

export const KanbanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
  linkedKanbanId: z.string().uuid().nullable(),
  publicFormToken: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateKanbanSchema = z.object({
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
});

export const UpdateKanbanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  linkedKanbanId: z.string().uuid().nullable().optional(),
});

export type Kanban = z.infer<typeof KanbanSchema>;
export type CreateKanban = z.infer<typeof CreateKanbanSchema>;
export type UpdateKanban = z.infer<typeof UpdateKanbanSchema>;

export const ORDER_COLUMNS = ['New Request', 'In Review', 'Purchased'] as const;
export const RECEIVE_COLUMNS = ['Purchased', 'Received', 'Stored'] as const;

export type OrderColumn = typeof ORDER_COLUMNS[number];
export type ReceiveColumn = typeof RECEIVE_COLUMNS[number];
export type ColumnStatus = OrderColumn | ReceiveColumn;