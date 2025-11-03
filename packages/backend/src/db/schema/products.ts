import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kanbanId: uuid('kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    columnStatus: text('column_status').notNull(),
    productDetails: text('product_details').notNull(),
    productLink: text('product_link'),
    location: text('location'),
    priority: text('priority'),
    stockLevel: integer('stock_level'), // nullable, only used when in 'Stored' status
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    kanbanIdIdx: index('products_kanban_id_idx').on(table.kanbanId),
    columnStatusIdx: index('products_column_status_idx').on(table.columnStatus),
  })
);

export const productsRelations = relations(products, ({ one }) => ({
  kanban: one(kanbans, {
    fields: [products.kanbanId],
    references: [kanbans.id],
  }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;