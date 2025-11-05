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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Product, Kanban, ORDER_COLUMNS, RECEIVE_COLUMNS } from '@invenflow/shared';
import CompactKanbanColumn from './CompactKanbanColumn';

interface CompactBoardViewProps {
  kanban: Kanban & { products: Product[] };
  onProductView: (product: Product) => void;
  onMoveProduct: (productId: string, newColumn: string) => Promise<void>;
  selectedLocationId: string | null;
}

export default function CompactBoardView({
  kanban,
  onProductView,
  onMoveProduct,
  selectedLocationId,
}: CompactBoardViewProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColumns = () => {
    return kanban.type === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
  };

  const getProductsByColumn = (column: string) => {
    return kanban.products.filter(product =>
      product.columnStatus === column &&
      (!selectedLocationId || product.locationId === selectedLocationId)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const product = kanban.products.find(p => p.id === active.id);
    if (product) {
      setActiveProduct(product);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProduct(null);

    if (!over) return;

    const activeProduct = kanban.products.find(p => p.id === active.id);
    if (!activeProduct) return;

    const overColumn = over.id.toString();
    const columns = getColumns();

    if ((columns as readonly string[]).includes(overColumn) && activeProduct.columnStatus !== overColumn) {
      await onMoveProduct(activeProduct.id, overColumn);
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
            title={column}
            products={getProductsByColumn(column)}
            onProductView={onProductView}
            kanban={kanban}
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
              Moving to new column...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

