import { Product, Kanban, Location } from '@invenflow/shared';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import CompactProductRow from './CompactProductRow';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface CompactKanbanColumnProps {
  id: string;
  title: string;
  products: Product[];
  onProductView?: (product: Product) => void;
  kanban?: Kanban | null;
  locations?: Location[];
}

export default function CompactKanbanColumn({ 
  id, 
  title, 
  products, 
  onProductView, 
  kanban,
  locations = [],
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
          {products.length === 0 ? (
            <div className={`text-center py-8 text-sm ${
              isOver ? 'text-blue-600 font-medium' : 'text-gray-400'
            }`}>
              {isOver ? 'Drop product here' : 'No products in this column'}
            </div>
          ) : (
            products.slice(0, visibleCount).map((product) => (
              <CompactProductRow
                key={product.id}
                product={product}
                onView={() => onProductView?.(product)}
                kanban={kanban}
                location={product.locationId ? locations.find(l => l.id === product.locationId) || null : null}
              />
            ))
          )}
          {products.length > visibleCount && (
            <div className="p-3 text-center">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setVisibleCount((c) => c + 50)}
              >
                Load more ({products.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

