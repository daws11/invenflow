import { Product, Kanban, ProductGroupWithDetails } from '@invenflow/shared';
import { useDroppable } from '@dnd-kit/core';
import ProductCard from './ProductCard';
import { GroupedProductCard } from './GroupedProductCard';
import { useProductGroupStore } from '../store/productGroupStore';

interface KanbanColumnProps {
  id: string;
  title: string;
  products: Product[];
  onProductView?: (product: Product) => void;
  onProductMove?: (productId: string, newColumn: string) => void;
  kanban?: Kanban | null;
}

export default function KanbanColumn({ id, title, products, onProductView, kanban }: KanbanColumnProps) {
  const { deleteGroup } = useProductGroupStore();
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column transition-all duration-200 w-full lg:flex-1 lg:min-w-0 rounded-lg ${
        isOver
          ? 'bg-blue-50 border-2 border-dashed border-blue-300 scale-105'
          : 'bg-gray-100 border-2 border-transparent'
      }`}
      role="region"
      aria-label={`Column ${title}`}
    >
      <div className="kanban-column-header sticky top-[56px] lg:static z-10 bg-gray-100 rounded-t-lg">
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm font-medium md:text-base">{title}</span>
          <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${
            isOver
              ? 'bg-blue-200 text-blue-800'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {products.length}
          </span>
        </div>
      </div>

      <div className="space-y-2 min-h-[150px] p-3" role="list">
        {/* Render Product Groups for this column */}
        {kanban?.productGroups?.filter(group => group.columnStatus === id).map((group) => (
          <GroupedProductCard
            key={group.id}
            group={group}
            products={group.products || []}
            kanban={kanban}
            onProductView={onProductView}
            onUngroup={async () => {
              try {
                await deleteGroup(group.id);
                // Refresh kanban data after ungrouping
                window.location.reload();
              } catch (error) {
                console.error('Failed to ungroup:', error);
              }
            }}
          />
        ))}

        {/* Render ungrouped products */}
        {products.filter(product => !product.productGroupId).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onView={() => onProductView?.(product)}
            kanban={kanban}
          />
        ))}

        {products.length === 0 && (!kanban?.productGroups || kanban.productGroups.filter(g => g.columnStatus === id).length === 0) && (
          <div className={`text-center py-8 text-sm border-2 border-dashed rounded-lg ${
            isOver
              ? 'text-blue-600 font-medium border-blue-300 bg-blue-50'
              : 'text-gray-400 border-gray-300'
          }`}>
            {isOver ? 'Drop product here' : 'No products in this column'}
          </div>
        )}
      </div>
    </div>
  );
}