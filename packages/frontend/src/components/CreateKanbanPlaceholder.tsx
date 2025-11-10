import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { KanbanType } from '@invenflow/shared';

interface CreateKanbanPlaceholderProps {
  type: KanbanType;
  onClick: () => void;
  viewMode?: 'grid' | 'compact';
}

export const CreateKanbanPlaceholder: React.FC<CreateKanbanPlaceholderProps> = ({
  type,
  onClick,
  viewMode = 'grid'
}) => {
  const typeLabel = type === 'order' ? 'Order' : 'Receive';
  const typeColor = type === 'order' ? 'blue' : 'green';

  if (viewMode === 'compact') {
    return (
      <div
        onClick={onClick}
        className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-${typeColor}-100 rounded-lg flex items-center justify-center group-hover:bg-${typeColor}-200 transition-colors`}>
              <PlusIcon className={`w-5 h-5 text-${typeColor}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 group-hover:text-gray-900">
                Create New {typeLabel} Kanban
              </h3>
              <p className="text-sm text-gray-500">
                Click to create a new {typeLabel.toLowerCase()} kanban board
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-800`}>
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
      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 cursor-pointer group min-h-[200px] flex flex-col items-center justify-center"
    >
      <div className={`w-16 h-16 bg-${typeColor}-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-${typeColor}-200 transition-colors`}>
        <PlusIcon className={`w-8 h-8 text-${typeColor}-600`} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-700 group-hover:text-gray-900 mb-2 text-center">
        Create New {typeLabel} Kanban
      </h3>
      
      <p className="text-sm text-gray-500 text-center mb-4">
        Click to create a new {typeLabel.toLowerCase()} kanban board to manage your workflow
      </p>
      
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-800`}>
          {typeLabel}
        </span>
      </div>
    </div>
  );
};

export default CreateKanbanPlaceholder;
