import { useEffect, useState } from 'react';
import { XMarkIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { Location, Product } from '@invenflow/shared';
import { locationApi } from '../utils/api';

interface LocationInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

export function LocationInventoryModal({ isOpen, onClose, location }: LocationInventoryModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && location) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [isOpen, location]);

  // Handle ESC key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const loadProducts = async () => {
    if (!location) return;
    try {
      setLoading(true);
      const data = await locationApi.getProducts(location.id);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to load location products', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-yellow-100 text-yellow-800';
      case 'Stored':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !location) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Slider Panel */}
      <div
        className={`fixed top-0 right-0 min-h-full w-full sm:w-[600px] md:w-[720px] lg:w-[900px] xl:w-[1000px] bg-white shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slider-title"
      >
        <div className="flex flex-col min-h-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex-1 min-w-0 pr-4">
              <h2 id="slider-title" className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {location.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {location.area} • {location.code}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Close slider"
              aria-label="Close slider"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-hidden p-4 sm:p-6 flex flex-col">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No items found in this location.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] whitespace-nowrap">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] whitespace-nowrap">Category</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] whitespace-nowrap">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900 break-words">{product.productDetails}</div>
                          {product.supplier && (
                                <div className="text-xs text-gray-500 mt-1 break-words">{product.supplier}</div>
                          )}
                        </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              <span className="block truncate max-w-[180px]" title={product.sku || '-'}>
                          {product.sku || '-'}
                              </span>
                        </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category || '-'}
                        </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.columnStatus)}`}>
                            {product.columnStatus}
                          </span>
                        </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {product.stockLevel || 0}
                              </div>
                              {product.unit && (
                                <div className="text-xs text-gray-500 mt-0.5">{product.unit}</div>
                              )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Total Items: {products.length}
            </span>
            <button
              onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
