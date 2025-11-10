import { useState } from 'react';
import { GroupedInventoryItem } from '@invenflow/shared';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { StatusDetailModal } from './StatusDetailModal';
import { LocationDetailsDropdown } from './LocationDetailsDropdown';

interface InventoryGroupedListProps {
  items: GroupedInventoryItem[];
  loading: boolean;
}

type ProductStatus = 'incoming' | 'received' | 'stored' | 'used';

export const InventoryGroupedList = ({ items, loading }: InventoryGroupedListProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<{
    sku: string;
    status: ProductStatus;
    productName: string;
  } | null>(null);

  const toggleRow = (sku: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedRows(newExpanded);
  };

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
        <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No products found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {/* Expand toggle */}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider bg-purple-50">
                <div className="flex items-center justify-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>Incoming</span>
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-yellow-600 uppercase tracking-wider bg-yellow-50">
                <div className="flex items-center justify-center space-x-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Received</span>
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider bg-green-50">
                <div className="flex items-center justify-center space-x-1">
                  <ArchiveBoxIcon className="h-4 w-4" />
                  <span>Stored</span>
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50">
                <div className="flex items-center justify-center space-x-1">
                  <UserIcon className="h-4 w-4" />
                  <span>Used</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Stock
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const isExpanded = expandedRows.has(item.sku);
              return (
                <>
                  {/* Main Row */}
                  <tr
                    key={item.sku}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.sku);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                            <CubeIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.productName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.supplier || '-'}
                    </td>
                    
                    {/* Status Columns - Clickable */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.statusBreakdown.incoming > 0) {
                            handleStatusClick(item.sku, 'incoming', item.productName);
                          }
                        }}
                        disabled={item.statusBreakdown.incoming === 0}
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                          item.statusBreakdown.incoming > 0
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer shadow-sm hover:shadow'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={item.statusBreakdown.incoming > 0 ? 'Click to view details' : 'No items'}
                      >
                        {item.statusBreakdown.incoming}
                      </button>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.statusBreakdown.received > 0) {
                            handleStatusClick(item.sku, 'received', item.productName);
                          }
                        }}
                        disabled={item.statusBreakdown.received === 0}
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                          item.statusBreakdown.received > 0
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 cursor-pointer shadow-sm hover:shadow'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={item.statusBreakdown.received > 0 ? 'Click to view details' : 'No items'}
                      >
                        {item.statusBreakdown.received}
                      </button>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.statusBreakdown.stored > 0) {
                            handleStatusClick(item.sku, 'stored', item.productName);
                          }
                        }}
                        disabled={item.statusBreakdown.stored === 0}
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                          item.statusBreakdown.stored > 0
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer shadow-sm hover:shadow'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={item.statusBreakdown.stored > 0 ? 'Click to view details' : 'No items'}
                      >
                        {item.statusBreakdown.stored}
                      </button>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.statusBreakdown.used > 0) {
                            handleStatusClick(item.sku, 'used', item.productName);
                          }
                        }}
                        disabled={item.statusBreakdown.used === 0}
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                          item.statusBreakdown.used > 0
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer shadow-sm hover:shadow'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={item.statusBreakdown.used > 0 ? 'Click to view details' : 'No items'}
                      >
                        {item.statusBreakdown.used}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.totalStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${
                        item.available > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.unitPrice 
                        ? `Rp ${item.unitPrice.toLocaleString('id-ID')}`
                        : '-'}
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={12} className="p-0">
                        <LocationDetailsDropdown 
                          sku={item.sku} 
                          isOpen={isExpanded} 
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status Detail Modal */}
      {selectedStatus && (
        <StatusDetailModal
          isOpen={true}
          sku={selectedStatus.sku}
          status={selectedStatus.status}
          productName={selectedStatus.productName}
          onClose={() => setSelectedStatus(null)}
        />
      )}
    </>
  );
};

