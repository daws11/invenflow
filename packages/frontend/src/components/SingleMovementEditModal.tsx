import { useMemo, useState } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { EnrichedMovementLog } from '../store/movementStore';
import type { Location, Person } from '@invenflow/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  movement: EnrichedMovementLog | null;
  locations: Location[];
  persons: Person[];
  onSave: (data: {
    toArea?: string | null;
    toLocationId?: string | null;
    toPersonId?: string | null;
    quantity?: number;
    notes?: string | null;
  }) => Promise<void>;
}

export default function SingleMovementEditModal({
  isOpen,
  onClose,
  movement,
  locations,
  persons,
  onSave,
}: Props) {
  if (!isOpen || !movement) return null;

  const [toArea, setToArea] = useState<string>(movement?.toLocation?.area || movement?.toArea || '');
  const [toLocationId, setToLocationId] = useState<string | null>(movement?.toLocation?.id || null);
  const [toPersonId, setToPersonId] = useState<string | null>(movement?.toPerson?.id || null);
  const [quantity, setQuantity] = useState<number>(movement?.quantityMoved || 1);
  const [notes, setNotes] = useState<string>(movement?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        toArea: toArea || null,
        toLocationId,
        toPersonId,
        quantity,
        notes: notes || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const totalQuantity = quantity;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-2xl transform transition-transform">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="p-2 bg-indigo-600 rounded-lg mr-3">
                      <ArrowRightIcon className="w-6 h-6 text-white" />
                    </div>
                    Edit Movement
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    Editing 1 item ({totalQuantity} unit{totalQuantity > 1 ? 's' : ''})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-3 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                
                {/* FROM (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From (Read-only)
                  </label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {movement.fromLocation?.name || movement.fromPerson?.name || '-'}
                    {movement.fromLocation?.area ? ` - ${movement.fromLocation.area}` : ''}
                  </div>
                </div>

                {/* TO - Area / Location / Person */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Area
                    </label>
                    <input
                      type="text"
                      value={toArea}
                      onChange={(e) => setToArea(e.target.value)}
                      placeholder="Enter destination area"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Location (optional)
                    </label>
                    <select
                      value={toLocationId || ''}
                      onChange={(e) => setToLocationId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Use general location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} - {loc.area}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Person (optional)
                  </label>
                  <select
                    value={toPersonId || ''}
                    onChange={(e) => setToPersonId(e.target.value || null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Not assigning to person</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ITEMS (single) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Items (1)
                  </label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{movement.product?.productDetails || 'Unknown'}</div>
                      {movement.product?.sku && (
                        <div className="text-sm text-gray-500">SKU: {movement.product.sku}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* NOTES */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or special instructions..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    maxLength={1000}
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {notes.length}/1000 characters
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

