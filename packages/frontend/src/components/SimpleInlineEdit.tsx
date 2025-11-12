import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

interface SimpleInlineEditProps {
  value: string | number | null;
  onSave: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: React.ReactNode;
  validation?: (value: string | number) => string | null;
  rows?: number;
  maxLength?: number;
}

export function SimpleInlineEdit({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  disabled = false,
  className = '',
  displayValue,
  validation,
  rows = 3,
  maxLength,
}: SimpleInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize edit value
  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const currentEditValue = editValue;
    const currentValue = value?.toString() || '';

    // Don't save if value hasn't changed
    if (currentEditValue === currentValue) {
      setIsEditing(false);
      return;
    }

    // Validation
    if (validation) {
      const validationError = validation(type === 'number' ? Number(currentEditValue) : currentEditValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Length validation
    if (maxLength && currentEditValue.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newValue = type === 'number' ? Number(currentEditValue) : currentEditValue;
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value?.toString() || '');
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    setError(null);

    // For select, save immediately
    if (type === 'select') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (newValue !== (value?.toString() || '')) {
        handleSave();
      }
      return;
    }

    // For other inputs, auto-save after 1.5 seconds of no typing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (newValue !== (value?.toString() || '')) {
        handleSave();
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (type !== 'textarea' || e.ctrlKey)) {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save on blur if there are changes
    const currentEditValue = editValue;
    const currentValue = value?.toString() || '';
    
    if (currentEditValue !== currentValue) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="relative">
          {type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
          
          {isSaving && (
            <div className="absolute right-2 top-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-600">{error}</div>
        )}

        {maxLength && (
          <div className="text-xs text-gray-500 text-right">
            {editValue.length}/{maxLength}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Press Enter to save, Escape to cancel, or click outside to auto-save
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group cursor-pointer hover:bg-gray-50 rounded-md px-3 py-2 min-h-[2.5rem] border border-transparent hover:border-gray-200 transition-all ${className}`}
      onClick={handleEdit}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {displayValue || (
            <span className={`text-sm ${!value ? 'text-gray-400 italic' : 'text-gray-900'}`}>
              {value?.toString() || placeholder}
            </span>
          )}
        </div>
        {!disabled && (
          <PencilIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}
