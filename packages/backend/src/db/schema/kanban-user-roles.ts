import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { kanbans } from './kanbans';

export const kanbanUserRoles = pgTable(
  'kanban_user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kanbanId: uuid('kanban_id')
      .notNull()
      .references(() => kanbans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'viewer' | 'editor'
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    kanbanIdIdx: index('kanban_user_roles_kanban_id_idx').on(table.kanbanId),
    userIdIdx: index('kanban_user_roles_user_id_idx').on(table.userId),
    uniqueAssignment: uniqueIndex('kanban_user_roles_kanban_id_user_id_uniq').on(
      table.kanbanId,
      table.userId
    ),
  })
);

export const kanbanUserRolesRelations = relations(kanbanUserRoles, ({ one }) => ({
  kanban: one(kanbans, {
    fields: [kanbanUserRoles.kanbanId],
    references: [kanbans.id],
  }),
  user: one(users, {
    fields: [kanbanUserRoles.userId],
    references: [users.id],
  }),
}));

export type KanbanUserRole = typeof kanbanUserRoles.$inferSelect;
export type NewKanbanUserRole = typeof kanbanUserRoles.$inferInsert;

