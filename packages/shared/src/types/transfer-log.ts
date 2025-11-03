import { z } from 'zod';

export const TransferLogSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  fromKanbanId: z.string().uuid(),
  toKanbanId: z.string().uuid(),
  fromColumn: z.string(),
  toColumn: z.string(),
  fromLocationId: z.string().uuid().nullable(),
  toLocationId: z.string().uuid().nullable(),
  transferType: z.enum(['automatic', 'manual']),
  notes: z.string().nullable(),
  transferredBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateTransferLogSchema = z.object({
  productId: z.string().uuid(),
  fromKanbanId: z.string().uuid(),
  toKanbanId: z.string().uuid(),
  fromColumn: z.string(),
  toColumn: z.string(),
  fromLocationId: z.string().uuid().nullable(),
  toLocationId: z.string().uuid().nullable(),
  transferType: z.enum(['automatic', 'manual']),
  notes: z.string().nullable(),
  transferredBy: z.string().nullable(),
});

export type TransferLog = z.infer<typeof TransferLogSchema>;
export type CreateTransferLog = z.infer<typeof CreateTransferLogSchema>;

export const TRANSFER_TYPES = ['automatic', 'manual'] as const;
export type TransferType = typeof TRANSFER_TYPES[number];