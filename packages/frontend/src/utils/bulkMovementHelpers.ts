import type { BulkMovementStatus, BulkMovementWithDetails } from '@invenflow/shared';

/**
 * Generate full public URL for bulk movement confirmation
 */
export function generatePublicUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/bulk-movement/confirm/${token}`;
}

/**
 * Generate WhatsApp message with bulk movement link
 */
export function generateWhatsAppMessage(bulkMovement: BulkMovementWithDetails & { publicUrl: string }): string {
  const message = `
🚚 *Bulk Movement Notification*

*From:* ${bulkMovement.fromLocation.name} (${bulkMovement.fromLocation.area})
*To:* ${bulkMovement.toLocation.name} (${bulkMovement.toLocation.area})

*Items:* ${bulkMovement.items.length} product(s)
*Total Quantity:* ${bulkMovement.items.reduce((sum, item) => sum + item.quantitySent, 0)} unit(s)

${bulkMovement.notes ? `*Notes:* ${bulkMovement.notes}\n\n` : ''}
Please confirm receipt using this link:
${bulkMovement.publicUrl}

*Link expires in 24 hours*
`.trim();

  return encodeURIComponent(message);
}

/**
 * Open WhatsApp with pre-filled message
 */
export function openWhatsAppWithMessage(message: string): void {
  const url = `https://wa.me/?text=${message}`;
  window.open(url, '_blank');
}

/**
 * Get status color classes for badges
 */
export function getBulkMovementStatusColor(status: BulkMovementStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<BulkMovementStatus, { bg: string; text: string; border: string }> = {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    },
    in_transit: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
    },
    received: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    },
    expired: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    },
  };

  return colors[status];
}

/**
 * Get status label
 */
export function getBulkMovementStatusLabel(status: BulkMovementStatus): string {
  const labels: Record<BulkMovementStatus, string> = {
    pending: 'Pending',
    in_transit: 'In Transit',
    received: 'Received',
    expired: 'Expired',
  };

  return labels[status];
}

/**
 * Check if bulk movement token is expired
 */
export function isBulkMovementExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Check if bulk movement can be cancelled
 */
export function canCancelBulkMovement(status: BulkMovementStatus): boolean {
  return status === 'pending';
}

/**
 * Format time remaining until expiry
 */
export function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Generate QR code data URL (for future implementation)
 */
export function generateQRCodeUrl(url: string): string {
  // This can be implemented with a QR code library like qrcode.react or qrcode
  // For now, return placeholder
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

/**
 * Format date for display
 */
export function formatBulkMovementDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

