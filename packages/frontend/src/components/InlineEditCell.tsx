import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface InlineEditCellProps {
  value: string | number | null;
  onSave: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: React.ReactNode; // For custom display formatting
  validation?: (value: string | number) => string | null; // Return error message or null
  rows?: number; // For textarea type
  maxLength?: number; // Character limit
  allowCustom?: boolean; // For select with custom option
  customPlaceholder?: string; // Placeholder for custom input
}

export function InlineEditCell({
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
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    const valueStr = value?.toString() || '';
    setEditValue(valueStr);
    
    // Check if current value is a custom value (not in options)
    if (allowCustom && type === 'select' && valueStr && !options.some(opt => opt.value === valueStr)) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [value, allowCustom, type, options]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value?.toString() || '');
    setError(null);
    setIsCustom(Boolean(allowCustom && type === 'select' && value && !options.some(opt => opt.value === value.toString())));
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Validation
    if (validation) {
      const validationError = validation(type === 'number' ? Number(editValue) : editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Additional validation for maxLength
    if (maxLength && editValue.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    // Don't save if value hasn't changed
    const newValue = type === 'number' ? Number(editValue) : editValue;
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (type !== 'textarea' || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'CUSTOM') {
      setIsCustom(true);
      setEditValue('');
    } else {
      setIsCustom(false);
      setEditValue(selectedValue);
    }
  };

  const displayText = displayValue || value?.toString() || '';

  if (isEditing) {
    return (
      <div className="flex items-start space-x-1">
        <div className="flex-1">
          {type === 'select' ? (
            <div className="space-y-2">
              {!isCustom ? (
                <select
                  ref={inputRef as React.RefObject<HTMLSelectElement>}
                  value={editValue}
                  onChange={handleSelectChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full px-3 py-2 sm:px-2 sm:py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={customPlaceholder}
                    maxLength={maxLength}
                    className={`w-full px-3 py-2 sm:px-2 sm:py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              className={`w-full px-3 py-2 sm:px-2 sm:py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className={`w-full px-3 py-2 sm:px-2 sm:py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          )}
          {error && (
            <div className="text-xs text-red-600 mt-1">{error}</div>
          )}
          {maxLength && (
            <div className="text-xs text-gray-500 mt-1">
              {editValue.length}/{maxLength} characters
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-1 mt-1 sm:flex-row sm:space-y-0 sm:space-x-1 sm:mt-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 sm:p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50 touch-manipulation"
            title={type === 'textarea' ? 'Save (Ctrl+Enter)' : 'Save (Enter)'}
          >
            <CheckIcon className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-2 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 touch-manipulation"
            title="Cancel (Escape)"
          >
            <XMarkIcon className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-2 py-1 min-h-[2rem] ${className}`}
      onClick={handleEdit}
    >
      <span className={`text-sm flex-1 ${!displayText ? 'text-gray-400 italic' : ''} ${type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>
        {displayText || placeholder || 'Click to edit'}
      </span>
      {!disabled && (
        <PencilIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
      )}
    </div>
  );
}
