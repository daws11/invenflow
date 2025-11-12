import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { locations } from './locations';
import { products } from './products';

export const bulkMovements = pgTable(
  'bulk_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromLocationId: uuid('from_location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    toLocationId: uuid('to_location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('pending'), // pending, in_transit, received, expired
    publicToken: text('public_token').notNull().unique(),
    tokenExpiresAt: timestamp('token_expires_at').notNull(),
    createdBy: text('created_by').notNull(), // user email/username
    confirmedBy: text('confirmed_by'), // receiver name/identifier
    confirmedAt: timestamp('confirmed_at'),
    cancelledAt: timestamp('cancelled_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    fromLocationIdIdx: index('bulk_movements_from_location_id_idx').on(table.fromLocationId),
    toLocationIdIdx: index('bulk_movements_to_location_id_idx').on(table.toLocationId),
    statusIdx: index('bulk_movements_status_idx').on(table.status),
    publicTokenIdx: index('bulk_movements_public_token_idx').on(table.publicToken),
    tokenExpiresAtIdx: index('bulk_movements_token_expires_at_idx').on(table.tokenExpiresAt),
    createdAtIdx: index('bulk_movements_created_at_idx').on(table.createdAt),
  })
);

export const bulkMovementItems = pgTable(
  'bulk_movement_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bulkMovementId: uuid('bulk_movement_id')
      .notNull()
      .references(() => bulkMovements.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantitySent: integer('quantity_sent').notNull(),
    quantityReceived: integer('quantity_received'), // null until confirmed
    sku: text('sku'), // denormalized for quick access
    productDetails: text('product_details').notNull(), // denormalized product name
    productImage: text('product_image'), // denormalized for display
    unit: text('unit'), // denormalized unit information
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    bulkMovementIdIdx: index('bulk_movement_items_bulk_movement_id_idx').on(table.bulkMovementId),
    productIdIdx: index('bulk_movement_items_product_id_idx').on(table.productId),
    skuIdx: index('bulk_movement_items_sku_idx').on(table.sku),
  })
);

// Relations
export const bulkMovementsRelations = relations(bulkMovements, ({ one, many }) => ({
  fromLocation: one(locations, {
    fields: [bulkMovements.fromLocationId],
    references: [locations.id],
    relationName: 'fromLocation',
  }),
  toLocation: one(locations, {
    fields: [bulkMovements.toLocationId],
    references: [locations.id],
    relationName: 'toLocation',
  }),
  items: many(bulkMovementItems),
}));

export const bulkMovementItemsRelations = relations(bulkMovementItems, ({ one }) => ({
  bulkMovement: one(bulkMovements, {
    fields: [bulkMovementItems.bulkMovementId],
    references: [bulkMovements.id],
  }),
  product: one(products, {
    fields: [bulkMovementItems.productId],
    references: [products.id],
  }),
}));

