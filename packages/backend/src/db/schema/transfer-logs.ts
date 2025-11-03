import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans, products } from './index';

export const transferLogs = pgTable(
  'transfer_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    fromKanbanId: uuid('from_kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    toKanbanId: uuid('to_kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    fromColumn: text('from_column').notNull(),
    toColumn: text('to_column').notNull(),
    transferType: text('transfer_type').notNull(), // 'automatic' | 'manual'
    notes: text('notes'),
    transferredBy: text('transferred_by'), // user identifier
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('transfer_logs_product_id_idx').on(table.productId),
    fromKanbanIdIdx: index('transfer_logs_from_kanban_id_idx').on(table.fromKanbanId),
    toKanbanIdIdx: index('transfer_logs_to_kanban_id_idx').on(table.toKanbanId),
    transferTypeIdx: index('transfer_logs_transfer_type_idx').on(table.transferType),
    createdAtIdx: index('transfer_logs_created_at_idx').on(table.createdAt),
  })
);

export const transferLogsRelations = relations(transferLogs, ({ one }) => ({
  product: one(products, {
    fields: [transferLogs.productId],
    references: [products.id],
  }),
  fromKanban: one(kanbans, {
    fields: [transferLogs.fromKanbanId],
    references: [kanbans.id],
  }),
  toKanban: one(kanbans, {
    fields: [transferLogs.toKanbanId],
    references: [kanbans.id],
  }),
}));

export type TransferLog = typeof transferLogs.$inferSelect;
export type NewTransferLog = typeof transferLogs.$inferInsert;