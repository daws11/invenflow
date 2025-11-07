import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { persons } from './persons';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('departments_name_idx').on(table.name),
    isActiveIdx: index('departments_is_active_idx').on(table.isActive),
  })
);

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  persons: many(persons),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

