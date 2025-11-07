import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { BulkMovementWithDetails } from '@invenflow/shared';
import {
  getBulkMovementStatusColor,
  getBulkMovementStatusLabel,
  formatBulkMovementDate,
  generatePublicUrl,
  copyToClipboard,
} from '../utils/bulkMovementHelpers';

interface BulkMovementDetailModalProps {
  isOpen: boolean;
  bulkMovement: BulkMovementWithDetails;
  onClose: () => void;
}

export function BulkMovementDetailModal({ isOpen, bulkMovement, onClose }: BulkMovementDetailModalProps) {
  if (!isOpen) return null;

  const statusColors = getBulkMovementStatusColor(bulkMovement.status);
  const publicUrl = generatePublicUrl(bulkMovement.publicToken);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(publicUrl);
    if (success) {
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-3xl">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Sticky Header */}
            <div className="sticky top-0 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Bulk Movement Details</h2>
                  <span className={`inline-flex mt-2 px-3 py-1 text-sm font-semibold rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {getBulkMovementStatusLabel(bulkMovement.status)}
                  </span>
                </div>
                <button onClick={onClose} className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Movement Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">From Location</h4>
                <p className="mt-1 text-lg font-semibold">{bulkMovement.fromLocation.name}</p>
                <p className="text-sm text-gray-600">{bulkMovement.fromLocation.area}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">To Location</h4>
                <p className="mt-1 text-lg font-semibold">{bulkMovement.toLocation.name}</p>
                <p className="text-sm text-gray-600">{bulkMovement.toLocation.area}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Created</h4>
                <p className="mt-1">{formatBulkMovementDate(bulkMovement.createdAt)}</p>
                <p className="text-sm text-gray-600">By: {bulkMovement.createdBy}</p>
              </div>
              {bulkMovement.confirmedAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Confirmed</h4>
                  <p className="mt-1">{formatBulkMovementDate(bulkMovement.confirmedAt)}</p>
                  <p className="text-sm text-gray-600">By: {bulkMovement.confirmedBy}</p>
                </div>
              )}
            </div>

            {/* Public Link */}
            {bulkMovement.status !== 'received' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900">Public Confirmation Link</h4>
                    <p className="mt-1 text-sm font-mono text-blue-700 break-all">{publicUrl}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="ml-4 p-2 text-blue-600 hover:text-blue-700"
                    title="Copy Link"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h4 className="text-lg font-semibold mb-3">Items ({bulkMovement.items.length})</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sent</th>
                      {bulkMovement.status === 'received' && (
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkMovement.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productDetails}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{item.quantitySent}</td>
                        {bulkMovement.status === 'received' && (
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {item.quantityReceived ?? 0}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {bulkMovement.items.reduce((sum, item) => sum + item.quantitySent, 0)}
                      </td>
                      {bulkMovement.status === 'received' && (
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                          {bulkMovement.items.reduce((sum, item) => sum + (item.quantityReceived ?? 0), 0)}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {bulkMovement.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{bulkMovement.notes}</p>
              </div>
            )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

