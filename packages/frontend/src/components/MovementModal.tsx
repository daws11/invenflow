import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, TruckIcon, PlusIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon, ShareIcon } from '@heroicons/react/24/outline';
import type { InventoryItem } from '@invenflow/shared';
import { useMovementStore } from '../store/movementStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { bulkMovementApi } from '../utils/api';
import { nanoid } from 'nanoid';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: InventoryItem;
  onSuccess?: () => void;
}

interface BulkMovementResult {
  id: string;
  publicToken: string;
  publicUrl: string;
  totalItems: number;
  totalQuantity: number;
  fromLocationName: string;
  toLocationName: string;
}

interface SelectedProduct {
  id: string;
  productId: string;
  productDetails: string;
  sku: string | null;
  quantity: number;
  availableStock: number;
}

export function MovementModal({ isOpen, onClose, preselectedProduct, onSuccess }: MovementModalProps) {
  const { createMovement, loading } = useMovementStore();
  const { items: inventoryItems, fetchInventory } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const { fetchPersons } = usePersonStore();

  // State
  const [fromLocationId, setFromLocationId] = useState<string | null>(null);
  const [toLocationId, setToLocationId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkMovementResult, setBulkMovementResult] = useState<BulkMovementResult | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchLocations();
      fetchPersons({ activeOnly: true });
    }
  }, [isOpen, fetchInventory, fetchLocations, fetchPersons]);

  // Initialize from preselected product
  useEffect(() => {
    if (preselectedProduct && preselectedProduct.locationId && isOpen) {
      setFromLocationId(preselectedProduct.locationId);
      
      // Use functional update to avoid stale closure bug
      setSelectedProducts(prev => {
        // Check with actual prev state
        if (!prev.some(p => p.productId === preselectedProduct.id)) {
          return [{
            id: nanoid(),
            productId: preselectedProduct.id,
            productDetails: preselectedProduct.productDetails,
            sku: preselectedProduct.sku,
            quantity: 1,
            availableStock: preselectedProduct.stockLevel || 0,
          }];
        }
        return prev; // Return existing if already added
      });
    }
  }, [preselectedProduct, isOpen]);

  // Cleanup state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFromLocationId(null);
      setToLocationId(null);
      setSelectedProducts([]);
      setNotes('');
      setSearchQuery('');
      setBulkMovementResult(null);
      setLinkCopied(false);
    }
  }, [isOpen]);

  // Filter products
  const storedProducts = inventoryItems.filter(item => item.columnStatus === 'Stored');
  const availableProducts = fromLocationId 
    ? storedProducts.filter(item => item.locationId === fromLocationId)
    : [];
  const filteredProducts = availableProducts.filter(item =>
    !selectedProducts.some(sp => sp.productId === item.id) &&
    (item.productDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculations
  const totalItems = selectedProducts.length;
  const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const isBulkMovement = selectedProducts.length > 1;

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
    
    if (!fromLocationId || !toLocationId || selectedProducts.length === 0) {
      alert('Please select from location, to location, and at least one product');
      return;
    }

    try {
      if (isBulkMovement) {
        const result = await bulkMovementApi.create({
          fromLocationId,
          toLocationId,
          items: selectedProducts.map(item => ({
            productId: item.productId,
            quantitySent: item.quantity,
          })),
          notes: notes || null,
        });
        
        const publicUrl = `${window.location.origin}/bulk-movement/confirm/${result.publicToken}`;
        const fromLocation = locations.find(l => l.id === fromLocationId);
        const toLocation = locations.find(l => l.id === toLocationId);
        
        // Show success modal instead of alert
        setBulkMovementResult({
          id: result.id,
          publicToken: result.publicToken,
          publicUrl,
          totalItems,
          totalQuantity,
          fromLocationName: fromLocation?.name || 'Unknown',
          toLocationName: toLocation?.name || 'Unknown',
        });
        
        // Auto copy to clipboard
        navigator.clipboard.writeText(publicUrl).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);
        }).catch(() => console.log('Could not copy'));
      } else {
        const product = selectedProducts[0];
        await createMovement({
          productId: product.productId,
          toLocationId,
          toStockLevel: product.quantity,
          notes: notes || null,
        });

        // Reset and close for single movement
        setFromLocationId(null);
        setToLocationId(null);
        setSelectedProducts([]);
        setNotes('');
        setSearchQuery('');
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Movement failed:', error);
    }
  };

  const handleCopyLink = () => {
    if (bulkMovementResult) {
      navigator.clipboard.writeText(bulkMovementResult.publicUrl).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }).catch(() => console.log('Could not copy'));
    }
  };

  const handleShareWhatsApp = () => {
    if (bulkMovementResult) {
      const message = `Bulk Movement Confirmation Link:\n\n${bulkMovementResult.publicUrl}\n\nPlease confirm receipt using this link.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleCloseSuccessModal = () => {
    setBulkMovementResult(null);
    setLinkCopied(false);
    // Reset form
    setFromLocationId(null);
    setToLocationId(null);
    setSelectedProducts([]);
    setNotes('');
    setSearchQuery('');
    onSuccess?.();
    onClose();
  };

  const handleReset = () => {
    setFromLocationId(null);
    setToLocationId(null);
    setSelectedProducts([]);
    setNotes('');
    setSearchQuery('');
    setBulkMovementResult(null);
    setLinkCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  const fromLocation = locations.find(l => l.id === fromLocationId);
  const toLocation = locations.find(l => l.id === toLocationId);

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
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="p-2 bg-blue-600 rounded-lg mr-3">
                      {isBulkMovement ? (
                        <TruckIcon className="w-6 h-6 text-white" />
                      ) : (
                        <ArrowRightIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    {isBulkMovement ? 'Bulk Movement' : 'Move Product'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    {isBulkMovement
                      ? `Moving ${totalItems} products (${totalQuantity} units) with tracking`
                      : 'Transfer product between locations'
                    }
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
                
                {/* 1. FROM LOCATION */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <span className="flex items-center">
                      📍 From Location <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <select
                    value={fromLocationId || ''}
                    onChange={(e) => {
                      setFromLocationId(e.target.value || null);
                      setSelectedProducts([]); // Reset products when changing from location
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select source location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} • {loc.area} ({loc.code})
                      </option>
                    ))}
                  </select>
                  {fromLocation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>{fromLocation.name}</strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {availableProducts.length} products available
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. TO LOCATION */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <span className="flex items-center">
                      🎯 To Location <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <select
                    value={toLocationId || ''}
                    onChange={(e) => setToLocationId(e.target.value || null)}
                    required
                    disabled={!fromLocationId}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select destination location...</option>
                    {locations.filter(l => l.id !== fromLocationId).map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} • {loc.area} ({loc.code})
                      </option>
                    ))}
                  </select>
                  {toLocation && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-900">
                        <strong>{toLocation.name}</strong>
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Destination selected
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. SELECT PRODUCTS */}
                {fromLocationId && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <span className="flex items-center">
                        📦 Select Products <span className="text-red-500 ml-1">*</span>
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (You can select multiple products)
                        </span>
                      </span>
                    </label>
                    
                    <input
                      type="text"
                      placeholder="🔍 Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {searchQuery && filteredProducts.length > 0 && (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg mb-3">
                        {filteredProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="flex items-center justify-between p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{product.productDetails}</p>
                              <p className="text-sm text-gray-500">
                                {product.sku ? `${product.sku} • ` : ''}Stock: {product.stockLevel || 0}
                              </p>
                            </div>
                            <PlusIcon className="w-5 h-5 text-blue-600" />
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery && filteredProducts.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No products found</p>
                    )}
                  </div>
                )}

                {/* 4. SELECTED PRODUCTS & QUANTITIES */}
                {selectedProducts.length > 0 && (
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      ✅ Selected Products ({selectedProducts.length})
                      {isBulkMovement && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Bulk Movement
                        </span>
                      )}
                    </h4>

                    <div className="space-y-2">
                      {selectedProducts.map((item, index) => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center w-7 h-7 bg-blue-100 rounded-full flex-shrink-0">
                            <span className="text-sm font-bold text-blue-700">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{item.productDetails}</p>
                            <p className="text-xs text-gray-500">
                              {item.sku ? `${item.sku} • ` : ''}Available: {item.availableStock}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600 font-medium">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProduct(item.id)}
                            className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-blue-900">Total:</span>
                        <span className="text-blue-700">
                          {totalItems} product{totalItems > 1 ? 's' : ''} • {totalQuantity} unit{totalQuantity > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. NOTES */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    📝 Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this movement..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

              </div>
            </form>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !fromLocationId || !toLocationId || selectedProducts.length === 0}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? 'Creating...' : (isBulkMovement ? 'Create Bulk Movement' : 'Move Product')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal for Bulk Movement */}
      {bulkMovementResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={handleCloseSuccessModal} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header - Subtle slate gradient instead of bright green */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <CheckIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Bulk Movement Created</h3>
                    <p className="text-sm text-slate-300 mt-0.5">Share confirmation link with receiver</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseSuccessModal}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Movement Details - Clean gray card */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Movement ID</span>
                  <span className="text-sm font-mono font-medium text-slate-900">{bulkMovementResult.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">From Location</span>
                  <span className="text-sm font-medium text-slate-900">{bulkMovementResult.fromLocationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">To Location</span>
                  <span className="text-sm font-medium text-slate-900">{bulkMovementResult.toLocationName}</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Total Items</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {bulkMovementResult.totalItems} product{bulkMovementResult.totalItems > 1 ? 's' : ''} • {bulkMovementResult.totalQuantity} unit{bulkMovementResult.totalQuantity > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Public Link - Minimal border style */}
              <div className="border-2 border-slate-200 rounded-lg p-4 bg-white">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Public Confirmation Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={bulkMovementResult.publicUrl}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                      linkCopied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-white hover:bg-slate-800'
                    }`}
                  >
                    {linkCopied ? (
                      <span className="flex items-center space-x-1.5">
                        <CheckIcon className="w-4 h-4" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1.5">
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        <span>Copy</span>
                      </span>
                    )}
                  </button>
                </div>
                {linkCopied && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1" />
                    Link copied to clipboard
                  </p>
                )}
              </div>

              {/* Share Options - Subtle gray buttons */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Share</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent('Bulk Movement Confirmation Link');
                      const body = encodeURIComponent(`Please confirm receipt using this link:\n\n${bulkMovementResult.publicUrl}`);
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Email</span>
                  </button>
                </div>
              </div>

              {/* Instructions - Subtle amber accent */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-900 mb-2">Important Notes</h4>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Share this link with the receiver at destination</li>
                  <li>Receiver confirms receipt via the link</li>
                  <li>Link expires in 24 hours</li>
                  <li>One-time use only</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
              <button
                onClick={handleCloseSuccessModal}
                className="w-full px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
