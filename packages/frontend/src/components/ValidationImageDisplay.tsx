import React, { useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StatusBadgeOverlay } from './StatusBadgeOverlay';
import { ImageToggle } from './ImageToggle';
import { AvailableImage } from '@invenflow/shared';

interface ValidationImageDisplayProps {
  availableImages: AvailableImage[];
  onImageChange?: (image: AvailableImage) => void;
  onRemove?: () => void;
  className?: string;
  showToggle?: boolean;
  showRemoveButton?: boolean;
  onError?: (error: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function ValidationImageDisplay({
  availableImages,
  onImageChange,
  onRemove,
  className = '',
  showToggle = true,
  showRemoveButton = false,
  onError,
}: ValidationImageDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!availableImages || availableImages.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-50 ${className}`}>
        <PhotoIcon className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  const currentImage = availableImages[currentImageIndex];

  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
    onImageChange?.(availableImages[index]);
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Main Image */}
      <div className="relative w-full h-full">
        <img
          src={currentImage.url}
          alt={`Validation image - ${currentImage.type}`}
          className="w-full h-full object-cover"
          onError={onError}
        />

        {/* Status Badge */}
        <StatusBadgeOverlay type={currentImage.type} />

        {/* Remove Button */}
        {showRemoveButton && onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            aria-label="Remove image"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}

        {/* Image Toggle */}
        {showToggle && availableImages.length > 1 && (
          <ImageToggle
            availableImages={availableImages}
            currentImageIndex={currentImageIndex}
            onImageChange={handleImageChange}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      {/* Image Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-transparent to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-white text-xs">
          <div className="capitalize">{currentImage.type} Image</div>
          <div className="text-gray-300">
            {new Date(currentImage.validatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}