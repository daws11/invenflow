import { useState, useEffect, useMemo } from 'react';
import { Product, Location, Kanban } from '@invenflow/shared';
import { useDraggable } from '@dnd-kit/core';
import TransferHistoryViewer from './TransferHistoryViewer';
import { getAppliedThreshold, calculateTimeInColumn, formatTimeDuration, formatThresholdRule } from '../utils/thresholdCalculator';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import { useLocationStore } from '../store/locationStore';

interface ProductCardProps {
  product: Product;
  onView?: () => void;
  location?: Location | null;
  kanban?: Kanban | null;
}

export default function ProductCard({ product, onView, location, kanban }: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);
  const [isDragIntent, setIsDragIntent] = useState(false);
  const { locations } = useLocationStore();

  const resolvedLocation: Location | null = useMemo(() => {
    if (location) return location;
    if (!product.locationId) return null;
    return locations.find(l => l.id === product.locationId) || null;
  }, [location, product.locationId, locations]);

  // Update current time every 30 seconds for threshold recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000); // 30 seconds

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

  // Apply threshold styling
  const thresholdStyle = appliedThreshold ? {
    borderLeft: `4px solid ${appliedThreshold.color}`,
    borderTop: `1px solid ${appliedThreshold.color}`,
    borderRight: `1px solid ${appliedThreshold.color}`,
    borderBottom: `1px solid ${appliedThreshold.color}`,
    backgroundColor: `${appliedThreshold.color}10`, // 10% opacity
  } : {};

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    ...thresholdStyle,
  } : thresholdStyle;
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
      ref={setNodeRef}
      style={style}
      className={`product-card group relative transition-all duration-200 ${
        isDragging
          ? 'shadow-2xl scale-105 opacity-95 border-blue-400 cursor-grabbing'
          : 'hover:shadow-lg cursor-pointer hover:cursor-grab'
      }`}
      {...attributes}
      data-dragging={isDragging ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      title={appliedThreshold ? `In column for ${timeInColumn} - ${formatThresholdRule(appliedThreshold)}` : undefined}
    >
      {/* Threshold indicator badge */}
      {appliedThreshold && (
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full shadow-lg z-10 animate-pulse"
          style={{ backgroundColor: appliedThreshold.color }}
          title={`${formatThresholdRule(appliedThreshold)} - In column for ${timeInColumn}`}
        />
      )}

      {/* Product Content */}
      <div className="space-y-3">
        {/* Product Image Section */}
        {product.productImage && !imageError && (
          <div className="hidden sm:block rounded-lg overflow-hidden bg-gray-100">
            <img
              src={product.productImage}
              alt={product.productDetails}
              className="w-full h-32 object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          {/* Product Info */}
          <div className="flex-1 sm:mr-3 space-y-1.5">
            <h4 className="font-medium text-gray-900">{product.productDetails}</h4>
            {/* Time in Column - shown regardless of location to support order kanban */}
            {timeInColumn && (
              <div className="flex items-center text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{timeInColumn}</span>
              </div>
            )}
            {(resolvedLocation || product.locationId) && (
              <div className="flex items-start sm:items-center text-sm">
                <svg className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {resolvedLocation ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                    <span className="font-medium text-gray-900">
                      {resolvedLocation.name}
                      {resolvedLocation.area && ` - ${resolvedLocation.area}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600">Unknown location</span>
                )}
              </div>
            )}
            {product.sku && (
              <div className="hidden sm:block text-xs text-gray-500">SKU: {product.sku}</div>
            )}
            {product.supplier && (
              <div className="hidden sm:block text-xs text-gray-600">Supplier: {product.supplier}</div>
            )}
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 delay-100">
            <button
              onClick={() => onView?.()}
              data-no-drag
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
            data-no-drag
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
      <div className="hidden sm:flex flex-wrap gap-2">
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
        {product.unitPrice !== null && formatCurrency(product.unitPrice) && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            {formatCurrency(product.unitPrice)}
          </span>
        )}
      </div>

      {/* Product Tags */}
      {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
        <div className="hidden sm:flex flex-wrap gap-1">
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

      <div className="hidden sm:block text-xs text-gray-500">
        Created: {formatDateWithTime(product.createdAt)}
      </div>

      {/* Expandable Details Section */}
      {hasAdditionalInfo() && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          data-no-drag
          className="hidden sm:inline-flex text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 mt-3 items-center px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group/show-more"
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
        <div className="hidden sm:block mt-3 pt-3 border-t border-gray-200 text-sm space-y-2">
          {product.productLink && (
            <div>
              <span className="font-medium text-gray-700">Product Link:</span>
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 break-all ml-2 block"
                onClick={(e) => e.stopPropagation()}
                data-no-drag
                onDragStart={(e) => e.preventDefault()}
              >
                {product.productLink}
              </a>
            </div>
          )}

          {(location || product.locationId) && (
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              {location ? (
                <div className="ml-2">
                  <div className="text-gray-900 font-medium">
                    {location.name}{location.area ? ` - ${location.area}` : ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    {location.code}
                  </div>
                  {location.description && (
                    <div className="text-xs text-gray-500 mt-1">{location.description}</div>
                  )}
                </div>
              ) : (
                <span className="ml-2 text-gray-600">{product.locationId}</span>
              )}
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

          {product.unitPrice !== null && formatCurrency(product.unitPrice) && (
            <div>
              <span className="font-medium text-gray-700">Unit Price:</span>
              <span className="ml-2 text-gray-600">{formatCurrency(product.unitPrice)}</span>
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

          {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
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
