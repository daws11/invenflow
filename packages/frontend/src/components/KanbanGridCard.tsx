import { Link } from 'react-router-dom';
import { Kanban, LinkedReceiveKanban } from '@invenflow/shared';
import { Cog6ToothIcon, DocumentDuplicateIcon, LinkIcon } from '@heroicons/react/24/outline';

interface KanbanGridCardProps {
  kanban: Kanban & { products?: any[]; productCount?: number; linkedKanbans?: LinkedReceiveKanban[] };
  onSettings: (kanban: Kanban) => void;
  onCopyUrl: (kanban: Kanban) => void;
  productCount: number;
  description: string;
}

export function KanbanGridCard({
  kanban,
  onSettings,
  onCopyUrl,
  productCount,
  description,
}: KanbanGridCardProps) {
  // Get linked status
  const getLinkedStatus = () => {
    if (kanban.type === 'order') {
      const linkedCount = kanban.linkedKanbans?.length || 0;
      return {
        isLinked: linkedCount > 0,
        count: linkedCount,
        type: 'order' as const
      };
    } else {
      // For receive kanbans, check if it has a location (indicates it can receive links)
      return {
        isLinked: !!kanban.locationId,
        count: 0,
        type: 'receive' as const
      };
    }
  };

  const linkedStatus = getLinkedStatus();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{kanban.name}</h3>
          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              kanban.type === 'order'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {kanban.type === 'order' ? 'Order' : 'Receive'}
            </span>
            
            {/* Linked Badge */}
            {linkedStatus.isLinked && (
              <span 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  <>Ready</>
                )}
              </span>
            )}

            {/* Product Count Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {productCount} {productCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Linked Kanbans List for Order Kanbans */}
          {linkedStatus.isLinked && kanban.type === 'order' && kanban.linkedKanbans && kanban.linkedKanbans.length > 0 && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
              <div className="font-medium text-purple-700 mb-1">Linked to:</div>
              <div className="space-y-1">
                {kanban.linkedKanbans.map((link) => (
                  <div key={link.linkId} className="flex items-start text-purple-600">
                    <span className="w-1 h-1 bg-purple-400 rounded-full mr-1.5 mt-1.5 flex-shrink-0"></span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{link.name}</span>
                      {link.locationName && (
                        <div className="text-purple-500">
                          📍 {link.locationName}
                          {link.locationArea && ` - ${link.locationArea}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Info for Receive Kanbans */}
          {linkedStatus.isLinked && kanban.type === 'receive' && kanban.locationId && (
            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-700">
              <LinkIcon className="w-3 h-3 inline mr-1" />
              <span className="font-medium">Ready to receive</span>
            </div>
          )}

          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </div>

        <button
          onClick={() => onSettings(kanban)}
          className="text-gray-400 hover:text-blue-500 p-2 rounded transition-colors ml-2"
          title="Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-end items-center pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Link
            to={`/kanban/${kanban.id}`}
            className="btn-primary text-sm px-3 py-1.5"
          >
            View Board
          </Link>
          {kanban.type === 'order' && kanban.publicFormToken && (
            <button
              onClick={() => onCopyUrl(kanban)}
              className="text-gray-400 hover:text-green-500 p-1.5 rounded transition-colors"
              title="Copy public form URL"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

