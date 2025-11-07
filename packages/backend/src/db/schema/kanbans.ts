import { pgTable, uuid, text, timestamp, index, foreignKey, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const kanbans = pgTable(
  'kanbans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'order' | 'receive'
    description: text('description'),
    linkedKanbanId: uuid('linked_kanban_id'),
    publicFormToken: text('public_form_token').unique(),
    isPublicFormEnabled: boolean('is_public_form_enabled').notNull().default(true),
    thresholdRules: jsonb('threshold_rules').default('[]'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('kanbans_type_idx').on(table.type),
    publicFormTokenIdx: index('kanbans_public_form_token_idx').on(table.publicFormToken),
    isPublicFormEnabledIdx: index('kanbans_is_public_form_enabled_idx').on(table.isPublicFormEnabled),
    linkedKanbanFk: foreignKey({
      name: 'kanbans_linked_kanban_id_fkey',
      columns: [table.linkedKanbanId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  })
);

export const kanbansRelations = relations(kanbans, ({ one, many }) => ({
  linkedKanban: one(kanbans, {
    fields: [kanbans.linkedKanbanId],
    references: [kanbans.id],
  }),
  products: many(products),
}));

export type Kanban = typeof kanbans.$inferSelect;
export type NewKanban = typeof kanbans.$inferInsert;
