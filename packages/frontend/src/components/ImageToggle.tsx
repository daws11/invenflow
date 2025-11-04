import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AvailableImage } from '@invenflow/shared';

interface ImageToggleProps {
  availableImages: AvailableImage[];
  currentImageIndex: number;
  onImageChange: (index: number) => void;
  className?: string;
}

export function ImageToggle({
  availableImages,
  currentImageIndex,
  onImageChange,
  className = '',
}: ImageToggleProps) {
  if (!availableImages || availableImages.length <= 1) {
    return null;
  }

  const handlePrevious = () => {
    const newIndex = currentImageIndex === 0 ? availableImages.length - 1 : currentImageIndex - 1;
    onImageChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentImageIndex === availableImages.length - 1 ? 0 : currentImageIndex + 1;
    onImageChange(newIndex);
  };

  const handleDotClick = (index: number) => {
    onImageChange(index);
  };

  return (
    <div className={`absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black bg-opacity-50 rounded-full px-3 py-2 ${className}`}>
      <button
        onClick={handlePrevious}
        className="text-white hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
        aria-label="Previous image"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      {/* Dots indicator */}
      <div className="flex space-x-1">
        {availableImages.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentImageIndex
                ? 'bg-white'
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      <button
        onClick={handleNext}
        className="text-white hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
        aria-label="Next image"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}