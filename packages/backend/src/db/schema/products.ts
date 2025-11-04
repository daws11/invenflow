import { pgTable, uuid, text, integer, timestamp, index, decimal, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';
import { locations } from './locations';

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
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    priority: text('priority'),
    stockLevel: integer('stock_level'), // nullable, only used when in 'Stored' status
    // Enhanced fields
    productImage: text('product_image'),
    category: text('category'),
    tags: jsonb('tags'), // array of strings
    supplier: text('supplier'),
    sku: text('sku'),
    dimensions: text('dimensions'),
    weight: decimal('weight', { precision: 10, scale: 2 }),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
    notes: text('notes'),
    columnEnteredAt: timestamp('column_entered_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    kanbanIdIdx: index('products_kanban_id_idx').on(table.kanbanId),
    columnStatusIdx: index('products_column_status_idx').on(table.columnStatus),
    categoryIdx: index('products_category_idx').on(table.category),
    supplierIdx: index('products_supplier_idx').on(table.supplier),
    skuIdx: index('products_sku_idx').on(table.sku),
  })
);

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  kanban: one(kanbans, {
    fields: [products.kanbanId],
    references: [kanbans.id],
  }),
  location: one(locations, {
    fields: [products.locationId],
    references: [locations.id],
  }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;