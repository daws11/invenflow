import { useState, useEffect } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import {
  XMarkIcon,
  PhotoIcon,
  TagIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { ValidationImageDisplay } from './ValidationImageDisplay';
import { ImageGallery } from './ImageGallery';

interface ProductDetailModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export function ProductDetailModal({ item, onClose }: ProductDetailModalProps) {
  const { updateProductStock, updateProductLocation } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();

  const [isEditing, setIsEditing] = useState(false);
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

      setIsEditing(false);
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
    setIsEditing(false);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Product Details
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  From kanban: {item.kanban.name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {item.columnStatus === 'Stored' && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isEditing ? (
                      <>
                        <XMarkIcon className="h-3 w-3 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Edit
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Image and Basic Info */}
              <div className="space-y-4">
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
                        src={item.displayImage || item.productImage}
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
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.columnStatus)}`}>
                      {item.columnStatus}
                    </div>
                    {item.priority && (
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Product Name</h4>
                    <p className="text-sm text-gray-700">{item.productDetails}</p>
                  </div>

                  {item.sku && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">SKU</h4>
                      <p className="text-sm text-gray-700">{item.sku}</p>
                    </div>
                  )}

                  {item.category && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Category</h4>
                      <div className="flex items-center mt-1">
                        <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-700">{item.category}</p>
                      </div>
                    </div>
                  )}

                  {item.supplier && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Supplier</h4>
                      <div className="flex items-center mt-1">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-700">{item.supplier}</p>
                      </div>
                    </div>
                  )}

                  {item.unitPrice && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Unit Price</h4>
                      <div className="flex items-center mt-1">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-700">${item.unitPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Editable Fields */}
              <div className="space-y-4">
                {/* Stock Level (only for stored items) */}
                {item.columnStatus === 'Stored' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      <div className="flex items-center">
                        <CubeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        Stock Level
                      </div>
                    </h4>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editValues.stockLevel}
                          onChange={(e) => setEditValues(prev => ({ ...prev, stockLevel: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                        <span className="text-sm text-gray-500">units</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-semibold ${
                          item.stockLevel === 0 ? 'text-red-600' :
                          item.stockLevel !== null && item.stockLevel <= 10 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {item.stockLevel !== null ? `${item.stockLevel} units` : 'Not set'}
                        </span>
                        {item.stockLevel !== null && item.stockLevel <= 10 && (
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                            Low Stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                      Storage Location
                    </div>
                  </h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <select
                        value={editValues.locationId}
                        onChange={(e) => {
                          const location = locations.find(l => l.id === e.target.value);
                          setEditValues(prev => ({
                            ...prev,
                            locationId: e.target.value,
                            location: location?.name || ''
                          }));
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} ({location.area})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editValues.location}
                        onChange={(e) => setEditValues(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Or enter custom location"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">
                      {item.location || <span className="text-gray-400">Not specified</span>}
                    </p>
                  )}
                </div>

                {/* Product Link */}
                {item.productLink && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Product Link</h4>
                    <a
                      href={item.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      View Product
                    </a>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dimensions & Weight */}
                {(item.dimensions || item.weight) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Physical Attributes</h4>
                    <div className="space-y-1">
                      {item.dimensions && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Dimensions:</span> {item.dimensions}
                        </p>
                      )}
                      {item.weight && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Weight:</span> {item.weight} kg
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span>In inventory: {item.daysInInventory} days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {item.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isEditing && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {isGalleryOpen && item.availableImages && (
        <ImageGallery
          images={item.availableImages}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          initialIndex={galleryInitialIndex}
        />
      )}
    </div>
  );
}
