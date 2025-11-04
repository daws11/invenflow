import { useState } from 'react';
import { Kanban, ThresholdRule } from '@invenflow/shared';
import BoardLinkingModal from './BoardLinkingModal';
import { EditKanbanModal } from './EditKanbanModal';
import { DeleteKanbanModal } from './DeleteKanbanModal';
import { ThresholdSettingsSection } from './ThresholdSettingsSection';
import { useToast } from '../store/toastStore';
import api from '../utils/api';
import {
  PencilIcon,
  LinkIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface KanbanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanban: Kanban | null;
  onUpdate: (id: string, name: string, description?: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  productCount?: number;
}

export function KanbanSettingsModal({
  isOpen,
  onClose,
  kanban,
  onUpdate,
  onDelete,
  productCount = 0,
}: KanbanSettingsModalProps) {
  const toast = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>(kanban?.thresholdRules || []);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  const handleCopyUrl = () => {
    if (!kanban?.publicFormToken) return;
    const url = `${window.location.origin}/form/${kanban.publicFormToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Form URL copied to clipboard!');
  };

  const handleViewUrl = () => {
    if (!kanban?.publicFormToken) return;
    const url = `${window.location.origin}/form/${kanban.publicFormToken}`;
    window.open(url, '_blank');
  };

  const handleSaveThresholdRules = async () => {
    if (!kanban) return;
    
    setIsSavingThreshold(true);
    try {
      await api.put(`/api/kanbans/${kanban.id}`, {
        thresholdRules: thresholdRules,
      });
      toast.success('Threshold rules saved successfully!');
      setShowThresholdSettings(false);
      // Refresh the page or update the kanban data
      window.location.reload();
    } catch (error) {
      console.error('Failed to save threshold rules:', error);
      toast.error('Failed to save threshold rules');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const handleClose = () => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowLinkingModal(false);
    setShowThresholdSettings(false);
    onClose();
  };

  if (!isOpen || !kanban) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl transform transition-all animate-scale-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Kanban Settings</h3>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Kanban Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{kanban.name}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                kanban.type === 'order'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {kanban.type === 'order' ? 'Order' : 'Receive'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {kanban.description?.trim() || 'No description'}
            </p>
            {productCount > 0 && (
              <p className="text-sm text-gray-600">
                {productCount} product(s) in this board
              </p>
            )}
          </div>

          {/* Settings Options */}
          <div className="space-y-2">
            {/* Edit Name */}
            <button
              onClick={() => setShowEditModal(true)}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Edit Name</p>
                <p className="text-xs text-gray-500">Change the kanban board name</p>
              </div>
            </button>

            {/* Link/Unlink Board */}
            <button
              onClick={() => setShowLinkingModal(true)}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <LinkIcon className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {kanban.linkedKanbanId ? 'Manage Link' : 'Link Board'}
                </p>
                <p className="text-xs text-gray-500">
                  {kanban.linkedKanbanId
                    ? 'Manage board linking settings'
                    : 'Link this board to another kanban'}
                </p>
              </div>
            </button>

            {/* Threshold Settings */}
            <button
              onClick={() => setShowThresholdSettings(!showThresholdSettings)}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ClockIcon className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Threshold Settings</p>
                <p className="text-xs text-gray-500">
                  Configure color alerts based on time in column
                </p>
              </div>
            </button>

            {/* Threshold Settings Section (Expandable) */}
            {showThresholdSettings && (
              <div className="px-4 py-4 bg-gray-50 rounded-lg border border-gray-200">
                <ThresholdSettingsSection
                  thresholdRules={thresholdRules}
                  onChange={setThresholdRules}
                  kanbanType={kanban.type as 'order' | 'receive'}
                  products={[]}
                />
                
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setThresholdRules(kanban?.thresholdRules || []);
                      setShowThresholdSettings(false);
                    }}
                    className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveThresholdRules}
                    disabled={isSavingThreshold}
                    className="px-3 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingThreshold ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Public Form actions (only for order kanbans) */}
            {kanban.type === 'order' && kanban.publicFormToken && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="px-4 py-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyUrl}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                      Copy URL
                    </button>
                    <button
                      onClick={handleViewUrl}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View Form
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Delete Kanban */}
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <TrashIcon className="w-5 h-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">Delete Kanban</p>
                <p className="text-xs text-red-500">Permanently delete this board</p>
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showEditModal && (
        <EditKanbanModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          kanban={kanban}
          onUpdate={onUpdate}
        />
      )}

      {showDeleteModal && (
        <DeleteKanbanModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          kanban={kanban}
          onDelete={onDelete}
          productCount={productCount}
        />
      )}

      {showLinkingModal && (
        <BoardLinkingModal
          isOpen={showLinkingModal}
          onClose={() => setShowLinkingModal(false)}
          currentKanban={kanban}
        />
      )}
    </>
  );
}

