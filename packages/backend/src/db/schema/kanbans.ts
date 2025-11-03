import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const kanbans = pgTable(
  'kanbans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'order' | 'receive'
    linkedKanbanId: uuid('linked_kanban_id').references(() => kanbans.id, {
      onDelete: 'set null',
    }),
    publicFormToken: text('public_form_token').unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('kanbans_type_idx').on(table.type),
    publicFormTokenIdx: index('kanbans_public_form_token_idx').on(table.publicFormToken),
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