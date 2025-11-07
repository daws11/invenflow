import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface KanbanSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function KanbanSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Search products by name, SKU, supplier, priority, category...',
  className = '',
}: KanbanSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative flex items-center transition-all duration-200 ${
          isFocused
            ? 'ring-2 ring-blue-500 ring-offset-2'
            : ''
        }`}
      >
        <div className="absolute left-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon
            className={`h-5 w-5 transition-colors duration-200 ${
              isFocused ? 'text-blue-500' : 'text-gray-400'
            }`}
          />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm md:text-base transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <span>Searching in: name, SKU, supplier, priority, category, tags, location, notes</span>
        </div>
      )}
    </div>
  );
}

