import { useState, useEffect } from 'react';
import { MapPinIcon, UserIcon, CubeIcon } from '@heroicons/react/24/outline';
import { ProductLocationDetail } from '@invenflow/shared';
import { inventoryApi } from '../utils/api';

interface LocationDetailsDropdownProps {
  sku: string;
  isOpen: boolean;
}

export const LocationDetailsDropdown = ({ sku, isOpen }: LocationDetailsDropdownProps) => {
  const [details, setDetails] = useState<ProductLocationDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDetails();
    }
  }, [isOpen, sku]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      console.log('Loading location details for SKU:', sku);
      const response = await inventoryApi.getLocationDetailsBySku(sku);
      console.log('Location details response:', response);
      setDetails(response.items);
    } catch (error) {
      console.error('Failed to load location details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="px-6 py-4 bg-gray-50">
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : details.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No location details found</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Location Breakdown</h4>
            <span className="text-xs text-gray-500">{details.length} location(s)</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {details.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Product & Location Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {item.productDetails}
                    </div>
                    
                    {item.location ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="font-medium">{item.location.name}</span>
                        {item.location.area && (
                          <span className="text-xs text-gray-500">
                            {item.location.building && `${item.location.building} - `}
                            {item.location.area}
                          </span>
                        )}
                      </div>
                    ) : item.person ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="font-medium">{item.person.name}</span>
                        {item.person.department && (
                          <span className="text-xs text-gray-500">({item.person.department})</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No location assigned</div>
                    )}
                  </div>

                  {/* Right: Stock & Status */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-900">
                        <CubeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-lg font-bold">
                          {item.stockLevel || 1}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Stock</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

