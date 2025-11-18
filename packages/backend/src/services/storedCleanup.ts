import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db';
import { kanbans, products, storedLogs } from '../db/schema';
import { env } from '../config/env';

const MINUTE_TO_MS = 60 * 1000;

let sweepTimer: NodeJS.Timeout | null = null;
let isRunning = false;

interface ProductWithKanban {
  product: {
    id: string;
    kanbanId: string | null;
    productDetails: string;
    sku: string | null;
    stockLevel: number | null;
    unit: string | null;
    category: string | null;
    supplier: string | null;
    columnEnteredAt: Date;
    tags: unknown;
    notes: string | null;
    productImage: string | null;
    productLink: string | null;
  };
  kanban: {
    id: string;
    name: string;
    storedAutoArchiveAfterMinutes: number | null;
  };
}

const fetchCandidates = async (limit: number): Promise<ProductWithKanban[]> => {
  const rows = await db
    .select({
      product: {
        id: products.id,
        kanbanId: products.kanbanId,
        productDetails: products.productDetails,
        sku: products.sku,
        stockLevel: products.stockLevel,
        unit: products.unit,
        category: products.category,
        supplier: products.supplier,
        columnEnteredAt: products.columnEnteredAt,
        tags: products.tags,
        notes: products.notes,
        productImage: products.productImage,
        productLink: products.productLink,
      },
      kanban: {
        id: kanbans.id,
        name: kanbans.name,
        storedAutoArchiveAfterMinutes: kanbans.storedAutoArchiveAfterMinutes,
      },
    })
    .from(products)
    .innerJoin(kanbans, eq(products.kanbanId, kanbans.id))
    .leftJoin(storedLogs, eq(products.id, storedLogs.productId))
    .where(
      and(
        eq(kanbans.type, 'receive'),
        eq(kanbans.storedAutoArchiveEnabled, true),
        isNotNull(kanbans.storedAutoArchiveAfterMinutes),
        eq(products.columnStatus, 'Stored'),
        isNull(storedLogs.id), // Exclude products that have already been archived
      ),
    )
    .orderBy(asc(products.columnEnteredAt))
    .limit(limit * 4);

  const now = Date.now();

  return rows
    .filter(({ product, kanban }) => {
      if (!product.columnEnteredAt || !kanban.storedAutoArchiveAfterMinutes) return false;
      const thresholdMs = kanban.storedAutoArchiveAfterMinutes * MINUTE_TO_MS;
      return now - new Date(product.columnEnteredAt).getTime() >= thresholdMs;
    })
    .slice(0, limit);
};

const buildSnapshot = (product: ProductWithKanban['product']) => {
  try {
    return JSON.parse(JSON.stringify(product));
  } catch {
    return {
      id: product.id,
      productDetails: product.productDetails,
      sku: product.sku,
      stockLevel: product.stockLevel,
      unit: product.unit,
      category: product.category,
      supplier: product.supplier,
      notes: product.notes,
    };
  }
};

export const runStoredCleanupOnce = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const batchSize = env.STORED_SWEEP_BATCH_LIMIT;
    const candidates = await fetchCandidates(batchSize);

    if (candidates.length === 0) {
      return;
    }

    const productIds = candidates.map(({ product }) => product.id);

    await db.transaction(async (tx) => {
      await tx.insert(storedLogs).values(
        candidates.map(({ product, kanban }) => ({
          kanbanId: product.kanbanId!,
          productId: product.id,
          productDetails: product.productDetails,
          sku: product.sku,
          quantity: product.stockLevel,
          unit: product.unit,
          stockLevel: product.stockLevel,
          category: product.category,
          supplier: product.supplier,
          storedAt: product.columnEnteredAt.toISOString(),
          removalType: 'auto',
          removalReason: `Auto-archived after ${kanban.storedAutoArchiveAfterMinutes} minutes`,
          productSnapshot: buildSnapshot(product),
          metadata: {
            kanbanName: kanban.name,
            autoArchiveMinutes: kanban.storedAutoArchiveAfterMinutes,
            tags: product.tags,
            notes: product.notes,
            productImage: product.productImage,
            productLink: product.productLink,
          },
        })),
      );

      // Products remain in the inventory with 'Stored' status
      // No deletion - products stay visible in inventory manager
    });

    console.log(
      `[storedCleanup] Archived ${candidates.length} product(s) from Stored column.`,
    );
  } catch (error) {
    console.error('[storedCleanup] Failed to archive stored products:', error);
  } finally {
    isRunning = false;
  }
};

export const startStoredCleanup = () => {
  if (!env.STORED_SWEEP_ENABLED) {
    console.log('[storedCleanup] Sweep disabled via configuration.');
    return;
  }

  const intervalMs = env.STORED_SWEEP_INTERVAL_MINUTES * 60 * 1000;

  // Kick off immediately
  runStoredCleanupOnce().catch((error) =>
    console.error('[storedCleanup] Initial run failed:', error),
  );

  sweepTimer = setInterval(() => {
    runStoredCleanupOnce().catch((error) =>
      console.error('[storedCleanup] Scheduled run failed:', error),
    );
  }, intervalMs);

  if (typeof sweepTimer.unref === 'function') {
    sweepTimer.unref();
  }

  console.log(
    `[storedCleanup] Sweep scheduled every ${env.STORED_SWEEP_INTERVAL_MINUTES} minute(s) with batch size ${env.STORED_SWEEP_BATCH_LIMIT}.`,
  );
};

