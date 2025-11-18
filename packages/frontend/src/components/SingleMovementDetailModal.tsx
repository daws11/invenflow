import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { EnrichedMovementLog } from '../store/movementStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  movement: EnrichedMovementLog | null;
}

export default function SingleMovementDetailModal({ isOpen, onClose, movement }: Props) {
  if (!isOpen || !movement) return null;

  const statusBadge = (() => {
    switch (movement.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'received':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in_transit':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-2xl">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Sticky Header */}
            <div className="sticky top-0 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Movement Details</h2>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${statusBadge}`}>
                      {movement.status}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(movement.createdAt as any).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* From / To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">From Location</h4>
                  <p className="mt-1 text-lg font-semibold">{movement.fromLocation?.name || movement.fromPerson?.name || '-'}</p>
                  <p className="text-sm text-gray-600">{movement.fromLocation?.area || ''}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">To {movement.toPerson ? 'Person' : 'Location'}</h4>
                  <p className="mt-1 text-lg font-semibold">{movement.toLocation?.name || movement.toPerson?.name || '-'}</p>
                  <p className="text-sm text-gray-600">{movement.toLocation?.area || ''}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created</h4>
                  <p className="mt-1">{new Date(movement.createdAt as any).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">By: {movement.movedBy || 'System'}</p>
                </div>
                {movement.confirmedAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Confirmed</h4>
                    <p className="mt-1">{new Date(movement.confirmedAt as any).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">By: {movement.confirmedBy || '-'}</p>
                  </div>
                )}
              </div>

              {/* Public Link (if pending) */}
              {movement.status !== 'received' && movement.publicToken && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900">Public Confirmation Link</h4>
                      <p className="mt-1 text-sm font-mono text-blue-700 break-all">
                        {`${window.location.origin}/movement/confirm/${movement.publicToken}`}
                      </p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/movement/confirm/${movement.publicToken}`)}
                      className="ml-4 p-2 text-blue-600 hover:text-blue-700"
                      title="Copy Link"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table (single item) */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Items (1)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sent</th>
                        {movement.status === 'received' && (
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {movement.product?.productDetails || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {movement.product?.sku || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {movement.quantityMoved}
                        </td>
                        {movement.status === 'received' && (
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {movement.quantityMoved}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {movement.notes && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Notes</h4>
                  <p className="text-sm font-mono text-blue-800 whitespace-pre-line break-words">{movement.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="ml-3 rounded-full px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

