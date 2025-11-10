import { pgTable, uuid, text, integer, timestamp, decimal, index, pgView } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';
import { locations } from './locations';
import { kanbans } from './kanbans';

// Stock snapshot table for point-in-time analysis
export const stockSnapshots = pgTable(
  'stock_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .references(() => locations.id, { onDelete: 'set null' }),
    sku: text('sku'),
    stockLevel: integer('stock_level').notNull(),
    columnStatus: text('column_status').notNull(),
    snapshotDate: timestamp('snapshot_date').notNull().defaultNow(),
    snapshotType: text('snapshot_type').notNull(), // 'daily', 'movement', 'manual'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('stock_snapshots_product_id_idx').on(table.productId),
    locationIdIdx: index('stock_snapshots_location_id_idx').on(table.locationId),
    skuIdx: index('stock_snapshots_sku_idx').on(table.sku),
    snapshotDateIdx: index('stock_snapshots_date_idx').on(table.snapshotDate),
    snapshotTypeIdx: index('stock_snapshots_type_idx').on(table.snapshotType),
    locationDateIdx: index('stock_snapshots_location_date_idx').on(table.locationId, table.snapshotDate),
  })
);

// Materialized view for stock by location analytics
export const stockByLocationView = pgView('stock_by_location_view').as((qb) =>
  qb
    .select({
      locationId: products.locationId,
      locationName: locations.name,
      locationArea: locations.area,
      locationBuilding: locations.building,
      totalProducts: sql<number>`count(*)`.as('total_products'),
      totalStock: sql<number>`coalesce(sum(${products.stockLevel}), 0)`.as('total_stock'),
      storedProducts: sql<number>`count(case when ${products.columnStatus} = 'Stored' then 1 end)`.as('stored_products'),
      receivedProducts: sql<number>`count(case when ${products.columnStatus} = 'Received' then 1 end)`.as('received_products'),
      lowStockProducts: sql<number>`count(case when ${products.stockLevel} <= 10 and ${products.columnStatus} = 'Stored' then 1 end)`.as('low_stock_products'),
      outOfStockProducts: sql<number>`count(case when ${products.stockLevel} = 0 and ${products.columnStatus} = 'Stored' then 1 end)`.as('out_of_stock_products'),
      avgStockLevel: sql<number>`avg(${products.stockLevel})`.as('avg_stock_level'),
      lastUpdated: sql<Date>`max(${products.updatedAt})`.as('last_updated'),
    })
    .from(products)
    .leftJoin(locations, sql`${products.locationId} = ${locations.id}`)
    .leftJoin(kanbans, sql`${products.kanbanId} = ${kanbans.id}`)
    .where(sql`${kanbans.type} = 'receive' and ${products.locationId} is not null`)
    .groupBy(products.locationId, locations.name, locations.area, locations.building)
);

// Materialized view for SKU analytics across locations
export const skuLocationAnalyticsView = pgView('sku_location_analytics_view').as((qb) =>
  qb
    .select({
      sku: products.sku,
      productName: sql<string>`max(${products.productDetails})`.as('product_name'),
      category: sql<string>`max(${products.category})`.as('category'),
      supplier: sql<string>`max(${products.supplier})`.as('supplier'),
      locationId: products.locationId,
      locationName: locations.name,
      locationArea: locations.area,
      totalStock: sql<number>`coalesce(sum(${products.stockLevel}), 0)`.as('total_stock'),
      productCount: sql<number>`count(*)`.as('product_count'),
      storedCount: sql<number>`count(case when ${products.columnStatus} = 'Stored' then 1 end)`.as('stored_count'),
      receivedCount: sql<number>`count(case when ${products.columnStatus} = 'Received' then 1 end)`.as('received_count'),
      avgUnitPrice: sql<number>`avg(${products.unitPrice})`.as('avg_unit_price'),
      totalValue: sql<number>`coalesce(sum(${products.stockLevel} * ${products.unitPrice}), 0)`.as('total_value'),
      lastMovement: sql<Date>`max(${products.updatedAt})`.as('last_movement'),
    })
    .from(products)
    .leftJoin(locations, sql`${products.locationId} = ${locations.id}`)
    .leftJoin(kanbans, sql`${products.kanbanId} = ${kanbans.id}`)
    .where(sql`${kanbans.type} = 'receive' and ${products.sku} is not null and ${products.locationId} is not null`)
    .groupBy(products.sku, products.locationId, locations.name, locations.area)
);

// Stock alert configuration table
export const stockAlerts = pgTable(
  'stock_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: text('sku'),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }),
    category: text('category'),
    alertType: text('alert_type').notNull(), // 'low_stock', 'out_of_stock', 'overstock'
    threshold: integer('threshold').notNull(),
    isActive: text('is_active').notNull().default('true'),
    notificationEmail: text('notification_email'),
    lastTriggered: timestamp('last_triggered'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    skuIdx: index('stock_alerts_sku_idx').on(table.sku),
    locationIdIdx: index('stock_alerts_location_id_idx').on(table.locationId),
    categoryIdx: index('stock_alerts_category_idx').on(table.category),
    alertTypeIdx: index('stock_alerts_type_idx').on(table.alertType),
    isActiveIdx: index('stock_alerts_active_idx').on(table.isActive),
  })
);

export type StockSnapshot = typeof stockSnapshots.$inferSelect;
export type NewStockSnapshot = typeof stockSnapshots.$inferInsert;
export type StockAlert = typeof stockAlerts.$inferSelect;
export type NewStockAlert = typeof stockAlerts.$inferInsert;
