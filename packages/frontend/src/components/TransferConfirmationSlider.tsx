import { useState } from 'react';
import { Slider } from './Slider';
import { Product, LinkedReceiveKanban } from '@invenflow/shared';
import { MapPinIcon, BuildingOfficeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface TransferConfirmationSliderProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  linkedKanbans: LinkedReceiveKanban[];
  onConfirm: (targetKanbanId: string) => Promise<void>;
}

export function TransferConfirmationSlider({
  isOpen,
  onClose,
  product,
  linkedKanbans,
  onConfirm,
}: TransferConfirmationSliderProps) {
  const [selectedKanbanId, setSelectedKanbanId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const handleConfirm = async () => {
    if (!selectedKanbanId) return;

    setIsTransferring(true);
    try {
      await onConfirm(selectedKanbanId);
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleClose = () => {
    if (!isTransferring) {
      setSelectedKanbanId(null);
      onClose();
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        disabled={isTransferring}
        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={!selectedKanbanId || isTransferring}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
      </button>
    </div>
  );

  return (
    <Slider
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Destination Receive Kanban"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Product Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Transferring Product:</h3>
          <p className="text-blue-800">{product.productDetails}</p>
          {product.sku && (
            <p className="text-sm text-blue-600 mt-1">SKU: {product.sku}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600">
          <p>Select the receive kanban where this product should be transferred.</p>
          <p className="mt-1">The product will be moved to the <span className="font-medium">Purchased</span> column with the location automatically assigned.</p>
        </div>

        {/* Kanban Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Available Receive Kanbans ({linkedKanbans.length}/5)
          </h4>

          {linkedKanbans.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
              <p className="text-yellow-800 font-medium">No Linked Kanbans</p>
              <p className="text-yellow-600 text-sm mt-1">
                Please link this order kanban to at least one receive kanban in settings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedKanbans.map((kanban) => (
                <button
                  key={kanban.id}
                  onClick={() => setSelectedKanbanId(kanban.id)}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                    selectedKanbanId === kanban.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{kanban.name}</h5>
                        {selectedKanbanId === kanban.id && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      {/* Location Information */}
                      {kanban.locationName ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPinIcon className="w-4 h-4" />
                            <span className="font-medium">
                              {kanban.locationName}
                              {kanban.locationArea && ` - ${kanban.locationArea}`}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 ml-6 space-y-0.5">
                            {kanban.locationBuilding && (
                              <div className="flex items-center gap-1">
                                <BuildingOfficeIcon className="w-3 h-3" />
                                {kanban.locationBuilding}
                                {kanban.locationFloor && `, Floor ${kanban.locationFloor}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4" />
                          <span>No location assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Slider>
  );
}

