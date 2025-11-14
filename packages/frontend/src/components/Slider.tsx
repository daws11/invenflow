import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SliderProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'large';
}

export function Slider({ isOpen, onClose, title, children, footer, size = 'default' }: SliderProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when slider is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    default: 'w-full sm:w-[480px] md:w-[560px] lg:w-[640px]',
    large: 'w-full sm:w-[600px] md:w-[720px] lg:w-[800px]'
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slider */}
      <div
        className={`fixed top-0 right-0 min-h-full ${sizeClasses[size]} bg-white shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slider-title"
      >
        <div className="flex flex-col min-h-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 id="slider-title" className="text-lg sm:text-xl font-semibold text-gray-900 truncate pr-4">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Close slider"
              aria-label="Close slider"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-scroll p-4 sm:p-6 max-h-[calc(100vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

