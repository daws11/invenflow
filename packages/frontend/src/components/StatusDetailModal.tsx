import { useEffect, useState } from 'react';
import { InventoryItem } from '@invenflow/shared';
import { useInventoryStore } from '../store/inventoryStore';
import { useLocationStore } from '../store/locationStore';
import { usePersonStore } from '../store/personStore';
import { calculateProductStatus, getStatusLabel, getStatusColor } from '../utils/productStatus';

interface StatusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: string;
  status: 'incoming' | 'received' | 'stored' | 'used';
  productName: string;
}

export const StatusDetailModal = ({
  isOpen,
  onClose,
  sku,
  status,
  productName,
}: StatusDetailModalProps) => {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchProductsBySku = useInventoryStore((state) => state.fetchProductsBySku);
  const setSelectedItem = useInventoryStore((state) => state.setSelectedItem);
  const setShowDetailModal = useInventoryStore((state) => state.setShowDetailModal);
  const locations = useLocationStore((state) => state.locations);
  const persons = usePersonStore((state) => state.persons);
  const fetchLocations = useLocationStore((state) => state.fetchLocations);
  const fetchPersons = usePersonStore((state) => state.fetchPersons);

  useEffect(() => {
    if (isOpen) {
      // Ensure locations and persons are loaded
      if (locations.length === 0) {
        fetchLocations();
      }
      if (persons.length === 0) {
        fetchPersons();
      }

      // Fetch products and filter by status
      const loadProducts = async () => {
        setLoading(true);
        const allProducts = await fetchProductsBySku(sku);
        const filtered = allProducts.filter(
          (product) => calculateProductStatus(product) === status
        );
        setProducts(filtered);
        setLoading(false);
      };
      loadProducts();
    }
  }, [isOpen, sku, status, fetchProductsBySku, locations.length, persons.length, fetchLocations, fetchPersons]);

  const handleProductClick = (product: InventoryItem) => {
    setSelectedItem(product);
    setShowDetailModal(true);
    onClose();
  };

  if (!isOpen) return null;

  const statusColors = getStatusColor(status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className={`px-6 py-4 border-b ${statusColors.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xl font-semibold ${statusColors.text}`}>
                  {getStatusLabel(status)} Products
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {productName} (SKU: {sku})
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found with this status</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const location = locations.find((l) => l.id === product.locationId);
                  const person = persons.find((p) => p.id === product.assignedToPersonId);

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      {/* Product Image */}
                      {product.displayImage ? (
                        <img
                          src={product.displayImage}
                          alt={product.productDetails}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {product.productDetails}
                        </h4>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                          {/* Kanban */}
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" />
                            </svg>
                            {product.kanban.name}
                          </span>

                          {/* Location or Person Assignment */}
                          {status === 'used' && person ? (
                            <span className="inline-flex items-center gap-1 text-purple-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {person.name}
                            </span>
                          ) : location ? (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {location.name}
                            </span>
                          ) : null}

                          {/* Stock Level for stored products */}
                          {status === 'stored' && product.stockLevel && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                              </svg>
                              Stock: {product.stockLevel}
                            </span>
                          )}
                        </div>

                        {/* Category & Supplier */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                          {product.category && (
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                              </svg>
                              {product.category}
                            </span>
                          )}
                          {product.supplier && (
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              {product.supplier}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold">{products.length}</span> product(s)
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

