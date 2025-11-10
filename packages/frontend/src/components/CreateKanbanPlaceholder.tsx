import React from 'react';
import { Plus } from 'lucide-react';
import { KanbanType } from '@invenflow/shared';

interface CreateKanbanPlaceholderProps {
  type: KanbanType;
  onClick: () => void;
  viewMode: 'grid' | 'compact';
}

const CreateKanbanPlaceholder: React.FC<CreateKanbanPlaceholderProps> = ({ 
  type, 
  onClick, 
  viewMode 
}) => {
  const typeLabel = type === 'order' ? 'Purchasing' : 'Receiving';

  if (viewMode === 'compact') {
    return (
      <div 
        onClick={onClick}
        className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-600 group-hover:text-blue-700">
                Create New {typeLabel} Kanban
              </h3>
              <p className="text-sm text-gray-500">
                Click to create a new {type === 'order' ? 'purchasing' : 'receiving'} kanban board
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              type === 'order'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group min-h-[200px] flex flex-col items-center justify-center animate-fade-in"
    >
      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
        <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-600 group-hover:text-blue-700 mb-2 text-center">
        Create New {typeLabel} Kanban
      </h3>
      
      <p className="text-sm text-gray-500 text-center mb-4">
        Click to create a new {type === 'order' ? 'purchasing' : 'receiving'} kanban board
      </p>
      
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
        type === 'order'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-green-100 text-green-800'
      }`}>
        {typeLabel}
      </span>
    </div>
  );
};

export default CreateKanbanPlaceholder;
