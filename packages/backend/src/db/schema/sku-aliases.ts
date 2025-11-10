import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const skuAliases = pgTable(
  'sku_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    legacySku: text('legacy_sku'),
    legacyId: text('legacy_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('sku_aliases_product_id_idx').on(table.productId),
    legacySkuUidx: uniqueIndex('sku_aliases_legacy_sku_uidx').on(table.legacySku),
    legacyIdUidx: uniqueIndex('sku_aliases_legacy_id_uidx').on(table.legacyId),
  })
);

export const skuAliasesRelations = relations(skuAliases, ({ one }) => ({
  product: one(products, {
    fields: [skuAliases.productId],
    references: [products.id],
  }),
}));

export type SkuAlias = typeof skuAliases.$inferSelect;
export type NewSkuAlias = typeof skuAliases.$inferInsert;


