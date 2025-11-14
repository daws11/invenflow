import { Kanban, Product } from '@invenflow/shared';

/**
 * Extended Kanban type that may include products array and various productCount fields
 * from different API responses or legacy formats
 */
export type KanbanWithProducts = Kanban & {
  products?: Product[];
  productCount?: number;
  product_count?: number; // snake_case fallback
  productcount?: number;  // lowercase fallback
};

/**
 * Centralized utility to get the accurate product count for a kanban
 * Handles various fallback scenarios and ensures consistent behavior across components
 *
 * Priority order:
 * 1. API-provided productCount (camelCase - preferred)
 * 2. API-provided product_count (snake_case - legacy)
 * 3. API-provided productcount (lowercase - legacy)
 * 4. Length of products array if available
 * 5. Default to 0
 */
export function getProductCount(kanban: KanbanWithProducts | null | undefined): number {
  if (!kanban) {
    return 0;
  }

  // Priority 1: Check for camelCase productCount (preferred API format)
  if (typeof kanban.productCount === 'number' && kanban.productCount >= 0) {
    return kanban.productCount;
  }

  // Priority 2: Check for snake_case product_count (legacy API format)
  if (typeof (kanban as any).product_count === 'number' && (kanban as any).product_count >= 0) {
    return (kanban as any).product_count;
  }

  // Priority 3: Check for lowercase productcount (legacy API format)
  if (typeof (kanban as any).productcount === 'number' && (kanban as any).productcount >= 0) {
    return (kanban as any).productcount;
  }

  // Priority 4: Fallback to products array length if available
  if (Array.isArray(kanban.products)) {
    return kanban.products.length;
  }

  // Priority 5: Default to 0
  return 0;
}


/**
 * Get product count for a specific column/status within a kanban
 */
export function getColumnProductCount(
  kanban: KanbanWithProducts | null | undefined,
  columnStatus: string
): number {
  if (!kanban || !Array.isArray(kanban.products)) {
    return 0;
  }
  return kanban.products.filter(p => p.columnStatus === columnStatus).length;
}

/**
 * Get formatted column product count text
 */
export function getColumnProductCountText(
  kanban: KanbanWithProducts | null | undefined,
  columnStatus: string
): string {
  const count = getColumnProductCount(kanban, columnStatus);
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}
