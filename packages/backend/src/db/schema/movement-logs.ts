import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { locations } from './locations';
import { persons } from './persons';

export const movementLogs = pgTable(
  'movement_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    fromLocationId: uuid('from_location_id')
      .references(() => locations.id, { onDelete: 'set null' }),
    toLocationId: uuid('to_location_id')
      .references(() => locations.id, { onDelete: 'set null' }),
    fromPersonId: uuid('from_person_id')
      .references(() => persons.id, { onDelete: 'set null' }),
    toPersonId: uuid('to_person_id')
      .references(() => persons.id, { onDelete: 'set null' }),
    fromStockLevel: integer('from_stock_level'),
    toStockLevel: integer('to_stock_level').notNull(),
    notes: text('notes'),
    movedBy: text('moved_by'), // user identifier (email or username)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('movement_logs_product_id_idx').on(table.productId),
    fromLocationIdIdx: index('movement_logs_from_location_id_idx').on(table.fromLocationId),
    toLocationIdIdx: index('movement_logs_to_location_id_idx').on(table.toLocationId),
    fromPersonIdIdx: index('movement_logs_from_person_id_idx').on(table.fromPersonId),
    toPersonIdIdx: index('movement_logs_to_person_id_idx').on(table.toPersonId),
    createdAtIdx: index('movement_logs_created_at_idx').on(table.createdAt),
  })
);

// Relations
export const movementLogsRelations = relations(movementLogs, ({ one }) => ({
  product: one(products, {
    fields: [movementLogs.productId],
    references: [products.id],
  }),
  fromLocation: one(locations, {
    fields: [movementLogs.fromLocationId],
    references: [locations.id],
  }),
  toLocation: one(locations, {
    fields: [movementLogs.toLocationId],
    references: [locations.id],
  }),
  fromPerson: one(persons, {
    fields: [movementLogs.fromPersonId],
    references: [persons.id],
  }),
  toPerson: one(persons, {
    fields: [movementLogs.toPersonId],
    references: [persons.id],
  }),
}));

export type MovementLog = typeof movementLogs.$inferSelect;
export type NewMovementLog = typeof movementLogs.$inferInsert;

