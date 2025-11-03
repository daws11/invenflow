import { useState } from 'react';
import { Product } from '@invenflow/shared';
import { useDraggable } from '@dnd-kit/core';
import { useKanbanStore } from '../store/kanbanStore';

interface ProductCardProps {
  product: Product;
  onEdit?: () => void;
}

export default function ProductCard({ product, onEdit }: ProductCardProps) {
  const { deleteProduct } = useKanbanStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: product.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(product.id);
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`product-card group ${
        isDragging ? 'cursor-grabbing shadow-xl scale-105 rotate-1' : 'cursor-grab'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{product.productDetails}</h4>
          {product.location && (
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {product.location}
            </div>
          )}
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-blue-500 p-1"
              title="Edit product"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-gray-400 hover:text-red-500 p-1"
            title="Delete product"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {product.priority && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(product.priority)}`}>
            {product.priority}
          </span>
        )}
        {product.stockLevel !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Stock: {product.stockLevel}
          </span>
        )}
      </div>

      {product.productLink && (
        <div className="mb-3">
          <a
            href={product.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 truncate block"
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
          >
            {product.productLink}
          </a>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Created: {new Date(product.createdAt).toLocaleDateString()}
      </div>

      {/* Additional details (expandable) */}
      {(product.productLink || product.location || product.priority) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-gray-500 hover:text-gray-700 mt-2"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
          {product.productLink && (
            <div className="mb-2">
              <span className="font-medium">Link:</span>{' '}
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 break-all"
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
              >
                {product.productLink}
              </a>
            </div>
          )}
          {product.location && (
            <div className="mb-2">
              <span className="font-medium">Location:</span> {product.location}
            </div>
          )}
          {product.priority && (
            <div className="mb-2">
              <span className="font-medium">Priority:</span>{' '}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(product.priority)}`}>
                {product.priority}
              </span>
            </div>
          )}
          {product.stockLevel !== null && (
            <div className="mb-2">
              <span className="font-medium">Stock Level:</span> {product.stockLevel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}