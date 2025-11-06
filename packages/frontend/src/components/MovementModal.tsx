import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, ArrowsRightLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { InventoryItem, BatchDistributionItem } from '@invenflow/shared';
import { useMovementStore } from '../store/movementStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { PersonSelector } from './PersonSelector';
import { nanoid } from 'nanoid';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: InventoryItem;
  onSuccess?: () => void;
}

type AssignmentType = 'location' | 'person';

interface ExtendedBatchDistributionItem extends BatchDistributionItem {
  id: string;
}

export function MovementModal({ isOpen, onClose, preselectedProduct, onSuccess }: MovementModalProps) {
  const { createMovement, createBatchDistribution, loading } = useMovementStore();
  const { items: inventoryItems, fetchInventory } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();

  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProduct?.id || '');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('location');
  const [toLocationId, setToLocationId] = useState<string | null>(null);
  const [toPersonId, setToPersonId] = useState<string | null>(null);
  const [toStockLevel, setToStockLevel] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Batch distribution state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [showBatchPrompt, setShowBatchPrompt] = useState<boolean>(false);
  const [distributions, setDistributions] = useState<ExtendedBatchDistributionItem[]>([
    { id: nanoid(), toLocationId: null, toPersonId: null, quantity: 1, notes: null }
  ]);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchLocations({ activeOnly: true });
      fetchPersons({ activeOnly: true });
    }
  }, [isOpen, fetchInventory, fetchLocations, fetchPersons]);

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
  const currentPerson = selectedProduct?.assignedToPersonId
    ? persons.find(p => p.id === selectedProduct.assignedToPersonId)
    : null;

  // Calculate total distributed in batch mode
  const totalDistributed = distributions.reduce((sum, dist) => sum + (dist.quantity || 0), 0);
  const remainingStock = selectedProduct ? (selectedProduct.stockLevel || 0) - totalDistributed : 0;

  // Auto-detect: when stock level changes and is less than available, show batch prompt
  const handleStockLevelChange = (newStockLevel: number) => {
    setToStockLevel(newStockLevel);
    
    if (selectedProduct && newStockLevel < (selectedProduct.stockLevel || 0) && newStockLevel > 0 && !isBatchMode) {
      setShowBatchPrompt(true);
    } else {
      setShowBatchPrompt(false);
    }
  };

  const handleEnableBatchMode = () => {
    setIsBatchMode(true);
    setShowBatchPrompt(false);
    // Initialize first distribution with current values
    setDistributions([{
      id: nanoid(),
      toLocationId: assignmentType === 'location' ? toLocationId : null,
      toPersonId: assignmentType === 'person' ? toPersonId : null,
      quantity: toStockLevel > 0 ? toStockLevel : 1,
      notes: notes || null,
    }]);
  };

  const handleDisableBatchMode = () => {
    setIsBatchMode(false);
    setDistributions([{ id: nanoid(), toLocationId: null, toPersonId: null, quantity: 1, notes: null }]);
  };

  const addDistribution = () => {
    setDistributions([...distributions, { id: nanoid(), toLocationId: null, toPersonId: null, quantity: 1, notes: null }]);
  };

  const removeDistribution = (id: string) => {
    if (distributions.length > 1) {
      setDistributions(distributions.filter(d => d.id !== id));
    }
  };

  const updateDistribution = (id: string, field: keyof BatchDistributionItem, value: any) => {
    setDistributions(distributions.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId) {
      return;
    }

    try {
      if (isBatchMode) {
        // Validate batch distributions
        const validDistributions = distributions.filter(d => 
          (d.toLocationId || d.toPersonId) && d.quantity > 0
        );
        if (validDistributions.length === 0) {
          return;
        }

        await createBatchDistribution({
          sourceProductId: selectedProductId,
          distributions: validDistributions.map(d => ({
            toLocationId: d.toLocationId || undefined,
            toPersonId: d.toPersonId || undefined,
            quantity: d.quantity,
            notes: d.notes || undefined,
          })),
        });
      } else {
        // Single movement
        if ((!toLocationId && !toPersonId) || toStockLevel < 0) {
          return;
        }

        await createMovement({
          productId: selectedProductId,
          toLocationId: toLocationId || undefined,
          toPersonId: toPersonId || undefined,
          toStockLevel,
          notes: notes || null,
        });
      }

      // Reset form
      setSelectedProductId('');
      setAssignmentType('location');
      setToLocationId(null);
      setToPersonId(null);
      setToStockLevel(0);
      setNotes('');
      setSearchQuery('');
      setIsBatchMode(false);
      setShowBatchPrompt(false);
      setDistributions([{ id: nanoid(), toLocationId: null, toPersonId: null, quantity: 1, notes: null }]);

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
                    {isBatchMode ? 'Batch Distribution' : 'Move Product'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    {isBatchMode 
                      ? 'Distribute products to multiple recipients in one operation'
                      : 'Transfer assets to physical locations or assign to people'
                    }
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

              {/* Current Assignment Display */}
              {selectedProduct && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-900">Current Assignment</p>
                  </div>
                  {currentLocation || currentPerson ? (
                    <div className={`p-3 rounded-lg border-l-4 ${
                      currentPerson 
                        ? 'bg-purple-50 border-purple-500' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {currentPerson ? (
                          <svg className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                        <div className="flex-1">
                          {currentPerson ? (
                            <>
                              <p className="text-base font-bold text-gray-900">{currentPerson.name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {currentPerson.department}
                              </p>
                              <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-200 text-purple-800">
                                👤 Assigned to Person
                              </span>
                            </>
                          ) : currentLocation ? (
                            <>
                              <p className="text-base font-bold text-gray-900">{currentLocation.name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {currentLocation.area} • {currentLocation.code}
                              </p>
                              <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-200 text-blue-800">
                                📍 Physical Location
                              </span>
                            </>
                          ) : null}
                          <div className="flex items-center justify-end mt-2">
                            <span className="text-xs text-gray-500">Current Stock:</span>
                            <span className="ml-1 font-bold text-gray-900 text-base">{selectedProduct.stockLevel || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">No assignment</p>
                  )}
                </div>
              )}

              {/* Arrow Indicator */}
              {selectedProduct && !isBatchMode && (
                <div className="flex justify-center py-2">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <ArrowRightIcon className="w-6 h-6 text-gray-500 transform rotate-90" />
                  </div>
                </div>
              )}

              {/* Single Movement Mode */}
              {!isBatchMode && selectedProduct && (
                <>
                  {/* Assignment Type Toggle */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Assignment Type
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentType('location');
                          setToPersonId(null);
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          assignmentType === 'location'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        📍 Location
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentType('person');
                          setToLocationId(null);
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          assignmentType === 'person'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        👤 Person
                      </button>
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        {assignmentType === 'location' ? 'Move To Location' : 'Assign To Person'}
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                    </label>
                    
                    {assignmentType === 'location' ? (
                      <select
                        value={toLocationId || ''}
                        onChange={(e) => setToLocationId(e.target.value || null)}
                        required
                        disabled={!selectedProductId}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                      >
                        <option value="">🎯 Select location...</option>
                        {locations
                          .filter(loc => loc.id !== selectedProduct?.locationId)
                          .map((location) => (
                            <option key={location.id} value={location.id}>
                              📍 {location.name} • {location.area}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <PersonSelector
                        value={toPersonId}
                        onChange={setToPersonId}
                        placeholder="🎯 Select person..."
                        excludePersonId={selectedProduct?.assignedToPersonId || undefined}
                        required
                        disabled={!selectedProductId}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Batch Mode */}
              {isBatchMode && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-900">
                          Batch Distribution Mode Active
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Distributing {selectedProduct?.productDetails}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisableBatchMode}
                        className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Exit Batch Mode
                      </button>
                    </div>
                  </div>

                  {/* Distributions */}
                  {distributions.map((dist, index) => (
                    <div key={dist.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Recipient #{index + 1}
                        </h4>
                        {distributions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDistribution(dist.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Assignment Type for this distribution */}
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateDistribution(dist.id, 'toPersonId', null);
                              if (!dist.toLocationId) {
                                updateDistribution(dist.id, 'toLocationId', '');
                              }
                            }}
                            className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium transition-all ${
                              dist.toLocationId && !dist.toPersonId
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                          >
                            📍 Location
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateDistribution(dist.id, 'toLocationId', null);
                              if (!dist.toPersonId) {
                                updateDistribution(dist.id, 'toPersonId', '');
                              }
                            }}
                            className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium transition-all ${
                              dist.toPersonId && !dist.toLocationId
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                          >
                            👤 Person
                          </button>
                        </div>

                        {/* Target Selection */}
                        {(!dist.toPersonId || dist.toLocationId) && (
                          <select
                            value={dist.toLocationId || ''}
                            onChange={(e) => updateDistribution(dist.id, 'toLocationId', e.target.value || null)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Select location...</option>
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name} • {location.area}
                              </option>
                            ))}
                          </select>
                        )}

                        {(!dist.toLocationId || dist.toPersonId) && (
                          <PersonSelector
                            value={dist.toPersonId}
                            onChange={(value) => updateDistribution(dist.id, 'toPersonId', value)}
                            placeholder="Select person..."
                            className="text-sm"
                            required
                          />
                        )}

                        {/* Quantity */}
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct?.stockLevel || 0}
                          value={dist.quantity}
                          onChange={(e) => updateDistribution(dist.id, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Quantity"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />

                        {/* Notes */}
                        <textarea
                          value={dist.notes || ''}
                          onChange={(e) => updateDistribution(dist.id, 'notes', e.target.value || null)}
                          placeholder="Notes (optional)"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Distribution Button */}
                  <button
                    type="button"
                    onClick={addDistribution}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all"
                  >
                    <PlusIcon className="w-5 h-5 inline mr-2" />
                    Add Another Recipient
                  </button>

                  {/* Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Available</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProduct?.stockLevel || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Distributing</p>
                        <p className="text-lg font-bold text-blue-600">{totalDistributed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Remaining</p>
                        <p className={`text-lg font-bold ${remainingStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remainingStock}
                        </p>
                      </div>
                    </div>
                    {remainingStock < 0 && (
                      <p className="mt-3 text-xs text-red-600 text-center font-medium">
                        ⚠️ Total quantity exceeds available stock
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* New Stock Level (Single Mode Only) */}
              {!isBatchMode && selectedProduct && (
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
                    max={selectedProduct.stockLevel || 0}
                    value={toStockLevel}
                    onChange={(e) => handleStockLevelChange(parseInt(e.target.value) || 0)}
                    required
                    disabled={!selectedProductId}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Available: <span className="font-bold text-gray-900">{selectedProduct.stockLevel || 0}</span>
                  </p>
                </div>
              )}

              {/* Batch Mode Prompt */}
              {showBatchPrompt && !isBatchMode && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900">
                        Partial stock movement detected
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        You're moving {toStockLevel} out of {selectedProduct?.stockLevel || 0} items. 
                        Enable batch mode to distribute remaining stock to multiple recipients.
                      </p>
                      <button
                        type="button"
                        onClick={handleEnableBatchMode}
                        className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Enable Batch Distribution
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {!isBatchMode && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Notes (Optional)
                    </span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this movement..."
                    rows={3}
                    disabled={!selectedProductId}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm resize-none"
                  />
                </div>
              )}
              </div>
            </form>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
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
                  disabled={loading || !selectedProductId || (!isBatchMode && !toLocationId && !toPersonId)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isBatchMode ? 'Distributing...' : 'Moving...'}
                    </span>
                  ) : (
                    isBatchMode ? 'Distribute to All' : 'Move Product'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
