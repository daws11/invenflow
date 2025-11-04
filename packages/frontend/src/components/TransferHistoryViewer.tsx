import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { transferLogApi, type TransferLogWithRelations } from '../utils/api';

interface TransferHistoryViewerProps {
  productId?: string;
  kanbanId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferHistoryViewer({
  productId,
  kanbanId,
  isOpen,
  onClose
}: TransferHistoryViewerProps) {
  const [logs, setLogs] = useState<TransferLogWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);

    try {
      const pagination = { limit: 20, offset: (pageNum - 1) * 20 };

      let data: TransferLogWithRelations[] = [];

      if (productId) {
        data = await transferLogApi.getByProduct(productId, pagination);
      } else if (kanbanId) {
        data = await transferLogApi.getByKanban(kanbanId, pagination);
      } else {
        data = await transferLogApi.getAll(pagination);
      }

      if (append) {
        setLogs(prev => [...prev, ...data]);
      } else {
        setLogs(data);
      }

      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
        setError(message || 'Failed to fetch transfer logs');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch transfer logs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (productId || kanbanId)) {
      fetchLogs(1, false);
    }
  }, [isOpen, productId, kanbanId]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(page + 1, true);
    }
  };

  const getTransferTypeColor = (type: string) => {
    switch (type) {
      case 'automatic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'manual':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (input: string | Date) => {
    const date = input instanceof Date ? input : new Date(input);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            Transfer History
            {productId && ' - Product'}
            {kanbanId && ' - Kanban Board'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && logs.length === 0 && (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-600">Loading transfer history...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No transfer history found</p>
              <p className="text-gray-400 text-sm">
                Transfer history will appear here when products are moved between boards.
              </p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
                    <div className="text-sm text-gray-600">Total Transfers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {logs.filter(log => log.transferType === 'automatic').length}
                    </div>
                    <div className="text-sm text-gray-600">Automatic</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {logs.filter(log => log.transferType === 'manual').length}
                    </div>
                    <div className="text-sm text-gray-600">Manual</div>
                  </div>
                </div>
              </div>

              {/* Transfer Logs List */}
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTransferTypeColor(
                            log.transferType
                          )}`}
                        >
                          {log.transferType === 'automatic' ? '🔄' : '👤'} {log.transferType}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {log.transferredBy && (
                        <span className="text-xs text-gray-500">
                          by {log.transferredBy}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    {log.product && (
                      <div className="mb-3 p-2 bg-gray-50 rounded">
                        <div className="font-medium text-sm text-gray-900">
                          {log.product.productDetails}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {log.product.sku && <span className="mr-3">SKU: {log.product.sku}</span>}
                          {log.product.category && <span>Category: {log.product.category}</span>}
                        </div>
                      </div>
                    )}

                    {/* Transfer Flow */}
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="flex-1">
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <div className="font-medium text-blue-900">
                            {log.fromKanban?.name || 'Unknown Board'}
                          </div>
                          <div className="text-xs text-blue-700">
                            {log.fromKanban?.type === 'order' ? 'Order' : 'Receive'} • {log.fromColumn}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="font-medium text-green-900">
                            {log.toKanban?.name || 'Unknown Board'}
                          </div>
                          <div className="text-xs text-green-700">
                            {log.toKanban?.type === 'order' ? 'Order' : 'Receive'} • {log.toColumn}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {log.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Notes:</span> {log.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn-secondary disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
