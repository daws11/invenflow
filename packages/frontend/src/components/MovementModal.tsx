import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, TruckIcon, PlusIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon, ShareIcon } from '@heroicons/react/24/outline';
import type { InventoryItem } from '@invenflow/shared';
import { useMovementStore } from '../store/movementStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { useToast } from '../store/toastStore';
import { bulkMovementApi, inventoryApi } from '../utils/api';
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

interface SingleMovementResult {
  id: string;
  publicToken: string;
  publicUrl: string;
  productLabel: string;
  destinationLabel: string;
  quantity: number;
  expiresAt?: string | Date | null;
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
  const { fetchInventory } = useInventoryStore();
  const { locations, areas, fetchLocations } = useLocationStore();
  const { persons, fetchPersons } = usePersonStore();
  const { error: showError } = useToast();

  // State
  const [fromArea, setFromArea] = useState<string>('');
  const [fromLocationId, setFromLocationId] = useState<string | null>(null);
  const [destinationType, setDestinationType] = useState<'location' | 'person'>('location');
  const [toArea, setToArea] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string | null>(null);
  const [toPersonId, setToPersonId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkMovementResult, setBulkMovementResult] = useState<BulkMovementResult | null>(null);
  const [singleMovementResult, setSingleMovementResult] = useState<SingleMovementResult | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState<boolean>(false);
  const [availableAtLocation, setAvailableAtLocation] = useState<InventoryItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState<boolean>(false);
  const [availablePage, setAvailablePage] = useState<number>(1);
  const [availableTotalPages, setAvailableTotalPages] = useState<number>(1);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchLocations();
      fetchPersons({ activeOnly: true });
    }
  }, [isOpen, fetchInventory, fetchLocations, fetchPersons]);

  // Load available products for selected source area directly from server (avoid pagination/stale data)
  useEffect(() => {
    const loadAvailable = async () => {
      if (!isOpen || !fromArea) {
        setAvailableAtLocation([]);
        return;
      }
      setLoadingAvailable(true);
      try {
        const res = await inventoryApi.getInventory({
          area: [fromArea],
          columnStatus: ['Stored'],
          page: availablePage,
          pageSize: 50,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          viewMode: 'unified',
        });
        setAvailableAtLocation(res.items);
        setAvailableTotalPages(res.totalPages);
      } catch (_e) {
        setAvailableAtLocation([]);
      } finally {
        setLoadingAvailable(false);
      }
    };
    void loadAvailable();
  }, [isOpen, fromArea, availablePage]);

  // Initialize from preselected product (only when modal opens and no products selected)
  useEffect(() => {
    if (preselectedProduct && preselectedProduct.locationId && isOpen && selectedProducts.length === 0) {
      const sourceLocation = locations.find(l => l.id === preselectedProduct.locationId);
      if (sourceLocation) {
        setFromArea(sourceLocation.area);
        setFromLocationId(preselectedProduct.locationId);
      }

      // Initialize products only if none are selected yet (prevents reinitialization)
      setSelectedProducts([{
        id: nanoid(),
        productId: preselectedProduct.id,
        productDetails: preselectedProduct.productDetails,
        sku: preselectedProduct.sku,
        quantity: 1,
        availableStock: preselectedProduct.stockLevel || 0,
      }]);
    }
  }, [preselectedProduct, isOpen, locations, selectedProducts.length]);

  // Cleanup state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFromArea('');
      setFromLocationId(null);
      setDestinationType('location');
      setToArea('');
      setToLocationId(null);
      setToPersonId(null);
      setSelectedProducts([]);
      setNotes('');
      setSearchQuery('');
      setBulkMovementResult(null);
      setSingleMovementResult(null);
      setLinkCopied(false);
      setRequiresConfirmation(false);
    }
  }, [isOpen]);

  // Filter products sourced from server by area
  const availableProducts = fromArea ? availableAtLocation : [];
  const filteredProducts = availableProducts.filter(item =>
    !selectedProducts.some(sp => sp.productId === item.id) &&
    (item.productDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculations
  const totalItems = selectedProducts.length;
  const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const isBulkMovement = selectedProducts.length > 1;

  const confirmationTitle = isBulkMovement
    ? 'Require Receiver Confirmation for all selected items'
    : 'Require Receiver Confirmation';

  const confirmationDescription = isBulkMovement
    ? 'Enable this to generate a single confirmation link for the receiver. Stock changes will be applied only after the link is confirmed for every selected item.'
    : 'Enable this to generate a confirmation link for the recipient. Stock changes will be applied only after they confirm the transfer.';

  useEffect(() => {
    if (selectedProducts.length === 0 && requiresConfirmation) {
      setRequiresConfirmation(false);
    }
  }, [selectedProducts.length, requiresConfirmation]);

  // Handler for destination type change
  const handleDestinationTypeChange = (type: 'location' | 'person') => {
    setDestinationType(type);
    // Reset destination values when switching types
    if (type === 'location') {
      setToPersonId(null);
    } else {
      setToLocationId(null);
    }
  };

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
    
    const hasValidDestination =
      destinationType === 'location'
        ? Boolean(toArea)
        : Boolean(toPersonId);
    
    if (!fromArea || !hasValidDestination || selectedProducts.length === 0) {
      const destinationText = destinationType === 'location' ? 'destination area' : 'person to assign to';
      alert(`Please select from area, ${destinationText}, and at least one product`);
      return;
    }

    try {
      if (isBulkMovement) {
        const fromLocation = fromLocationId
          ? locations.find(l => l.id === fromLocationId)
          : undefined;
        const toLocation = toLocationId
          ? locations.find(l => l.id === toLocationId)
          : undefined;

        const result = await bulkMovementApi.create({
          fromLocationId: fromLocationId || null,
          fromArea: fromArea || fromLocation?.area || null,
          toArea: toArea || toLocation?.area || null,
          toLocationId: toLocationId || null,
          items: selectedProducts.map(item => ({
            productId: item.productId,
            quantitySent: item.quantity,
          })),
          notes: notes || null,
          requiresConfirmation,
        });
        if (requiresConfirmation) {
          const publicUrl = `${window.location.origin}/bulk-movement/confirm/${result.publicToken}`;
          const fromLocationResolved = fromLocation;
          const toLocationResolved = toLocationId
            ? toLocation
            : locations.find(
                (l) => l.area === (toArea || toLocation?.area) && l.name === 'General'
              ) || toLocation;

          setBulkMovementResult({
            id: result.id,
            publicToken: result.publicToken,
            publicUrl,
            totalItems,
            totalQuantity,
            fromLocationName: fromLocationResolved
              ? `${fromLocationResolved.name}${
                  fromLocationResolved.area ? ` - ${fromLocationResolved.area}` : ''
                }`
              : 'Unknown',
            toLocationName: toLocationResolved
              ? `${toLocationResolved.name}${
                  toLocationResolved.area ? ` - ${toLocationResolved.area}` : ''
                }`
              : toArea || 'Unknown',
          });

          navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
          }).catch(() => console.log('Could not copy'));
        } else {
          onSuccess?.();
          handleReset();
        }
      } else {
        const product = selectedProducts[0];
        const fromLocation = fromLocationId
          ? locations.find(l => l.id === fromLocationId)
          : undefined;
        const selectedPerson = toPersonId
          ? persons.find(person => person.id === toPersonId)
          : null;

        const response = await createMovement({
          productId: product.productId,
          fromArea: fromArea || fromLocation?.area || null,
          toArea: destinationType === 'location' ? (toArea || null) : null,
          toLocationId: destinationType === 'location' ? toLocationId : null,
          toPersonId: destinationType === 'person' ? toPersonId : null,
          quantityToMove: product.quantity,
          notes: notes || null,
          requiresConfirmation: !isBulkMovement && requiresConfirmation,
        });

        if (requiresConfirmation && 'publicToken' in response && response.publicToken) {
          const pendingResponse = response;
          const toLocation = toLocationId
            ? locations.find(l => l.id === toLocationId)
            : undefined;
          const publicUrl =
            pendingResponse.publicUrl ||
            `${window.location.origin}/movement/confirm/${pendingResponse.publicToken}`;
          const destinationLabel =
            destinationType === 'location'
              ? (toLocation
                  ? `${toLocation.name}${toLocation.area ? ` - ${toLocation.area}` : ''}`
                  : toArea
                  ? `${toArea} (General)`
                  : 'Destination')
              : selectedPerson
              ? selectedPerson.name
              : 'Assignee';

          setSingleMovementResult({
            id: pendingResponse.movementLog.id,
            publicToken: pendingResponse.publicToken,
            publicUrl,
            productLabel: product.productDetails,
            destinationLabel,
            quantity: product.quantity,
            expiresAt: pendingResponse.tokenExpiresAt ?? null,
          });

          navigator.clipboard
            .writeText(publicUrl)
            .then(() => {
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 3000);
            })
            .catch(() => console.log('Could not copy'));

          setRequiresConfirmation(false);
        } else {
        // Reset and close for single movement
        setFromLocationId(null);
        setDestinationType('location');
        setToArea('');
        setToLocationId(null);
        setToPersonId(null);
        setSelectedProducts([]);
        setNotes('');
        setSearchQuery('');
          setRequiresConfirmation(false);
        onSuccess?.();
        onClose();
        }
      }
    } catch (error: any) {
      console.error('Movement failed:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to process movement. Please try again.';
      showError(message);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch(() => console.log('Could not copy'));
  };

  const handleShareWhatsApp = (url: string) => {
    const message = `Movement Confirmation Link:\n\n${url}\n\nPlease confirm receipt using this link.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = (subject: string, url: string) => {
    const body = encodeURIComponent(`Please confirm receipt using this link:\n\n${url}`);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleCloseSuccessModal = () => {
    setBulkMovementResult(null);
    setSingleMovementResult(null);
    setLinkCopied(false);
    setRequiresConfirmation(false);
    setFromLocationId(null);
    setDestinationType('location');
    setToLocationId(null);
    setToPersonId(null);
    setSelectedProducts([]);
    setNotes('');
    setSearchQuery('');
    onSuccess?.();
    onClose();
  };

  const handleReset = () => {
    setFromLocationId(null);
    setDestinationType('location');
    setToLocationId(null);
    setToPersonId(null);
    setSelectedProducts([]);
    setNotes('');
    setSearchQuery('');
    setBulkMovementResult(null);
    setSingleMovementResult(null);
    setLinkCopied(false);
    setRequiresConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

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
                
                {/* 1. FROM AREA & OPTIONAL LOCATION */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <span className="flex items-center">
                      📍 From Area <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <div className="space-y-3">
                    {/* From Area (required) */}
                  <select
                      value={fromArea}
                    onChange={(e) => {
                        setFromArea(e.target.value);
                        setFromLocationId(null);
                        setSelectedProducts([]);
                        setAvailablePage(1);
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                      <option value="">Select source area...</option>
                      {areas.map((areaValue) => (
                        <option key={areaValue} value={areaValue}>
                          {areaValue}
                        </option>
                      ))}
                    </select>

                    {/* Optional From Location (for context only) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        From Location (optional, for context)
                      </label>
                      <select
                        value={fromLocationId || ''}
                        onChange={(e) => setFromLocationId(e.target.value || null)}
                        disabled={!fromArea}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">All locations in this area</option>
                        {locations
                          .filter((loc) => loc.area === fromArea)
                          .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                    </div>

                    {fromArea && (
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          {loadingAvailable
                            ? 'Loading products...'
                            : `Showing products stored in area "${fromArea}"`}
                      </p>
                    </div>
                  )}
                  </div>
                </div>

                {/* 2. DESTINATION SELECTION */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-4">
                    <span className="flex items-center">
                      🎯 Select Destination <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>

                  {/* Destination Type Tabs */}
                  <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleDestinationTypeChange('location')}
                      disabled={!fromArea}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        destinationType === 'location'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      📍 Move to Location
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDestinationTypeChange('person')}
                      disabled={!fromArea}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        destinationType === 'person'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      👤 Assign to Person
                    </button>
                  </div>

                  {/* Location Selection (Area + optional Location) */}
                  {destinationType === 'location' && (
                    <div className="space-y-3">
                      {/* Destination Area (required) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Destination Area
                        </label>
                        <select
                          value={toArea}
                          onChange={(e) => {
                            setToArea(e.target.value);
                            setToLocationId(null);
                          }}
                          disabled={!fromArea}
                          required
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          <option value="">Select destination area...</option>
                          {areas.map((areaValue) => (
                            <option key={areaValue} value={areaValue}>
                              {areaValue}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Destination Location (optional within area) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Destination Location (optional)
                        </label>
                      <select
                        value={toLocationId || ''}
                        onChange={(e) => setToLocationId(e.target.value || null)}
                          disabled={!fromArea || !toArea}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                          <option value="">
                            Use general location for this area
                          </option>
                          {locations
                            .filter(
                              (loc) =>
                                loc.id !== fromLocationId && loc.area === toArea
                            )
                            .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} - {loc.area} ({loc.code})
                          </option>
                        ))}
                      </select>
                      {toLocation && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <strong>📍 {toLocation.name}</strong>
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                              Products will be moved to this specific location in{' '}
                              {toLocation.area}
                          </p>
                        </div>
                      )}
                        {!toLocationId && toArea && (
                          <div className="mt-2 text-xs text-gray-600">
                            If you do not choose a specific location, the{' '}
                            <span className="font-semibold">general location</span>{' '}
                            for <span className="font-semibold">{toArea}</span> will be used.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Person Selection */}
                  {destinationType === 'person' && (
                    <div>
                      <select
                        value={toPersonId || ''}
                        onChange={(e) => setToPersonId(e.target.value || null)}
                        required
                        disabled={!fromArea}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      >
                        <option value="">Select person to assign...</option>
                        {persons.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                            {(person as any).departmentName && ` - ${(person as any).departmentName}`}
                          </option>
                        ))}
                      </select>
                      {toPersonId && (() => {
                        const selectedPerson = persons.find(p => p.id === toPersonId);
                        return selectedPerson ? (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm text-purple-900">
                              <strong>👤 {selectedPerson.name}</strong>
                            </p>
                            <p className="text-xs text-purple-700 mt-1">
                              {(selectedPerson as any).departmentName ? `${(selectedPerson as any).departmentName} • ` : ''}
                              Products will be assigned to this person
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Destination Requirement Notice */}
                  {fromArea && (
                    (destinationType === 'location' && !toArea) ||
                    (destinationType === 'person' && !toPersonId)
                  ) && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="text-amber-600">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-amber-800">
                            <strong>Selection Required:</strong> Please select a {destinationType === 'location' ? 'destination location' : 'person to assign to'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. CONFIRMATION TOGGLE */}
                {selectedProducts.length > 0 && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm flex items-start justify-between space-x-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center">
                        <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
                        {confirmationTitle}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 max-w-md">
                        {confirmationDescription}
                      </p>
                      {requiresConfirmation ? (
                        <p className="mt-2 text-xs text-blue-700">
                          Link expires in 7 days. Share it with the destination{' '}
                          {destinationType === 'location' ? 'location contact' : 'person'}.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">
                          Toggle on if the receiver must acknowledge this movement.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={requiresConfirmation}
                      onClick={() => setRequiresConfirmation(!requiresConfirmation)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ${
                        requiresConfirmation ? 'bg-blue-600 border-blue-600' : 'bg-gray-300 border-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          requiresConfirmation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* 4. SELECT PRODUCTS */}
                {fromArea && (
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

                    {filteredProducts.length > 0 && (
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

                    {/* Simple pagination controls */}
                    {availableTotalPages > 1 && (
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                        <button
                          type="button"
                          onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                          disabled={availablePage <= 1}
                          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span>
                          Page {availablePage} of {availableTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAvailablePage(p => Math.min(availableTotalPages, p + 1))}
                          disabled={availablePage >= availableTotalPages}
                          className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SELECTED PRODUCTS & QUANTITIES */}
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

                {/* 6. NOTES */}
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
                  disabled={
                    loading ||
                    !fromArea ||
                    !(destinationType === 'location' ? toArea : toPersonId) ||
                    selectedProducts.length === 0
                  }
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? 'Creating...' : (isBulkMovement ? 'Create Bulk Movement' : (destinationType === 'location' ? 'Move Product' : 'Assign Product'))}
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
                    onClick={() => handleCopyLink(bulkMovementResult.publicUrl)}
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
                    onClick={() => handleShareWhatsApp(bulkMovementResult.publicUrl)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleShareEmail('Bulk Movement Confirmation Link', bulkMovementResult.publicUrl)}
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

      {singleMovementResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={handleCloseSuccessModal} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CheckIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Confirmation Link Ready</h3>
                    <p className="text-sm text-blue-100 mt-0.5">Share this link with the receiver</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseSuccessModal}
                  className="p-2 text-blue-100 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Movement ID</span>
                  <span className="text-sm font-mono font-medium text-slate-900">{singleMovementResult.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Product</span>
                  <span className="text-sm font-medium text-slate-900">{singleMovementResult.productLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Destination</span>
                  <span className="text-sm font-medium text-slate-900">{singleMovementResult.destinationLabel}</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Quantity</span>
                  <span className="text-sm font-semibold text-slate-900">{singleMovementResult.quantity} unit(s)</span>
                </div>
              </div>

              <div className="border-2 border-slate-200 rounded-lg p-4 bg-white">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Public Confirmation Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={singleMovementResult.publicUrl}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleCopyLink(singleMovementResult.publicUrl)}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                      linkCopied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-800'
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

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Share</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleShareWhatsApp(singleMovementResult.publicUrl)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleShareEmail('Movement Confirmation Link', singleMovementResult.publicUrl)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Email</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Important Notes</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Share this link with the receiver to confirm the movement</li>
                  <li>Link expires in 7 days</li>
                  <li>Once confirmed, stock updates automatically</li>
                </ul>
              </div>
            </div>

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
