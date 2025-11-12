import {
  PlusIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { InventoryItem } from '@invenflow/shared';

interface InventoryTableActionsProps {
  selectedItems: InventoryItem[];
  onCreateNew: () => void;
  onBulkDelete: (items: InventoryItem[]) => void;
  onBulkArchive: (items: InventoryItem[]) => void;
  onBulkUnarchive: (items: InventoryItem[]) => void;
  onExport: (items?: InventoryItem[]) => void;
  onShowFilters: () => void;
  onShowColumnManager: () => void;
  totalItems: number;
  loading?: boolean;
}

export function InventoryTableActions({
  selectedItems,
  onCreateNew,
  onBulkDelete,
  onBulkArchive,
  onBulkUnarchive,
  onExport,
  onShowFilters,
  onShowColumnManager,
  totalItems,
  loading = false,
}: InventoryTableActionsProps) {
  const hasSelection = selectedItems.length > 0;
  const hasArchivedItems = selectedItems.some(item => (item as any).archived);
  const hasActiveItems = selectedItems.some(item => !(item as any).archived);

  const handleBulkAction = (action: () => void, actionName: string) => {
    if (window.confirm(`Are you sure you want to ${actionName} ${selectedItems.length} selected items?`)) {
      action();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200">
      {/* Left side - Primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCreateNew}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Product
        </button>

        <div className="flex items-center text-sm text-gray-500">
          <span>{totalItems} total items</span>
          {hasSelection && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {selectedItems.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Right side - Secondary actions and bulk actions */}
      <div className="flex items-center gap-2">
        {/* Bulk Actions (shown when items are selected) */}
        {hasSelection && (
          <div className="flex items-center gap-2 mr-4 p-2 bg-gray-50 rounded-lg border">
            <span className="text-sm text-gray-600 font-medium">Bulk Actions:</span>
            
            {hasActiveItems && (
              <>
                <button
                  onClick={() => handleBulkAction(() => onBulkDelete(selectedItems), 'delete')}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="Delete selected items"
                >
                  <TrashIcon className="h-3 w-3 mr-1" />
                  Delete
                </button>
                
                <button
                  onClick={() => handleBulkAction(() => onBulkArchive(selectedItems), 'archive')}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  title="Archive selected items"
                >
                  <ArchiveBoxIcon className="h-3 w-3 mr-1" />
                  Archive
                </button>
              </>
            )}

            {hasArchivedItems && (
              <button
                onClick={() => handleBulkAction(() => onBulkUnarchive(selectedItems), 'unarchive')}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Unarchive selected items"
              >
                <ArchiveBoxXMarkIcon className="h-3 w-3 mr-1" />
                Unarchive
              </button>
            )}

            <button
              onClick={() => onExport(selectedItems)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Export selected items"
            >
              <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
              Export
            </button>
          </div>
        )}

        {/* Regular Actions */}
        <button
          onClick={() => onExport()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Export all items"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export
        </button>

        <button
          onClick={onShowFilters}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Show filters"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filters
        </button>

        <button
          onClick={onShowColumnManager}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Manage columns"
        >
          <Cog6ToothIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
