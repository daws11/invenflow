import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import type { InventoryItem } from '@invenflow/shared';
import { useMovementStore } from '../store/movementStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: InventoryItem;
  onSuccess?: () => void;
}

export function MovementModal({ isOpen, onClose, preselectedProduct, onSuccess }: MovementModalProps) {
  const { createMovement, loading } = useMovementStore();
  const { items: inventoryItems, fetchInventory } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();

  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProduct?.id || '');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [toStockLevel, setToStockLevel] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchLocations();
    }
  }, [isOpen, fetchInventory, fetchLocations]);

  // Set preselected product data
  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
      setToStockLevel(preselectedProduct.stockLevel || 0);
    }
  }, [preselectedProduct]);

  // Filter stored products only
  const storedProducts = inventoryItems.filter(item => item.columnStatus === 'Stored');
  
  // Filter products based on search
  const filteredProducts = storedProducts.filter(item =>
    item.productDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProduct = storedProducts.find(item => item.id === selectedProductId);
  const currentLocation = selectedProduct?.locationId 
    ? locations.find(loc => loc.id === selectedProduct.locationId)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId || !toLocationId || toStockLevel < 0) {
      return;
    }

    try {
      await createMovement({
        productId: selectedProductId,
        toLocationId,
        toStockLevel,
        notes: notes || null,
      });

      // Reset form
      setSelectedProductId('');
      setToLocationId('');
      setToStockLevel(0);
      setNotes('');
      setSearchQuery('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = storedProducts.find(item => item.id === productId);
    if (product) {
      setToStockLevel(product.stockLevel || 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <ArrowsRightLeftIcon className="w-6 h-6 mr-2 text-blue-600" />
                  Move Product
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">Transfer to a location or assign to a person</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* Product Selection */}
              {!preselectedProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a product...</option>
                    {filteredProducts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productDetails}
                        {item.sku && ` (${item.sku})`}
                        {' - Stock: '}
                        {item.stockLevel || 0}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Product Info (for preselected) */}
              {preselectedProduct && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Product:</p>
                  <p className="text-sm text-gray-900">{preselectedProduct.productDetails}</p>
                  {preselectedProduct.sku && (
                    <p className="text-xs text-gray-500">SKU: {preselectedProduct.sku}</p>
                  )}
                </div>
              )}

              {/* Current Location Display */}
              {selectedProduct && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Location:</p>
                  {currentLocation ? (
                    <div className="flex items-center space-x-2">
                      {currentLocation.type === 'person' ? (
                        <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{currentLocation.name}</p>
                        <p className="text-xs text-gray-500">
                          {currentLocation.area} • {currentLocation.code}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                          currentLocation.type === 'person' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentLocation.type === 'person' ? 'Assigned to Person' : 'Physical Location'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Stock: <span className="font-medium">{selectedProduct.stockLevel || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No location assigned</p>
                  )}
                </div>
              )}

              {/* Arrow Indicator */}
              {selectedProduct && (
                <div className="flex justify-center">
                  <ArrowRightIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}

              {/* Target Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    Move To <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  required
                  disabled={!selectedProductId}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <option value="">🎯 Select destination...</option>
                  
                  {/* Physical Locations */}
                  {locations.some(loc => loc.type === 'physical' && loc.id !== selectedProduct?.locationId) && (
                    <optgroup label="━━━ 📦 PHYSICAL LOCATIONS ━━━">
                      {locations
                        .filter(loc => loc.type === 'physical' && loc.id !== selectedProduct?.locationId)
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            📍 {location.name} • {location.area}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {/* Person Assignments */}
                  {locations.some(loc => loc.type === 'person' && loc.id !== selectedProduct?.locationId) && (
                    <optgroup label="━━━ 👤 ASSIGN TO PERSON ━━━">
                      {locations
                        .filter(loc => loc.type === 'person' && loc.id !== selectedProduct?.locationId)
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            👤 {location.name} • {location.area}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                
                {/* Info based on selected location type */}
                {toLocationId && (() => {
                  const selectedLoc = locations.find(loc => loc.id === toLocationId);
                  return selectedLoc ? (
                    <div className={`mt-2 p-3 rounded-lg border ${
                      selectedLoc.type === 'person' 
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start">
                        {selectedLoc.type === 'person' ? (
                          <svg className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        )}
                        <div className="text-xs">
                          <p className={`font-semibold ${
                            selectedLoc.type === 'person' ? 'text-purple-900' : 'text-blue-900'
                          }`}>
                            {selectedLoc.type === 'person' 
                              ? '✓ Asset will be assigned to:' 
                              : '✓ Asset will be moved to:'}
                          </p>
                          <p className="text-gray-700 mt-1">
                            <span className="font-medium">{selectedLoc.name}</span>
                            {selectedLoc.type === 'person' && (
                              <span className="text-purple-600"> ({selectedLoc.area})</span>
                            )}
                          </p>
                          {selectedLoc.type === 'person' && (
                            <p className="text-purple-700 mt-1.5 italic">
                              💡 This person will be responsible for the asset
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* New Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Stock Level <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={toStockLevel}
                  onChange={(e) => setToStockLevel(parseInt(e.target.value) || 0)}
                  required
                  disabled={!selectedProductId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter new stock level"
                />
                {selectedProduct && toStockLevel !== selectedProduct.stockLevel && (
                  <p className="mt-1 text-xs text-gray-500">
                    Change: {toStockLevel > (selectedProduct.stockLevel || 0) ? '+' : ''}
                    {toStockLevel - (selectedProduct.stockLevel || 0)}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this movement..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedProductId || !toLocationId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Moving...' : 'Move Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

