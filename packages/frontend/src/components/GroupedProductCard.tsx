import { useState } from 'react';
import { Product, Kanban, ProductGroupWithDetails } from '@invenflow/shared';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import ProductCard from './ProductCard';
import { useBulkSelectionStore } from '../store/bulkSelectionStore';

interface GroupedProductCardProps {
  group: ProductGroupWithDetails;
  products: Product[];
  kanban: Kanban | null;
  onProductView?: (product: Product) => void;
  onUngroup?: () => void;
}

export function GroupedProductCard({
  group,
  products,
  kanban,
  onProductView,
  onUngroup,
}: GroupedProductCardProps) {
  const selectionActive = useBulkSelectionStore((state) => state.selectedProductIds.size > 0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const unifiedFields = group.settings?.unifiedFields || {};
  const unifiedValues = group.settings?.unifiedValues || {};

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      priority: 'Priority',
      category: 'Category',
      supplier: 'Supplier',
      assignedToPersonId: 'Assigned Person',
      preferredReceiveKanbanId: 'Preferred Receive Kanban',
    };
    return labels[fieldName] || fieldName;
  };

  const getFieldDisplayValue = (fieldName: string, value: any) => {
    // For IDs, we might want to show names instead - but for now just show the value
    return value?.toString() || 'N/A';
  };

  const activeUnifiedFields = Object.keys(unifiedFields).filter(key => unifiedFields[key]);

  return (
    <div className="border-l-4 border-blue-400 bg-gradient-to-r from-blue-50 to-blue-25 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Group Header */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-75 p-3 flex items-center justify-between border-b border-blue-200">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <RectangleGroupIcon className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-sm">
              {group.groupTitle}
            </h4>
          </div>
          <p className="text-xs text-blue-700 mt-1 font-medium">
            {products.length} {products.length === 1 ? 'item' : 'items'} grouped
          </p>

          {/* Unified Settings Badges */}
          {activeUnifiedFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeUnifiedFields.map(fieldName => (
                <span
                  key={fieldName}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-800"
                  title={`${getFieldLabel(fieldName)}: ${getFieldDisplayValue(fieldName, unifiedValues[fieldName])}`}
                >
                  {getFieldLabel(fieldName)}: {getFieldDisplayValue(fieldName, unifiedValues[fieldName])}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Ungroup Button */}
          {onUngroup && !selectionActive && (
            <button
              onClick={onUngroup}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Ungroup items"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-blue-200 rounded transition-colors"
            title={isCollapsed ? 'Expand group' : 'Collapse group'}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="w-5 h-5" />
            ) : (
              <ChevronUpIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Group Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-3 bg-white/70">
          {products.map((product, index) => (
            <div key={product.id} className="relative">
              {/* Visual indicator that this is part of a group */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r" />
              {/* Connection line for grouped items */}
              {index < products.length - 1 && (
                <div className="absolute left-0.5 bottom-0 w-0.5 h-3 bg-blue-300" />
              )}
              <div className="pl-4 relative">
                {/* Group member indicator */}
                <div className="absolute -left-1 top-3 w-2 h-2 bg-blue-400 rounded-full border border-white shadow-sm" />
                <ProductCard
                  product={product}
                  onView={() => onProductView?.(product)}
                  kanban={kanban}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed State Info */}
      {isCollapsed && (
        <div className="p-3 bg-white/50 text-center">
          <p className="text-xs text-gray-500">
            Click to expand and view {products.length} grouped {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      )}
    </div>
  );
}

