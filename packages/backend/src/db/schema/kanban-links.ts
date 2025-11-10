import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { kanbans } from './kanbans';

export const kanbanLinks = pgTable(
  'kanban_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderKanbanId: uuid('order_kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    receiveKanbanId: uuid('receive_kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    orderKanbanIdIdx: index('kanban_links_order_kanban_id_idx').on(table.orderKanbanId),
    receiveKanbanIdIdx: index('kanban_links_receive_kanban_id_idx').on(table.receiveKanbanId),
    uniqueLink: uniqueIndex('kanban_links_unique_link_idx').on(
      table.orderKanbanId,
      table.receiveKanbanId
    ),
  })
);

export const kanbanLinksRelations = relations(kanbanLinks, ({ one }) => ({
  orderKanban: one(kanbans, {
    fields: [kanbanLinks.orderKanbanId],
    references: [kanbans.id],
    relationName: 'orderKanbanLinks',
  }),
  receiveKanban: one(kanbans, {
    fields: [kanbanLinks.receiveKanbanId],
    references: [kanbans.id],
    relationName: 'receiveKanbanLinks',
  }),
}));

export type KanbanLink = typeof kanbanLinks.$inferSelect;
export type NewKanbanLink = typeof kanbanLinks.$inferInsert;

