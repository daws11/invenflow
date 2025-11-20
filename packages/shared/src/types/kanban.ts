import { z } from 'zod';

export const KanbanTypeSchema = z.enum(['order', 'receive', 'investment']);
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

// Form field settings types
export const FormFieldSettingsSchema = z.object({
  requesterName: z.boolean().default(true),
  department: z.boolean().default(true),
  location: z.boolean().default(true),
  itemUrl: z.boolean().default(true),
  quantity: z.boolean().default(true),
  priority: z.boolean().default(true),
  notes: z.boolean().default(true),
});

export type FormFieldSettings = z.infer<typeof FormFieldSettingsSchema>;

// Default form field settings - all fields enabled except itemName (always required)
export const DEFAULT_FORM_FIELD_SETTINGS: FormFieldSettings = {
  requesterName: true,
  department: true,
  location: true,
  itemUrl: true,
  quantity: true,
  priority: true,
  notes: true,
};

export const KanbanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
  description: z.string().max(1000).nullable(),
  linkedKanbanId: z.string().uuid().nullable(), // DEPRECATED: Use linkedKanbans array
  defaultLinkedKanbanId: z.string().uuid().nullable(), // Default receive kanban for automatic transfers
  locationId: z.string().uuid().nullable(),
  publicFormToken: z.string().nullable(),
  isPublicFormEnabled: z.boolean(),
  formFieldSettings: FormFieldSettingsSchema.nullable(),
  thresholdRules: z.array(ThresholdRuleSchema).nullable(),
  storedAutoArchiveEnabled: z.boolean().default(false),
  storedAutoArchiveAfterMinutes: z.number().int().min(1).max(43200).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  productCount: z.number().optional(),
  // Optional arrays for related data
  products: z.array(z.any()).optional(), // Will be Product[] from product.ts
  productGroups: z.array(z.any()).optional(), // Will be ProductGroupWithDetails[] from product-group.ts
  linkedKanbans: z.array(z.any()).optional(), // Will be LinkedReceiveKanban[] 
  location: z.any().optional(), // Will be Location from location.ts
});

export const CreateKanbanSchema = z.object({
  name: z.string().min(1).max(255),
  type: KanbanTypeSchema,
  description: z.string().max(1000).optional(),
  locationId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // If type is 'receive', locationId is required
    if (data.type === 'receive') {
      return data.locationId !== undefined && data.locationId !== null;
    }
    return true;
  },
  {
    message: 'Location is required for receive kanbans',
    path: ['locationId'],
  }
);

export const UpdateKanbanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  linkedKanbanId: z.string().uuid().nullable().optional(), // DEPRECATED
  defaultLinkedKanbanId: z.string().uuid().nullable().optional(), // Default receive kanban for automatic transfers
  locationId: z.string().uuid().nullable().optional(),
  isPublicFormEnabled: z.boolean().optional(),
  formFieldSettings: FormFieldSettingsSchema.nullable().optional(),
  thresholdRules: z.array(ThresholdRuleSchema).nullable().optional(),
  storedAutoArchiveEnabled: z.boolean().optional(),
  storedAutoArchiveAfterMinutes: z.number().int().min(1).max(43200).nullable().optional(),
});

export type Kanban = z.infer<typeof KanbanSchema>;
export type CreateKanban = z.infer<typeof CreateKanbanSchema>;
export type UpdateKanban = z.infer<typeof UpdateKanbanSchema>;

export const ORDER_COLUMNS = ['New Request', 'In Review', 'Purchased'] as const;
export const RECEIVE_COLUMNS = ['Purchased', 'Received', 'Stored'] as const;
export const INVESTMENT_COLUMNS = ['New', 'Review', 'Approved'] as const;

export type OrderColumn = typeof ORDER_COLUMNS[number];
export type ReceiveColumn = typeof RECEIVE_COLUMNS[number];
export type InvestmentColumn = typeof INVESTMENT_COLUMNS[number];
export type ColumnStatus = OrderColumn | ReceiveColumn | InvestmentColumn;