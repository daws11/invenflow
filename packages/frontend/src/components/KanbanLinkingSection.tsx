import { useState, useEffect } from 'react';
import { Kanban, LinkedReceiveKanban } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { useLocationStore } from '../store/locationStore';
import { useToast } from '../store/toastStore';
import { MapPinIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface KanbanLinkingSectionProps {
  kanban: Kanban;
}

export function KanbanLinkingSection({ kanban }: KanbanLinkingSectionProps) {
  const toast = useToast();
  const { kanbans, addKanbanLink, removeKanbanLink, updateKanban, currentKanban } = useKanbanStore();
  const { locations, fetchLocations } = useLocationStore();
  
  const [selectedReceiveKanbanId, setSelectedReceiveKanbanId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(kanban.locationId || '');
  const [isAdding, setIsAdding] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [defaultLinkedKanbanId, setDefaultLinkedKanbanId] = useState<string>(kanban.defaultLinkedKanbanId || '');
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);
      try {
        // Only fetch locations - parent modal ensures fresh kanban data
        await fetchLocations();
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadData();
  }, [fetchLocations]);

  useEffect(() => {
    setSelectedLocationId(kanban.locationId || '');
  }, [kanban.locationId]);

  // Show loading state while fetching data
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading linking data...</span>
      </div>
    );
  }

  // Get linked kanbans - prioritize currentKanban from store if it matches and has linkedKanbans data
  const activeKanban = (currentKanban?.id === kanban.id && currentKanban.linkedKanbans) 
    ? currentKanban 
    : kanban;
  const linkedKanbans = (activeKanban as any).linkedKanbans as LinkedReceiveKanban[] || [];

  // Data validation - check if we have the expected data structure
  const hasValidData = kanban.type === 'order' 
    ? (activeKanban as any).linkedKanbans !== undefined // Order kanbans should have linkedKanbans array
    : kanban.locationId !== undefined; // Receive kanbans should have locationId

  // Show fallback UI if data is incomplete
  if (!hasValidData && !isInitialLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-yellow-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm font-medium">Data Incomplete</p>
          <p className="text-xs text-gray-600 mt-1">
            {kanban.type === 'order' 
              ? 'Linking data is not available. Please refresh the page.'
              : 'Location data is not available. Please refresh the page.'
            }
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // For ORDER kanbans: show multi-link management
  if (kanban.type === 'order') {
    // Filter available receive kanbans (not already linked, max 5 total)
    const availableReceiveKanbans = kanbans.filter(k => {
      if (k.type !== 'receive') return false;
      if (linkedKanbans.some(link => link.id === k.id)) return false;
      return true;
    });

    const canAddMore = linkedKanbans.length < 5;

    const handleAddLink = async () => {
      if (!selectedReceiveKanbanId) return;

      setIsAdding(true);
      try {
        await addKanbanLink(kanban.id, selectedReceiveKanbanId);
        toast.success('Receive kanban linked successfully');
        setSelectedReceiveKanbanId('');
      } catch (error: any) {
        toast.error(error?.response?.data?.error?.message || 'Failed to add link');
      } finally {
        setIsAdding(false);
      }
    };

    const handleRemoveLink = async (linkId: string) => {
      setRemovingLinkId(linkId);
      try {
        await removeKanbanLink(kanban.id, linkId);
        toast.success('Link removed successfully');
        
        // Clear default if the removed kanban was the default
        const removedLink = linkedKanbans.find(link => link.linkId === linkId);
        if (removedLink && defaultLinkedKanbanId === removedLink.id) {
          setDefaultLinkedKanbanId('');
          await updateKanban(kanban.id, { defaultLinkedKanbanId: null });
        }
      } catch (error: any) {
        toast.error('Failed to remove link');
      } finally {
        setRemovingLinkId(null);
      }
    };

    const handleSaveDefaultLinkedKanban = async () => {
      setIsSavingDefault(true);
      try {
        await updateKanban(kanban.id, { defaultLinkedKanbanId: defaultLinkedKanbanId || null });
        toast.success('Default linked kanban updated successfully');
      } catch (error: any) {
        toast.error('Failed to update default linked kanban');
      } finally {
        setIsSavingDefault(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Default Linked Kanban Selection */}
        {linkedKanbans.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Default Receive Kanban</h4>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800 mb-3">
                Products moved to "Purchased" will automatically transfer to the selected default kanban.
              </p>
              <div className="space-y-3">
                <select
                  value={defaultLinkedKanbanId}
                  onChange={(e) => setDefaultLinkedKanbanId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No default (show selection dialog)</option>
                  {linkedKanbans.map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.name}
                      {link.locationName && ` - ${link.locationName}`}
                    </option>
                  ))}
                </select>
                {defaultLinkedKanbanId !== (kanban.defaultLinkedKanbanId || '') && (
                  <button
                    onClick={handleSaveDefaultLinkedKanban}
                    disabled={isSavingDefault}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingDefault ? 'Saving...' : 'Save Default Setting'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Linked Kanbans */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Linked Receive Kanbans ({linkedKanbans.length}/5)
          </h4>

          {linkedKanbans.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
              <p className="text-yellow-800 text-sm">No receive kanbans linked</p>
              <p className="text-yellow-600 text-xs mt-1">
                Link at least one receive kanban to enable product transfers
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedKanbans.map((link) => (
                <div
                  key={link.linkId}
                  className={`flex items-start justify-between p-3 border rounded-lg ${
                    defaultLinkedKanbanId === link.id 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{link.name}</p>
                      {defaultLinkedKanbanId === link.id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                    {link.locationName && (
                      <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{link.locationName}</span>
                        {link.locationArea && <span className="text-gray-400">• {link.locationArea}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveLink(link.linkId)}
                    disabled={removingLinkId === link.linkId}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove link"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Link */}
        {canAddMore && availableReceiveKanbans.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Receive Kanban</h4>
            <div className="space-y-3">
              <select
                value={selectedReceiveKanbanId}
                onChange={(e) => setSelectedReceiveKanbanId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a receive kanban...</option>
                {availableReceiveKanbans.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddLink}
                disabled={!selectedReceiveKanbanId || isAdding}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-5 h-5" />
                {isAdding ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </div>
        )}

        {!canAddMore && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
            Maximum of 5 linked kanbans reached
          </div>
        )}
      </div>
    );
  }

  // For RECEIVE kanbans: show location management
  if (kanban.type === 'receive') {
    const handleSaveLocation = async () => {
      if (!selectedLocationId) {
        toast.error('Please select a location');
        return;
      }

      setIsSavingLocation(true);
      try {
        await updateKanban(kanban.id, { locationId: selectedLocationId });
        toast.success('Location updated successfully');
      } catch (error: any) {
        toast.error('Failed to update location');
      } finally {
        setIsSavingLocation(false);
      }
    };

    const hasLocationChanged = selectedLocationId !== kanban.locationId;

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> All products transferred to this receive kanban will automatically be assigned to the selected location.
          </p>
        </div>

        <div>
          <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 mb-2">
            Default Location <span className="text-red-500">*</span>
          </label>
          <select
            id="location-select"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a location...</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} - {location.area}
                {location.building && ` (${location.building}${location.floor ? `, Floor ${location.floor}` : ''})`}
              </option>
            ))}
          </select>
        </div>

        {hasLocationChanged && (
          <button
            onClick={handleSaveLocation}
            disabled={isSavingLocation || !selectedLocationId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingLocation ? 'Saving...' : 'Save Location'}
          </button>
        )}
      </div>
    );
  }

  return null;
}

