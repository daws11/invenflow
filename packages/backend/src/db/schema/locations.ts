import { pgTable, uuid, text, timestamp, index, integer, boolean, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    area: text('area').notNull(),
    code: text('code').notNull().unique(),
    building: text('building'),
    floor: text('floor'),
    capacity: integer('capacity'),
    isActive: boolean('is_active').notNull().default(true),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    areaIdx: index('locations_area_idx').on(table.area),
    codeIdx: index('locations_code_idx').on(table.code),
    nameIdx: index('locations_name_idx').on(table.name),
    buildingIdx: index('locations_building_idx').on(table.building),
    isActiveIdx: index('locations_is_active_idx').on(table.isActive),
    // Changed from index to unique constraint to prevent duplicate General locations per area
    uniqueAreaName: unique('locations_area_name_unique').on(table.area, table.name),
  })
);

// Relations
export const locationsRelations = relations(locations, ({ many }) => ({
  products: many(products),
}));

