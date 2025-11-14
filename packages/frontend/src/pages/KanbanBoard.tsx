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
import { Squares2X2Icon, ListBulletIcon, FunnelIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useKanbanStore } from '../store/kanbanStore';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';
import { useLocationStore } from '../store/locationStore';
import { ORDER_COLUMNS, RECEIVE_COLUMNS, Product, ValidationStatus } from '@invenflow/shared';
import KanbanColumn from '../components/KanbanColumn';
import CompactBoardView from '../components/CompactBoardView';
import ProductForm from '../components/ProductForm';
// import LocationFilter from '../components/LocationFilter';
import KanbanSearchBar from '../components/KanbanSearchBar';
import ProductSidebar from '../components/ProductSidebar';
import ValidationModal from '../components/ValidationModal';
import { KanbanSettingsModal } from '../components/KanbanSettingsModal';
import { TransferConfirmationSlider } from '../components/TransferConfirmationSlider';
import { useToast } from '../store/toastStore';
import { useResponsivePreference } from '../hooks/useResponsivePreference';
import { useKanbanKeyboardShortcuts } from '../hooks/useKanbanKeyboardShortcuts';
import FiltersPanel from '../components/FiltersPanel';
import MobileFiltersBottomSheet from '../components/MobileFiltersBottomSheet';
import QuickFilters from '../components/QuickFilters';
import FilterPresets from '../components/FilterPresets';
import EnhancedFilterChips from '../components/EnhancedFilterChips';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { getProductCount } from '../utils/productCount';

