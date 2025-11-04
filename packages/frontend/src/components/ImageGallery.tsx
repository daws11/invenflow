import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import { StatusBadgeOverlay } from './StatusBadgeOverlay';
import { AvailableImage } from '@invenflow/shared';

interface ImageGalleryProps {
  images: AvailableImage[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function ImageGallery({ images, isOpen, onClose, initialIndex = 0 }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors z-10"
        aria-label="Close gallery"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row items-center justify-center w-full h-full p-4 gap-6 max-w-7xl">

        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-[70vh]">
            <img
              src={currentImage.url}
              alt={`Gallery image ${currentIndex + 1} - ${currentImage.type}`}
              className={`max-w-full max-h-full object-contain ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={toggleZoom}
            />

            {/* Status Badge */}
            <StatusBadgeOverlay type={currentImage.type} className="top-4 left-4" />

            {/* Zoom Controls */}
            <button
              onClick={toggleZoom}
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
              aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
            >
              {isZoomed ? (
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              ) : (
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="text-white hover:text-gray-300 p-3 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={handleNext}
              className="text-white hover:text-gray-300 p-3 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-6 py-3">
          {/* Image Counter */}
          <span className="text-white text-sm">
            {currentIndex + 1} / {images.length}
          </span>

          {/* Dots */}
          <div className="flex space-x-2 mx-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Image Type */}
          <span className="text-white text-sm capitalize">
            {currentImage.type}
          </span>
        </div>
      </div>

      {/* Image Metadata */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
        <div className="capitalize font-medium">{currentImage.type} Image</div>
        <div className="text-gray-300 text-xs">
          Validated: {new Date(currentImage.validatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}