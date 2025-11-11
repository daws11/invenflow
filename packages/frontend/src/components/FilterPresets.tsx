import { useState } from 'react';
import { 
  BookmarkIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface FilterPresetsProps {
  className?: string;
}

export default function FilterPresets({ className }: FilterPresetsProps) {
  const {
    filterPresets,
    activePresetId,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
    updateFilterPreset,
    hasActiveFilters,
  } = useViewPreferencesStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    if (editingPresetId) {
      updateFilterPreset(editingPresetId, {
        name: presetName.trim(),
        description: presetDescription.trim() || undefined,
      });
      setEditingPresetId(null);
    } else {
      saveFilterPreset(presetName.trim(), presetDescription.trim() || undefined);
    }
    
    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleEditPreset = (preset: any) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetDescription(preset.description || '');
    setShowSaveDialog(true);
  };

  const handleCancelEdit = () => {
    setEditingPresetId(null);
    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  const formatPresetSummary = (preset: any) => {
    const filters = preset.filters;
    const parts = [];
    
    if (filters.supplierFilter) parts.push(`Supplier: ${filters.supplierFilter}`);
    if (filters.categoryFilter?.length > 0) parts.push(`Categories: ${filters.categoryFilter.length}`);
    if (filters.priorityFilter?.length > 0) parts.push(`Priorities: ${filters.priorityFilter.length}`);
    if (filters.locationFilter?.length > 0) parts.push(`Locations: ${filters.locationFilter.length}`);
    if (filters.tagFilter?.length > 0) parts.push(`Tags: ${filters.tagFilter.length}`);
    if (filters.stockLevelMin !== null || filters.stockLevelMax !== null) {
      parts.push(`Stock: ${filters.stockLevelMin || 0}-${filters.stockLevelMax || '∞'}`);
    }
    if (filters.priceMin !== null || filters.priceMax !== null) {
      parts.push(`Price: $${filters.priceMin || 0}-${filters.priceMax || '∞'}`);
    }
    if (filters.createdPreset) parts.push(`Created: ${filters.createdPreset}`);
    if (filters.updatedPreset) parts.push(`Updated: ${filters.updatedPreset}`);
    
    return parts.length > 0 ? parts.slice(0, 3).join(', ') + (parts.length > 3 ? '...' : '') : 'No filters';
  };

  if (filterPresets.length === 0 && !hasActiveFilters()) {
    return null;
  }

  return (
    <div className={`${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <BookmarkIcon className="w-4 h-4 mr-1" />
          Filter Presets
        </h4>
        {hasActiveFilters() && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <PlusIcon className="w-3 h-3 mr-1" />
            Save Current
          </button>
        )}
      </div>

      {/* Preset List */}
      {filterPresets.length > 0 && (
        <div className="space-y-2 mb-4">
          {filterPresets.map((preset) => (
            <div
              key={preset.id}
              className={`group relative p-3 rounded-lg border transition-all ${
                activePresetId === preset.id
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => loadFilterPreset(preset.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center mb-1">
                    {activePresetId === preset.id ? (
                      <BookmarkSolidIcon className="w-4 h-4 text-blue-600 mr-2" />
                    ) : (
                      <BookmarkIcon className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {preset.name}
                    </span>
                  </div>
                  {preset.description && (
                    <p className="text-xs text-gray-600 mb-1 ml-6">
                      {preset.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-6">
                    {formatPresetSummary(preset)}
                  </p>
                </button>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditPreset(preset)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Edit preset"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFilterPreset(preset.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete preset"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPresetId ? 'Edit Filter Preset' : 'Save Filter Preset'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., High Priority Items"
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Brief description of this filter combination"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              
              {!editingPresetId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-2">Current filters will be saved:</p>
                  <p className="text-xs text-gray-500">
                    {hasActiveFilters() ? 'Multiple filters active' : 'No active filters'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                {editingPresetId ? 'Update' : 'Save'} Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
