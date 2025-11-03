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
import { ORDER_COLUMNS, RECEIVE_COLUMNS, Product } from '@invenflow/shared';
import KanbanColumn from '../components/KanbanColumn';
import ProductForm from '../components/ProductForm';

export default function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const { currentKanban, loading, error, fetchKanbanById, moveProduct } = useKanbanStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    return currentKanban.products.filter(product => product.columnStatus === column);
  };

  const handleMoveProduct = async (productId: string, newColumn: string) => {
    try {
      await moveProduct(productId, newColumn);
    } catch (error) {
      alert('Failed to move product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
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
          </div>
          <div className="flex space-x-4">
            <button className="btn-secondary">Settings</button>
            <button
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Product
            </button>
          </div>
        </div>

        <div className="flex space-x-6 overflow-x-auto pb-6">
          {getColumns().map((column) => (
            <KanbanColumn
              key={column}
              id={column}
              title={column}
              products={getProductsByColumn(column)}
              onProductEdit={handleEditProduct}
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
      </div>

      <DragOverlay>
        {activeProduct ? (
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-400 p-4 opacity-90 rotate-2 transform">
            <h4 className="font-medium text-gray-900 mb-2">{activeProduct.productDetails}</h4>
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
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}