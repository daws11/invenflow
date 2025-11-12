import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PencilIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface AutoInlineEditProps {
  value: string | number | null;
  onSave: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: React.ReactNode; // For custom display formatting
  validation?: (value: string | number) => string | null;
  rows?: number;
  maxLength?: number;
  allowCustom?: boolean;
  customPlaceholder?: string;
  autoSaveDelay?: number; // Delay in ms before auto-save
}

export function AutoInlineEdit({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  disabled = false,
  className = '',
  displayValue,
  validation,
  rows = 3,
  maxLength,
  allowCustom = false,
  customPlaceholder = 'Enter custom value',
  autoSaveDelay = 800,
}: AutoInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalValueRef = useRef<string>('');

  // Initialize edit value when value changes
  useEffect(() => {
    const valueStr = value?.toString() || '';
    setEditValue(valueStr);
    originalValueRef.current = valueStr;
    
    // Check if current value is custom
    if (allowCustom && type === 'select' && valueStr && !options.some(opt => opt.value === valueStr)) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [value, allowCustom, type, options]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const performSave = useCallback(async (valueToSave: string) => {
    // Don't save if value hasn't changed
    if (valueToSave === originalValueRef.current) {
      setIsEditing(false);
      return;
    }

    // Validation
    if (validation) {
      const validationError = validation(type === 'number' ? Number(valueToSave) : valueToSave);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Additional validation for maxLength
    if (maxLength && valueToSave.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newValue = type === 'number' ? Number(valueToSave) : valueToSave;
      await onSave(newValue);
      
      // Show success feedback briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
      
      // Update original value reference
      originalValueRef.current = valueToSave;
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, type, validation, maxLength]);

  const scheduleAutoSave = useCallback((newValue: string) => {
    clearSaveTimeout();
    setError(null);
    
    // Only schedule save if value has actually changed
    if (newValue !== originalValueRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        performSave(newValue);
      }, autoSaveDelay);
    }
  }, [performSave, autoSaveDelay, clearSaveTimeout]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
    setShowSuccess(false);
  };

  const handleCancel = () => {
    clearSaveTimeout();
    setIsEditing(false);
    setEditValue(originalValueRef.current);
    setError(null);
    setIsCustom(Boolean(allowCustom && type === 'select' && value && !options.some(opt => opt.value === value.toString())));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    scheduleAutoSave(newValue);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'CUSTOM') {
      setIsCustom(true);
      setEditValue('');
    } else {
      setIsCustom(false);
      setEditValue(selectedValue);
      // Auto-save immediately for select changes (no delay)
      clearSaveTimeout();
      performSave(selectedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (type !== 'textarea' || e.ctrlKey)) {
      e.preventDefault();
      clearSaveTimeout();
      performSave(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Save on blur if there are changes
    if (editValue !== originalValueRef.current) {
      clearSaveTimeout();
      performSave(editValue);
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            {type === 'select' ? (
              <div className="space-y-2">
                {!isCustom ? (
                  <select
                    ref={inputRef as React.RefObject<HTMLSelectElement>}
                    value={editValue}
                    onChange={handleSelectChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      error ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select...</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    {allowCustom && (
                      <option value="CUSTOM">Custom...</option>
                    )}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={editValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onBlur={handleBlur}
                      placeholder={customPlaceholder}
                      maxLength={maxLength}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        error ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustom(false);
                        setEditValue(options.length > 0 ? options[0].value : '');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Choose from list
                    </button>
                  </div>
                )}
              </div>
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
                className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
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
                className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            )}
            
            {/* Status indicators */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-2">
                {error && (
                  <div className="flex items-center text-xs text-red-600">
                    <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                    {error}
                  </div>
                )}
                {isSaving && (
                  <div className="flex items-center text-xs text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                    Saving...
                  </div>
                )}
                {showSuccess && !isSaving && !error && (
                  <div className="flex items-center text-xs text-green-600">
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Saved
                  </div>
                )}
              </div>
              
              {maxLength && (
                <div className="text-xs text-gray-500">
                  {editValue.length}/{maxLength}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group cursor-pointer hover:bg-gray-50 rounded-md px-3 py-2 min-h-[2.5rem] transition-colors border border-transparent hover:border-gray-200 ${className}`}
      onClick={handleEdit}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-2">
          {displayValue ? (
            <div>{displayValue}</div>
          ) : (
            <span className={`text-sm ${!value ? 'text-gray-400 italic' : 'text-gray-900'} ${type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>
              {value?.toString() || placeholder || 'Click to edit'}
            </span>
          )}
        </div>
        {!disabled && (
          <PencilIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
