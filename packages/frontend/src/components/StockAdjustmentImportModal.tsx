import { XMarkIcon } from '@heroicons/react/24/outline';
import { StockAdjustmentImport } from './StockAdjustmentImport';

interface StockAdjustmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockAdjustmentImportModal({ isOpen, onClose, onSuccess }: StockAdjustmentImportModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-3xl transform transition-transform">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Import Stock (Stored)</h2>
                  <p className="text-sm text-gray-600 mt-1">Use CSV template to migrate/update stored items with movement tracking.</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label="Close import"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <StockAdjustmentImport onSuccess={onSuccess} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


