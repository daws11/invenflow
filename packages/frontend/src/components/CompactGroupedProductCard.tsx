import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Product, Kanban, ProductGroupWithDetails, Location } from '@invenflow/shared';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import { useBulkSelectionStore } from '../store/bulkSelectionStore';
import CompactProductRow from './CompactProductRow';

interface CompactGroupedProductCardProps {
  group: ProductGroupWithDetails;
  products: Product[];
  kanban: Kanban | null;
  locations: Location[];
  onProductView?: (product: Product) => void;
  onUngroup?: () => void;
  onOpenSettings?: (group: ProductGroupWithDetails) => void;
}

export function CompactGroupedProductCard({
  group,
  products,
  kanban,
  locations,
  onProductView,
  onUngroup,
  onOpenSettings,
}: CompactGroupedProductCardProps) {
  const selectionActive = useBulkSelectionStore((state) => state.selectedProductIds.size > 0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const unifiedFields = group.settings?.unifiedFields || {};
  const unifiedValues = group.settings?.unifiedValues || {};

  const activeUnifiedFields = useMemo(
    () => Object.keys(unifiedFields).filter((key) => unifiedFields[key]),
    [unifiedFields]
  );

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
    return value?.toString() || 'N/A';
  };

  const resolveLocation = (product: Product): Location | null => {
    if (!product.locationId) return null;
    return locations.find((l) => l.id === product.locationId) || null;
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
  });

  const style = {
    ...(transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
    ...(transition ? { transition } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-blue-200 bg-blue-50/60 rounded-lg overflow-hidden transition-all duration-200 ${
        isDragging
          ? 'cursor-grabbing opacity-95 shadow-2xl scale-[1.02] border-blue-500'
          : 'cursor-grab hover:shadow-md'
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Group Header */}
      <div
        className="bg-blue-100/80 px-3 py-2 flex items-center justify-between border-b border-blue-200 cursor-pointer"
        onClick={() => onOpenSettings?.(group)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <RectangleGroupIcon className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-xs truncate">
              {group.groupTitle}
            </h4>
          </div>
          <p className="text-[11px] text-blue-700 mt-0.5">
            {products.length} {products.length === 1 ? 'item' : 'items'} grouped
          </p>

          {/* Unified Settings Badges */}
          {activeUnifiedFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {activeUnifiedFields.map((fieldName) => (
                <span
                  key={fieldName}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-200 text-blue-800"
                  title={`${getFieldLabel(fieldName)}: ${getFieldDisplayValue(
                    fieldName,
                    unifiedValues[fieldName]
                  )}`}
                >
                  {getFieldLabel(fieldName)}: {getFieldDisplayValue(fieldName, unifiedValues[fieldName])}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-3">
          {/* Ungroup Button */}
          {onUngroup && !selectionActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUngroup();
              }}
              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Ungroup items"
              type="button"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-blue-200 rounded transition-colors"
            title={isCollapsed ? 'Expand group' : 'Collapse group'}
            type="button"
          >
            {isCollapsed ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Group Content */}
      {!isCollapsed && (
        <div className="bg-white/80 divide-y divide-gray-100">
          {products.map((product, index) => (
            <div key={product.id} className="relative">
              {/* Visual indicator that this is part of a group */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-blue-200" />
              {index < products.length - 1 && (
                <div className="absolute left-2 bottom-0 w-px h-2 bg-blue-300" />
              )}
              <div className="pl-4 pr-1 py-1">
                <CompactProductRow
                  product={product}
                  onView={() => onProductView?.(product)}
                  kanban={kanban || null}
                  location={resolveLocation(product)}
                  disableDrag={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed State Info */}
      {isCollapsed && (
        <div className="px-3 py-2 bg-white/70 text-center">
          <p className="text-[11px] text-gray-500">
            Click to expand and view {products.length} grouped {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      )}
    </div>
  );
}