export default function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const { currentKanban, loading, error, fetchKanbanById, moveProduct, transferProduct, deleteKanban } = useKanbanStore();
  const { kanbanBoardViewMode, setKanbanBoardViewMode } = useViewPreferencesStore();
  const { locations, fetchLocations } = useLocationStore();
  const toast = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const {
    supplierFilter, categoryFilter, priorityFilter,
    locationFilter, tagFilter, stockLevelMin, stockLevelMax,
    priceMin, priceMax, createdFrom, createdTo, createdPreset,
    updatedFrom, updatedTo, updatedPreset,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
  } = useViewPreferencesStore();

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
      activationConstraint: (() => {
        const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        return isSmall ? { distance: 12, delay: 120, tolerance: 6 } : { distance: 6 };
      })(),
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize responsive preference (default compact on small screens)
  useResponsivePreference();

  // Keyboard shortcuts
  const { shortcuts } = useKanbanKeyboardShortcuts({
    onAddProduct: () => setShowAddForm(true),
    onToggleFilters: () => {
      // On desktop, toggle desktop filters; on mobile, toggle mobile filters
      if (window.innerWidth >= 640) {
        setShowDesktopFilters(prev => !prev);
      } else {
        setShowFilters(prev => !prev);
      }
    },
    onToggleSettings: () => setIsSettingsModalOpen(true),
    onToggleView: () => setKanbanBoardViewMode(kanbanBoardViewMode === 'board' ? 'compact' : 'board'),
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
  });

  useEffect(() => {
    if (id) {
      fetchKanbanById(id);
    }
  }, [id, fetchKanbanById]);

  // Update selectedProduct when the corresponding product in the store changes
  useEffect(() => {
    if (selectedProduct && currentKanban) {
      const updatedProduct = currentKanban.products.find(p => p.id === selectedProduct.id);
      if (updatedProduct && JSON.stringify(updatedProduct) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updatedProduct);
      }
    }
  }, [currentKanban?.products, selectedProduct]);

  // Auto-expand filters when there are active filters
  useEffect(() => {
    if (hasActiveFilters() && !showDesktopFilters) {
      setShowDesktopFilters(true);
    }
  }, [hasActiveFilters, showDesktopFilters]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Enhanced settings handler to ensure fresh data
  const handleOpenSettings = async () => {
    if (!id || isSettingsLoading) return;
    
    setIsSettingsLoading(true);
    try {
      // Pre-fetch fresh kanban data with linkedKanbans before opening modal
      await fetchKanbanById(id);
      // Small delay to ensure state is updated before opening modal
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsSettingsModalOpen(true);
    } catch (error: any) {
      toast.error('Failed to load kanban data: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const getColumns = () => {
    if (!currentKanban) return [];
    return currentKanban.type === 'order' ? ORDER_COLUMNS : RECEIVE_COLUMNS;
  };

  const getColumnDisplayName = (column: string) => {
    if (currentKanban?.type === 'receive' && column === 'Purchased') {
      return 'Purchased (Incoming)';
    }
    return column;
  };

  // Helpers for date filtering
  const isWithinRange = (date: Date, from?: Date | null, to?: Date | null): boolean => {
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
  const resolvePresetRange = (preset: '7d' | '30d' | '90d' | null): [Date | null, Date | null] => {
    if (!preset) return [null, null];
    const now = new Date();
    const from = new Date(now);
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    from.setDate(now.getDate() - days);
    return [from, now];
  };

  // Filter products by search query and filters
  const filterProductBySearch = (product: Product): boolean => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

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
    const [cFromPreset, cToPreset] = resolvePresetRange(createdPreset);
    const [uFromPreset, uToPreset] = resolvePresetRange(updatedPreset);
    const createdFromDate = createdFrom ? new Date(createdFrom) : cFromPreset;
    const createdToDate = createdTo ? new Date(createdTo) : cToPreset;
    const updatedFromDate = updatedFrom ? new Date(updatedFrom) : uFromPreset;
    const updatedToDate = updatedTo ? new Date(updatedTo) : uToPreset;

    return currentKanban.products.filter((product) => {
      if (product.columnStatus !== column) return false;
      if (!filterProductBySearch(product)) return false;

      // Supplier filter
      if (supplierFilter && product.supplier !== supplierFilter) return false;
      
      // Category multi
      if (categoryFilter.length > 0) {
        if (!product.category || !categoryFilter.includes(product.category)) return false;
      }
      
      // Priority multi
      if (priorityFilter.length > 0) {
        if (!product.priority || !priorityFilter.includes(product.priority)) return false;
      }
      
      // Location multi
      if (locationFilter.length > 0) {
        if (!product.locationId) return false;
        // Find the location name from locationId
        const location = locations.find(loc => loc.id === product.locationId);
        if (!location || !locationFilter.includes(location.name)) return false;
      }
      
      // Tag multi
      if (tagFilter.length > 0) {
        if (!product.tags || !Array.isArray(product.tags)) return false;
        const hasMatchingTag = product.tags.some(tag => tagFilter.includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      // Stock level range
      if (stockLevelMin !== null || stockLevelMax !== null) {
        const stockLevel = product.stockLevel;
        if (stockLevel === null || stockLevel === undefined) return false;
        if (stockLevelMin !== null && stockLevel < stockLevelMin) return false;
        if (stockLevelMax !== null && stockLevel > stockLevelMax) return false;
      }
      
      // Price range
      if (priceMin !== null || priceMax !== null) {
        const price = product.unitPrice;
        if (price === null || price === undefined) return false;
        if (priceMin !== null && price < priceMin) return false;
        if (priceMax !== null && price > priceMax) return false;
      }
      
      // Created range
      const createdAt = new Date(product.createdAt as unknown as string);
      if (!isWithinRange(createdAt, createdFromDate, createdToDate)) return false;
      
      // Updated range
      const updatedAt = new Date(product.updatedAt as unknown as string);
      if (!isWithinRange(updatedAt, updatedFromDate, updatedToDate)) return false;

      return true;
    });
  };

  const handleMoveProduct = async (productId: string, newColumn: string) => {
    // Check if this is an order kanban moving to "Purchased" column
    if (currentKanban?.type === 'order' && newColumn === 'Purchased') {
      const linkedKanbans = currentKanban?.linkedKanbans || [];
      
      if (linkedKanbans.length === 0) {
        toast.error('No receive kanbans linked. Please link at least one receive kanban in settings.');
        return;
      }

      // Find the product
      const product = currentKanban.products.find(p => p.id === productId);
      if (product) {
        try {
          // Move to Purchased column - backend will handle automatic transfer if configured
          const response = await moveProduct(productId, newColumn);
          
          // Check if automatic transfer occurred
          if (response?.transferInfo?.wasAutoTransferred) {
            const { targetKanbanName, transferSource } = response.transferInfo;
            const sourceText = transferSource === 'product-preference' ? 'product preference' : 'kanban default setting';
            
            toast.success(
              `Product moved to Purchased and automatically transferred to "${targetKanbanName}" based on ${sourceText}.`,
              { duration: 6000 }
            );
          } else {
            // No automatic transfer - immediately transfer using product preference or kanban default if available
            const targetKanbanId =
              product.preferredReceiveKanbanId ||
              currentKanban.defaultLinkedKanbanId ||
              null;

            if (targetKanbanId) {
              try {
                await transferProduct(product.id, targetKanbanId);
                const targetKanban =
                  (currentKanban.linkedKanbans || []).find(k => k.id === targetKanbanId);
                const targetName =
                  targetKanban?.name || 'selected receive kanban';
                toast.success(
                  `Product moved to Purchased and transferred to "${targetName}".`,
                  { duration: 6000 }
                );
              } catch (transferError: any) {
                toast.error('Failed to transfer product: ' + (transferError?.response?.data?.error?.message || transferError?.message));
              }
            } else {
              // No destination configured; inform user without showing slider
              toast.error('No transfer destination configured. Set a product transfer destination or a default receive kanban in Settings.');
            }
          }
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
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-9 bg-gray-200 rounded w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
            <div className="divide-y divide-gray-200">
              <div className="animate-pulse px-4 py-3">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="animate-pulse px-4 py-3">
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-28" />
            </div>
            <div className="divide-y divide-gray-200">
              <div className="animate-pulse px-4 py-3">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="animate-pulse px-4 py-3">
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
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
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="px-0 py-3 md:py-4">
            {/* Main Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Left Side - Title and Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate pr-4">
                    {currentKanban.name}
                  </h1>
                  {/* Mobile Actions */}
                  <div className="flex lg:hidden space-x-2">
                    <button
                      className="sm:hidden btn-secondary p-2"
                      onClick={() => setShowFilters(prev => !prev)}
                      aria-expanded={showFilters ? 'true' : 'false'}
                      aria-controls="mobile-filters"
                    >
                      <FunnelIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="btn-primary p-2"
                      onClick={() => setShowAddForm(true)}
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Status Badges and Stats */}
                <div className="mb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        currentKanban.type === 'order'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {currentKanban.type === 'order' ? 'Order Kanban' : 'Receive Kanban'}
                    </span>

                    {currentKanban.type === 'order' &&
                      currentKanban.linkedKanbans &&
                      currentKanban.linkedKanbans.length > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {currentKanban.linkedKanbans.length} Linked Board
                          {currentKanban.linkedKanbans.length > 1 ? 's' : ''}
                        </span>
                      )}
                  </div>

                  {/* Column Stats */}
                  <div className="mb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {getProductCount(currentKanban)} {getProductCount(currentKanban) === 1 ? 'item' : 'items'}
                    </span>
                    {getColumns().map((column) => {
                      const count = getProductsByColumn(column).length;
                      return (
                        <span key={column} className="text-sm text-gray-600">
                          {getColumnDisplayName(column)}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Description and Public Form Link */}
                <div className="space-y-2">
                  <p className="hidden md:block text-gray-600 text-sm max-w-3xl">
                    {getKanbanDescription()}
                  </p>
                  
                  {currentKanban.type === 'order' && currentKanban.publicFormToken && (
                    <div className="hidden lg:block">
                      <span className="text-sm text-gray-500">Public form: </span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {window.location.origin}/form/{currentKanban.publicFormToken}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Action Groups */}
              <div className="hidden lg:flex items-center space-x-3">
                {/* View Controls Group */}
                <div className="flex items-center bg-gray-50 rounded-lg p-1">
                  <button
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      kanbanBoardViewMode === 'board' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setKanbanBoardViewMode('board')}
                    title="Board view"
                  >
                    <Squares2X2Icon className="w-4 h-4 mr-2" />
                    Board
                  </button>
                  <button
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      kanbanBoardViewMode === 'compact' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setKanbanBoardViewMode('compact')}
                    title="Compact view"
                  >
                    <ListBulletIcon className="w-4 h-4 mr-2" />
                    Compact
                  </button>
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDesktopFilters(prev => !prev)}
                    className={`btn-secondary px-4 py-2 text-sm flex items-center ${
                      showDesktopFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                    }`}
                    title={showDesktopFilters ? 'Hide filters' : 'Show filters'}
                  >
                    <FunnelIcon className="w-4 h-4 mr-2" />
                    Filters
                    {(hasActiveFilters() || searchQuery) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                        {getActiveFilterCount() + (searchQuery ? 1 : 0)}
                      </span>
                    )}
                    {showDesktopFilters ? (
                      <ChevronUpIcon className="w-4 h-4 ml-2 transition-transform duration-200" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 ml-2 transition-transform duration-200" />
                    )}
                  </button>
                  <KeyboardShortcutsHelp shortcuts={shortcuts} />
                  <button
                    className="btn-secondary px-4 py-2 text-sm flex items-center"
                    onClick={handleOpenSettings}
                    disabled={isSettingsLoading}
                  >
                    {isSettingsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Settings'
                    )}
                  </button>
                  <button
                    className="btn-primary px-4 py-2 text-sm flex items-center"
                    onClick={() => setShowAddForm(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Product
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Action Bar */}
            <div className="flex lg:hidden items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                {/* View Toggle for Mobile */}
                <button
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    kanbanBoardViewMode === 'board' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setKanbanBoardViewMode(kanbanBoardViewMode === 'board' ? 'compact' : 'board')}
                >
                  {kanbanBoardViewMode === 'board' ? (
                    <>
                      <ListBulletIcon className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Compact</span>
                    </>
                  ) : (
                    <>
                      <Squares2X2Icon className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Board</span>
                    </>
                  )}
                </button>

                {/* Mobile Stats */}
                <div className="hidden sm:flex items-center text-sm text-gray-600 space-x-3">
                  {getColumns().slice(0, 3).map((column) => {
                    const count = getProductsByColumn(column).length;
                    return (
                      <span key={column} className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1"></span>
                        {getColumnDisplayName(column).slice(0, 3)}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDesktopFilters(prev => !prev)}
                  className={`btn-secondary px-3 py-2 text-sm flex items-center ${
                    showDesktopFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                  }`}
                >
                  <FunnelIcon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                <button
                  className="btn-secondary px-3 py-2 text-sm"
                  onClick={() => setIsSettingsModalOpen(true)}
                >
                  Settings
                </button>
                <button
                  className="btn-primary px-3 py-2 text-sm hidden sm:flex items-center"
                  onClick={() => setShowAddForm(true)}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar and Filters */}
        <div className="mb-4">
          {/* Desktop/Tablet filters - Collapsible Layout */}
          <div className="hidden sm:block">
            {/* Always Visible: Search Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <KanbanSearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    className="max-w-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDesktopFilters(prev => !prev)}
                    className={`px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200 flex items-center ${
                      showDesktopFilters 
                        ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FunnelIcon className="w-4 h-4 mr-2" />
                    {showDesktopFilters ? 'Hide Filters' : 'Show Filters'}
                    {(hasActiveFilters() || searchQuery) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                        {getActiveFilterCount() + (searchQuery ? 1 : 0)}
                      </span>
                    )}
                    {showDesktopFilters ? (
                      <ChevronUpIcon className="w-4 h-4 ml-2 transition-transform duration-200" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 ml-2 transition-transform duration-200" />
                    )}
                  </button>
                  {hasActiveFilters() && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Filter Section */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showDesktopFilters 
                ? 'max-h-[2000px] opacity-100 mb-4' 
                : 'max-h-0 opacity-0 mb-0'
            }`}>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                {/* Filter Presets Row */}
                <div className="flex items-center justify-between mb-4">
                  <FilterPresets />
                </div>

                {/* Quick Filters Row */}
                <div className="mb-4">
                  <QuickFilters products={currentKanban.products} />
                </div>

                {/* Advanced Filters - Compact Grid */}
                <div className="border-t border-gray-100 pt-4">
                  <FiltersPanel products={currentKanban.products} showAdvanced={true} />
                </div>
              </div>
            </div>

            {/* Active Filters Summary - Always Visible When There Are Filters */}
            {(hasActiveFilters() || searchQuery) && (
              <div className="mb-4">
                <EnhancedFilterChips 
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery('')}
                  showCount={true}
                  products={currentKanban.products.filter(product => {
                    // Apply all current filters to get the filtered count
                    const columns = getColumns();
                    return columns.some(column => getProductsByColumn(column).includes(product));
                  })}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                />
              </div>
            )}
          </div>
          
          {/* Mobile Bottom Sheet */}
          <MobileFiltersBottomSheet
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            products={currentKanban.products}
          />
          
          {/* Mobile Search Bar (always visible) */}
          <div className="sm:hidden mb-3">
            <KanbanSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Render Board or Compact View */}
        {kanbanBoardViewMode === 'board' ? (
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 pb-4">
            {getColumns().map((column) => (
              <KanbanColumn
                key={column}
                id={column}
                title={getColumnDisplayName(column)}
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
            onDelete={handleDeleteKanban}
            productCount={getProductCount(currentKanban)}
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
