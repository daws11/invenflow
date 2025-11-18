import { pgTable, uuid, text, timestamp, index, foreignKey, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { locations } from './locations';
import { kanbanLinks } from './kanban-links';

export const kanbans = pgTable(
  'kanbans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'order' | 'receive'
    description: text('description'),
    linkedKanbanId: uuid('linked_kanban_id'), // DEPRECATED: Use kanban_links table instead
    defaultLinkedKanbanId: uuid('default_linked_kanban_id'), // Default receive kanban for automatic transfers
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    publicFormToken: text('public_form_token').unique(),
    isPublicFormEnabled: boolean('is_public_form_enabled').notNull().default(true),
    formFieldSettings: jsonb('form_field_settings').default('{}'),
    thresholdRules: jsonb('threshold_rules').default('[]'),
    storedAutoArchiveEnabled: boolean('stored_auto_archive_enabled').notNull().default(false),
    storedAutoArchiveAfterMinutes: integer('stored_auto_archive_after_minutes'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('kanbans_type_idx').on(table.type),
    publicFormTokenIdx: index('kanbans_public_form_token_idx').on(table.publicFormToken),
    isPublicFormEnabledIdx: index('kanbans_is_public_form_enabled_idx').on(table.isPublicFormEnabled),
    locationIdIdx: index('kanbans_location_id_idx').on(table.locationId),
    linkedKanbanFk: foreignKey({
      name: 'kanbans_linked_kanban_id_fkey',
      columns: [table.linkedKanbanId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
    defaultLinkedKanbanFk: foreignKey({
      name: 'kanbans_default_linked_kanban_id_fkey',
      columns: [table.defaultLinkedKanbanId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  })
);

export const kanbansRelations = relations(kanbans, ({ one, many }) => ({
  linkedKanban: one(kanbans, {
    fields: [kanbans.linkedKanbanId],
    references: [kanbans.id],
  }),
  defaultLinkedKanban: one(kanbans, {
    fields: [kanbans.defaultLinkedKanbanId],
    references: [kanbans.id],
  }),
  location: one(locations, {
    fields: [kanbans.locationId],
    references: [locations.id],
  }),
  products: many(products),
  orderLinks: many(kanbanLinks, {
    relationName: 'orderKanbanLinks',
  }),
  receiveLinks: many(kanbanLinks, {
    relationName: 'receiveKanbanLinks',
  }),
}));

export type Kanban = typeof kanbans.$inferSelect;
export type NewKanban = typeof kanbans.$inferInsert;
