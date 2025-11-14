import { pgTable, uuid, text, integer, timestamp, index, decimal, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';
import { locations } from './locations';
import { persons } from './persons';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kanbanId: uuid('kanban_id')
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    columnStatus: text('column_status').notNull(),
    productDetails: text('product_details').notNull(),
    productLink: text('product_link'),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    assignedToPersonId: uuid('assigned_to_person_id').references(() => persons.id, { onDelete: 'set null' }),
    preferredReceiveKanbanId: uuid('preferred_receive_kanban_id').references(() => kanbans.id, { onDelete: 'set null' }),
    priority: text('priority'),
    stockLevel: integer('stock_level'), // nullable, only used when in 'Stored' status
    sourceProductId: uuid('source_product_id'), // tracks parent product for split items - foreign key added separately
    // Enhanced fields
    productImage: text('product_image'),
    category: text('category'),
    tags: jsonb('tags'), // array of strings
    supplier: text('supplier'),
    sku: text('sku'),
    dimensions: text('dimensions'),
    weight: decimal('weight', { precision: 10, scale: 2 }),
    unit: text('unit'), // measurement unit (kg, pcs, liters, etc.)
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
    notes: text('notes'),
    requesterName: text('requester_name'),
    // Import metadata
    importSource: text('import_source'), // 'bulk-import' | 'kanban-flow' | 'manual' (kept as free text)
    importBatchId: uuid('import_batch_id'),
    originalPurchaseDate: timestamp('original_purchase_date'),
    isDraft: boolean('is_draft').notNull().default(false),
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
    sourceProductIdIdx: index('products_source_product_id_idx').on(table.sourceProductId),
    locationIdIdx: index('products_location_id_idx').on(table.locationId),
    assignedToPersonIdIdx: index('products_assigned_to_person_id_idx').on(table.assignedToPersonId),
    preferredReceiveKanbanIdIdx: index('products_preferred_receive_kanban_id_idx').on(table.preferredReceiveKanbanId),
    importBatchIdIdx: index('products_import_batch_id_idx').on(table.importBatchId),
    isDraftIdx: index('products_is_draft_idx').on(table.isDraft),
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
  assignedToPerson: one(persons, {
    fields: [products.assignedToPersonId],
    references: [persons.id],
  }),
  preferredReceiveKanban: one(kanbans, {
    fields: [products.preferredReceiveKanbanId],
    references: [kanbans.id],
  }),
  sourceProduct: one(products, {
    fields: [products.sourceProductId],
    references: [products.id],
    relationName: 'productSplits',
  }),
  splitProducts: many(products, {
    relationName: 'productSplits',
  }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;