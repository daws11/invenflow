import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface Column {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  width?: number;
  resizable?: boolean;
}

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onUpdateColumns: (columns: Column[]) => void;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'select', name: 'Select', visible: true, order: 0, resizable: false },
  { id: 'expand', name: 'Expand', visible: true, order: 1, resizable: false },
  { id: 'product', name: 'Product Details', visible: true, order: 2, width: 300 },
  { id: 'assignment', name: 'Assignment', visible: true, order: 3, width: 200 },
  { id: 'status', name: 'Status & Priority', visible: true, order: 4, width: 180 },
  { id: 'stock', name: 'Stock Level', visible: true, order: 5, width: 150 },
  { id: 'category', name: 'Category', visible: true, order: 6, width: 120 },
  { id: 'supplier', name: 'Supplier', visible: true, order: 7, width: 150 },
  { id: 'days', name: 'Days in Inventory', visible: true, order: 8, width: 140 },
  { id: 'images', name: 'Images', visible: true, order: 9, width: 100 },
  { id: 'actions', name: 'Actions', visible: true, order: 10, resizable: false },
];

export function ColumnManager({
  isOpen,
  onClose,
  columns: initialColumns,
  onUpdateColumns,
}: ColumnManagerProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns.length > 0 ? initialColumns : DEFAULT_COLUMNS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialColumns.length > 0) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  const handleToggleVisibility = (columnId: string) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(updatedColumns);
    setHasChanges(true);
  };

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) return;

    const newIndex = direction === 'up' ? columnIndex - 1 : columnIndex + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const updatedColumns = [...columns];
    const [movedColumn] = updatedColumns.splice(columnIndex, 1);
    updatedColumns.splice(newIndex, 0, movedColumn);

    // Update order values
    const reorderedColumns = updatedColumns.map((col, index) => ({
      ...col,
      order: index,
    }));

    setColumns(reorderedColumns);
    setHasChanges(true);
  };

  const handleWidthChange = (columnId: string, width: number) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, width: Math.max(50, width) } : col
    );
    setColumns(updatedColumns);
    setHasChanges(true);
  };

  const handleApply = () => {
    onUpdateColumns(columns);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setColumns(DEFAULT_COLUMNS);
    setHasChanges(true);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setColumns(initialColumns.length > 0 ? initialColumns : DEFAULT_COLUMNS);
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const visibleColumns = columns.filter(col => col.visible);
  const hiddenColumns = columns.filter(col => !col.visible);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCancel} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Cog6ToothIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Manage Columns</h3>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visible Columns */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Visible Columns ({visibleColumns.length})
                </h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {visibleColumns
                    .sort((a, b) => a.order - b.order)
                    .map((column, index) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-green-50"
                    >
                      <div className="flex items-center flex-1">
                        <EyeIcon className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {column.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Width Control */}
                        {column.resizable !== false && (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={column.width || 150}
                              onChange={(e) => handleWidthChange(column.id, parseInt(e.target.value) || 150)}
                              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                              min="50"
                              max="500"
                            />
                            <span className="text-xs text-gray-500">px</span>
                          </div>
                        )}

                        {/* Move Controls */}
                        <button
                          onClick={() => handleMoveColumn(column.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveColumn(column.id, 'down')}
                          disabled={index === visibleColumns.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>

                        {/* Hide Button */}
                        {column.id !== 'select' && column.id !== 'actions' && (
                          <button
                            onClick={() => handleToggleVisibility(column.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Hide column"
                          >
                            <EyeSlashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidden Columns */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Hidden Columns ({hiddenColumns.length})
                </h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {hiddenColumns.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-3 border border-gray-200 rounded-md">
                      No hidden columns
                    </p>
                  ) : (
                    hiddenColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50"
                      >
                        <div className="flex items-center flex-1">
                          <EyeSlashIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">
                            {column.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleVisibility(column.id)}
                          className="p-1 text-green-500 hover:text-green-700"
                          title="Show column"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use the eye icons to show/hide columns</li>
                <li>• Use arrow buttons to reorder visible columns</li>
                <li>• Adjust column widths using the number inputs</li>
                <li>• Some columns (Select, Actions) cannot be hidden</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
            >
              Apply Changes
            </button>
            <button
              onClick={handleReset}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Reset to Default
            </button>
            <button
              onClick={handleCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
