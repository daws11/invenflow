import { useState } from 'react';
import {
  XMarkIcon,
  TrashIcon,
  XCircleIcon,
  RectangleGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Product } from '@invenflow/shared';
import { useBulkSelectionStore } from '../store/bulkSelectionStore';

interface BulkActionBarProps {
  products: Product[];
  onReject: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onMove: () => void;
}

export function BulkActionBar({
  products,
  onReject,
  onDelete,
  onGroup,
  onMove,
}: BulkActionBarProps) {
  const { selectedProductIds, clearSelection, getSelectedColumn } = useBulkSelectionStore();
  const selectedCount = selectedProductIds.size;
  const selectedColumn = getSelectedColumn(products);

  // Check if rejection is available (only for "New Request" and "In Review")
  const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
  const canReject = selectedProducts.every(
    p => p.columnStatus === 'New Request' || p.columnStatus === 'In Review'
  );

  // Group and move are only available if all selected products are in the same column
  const canGroupOrMove = selectedColumn !== null;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-2xl animate-slide-up lg:left-[var(--sidebar-width)]">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-6 lg:pr-[640px]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Selected Count */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
            {selectedColumn && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Column: {selectedColumn}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Reject Button - only if valid columns */}
            {canReject && (
              <button
                onClick={onReject}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                title="Reject selected items"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Reject</span>
              </button>
            )}

            {/* Delete Button - always available */}
            <button
              onClick={onDelete}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              title="Delete selected items"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            {/* Group Button - only if same column */}
            {canGroupOrMove && (
              <button
                onClick={onGroup}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                title="Group selected items"
              >
                <RectangleGroupIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Group</span>
              </button>
            )}

            {/* Move Button - only if same column */}
            {/* {canGroupOrMove && (
              <button
                onClick={onMove}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                title="Move selected items"
              >
                <ArrowRightIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Move</span>
              </button>
            )} */}

            {/* Clear Selection Button */}
            <button
              onClick={clearSelection}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              title="Clear selection"
            >
              <XMarkIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

