import { InventoryItem } from '@invenflow/shared';

export type ProductStatus = 'incoming' | 'received' | 'stored' | 'used';

/**
 * Calculate the current status of a product based on its column status and assignment
 * 
 * Status Rules:
 * - Incoming: columnStatus = 'Purchased'
 * - Received: columnStatus = 'Received'
 * - Stored: columnStatus = 'Stored' AND not assigned to person
 * - Used: columnStatus = 'Stored' AND assigned to person
 */
export function calculateProductStatus(product: {
  columnStatus: string;
  assignedToPersonId?: string | null;
}): ProductStatus {
  if (product.columnStatus === 'Purchased') {
    return 'incoming';
  }
  
  if (product.columnStatus === 'Received') {
    return 'received';
  }
  
  if (product.columnStatus === 'Stored') {
    return product.assignedToPersonId ? 'used' : 'stored';
  }
  
  // Default fallback
  return 'stored';
}

/**
 * Get a human-readable label for a product status
 */
export function getStatusLabel(status: ProductStatus): string {
  const labels: Record<ProductStatus, string> = {
    incoming: 'Incoming',
    received: 'Received',
    stored: 'Stored',
    used: 'Used',
  };
  
  return labels[status];
}

/**
 * Get the color theme for a product status badge
 */
export function getStatusColor(status: ProductStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<ProductStatus, { bg: string; text: string; border: string }> = {
    incoming: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    },
    received: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
    },
    stored: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    },
    used: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
    },
  };
  
  return colors[status];
}

/**
 * Get the icon for a product status
 */
export function getStatusIcon(status: ProductStatus): string {
  const icons: Record<ProductStatus, string> = {
    incoming: '🔄',
    received: '📦',
    stored: '🏢',
    used: '👤',
  };
  
  return icons[status];
}

/**
 * Filter products by status
 */
export function filterProductsByStatus(
  items: InventoryItem[],
  status: ProductStatus | 'all' | 'available'
): InventoryItem[] {
  if (status === 'all') {
    return items;
  }
  
  if (status === 'available') {
    // Available = Stored and not assigned
    return items.filter(
      item => item.columnStatus === 'Stored' && !item.assignedToPersonId
    );
  }
  
  return items.filter(item => calculateProductStatus(item) === status);
}

