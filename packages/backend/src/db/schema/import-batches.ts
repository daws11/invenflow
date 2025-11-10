import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    label: text('label').notNull(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('import_batches_created_at_idx').on(table.createdAt),
  })
);

export const importBatchesRelations = relations(importBatches, ({ many }) => ({
  // logical relation via products.importBatchId (no direct FK)
  products: many(products),
}));

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;


