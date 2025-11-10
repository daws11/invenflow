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
      const response = await inventoryApi.getLocationDetailsBySku(sku);
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
        <p className="text-sm text-gray-500 text-center">No location details found</p>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Location Breakdown</h4>
          <div className="grid grid-cols-1 gap-2">
            {details.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Location/Person Info */}
                  <div className="flex-1">
                    {item.location ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPinIcon className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900">{item.location.name}</span>
                        <span className="text-gray-500">({item.location.code})</span>
                      </div>
                    ) : item.person ? (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-gray-900">{item.person.name}</span>
                        <span className="text-gray-500">({item.person.code})</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No location assigned</div>
                    )}
                    
                    {/* Additional location details */}
                    {item.location?.area && (
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {item.location.building && `${item.location.building} - `}
                        {item.location.area}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.columnStatus === 'Stored' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.columnStatus}
                    </span>
                  </div>

                  {/* Stock Level */}
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <CubeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">
                        {item.stockLevel || 1}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">units</p>
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

