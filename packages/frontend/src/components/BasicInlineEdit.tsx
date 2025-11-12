import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

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
}: BasicInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [optimisticValue, setOptimisticValue] = useState<string | number | null>(null);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value?.toString() || '');
    // Reset optimistic value when actual value updates
    if (optimisticValue !== null && value !== null && value.toString() === optimisticValue.toString()) {
      setOptimisticValue(null);
      setHasError(false);
    }
  }, [value, optimisticValue]);

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
    const newValue = type === 'number' ? Number(editValue) : editValue;
    
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
    setEditValue(value?.toString() || '');
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

  if (isEditing) {
    return (
      <div className="space-y-2">
        {type === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditValue(newValue);
              // For select, save immediately with optimistic update
              setOptimisticValue(newValue);
              setIsEditing(false);
              
              // Save in background
              onSave(newValue).catch((error) => {
                console.error('Save failed:', error);
                setOptimisticValue(null);
                setHasError(true);
                setTimeout(() => setHasError(false), 3000);
              });
            }}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={saveValue}
            rows={rows}
            maxLength={maxLength}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={saveValue}
            maxLength={maxLength}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
          />
        )}
        
        <div className="text-xs text-gray-500">
          Press Enter to save, Escape to cancel
        </div>
      </div>
    );
  }

  // Use optimistic value if available, otherwise use actual value
  const displayedValue = optimisticValue !== null ? optimisticValue : value;
  
  // For custom displayValue, we need to check if we should show optimistic or custom display
  const shouldShowOptimistic = optimisticValue !== null && !displayValue;

  return (
    <div className="relative">
      <div 
        className={`group cursor-pointer hover:bg-gray-50 rounded-md px-3 py-2 border border-transparent hover:border-gray-200 transition-colors ${
          hasError ? 'bg-red-50 border-red-200' : ''
        } ${className}`}
        onClick={startEdit}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {displayValue && !shouldShowOptimistic ? (
              displayValue
            ) : (
              <span className={`text-sm ${!displayedValue ? 'text-gray-400 italic' : 'text-gray-900'} ${
                optimisticValue !== null ? 'opacity-90' : ''
              }`}>
                {displayedValue?.toString() || placeholder}
              </span>
            )}
          </div>
          <PencilIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      {/* Error indicator */}
      {hasError && (
        <div className="absolute -bottom-6 left-0 text-xs text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm">
          Failed to save. Click to retry.
        </div>
      )}
    </div>
  );
}
