import { useState, useRef } from 'react';
import { Product } from '@invenflow/shared';
import { useDraggable } from '@dnd-kit/core';
import { useKanbanStore } from '../store/kanbanStore';
import { useToast } from '../store/toastStore';
import TransferHistoryViewer from './TransferHistoryViewer';

interface ProductCardProps {
  product: Product;
  onView?: () => void;
}

export default function ProductCard({ product, onView }: ProductCardProps) {
  const { deleteProduct } = useKanbanStore();
  const { success, error } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
    if (confirm(`Are you sure you want to delete "${product.productDetails}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await deleteProduct(product.id);
        success(`Product "${product.productDetails}" deleted successfully`);
      } catch (err) {
        error(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsDeleting(false);
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

  const getCategoryColor = (category: string | null) => {
    const colors: { [key: string]: string } = {
      'electronics': 'bg-purple-100 text-purple-800 border-purple-200',
      'furniture': 'bg-amber-100 text-amber-800 border-amber-200',
      'office supplies': 'bg-blue-100 text-blue-800 border-blue-200',
      'raw materials': 'bg-stone-100 text-stone-800 border-stone-200',
      'tools & equipment': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'packaging': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'safety equipment': 'bg-red-100 text-red-800 border-red-200',
      'cleaning supplies': 'bg-green-100 text-green-800 border-green-200',
      'software': 'bg-violet-100 text-violet-800 border-violet-200',
      'services': 'bg-pink-100 text-pink-800 border-pink-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const hasAdditionalInfo = () => {
    return !!(
      product.productLink ||
      product.location ||
      product.priority ||
      product.productImage ||
      product.category ||
      product.supplier ||
      product.sku ||
      product.dimensions ||
      product.weight ||
      product.unitPrice ||
      product.notes ||
      (product.tags && product.tags.length > 0) ||
      product.stockLevel !== null
    );
  };

  return (
    <div
      ref={cardRef}
      className={`product-card group relative transition-all duration-200 ${
        isDragging
          ? 'shadow-2xl scale-105 opacity-95 border-blue-400'
          : 'hover:shadow-lg'
      }`}
    >
      {/* Enhanced Drag Handle Area */}
      <div
        ref={(node) => {
          setNodeRef(node);
        }}
        style={style}
        className={`drag-handle-area group/drag absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center transition-all duration-200 ease-out ${
          isDragging
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 scale-105'
            : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-50 hover:to-blue-100 hover:shadow-md hover:scale-105'
        }`}
        {...attributes}
        {...listeners}
        title="Drag to move product"
      >
        {/* Dots Pattern for Better UX */}
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isDragging ? 'bg-white' : 'bg-gray-400 group-hover/drag:bg-blue-500'
          }`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isDragging ? 'bg-white' : 'bg-gray-400 group-hover/drag:bg-blue-500'
          }`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isDragging ? 'bg-white' : 'bg-gray-400 group-hover/drag:bg-blue-500'
          }`} />
        </div>

        {/* Drag Icon on Hover */}
        <div className="absolute opacity-0 group-hover/drag:opacity-100 transition-opacity duration-200 pointer-events-none">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
        </div>
      </div>
      {/* Product Content with Padding for Drag Handle */}
      <div className="pl-10 pr-4">
        {/* Product Image Section */}
        {product.productImage && !imageError && (
          <div className="mb-3 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={product.productImage}
            alt={product.productDetails}
            className="w-full h-32 object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        {/* Product Info */}
        <div className="flex-1 mr-3">
          <h4 className="font-medium text-gray-900 mb-1">{product.productDetails}</h4>
          {product.sku && (
            <div className="text-xs text-gray-500 mb-1">SKU: {product.sku}</div>
          )}
          {product.supplier && (
            <div className="text-xs text-gray-600 mb-1">Supplier: {product.supplier}</div>
          )}
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

        {/* Enhanced Action Buttons */}
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
          <button
            onClick={() => onView?.()}
            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
            title="View product details"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => setShowTransferHistory(true)}
            className="text-gray-400 hover:text-green-600 hover:bg-green-50 p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
            title="View transfer history"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tags and Categories */}
      <div className="flex flex-wrap gap-2 mb-3">
        {product.category && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(product.category)}`}>
            {product.category}
          </span>
        )}
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
        {product.unitPrice !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            ${product.unitPrice.toFixed(2)}
          </span>
        )}
      </div>

      {/* Product Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200"
            >
              #{tag}
            </span>
          ))}
          {product.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{product.tags.length - 3} more</span>
          )}
        </div>
      )}

      {product.productLink && (
        <div className="mb-3">
          <a
            href={product.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 truncate block flex items-center"
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {product.productLink}
          </a>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Created: {new Date(product.createdAt).toLocaleDateString()}
      </div>

      {/* Expandable Details Section */}
      {hasAdditionalInfo() && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 mt-3 flex items-center px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group/show-more"
        >
          <svg
            className={`w-4 h-4 mr-2 transform transition-all duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : 'text-gray-400 group-hover/show-more:text-blue-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium">{isExpanded ? 'Show less' : 'Show more details'}</span>
        </button>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2">
          {product.productLink && (
            <div>
              <span className="font-medium text-gray-700">Product Link:</span>
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 break-all ml-2 block"
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
              >
                {product.productLink}
              </a>
            </div>
          )}

          {product.location && (
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span className="ml-2 text-gray-600">{product.location}</span>
            </div>
          )}

          {product.sku && (
            <div>
              <span className="font-medium text-gray-700">SKU:</span>
              <span className="ml-2 text-gray-600">{product.sku}</span>
            </div>
          )}

          {product.supplier && (
            <div>
              <span className="font-medium text-gray-700">Supplier:</span>
              <span className="ml-2 text-gray-600">{product.supplier}</span>
            </div>
          )}

          {product.dimensions && (
            <div>
              <span className="font-medium text-gray-700">Dimensions:</span>
              <span className="ml-2 text-gray-600">{product.dimensions}</span>
            </div>
          )}

          {product.weight !== null && (
            <div>
              <span className="font-medium text-gray-700">Weight:</span>
              <span className="ml-2 text-gray-600">{product.weight} kg</span>
            </div>
          )}

          {product.unitPrice !== null && (
            <div>
              <span className="font-medium text-gray-700">Unit Price:</span>
              <span className="ml-2 text-gray-600">${product.unitPrice.toFixed(2)}</span>
            </div>
          )}

          {product.priority && (
            <div>
              <span className="font-medium text-gray-700">Priority:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-2 ${getPriorityColor(product.priority)}`}>
                {product.priority}
              </span>
            </div>
          )}

          {product.stockLevel !== null && (
            <div>
              <span className="font-medium text-gray-700">Stock Level:</span>
              <span className="ml-2 text-gray-600">{product.stockLevel} units</span>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.notes && (
            <div>
              <span className="font-medium text-gray-700">Notes:</span>
              <p className="mt-1 text-gray-600 text-sm bg-gray-50 p-2 rounded">{product.notes}</p>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Transfer History Modal */}
      <TransferHistoryViewer
        productId={product.id}
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
      />
    </div>
  );
}