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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background overlay with animation */}
      <div 
        className={`fixed inset-0 bg-gray-900 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel from right */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div 
          className={`w-screen max-w-2xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="p-2 bg-blue-600 rounded-lg mr-3">
                      <ArrowsRightLeftIcon className="w-6 h-6 text-white" />
                    </div>
                    Move Product
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    Transfer assets to physical locations or assign to people
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form - Scrollable content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
              {/* Product Selection */}
              {!preselectedProduct && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Select Product <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="🔍 Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 mb-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
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
                  {filteredProducts.length === 0 && searchQuery && (
                    <p className="mt-2 text-xs text-gray-500 italic">No products found matching "{searchQuery}"</p>
                  )}
                </div>
              )}

              {/* Current Product Info (for preselected) */}
              {preselectedProduct && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Selected Product</p>
                      <p className="text-sm font-bold text-gray-900">{preselectedProduct.productDetails}</p>
                      {preselectedProduct.sku && (
                        <p className="text-xs text-gray-600 mt-1">SKU: {preselectedProduct.sku}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Location Display */}
              {selectedProduct && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-900">Current Location</p>
                  </div>
                  {currentLocation ? (
                    <div className={`p-3 rounded-lg border-l-4 ${
                      currentLocation.type === 'person' 
                        ? 'bg-purple-50 border-purple-500' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {currentLocation.type === 'person' ? (
                          <svg className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className="text-base font-bold text-gray-900">{currentLocation.name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {currentLocation.area} • {currentLocation.code}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              currentLocation.type === 'person' 
                                ? 'bg-purple-200 text-purple-800' 
                                : 'bg-blue-200 text-blue-800'
                            }`}>
                              {currentLocation.type === 'person' ? '👤 Person' : '📍 Physical'}
                            </span>
                            <div className="text-xs">
                              <span className="text-gray-500">Current Stock:</span>
                              <span className="ml-1 font-bold text-gray-900 text-base">{selectedProduct.stockLevel || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">No location assigned</p>
                  )}
                </div>
              )}

              {/* Arrow Indicator */}
              {selectedProduct && (
                <div className="flex justify-center py-2">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <ArrowRightIcon className="w-6 h-6 text-gray-500 transform rotate-90" />
                  </div>
                </div>
              )}

              {/* Target Location */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    Move To Destination <span className="text-red-500 ml-1">*</span>
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
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    New Stock Level <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={toStockLevel}
                  onChange={(e) => setToStockLevel(parseInt(e.target.value) || 0)}
                  required
                  disabled={!selectedProductId}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-lg font-semibold"
                  placeholder="Enter new stock level"
                />
                {selectedProduct && toStockLevel !== selectedProduct.stockLevel && (
                  <div className={`mt-2 p-2 rounded-lg flex items-center text-sm ${
                    toStockLevel > (selectedProduct.stockLevel || 0) 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {toStockLevel > (selectedProduct.stockLevel || 0) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      )}
                    </svg>
                    <span className="font-semibold">
                      Change: {toStockLevel > (selectedProduct.stockLevel || 0) ? '+' : ''}
                      {toStockLevel - (selectedProduct.stockLevel || 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Notes <span className="text-gray-400 text-xs">(Optional)</span>
                  </span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Add any notes about this movement (reason, special instructions, etc.)..."
                />
                <p className="mt-2 text-xs text-gray-500">{notes.length}/1000 characters</p>
              </div>
              </div>
            </form>

            {/* Footer - Sticky at bottom */}
            <div className="sticky bottom-0 z-10 px-6 py-4 bg-gray-50 border-t border-gray-200 shadow-lg">
              <div className="flex items-center justify-between space-x-3">
                <p className="text-xs text-gray-500 flex-1">
                  {selectedProduct && toLocationId ? (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Ready to move
                    </span>
                  ) : (
                    '* Required fields must be filled'
                  )}
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={loading || !selectedProductId || !toLocationId}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Moving...
                      </>
                    ) : (
                      <>
                        <ArrowsRightLeftIcon className="w-4 h-4 mr-2" />
                        Move Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

