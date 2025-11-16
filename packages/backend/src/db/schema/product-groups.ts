import { pgTable, uuid, text, timestamp, index, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';
import { products } from './products';

export const productGroups = pgTable(
  'product_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kanbanId: uuid('kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    groupTitle: text('group_title').notNull(),
    columnStatus: text('column_status').notNull(), // groups are column-specific
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    kanbanIdIdx: index('product_groups_kanban_id_idx').on(table.kanbanId),
    columnStatusIdx: index('product_groups_column_status_idx').on(table.columnStatus),
  })
);

export const productGroupSettings = pgTable(
  'product_group_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productGroupId: uuid('product_group_id')
      .notNull()
      .references(() => productGroups.id, { onDelete: 'cascade' }),
    unifiedFields: jsonb('unified_fields').notNull(), // e.g., { priority: true, category: true }
    unifiedValues: jsonb('unified_values').notNull(), // e.g., { priority: "High", category: "Electronics" }
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    productGroupIdUnique: unique('product_group_settings_product_group_id_unique').on(table.productGroupId),
  })
);

// Relations
export const productGroupsRelations = relations(productGroups, ({ one, many }) => ({
  kanban: one(kanbans, {
    fields: [productGroups.kanbanId],
    references: [kanbans.id],
  }),
  products: many(products),
  settings: one(productGroupSettings, {
    fields: [productGroups.id],
    references: [productGroupSettings.productGroupId],
  }),
}));

export const productGroupSettingsRelations = relations(productGroupSettings, ({ one }) => ({
  productGroup: one(productGroups, {
    fields: [productGroupSettings.productGroupId],
    references: [productGroups.id],
  }),
}));

export type ProductGroup = typeof productGroups.$inferSelect;
export type NewProductGroup = typeof productGroups.$inferInsert;
export type ProductGroupSettings = typeof productGroupSettings.$inferSelect;
export type NewProductGroupSettings = typeof productGroupSettings.$inferInsert;

