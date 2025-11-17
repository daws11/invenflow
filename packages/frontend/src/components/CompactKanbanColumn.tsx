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
  onDeleteGroup?: (groupId: string) => Promise<void> | void;
}

export default function CompactKanbanColumn({ 
  id, 
  title, 
  products, 
  onProductView, 
  kanban,
  locations = [],
  onOpenGroupSettings,
  onDeleteGroup,
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

  // Build mixed, ordered list of groups and ungrouped products for this column
  const columnGroups: ProductGroupWithDetails[] =
    (kanban?.productGroups || []).filter((group) => group.columnStatus === id);

  const ungroupedProducts = products.filter((product) => !product.productGroupId);

  const mixedItems = [
    ...columnGroups.map((group) => ({
      kind: 'group' as const,
      id: group.id,
      group,
      columnPosition: (group as any).columnPosition ?? null,
      createdAt: new Date(group.createdAt as unknown as string).getTime(),
    })),
    ...ungroupedProducts.map((product) => ({
      kind: 'product' as const,
      id: product.id,
      product,
      columnPosition: product.columnPosition ?? null,
      createdAt: new Date(product.createdAt as unknown as string).getTime(),
    })),
  ].sort((a, b) => {
    const posA = a.columnPosition ?? Number.MAX_SAFE_INTEGER;
    const posB = b.columnPosition ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return a.createdAt - b.createdAt;
  });

  // Apply visibleCount only for products to keep UX predictable
  const visibleMixedItems = (() => {
    const result: typeof mixedItems = [];
    let productSeen = 0;
    for (const item of mixedItems) {
      if (item.kind === 'product') {
        if (productSeen >= visibleCount) continue;
        productSeen += 1;
      }
      result.push(item);
    }
    return result;
  })();

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
          {mixedItems.length === 0 && (
            <div
              className={`text-center py-8 text-sm ${
                isOver ? 'text-blue-600 font-medium' : 'text-gray-400'
              }`}
            >
              {isOver ? 'Drop product here' : 'No products in this column'}
            </div>
          )}

          {mixedItems.length > 0 && (
            <>
              <SortableContext
                items={visibleMixedItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {visibleMixedItems.map((item) => {
                  if (item.kind === 'group') {
                    const group = item.group;
                    return (
              <div key={group.id} className="p-2">
                <CompactGroupedProductCard
                  group={group}
                  products={group.products || []}
                  kanban={kanban ?? null}
                  locations={locations}
                  onProductView={onProductView}
                  onOpenSettings={onOpenGroupSettings}
                  onUngroup={async () => {
                    if (!onDeleteGroup) return;
                    try {
                      await onDeleteGroup(group.id);
                    } catch (error) {
                      console.error('Failed to ungroup:', error);
                    }
                  }}
                />
                </div>
              );
            }

                  const product = item.product as Product;
            return (
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
                  );
                })}
                  </SortableContext>

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
          )}
        </div>
      )}
    </div>
  );
}

