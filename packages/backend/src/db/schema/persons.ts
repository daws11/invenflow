import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { departments } from './departments';

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('persons_name_idx').on(table.name),
    departmentIdIdx: index('persons_department_id_idx').on(table.departmentId),
    isActiveIdx: index('persons_is_active_idx').on(table.isActive),
  })
);

// Relations
export const personsRelations = relations(persons, ({ one, many }) => ({
  department: one(departments, {
    fields: [persons.departmentId],
    references: [departments.id],
  }),
  assignedProducts: many(products),
}));

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;

