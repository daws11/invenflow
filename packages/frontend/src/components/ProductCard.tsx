import { useState, useEffect, useMemo } from 'react';
import { Product, Location, Kanban } from '@invenflow/shared';
import { useSortable } from '@dnd-kit/sortable';
import { XMarkIcon } from '@heroicons/react/24/outline';
import TransferHistoryViewer from './TransferHistoryViewer';
import { getAppliedThreshold, calculateTimeInColumn, formatTimeDuration, formatThresholdRule } from '../utils/thresholdCalculator';
import { formatCurrency, formatDateWithTime } from '../utils/formatters';
import { useLocationStore } from '../store/locationStore';
import { useBulkSelectionStore } from '../store/bulkSelectionStore';
import { useProductGroupStore } from '../store/productGroupStore';
import { useKanbanStore } from '../store/kanbanStore';
import { useToast } from '../store/toastStore';
import { useCommentStore } from '../store/commentStore';
import { CommentBadge } from './comments';

interface ProductCardProps {
  product: Product;
  onView?: () => void;
  location?: Location | null;
  kanban?: Kanban | null;
  /** When true, disables drag interactions (used for grouped items) */
  isDraggable?: boolean;
}

export default function ProductCard({ product, onView, location, kanban, isDraggable = true }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);
  const [isDragIntent, setIsDragIntent] = useState(false);
  const { locations } = useLocationStore();
  const toggleSelection = useBulkSelectionStore((state) => state.toggleSelection);
  const selected = useBulkSelectionStore((state) => state.selectedProductIds.has(product.id));
  const selectionActive = useBulkSelectionStore((state) => state.selectedProductIds.size > 0);
  const isInGroup = !!product.productGroupId;
  const { removeProductsFromGroup } = useProductGroupStore();
  const { refreshCurrentKanban } = useKanbanStore();
  const toast = useToast();
  const [isRemovingFromGroup, setIsRemovingFromGroup] = useState(false);
  const commentCount = useCommentStore((state) => state.countsByProduct[product.id]?.count ?? 0);

  const resolvedLocation: Location | null = useMemo(() => {
    if (location) return location;
    if (!product.locationId) return null;
    return locations.find(l => l.id === product.locationId) || null;
  }, [location, product.locationId, locations]);

  // Update current time every second for real-time threshold recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // 1 second

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
    transition,
    isDragging,
  } = useSortable({
    id: product.id,
    disabled: selectionActive || !isDraggable,
  });

  const interactiveSelector = 'button, a, [data-no-drag], input[type="checkbox"]';

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    toggleSelection(product.id);
  };

  const handleRemoveFromGroupClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!product.productGroupId || isRemovingFromGroup) return;

    try {
      setIsRemovingFromGroup(true);
      await removeProductsFromGroup(product.productGroupId, {
        productIds: [product.id],
      });
      await refreshCurrentKanban();
      toast.success('Product removed from group');
    } catch (error) {
      console.error('Failed to remove product from group', error);
      toast.error('Failed to remove product from group');
    } finally {
      setIsRemovingFromGroup(false);
    }
  };

  // Using pointer events for click vs drag

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    
    // In selection mode, clicking selects the product
    if (selectionActive) {
      toggleSelection(product.id);
      return;
    }
    
    // Track click start time
    setClickStartTime(Date.now());
    setIsDragIntent(false);
    
    if (isDraggable && !selectionActive) {
      listeners?.onPointerDown?.(event);
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) {
      return;
    }
    
    // In selection mode, do nothing (already handled in pointer down)
    if (selectionActive) {
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
  const thresholdStyle = appliedThreshold
    ? {
        borderLeft: `4px solid ${appliedThreshold.color}`,
        borderTop: `1px solid ${appliedThreshold.color}`,
        borderRight: `1px solid ${appliedThreshold.color}`,
        borderBottom: `1px solid ${appliedThreshold.color}`,
        backgroundColor: `${appliedThreshold.color}10`, // 10% opacity
      }
    : {};

  const style = {
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : {}),
    ...(transition ? { transition } : {}),
    opacity: isDragging ? 0.5 : 1,
    ...thresholdStyle,
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
      className={`product-card group relative transition-all duration-200 ${
        isDragging
          ? 'shadow-2xl scale-105 opacity-95 border-blue-400 cursor-grabbing'
      : selectionActive
      ? 'cursor-pointer'
      : 'hover:shadow-lg cursor-pointer hover:cursor-grab'
      } ${
        selected
          ? 'border-2 border-blue-500 bg-blue-50'
          : product.isDraft
          ? 'border-dashed border-2 border-gray-300 bg-gray-50/50 opacity-75'
          : 'border border-gray-200 bg-white'
      } ${
        product.isRejected
          ? 'opacity-60 border-red-300 bg-red-50'
          : ''
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
      {/* Product Content */}
      <div className="space-y-2">
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
            <h4 className={`font-medium ${product.isDraft ? 'text-gray-600 italic' : 'text-gray-900'}`}>
              {product.productDetails}
            </h4>
            {product.requesterName && (
              <div className="text-xs text-gray-600">
                Requested by: <span className="font-medium text-gray-800">{product.requesterName}</span>
              </div>
            )}
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
              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
            )}
            {product.supplier && (
              <div className="text-xs text-gray-600">Supplier: {product.supplier}</div>
            )}
          </div>

          {/* Right side controls: selection, threshold, priority, rejected */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Selection / group action & threshold row */}
            <div className="flex items-center gap-2">
              {appliedThreshold && (
                <div
                  className="w-3 h-3 rounded-full shadow-lg animate-pulse flex-shrink-0"
                  style={{ backgroundColor: appliedThreshold.color }}
                  title={`${formatThresholdRule(appliedThreshold)} - In column for ${timeInColumn}`}
                />
              )}
              {isInGroup ? (
                <button
                  type="button"
                  onClick={handleRemoveFromGroupClick}
                  disabled={isRemovingFromGroup}
                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  title="Remove from group"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              ) : (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Priority badge */}
            {product.priority && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                  product.priority
                )}`}
              >
                {product.priority}
              </span>
            )}

            {/* Rejected Badge */}
            {product.isRejected && (
              <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Rejected
              </div>
            )}
          </div>
        </div>

      {/* Meta badges (compact, neutral) */}
      <div className="flex flex-wrap gap-1">
        {product.stockLevel !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-white">
            Qty: {product.stockLevel}
          </span>
        )}
        {product.unitPrice !== null && formatCurrency(product.unitPrice) && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-white">
            Unit Price: {formatCurrency(product.unitPrice)}
          </span>
        )}
        {product.stockLevel !== null && product.unitPrice !== null && formatCurrency(product.stockLevel * product.unitPrice) && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-white">
            Total: {formatCurrency(product.stockLevel * product.unitPrice)}
          </span>
        )}
      </div>

      {/* Product Tags */}
      {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created: {formatDateWithTime(product.createdAt)}</span>
        {commentCount > 0 && (
          <CommentBadge
            count={commentCount}
            highlight
            variant="card"
            onClick={(event) => {
              event.stopPropagation();
              onView?.();
            }}
          />
        )}
      </div>

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
