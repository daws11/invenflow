import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';
import { products } from './products';

export const storedLogs = pgTable(
  'stored_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kanbanId: uuid('kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    productDetails: text('product_details').notNull(),
    sku: text('sku'),
    quantity: integer('quantity'),
    unit: text('unit'),
    stockLevel: integer('stock_level'),
    category: text('category'),
    supplier: text('supplier'),
    removalType: text('removal_type').notNull().default('auto'),
    removalReason: text('removal_reason'),
    storedAt: timestamp('stored_at', { mode: 'string' }).notNull(),
    removedAt: timestamp('removed_at', { mode: 'string' }).notNull().defaultNow(),
    productSnapshot: jsonb('product_snapshot').default('{}'),
    metadata: jsonb('metadata').default('{}'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    kanbanIdIdx: index('stored_logs_kanban_id_idx').on(table.kanbanId),
    removalTypeIdx: index('stored_logs_removal_type_idx').on(table.removalType),
    removedAtIdx: index('stored_logs_removed_at_idx').on(table.removedAt),
  }),
);

export const storedLogsRelations = relations(storedLogs, ({ one }) => ({
  kanban: one(kanbans, {
    fields: [storedLogs.kanbanId],
    references: [kanbans.id],
  }),
  product: one(products, {
    fields: [storedLogs.productId],
    references: [products.id],
  }),
}));

export type StoredLog = typeof storedLogs.$inferSelect;
export type NewStoredLog = typeof storedLogs.$inferInsert;

