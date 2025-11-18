import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { PublicMovementResponse } from '@invenflow/shared';
import { publicMovementApi } from '../utils/api';

export default function PublicMovementConfirmation() {
  const { token } = useParams<{ token: string }>();
  const [movement, setMovement] = useState<PublicMovementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBy, setConfirmedBy] = useState('');
  const [quantityReceived, setQuantityReceived] = useState(0);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    const loadMovement = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await publicMovementApi.getByToken(token);
        setMovement(data);
        setQuantityReceived(data.quantityMoved);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Failed to load movement information. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMovement();
  }, [token]);

  const isExpired =
    !movement ||
    movement.status === 'expired' ||
    (movement.tokenExpiresAt &&
      new Date(movement.tokenExpiresAt).getTime() < Date.now());

  const canConfirm =
    movement && movement.status === 'pending' && !isExpired && !success;

  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleConfirm = async () => {
    if (!token || !movement) return;
    if (!confirmedBy.trim()) {
      alert('Please enter your name before confirming.');
      return;
    }
    if (quantityReceived < 0) {
      alert('Quantity received cannot be negative.');
      return;
    }
    if (quantityReceived > movement.quantityMoved) {
      alert('Quantity received cannot exceed quantity sent.');
      return;
    }

    setConfirming(true);
    try {
      await publicMovementApi.confirm(token, {
        confirmedBy: confirmedBy.trim(),
        quantityReceived,
        notes: notes.trim() || null,
      });
      setSuccess(true);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Failed to confirm movement. Please try again later.'
      );
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !movement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <XCircleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Movement not found'}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Movement Confirmed
          </h1>
          <p className="text-gray-600">
            Thank you for confirming the receipt. The inventory has been
            updated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 uppercase tracking-wide">
                  Movement Confirmation
                </p>
                <h1 className="text-2xl font-semibold text-white mt-1">
                  {movement.product.productDetails}
                </h1>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                  {movement.status === 'pending'
                    ? 'Pending Confirmation'
                    : movement.status === 'received'
                    ? 'Confirmed'
                    : 'Expired'}
                </span>
                {movement.tokenExpiresAt && (
                  <p className="text-xs text-blue-100 mt-2 flex items-center justify-end">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Expires {formatDate(movement.tokenExpiresAt)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500 font-semibold">
                  From
                </p>
                <p className="text-gray-900 font-medium mt-1">
                  {movement.fromLocation
                    ? movement.fromLocation.name
                    : 'Warehouse'}
                </p>
                <p className="text-sm text-gray-600">
                  {movement.fromLocation?.area || 'General Stock'}
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500 font-semibold">
                  To
                </p>
                {movement.toLocation ? (
                  <>
                    <p className="text-gray-900 font-medium mt-1">
                      {movement.toLocation.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {movement.toLocation.area}
                    </p>
                  </>
                ) : movement.toPerson ? (
                  <>
                    <p className="text-gray-900 font-medium mt-1">
                      {movement.toPerson.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {movement.toPerson.departmentName || 'Assigned person'}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-600 mt-1">Not specified</p>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Quantity Sent</p>
                <p className="text-xl font-semibold text-gray-900">
                  {movement.quantityMoved} unit(s)
                </p>
              </div>
            </div>

            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <XCircleIcon className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Confirmation Link Expired
                  </p>
                  <p className="text-sm text-red-700">
                    Please request a new confirmation link from the sender.
                  </p>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <input
                  type="text"
                  value={confirmedBy}
                  onChange={(e) => setConfirmedBy(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!canConfirm}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity Received
                </label>
                <input
                  type="number"
                  min={0}
                  max={movement.quantityMoved}
                  value={quantityReceived}
                  onChange={(e) => setQuantityReceived(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!canConfirm}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum {movement.quantityMoved} unit(s)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Include remarks if quantity differs or items are damaged"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!canConfirm}
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={!canConfirm || confirming}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

