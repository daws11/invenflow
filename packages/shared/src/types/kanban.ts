import { z } from 'zod';

export const KanbanTypeSchema = z.enum(['order', 'receive']);
export type KanbanType = z.infer<typeof KanbanTypeSchema>;

// Threshold configuration types
export const ThresholdOperatorSchema = z.enum(['>', '<', '=', '>=', '<=']);
export type ThresholdOperator = z.infer<typeof ThresholdOperatorSchema>;

export const ThresholdTimeUnitSchema = z.enum(['minutes', 'hours', 'days']);
export type ThresholdTimeUnit = z.infer<typeof ThresholdTimeUnitSchema>;

export const ThresholdRuleSchema = z.object({
  id: z.string(),
  operator: ThresholdOperatorSchema,
  value: z.number().positive().int(),
  unit: ThresholdTimeUnitSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // hex color
  priority: z.number().int().min(1),
});

export type ThresholdRule = z.infer<typeof ThresholdRuleSchema>;

export const KanbanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
  description: z.string().max(1000).nullable(),
  linkedKanbanId: z.string().uuid().nullable(),
  publicFormToken: z.string().nullable(),
  thresholdRules: z.array(ThresholdRuleSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateKanbanSchema = z.object({
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
  description: z.string().max(1000).optional(),
});

export const UpdateKanbanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  linkedKanbanId: z.string().uuid().nullable().optional(),
  thresholdRules: z.array(ThresholdRuleSchema).nullable().optional(),
});

export type Kanban = z.infer<typeof KanbanSchema>;
export type CreateKanban = z.infer<typeof CreateKanbanSchema>;
export type UpdateKanban = z.infer<typeof UpdateKanbanSchema>;

export const ORDER_COLUMNS = ['New Request', 'In Review', 'Purchased'] as const;
export const RECEIVE_COLUMNS = ['Purchased', 'Received', 'Stored'] as const;

export type OrderColumn = typeof ORDER_COLUMNS[number];
export type ReceiveColumn = typeof RECEIVE_COLUMNS[number];
export type ColumnStatus = OrderColumn | ReceiveColumn;