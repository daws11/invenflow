import React, { useState, useRef, useEffect, isValidElement } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import { formatNumberInput, parseNumberInput, formatCurrency } from '../utils/formatters';

interface BasicInlineEditProps {
  value: string | number | null;
  onSave: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  rows?: number;
  displayValue?: React.ReactNode; // For custom display formatting
  maxLength?: number;
  validation?: (value: any) => string | null;
  allowCustom?: boolean;
  customPlaceholder?: string;
  renderValue?: (value: string | number | null) => React.ReactNode;
}

export function BasicInlineEdit({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  className = '',
  rows = 3,
  displayValue,
  maxLength,
  validation,
  allowCustom: _allowCustom,
  customPlaceholder: _customPlaceholder,
  renderValue,
}: BasicInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [rawEditValue, setRawEditValue] = useState('');
  const [optimisticValue, setOptimisticValue] = useState<string | number | null>(null);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (type === 'number' && value !== null && value !== undefined) {
      // For number inputs, store raw value and formatted display value
      const rawValue = value.toString();
      setRawEditValue(rawValue);
      setEditValue(formatNumberInput(value));
    } else {
      const stringValue = value?.toString() || '';
      setRawEditValue(stringValue);
      setEditValue(stringValue);
    }
    // Reset optimistic value when actual value updates
    if (optimisticValue !== null && value !== null && value.toString() === optimisticValue.toString()) {
      setOptimisticValue(null);
      setHasError(false);
    }
  }, [value, optimisticValue, type]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easier editing
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveValue = async () => {
    const newValue = type === 'number' ? parseNumberInput(rawEditValue) : editValue;

    // Run validation if provided
    if (validation) {
      const validationError = validation(newValue);
      if (validationError) {
        setHasError(true);
        setTimeout(() => setHasError(false), 3000);
        return;
      }
    }

    // Optimistic update - show the new value immediately
    setOptimisticValue(newValue);
    setIsEditing(false);
    setHasError(false);

    try {
      // Save in background without showing loading
      await onSave(newValue);
      // Success - optimistic value will be cleared when prop updates
    } catch (error) {
      console.error('Save failed:', error);
      // Revert optimistic update on error
      setOptimisticValue(null);
      setHasError(true);
      // Show error briefly then hide
      setTimeout(() => setHasError(false), 3000);
    }
  };

  const cancelEdit = () => {
    if (type === 'number' && value !== null && value !== undefined) {
      const rawValue = value.toString();
      setRawEditValue(rawValue);
      setEditValue(formatNumberInput(value));
    } else {
      const stringValue = value?.toString() || '';
      setRawEditValue(stringValue);
      setEditValue(stringValue);
    }
    setIsEditing(false);
    setHasError(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      saveValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleFocus = () => {
    if (type === 'number') {
      // When focusing number input, show raw value for easy editing
      setEditValue(rawEditValue);
    }
  };

  const handleBlur = () => {
    if (type === 'number') {
      // When blurring number input, format the display value
      const formatted = formatNumberInput(rawEditValue);
      setEditValue(formatted);
    }
    saveValue();
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    setOptimisticValue(newValue);
    
    onSave(newValue).catch((error) => {
      console.error('Save failed:', error);
      setOptimisticValue(null);
      setHasError(true);
      setTimeout(() => setHasError(false), 3000);
    });
  };

  if (isEditing && type !== 'select') {
    return (
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={saveValue}
            rows={rows}
            maxLength={maxLength}
            className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y shadow-sm"
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type === 'number' ? 'text' : type} // Use text input for numbers to allow formatting
            value={editValue}
            onChange={(e) => {
              const newValue = e.target.value;
              if (type === 'number') {
                // For number inputs, store raw value and display formatted value
                setRawEditValue(newValue);
                setEditValue(newValue); // Show raw value while typing
              } else {
                setEditValue(newValue);
                setRawEditValue(newValue);
              }
            }}
            onFocus={type === 'number' ? handleFocus : undefined}
            onBlur={type === 'number' ? handleBlur : saveValue}
            onKeyDown={handleKeyPress}
            maxLength={maxLength}
            className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
            placeholder={placeholder}
          />
        )}
        
        {/* Help text with smooth animation */}
        <div className="mt-2 text-xs text-gray-500 opacity-80 transition-all duration-200 animate-fade-in">
          Press Enter to save, Escape to cancel
        </div>
      </div>
    );
  }

  // Use optimistic value if available, otherwise use actual value
  const displayedValue = optimisticValue !== null ? optimisticValue : value;

  // For custom displayValue with optimistic values, create formatted display for numbers
  const getOptimisticDisplayValue = () => {
    if (!optimisticValue || !displayValue || type !== 'number') return null;

    // For number types, we need to create a new displayValue with the optimistic value
    // This assumes the parent passed a displayValue that uses formatCurrency or similar

    // Try to extract the icon from the original displayValue if it's a React element
    let iconElement = null;
    if (isValidElement(displayValue) && displayValue.props.children) {
      const children = displayValue.props.children;
      if (Array.isArray(children) && children.length > 0) {
        iconElement = children[0];
      }
    }

    return (
      <div className="flex items-center">
        {iconElement}
        <span className="text-xs text-gray-600">{formatCurrency(optimisticValue)}</span>
      </div>
    );
  };

  // For custom displayValue, we need to check if we should show optimistic or custom display
  const shouldShowOptimistic = optimisticValue !== null && !displayValue;
  const optimisticDisplayValue = getOptimisticDisplayValue();
  const hasValue = displayedValue !== null && displayedValue !== '' && displayedValue !== undefined;

  return (
    <div className="relative">
      <div 
        className={`group cursor-pointer rounded-md px-3 py-2 border border-transparent hover:border-blue-200 hover:bg-blue-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 focus-within:bg-white transition-all duration-200 ease-out ${
          hasError ? 'bg-red-50 border-red-200' : 'hover:shadow-sm'
        } ${className} relative`}
        onClick={type !== 'select' ? startEdit : undefined}
      >
        <div className="flex items-center justify-between min-h-[2rem]">
          <div className="flex-1 min-w-0">
            {renderValue && hasValue ? (
              renderValue(displayedValue)
            ) : optimisticDisplayValue ? (
              optimisticDisplayValue
            ) : displayValue && !shouldShowOptimistic ? (
              displayValue
            ) : (
              <span className={`text-sm leading-relaxed ${!displayedValue ? 'text-gray-400 italic' : 'text-gray-900'} ${
                optimisticValue !== null ? 'opacity-90' : ''
              } transition-opacity duration-200`}>
                {displayedValue?.toString() || placeholder}
              </span>
            )}
          </div>
          <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
            {/* Loading indicator for optimistic updates */}
            {optimisticValue !== null && (
              <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin"></div>
            )}
            <PencilIcon className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110" />
          </div>
        </div>

        {/* Select Overlay for One-Click Dropdown */}
        {type === 'select' && (
          <select
            value={editValue}
            onChange={handleSelectChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
            onClick={(e) => e.stopPropagation()}
          >
             <option value="">{placeholder}</option>
             {options.map((option) => (
               <option key={option.value} value={option.value}>
                 {option.label}
               </option>
             ))}
          </select>
        )}
      </div>
      
      {/* Enhanced error indicator */}
      {hasError && (
        <div className="absolute -bottom-6 left-0 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md shadow-sm border border-red-200 animate-fade-in">
          Failed to save. Click to retry.
        </div>
      )}
    </div>
  );
}
