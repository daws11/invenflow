import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Product } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';

interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  availableColumns: readonly string[];
  currentColumn: string;
  onConfirm: (targetColumn: string, locationId?: string) => Promise<void>;
}

export function BulkMoveModal({
  isOpen,
  onClose,
  products,
  availableColumns,
  currentColumn,
  onConfirm,
}: BulkMoveModalProps) {
  const [targetColumn, setTargetColumn] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locations } = useLocationStore();

  useEffect(() => {
    if (isOpen) {
      // Reset to first available column that's not the current one
      const otherColumns = availableColumns.filter(col => col !== currentColumn);
      if (otherColumns.length > 0) {
        setTargetColumn(otherColumns[0]);
      }
      setLocationId('');
    }
  }, [isOpen, availableColumns, currentColumn]);

  if (!isOpen) return null;

  const requiresLocation = targetColumn === 'Stored';

  const handleSubmit = async () => {
    if (!targetColumn) return;
    if (requiresLocation && !locationId) return;

    setIsSubmitting(true);
    try {
      await onConfirm(targetColumn, locationId || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to move products:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTargetColumn('');
      setLocationId('');
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
              <ArrowRightIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Move Products
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
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Moving {products.length} {products.length === 1 ? 'product' : 'products'}:
              </h4>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <li key={product.id} className="px-3 py-2 text-sm text-gray-700">
                      {product.productDetails}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Current column:</strong> {currentColumn}
              </p>
            </div>

            <div>
              <label
                htmlFor="target-column"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Target Column
              </label>
              <select
                id="target-column"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              >
                {availableColumns
                  .filter(col => col !== currentColumn)
                  .map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
              </select>
            </div>

            {requiresLocation && (
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="location"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select a location...</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} {location.code && `(${location.code})`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Location is required when moving to Stored
                </p>
              </div>
            )}
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
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !targetColumn || (requiresLocation && !locationId)}
            >
              {isSubmitting ? 'Moving...' : 'Move Products'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

