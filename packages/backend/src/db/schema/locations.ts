import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    area: text('area').notNull(),
    code: text('code').notNull().unique(),
    type: text('type').notNull().default('physical'), // 'physical' or 'person'
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    areaIdx: index('locations_area_idx').on(table.area),
    codeIdx: index('locations_code_idx').on(table.code),
    nameIdx: index('locations_name_idx').on(table.name),
    typeIdx: index('locations_type_idx').on(table.type),
    uniqueAreaName: index('locations_area_name_idx').on(table.area, table.name),
  })
);

// Relations
export const locationsRelations = relations(locations, ({ many }) => ({
  products: many(products),
}));

