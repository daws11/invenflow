import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    department: text('department').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('persons_name_idx').on(table.name),
    departmentIdx: index('persons_department_idx').on(table.department),
    isActiveIdx: index('persons_is_active_idx').on(table.isActive),
  })
);

// Relations
export const personsRelations = relations(persons, ({ many }) => ({
  assignedProducts: many(products),
}));

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;

