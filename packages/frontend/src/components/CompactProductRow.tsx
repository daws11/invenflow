import { useState, useEffect, useMemo } from 'react';
import { Product, Location, Kanban } from '@invenflow/shared';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import TransferHistoryViewer from './TransferHistoryViewer';
import { getAppliedThreshold, calculateTimeInColumn, formatTimeDuration, formatThresholdRule } from '../utils/thresholdCalculator';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';

interface CompactProductRowProps {
  product: Product;
  onView?: () => void;
  location?: Location | null;
  kanban?: Kanban | null;
}

export default function CompactProductRow({ product, onView, location, kanban }: CompactProductRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);
  const [isDragIntent, setIsDragIntent] = useState(false);

  // Update current time every 30 seconds for threshold recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate applied threshold rule
  const appliedThreshold = useMemo(() => {
    if (!kanban?.thresholdRules || !product.columnEnteredAt) return null;
    return getAppliedThreshold(product, kanban.thresholdRules);
  }, [product, kanban?.thresholdRules, currentTime]);

  // Format time in column for tooltip
  const timeInColumn = useMemo(() => {
    if (!product.columnEnteredAt) return '';
    const timeMs = calculateTimeInColumn(product.columnEnteredAt);
    return formatTimeDuration(timeMs);
  }, [product.columnEnteredAt, currentTime]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: product.id,
  });

  const interactiveSelector = 'button, a, [data-no-drag]';

  // Using pointer events for click vs drag

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    
    // Track click start time
    setClickStartTime(Date.now());
    setIsDragIntent(false);
    
    listeners?.onPointerDown?.(event);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    
    const clickEndTime = Date.now();
    const clickDuration = clickStartTime ? clickEndTime - clickStartTime : 0;
    
    // If click duration is less than 200ms and no drag happened, treat as click
    if (clickDuration < 200 && !isDragging && !isDragIntent) {
      onView?.();
    }
    
    setClickStartTime(null);
    setIsDragIntent(false);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = () => {
    if (clickStartTime && !isDragIntent) {
      setIsDragIntent(true);
    }
  };

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    listeners?.onTouchStart?.(event);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    listeners?.onKeyDown?.(event);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : {};

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

  const combinedStyle = {
    ...style,
    ...(appliedThreshold ? { borderLeftColor: appliedThreshold.color } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={`compact-product-row group relative transition-all duration-200 ${
        isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer hover:cursor-grab'
      } ${appliedThreshold ? 'border-l-4' : ''}`}
      {...attributes}
      data-dragging={isDragging ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      title={appliedThreshold ? `In column for ${timeInColumn} - ${formatThresholdRule(appliedThreshold)}` : undefined}
    >
      {/* Main Row Content */}
      <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            data-no-drag
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
            type="button"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
          </button>

          {/* Threshold Indicator */}
          {appliedThreshold && (
            <div 
              className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: appliedThreshold.color }}
              title={`${formatThresholdRule(appliedThreshold)} - In column for ${timeInColumn}`}
            />
          )}

          {/* Product Name */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{product.productDetails}</h4>
            {timeInColumn && (
              <div className="mt-0.5 text-xs text-gray-500 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{timeInColumn}</span>
              </div>
            )}
          </div>

          {/* SKU */}
          {product.sku && (
            <div className="hidden sm:block text-sm text-gray-500 w-32 truncate">
              {product.sku}
            </div>
          )}

          {/* Category */}
          {product.category && (
            <span className={`hidden md:inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(product.category)}`}>
              {product.category}
            </span>
          )}

          {/* Priority */}
          {product.priority && (
            <span className={`hidden md:inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(product.priority)}`}>
              {product.priority}
            </span>
          )}

          {/* Stock Level */}
          {product.stockLevel !== null && (
            <span className="hidden lg:inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Stock: {product.stockLevel}
            </span>
          )}

          {/* Location */}
          {(location || product.locationId) && (
            <div className="hidden lg:flex items-center text-sm text-gray-600 w-40 truncate">
              <svg className="w-4 h-4 mr-1 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">
                {location ? `${location.name} - ${location.area}` : product.locationId}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 ml-4 flex-shrink-0">
          <button
            onClick={() => onView?.()}
            data-no-drag
            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200 min-w-[40px] min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            data-no-drag
            className="text-gray-400 hover:text-green-600 hover:bg-green-50 p-2 rounded-lg transition-all duration-200 min-w-[40px] min-h-[40px] focus:outline-none focus:ring-2 focus:ring-green-500"
            title="View transfer history"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 text-sm">
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

            {(location || product.locationId) && (
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                {location ? (
                  <span className="ml-2 text-gray-600">{location.name} - {location.area}</span>
                ) : (
                  <span className="ml-2 text-gray-600">{product.locationId}</span>
                )}
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

            {product.unitPrice !== null && formatCurrency(product.unitPrice) && (
              <div>
                <span className="font-medium text-gray-700">Unit Price:</span>
                <span className="ml-2 text-gray-600">{formatCurrency(product.unitPrice)}</span>
              </div>
            )}

            {product.stockLevel !== null && (
              <div>
                <span className="font-medium text-gray-700">Stock Level:</span>
                <span className="ml-2 text-gray-600">{product.stockLevel} units</span>
              </div>
            )}

            {product.createdAt && (
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">{formatDateWithTime(product.createdAt)}</span>
              </div>
            )}

          </div>

          {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700 text-sm">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.notes && (
            <div className="mt-3">
              <span className="font-medium text-gray-700 text-sm">Notes:</span>
              <p className="mt-1 text-gray-600 text-sm bg-white p-2 rounded border border-gray-200">{product.notes}</p>
            </div>
          )}

          {product.productLink && (
            <div className="mt-3">
              <span className="font-medium text-gray-700 text-sm">Product Link:</span>
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm text-blue-600 hover:text-blue-800 break-all"
                onClick={(e) => e.stopPropagation()}
                data-no-drag
                onDragStart={(e) => e.preventDefault()}
              >
                {product.productLink}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Transfer History Modal */}
      <TransferHistoryViewer
        productId={product.id}
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
      />
    </div>
  );
}

