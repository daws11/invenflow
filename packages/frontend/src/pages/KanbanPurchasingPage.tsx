import { useEffect, useState, useMemo } from 'react';
import { useKanbanStore } from '../store/kanbanStore';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { Kanban, CreateKanban } from '@invenflow/shared';
import { CreateKanbanModal } from '../components/CreateKanbanModal';
import { KanbanSettingsModal } from '../components/KanbanSettingsModal';
import CompactKanbanListRow from '../components/CompactKanbanListRow';
import { KanbanGridCard } from '../components/KanbanGridCard';
import CreateKanbanPlaceholder from '../components/CreateKanbanPlaceholder';
import { useToast } from '../store/toastStore';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function KanbanPurchasingPage() {
  const { kanbans, loading, error, fetchKanbans, createKanban, updateKanban, deleteKanban } = useKanbanStore();
  const { kanbanListViewMode, setKanbanListViewMode } = useViewPreferencesStore();
  const toast = useToast();
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedKanban, setSelectedKanban] = useState<Kanban | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchKanbans();
  }, [fetchKanbans]);

  // Filter and sort kanbans - only show 'order' type
  const filteredAndSortedKanbans = useMemo(() => {
    let filtered = kanbans.filter(kanban => kanban.type === 'order');

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(kanban =>
        kanban.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [kanbans, searchTerm, sortField, sortOrder]);

  // Get product count for a kanban
  type KanbanWithExtras = Kanban & { products?: { id: string }[]; productCount?: number };

  const getProductCount = (kanban: Kanban) => {
    const kanbanWithExtras = kanban as KanbanWithExtras;

    if (typeof kanbanWithExtras.productCount === 'number') {
      return kanbanWithExtras.productCount;
    }

    if (Array.isArray(kanbanWithExtras.products)) {
      return kanbanWithExtras.products.length;
    }

    return 0;
  };

  const getKanbanDescription = (kanban: Kanban) => {
    return kanban.description?.trim() || 'No description';
  };

  const handleCreateKanban = async (name: string, _type: 'order' | 'receive', description?: string | null, _locationId?: string) => {
    try {
      const payload: CreateKanban = {
        name,
        type: 'order',
        ...(description !== undefined && description !== null
          ? { description: description }
          : {}),
      };
      await createKanban(payload);
      toast.success('Purchasing kanban created successfully');
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error('Failed to create kanban. Please try again.');
      throw error;
    }
  };

  const handleUpdateKanban = async (id: string, name: string, description?: string | null) => {
    try {
      const updatePayload: Partial<Kanban> = { name };
      if (description !== undefined) {
        updatePayload.description = description;
      }
      await updateKanban(id, updatePayload);
      toast.success('Kanban updated successfully');
      setIsSettingsModalOpen(false);
      setSelectedKanban(null);
    } catch (error) {
      toast.error('Failed to update kanban. Please try again.');
      throw error;
    }
  };

  const handleDeleteKanban = async (id: string) => {
    try {
      await deleteKanban(id);
      toast.success('Kanban deleted successfully');
      setIsSettingsModalOpen(false);
      setSelectedKanban(null);
    } catch (error) {
      toast.error('Failed to delete kanban. Please try again.');
      throw error;
    }
  };

  const handleCopyUrl = (kanban: Kanban) => {
    if (!kanban.publicFormToken) return;
    const url = `${window.location.origin}/form/${kanban.publicFormToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Form URL copied to clipboard!');
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const openSettingsModal = (kanban: Kanban) => {
    setSelectedKanban(kanban);
    setIsSettingsModalOpen(true);
  };

  const getLinkedKanbanName = (kanban: Kanban) => {
    if (!kanban.linkedKanbanId) return null;
    const linkedKanban = kanbans.find(k => k.id === kanban.linkedKanbanId);
    return linkedKanban ? linkedKanban.name : null;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortField('createdAt');
    setSortOrder('desc');
  };

  if (loading && kanbans.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kanbans...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Purchasing Kanbans</h2>
        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <button
            className={`btn-secondary flex items-center ${
              kanbanListViewMode === 'grid' ? 'bg-gray-200' : ''
            }`}
            onClick={() => setKanbanListViewMode(kanbanListViewMode === 'grid' ? 'compact' : 'grid')}
            title={kanbanListViewMode === 'grid' ? 'Switch to compact view' : 'Switch to grid view'}
          >
            {kanbanListViewMode === 'grid' ? (
              <>
                <ListBulletIcon className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Compact</span>
              </>
            ) : (
              <>
                <Squares2X2Icon className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </>
            )}
          </button>
          <button
            className="btn-primary"
            onClick={openCreateModal}
          >
            Create Purchasing Kanban
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search purchasing kanbans by name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center ${
              showFilters || sortField !== 'createdAt' || sortOrder !== 'desc'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Created Date</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            {(searchTerm || sortField !== 'createdAt' || sortOrder !== 'desc') && (
              <div className="md:col-span-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Kanban List */}
      {kanbanListViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Kanban Placeholder */}
          <CreateKanbanPlaceholder 
            type="order" 
            onClick={openCreateModal}
            viewMode="grid"
          />
          
          {filteredAndSortedKanbans.map((kanban) => (
            <KanbanGridCard
              key={kanban.id}
              kanban={kanban}
              onSettings={openSettingsModal}
              onCopyUrl={handleCopyUrl}
              productCount={getProductCount(kanban)}
              description={getKanbanDescription(kanban)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Create New Kanban Placeholder */}
          <CreateKanbanPlaceholder 
            type="order" 
            onClick={openCreateModal}
            viewMode="compact"
          />
          
          {filteredAndSortedKanbans.map((kanban) => (
            <CompactKanbanListRow
              key={kanban.id}
              kanban={kanban}
              onSettings={openSettingsModal}
              onCopyUrl={handleCopyUrl}
              linkedKanbanName={getLinkedKanbanName(kanban)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedKanbans.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <div className="text-gray-500 text-lg mb-4 mt-4">
            {searchTerm
              ? 'No purchasing kanbans match your search criteria'
              : 'No purchasing kanbans yet'}
          </div>
          <p className="text-gray-400 mb-6">
            {searchTerm
              ? 'Try adjusting your search or create a new purchasing kanban board'
              : 'Create your first purchasing kanban board to get started'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateKanbanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        type="order"
        onCreate={handleCreateKanban}
      />

      {selectedKanban && (
        <KanbanSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              setSelectedKanban(null);
            }}
            kanban={selectedKanban}
            onUpdate={handleUpdateKanban}
            onDelete={handleDeleteKanban}
            productCount={getProductCount(selectedKanban)}
        />
      )}
    </div>
  );
}
