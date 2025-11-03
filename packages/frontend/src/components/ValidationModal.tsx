import React, { useState } from 'react';
import { X, Upload, User, MapPin, Camera } from 'lucide-react';
import { ValidationStatus, ProductValidation } from '@invenflow/shared';
import { useLocationStore } from '../store/locationStore';
import ImageUpload from './ImageUpload';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  columnStatus: ValidationStatus;
  onSubmit: (validationData: Omit<ProductValidation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

export default function ValidationModal({
  isOpen,
  onClose,
  productId,
  columnStatus,
  onSubmit,
  isLoading = false
}: ValidationModalProps) {
  const [formData, setFormData] = useState({
    recipientName: '',
    locationId: '',
    notes: '',
  });
  const [receivedImage, setReceivedImage] = useState<string>('');
  const [storagePhoto, setStoragePhoto] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { locations } = useLocationStore();

  React.useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        recipientName: '',
        locationId: '',
        notes: '',
      });
      setReceivedImage('');
      setStoragePhoto('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipientName.trim()) {
      newErrors.recipientName = 'Nama penerima wajib diisi';
    }

    if (columnStatus === 'Received') {
      if (!receivedImage) {
        newErrors.receivedImage = 'Gambar penerimaan wajib diupload';
      }
    }

    if (columnStatus === 'Stored') {
      if (!formData.locationId) {
        newErrors.locationId = 'Lokasi penyimpanan wajib dipilih';
      }
      if (!storagePhoto) {
        newErrors.storagePhoto = 'Gambar storage wajib diupload';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const validationData = {
      productId,
      columnStatus,
      recipientName: formData.recipientName,
      locationId: formData.locationId || undefined,
      receivedImage: columnStatus === 'Received' ? receivedImage : undefined,
      storagePhoto: columnStatus === 'Stored' ? storagePhoto : undefined,
      notes: formData.notes || undefined,
      validatedBy: 'current-user', // TODO: Get from auth context
    };

    onSubmit(validationData);
  };

  const isForReceived = columnStatus === 'Received';
  const isForStored = columnStatus === 'Stored';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Validasi {isForReceived ? 'Penerimaan' : 'Penyimpanan'} Barang
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Status:</strong> {columnStatus}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Product ID:</strong> {productId}
            </p>
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Nama Penerima
            </label>
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.recipientName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Masukkan nama penerima barang"
              disabled={isLoading}
            />
            {errors.recipientName && (
              <p className="mt-1 text-sm text-red-600">{errors.recipientName}</p>
            )}
          </div>

          {/* Location Selection (for Stored status) */}
          {isForStored && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Lokasi Penyimpanan
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.locationId ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Pilih lokasi penyimpanan</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              {errors.locationId && (
                <p className="mt-1 text-sm text-red-600">{errors.locationId}</p>
              )}
            </div>
          )}

          {/* Image Upload for Received Status */}
          {isForReceived && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Foto Penerimaan Barang
              </label>
              <ImageUpload
                value={receivedImage}
                onChange={setReceivedImage}
                placeholder="Upload foto barang saat diterima"
                disabled={isLoading}
              />
              {errors.receivedImage && (
                <p className="mt-1 text-sm text-red-600">{errors.receivedImage}</p>
              )}
            </div>
          )}

          {/* Image Upload for Stored Status */}
          {isForStored && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Foto Lokasi Penyimpanan
              </label>
              <ImageUpload
                value={storagePhoto}
                onChange={setStoragePhoto}
                placeholder="Upload foto tempat penyimpanan barang"
                disabled={isLoading}
              />
              {errors.storagePhoto && (
                <p className="mt-1 text-sm text-red-600">{errors.storagePhoto}</p>
              )}
            </div>
          )}

          {/* Notes (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tambahkan catatan jika diperlukan"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Validasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}