import { useState } from 'react';
import { GroupedInventoryItem } from '@invenflow/shared';
import { getStatusIcon, getStatusLabel } from '../utils/productStatus';
import { StatusDetailModal } from './StatusDetailModal';

interface InventoryGroupedViewProps {
  items: GroupedInventoryItem[];
  loading: boolean;
}

type ProductStatus = 'incoming' | 'received' | 'stored' | 'used';

export const InventoryGroupedView = ({ items, loading }: InventoryGroupedViewProps) => {
  const [selectedStatus, setSelectedStatus] = useState<{
    sku: string;
    status: ProductStatus;
    productName: string;
  } | null>(null);

  const handleStatusClick = (sku: string, status: ProductStatus, productName: string) => {
    setSelectedStatus({ sku, status, productName });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.sku}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
          >
            {/* Product Image & Basic Info */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-lg">
                    {item.productName}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono mt-1">SKU: {item.sku}</p>
                  {item.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                        </svg>
                        {item.category}
                      </span>
                    </p>
                  )}
                  {item.supplier && (
                    <p className="text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {item.supplier}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{item.totalStock}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Stock</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{item.available}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Available</p>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Status Breakdown
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {/* Incoming */}
                  <button
                    onClick={() => handleStatusClick(item.sku, 'incoming', item.productName)}
                    disabled={item.statusBreakdown.incoming === 0}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${
                        item.statusBreakdown.incoming > 0
                          ? 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer'
                          : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon('incoming')}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {getStatusLabel('incoming')}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {item.statusBreakdown.incoming}
                    </span>
                  </button>

                  {/* Received */}
                  <button
                    onClick={() => handleStatusClick(item.sku, 'received', item.productName)}
                    disabled={item.statusBreakdown.received === 0}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${
                        item.statusBreakdown.received > 0
                          ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 cursor-pointer'
                          : 'border-blue-200 bg-blue-50 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon('received')}</span>
                      <span className="text-sm font-medium text-blue-700">
                        {getStatusLabel('received')}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      {item.statusBreakdown.received}
                    </span>
                  </button>

                  {/* Stored */}
                  <button
                    onClick={() => handleStatusClick(item.sku, 'stored', item.productName)}
                    disabled={item.statusBreakdown.stored === 0}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${
                        item.statusBreakdown.stored > 0
                          ? 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                          : 'border-green-200 bg-green-50 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon('stored')}</span>
                      <span className="text-sm font-medium text-green-700">
                        {getStatusLabel('stored')}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-green-900">
                      {item.statusBreakdown.stored}
                    </span>
                  </button>

                  {/* Used */}
                  <button
                    onClick={() => handleStatusClick(item.sku, 'used', item.productName)}
                    disabled={item.statusBreakdown.used === 0}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${
                        item.statusBreakdown.used > 0
                          ? 'border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 cursor-pointer'
                          : 'border-purple-200 bg-purple-50 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon('used')}</span>
                      <span className="text-sm font-medium text-purple-700">
                        {getStatusLabel('used')}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-purple-900">
                      {item.statusBreakdown.used}
                    </span>
                  </button>
                </div>
              </div>

              {/* Unit Price */}
              {item.unitPrice && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Unit Price:{' '}
                    <span className="font-semibold text-gray-900">
                      ${item.unitPrice.toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Detail Modal */}
      {selectedStatus && (
        <StatusDetailModal
          isOpen={!!selectedStatus}
          onClose={() => setSelectedStatus(null)}
          sku={selectedStatus.sku}
          status={selectedStatus.status}
          productName={selectedStatus.productName}
        />
      )}
    </>
  );
};

