import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accept?: string;
  maxSize?: number; // in MB
}

export default function ImageUpload({
  value,
  onChange,
  placeholder = 'Klik atau drag untuk upload gambar',
  disabled = false,
  accept = 'image/*',
  maxSize = 5
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Hanya file gambar yang diizinkan');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`Ukuran file maksimal ${maxSize}MB`);
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || errorData.error || 'Upload failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Use publicUrl for better accessibility without authentication
      onChange(data.file.publicUrl || data.file.url);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Gagal upload gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setUploadError('');
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload area or image preview */}
      {!value ? (
        // Upload area
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isUploading ? 'pointer-events-none' : ''}
          `}
        >
          {/* Upload icon */}
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}

            <div>
              <p className="text-sm text-gray-600">
                {isUploading ? 'Mengupload...' : placeholder}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WebP (max {maxSize}MB)
              </p>
            </div>
          </div>

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <Upload className="w-6 h-6 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Drop gambar di sini</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Image preview
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-gray-300">
            <img
              src={value}
              alt="Uploaded image"
              className="w-full h-48 object-cover"
            />

            {/* Overlay with remove button */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
              <button
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all"
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image info */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">Gambar terupload</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={disabled}
            >
              Ganti gambar
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {uploadError}
        </div>
      )}
    </div>
  );
}