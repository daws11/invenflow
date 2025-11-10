import { useState, useEffect } from 'react';
import { Kanban, ThresholdRule, FormFieldSettings, DEFAULT_FORM_FIELD_SETTINGS, LinkedReceiveKanban } from '@invenflow/shared';
import { DeleteKanbanModal } from './DeleteKanbanModal';
import { ThresholdSettingsSection } from './ThresholdSettingsSection';
import { FormFieldConfiguration } from './FormFieldConfiguration';
import { KanbanLinkingSection } from './KanbanLinkingSection';
import { useToast } from '../store/toastStore';
import { useKanbanStore } from '../store/kanbanStore';
import api from '../utils/api';
import { locationApi } from '../utils/api';
import {
  PencilIcon,
  LinkIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ClockIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Slider } from './Slider';
import { SliderTabs, SliderTab } from './SliderTabs';

interface KanbanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanban: Kanban | null;
  onUpdate: (id: string, name: string, description?: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  productCount?: number;
}

type TabType = 'overview' | 'edit' | 'linking' | 'publicForm' | 'threshold';

export function KanbanSettingsModal({
  isOpen,
  onClose,
  kanban,
  onUpdate,
  onDelete,
  productCount = 0,
}: KanbanSettingsModalProps) {
  const toast = useToast();
  const { togglePublicForm, currentKanban } = useKanbanStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Linking state (kept for backward compatibility if needed)
  // const [selectedKanbanId, setSelectedKanbanId] = useState<string>('');
  // const [isLinking, setIsLinking] = useState(false);

  // Public form state
  const [isTogglingPublicForm, setIsTogglingPublicForm] = useState(false);
  const [optimisticPublicFormEnabled, setOptimisticPublicFormEnabled] = useState(kanban?.isPublicFormEnabled ?? true);
  const [formFieldSettings, setFormFieldSettings] = useState<FormFieldSettings>(
    kanban?.formFieldSettings || DEFAULT_FORM_FIELD_SETTINGS
  );
  const [isSavingFormFields, setIsSavingFormFields] = useState(false);

  // Threshold state
  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>(kanban?.thresholdRules || []);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  // Receive kanban default location
  const [locations, setLocations] = useState<Array<{ id: string; name: string; area?: string; code?: string }>>([]);
  const [editLocationId, setEditLocationId] = useState<string | null>(kanban?.locationId ?? null);

  // Initialize edit form when kanban changes
  useEffect(() => {
    if (kanban) {
      setEditName(kanban.name);
      setEditDescription(kanban.description ?? '');
      setThresholdRules(kanban.thresholdRules || []);
      setOptimisticPublicFormEnabled(kanban.isPublicFormEnabled);
      setFormFieldSettings(kanban.formFieldSettings || DEFAULT_FORM_FIELD_SETTINGS);
      setEditLocationId(kanban.locationId ?? null);
    }
  }, [kanban]);

  // Load locations for receive kanban
  useEffect(() => {
    if (!isOpen || !kanban || kanban.type !== 'receive') return;
    locationApi.getAll().then(res => {
      setLocations(res.locations || []);
    }).catch(() => setLocations([]));
  }, [isOpen, kanban]);

  if (!isOpen || !kanban) return null;

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

  const handleTogglePublicForm = async () => {
    if (!kanban) return;
    
    const newValue = !optimisticPublicFormEnabled;
    const previousValue = optimisticPublicFormEnabled;
    
    // Optimistic update - change UI immediately
    setOptimisticPublicFormEnabled(newValue);
    setIsTogglingPublicForm(true);
    
    try {
      await togglePublicForm(kanban.id, newValue);
      toast.success(
        newValue 
          ? 'Public form enabled successfully' 
          : 'Public form disabled successfully'
      );
    } catch (error) {
      // Revert on error
      setOptimisticPublicFormEnabled(previousValue);
      toast.error('Failed to update public form settings');
    } finally {
      setIsTogglingPublicForm(false);
    }
  };

  const handleSaveFormFieldSettings = async () => {
    if (!kanban) return;
    
    setIsSavingFormFields(true);
    
    try {
      const { kanbanApi } = await import('../utils/api');
      await kanbanApi.updatePublicFormSettings(kanban.id, {
        formFieldSettings,
      });
      
      // Update the kanban store
      const { updateKanban } = useKanbanStore.getState();
      updateKanban(kanban.id, { formFieldSettings });
      
      toast.success('Form field settings saved successfully');
    } catch (error) {
      console.error('Failed to save form field settings:', error);
      toast.error('Failed to save form field settings');
    } finally {
      setIsSavingFormFields(false);
    }
  };

  // Edit functionality
  const validateEditForm = (): boolean => {
    if (!editName.trim()) {
      setEditError('Kanban name is required');
      return false;
    }
    if (editName.trim().length < 3) {
      setEditError('Kanban name must be at least 3 characters');
      return false;
    }
    if (editName.trim().length > 255) {
      setEditError('Kanban name must be less than 255 characters');
      return false;
    }
    setEditError(null);
    return true;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setIsSubmittingEdit(true);
    try {
      const normalizedDescription = editDescription.trim();
      await onUpdate(
        kanban.id,
        editName.trim(),
        normalizedDescription.length > 0 ? normalizedDescription : null
      );
      // Update default location for receive kanban if changed
      if (kanban.type === 'receive') {
        const newLocationId = editLocationId || null;
        if (newLocationId !== kanban.locationId) {
          await api.put(`/api/kanbans/${kanban.id}`, { locationId: newLocationId });
        }
      }
      toast.success('Kanban updated successfully!');
      setActiveTab('overview');
    } catch (error) {
      console.error('Failed to update kanban:', error);
      toast.error('Failed to update kanban');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Old linking functionality removed - now handled in KanbanLinkingSection component

  // Threshold functionality
  const handleSaveThresholdRules = async () => {
    setIsSavingThreshold(true);
    try {
      await api.put(`/api/kanbans/${kanban.id}`, {
        thresholdRules: thresholdRules,
      });
      toast.success('Threshold rules saved successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to save threshold rules:', error);
      toast.error('Failed to save threshold rules');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // Get linked info from currentKanban if available
  const activeKanban = currentKanban?.id === kanban.id ? currentKanban : kanban;
  const linkedKanbans = (activeKanban as any)?.linkedKanbans as LinkedReceiveKanban[] || [];

  // Tab Contents
  const overviewContent = (
    <div className="space-y-6">
      {/* Kanban Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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

      {/* Linking Status */}
      {kanban.type === 'order' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <LinkIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h5 className="font-medium text-purple-900">Linked Receive Kanbans</h5>
          </div>
          {linkedKanbans.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-purple-700 mb-2">
                This order kanban is linked to {linkedKanbans.length} receive kanban{linkedKanbans.length > 1 ? 's' : ''}:
              </p>
              {linkedKanbans.map((link) => (
                <div key={link.linkId} className="flex items-start bg-white rounded p-2">
                  <CheckCircleIcon className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{link.name}</p>
                    {link.locationName && (
                      <p className="text-xs text-gray-600 flex items-center mt-0.5">
                        <MapPinIcon className="w-3 h-3 mr-1" />
                        {link.locationName}
                        {link.locationArea && ` - ${link.locationArea}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-purple-600 mt-2">
                {linkedKanbans.length < 5 ? `You can add up to ${5 - linkedKanbans.length} more link${5 - linkedKanbans.length > 1 ? 's' : ''}.` : 'Maximum links reached (5/5)'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-purple-700">
              No receive kanbans linked. Click "Link Board" below to add connections.
            </p>
          )}
        </div>
      )}

      {kanban.type === 'receive' && kanban.locationId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <MapPinIcon className="w-5 h-5 text-indigo-600 mr-2" />
            <h5 className="font-medium text-indigo-900">Location Configuration</h5>
          </div>
          <p className="text-sm text-indigo-700">
            <CheckCircleIcon className="w-4 h-4 inline mr-1" />
            This receive kanban has a default location configured and is ready to receive products from linked order kanbans.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-gray-700">Quick Actions</h5>
        
        <button
          onClick={() => setActiveTab('edit')}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
        >
          <PencilIcon className="w-5 h-5 text-gray-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Edit Details</p>
            <p className="text-xs text-gray-500">Change name and description</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('linking')}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
        >
          <LinkIcon className="w-5 h-5 text-gray-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {kanban.linkedKanbanId ? 'Manage Board Link' : 'Link Board'}
            </p>
            <p className="text-xs text-gray-500">
              {kanban.linkedKanbanId
                ? 'View or modify board linking'
                : 'Connect this board to another'}
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('threshold')}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
        >
          <ClockIcon className="w-5 h-5 text-gray-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Threshold Settings</p>
            <p className="text-xs text-gray-500">Configure time-based alerts</p>
          </div>
        </button>
      </div>

      {/* Public Form (Order kanbans only) */}
      {kanban.type === 'order' && kanban.publicFormToken && (
        <>
          <div className="border-t border-gray-200 my-4"></div>
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Public Form</h5>
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

      {/* Delete Button */}
      <div className="border-t border-gray-200 my-4"></div>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-red-600"
      >
        <TrashIcon className="w-5 h-5 text-red-600 mr-3" />
        <div className="flex-1">
          <p className="text-sm font-medium">Delete Kanban</p>
          <p className="text-xs text-red-500">Permanently remove this board</p>
        </div>
      </button>
    </div>
  );

  const editContent = (
    <form onSubmit={handleEditSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          Update the name and description of this kanban board.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kanban Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={editName}
          onChange={(e) => {
            setEditName(e.target.value);
            if (editError) setEditError(null);
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            editError ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isSubmittingEdit}
        />
        {editError && (
          <p className="mt-1 text-sm text-red-600">{editError}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Minimum 3 characters, maximum 255 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
          placeholder="Optional short description"
          disabled={isSubmittingEdit}
        />
      </div>

      {kanban.type === 'receive' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Location <span className="text-red-500">*</span>
          </label>
          <select
            value={editLocationId || ''}
            onChange={(e) => setEditLocationId(e.target.value || null)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
            disabled={isSubmittingEdit}
          >
            <option value="">Select location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}{loc.area ? ` - ${loc.area}` : ''}{loc.code ? ` (${loc.code})` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            This will be used as the default location for imports and received items.
          </p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 ${
            kanban.type === 'order' ? 'bg-blue-500' : 'bg-green-500'
          }`}></div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {kanban.type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
            </p>
            <p className="text-xs text-gray-600">Type cannot be changed</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setEditName(kanban.name);
            setEditDescription(kanban.description ?? '');
            setActiveTab('overview');
          }}
          disabled={isSubmittingEdit}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmittingEdit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  const linkingContent = (
    <div className="space-y-6">
      {/* Current Board Info */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Board</h4>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{kanban.name}</p>
              <p className="text-sm text-gray-600">
                {kanban.type === 'order' ? 'Order Board' : 'Receive Board'}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              kanban.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {kanban.type === 'order' ? 'Order' : 'Receive'}
            </span>
          </div>
        </div>
      </div>

      {/* Linking/Location Management Section */}
      <KanbanLinkingSection kanban={kanban} />
    </div>
  );

  const thresholdContent = (
    <div className="space-y-4">
      <ThresholdSettingsSection
        thresholdRules={thresholdRules}
        onChange={setThresholdRules}
        kanbanType={kanban.type as 'order' | 'receive'}
        products={[]}
      />
      
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            setThresholdRules(kanban?.thresholdRules || []);
            setActiveTab('overview');
          }}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveThresholdRules}
          disabled={isSavingThreshold}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSavingThreshold ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  // Public Form content
  const publicFormContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Public Form Access</h3>
        <p className="text-sm text-gray-600 mb-6">
          Control whether external users can submit product requests through the public form.
        </p>
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Enable Public Form
          </label>
          <p className="text-xs text-gray-600">
            Allow external users to submit requests via a public URL
          </p>
        </div>
        <button
          onClick={handleTogglePublicForm}
          disabled={isTogglingPublicForm}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            optimisticPublicFormEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              optimisticPublicFormEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status Indicator */}
      <div className={`p-4 rounded-lg border ${
        optimisticPublicFormEnabled 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            optimisticPublicFormEnabled ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />
          <span className={`text-sm font-medium ${
            optimisticPublicFormEnabled ? 'text-emerald-900' : 'text-amber-900'
          }`}>
            {optimisticPublicFormEnabled ? 'Form is Active' : 'Form is Disabled'}
          </span>
        </div>
        <p className={`text-xs mt-1 ${
          optimisticPublicFormEnabled ? 'text-emerald-700' : 'text-amber-700'
        }`}>
          {optimisticPublicFormEnabled
            ? 'Users can access the form and submit product requests'
            : 'The form is currently disabled and cannot be accessed by external users'}
        </p>
      </div>

      {/* Form URL Section */}
      {optimisticPublicFormEnabled && kanban.publicFormToken && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Public Form URL
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/form/${kanban.publicFormToken}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 font-mono"
            />
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={handleViewUrl}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <EyeIcon className="h-4 w-4" />
              <span>View</span>
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Share this URL with external users to allow them to submit product requests.
          </p>
        </div>
      )}

      {/* Warning when disabled */}
      {!optimisticPublicFormEnabled && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Note:</strong> When the form is disabled, users who try to access the public URL will see an error message stating that the form has been disabled by the administrator.
          </p>
        </div>
      )}

      {/* Form Field Configuration */}
      {optimisticPublicFormEnabled && (
        <div className="border-t border-gray-200 pt-6">
          <FormFieldConfiguration
            formFieldSettings={formFieldSettings}
            onChange={setFormFieldSettings}
            disabled={isSavingFormFields}
          />
          
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveFormFieldSettings}
              disabled={isSavingFormFields}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingFormFields ? 'Saving...' : 'Save Field Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const tabs: SliderTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: overviewContent,
      icon: <InformationCircleIcon className="h-4 w-4" />,
    },
    {
      id: 'edit',
      label: 'Edit',
      content: editContent,
      icon: <PencilIcon className="h-4 w-4" />,
    },
    {
      id: 'linking',
      label: 'Linking',
      content: linkingContent,
      icon: <LinkIcon className="h-4 w-4" />,
    },
    ...(kanban.type === 'order' ? [{
      id: 'publicForm' as const,
      label: 'Public Form',
      content: publicFormContent,
      icon: <DocumentTextIcon className="h-4 w-4" />,
    }] : []),
    {
      id: 'threshold',
      label: 'Threshold',
      content: thresholdContent,
      icon: <ClockIcon className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <Slider
        isOpen={isOpen}
        onClose={onClose}
        title="Kanban Settings"
        size="large"
      >
        <SliderTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />
      </Slider>

      {/* Delete Modal (stays as modal) */}
      {showDeleteModal && (
        <DeleteKanbanModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          kanban={kanban}
          onDelete={onDelete}
          productCount={productCount}
        />
      )}
    </>
  );
}
