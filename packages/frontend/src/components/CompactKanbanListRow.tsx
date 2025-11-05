import { Link } from 'react-router-dom';
import { Kanban, ORDER_COLUMNS, RECEIVE_COLUMNS } from '@invenflow/shared';
import { ChevronDownIcon, ChevronRightIcon, Cog6ToothIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface CompactKanbanListRowProps {
  kanban: Kanban & { products?: any[]; productCount?: number };
  onSettings: (kanban: Kanban) => void;
  onCopyUrl: (kanban: Kanban) => void;
  linkedKanbanName: string | null;
}

export default function CompactKanbanListRow({
  kanban,
  onSettings,
  onCopyUrl,
  linkedKanbanName,
}: CompactKanbanListRowProps) {
  const { isKanbanCollapsed, toggleKanbanCollapsed } = useViewPreferencesStore();
  const isCollapsed = isKanbanCollapsed(kanban.id);

  const getProductCount = () => {
    if (typeof kanban.productCount === 'number') {
      return kanban.productCount;
    }
    if (Array.isArray(kanban.products)) {
      return kanban.products.length;
    }
    return 0;
  };

  const getKanbanDescription = () => {
    return kanban.description?.trim() || 'No description';
  };

  const getColumns = () => {
    return kanban.type === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
  };

  const getProductsByColumn = (column: string) => {
    if (!Array.isArray(kanban.products)) return [];
    return kanban.products.filter(p => p.columnStatus === column);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="compact-kanban-row border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Main Row */}
      <div className="flex items-center justify-between p-4 hover:bg-gray-50">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleKanbanCollapsed(kanban.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
            type="button"
            aria-label={isCollapsed ? 'Expand kanban' : 'Collapse kanban'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>

          {/* Kanban Name */}
          <div className="flex-1 min-w-0">
            <Link to={`/kanban/${kanban.id}`} className="hover:text-blue-600">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{kanban.name}</h3>
            </Link>
          </div>

          {/* Type Badge */}
          <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            kanban.type === 'order'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {kanban.type === 'order' ? 'Order' : 'Receive'}
          </span>

          {/* Linked Badge */}
          {kanban.linkedKanbanId && (
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Linked
            </span>
          )}

          {/* Product Count */}
          <div className="hidden lg:flex items-center text-sm text-gray-600">
            <span className="font-medium">{getProductCount()}</span>
            <span className="ml-1">products</span>
          </div>

          {/* Description (truncated) */}
          <div className="hidden xl:block flex-1 min-w-0 max-w-md">
            <p className="text-sm text-gray-600 truncate">{getKanbanDescription()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 ml-4 flex-shrink-0">
          <Link
            to={`/kanban/${kanban.id}`}
            className="btn-primary text-sm px-3 py-2"
          >
            View Board
          </Link>
          <button
            onClick={() => onSettings(kanban)}
            className="text-gray-400 hover:text-blue-500 p-2 rounded transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          {kanban.type === 'order' && kanban.publicFormToken && (
            <button
              onClick={() => onCopyUrl(kanban)}
              className="text-gray-400 hover:text-green-500 p-2 rounded transition-colors"
              title="Copy public form URL"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content - Products by Column */}
      {!isCollapsed && Array.isArray(kanban.products) && kanban.products.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {/* Linked Board Info */}
          {kanban.linkedKanbanId && linkedKanbanName && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-purple-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="font-medium">Linked to:</span>
                <span className="ml-1">{linkedKanbanName}</span>
              </div>
            </div>
          )}

          {/* Products grouped by column */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getColumns().map((column) => {
              const columnProducts = getProductsByColumn(column);
              if (columnProducts.length === 0) return null;

              return (
                <div key={column} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 text-sm">{column}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      {columnProducts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnProducts.slice(0, 5).map((product) => (
                      <div key={product.id} className="text-sm border-l-2 border-gray-300 pl-2 py-1">
                        <div className="font-medium text-gray-900 truncate">{product.productDetails}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          {product.sku && (
                            <span className="text-xs text-gray-500 truncate">{product.sku}</span>
                          )}
                          {product.priority && (
                            <span className={`text-xs font-medium ${getPriorityColor(product.priority)}`}>
                              {product.priority}
                            </span>
                          )}
                          {product.stockLevel !== null && (
                            <span className="text-xs text-blue-600">
                              Stock: {product.stockLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {columnProducts.length > 5 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{columnProducts.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Description */}
          {kanban.description && kanban.description.trim() && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">{kanban.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

