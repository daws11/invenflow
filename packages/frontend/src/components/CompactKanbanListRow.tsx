import { Link } from 'react-router-dom';
import { Kanban, ORDER_COLUMNS, RECEIVE_COLUMNS, INVESTMENT_COLUMNS, LinkedReceiveKanban } from '@invenflow/shared';
import { ChevronDownIcon, ChevronRightIcon, Cog6ToothIcon, DocumentDuplicateIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface CompactKanbanListRowProps {
  kanban: Kanban & { products?: any[]; productCount?: number; linkedKanbans?: LinkedReceiveKanban[] };
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

  // Use centralized product count utility
  // const productCount = getProductCount(kanban); // Not used in this component

  // Get linked status
  const getLinkedStatus = () => {
    if (kanban.type === 'order') {
      const linkedCount = kanban.linkedKanbans?.length || 0;
      return {
        isLinked: linkedCount > 0,
        count: linkedCount,
        type: 'order' as const,
      };
    }

    if (kanban.type === 'receive') {
      return {
        isLinked: !!kanban.locationId,
        count: 0,
        type: 'receive' as const,
      };
    }

    return {
      isLinked: false,
      count: 0,
      type: 'investment' as const,
    };
  };

  const linkedStatus = getLinkedStatus();

  const typeBadgeStyles: Record<
    'order' | 'receive' | 'investment',
    { label: string; className: string }
  > = {
    order: { label: 'Order', className: 'bg-blue-100 text-blue-800' },
    receive: { label: 'Receive', className: 'bg-green-100 text-green-800' },
    investment: { label: 'Investment', className: 'bg-yellow-100 text-yellow-800' },
  };
  const currentTypeBadge = typeBadgeStyles[kanban.type];

  const getKanbanDescription = () => {
    return kanban.description?.trim() || 'No description';
  };

  const getColumns = () => {
    switch (kanban.type) {
      case 'order':
        return ORDER_COLUMNS;
      case 'receive':
        return RECEIVE_COLUMNS;
      case 'investment':
        return INVESTMENT_COLUMNS;
      default:
        return ORDER_COLUMNS;
    }
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
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentTypeBadge.className}`}
          >
            {currentTypeBadge.label}
          </span>

          {/* Linked Badge */}
          {linkedStatus.isLinked && (
            <span 
              className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                linkedStatus.type === 'order'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
              title={linkedStatus.type === 'order' 
                ? `Linked to ${linkedStatus.count} receive kanban${linkedStatus.count > 1 ? 's' : ''}`
                : 'Ready to receive from order kanbans'}
            >
              <LinkIcon className="w-3 h-3 mr-1" />
              {linkedStatus.type === 'order' ? (
                <>Linked ({linkedStatus.count}/5)</>
              ) : (
                <>Ready to Link</>
              )}
            </span>
          )}


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
          {/* Linked Board Info - New Multi-Link System */}
          {linkedStatus.isLinked && kanban.type === 'order' && kanban.linkedKanbans && kanban.linkedKanbans.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <div className="flex items-start text-sm text-purple-700">
                <LinkIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Linked to {kanban.linkedKanbans.length} receive kanban{kanban.linkedKanbans.length > 1 ? 's' : ''}:</span>
                  <div className="mt-2 space-y-1">
                    {kanban.linkedKanbans.map((link) => (
                      <div key={link.linkId} className="flex items-center text-purple-600">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                        <span className="font-medium">{link.name}</span>
                        {link.locationName && (
                          <span className="ml-2 text-purple-500">
                            📍 {link.locationName}
                            {link.locationArea && ` - ${link.locationArea}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Receive Kanban Location Info */}
          {linkedStatus.isLinked && kanban.type === 'receive' && kanban.locationId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-indigo-700">
                <LinkIcon className="w-4 h-4 mr-2" />
                <span className="font-medium">Ready to receive products from order kanbans</span>
              </div>
            </div>
          )}
          
          {/* Old single link system (backward compatibility) */}
          {kanban.linkedKanbanId && linkedKanbanName && !kanban.linkedKanbans && (
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

