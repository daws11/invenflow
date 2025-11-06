import { useState, useEffect } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import {
  PhotoIcon,
  TagIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { ValidationImageDisplay } from './ValidationImageDisplay';
import { ImageGallery } from './ImageGallery';
import { Slider } from './Slider';
import { SliderTabs, SliderTab } from './SliderTabs';
import { ProductMovementHistory } from './ProductMovementHistory';
import { formatCurrency } from '../utils/formatters';

interface ProductDetailModalProps {
  item: InventoryItem;
  onClose: () => void;
}

type TabType = 'view' | 'edit' | 'movement';

export function ProductDetailModal({ item, onClose }: ProductDetailModalProps) {
  const { updateProductStock, updateProductLocation } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();

  const [activeTab, setActiveTab] = useState<TabType>('view');
  const [editValues, setEditValues] = useState({
    stockLevel: item.stockLevel?.toString() || '',
    location: item.location || '',
    locationId: item.locationId || '',
    notes: item.notes || '',
  });

  const [imageError, setImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    setEditValues({
      stockLevel: item.stockLevel?.toString() || '',
      location: item.location || '',
      locationId: item.locationId || '',
      notes: item.notes || '',
    });
    setActiveTab('view');
  }, [item]);

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      // Update stock level if changed
      if (item.columnStatus === 'Stored' && editValues.stockLevel !== item.stockLevel?.toString()) {
        const newStockLevel = editValues.stockLevel === '' ? 0 : parseInt(editValues.stockLevel);
        await updateProductStock(item.id, newStockLevel);
      }

      // Update location if changed
      if (editValues.location !== item.location || editValues.locationId !== item.locationId) {
        await updateProductLocation(item.id, editValues.location, editValues.locationId || undefined);
      }

      setActiveTab('view');
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditValues({
      stockLevel: item.stockLevel?.toString() || '',
      location: item.location || '',
      locationId: item.locationId || '',
      notes: item.notes || '',
    });
    setActiveTab('view');
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-yellow-100 text-yellow-800';
      case 'Stored':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const hasImage = Boolean((item.displayImage || item.productImage) && !imageError);
  const hasMultipleImages = Boolean(item.availableImages && item.availableImages.length > 1);

  const handleOpenGallery = (index = 0) => {
    setGalleryInitialIndex(index);
    setIsGalleryOpen(true);
  };

  const handleImageClick = () => {
    if (hasMultipleImages) {
      handleOpenGallery();
    }
  };

  // View Tab Content
  const viewContent = (
    <div className="space-y-6">
      {/* Product Image */}
      <div className="relative">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {item.availableImages && item.availableImages.length > 0 ? (
            <ValidationImageDisplay
              availableImages={item.availableImages}
              onImageChange={() => {}}
              onError={() => setImageError(true)}
              showToggle={true}
            />
          ) : hasImage ? (
            <img
              src={item.displayImage || item.productImage || undefined}
              alt={item.productDetails}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={handleImageClick}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PhotoIcon className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Status and Priority Badges */}
        <div className="absolute top-2 right-2 space-y-2">
          {hasMultipleImages && (
            <button
              onClick={() => handleOpenGallery()}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
              title="View all images"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
          {item.columnStatus}
        </span>
        {item.priority && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
            {item.priority}
          </span>
        )}
        {item.stockLevel !== null && item.columnStatus === 'Stored' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Stock: {item.stockLevel}
          </span>
        )}
      </div>

      {/* Basic Info */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{item.productDetails}</h4>
        <p className="text-sm text-gray-500">From: {item.kanban.name}</p>
      </div>

      {/* Details Grid */}
      <div className="space-y-3">
        {item.sku && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">SKU</h4>
            <p className="text-sm text-gray-600">{item.sku}</p>
          </div>
        )}

        {item.category && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Category</h4>
            <div className="flex items-center mt-1">
              <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
              <p className="text-sm text-gray-600">{item.category}</p>
            </div>
          </div>
        )}

        {item.supplier && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Supplier</h4>
            <div className="flex items-center mt-1">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
              <p className="text-sm text-gray-600">{item.supplier}</p>
            </div>
          </div>
        )}

        {item.unitPrice && formatCurrency(item.unitPrice) && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Unit Price</h4>
            <div className="flex items-center mt-1">
              <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
              <p className="text-sm text-gray-600">{formatCurrency(item.unitPrice)}</p>
            </div>
          </div>
        )}

        {item.location && (() => {
          const location = locations.find(loc => loc.id === item.locationId);
          const isPerson = location?.type === 'person';
          
          return (
            <div className={`p-4 rounded-lg border-2 ${
              isPerson 
                ? 'bg-purple-50 border-purple-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`text-sm font-semibold mb-2 flex items-center ${
                isPerson ? 'text-purple-900' : 'text-blue-900'
              }`}>
                {isPerson ? (
                  <>
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    👤 Assigned To Person
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-5 h-5 mr-1.5" />
                    📍 Physical Location
                  </>
                )}
              </h4>
              <div className="space-y-2">
                <div>
                  <p className={`font-bold text-base ${
                    isPerson ? 'text-purple-900' : 'text-blue-900'
                  }`}>
                    {item.location}
                  </p>
                  {location && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {isPerson ? (
                        <>
                          <svg className="w-4 h-4 inline mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Department: {location.area}
                        </>
                      ) : (
                        <>Area: {location.area}</>
                      )}
                    </p>
                  )}
                </div>
                {location && (
                  <div className="flex items-center justify-between pt-2 border-t border-current opacity-30">
                    <span className="text-xs font-mono text-gray-600">
                      Code: {location.code}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPerson 
                        ? 'bg-purple-200 text-purple-800' 
                        : 'bg-blue-200 text-blue-800'
                    }`}>
                      {isPerson ? 'Person' : 'Physical'}
                    </span>
                  </div>
                )}
              </div>
              {isPerson && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-700 italic flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    This person is responsible for this asset
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {item.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Notes</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{item.notes}</p>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <ClockIcon className="h-3 w-3 mr-1" />
          Updated: {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  // Edit Tab Content
  const editContent = (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          You can update stock level and location for stored items.
        </p>
      </div>

      {/* Stock Level (only for stored items) */}
      {item.columnStatus === 'Stored' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CubeIcon className="h-4 w-4 inline mr-1" />
            Stock Level
          </label>
          <input
            type="number"
            value={editValues.stockLevel}
            onChange={(e) => setEditValues(prev => ({ ...prev, stockLevel: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
        </div>
      )}

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPinIcon className="h-4 w-4 inline mr-1" />
          Location
        </label>
        {locations.length > 0 ? (
          <select
            value={editValues.locationId}
            onChange={(e) => {
              const selectedLocation = locations.find(loc => loc.id === e.target.value);
              setEditValues(prev => ({
                ...prev,
                locationId: e.target.value,
                location: selectedLocation?.name || '',
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={editValues.location}
            onChange={(e) => setEditValues(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter location"
          />
        )}
      </div>

      {/* Notes (Read-only) */}
      {item.notes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{item.notes}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  // Movement History Tab Content
  const movementContent = (
    <div className="p-6">
      <ProductMovementHistory productId={item.id} />
    </div>
  );

  const tabs: SliderTab[] = [
    {
      id: 'view',
      label: 'View',
      content: viewContent,
      icon: <EyeIcon className="h-4 w-4" />,
    },
    {
      id: 'edit',
      label: 'Edit',
      content: editContent,
      icon: <PencilIcon className="h-4 w-4" />,
    },
    {
      id: 'movement',
      label: 'Movement History',
      content: movementContent,
      icon: <ArrowsRightLeftIcon className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <Slider
        isOpen={true}
        onClose={onClose}
        title="Product Details"
      >
        <SliderTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />
      </Slider>

      {/* Image Gallery */}
      {isGalleryOpen && item.availableImages && (
        <ImageGallery
          isOpen={isGalleryOpen}
          images={item.availableImages}
          initialIndex={galleryInitialIndex}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}
    </>
  );
}
