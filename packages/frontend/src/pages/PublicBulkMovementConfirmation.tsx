import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { bulkMovementApi } from '../utils/api';
import type { PublicBulkMovementResponse, ConfirmBulkMovementItem } from '@invenflow/shared';
import { formatBulkMovementDate, getTimeRemaining } from '../utils/bulkMovementHelpers';

export default function PublicBulkMovementConfirmation() {
  const { token } = useParams<{ token: string }>();
  const [bulkMovement, setBulkMovement] = useState<PublicBulkMovementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Form state
  const [confirmedBy, setConfirmedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (token) {
      loadBulkMovement();
    }
  }, [token]);

  const loadBulkMovement = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await bulkMovementApi.getByToken(token);
      setBulkMovement(data);

      // Initialize quantities with sent amounts
      const initialQuantities: Record<string, number> = {};
      data.items.forEach(item => {
        initialQuantities[item.id] = item.quantitySent;
      });
      setQuantities(initialQuantities);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bulk movement');
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleConfirm = async () => {
    if (!token || !bulkMovement) return;

    if (!confirmedBy.trim()) {
      alert('Please enter your name');
      return;
    }

    // Validate quantities
    for (const item of bulkMovement.items) {
      const receivedQty = quantities[item.id] || 0;
      if (receivedQty > item.quantitySent) {
        alert(`Received quantity cannot exceed sent quantity for ${item.productDetails}`);
        return;
      }
      if (receivedQty < 0) {
        alert('Received quantity cannot be negative');
        return;
      }
    }

    setConfirming(true);

    try {
      const confirmData: ConfirmBulkMovementItem[] = bulkMovement.items.map(item => ({
        itemId: item.id,
        quantityReceived: quantities[item.id] || 0,
      }));

      await bulkMovementApi.confirm(token, {
        confirmedBy: confirmedBy.trim(),
        items: confirmData,
        notes: notes.trim() || null,
      });

      setConfirmed(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm bulk movement');
    } finally {
      setConfirming(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error || !bulkMovement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <XCircleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Bulk movement not found'}</p>
        </div>
      </div>
    );
  }

  // Already confirmed
  if (bulkMovement.status === 'received' || confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Confirmed</h1>
          <p className="text-gray-600 mb-4">This bulk movement has already been confirmed.</p>
          {bulkMovement.confirmedBy && (
            <p className="text-sm text-gray-500">Confirmed by: {bulkMovement.confirmedBy}</p>
          )}
          {bulkMovement.confirmedAt && (
            <p className="text-sm text-gray-500">{formatBulkMovementDate(bulkMovement.confirmedAt)}</p>
          )}
        </div>
      </div>
    );
  }

  // Expired
  if (bulkMovement.isExpired || bulkMovement.status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <ClockIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">
            This confirmation link has expired. Please contact the sender for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Confirmation form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Bulk Movement Confirmation</h1>
            <p className="text-blue-100">Please confirm receipt of the items below</p>
          </div>

          {/* Movement Info */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">From</h3>
                <p className="text-lg font-semibold text-gray-900">{bulkMovement.fromLocation.name}</p>
                <p className="text-sm text-gray-600">{bulkMovement.fromLocation.area}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">To</h3>
                <p className="text-lg font-semibold text-gray-900">{bulkMovement.toLocation.name}</p>
                <p className="text-sm text-gray-600">{bulkMovement.toLocation.area}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent on {formatBulkMovementDate(bulkMovement.createdAt)}</p>
              </div>
              <div className="text-sm font-medium text-orange-600">
                {getTimeRemaining(bulkMovement.tokenExpiresAt)}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Sent</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Received</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkMovement.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {item.productImage && (
                            <img src={item.productImage} alt="" className="w-10 h-10 rounded object-cover mr-3" />
                          )}
                          <div className="text-sm font-medium text-gray-900">{item.productDetails}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.sku}</td>
                      <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{item.quantitySent}</td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          max={item.quantitySent}
                          value={quantities[item.id] || 0}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                      {bulkMovement.items.reduce((sum, item) => sum + item.quantitySent, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                      {Object.values(quantities).reduce((sum, qty) => sum + qty, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Confirmation Form */}
          <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirmation Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmedBy}
                  onChange={(e) => setConfirmedBy(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about the delivery..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={confirming || !confirmedBy.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirming ? 'Confirming...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

