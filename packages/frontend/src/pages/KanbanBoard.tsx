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
import { useKanbanStore } from '../store/kanbanStore';
import { ORDER_COLUMNS, RECEIVE_COLUMNS, Product, ValidationStatus, Kanban } from '@invenflow/shared';
import KanbanColumn from '../components/KanbanColumn';
import ProductForm from '../components/ProductForm';
import LocationFilter from '../components/LocationFilter';
import ProductSidebar from '../components/ProductSidebar';
import ValidationModal from '../components/ValidationModal';
import { KanbanSettingsModal } from '../components/KanbanSettingsModal';
import { ThresholdLegend } from '../components/ThresholdLegend';
import { useToast } from '../store/toastStore';

export default function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const { currentKanban, loading, error, fetchKanbanById, moveProduct, updateKanban, deleteKanban } = useKanbanStore();
  const toast = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingProductMove, setPendingProductMove] = useState<{
    productId: string;
    targetColumn: string;
  } | null>(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
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

  const getColumns = () => {
    if (!currentKanban) return [];
    return currentKanban.type === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
  };

  const getProductsByColumn = (column: string) => {
    if (!currentKanban) return [];
    return currentKanban.products.filter(product =>
      product.columnStatus === column &&
      (!selectedLocationId || product.locationId === selectedLocationId)
    );
  };

  const handleMoveProduct = async (productId: string, newColumn: string) => {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentKanban.name}</h2>
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
          <div className="flex space-x-4">
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

        {/* Location Filter */}
        <div className="mb-6">
          <LocationFilter
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            className="max-w-xs"
          />
          {selectedLocationId && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <span>Filtering by location</span>
              <button
                onClick={() => setSelectedLocationId(null)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* Threshold Legend */}
        {currentKanban?.thresholdRules && currentKanban.thresholdRules.length > 0 && (
          <div className="mb-6">
            <ThresholdLegend thresholdRules={currentKanban.thresholdRules} />
          </div>
        )}

        <div className="flex space-x-6 overflow-x-auto pb-6">
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
