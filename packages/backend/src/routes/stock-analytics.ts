import { Router } from 'express';
import { db } from '../db';
import { 
  products, 
  locations, 
  kanbans, 
  movementLogs,
  stockSnapshots,
  stockAlerts,
  stockByLocationView,
  skuLocationAnalyticsView 
} from '../db/schema';
import {
  eq,
  and,
  inArray,
  gte,
  lte,
  desc,
  asc,
  sql,
  count,
  sum,
  avg,
  max,
  min,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/inventory/analytics/stock-by-location - Stock breakdown per lokasi
router.get('/stock-by-location', async (req, res, next) => {
  try {
    const { area, building, includeEmpty } = req.query;
    
    let whereConditions: SQL<unknown>[] = [
      eq(kanbans.type, 'receive')
    ];

    if (area && typeof area === 'string') {
      whereConditions.push(eq(locations.area, area));
    }

    if (building && typeof building === 'string') {
      whereConditions.push(eq(locations.building, building));
    }

    if (includeEmpty !== 'true') {
      whereConditions.push(isNotNull(products.locationId));
    }

    const stockByLocation = await db
      .select({
        locationId: locations.id,
        locationName: locations.name,
        locationCode: locations.code,
        locationArea: locations.area,
        locationBuilding: locations.building,
        locationCapacity: locations.capacity,
        totalProducts: sql<number>`count(${products.id})`.as('total_products'),
        totalStock: sql<number>`coalesce(sum(case when ${products.columnStatus} = 'Stored' then ${products.stockLevel} else 0 end), 0)`.as('total_stock'),
        storedProducts: sql<number>`count(case when ${products.columnStatus} = 'Stored' then 1 end)`.as('stored_products'),
        receivedProducts: sql<number>`count(case when ${products.columnStatus} = 'Received' then 1 end)`.as('received_products'),
        purchasedProducts: sql<number>`count(case when ${products.columnStatus} = 'Purchased' then 1 end)`.as('purchased_products'),
        lowStockProducts: sql<number>`count(case when ${products.stockLevel} <= 10 and ${products.columnStatus} = 'Stored' then 1 end)`.as('low_stock_products'),
        outOfStockProducts: sql<number>`count(case when ${products.stockLevel} = 0 and ${products.columnStatus} = 'Stored' then 1 end)`.as('out_of_stock_products'),
        avgStockLevel: sql<number>`avg(case when ${products.columnStatus} = 'Stored' then ${products.stockLevel} end)`.as('avg_stock_level'),
        totalValue: sql<number>`coalesce(sum(case when ${products.columnStatus} = 'Stored' then ${products.stockLevel} * ${products.unitPrice} end), 0)`.as('total_value'),
        utilizationRate: sql<number>`case when ${locations.capacity} > 0 then (count(${products.id})::float / ${locations.capacity} * 100) else null end`.as('utilization_rate'),
        lastUpdated: sql<Date>`max(${products.updatedAt})`.as('last_updated'),
      })
      .from(locations)
      .leftJoin(products, eq(products.locationId, locations.id))
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(and(...whereConditions))
      .groupBy(
        locations.id, 
        locations.name, 
        locations.code, 
        locations.area, 
        locations.building,
        locations.capacity
      )
      .orderBy(asc(locations.area), asc(locations.name));

    res.json({
      locations: stockByLocation,
      summary: {
        totalLocations: stockByLocation.length,
        totalProducts: stockByLocation.reduce((sum, loc) => sum + Number(loc.totalProducts), 0),
        totalStock: stockByLocation.reduce((sum, loc) => sum + Number(loc.totalStock), 0),
        totalValue: stockByLocation.reduce((sum, loc) => sum + Number(loc.totalValue), 0),
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('movement-trends error:', error);
    next(error);
  }
});

// GET /api/inventory/analytics/movement-trends - Movement patterns analysis
router.get('/movement-trends', async (req, res, next) => {
  try {
    const { 
      days = '30',
      locationId,
      groupBy = 'day' // 'day', 'week', 'month'
    } = req.query;

    const daysNumber = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber);

    let whereConditions: SQL<unknown>[] = [
      gte(movementLogs.createdAt, startDate)
    ];

    if (locationId && typeof locationId === 'string') {
      whereConditions.push(
        sql`(${movementLogs.fromLocationId} = ${locationId} OR ${movementLogs.toLocationId} = ${locationId})`
      );
    }

    let dateGrouping: SQL<unknown>;
    switch (groupBy) {
      case 'week':
        dateGrouping = sql`date_trunc('week', ${movementLogs.createdAt})`;
        break;
      case 'month':
        dateGrouping = sql`date_trunc('month', ${movementLogs.createdAt})`;
        break;
      default:
        dateGrouping = sql`date_trunc('day', ${movementLogs.createdAt})`;
    }

    const movementTrends = await db
      .select({
        period: dateGrouping.as('period'),
        totalMovements: sql<number>`count(*)`.as('total_movements'),
        totalStockMoved: sql<number>`sum(${movementLogs.toStockLevel} - coalesce(${movementLogs.fromStockLevel}, 0))`.as('total_stock_moved'),
        avgStockPerMovement: sql<number>`avg(${movementLogs.toStockLevel})`.as('avg_stock_per_movement'),
      })
      .from(movementLogs)
      .where(and(...whereConditions))
      .groupBy(dateGrouping)
      .orderBy(asc(dateGrouping));

    // Get location-based movement summary
    const locationMovements = await db
      .select({
        locationId: locations.id,
        locationName: locations.name,
        incomingMovements: sql<number>`count(case when ${movementLogs.toLocationId} = ${locations.id} then 1 end)`.as('incoming_movements'),
        outgoingMovements: sql<number>`count(case when ${movementLogs.fromLocationId} = ${locations.id} then 1 end)`.as('outgoing_movements'),
        netStockChange: sql<number>`sum(case when ${movementLogs.toLocationId} = ${locations.id} then ${movementLogs.toStockLevel} else 0 end) - sum(case when ${movementLogs.fromLocationId} = ${locations.id} then ${movementLogs.fromStockLevel} else 0 end)`.as('net_stock_change'),
      })
      .from(locations)
      .leftJoin(movementLogs, sql`${movementLogs.fromLocationId} = ${locations.id} OR ${movementLogs.toLocationId} = ${locations.id}`)
      .where(gte(movementLogs.createdAt, startDate))
      .groupBy(locations.id, locations.name)
      .orderBy(
        desc(
          sql`
            count(case when ${movementLogs.toLocationId} = ${locations.id} then 1 end)
            + count(case when ${movementLogs.fromLocationId} = ${locations.id} then 1 end)
          `
        )
      );

    res.json({
      trends: movementTrends,
      locationSummary: locationMovements,
      period: {
        startDate,
        endDate: new Date(),
        days: daysNumber,
        groupBy
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/analytics/stock-alerts - Low stock dan discrepancy alerts
router.get('/stock-alerts', async (req, res, next) => {
  try {
    const { severity, locationId, category } = req.query;

    // Get current stock alerts
    const lowStockItems = await db
      .select({
        productId: products.id,
        sku: products.sku,
        productName: products.productDetails,
        category: products.category,
        supplier: products.supplier,
        currentStock: products.stockLevel,
        locationId: products.locationId,
        locationName: locations.name,
        lastMovement: products.updatedAt,
        alertLevel: sql<string>`case 
          when ${products.stockLevel} = 0 then 'critical'
          when ${products.stockLevel} <= 5 then 'high'
          when ${products.stockLevel} <= 10 then 'medium'
          else 'low'
        end`.as('alert_level'),
      })
      .from(products)
      .leftJoin(locations, eq(products.locationId, locations.id))
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(kanbans.type, 'receive'),
          eq(products.columnStatus, 'Stored'),
          lte(products.stockLevel, 10),
          locationId ? eq(products.locationId, locationId as string) : sql`1=1`,
          category ? eq(products.category, category as string) : sql`1=1`
        )
      )
      .orderBy(asc(products.stockLevel), desc(products.updatedAt));

    // Get overstock items (if capacity is defined)
    const overstockItems = await db
      .select({
        locationId: locations.id,
        locationName: locations.name,
        capacity: locations.capacity,
        currentCount: sql<number>`count(${products.id})`.as('current_count'),
        utilizationRate: sql<number>`(count(${products.id})::float / ${locations.capacity} * 100)`.as('utilization_rate'),
        excessItems: sql<number>`greatest(0, count(${products.id}) - ${locations.capacity})`.as('excess_items'),
      })
      .from(locations)
      .leftJoin(products, eq(products.locationId, locations.id))
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(kanbans.type, 'receive'),
          eq(products.columnStatus, 'Stored'),
          isNotNull(locations.capacity)
        )
      )
      .groupBy(locations.id, locations.name, locations.capacity)
      .having(sql`count(${products.id}) > ${locations.capacity}`)
      .orderBy(desc(sql`utilization_rate`));

    // Get stale inventory (items not moved in 90+ days)
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 90);

    const staleItems = await db
      .select({
        productId: products.id,
        sku: products.sku,
        productName: products.productDetails,
        category: products.category,
        currentStock: products.stockLevel,
        locationName: locations.name,
        lastMovement: products.updatedAt,
        daysStale: sql<number>`extract(days from now() - ${products.updatedAt})`.as('days_stale'),
      })
      .from(products)
      .leftJoin(locations, eq(products.locationId, locations.id))
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(
        and(
          eq(kanbans.type, 'receive'),
          eq(products.columnStatus, 'Stored'),
          lte(products.updatedAt, staleDate),
          locationId ? eq(products.locationId, locationId as string) : sql`1=1`
        )
      )
      .orderBy(asc(products.updatedAt));

    const alertSummary = {
      lowStock: {
        critical: lowStockItems.filter(item => item.alertLevel === 'critical').length,
        high: lowStockItems.filter(item => item.alertLevel === 'high').length,
        medium: lowStockItems.filter(item => item.alertLevel === 'medium').length,
        low: lowStockItems.filter(item => item.alertLevel === 'low').length,
      },
      overstock: overstockItems.length,
      staleInventory: staleItems.length,
      totalAlerts: lowStockItems.length + overstockItems.length + staleItems.length,
    };

    res.json({
      summary: alertSummary,
      alerts: {
        lowStock: severity ? lowStockItems.filter(item => item.alertLevel === severity) : lowStockItems,
        overstock: overstockItems,
        staleInventory: staleItems,
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/analytics/location-utilization - Location capacity analysis
router.get('/location-utilization', async (req, res, next) => {
  try {
    const { area, building } = req.query;

    let whereConditions: SQL<unknown>[] = [
      eq(kanbans.type, 'receive'),
      isNotNull(locations.capacity)
    ];

    if (area && typeof area === 'string') {
      whereConditions.push(eq(locations.area, area));
    }

    if (building && typeof building === 'string') {
      whereConditions.push(eq(locations.building, building));
    }

    const utilizationData = await db
      .select({
        locationId: locations.id,
        locationName: locations.name,
        locationCode: locations.code,
        area: locations.area,
        building: locations.building,
        capacity: locations.capacity,
        currentCount: sql<number>`count(${products.id})`.as('current_count'),
        storedCount: sql<number>`count(case when ${products.columnStatus} = 'Stored' then 1 end)`.as('stored_count'),
        receivedCount: sql<number>`count(case when ${products.columnStatus} = 'Received' then 1 end)`.as('received_count'),
        utilizationRate: sql<number>`(count(${products.id})::float / ${locations.capacity} * 100)`.as('utilization_rate'),
        availableCapacity: sql<number>`greatest(0, ${locations.capacity} - count(${products.id}))`.as('available_capacity'),
        status: sql<string>`case 
          when count(${products.id}) >= ${locations.capacity} then 'full'
          when count(${products.id})::float / ${locations.capacity} >= 0.8 then 'high'
          when count(${products.id})::float / ${locations.capacity} >= 0.5 then 'medium'
          else 'low'
        end`.as('status'),
        totalValue: sql<number>`coalesce(sum(${products.stockLevel} * ${products.unitPrice}), 0)`.as('total_value'),
        lastActivity: sql<Date>`max(${products.updatedAt})`.as('last_activity'),
      })
      .from(locations)
      .leftJoin(products, eq(products.locationId, locations.id))
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(and(...whereConditions))
      .groupBy(
        locations.id,
        locations.name,
        locations.code,
        locations.area,
        locations.building,
        locations.capacity
      )
      .orderBy(desc(sql`utilization_rate`));

    // Calculate summary statistics
    const summary = {
      totalLocations: utilizationData.length,
      totalCapacity: utilizationData.reduce((sum, loc) => sum + Number(loc.capacity), 0),
      totalUsed: utilizationData.reduce((sum, loc) => sum + Number(loc.currentCount), 0),
      averageUtilization: utilizationData.reduce((sum, loc) => sum + Number(loc.utilizationRate), 0) / utilizationData.length,
      statusBreakdown: {
        full: utilizationData.filter(loc => loc.status === 'full').length,
        high: utilizationData.filter(loc => loc.status === 'high').length,
        medium: utilizationData.filter(loc => loc.status === 'medium').length,
        low: utilizationData.filter(loc => loc.status === 'low').length,
      }
    };

    res.json({
      locations: utilizationData,
      summary
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/inventory/analytics/stock-snapshot - Create stock snapshot
router.post('/stock-snapshot', async (req, res, next) => {
  try {
    const { snapshotType = 'manual', locationIds } = req.body;
    const movedBy = (req as any).user?.email || (req as any).user?.username || 'system';

    let whereConditions: SQL<unknown>[] = [
      eq(kanbans.type, 'receive'),
      eq(products.columnStatus, 'Stored')
    ];

    if (locationIds && Array.isArray(locationIds)) {
      whereConditions.push(inArray(products.locationId, locationIds));
    }

    // Get current stock levels
    const currentStock = await db
      .select({
        productId: products.id,
        locationId: products.locationId,
        sku: products.sku,
        stockLevel: products.stockLevel,
        columnStatus: products.columnStatus,
      })
      .from(products)
      .leftJoin(kanbans, eq(products.kanbanId, kanbans.id))
      .where(and(...whereConditions));

    // Create snapshots
    const snapshots = currentStock.map(item => ({
      productId: item.productId,
      locationId: item.locationId,
      sku: item.sku,
      stockLevel: item.stockLevel || 0,
      columnStatus: item.columnStatus,
      snapshotType,
    }));

    const createdSnapshots = await db
      .insert(stockSnapshots)
      .values(snapshots)
      .returning();

    res.status(201).json({
      message: 'Stock snapshot created successfully',
      snapshotCount: createdSnapshots.length,
      snapshotType,
      createdAt: new Date(),
      createdBy: movedBy
    });
  } catch (error) {
    next(error);
  }
});

export { router as stockAnalyticsRouter };
