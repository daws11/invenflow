import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { locations } from './locations';

export const productValidations = pgTable(
  'product_validations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    columnStatus: text('column_status').notNull(), // 'Received' | 'Stored'
    recipientName: text('recipient_name').notNull(),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    receivedImage: text('received_image'), // file path/URL for received items
    storagePhoto: text('storage_photo'), // file path/URL for stored items
    validatedBy: text('validated_by').notNull(), // user identifier
    notes: text('notes'), // additional notes for validation
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('product_validations_product_id_idx').on(table.productId),
    columnStatusIdx: index('product_validations_column_status_idx').on(table.columnStatus),
    locationIdIdx: index('product_validations_location_id_idx').on(table.locationId),
    createdAtIdx: index('product_validations_created_at_idx').on(table.createdAt),
  })
);

// Relations
export const productValidationsRelations = relations(productValidations, ({ one }) => ({
  product: one(products, {
    fields: [productValidations.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [productValidations.locationId],
    references: [locations.id],
  }),
}));

// Types
export type ProductValidation = typeof productValidations.$inferSelect;
export type NewProductValidation = typeof productValidations.$inferInsert;