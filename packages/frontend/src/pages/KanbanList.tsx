import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useKanbanStore } from '../store/kanbanStore';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { KanbanType, Kanban, CreateKanban } from '@invenflow/shared';
import { CreateKanbanModal } from '../components/CreateKanbanModal';
import { KanbanSettingsModal } from '../components/KanbanSettingsModal';
import CompactKanbanListRow from '../components/CompactKanbanListRow';
import { useToast } from '../store/toastStore';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

type SortField = 'name' | 'type' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function KanbanList() {
  const { kanbans, loading, error, fetchKanbans, createKanban, updateKanban, deleteKanban } = useKanbanStore();
  const { kanbanListViewMode, setKanbanListViewMode } = useViewPreferencesStore();
  const toast = useToast();
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<KanbanType>('order');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedKanban, setSelectedKanban] = useState<Kanban | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<KanbanType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchKanbans();
  }, [fetchKanbans]);

  // Filter and sort kanbans
  const filteredAndSortedKanbans = useMemo(() => {
    let filtered = [...kanbans];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(kanban =>
        kanban.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(kanban => kanban.type === filterType);
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
        case 'type':
          aValue = a.type;
          bValue = b.type;
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
  }, [kanbans, searchTerm, filterType, sortField, sortOrder]);

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

  const handleCreateKanban = async (name: string, type: KanbanType, description?: string | null, locationId?: string) => {
    try {
      const payload: CreateKanban = {
        name,
        type,
        ...(description !== undefined && description !== null
          ? { description: description }
          : {}),
        ...(locationId ? { locationId } : {}),
      };
      await createKanban(payload);
      toast.success(`${type === 'order' ? 'Order' : 'Receive'} kanban created successfully`);
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

  const openCreateModal = (type: KanbanType) => {
    setCreateModalType(type);
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
    setFilterType('all');
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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Kanban Boards</h2>
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
            className="btn-secondary"
            onClick={() => openCreateModal('order')}
          >
            Create Order Kanban
          </button>
          <button
            className="btn-secondary"
            onClick={() => openCreateModal('receive')}
          >
            Create Receive Kanban
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
                placeholder="Search kanbans by name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center ${
              showFilters || filterType !== 'all' || sortField !== 'createdAt' || sortOrder !== 'desc'
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
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as KanbanType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="order">Order</option>
                <option value="receive">Receive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Created Date</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
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
            {(searchTerm || filterType !== 'all' || sortField !== 'createdAt' || sortOrder !== 'desc') && (
              <div className="md:col-span-3">
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
      {filteredAndSortedKanbans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg mx-auto max-w-md"></div>
              ))}
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <div className="text-gray-500 text-lg mb-4 mt-4">
                {searchTerm || filterType !== 'all'
                  ? 'No kanbans match your search criteria'
                  : 'No kanbans yet'}
              </div>
              <p className="text-gray-400 mb-6">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your filters or create a new kanban board'
                  : 'Create your first kanban board to get started'}
              </p>
              {(!searchTerm && filterType === 'all') && (
                <div className="flex justify-center space-x-4">
                  <button
                    className="btn-primary"
                    onClick={() => openCreateModal('order')}
                  >
                    Create Order Kanban
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => openCreateModal('receive')}
                  >
                    Create Receive Kanban
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : kanbanListViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedKanbans.map((kanban) => (
            <div
              key={kanban.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 animate-fade-in"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{kanban.name}</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kanban.type === 'order'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {kanban.type === 'order' ? 'Order' : 'Receive'}
                    </span>
                    {kanban.linkedKanbanId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Linked
                      </span>
                    )}
                    {kanban.type === 'order' && kanban.isPublicFormEnabled && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Public Form Active
                      </span>
                    )}
                  </div>

                  {/* Linked Board Info */}
                  {kanban.linkedKanbanId && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3">
                      <div className="flex items-center text-xs text-purple-700">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium">Linked to:</span>
                        <span className="ml-1">{getLinkedKanbanName(kanban) || 'Unknown Board'}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {getKanbanDescription(kanban)}
                  </p>
                </div>

                <div className="flex space-x-1">
                  <button
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    onClick={() => openSettingsModal(kanban)}
                    title="Settings"
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Board Actions */}
              <div className="space-y-2">
                <Link
                  to={`/kanban/${kanban.id}`}
                  className="btn-primary text-sm flex-1 text-center w-full block"
                >
                  View Board
                </Link>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openSettingsModal(kanban)}
                    className="btn-secondary text-sm flex-1"
                  >
                    Settings
                  </button>
                  {kanban.type === 'order' && kanban.publicFormToken && (
                    <button
                      onClick={() => handleCopyUrl(kanban)}
                      className="btn-secondary text-sm"
                      title="Copy public form URL"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
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

      {/* Modals */}
      <CreateKanbanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        type={createModalType}
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
