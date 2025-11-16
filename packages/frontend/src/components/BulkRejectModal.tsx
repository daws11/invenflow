import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Product } from '@invenflow/shared';

interface BulkRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirm: (reason: string) => Promise<void>;
}

export function BulkRejectModal({
  isOpen,
  onClose,
  products,
  onConfirm,
}: BulkRejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(rejectionReason);
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error('Failed to reject products:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('');
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Reject Products
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> Rejected items will be moved to the rejected list
                and hidden from the normal kanban view. They can be restored later.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Products to reject ({products.length}):
              </h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <li key={product.id} className="px-3 py-2 text-sm text-gray-700">
                      {product.productDetails}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Rejection Reason (Optional)
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter reason for rejection..."
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                {rejectionReason.length}/500 characters
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Products'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

