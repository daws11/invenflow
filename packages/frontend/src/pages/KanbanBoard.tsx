import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useKanbanStore } from '../store/kanbanStore';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useLocationStore } from '../store/locationStore';
import { ORDER_COLUMNS, RECEIVE_COLUMNS, Product, ValidationStatus, Kanban } from '@invenflow/shared';
import KanbanColumn from '../components/KanbanColumn';
import CompactBoardView from '../components/CompactBoardView';
import ProductForm from '../components/ProductForm';
import LocationFilter from '../components/LocationFilter';
import KanbanSearchBar from '../components/KanbanSearchBar';
import ProductSidebar from '../components/ProductSidebar';
import ValidationModal from '../components/ValidationModal';
import { KanbanSettingsModal } from '../components/KanbanSettingsModal';
import { TransferConfirmationSlider } from '../components/TransferConfirmationSlider';
import { useToast } from '../store/toastStore';

export default function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const { currentKanban, loading, error, fetchKanbanById, moveProduct, transferProduct, updateKanban, deleteKanban } = useKanbanStore();
  const { kanbanBoardViewMode, setKanbanBoardViewMode } = useViewPreferencesStore();
  const { locations, fetchLocations } = useLocationStore();
  const toast = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingProductMove, setPendingProductMove] = useState<{
    productId: string;
    targetColumn: string;
  } | null>(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  // Transfer confirmation slider state
  const [showTransferSlider, setShowTransferSlider] = useState(false);
  const [productToTransfer, setProductToTransfer] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Activate drag after small movement; no hold delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) {
      fetchKanbanById(id);
    }
  }, [id, fetchKanbanById]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const getColumns = () => {
    if (!currentKanban) return [];
    return currentKanban.type === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
  };

  // Filter products by search query
  const filterProductBySearch = (product: Product): boolean => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const location = product.locationId ? locations.find(l => l.id === product.locationId) : null;

    // Search in productDetails (name)
    if (product.productDetails?.toLowerCase().includes(query)) return true;

    // Search in SKU
    if (product.sku?.toLowerCase().includes(query)) return true;

    // Search in supplier
    if (product.supplier?.toLowerCase().includes(query)) return true;

    // Search in priority
    if (product.priority?.toLowerCase().includes(query)) return true;

    // Search in category
    if (product.category?.toLowerCase().includes(query)) return true;

    // Search in tags
    if (product.tags && Array.isArray(product.tags)) {
      if (product.tags.some(tag => tag.toLowerCase().includes(query))) return true;
    }

    // Removed deprecated product.location string search

    // Search in location name, code, area (if locationId exists)
    if (location) {
      if (location.name?.toLowerCase().includes(query)) return true;
      if (location.code?.toLowerCase().includes(query)) return true;
      if (location.area?.toLowerCase().includes(query)) return true;
      if (location.description?.toLowerCase().includes(query)) return true;
    }

    // Search in notes
    if (product.notes?.toLowerCase().includes(query)) return true;

    // Search in dimensions
    if (product.dimensions?.toLowerCase().includes(query)) return true;

    // Search in weight (as string)
    if (product.weight !== null && product.weight.toString().includes(query)) return true;

    // Search in unitPrice (as string)
    if (product.unitPrice !== null && product.unitPrice.toString().includes(query)) return true;

    // Search in stockLevel (as string)
    if (product.stockLevel !== null && product.stockLevel.toString().includes(query)) return true;

    // Search in productLink
    if (product.productLink?.toLowerCase().includes(query)) return true;

    return false;
  };

  const getProductsByColumn = (column: string) => {
    if (!currentKanban) return [];
    return currentKanban.products.filter(product =>
      product.columnStatus === column &&
      (!selectedLocationId || product.locationId === selectedLocationId) &&
      filterProductBySearch(product)
    );
  };

  const handleMoveProduct = async (productId: string, newColumn: string) => {
    // Check if this is an order kanban moving to "Purchased" column
    if (currentKanban?.type === 'order' && newColumn === 'Purchased') {
      const linkedKanbans = currentKanban?.linkedKanbans || [];
      
      if (linkedKanbans.length === 0) {
        toast.error('No receive kanbans linked. Please link at least one receive kanban in settings.');
        return;
      }

      // Find the product and show transfer confirmation slider
      const product = currentKanban.products.find(p => p.id === productId);
      if (product) {
        // First move to Purchased column
        try {
          await moveProduct(productId, newColumn);
          // Then show transfer slider
          setProductToTransfer(product);
          setShowTransferSlider(true);
        } catch (error: any) {
          toast.error('Failed to move product: ' + (error?.response?.data?.error?.message || error?.message));
        }
      }
      return;
    }

    // Normal move for non-order kanbans or other columns
    try {
      await moveProduct(productId, newColumn);
    } catch (error: any) {
      // Check if error requires validation from response details
      const requiresValidation = error?.response?.data?.error?.details?.requiresValidation;
      const columnStatus = error?.response?.data?.error?.details?.columnStatus;
      const errorProductId = error?.response?.data?.error?.details?.productId;

      if (requiresValidation && errorProductId === productId && columnStatus === newColumn) {
        setPendingProductMove({
          productId,
          targetColumn: newColumn,
        });
        setShowValidationModal(true);
      } else {
        toast.error('Failed to move product: ' + (error?.response?.data?.error?.message || error?.message));
      }
    }
  };

  const handleValidationSubmit = async (validationData: any) => {
    setIsValidationLoading(true);

    try {
      // Submit validation first
      const validationResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/validations/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(validationData),
      });

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        const errorMessage = errorData.error?.message || errorData.error || 'Validation failed';
        throw new Error(errorMessage);
      }

      // After successful validation, proceed with product move
      if (pendingProductMove) {
        await moveProduct(
          pendingProductMove.productId,
          pendingProductMove.targetColumn,
          validationData.locationId, // pass locationId from validation data
          true // skip validation check since validation is already completed
        );
      }

      // Close modal and reset state
      setShowValidationModal(false);
      setPendingProductMove(null);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidationLoading(false);
    }
  };

  const handleCloseValidationModal = () => {
    if (!isValidationLoading) {
      setShowValidationModal(false);
      setPendingProductMove(null);
    }
  };

  const handleTransferConfirm = async (targetKanbanId: string) => {
    if (!productToTransfer) return;

    try {
      await transferProduct(productToTransfer.id, targetKanbanId);
      toast.success('Product transferred successfully');
      setShowTransferSlider(false);
      setProductToTransfer(null);
    } catch (error: any) {
      toast.error('Failed to transfer product: ' + (error?.response?.data?.error?.message || error?.message));
      throw error;
    }
  };

  const handleCloseTransferSlider = () => {
    setShowTransferSlider(false);
    setProductToTransfer(null);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedProduct(null);
  };

  const handleUpdateKanban = async (kanbanId: string, name: string, description?: string | null) => {
    try {
      const payload: Partial<Kanban> = { name };
      if (description !== undefined) {
        payload.description = description;
      }
      await updateKanban(kanbanId, payload);
      toast.success('Kanban updated successfully');
      setIsSettingsModalOpen(false);
    } catch (error) {
      toast.error('Failed to update kanban. Please try again.');
      throw error;
    }
  };

  const handleDeleteKanban = async (kanbanId: string) => {
    try {
      await deleteKanban(kanbanId);
      toast.success('Kanban deleted successfully');
      // Redirect to kanban list after deletion
      window.location.href = '/kanbans';
    } catch (error) {
      toast.error('Failed to delete kanban. Please try again.');
      throw error;
    }
  };

  const getProductCount = () => {
    return currentKanban?.products?.length || 0;
  };

  const getKanbanDescription = () => {
    return currentKanban?.description?.trim() || 'No description';
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const product = currentKanban?.products.find(p => p.id === active.id);
    if (product) {
      setActiveProduct(product);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeProduct = currentKanban?.products.find(p => p.id === active.id);
    if (!activeProduct) return;

    const overColumn = over.id.toString();
    const columns = getColumns();

    if ((columns as string[]).includes(overColumn) && activeProduct.columnStatus !== overColumn) {
      // Optional: Add visual feedback for drag over state
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProduct(null);

    if (!over) return;

    const activeProduct = currentKanban?.products.find(p => p.id === active.id);
    if (!activeProduct) return;

    const overColumn = over.id.toString();
    const columns = getColumns();

    if ((columns as string[]).includes(overColumn) && activeProduct.columnStatus !== overColumn) {
      await handleMoveProduct(activeProduct.id, overColumn);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading kanban board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">Error loading kanban board</div>
        <div className="text-gray-600 mb-6">{error}</div>
        <button
          onClick={() => id && fetchKanbanById(id)}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!currentKanban) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg mb-4">Kanban not found</div>
        <button
          onClick={() => window.history.back()}
          className="btn-secondary"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{currentKanban.name}</h2>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                currentKanban.type === 'order'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentKanban.type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
              </span>
              {currentKanban.linkedKanbanId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Linked to another kanban
                </span>
              )}
              {currentKanban.type === 'order' && currentKanban.publicFormToken && (
                <span className="text-sm text-gray-600">
                  Public form: {window.location.origin}/form/{currentKanban.publicFormToken}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-3 max-w-2xl">{getKanbanDescription()}</p>
          </div>
          <div className="flex space-x-2 md:space-x-4">
            {/* View Toggle */}
            <button
              className={`btn-secondary flex items-center ${
                kanbanBoardViewMode === 'board' ? 'bg-gray-200' : ''
              }`}
              onClick={() => setKanbanBoardViewMode(kanbanBoardViewMode === 'board' ? 'compact' : 'board')}
              title={kanbanBoardViewMode === 'board' ? 'Switch to compact view' : 'Switch to board view'}
            >
              {kanbanBoardViewMode === 'board' ? (
                <>
                  <ListBulletIcon className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Compact</span>
                </>
              ) : (
                <>
                  <Squares2X2Icon className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Board</span>
                </>
              )}
            </button>
            {currentKanban && (
              <button
                className="btn-secondary"
                onClick={() => setIsSettingsModalOpen(true)}
              >
                Settings
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Product
            </button>
          </div>
        </div>

        {/* Search Bar and Location Filter */}
        <div className="mb-3 md:mb-4 space-y-3">
          <KanbanSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            className="max-w-2xl"
          />
          <div className="flex items-center gap-4 flex-wrap">
          <LocationFilter
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            className="max-w-xs"
          />
            {(selectedLocationId || searchQuery) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {(selectedLocationId || searchQuery) && (
                  <span className="text-gray-500">Active filters:</span>
                )}
          {selectedLocationId && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                    Location
              <button
                onClick={() => setSelectedLocationId(null)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800"
                      aria-label="Clear location filter"
              >
                      ×
              </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                    Search: "{searchQuery}"
                  </span>
                )}
            </div>
          )}
          </div>
        </div>

        {/* Render Board or Compact View */}
        {kanbanBoardViewMode === 'board' ? (
          <div className="flex space-x-3 md:space-x-4 overflow-x-auto pb-4 lg:overflow-visible">
            {getColumns().map((column) => (
              <KanbanColumn
                key={column}
                id={column}
                title={column}
                products={getProductsByColumn(column)}
                onProductView={handleViewProduct}
                kanban={currentKanban}
              />
            ))}
          </div>
        ) : (
          <CompactBoardView
            kanban={currentKanban}
            onProductView={handleViewProduct}
            onMoveProduct={handleMoveProduct}
            selectedLocationId={selectedLocationId}
            searchQuery={searchQuery}
            locations={locations}
          />
        )}

        {/* Add Product Form */}
        {showAddForm && (
          <ProductForm
            kanbanId={currentKanban.id}
            initialColumn={getColumns()[0]}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {/* Edit Product Form */}
        {editingProduct && (
          <ProductForm
            kanbanId={currentKanban.id}
            initialColumn={editingProduct.columnStatus}
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
          />
        )}

        {/* Product Sidebar */}
        <ProductSidebar
          product={selectedProduct}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
        />

        {/* Validation Modal */}
        {showValidationModal && pendingProductMove && (
          <ValidationModal
            isOpen={showValidationModal}
            onClose={handleCloseValidationModal}
            productId={pendingProductMove.productId}
            columnStatus={pendingProductMove.targetColumn as ValidationStatus}
            onSubmit={handleValidationSubmit}
            isLoading={isValidationLoading}
          />
        )}

        {/* Settings Modal */}
        {currentKanban && (
          <KanbanSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            kanban={currentKanban}
            onUpdate={handleUpdateKanban}
            onDelete={handleDeleteKanban}
            productCount={getProductCount()}
          />
        )}

        {/* Transfer Confirmation Slider */}
        {showTransferSlider && productToTransfer && currentKanban && (
          <TransferConfirmationSlider
            isOpen={showTransferSlider}
            onClose={handleCloseTransferSlider}
            product={productToTransfer}
            linkedKanbans={currentKanban.linkedKanbans || []}
            onConfirm={handleTransferConfirm}
          />
        )}
      </div>

      <DragOverlay>
        {activeProduct ? (
          <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-4 opacity-95 rotate-3 transform scale-105 max-w-sm">
            {/* Drag indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
            </div>

            {/* Product name */}
            <h4 className="font-semibold text-gray-900 mb-2 text-center">{activeProduct.productDetails}</h4>

            {/* Product details summary */}
            <div className="space-y-2">
              {activeProduct.sku && (
                <div className="text-xs text-gray-500 text-center">SKU: {activeProduct.sku}</div>
              )}

              {/* Tags and priority */}
              <div className="flex flex-wrap gap-1 justify-center">
                {activeProduct.priority && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    activeProduct.priority.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                    activeProduct.priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    activeProduct.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {activeProduct.priority}
                  </span>
                )}

                {activeProduct.category && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {activeProduct.category}
                  </span>
                )}

                {activeProduct.stockLevel !== null && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Stock: {activeProduct.stockLevel}
                  </span>
                )}
              </div>
            </div>

            {/* Drag hint */}
            <div className="mt-3 text-xs text-gray-400 text-center italic">
              Moving to new column...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
