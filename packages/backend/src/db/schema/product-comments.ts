import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { users } from './users';

export const productComments = pgTable(
  'product_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('product_comments_product_id_idx').on(table.productId),
    userIdIdx: index('product_comments_user_id_idx').on(table.userId),
    createdAtIdx: index('product_comments_created_at_idx').on(table.createdAt),
  })
);

export const productCommentsRelations = relations(productComments, ({ one }) => ({
  product: one(products, {
    fields: [productComments.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productComments.userId],
    references: [users.id],
  }),
}));

export type ProductComment = typeof productComments.$inferSelect;
export type NewProductComment = typeof productComments.$inferInsert;

