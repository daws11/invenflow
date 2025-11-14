import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  heightClassName?: string; // e.g., 'h-3/4'
}

export function BottomSheet({ isOpen, onClose, title, children, heightClassName = 'h-3/4' }: BottomSheetProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl min-h-[50vh] max-h-[90vh] ${heightClassName} transform transition-transform duration-300 ease-out flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="h-1.5 w-12 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -top-2" />
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow overflow-y-scroll p-4 max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </>
  );
}


