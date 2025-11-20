import { useState, useEffect } from 'react';
import { KanbanType, generateLocationCode } from '@invenflow/shared';
import { Slider } from './Slider';
import { useLocationStore } from '../store/locationStore';

interface CreateKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: KanbanType;
  onCreate: (name: string, type: KanbanType, description?: string | null, locationId?: string) => Promise<void>;
}

export function CreateKanbanModal({ isOpen, onClose, type, onCreate }: CreateKanbanModalProps) {
  const { locations, areas, fetchLocations, fetchAreas, createLocation } = useLocationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationArea, setNewLocationArea] = useState('');
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [createLocationError, setCreateLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchAreas();
    }
  }, [isOpen, fetchLocations, fetchAreas]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setLocationId('');
      setError(null);
      setShowCreateLocation(false);
      setNewLocationName('');
      setNewLocationArea('');
      setCreateLocationError(null);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Kanban name is required');
      return false;
    }
    if (name.trim().length < 3) {
      setError('Kanban name must be at least 3 characters');
      return false;
    }
    if (name.trim().length > 255) {
      setError('Kanban name must be less than 255 characters');
      return false;
    }
    if (type === 'receive' && !locationId) {
      setError('Location is required for receive kanbans');
      return false;
    }
    setError(null);
    return true;
  };

  const kanbanTypeConfig: Record<KanbanType, { label: string; buttonClasses: string }> = {
    order: { label: 'Order', buttonClasses: 'bg-blue-600 text-white hover:bg-blue-700' },
    receive: { label: 'Receive', buttonClasses: 'bg-green-600 text-white hover:bg-green-700' },
    investment: { label: 'Investment', buttonClasses: 'bg-yellow-600 text-white hover:bg-yellow-700' },
  };
  const currentTypeConfig = kanbanTypeConfig[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedDescription = description.trim();
      await onCreate(
        name.trim(),
        type,
        normalizedDescription.length > 0 ? normalizedDescription : null,
        type === 'receive' ? locationId : undefined
      );
      onClose();
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error('Failed to create kanban:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
          currentTypeConfig.buttonClasses
        }`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating...
          </>
        ) : (
          `Create ${currentTypeConfig.label} Kanban`
        )}
      </button>
    </div>
  );

  const ensureUniqueCode = (baseCode: string): string => {
    const existingCodes = new Set(locations.map((l) => l.code));
    if (!existingCodes.has(baseCode)) return baseCode;
    let suffix = 2;
    let candidate = `${baseCode}-${suffix}`;
    while (existingCodes.has(candidate)) {
      suffix += 1;
      candidate = `${baseCode}-${suffix}`;
    }
    return candidate;
  };

  const handleCreateLocation = async () => {
    const trimmedName = newLocationName.trim();
    const trimmedArea = newLocationArea.trim();
    if (!trimmedName || !trimmedArea) {
      setCreateLocationError('Nama lokasi dan area wajib diisi');
      return;
    }
    setCreateLocationError(null);
    setIsCreatingLocation(true);
    try {
      const baseCode = generateLocationCode(trimmedArea, trimmedName);
      let uniqueCode = ensureUniqueCode(baseCode);

      // Try create; if server reports duplicate code, retry with incremented suffix a few times
      let attempts = 0;
      const maxAttempts = 5;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const created = await createLocation({
            name: trimmedName,
            area: trimmedArea,
            code: uniqueCode,
          });
          setLocationId(created.id);
          setShowCreateLocation(false);
          setNewLocationName('');
          setNewLocationArea('');
          setCreateLocationError(null);
          break;
        } catch (e: any) {
          const message = e?.response?.data?.message || e?.message || '';
          if (typeof message === 'string' && message.toLowerCase().includes('code') && message.toLowerCase().includes('exists') && attempts < maxAttempts) {
            attempts += 1;
            uniqueCode = ensureUniqueCode(`${baseCode}-${attempts + 1}`);
            continue;
          }
          throw e;
        }
      }
    } catch (err: any) {
      setCreateLocationError(
        err?.response?.data?.message || err?.message || 'Gagal membuat lokasi baru'
      );
    } finally {
      setIsCreatingLocation(false);
    }
  };

  return (
    <Slider
      isOpen={isOpen}
      onClose={onClose}
      title={`Create ${currentTypeConfig.label} Kanban`}
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kanban Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={`Enter ${type} kanban name...`}
                disabled={isSubmitting}
                autoFocus
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Minimum 3 characters, maximum 255 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                placeholder="Optional short description for this kanban board"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank to use the default fallback text.</p>
            </div>

            {/* Location selector for receive kanbans */}
            {type === 'receive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={locationId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '__create__') {
                      // Open inline create UI and keep selection empty
                      setShowCreateLocation(true);
                      setLocationId('');
                    } else {
                      setLocationId(value);
                    }
                    if (error) setError(null);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    error && !locationId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select a location...</option>
                   <option value="__create__">+ Create new location...</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.area}
                      {location.building && ` (${location.building}${location.floor ? `, Floor ${location.floor}` : ''})`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  All products transferred to this receive kanban will be automatically assigned to this location.
                </p>
                <div className="mt-3">
                  {!showCreateLocation ? (
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => setShowCreateLocation(true)}
                      disabled={isSubmitting}
                    >
                      + Create new location
                    </button>
                  ) : (
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Location Name
                          </label>
                          <input
                            type="text"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="e.g., Rak A-1"
                            disabled={isCreatingLocation || isSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Area
                          </label>
                          <input
                            type="text"
                            list="area-options"
                            value={newLocationArea}
                            onChange={(e) => setNewLocationArea(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="e.g., Gudang Utama"
                            disabled={isCreatingLocation || isSubmitting}
                          />
                          <datalist id="area-options">
                            {areas.map((a) => (
                              <option key={a} value={a} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      {createLocationError && (
                        <p className="mt-2 text-xs text-red-600">{createLocationError}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCreateLocation}
                          disabled={isCreatingLocation || isSubmitting}
                          className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {isCreatingLocation ? 'Saving...' : 'Save & Use'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateLocation(false);
                            setNewLocationName('');
                            setNewLocationArea('');
                            setCreateLocationError(null);
                          }}
                          disabled={isCreatingLocation || isSubmitting}
                          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 ${
                  type === 'order' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {type === 'order'
                      ? 'Track purchasing requests and orders'
                      : 'Track inventory reception and storage'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
    </Slider>
  );
}

