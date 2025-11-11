import { Product, Kanban } from '@invenflow/shared';
import { useDroppable } from '@dnd-kit/core';
import ProductCard from './ProductCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  products: Product[];
  onProductView?: (product: Product) => void;
  onProductMove?: (productId: string, newColumn: string) => void;
  kanban?: Kanban | null;
}

export default function KanbanColumn({ id, title, products, onProductView, kanban }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column transition-all duration-200 sm:flex-1 sm:min-w-0 snap-start w-[85%] sm:w-auto flex-shrink-0 ${
        isOver
          ? 'bg-blue-50 border-2 border-dashed border-blue-300 scale-105'
          : 'bg-gray-100 border-2 border-transparent'
      }`}
      role="region"
      aria-label={`Column ${title}`}
    >
      <div className="kanban-column-header sticky top-[56px] sm:static z-10 bg-gray-100">
        <div className="flex justify-between items-center px-3 py-2">
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

      <div className="space-y-2 min-h-[150px]" role="list">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onView={() => onProductView?.(product)}
            kanban={kanban}
          />
        ))}

        {products.length === 0 && (
          <div className={`text-center py-8 text-sm ${
            isOver
              ? 'text-blue-600 font-medium'
              : 'text-gray-400'
          }`}>
            {isOver ? 'Drop product here' : 'No products in this column'}
          </div>
        )}
      </div>
    </div>
  );
}