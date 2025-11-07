import { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { BulkMovementWithDetails, InventoryItem } from '@invenflow/shared';
import { useBulkMovementStore } from '../store/bulkMovementStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { nanoid } from 'nanoid';

interface BulkMovementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkMovement: BulkMovementWithDetails;
}

interface SelectedProduct {
  id: string;
  productId: string;
  productDetails: string;
  sku: string | null;
  quantity: number;
  availableStock: number;
}

export function BulkMovementEditModal({ isOpen, onClose, bulkMovement }: BulkMovementEditModalProps) {
  const { updateBulkMovement, loading } = useBulkMovementStore();
  const { items: inventoryItems, fetchInventory } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();

  // State
  const [toLocationId, setToLocationId] = useState<string>(bulkMovement.toLocationId);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState<string>(bulkMovement.notes || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchLocations();
      
      // Initialize selected products from bulk movement items
      const initialProducts = bulkMovement.items.map(item => ({
        id: nanoid(),
        productId: item.productId,
        productDetails: item.productDetails,
        sku: item.sku,
        quantity: item.quantitySent,
        availableStock: item.quantitySent, // Placeholder, will be updated
      }));
      setSelectedProducts(initialProducts);
    }
  }, [isOpen, fetchInventory, fetchLocations, bulkMovement]);

  // Filter products
  const storedProducts = inventoryItems.filter(item => item.columnStatus === 'Stored');
  const availableProducts = storedProducts.filter(item =>
    item.locationId === bulkMovement.fromLocationId
  );
  const filteredProducts = availableProducts.filter(item =>
    !selectedProducts.some(sp => sp.productId === item.id) &&
    (item.productDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculations
  const totalItems = selectedProducts.length;
  const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);

  // Handlers
  const addProduct = (product: InventoryItem) => {
    setSelectedProducts([...selectedProducts, {
      id: nanoid(),
      productId: product.id,
      productDetails: product.productDetails,
      sku: product.sku,
      quantity: 1,
      availableStock: product.stockLevel || 0,
    }]);
    setSearchQuery('');
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(item =>
      item.id === id ? { ...item, quantity: Math.min(Math.max(1, quantity), item.availableStock) } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!toLocationId || selectedProducts.length === 0) {
      alert('Please select destination location and at least one product');
      return;
    }

    if (toLocationId === bulkMovement.fromLocationId) {
      alert('Destination location cannot be the same as source location');
      return;
    }

    try {
      await updateBulkMovement(bulkMovement.id, {
        toLocationId,
        items: selectedProducts.map(item => ({
          productId: item.productId,
          quantitySent: item.quantity,
        })),
        notes: notes || null,
      });

      // Reset and close
      onClose();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleReset = () => {
    onClose();
  };

  if (!isOpen) return null;

  

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={handleReset}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-2xl transform transition-transform">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="p-2 bg-indigo-600 rounded-lg mr-3">
                      <TruckIcon className="w-6 h-6 text-white" />
                    </div>
                    Edit Bulk Movement
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    Editing {totalItems} products ({totalQuantity} units)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                
                {/* FROM LOCATION (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Location (Read-only)
                  </label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {bulkMovement.fromLocation.name} - {bulkMovement.fromLocation.area}
                  </div>
                </div>

                {/* TO LOCATION */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Location *
                  </label>
                  <select
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select destination location</option>
                    {locations
                      .filter(loc => loc.id !== bulkMovement.fromLocationId && loc.isActive)
                      .map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.area}
                        </option>
                      ))}
                  </select>
                </div>

                {/* SELECT PRODUCTS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Products *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products by name or SKU..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {searchQuery && filteredProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{product.productDetails}</div>
                              {product.sku && (
                                <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Stock: {product.stockLevel || 0}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SELECTED PRODUCTS */}
                {selectedProducts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Products ({selectedProducts.length})
                    </label>
                    <div className="space-y-2">
                      {selectedProducts.map(item => (
                        <div key={item.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productDetails}</div>
                            {item.sku && (
                              <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                            <button
                              type="button"
                              onClick={() => removeProduct(item.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
                      <div className="text-sm font-medium text-indigo-900">
                        Total: {totalItems} product{totalItems > 1 ? 's' : ''} • {totalQuantity} unit{totalQuantity > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTES */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or special instructions..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    maxLength={1000}
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {notes.length}/1000 characters
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !toLocationId || selectedProducts.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Bulk Movement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

