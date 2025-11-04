import React, { useState, useRef, useEffect } from 'react';
import {
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

type ViewMode = 'grid' | 'list';

interface ViewModeOption {
  value: ViewMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LocationViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const viewModeOptions: ViewModeOption[] = [
  {
    value: 'grid',
    label: 'Grid View',
    description: 'Card layout grouped by area',
    icon: Squares2X2Icon,
  },
  {
    value: 'list',
    label: 'List View',
    description: 'Table layout with sorting',
    icon: ListBulletIcon,
  },
];

export function LocationViewModeToggle({ currentMode, onModeChange }: LocationViewModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = viewModeOptions.find(option => option.value === currentMode)!;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (mode: ViewMode) => {
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <currentOption.icon className="h-4 w-4 mr-2" />
        <span>{currentOption.label}</span>
        <ChevronDownIcon
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu">
            {viewModeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === currentMode;

              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-start">
                    <Icon className={`mt-0.5 h-5 w-5 mr-3 flex-shrink-0 ${
                      isSelected ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {option.label}
                      </p>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-3">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

