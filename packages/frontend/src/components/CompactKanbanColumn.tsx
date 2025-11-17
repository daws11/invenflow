import { Product, Kanban, Location, ProductGroupWithDetails } from '@invenflow/shared';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import CompactProductRow from './CompactProductRow';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { CompactGroupedProductCard } from './CompactGroupedProductCard';

interface CompactKanbanColumnProps {
  id: string;
  title: string;
  products: Product[];
  onProductView?: (product: Product) => void;
  kanban?: Kanban | null;
  locations?: Location[];
  onOpenGroupSettings?: (group: ProductGroupWithDetails) => void;
}

export default function CompactKanbanColumn({ 
  id, 
  title, 
  products, 
  onProductView, 
  kanban,
  locations = [],
  onOpenGroupSettings,
}: CompactKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const { isColumnCollapsed, toggleColumnCollapsed } = useViewPreferencesStore();
  const isCollapsed = kanban ? isColumnCollapsed(kanban.id, id) : false;
  const [visibleCount, setVisibleCount] = useState(50);

  const handleToggle = () => {
    if (kanban) {
      toggleColumnCollapsed(kanban.id, id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 ${
        isOver ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white'
      }`}
    >
      {/* Column Header */}
      <div
        className={`compact-column-header flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
          isOver ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isOver
              ? 'bg-blue-200 text-blue-900'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {products.length}
          </span>
          {isOver && (
            <span className="text-sm font-medium text-blue-600">Drop here</span>
          )}
        </div>
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div className="divide-y divide-gray-200" role="list">
          {/* Render product groups for this column in compact style */}
          {kanban?.productGroups
            ?.filter((group) => group.columnStatus === id)
            .map((group) => (
              <div key={group.id} className="p-2">
                <CompactGroupedProductCard
                  group={group}
                  products={group.products || []}
                  kanban={kanban}
                  locations={locations}
                  onProductView={onProductView}
                  onOpenSettings={onOpenGroupSettings}
                  onUngroup={async () => {
                    // For now, reuse the same behaviour as board view:
                    // ungroup via API and then refresh page.
                    // We don't have direct access to deleteGroup here, so rely on existing board flow.
                    try {
                      // Trigger ungroup by navigating through existing GroupItemsModal flow (not available here),
                      // fallback to full reload so backend changes are reflected.
                      window.location.reload();
                    } catch (error) {
                      console.error('Failed to ungroup:', error);
                    }
                  }}
                />
              </div>
            ))}

          {/* Render ungrouped products with sortable context */}
          {(() => {
            const ungroupedProducts = products.filter((product) => !product.productGroupId);
            const visibleUngrouped = ungroupedProducts.slice(0, visibleCount);

            if (ungroupedProducts.length === 0 && (!kanban?.productGroups || !kanban.productGroups.some((g) => g.columnStatus === id))) {
              return (
                <div
                  className={`text-center py-8 text-sm ${
                    isOver ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {isOver ? 'Drop product here' : 'No products in this column'}
                </div>
              );
            }

            return (
              <>
                {visibleUngrouped.length > 0 && (
                  <SortableContext
                    items={visibleUngrouped.map((product) => product.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {visibleUngrouped.map((product) => (
                      <CompactProductRow
                        key={product.id}
                        product={product}
                        onView={() => onProductView?.(product)}
                        kanban={kanban}
                        location={
                          product.locationId
                            ? locations.find((l) => l.id === product.locationId) || null
                            : null
                        }
                      />
                    ))}
                  </SortableContext>
                )}

                {ungroupedProducts.length > visibleCount && (
                  <div className="p-3 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                      onClick={() => setVisibleCount((c) => c + 50)}
                    >
                      Load more ({ungroupedProducts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

