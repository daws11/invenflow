import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Product, Kanban, ORDER_COLUMNS, RECEIVE_COLUMNS, INVESTMENT_COLUMNS, Location, ProductGroupWithDetails, ColumnStatus } from '@invenflow/shared';
import CompactKanbanColumn from './CompactKanbanColumn';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useKanbanStore } from '../store/kanbanStore';
import { useProductGroupStore } from '../store/productGroupStore';
import { productApi } from '../utils/api';
import { useToast } from '../store/toastStore';

interface CompactBoardViewProps {
  kanban: Kanban & { products: Product[] };
  onProductView: (product: Product) => void;
  onMoveProduct: (productId: string, newColumn: ColumnStatus) => Promise<void>;
  searchQuery: string;
  locations: Location[];
  onOpenGroupSettings?: (group: ProductGroupWithDetails) => void;
}

export default function CompactBoardView({
  kanban,
  onProductView,
  onMoveProduct,
  searchQuery,
  locations,
  onOpenGroupSettings,
}: CompactBoardViewProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeGroup, setActiveGroup] = useState<ProductGroupWithDetails | null>(null);
  const {
    supplierFilter, categoryFilter, priorityFilter,
    createdFrom, createdTo, createdPreset,
    updatedFrom, updatedTo, updatedPreset,
  } = useViewPreferencesStore();
  const { reorderColumnProducts, refreshCurrentKanban } = useKanbanStore();
  const { updateGroup, deleteGroup } = useProductGroupStore();
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Activate drag after small movement; no hold delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColumns = () => {
    switch (kanban.type) {
      case 'order':
        return ORDER_COLUMNS;
      case 'receive':
        return RECEIVE_COLUMNS;
      case 'investment':
        return INVESTMENT_COLUMNS;
      default:
        return ORDER_COLUMNS;
    }
  };

  const getColumnDisplayName = (column: string) => {
    if (kanban.type === 'receive' && column === 'Purchased') {
      return 'Purchased (Incoming)';
    }
    return column;
  };

  // Filter products by search query (same logic as KanbanBoard, minus location)
  const filterProductBySearch = (product: Product): boolean => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

    // Search in productDetails (name)
    if (product.productDetails?.toLowerCase().includes(query)) return true;

    // Search in SKU
    if (product.sku?.toLowerCase().includes(query)) return true;

    // Search in supplier
    if (product.supplier?.toLowerCase().includes(query)) return true;

    // Search in priority
    if (product.priority?.toLowerCase().includes(query)) return true;

    // Search in category
    if (product.category?.toLowerCase().includes(query)) return true;

    // Search in tags
    if (product.tags && Array.isArray(product.tags)) {
      if (product.tags.some(tag => tag.toLowerCase().includes(query))) return true;
    }

    // Removed deprecated product.location string search

    // Search in notes
    if (product.notes?.toLowerCase().includes(query)) return true;

    // Search in dimensions
    if (product.dimensions?.toLowerCase().includes(query)) return true;

    // Search in weight (as string)
    if (product.weight !== null && product.weight.toString().includes(query)) return true;

    // Search in unitPrice (as string)
    if (product.unitPrice !== null && product.unitPrice.toString().includes(query)) return true;

    // Search in stockLevel (as string)
    if (product.stockLevel !== null && product.stockLevel.toString().includes(query)) return true;

    // Search in productLink
    if (product.productLink?.toLowerCase().includes(query)) return true;

    return false;
  };

  const isWithinRange = (date: Date, from?: Date | null, to?: Date | null): boolean => {
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
  const resolvePresetRange = (preset: '7d' | '30d' | '90d' | null): [Date | null, Date | null] => {
    if (!preset) return [null, null];
    const now = new Date();
    const from = new Date(now);
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    from.setDate(now.getDate() - days);
    return [from, now];
  };

  const getProductsByColumn = (column: string) => {
    const [cFromPreset, cToPreset] = resolvePresetRange(createdPreset);
    const [uFromPreset, uToPreset] = resolvePresetRange(updatedPreset);
    const createdFromDate = createdFrom ? new Date(createdFrom) : cFromPreset;
    const createdToDate = createdTo ? new Date(createdTo) : cToPreset;
    const updatedFromDate = updatedFrom ? new Date(updatedFrom) : uFromPreset;
    const updatedToDate = updatedTo ? new Date(updatedTo) : uToPreset;

    const filtered = kanban.products.filter((product) => {
      if (product.columnStatus !== column) return false;
      if (!filterProductBySearch(product)) return false;
      if (supplierFilter && product.supplier !== supplierFilter) return false;
      if (categoryFilter.length > 0) {
        if (!product.category || !categoryFilter.includes(product.category)) return false;
      }
      if (priorityFilter.length > 0) {
        if (!product.priority || !priorityFilter.includes(product.priority)) return false;
      }
      const createdAt = new Date(product.createdAt as unknown as string);
      if (!isWithinRange(createdAt, createdFromDate, createdToDate)) return false;
      const updatedAt = new Date(product.updatedAt as unknown as string);
      if (!isWithinRange(updatedAt, updatedFromDate, updatedToDate)) return false;
      return true;
    });

    // Sort by columnPosition first, then createdAt for stable ordering
    return filtered.sort((a, b) => {
      const posA = a.columnPosition ?? Number.MAX_SAFE_INTEGER;
      const posB = b.columnPosition ?? Number.MAX_SAFE_INTEGER;
      if (posA !== posB) {
        return posA - posB;
      }
      const createdA = new Date(a.createdAt as unknown as string).getTime();
      const createdB = new Date(b.createdAt as unknown as string).getTime();
      return createdA - createdB;
    });
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      await refreshCurrentKanban();
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Failed to delete group', error);
      toast.error('Failed to delete group');
      throw error;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id.toString();

    const product = kanban.products.find(p => p.id === activeId);
    const group =
      (kanban as any).productGroups?.find(
        (g: ProductGroupWithDetails) => g.id === activeId
      ) || null;

    setActiveProduct(product || null);
    setActiveGroup(group);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProduct(null);
    setActiveGroup(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const columns = [...getColumns()];

    const activeGroup: ProductGroupWithDetails | undefined =
      (kanban as any).productGroups?.find((g: ProductGroupWithDetails) => g.id === activeId);
    const activeProduct = kanban.products.find(p => p.id === activeId);

    // Helper: build ordered list of all groups + ungrouped products in a column
    const buildColumnItems = (columnStatus: string) => {
      const columnGroups: ProductGroupWithDetails[] =
        ((kanban as any).productGroups || []).filter(
          (group: ProductGroupWithDetails) => group.columnStatus === columnStatus
        );
      const columnProducts = kanban.products.filter(
        (p) => p.columnStatus === columnStatus && !p.productGroupId
      );

      return [
        ...columnGroups.map((group) => ({
          id: group.id,
          type: 'group' as const,
          columnStatus: group.columnStatus,
          columnPosition: (group as any).columnPosition ?? null,
          createdAt: new Date(group.createdAt as unknown as string).getTime(),
        })),
        ...columnProducts.map((product) => ({
          id: product.id,
          type: 'product' as const,
          columnStatus: product.columnStatus,
          columnPosition: product.columnPosition ?? null,
          createdAt: new Date(product.createdAt as unknown as string).getTime(),
        })),
      ].sort((a, b) => {
        const posA = a.columnPosition ?? Number.MAX_SAFE_INTEGER;
        const posB = b.columnPosition ?? Number.MAX_SAFE_INTEGER;
        if (posA !== posB) return posA - posB;
        return a.createdAt - b.createdAt;
      });
    };

    // Handle dragging a whole product group as a unit
    if (activeGroup) {
      const groupColumn = activeGroup.columnStatus;

      // Determine target column and target item from drop target
      let targetColumn: ColumnStatus | null = null;
      let targetItemId: string | null = null;

      if (columns.includes(overId as ColumnStatus)) {
        targetColumn = overId as ColumnStatus;
      } else {
        const overGroup: ProductGroupWithDetails | undefined =
          (kanban as any).productGroups?.find((g: ProductGroupWithDetails) => g.id === overId);
        if (overGroup) {
          targetColumn = overGroup.columnStatus as ColumnStatus;
          targetItemId = overGroup.id;
        } else {
          const overProduct = kanban.products.find((p) => p.id === overId);
        if (overProduct) {
          targetColumn = overProduct.columnStatus as ColumnStatus;
            targetItemId = overProduct.id;
          }
        }
      }

      if (!targetColumn) {
        return;
      }

      // Same column: reorder group within mixed list
      if (targetColumn === groupColumn && targetItemId) {
        const columnItems = buildColumnItems(groupColumn);

        const oldIndex = columnItems.findIndex(
          (item) => item.type === 'group' && item.id === activeGroup.id
        );
        const newIndex = columnItems.findIndex((item) => item.id === targetItemId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        const newOrdered = arrayMove(columnItems, oldIndex, newIndex);
        const orderedItems = newOrdered.map((item) => ({
          id: item.id,
          type: item.type,
        }));

        await reorderColumnProducts(kanban.id, groupColumn, orderedItems);
        return;
      }

      // Different column: move entire group to target column (keep existing behaviour)
      if (targetColumn !== groupColumn) {
        const productIds = (activeGroup.products || []).map((p) => p.id);
      if (productIds.length === 0) {
        return;
      }

      try {
        await productApi.bulkMove(productIds, targetColumn);
        await updateGroup(activeGroup.id, {
          columnStatus: targetColumn,
        });
        await refreshCurrentKanban();

        toast.success(
          `Moved group "${activeGroup.groupTitle}" to ${targetColumn} (${productIds.length} items)`
        );
      } catch (error) {
        console.error('Failed to move group:', error);
        toast.error('Failed to move group');
      }
        return;
      }

      return;
    }

    if (!activeProduct) return;

    // Dropped on a column area: move between columns
    if (columns.includes(overId as ColumnStatus)) {
      if (activeProduct.columnStatus !== overId) {
        await onMoveProduct(activeProduct.id, overId as ColumnStatus);
      }
      return;
    }

    // Dropped on another item (product or group)
    const overGroup: ProductGroupWithDetails | undefined =
      (kanban as any).productGroups?.find((g: ProductGroupWithDetails) => g.id === overId);
    const overProduct = kanban.products.find((p) => p.id === overId);

    if (!overGroup && !overProduct) return;

    const sourceColumn = activeProduct.columnStatus;
    const targetColumn = overGroup ? overGroup.columnStatus : (overProduct as Product).columnStatus;

    // Same column: reorder within mixed list
    if (sourceColumn === targetColumn) {
      const columnItems = buildColumnItems(sourceColumn);

      const oldIndex = columnItems.findIndex(
        (item) => item.type === 'product' && item.id === activeProduct.id
      );
      const newIndex = columnItems.findIndex((item) => item.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const newOrdered = arrayMove(columnItems, oldIndex, newIndex);
      const orderedItems = newOrdered.map((item) => ({
        id: item.id,
        type: item.type,
      }));

      await reorderColumnProducts(kanban.id, sourceColumn, orderedItems);
      return;
    }

    // Different column: treat as move to target column
    if (sourceColumn !== targetColumn && targetColumn) {
      await onMoveProduct(activeProduct.id, targetColumn as ColumnStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {getColumns().map((column) => (
          <CompactKanbanColumn
            key={column}
            id={column}
            title={getColumnDisplayName(column)}
            products={getProductsByColumn(column)}
            onProductView={onProductView}
            kanban={kanban}
            locations={locations}
            onOpenGroupSettings={onOpenGroupSettings}
            onDeleteGroup={handleDeleteGroup}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProduct ? (
          <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 opacity-95 max-w-md">
            {/* Drag indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
            </div>

            {/* Product name */}
            <h4 className="font-semibold text-gray-900 mb-2 text-center">{activeProduct.productDetails}</h4>

            {/* Product details summary */}
            <div className="space-y-2">
              {activeProduct.sku && (
                <div className="text-xs text-gray-500 text-center">SKU: {activeProduct.sku}</div>
              )}

              {/* Tags and priority */}
              <div className="flex flex-wrap gap-1 justify-center">
                {activeProduct.priority && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    activeProduct.priority.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                    activeProduct.priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    activeProduct.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {activeProduct.priority}
                  </span>
                )}

                {activeProduct.category && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {activeProduct.category}
                  </span>
                )}

                {activeProduct.stockLevel !== null && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Stock: {activeProduct.stockLevel}
                  </span>
                )}
              </div>
            </div>

            {/* Drag hint */}
            <div className="mt-3 text-xs text-gray-400 text-center italic">
              Moving item...
            </div>
          </div>
        ) : activeGroup ? (
          <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 opacity-95 max-w-md">
            {/* Drag indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h10M4 18h6"
                  />
                </svg>
              </div>
            </div>

            {/* Group title */}
            <h4 className="font-semibold text-gray-900 mb-2 text-center">
              {activeGroup.groupTitle}
            </h4>

            {/* Group summary */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                {activeGroup.products?.length ?? 0} grouped item
                {(activeGroup.products?.length ?? 0) === 1 ? '' : 's'}
              </div>

              {activeGroup.settings?.unifiedFields && (
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {Object.entries(activeGroup.settings.unifiedFields)
                    .filter(([_, enabled]) => enabled)
                    .slice(0, 3)
                    .map(([field]) => (
                      <span
                        key={field}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {field}
                      </span>
                    ))}
                  {Object.entries(activeGroup.settings.unifiedFields).filter(
                    ([_, enabled]) => enabled
                  ).length > 3 && (
                    <span className="text-[11px] text-gray-500">
                      +
                      {Object.entries(activeGroup.settings.unifiedFields).filter(
                        ([_, enabled]) => enabled
                      ).length - 3}{' '}
                      more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Drag hint */}
            <div className="mt-3 text-xs text-gray-400 text-center italic">
              Moving grouped items...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

