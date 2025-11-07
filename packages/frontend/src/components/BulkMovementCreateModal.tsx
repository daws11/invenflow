import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useLocationStore } from '../store/locationStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useBulkMovementStore } from '../store/bulkMovementStore';
import { generateWhatsAppMessage, openWhatsAppWithMessage, copyToClipboard, generateQRCodeUrl } from '../utils/bulkMovementHelpers';
import type { CreateBulkMovementItem, BulkMovementWithDetails } from '@invenflow/shared';

interface BulkMovementCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedItem extends CreateBulkMovementItem {
  productDetails: string;
  sku: string | null;
  availableStock: number;
}

export function BulkMovementCreateModal({ isOpen, onClose }: BulkMovementCreateModalProps) {
  const [step, setStep] = useState(1);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createdBulkMovement, setCreatedBulkMovement] = useState<(BulkMovementWithDetails & { publicUrl: string }) | null>(null);

  const { locations, fetchLocations } = useLocationStore();
  const { items: inventoryItems, fetchInventory } = useInventoryStore();
  const { createBulkMovement, loading } = useBulkMovementStore();

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen, fetchLocations]);

  useEffect(() => {
    if (fromLocationId) {
      // Fetch inventory items at selected location
      fetchInventory({ location: [fromLocationId], columnStatus: ['Stored'] });
    }
  }, [fromLocationId, fetchInventory]);

  const availableProducts = inventoryItems.filter(item => 
    item.locationId === fromLocationId && 
    item.columnStatus === 'Stored' &&
    (item.stockLevel || 0) > 0 &&
    !selectedItems.some(si => si.productId === item.id) &&
    (searchQuery === '' || 
      item.productDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleAddItem = (product: typeof inventoryItems[0]) => {
    setSelectedItems([...selectedItems, {
      productId: product.id,
      quantitySent: 1,
      productDetails: product.productDetails,
      sku: product.sku,
      availableStock: product.stockLevel || 0,
    }]);
    setSearchQuery('');
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.productId === productId ? { ...item, quantitySent: quantity } : item
    ));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (!fromLocationId || !toLocationId) {
      alert('Please select source and destination locations');
      return;
    }

    try {
      const result = await createBulkMovement({
        fromLocationId,
        toLocationId,
        items: selectedItems.map(({ productId, quantitySent }) => ({ productId, quantitySent })),
        notes: notes || null,
      });

      setCreatedBulkMovement(result);
      setStep(4); // Success step
    } catch (error) {
      console.error('Failed to create bulk movement:', error);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFromLocationId('');
    setToLocationId('');
    setSelectedItems([]);
    setNotes('');
    setSearchQuery('');
    setCreatedBulkMovement(null);
    onClose();
  };

  const handleCopyLink = async () => {
    if (createdBulkMovement) {
      const success = await copyToClipboard(createdBulkMovement.publicUrl);
      if (success) {
        alert('Link copied to clipboard!');
      }
    }
  };

  const handleWhatsAppShare = () => {
    if (createdBulkMovement) {
      const message = generateWhatsAppMessage(createdBulkMovement);
      openWhatsAppWithMessage(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Create Bulk Movement</h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            {/* Step indicator */}
            <div className="flex items-center mt-4 space-x-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`flex-1 h-2 rounded ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
            {/* Step 1: Select Source Location */}
            {step === 1 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Step 1: Select Source Location</h4>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source location...</option>
                  {locations.filter(loc => loc.isActive).map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} • {location.area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 2: Add Items */}
            {step === 2 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Step 2: Add Items</h4>
                
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Available Products */}
                {searchQuery && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleAddItem(product)}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{product.productDetails}</p>
                          <p className="text-sm text-gray-500">
                            {product.sku} • Stock: {product.stockLevel}
                          </p>
                        </div>
                        <PlusIcon className="w-5 h-5 text-blue-600" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Items */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-700">Selected Items ({selectedItems.length})</h5>
                  {selectedItems.map((item) => (
                    <div key={item.productId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productDetails}</p>
                        <p className="text-sm text-gray-500">{item.sku} • Available: {item.availableStock}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={item.availableStock}
                        value={item.quantitySent}
                        onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Total: {selectedItems.length} items, {selectedItems.reduce((sum, item) => sum + item.quantitySent, 0)} units
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Destination & Review */}
            {step === 3 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Step 3: Destination & Review</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination Location</label>
                  <select
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select destination...</option>
                    {locations.filter(loc => loc.isActive && loc.id !== fromLocationId).map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} • {location.area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Review Summary */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h5 className="font-semibold">Summary</h5>
                  <p className="text-sm"><strong>From:</strong> {locations.find(l => l.id === fromLocationId)?.name}</p>
                  <p className="text-sm"><strong>To:</strong> {locations.find(l => l.id === toLocationId)?.name}</p>
                  <p className="text-sm"><strong>Items:</strong> {selectedItems.length} ({selectedItems.reduce((sum, item) => sum + item.quantitySent, 0)} units)</p>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && createdBulkMovement && (
              <div className="space-y-4 text-center">
                <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto" />
                <h4 className="text-xl font-semibold text-green-900">Bulk Movement Created!</h4>
                <p className="text-gray-600">Share this link with the receiver to confirm delivery</p>
                
                <div className="p-4 bg-gray-50 rounded-lg break-all">
                  <p className="text-sm font-mono">{createdBulkMovement.publicUrl}</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <img 
                    src={generateQRCodeUrl(createdBulkMovement.publicUrl)} 
                    alt="QR Code" 
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                </div>

                <div className="flex space-x-2 justify-center">
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Share via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step < 4 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (step === 1 && !fromLocationId) {
                    alert('Please select a source location');
                    return;
                  }
                  if (step === 2 && selectedItems.length === 0) {
                    alert('Please add at least one item');
                    return;
                  }
                  if (step === 3) {
                    handleSubmit();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : step === 3 ? 'Create Bulk Movement' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

