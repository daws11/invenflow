import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, PencilIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useAutoSave } from '../hooks/useAutoSave';

interface AutoSaveInlineEditCellProps {
  value: string | number | null;
  onSave: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: string; // For custom display formatting
  validation?: (value: string | number) => string | null; // Return error message or null
  rows?: number; // For textarea type
  maxLength?: number; // Character limit
  allowCustom?: boolean; // For select with custom option
  customPlaceholder?: string; // Placeholder for custom input
  autoSave?: boolean; // Enable auto-save
  autoSaveDelay?: number; // Auto-save delay in milliseconds
}

export function AutoSaveInlineEditCell({
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
  autoSave = false,
  autoSaveDelay = 2000,
}: AutoSaveInlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  const autoSaveState = useAutoSave({
    delay: autoSaveDelay,
    enabled: autoSave && isEditing,
    onSave: async (val) => {
      // Validate before auto-saving
      if (validation) {
        const validationError = validation(type === 'number' ? Number(val) : val);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      // Additional validation for maxLength
      if (maxLength && val.toString().length > maxLength) {
        throw new Error(`Maximum ${maxLength} characters allowed`);
      }

      const newValue = type === 'number' ? Number(val) : val;
      await onSave(newValue);
    },
    onError: (err) => {
      setError(err.message);
    }
  });

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
    autoSaveState.reset();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value?.toString() || '');
    setError(null);
    setIsCustom(allowCustom && type === 'select' && value && !options.some(opt => opt.value === value.toString()));
    autoSaveState.reset();
  };

  const handleSave = async () => {
    if (isSaving || autoSaveState.isSaving) return;

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
      autoSaveState.reset();
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
      if (autoSave) {
        autoSaveState.scheduleAutoSave(selectedValue);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    setError(null); // Clear errors on input change
    
    if (autoSave) {
      autoSaveState.scheduleAutoSave(newValue);
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
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                    placeholder={customPlaceholder}
                    maxLength={maxLength}
                    className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${
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
              placeholder={placeholder}
              maxLength={maxLength}
              className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          )}
          
          {/* Error display */}
          {(error || autoSaveState.error) && (
            <div className="text-xs text-red-600 mt-1">{error || autoSaveState.error}</div>
          )}
          
          {/* Character count */}
          {maxLength && (
            <div className="text-xs text-gray-500 mt-1">
              {editValue.length}/{maxLength} characters
            </div>
          )}
          
          {/* Auto-save status */}
          {autoSave && (
            <div className="flex items-center text-xs text-gray-500 mt-1">
              {autoSaveState.isSaving && (
                <>
                  <ClockIcon className="h-3 w-3 mr-1 animate-spin" />
                  Auto-saving...
                </>
              )}
              {autoSaveState.hasUnsavedChanges && !autoSaveState.isSaving && (
                <>
                  <ClockIcon className="h-3 w-3 mr-1" />
                  Unsaved changes
                </>
              )}
              {autoSaveState.lastSaved && !autoSaveState.hasUnsavedChanges && !autoSaveState.isSaving && (
                <>
                  <CheckIcon className="h-3 w-3 mr-1 text-green-500" />
                  Auto-saved
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-1 mt-1">
          <button
            onClick={handleSave}
            disabled={isSaving || autoSaveState.isSaving}
            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
            title={type === 'textarea' ? 'Save (Ctrl+Enter)' : 'Save (Enter)'}
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving || autoSaveState.isSaving}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
            title="Cancel (Escape)"
          >
            <XMarkIcon className="h-4 w-4" />
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
