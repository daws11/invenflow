import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../store/authStore";
import { useKanbanStore } from "../store/kanbanStore";
import { useViewPreferencesStore } from "../store/viewPreferencesStore";
import { useLocationStore } from "../store/locationStore";
import { useBulkSelectionStore } from "../store/bulkSelectionStore";
import { useProductGroupStore } from "../store/productGroupStore";
import {
  ORDER_COLUMNS,
  RECEIVE_COLUMNS,
  INVESTMENT_COLUMNS,
  Product,
  ValidationStatus,
  ProductGroupWithDetails,
} from "@invenflow/shared";
import { productApi, api } from "../utils/api";
import KanbanColumn from "../components/KanbanColumn";
import CompactBoardView from "../components/CompactBoardView";
import ProductForm from "../components/ProductForm";
// import LocationFilter from '../components/LocationFilter';
import KanbanSearchBar from "../components/KanbanSearchBar";
import ProductSidebar from "../components/ProductSidebar";
import ValidationModal from "../components/ValidationModal";
import { KanbanSettingsModal } from "../components/KanbanSettingsModal";
import { TransferConfirmationSlider } from "../components/TransferConfirmationSlider";
import { useToast } from "../store/toastStore";
import { useResponsivePreference } from "../hooks/useResponsivePreference";
import { useKanbanKeyboardShortcuts } from "../hooks/useKanbanKeyboardShortcuts";
import FiltersPanel from "../components/FiltersPanel";
import MobileFiltersBottomSheet from "../components/MobileFiltersBottomSheet";
import QuickFilters from "../components/QuickFilters";
import FilterPresets from "../components/FilterPresets";
import EnhancedFilterChips from "../components/EnhancedFilterChips";
import KeyboardShortcutsHelp from "../components/KeyboardShortcutsHelp";
import { BulkActionBar } from "../components/BulkActionBar";
import { BulkRejectModal } from "../components/BulkRejectModal";
import { BulkMoveModal } from "../components/BulkMoveModal";
import { GroupItemsModal } from "../components/GroupItemsModal";
import { EditGroupModal } from "../components/EditGroupModal";
import { getProductCount } from "../utils/productCount";

export default function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const {
    currentKanban,
    loading,
    error,
    fetchKanbanById,
    moveProduct,
    transferProduct,
    deleteKanban,
    reorderColumnProducts,
  } = useKanbanStore();
  const { kanbanBoardViewMode, setKanbanBoardViewMode } =
    useViewPreferencesStore();
  const { locations, fetchLocations } = useLocationStore();
  const { selectedProductIds, getSelectedColumn, clearSelection } =
    useBulkSelectionStore();
  const hasSelection = selectedProductIds.size > 0;
  const { createGroup, deleteGroup, updateGroup } = useProductGroupStore();
  const toast = useToast();
  const authUser = useAuthStore((state) => state.user);
  const isAdmin = authUser?.role === 'admin';
  const accessRole = currentKanban?.userRole;
  const canEditKanban = isAdmin || accessRole === 'editor';
  const isViewer = Boolean(currentKanban) && !canEditKanban;

  // Enhanced settings handler to ensure fresh data
  const handleOpenSettings = async () => {
    if (!id || isSettingsLoading || !canEditKanban) return;

    setIsSettingsLoading(true);
    try {
      // Pre-fetch fresh kanban data with linkedKanbans before opening modal
      await fetchKanbanById(id);
      setIsSettingsModalOpen(true);
    } catch (error: any) {
      toast.error(
        "Failed to load kanban data: " + (error?.message || "Unknown error"),
      );
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const toggleFilters = () => {
    if (window.innerWidth >= 640) {
      setShowDesktopFilters((prev) => !prev);
    } else {
      setShowFilters((prev) => !prev);
    }
  };

  const toggleViewMode = () =>
    setKanbanBoardViewMode(
      kanbanBoardViewMode === "board" ? "compact" : "board",
    );

  const focusSearchInput = () => {
    const searchInput = document.querySelector(
      'input[placeholder*="Search"]',
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleAddProductShortcut = canEditKanban
    ? () => setShowAddForm(true)
    : () => {};

  const handleToggleSettingsShortcut = canEditKanban
    ? handleOpenSettings
    : () => {};

  const { shortcuts } = useKanbanKeyboardShortcuts({
    onAddProduct: handleAddProductShortcut,
    onToggleFilters: toggleFilters,
    onToggleSettings: handleToggleSettingsShortcut,
    onToggleView: toggleViewMode,
    onFocusSearch: focusSearchInput,
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const {
    supplierFilter,
    categoryFilter,
    priorityFilter,
    locationFilter,
    tagFilter,
    stockLevelMin,
    stockLevelMax,
    priceMin,
    priceMax,
    createdFrom,
    createdTo,
    createdPreset,
    updatedFrom,
    updatedTo,
    updatedPreset,
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
  const [productToTransfer, setProductToTransfer] = useState<Product | null>(
    null,
  );

  // Bulk action modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Group edit modal state
  const [activeGroup, setActiveGroup] =
    useState<ProductGroupWithDetails | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: (() => {
        const isSmall =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(max-width: 768px)").matches;
        return isSmall
          ? { distance: 12, delay: 120, tolerance: 6 }
          : { distance: 6 };
      })(),
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeSensors = canEditKanban ? sensors : [];

  // Initialize responsive preference (default compact on small screens)
  useResponsivePreference();

  useEffect(() => {
    if (id) {
      fetchKanbanById(id);
    }
  }, [id, fetchKanbanById]);

  // Update selectedProduct when the corresponding product in the store changes
  useEffect(() => {
    if (selectedProduct && currentKanban) {
      const updatedProduct = currentKanban.products.find(
        (p) => p.id === selectedProduct.id,
      );
      if (
        updatedProduct &&
        JSON.stringify(updatedProduct) !== JSON.stringify(selectedProduct)
      ) {
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

  if (!currentKanban) {
    return (
      <div className="px-4 py-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading kanban...</p>
        ) : (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || "Kanban not available"}
          </div>
        )}
      </div>
    );
  }

  const getColumns = () => {
    if (!currentKanban) return [];
    switch (currentKanban.type) {
      case "order":
        return ORDER_COLUMNS;
      case "receive":
        return RECEIVE_COLUMNS;
      case "investment":
        return INVESTMENT_COLUMNS;
      default:
        return ORDER_COLUMNS;
    }
  };

  const getColumnDisplayName = (column: string) => {
    if (currentKanban?.type === "receive" && column === "Purchased") {
      return "Purchased (Incoming)";
    }
    return column;
  };

  // Helpers for date filtering
  const isWithinRange = (
    date: Date,
    from?: Date | null,
    to?: Date | null,
  ): boolean => {
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
  const resolvePresetRange = (
    preset: "7d" | "30d" | "90d" | null,
  ): [Date | null, Date | null] => {
    if (!preset) return [null, null];
    const now = new Date();
    const from = new Date(now);
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
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
      if (product.tags.some((tag) => tag.toLowerCase().includes(query)))
        return true;
    }

    // Search in notes
    if (product.notes?.toLowerCase().includes(query)) return true;

    // Search in dimensions
    if (product.dimensions?.toLowerCase().includes(query)) return true;

    // Search in weight (as string)
    if (product.weight !== null && product.weight.toString().includes(query))
      return true;

    // Search in unitPrice (as string)
    if (
      product.unitPrice !== null &&
      product.unitPrice.toString().includes(query)
    )
      return true;

    // Search in stockLevel (as string)
    if (
      product.stockLevel !== null &&
      product.stockLevel.toString().includes(query)
    )
      return true;

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

    const filtered = currentKanban.products.filter((product) => {
      if (product.columnStatus !== column) return false;
      if (!filterProductBySearch(product)) return false;

      // Supplier filter
      if (supplierFilter && product.supplier !== supplierFilter) return false;

      // Category multi
      if (categoryFilter.length > 0) {
        if (!product.category || !categoryFilter.includes(product.category))
          return false;
      }

      // Priority multi
      if (priorityFilter.length > 0) {
        if (!product.priority || !priorityFilter.includes(product.priority))
          return false;
      }

      // Location multi
      if (locationFilter.length > 0) {
        if (!product.locationId) return false;
        // Find the location name from locationId
        const location = locations.find((loc) => loc.id === product.locationId);
        if (!location || !locationFilter.includes(location.name)) return false;
      }

      // Tag multi
      if (tagFilter.length > 0) {
        if (!product.tags || !Array.isArray(product.tags)) return false;
        const hasMatchingTag = product.tags.some((tag: string) =>
          tagFilter.includes(tag),
        );
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
      if (!isWithinRange(createdAt, createdFromDate, createdToDate))
        return false;

      // Updated range
      const updatedAt = new Date(product.updatedAt as unknown as string);
      if (!isWithinRange(updatedAt, updatedFromDate, updatedToDate))
        return false;

      return true;
    });

    // Sort by columnPosition first, then createdAt for stable ordering
    return filtered.sort((a, b) => {
      const posA = a.columnPosition ?? Number.MAX_SAFE_INTEGER;
      const posB = b.columnPosition ?? Number.MAX_SAFE_INTEGER;
      if (posA !== posB) {
        return posA - posB;
      }
      const createdA = new Date(a.createdAt as unknown as string).getTime();
      const createdB = new Date(b.createdAt as unknown as string).getTime();
      return createdA - createdB;
    });
  };

  const handleMoveProduct = async (productId: string, newColumn: string) => {
    // Check if this is an order kanban moving to "Purchased" column
    if (currentKanban?.type === "order" && newColumn === "Purchased") {
      const linkedKanbans = currentKanban?.linkedKanbans || [];

      if (linkedKanbans.length === 0) {
        toast.error(
          "No receive kanbans linked. Please link at least one receive kanban in settings.",
        );
        return;
      }

      // Find the product
      const product = currentKanban.products.find((p) => p.id === productId);
      if (product) {
        try {
          // Move to Purchased column - backend will handle automatic transfer if configured
          const response = await moveProduct(productId, newColumn);

          // Check if automatic transfer occurred
          if (response?.transferInfo?.wasAutoTransferred) {
            const { targetKanbanName, transferSource } = response.transferInfo;
            const sourceText =
              transferSource === "product-preference"
                ? "product preference"
                : "kanban default setting";

            toast.success(
              `Product moved to Purchased and automatically transferred to "${targetKanbanName}" based on ${sourceText}.`,
              { duration: 6000 },
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
                const targetKanban = (currentKanban.linkedKanbans || []).find(
                  (k) => k.id === targetKanbanId,
                );
                const targetName =
                  targetKanban?.name || "selected receive kanban";
                toast.success(
                  `Product moved to Purchased and transferred to "${targetName}".`,
                  { duration: 6000 },
                );
              } catch (transferError: any) {
                toast.error(
                  "Failed to transfer product: " +
                    (transferError?.response?.data?.error?.message ||
                      transferError?.message),
                );
              }
            } else {
              // No destination configured; inform user without showing slider
              toast.error(
                "No transfer destination configured. Set a product transfer destination or a default receive kanban in Settings.",
              );
            }
          }
        } catch (error: any) {
          toast.error(
            "Failed to move product: " +
              (error?.response?.data?.error?.message || error?.message),
          );
        }
      }
      return;
    }

    // Normal move for non-order kanbans or other columns
    try {
      await moveProduct(productId, newColumn);
    } catch (error: any) {
      // Check if error requires validation from response details
      const requiresValidation =
        error?.response?.data?.error?.details?.requiresValidation;
      const columnStatus = error?.response?.data?.error?.details?.columnStatus;
      const errorProductId = error?.response?.data?.error?.details?.productId;

      if (
        requiresValidation &&
        errorProductId === productId &&
        columnStatus === newColumn
      ) {
        setPendingProductMove({
          productId,
          targetColumn: newColumn,
        });
        setShowValidationModal(true);
      } else {
        toast.error(
          "Failed to move product: " +
            (error?.response?.data?.error?.message || error?.message),
        );
      }
    }
  };

  const handleValidationSubmit = async (validationData: any) => {
    setIsValidationLoading(true);

    try {
      // Submit validation first
      await api.post(
        "/api/validations/validate",
        validationData,
      );

      // After successful validation, proceed with product move
      if (pendingProductMove) {
        await moveProduct(
          pendingProductMove.productId,
          pendingProductMove.targetColumn,
          validationData.locationId, // pass locationId from validation data
          true, // skip validation check since validation is already completed
        );
      }

      // Close modal and reset state
      setShowValidationModal(false);
      setPendingProductMove(null);
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error instanceof Error ? error.message : "Validation failed");
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
      toast.success("Product transferred successfully");
      setShowTransferSlider(false);
      setProductToTransfer(null);
    } catch (error: any) {
      toast.error(
        "Failed to transfer product: " +
          (error?.response?.data?.error?.message || error?.message),
      );
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
      toast.success("Kanban deleted successfully");
      // Redirect to kanban list after deletion
      window.location.href = "/kanbans";
    } catch (error) {
      toast.error("Failed to delete kanban. Please try again.");
      throw error;
    }
  };

  const handleOpenGroupSettings = (group: ProductGroupWithDetails) => {
    setActiveGroup(group);
    setShowEditGroupModal(true);
  };

  const handleUpdateGroup = async (
    groupId: string,
    payload: {
      groupTitle: string;
      unifiedFields: Record<string, boolean>;
      unifiedValues: Record<string, any>;
    },
  ) => {
    try {
      await updateGroup(groupId, {
        groupTitle: payload.groupTitle,
        unifiedFields: payload.unifiedFields,
        unifiedValues: payload.unifiedValues,
      });
      if (id) {
        await fetchKanbanById(id);
      }
      toast.success("Group updated successfully");
    } catch (error) {
      console.error("Failed to update group", error);
      toast.error("Failed to update group");
      throw error;
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      if (id) {
        await fetchKanbanById(id);
      }
      toast.success("Group deleted successfully");
    } catch (error) {
      console.error("Failed to delete group", error);
      toast.error("Failed to delete group");
      throw error;
    }
  };

  // Bulk action handlers
  const getSelectedProducts = (): Product[] => {
    if (!currentKanban) return [];
    return currentKanban.products.filter((p) => selectedProductIds.has(p.id));
  };

  const handleBulkReject = async (reason: string) => {
    const productIds = Array.from(selectedProductIds);
    try {
      await productApi.bulkReject(productIds, reason);
      toast.success(`${productIds.length} products rejected successfully`);
      await fetchKanbanById(id!);
      clearSelection();
    } catch (error) {
      toast.error("Failed to reject products");
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    const productIds = Array.from(selectedProductIds);
    const confirmed = window.confirm(
      `Are you sure you want to delete ${productIds.length} products? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await productApi.bulkDelete(productIds);
      toast.success(`${productIds.length} products deleted successfully`);
      await fetchKanbanById(id!);
      clearSelection();
    } catch (error) {
      toast.error("Failed to delete products");
      console.error(error);
    }
  };

  const handleBulkMove = async (targetColumn: string, locationId?: string) => {
    const productIds = Array.from(selectedProductIds);
    try {
      await productApi.bulkMove(productIds, targetColumn, locationId);
      toast.success(`${productIds.length} products moved successfully`);
      await fetchKanbanById(id!);
      clearSelection();
    } catch (error) {
      toast.error("Failed to move products");
      console.error(error);
    }
  };

  const handleBulkGroup = async (
    groupTitle: string,
    unifiedFields: Record<string, boolean>,
    unifiedValues: Record<string, any>,
  ) => {
    const productIds = Array.from(selectedProductIds);
    const selectedColumn = getSelectedColumn(currentKanban?.products || []);

    if (!selectedColumn) {
      toast.error("Selected products must be in the same column");
      return;
    }

    try {
      await createGroup({
        kanbanId: id!,
        groupTitle,
        columnStatus: selectedColumn,
        productIds,
        unifiedFields,
        unifiedValues,
      });
      toast.success(`Group "${groupTitle}" created successfully`);
      await fetchKanbanById(id!);
      clearSelection();
    } catch (error) {
      toast.error("Failed to create group");
      console.error(error);
    }
  };

  const getKanbanDescription = () => {
    return currentKanban?.description?.trim() || "No description";
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!canEditKanban) return;
    const { active } = event;
    const activeId = active.id.toString();

    const product = currentKanban?.products.find((p) => p.id === activeId);
    const group =
      (currentKanban as any)?.productGroups?.find(
        (g: ProductGroupWithDetails) => g.id === activeId,
      ) || null;

    setActiveProduct(product || null);
    setActiveGroup(group);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!canEditKanban) return;
    const { active, over } = event;
    if (!over) return;

    const activeProduct = currentKanban?.products.find(
      (p) => p.id === active.id,
    );
    if (!activeProduct) return;

    const overColumn = over.id.toString();
    const columns = getColumns();

    if (
      (columns as string[]).includes(overColumn) &&
      activeProduct.columnStatus !== overColumn
    ) {
      // Optional: Add visual feedback for drag over state
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canEditKanban) return;
    const { active, over } = event;
    setActiveProduct(null);
    setActiveGroup(null);

    if (!over || !currentKanban) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const columns = getColumns() as string[];

    const activeGroup: ProductGroupWithDetails | undefined = (
      currentKanban as any
    ).productGroups?.find((g: ProductGroupWithDetails) => g.id === activeId);
    const activeProduct = currentKanban.products.find((p) => p.id === activeId);

    // Helper: build ordered list of all groups + ungrouped products in a column
    const buildColumnItems = (columnStatus: string) => {
      const columnGroups: ProductGroupWithDetails[] = (
        (currentKanban as any).productGroups || []
      ).filter(
        (group: ProductGroupWithDetails) => group.columnStatus === columnStatus,
      );
      const columnProducts = currentKanban.products.filter(
        (p) => p.columnStatus === columnStatus && !p.productGroupId,
      );

      return [
        ...columnGroups.map((group) => ({
          id: group.id,
          type: "group" as const,
          columnStatus: group.columnStatus,
          columnPosition: (group as any).columnPosition ?? null,
          createdAt: new Date(group.createdAt as unknown as string).getTime(),
        })),
        ...columnProducts.map((product) => ({
          id: product.id,
          type: "product" as const,
          columnStatus: product.columnStatus,
          columnPosition: product.columnPosition ?? null,
          createdAt: new Date(product.createdAt as unknown as string).getTime(),
        })),
      ].sort((a, b) => {
        const posA = a.columnPosition ?? Number.MAX_SAFE_INTEGER;
        const posB = b.columnPosition ?? Number.MAX_SAFE_INTEGER;
        if (posA !== posB) return posA - posB;
        return a.createdAt - b.createdAt;
      });
    };

    // Handle dragging a whole product group as a unit
    if (activeGroup) {
      const groupColumn = activeGroup.columnStatus;

      // Determine target column and (optional) target item from drop target
      let targetColumn: string | null = null;
      let targetItemId: string | null = null;

      if (columns.includes(overId)) {
        targetColumn = overId;
      } else {
        const overGroup: ProductGroupWithDetails | undefined = (
          currentKanban as any
        ).productGroups?.find((g: ProductGroupWithDetails) => g.id === overId);
        if (overGroup) {
          targetColumn = overGroup.columnStatus;
          targetItemId = overGroup.id;
        } else {
          const overProduct = currentKanban.products.find(
            (p) => p.id === overId,
          );
          if (overProduct) {
            targetColumn = overProduct.columnStatus;
            targetItemId = overProduct.id;
          }
        }
      }

      if (!targetColumn) {
        return;
      }

      // Same column: reorder group within mixed list (groups + ungrouped products)
      if (targetColumn === groupColumn && targetItemId) {
        const columnItems = buildColumnItems(groupColumn);

        const oldIndex = columnItems.findIndex(
          (item) => item.type === "group" && item.id === activeGroup.id,
        );
        const newIndex = columnItems.findIndex(
          (item) => item.id === targetItemId,
        );

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        const newOrdered = arrayMove(columnItems, oldIndex, newIndex);
        const orderedItems = newOrdered.map((item) => ({
          id: item.id,
          type: item.type,
        }));

        await reorderColumnProducts(
          currentKanban.id,
          groupColumn,
          orderedItems,
        );
        return;
      }

      // Different column: move entire group to target column (keep existing behaviour)
      if (targetColumn !== groupColumn) {
        const productIds = (activeGroup.products || []).map((p) => p.id);
        if (productIds.length === 0) {
          return;
        }

        try {
          // Move all products in the group to the new column
          await productApi.bulkMove(productIds, targetColumn);
          // Update the group's columnStatus so it renders in the correct column
          await updateGroup(activeGroup.id, {
            columnStatus: targetColumn,
          });
          if (id) {
            await fetchKanbanById(id);
          }
          toast.success(
            `Moved group "${activeGroup.groupTitle}" to ${targetColumn} (${productIds.length} items)`,
          );
        } catch (error) {
          console.error("Failed to move group:", error);
          toast.error("Failed to move group");
        }
        return;
      }

      return;
    }

    if (!activeProduct) return;

    // Dropped on a column area: move between columns (existing behaviour)
    if (columns.includes(overId)) {
      if (activeProduct.columnStatus !== overId) {
        await handleMoveProduct(activeProduct.id, overId);
      }
      return;
    }

    // Dropped on another item (product or group)
    const overGroup: ProductGroupWithDetails | undefined = (
      currentKanban as any
    ).productGroups?.find((g: ProductGroupWithDetails) => g.id === overId);
    const overProduct = currentKanban.products.find((p) => p.id === overId);

    if (!overGroup && !overProduct) return;

    const sourceColumn = activeProduct.columnStatus;
    const targetColumn = overGroup
      ? overGroup.columnStatus
      : (overProduct as Product).columnStatus;

    // Same column: reorder within mixed list (groups + ungrouped products)
    if (sourceColumn === targetColumn) {
      const columnItems = buildColumnItems(sourceColumn);

      const oldIndex = columnItems.findIndex(
        (item) => item.type === "product" && item.id === activeProduct.id,
      );
      const newIndex = columnItems.findIndex((item) => item.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const newOrdered = arrayMove(columnItems, oldIndex, newIndex);
      const orderedItems = newOrdered.map((item) => ({
        id: item.id,
        type: item.type,
      }));

      await reorderColumnProducts(currentKanban.id, sourceColumn, orderedItems);
      return;
    }

    // Different column: treat as move to target column
    if (sourceColumn !== targetColumn) {
      await handleMoveProduct(activeProduct.id, targetColumn);
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
        <div className="text-red-600 text-lg mb-4">
          Error loading kanban board
        </div>
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
        <button onClick={() => window.history.back()} className="btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  const kanbanTypeBadgeStyles: Record<
    "order" | "receive" | "investment",
    { label: string; className: string }
  > = {
    order: { label: "Order Kanban", className: "bg-blue-100 text-blue-800" },
    receive: { label: "Receive Kanban", className: "bg-green-100 text-green-800" },
    investment: { label: "Investment Kanban", className: "bg-yellow-100 text-yellow-800" },
  };
  const currentTypeBadge = kanbanTypeBadgeStyles[currentKanban.type];

  return (
    <DndContext
      sensors={activeSensors}
      collisionDetection={closestCenter}
      onDragStart={canEditKanban ? handleDragStart : undefined}
      onDragOver={canEditKanban ? handleDragOver : undefined}
      onDragEnd={canEditKanban ? handleDragEnd : undefined}
    >
      <div>
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
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
                      onClick={() => setShowFilters((prev) => !prev)}
                      aria-expanded={showFilters ? "true" : "false"}
                      aria-controls="mobile-filters"
                    >
                      <FunnelIcon className="w-5 h-5" />
                    </button>
                  <button
                    className="btn-primary p-2"
                    onClick={() => canEditKanban && setShowAddForm(true)}
                    disabled={!canEditKanban}
                    aria-disabled={!canEditKanban}
                  >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Status Badges and Stats */}
                <div className="mb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentTypeBadge.className}`}
                    >
                      {currentTypeBadge.label}
                    </span>

                    {currentKanban.type === "order" &&
                      currentKanban.linkedKanbans &&
                      currentKanban.linkedKanbans.length > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {currentKanban.linkedKanbans.length} Linked Board
                          {currentKanban.linkedKanbans.length > 1 ? "s" : ""}
                        </span>
                      )}
                  </div>

                  {/* Column Stats */}
                  <div className="mb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {getProductCount(currentKanban)}{" "}
                      {getProductCount(currentKanban) === 1 ? "item" : "items"}
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

                  {currentKanban.type === "order" &&
                    currentKanban.publicFormToken && (
                      <div className="hidden lg:block">
                        <span className="text-sm text-gray-500">
                          Public form:{" "}
                        </span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {window.location.origin}/form/
                          {currentKanban.publicFormToken}
                        </code>
                      </div>
                    )}
                  {isViewer && (
                    <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-900">
                      You have view-only access to this kanban.
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
                      kanbanBoardViewMode === "board"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setKanbanBoardViewMode("board")}
                    title="Board view"
                  >
                    <Squares2X2Icon className="w-4 h-4 mr-2" />
                    Board
                  </button>
                  <button
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      kanbanBoardViewMode === "compact"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setKanbanBoardViewMode("compact")}
                    title="Compact view"
                  >
                    <ListBulletIcon className="w-4 h-4 mr-2" />
                    Compact
                  </button>
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleFilters}
                    className={`btn-secondary px-4 py-2 text-sm flex items-center ${
                      showDesktopFilters
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : ""
                    }`}
                    title={showDesktopFilters ? "Hide filters" : "Show filters"}
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
                    disabled={isSettingsLoading || !canEditKanban}
                    aria-disabled={isSettingsLoading || !canEditKanban}
                  >
                    {isSettingsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      "Settings"
                    )}
                  </button>
                  <button
                    className="btn-primary px-4 py-2 text-sm flex items-center"
                    onClick={() => canEditKanban && setShowAddForm(true)}
                    disabled={!canEditKanban}
                    aria-disabled={!canEditKanban}
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
                    kanbanBoardViewMode === "board"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={toggleViewMode}
                >
                  {kanbanBoardViewMode === "board" ? (
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
                  {getColumns()
                    .slice(0, 3)
                    .map((column) => {
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
                  onClick={toggleFilters}
                  className={`btn-secondary px-3 py-2 text-sm flex items-center ${
                    showDesktopFilters
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : ""
                  }`}
                >
                  <FunnelIcon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                <button
                  className="btn-secondary px-3 py-2 text-sm"
                  onClick={handleOpenSettings}
                  disabled={!canEditKanban}
                  aria-disabled={!canEditKanban}
                >
                  Settings
                </button>
                <button
                  className="btn-primary px-3 py-2 text-sm hidden sm:flex items-center"
                  onClick={() => canEditKanban && setShowAddForm(true)}
                  disabled={!canEditKanban}
                  aria-disabled={!canEditKanban}
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
                    onClick={toggleFilters}
                    className={`px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200 flex items-center ${
                      showDesktopFilters
                        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <FunnelIcon className="w-4 h-4 mr-2" />
                    {showDesktopFilters ? "Hide Filters" : "Show Filters"}
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
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showDesktopFilters
                  ? "max-h-[2000px] opacity-100 mb-4"
                  : "max-h-0 opacity-0 mb-0"
              }`}
            >
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
                  <FiltersPanel
                    products={currentKanban.products}
                    showAdvanced={true}
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary - Always Visible When There Are Filters */}
            {(hasActiveFilters() || searchQuery) && (
              <div className="mb-4">
                <EnhancedFilterChips
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery("")}
                  showCount={true}
                  products={currentKanban.products.filter((product) => {
                    // Apply all current filters to get the filtered count
                    const columns = getColumns();
                    return columns.some((column) =>
                      getProductsByColumn(column).includes(product),
                    );
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
        {kanbanBoardViewMode === "board" ? (
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 pb-4">
            {getColumns().map((column) => (
              <KanbanColumn
                key={column}
                id={column}
                title={getColumnDisplayName(column)}
                products={getProductsByColumn(column)}
                onProductView={handleViewProduct}
                kanban={currentKanban}
                onOpenGroupSettings={handleOpenGroupSettings}
                onDeleteGroup={handleDeleteGroup}
              />
            ))}
          </div>
        ) : (
          <CompactBoardView
            kanban={currentKanban}
            onProductView={handleViewProduct}
            onMoveProduct={canEditKanban ? handleMoveProduct : undefined}
            searchQuery={searchQuery}
            locations={locations}
            onOpenGroupSettings={handleOpenGroupSettings}
            isEditable={canEditKanban}
          />
        )}

        {/* Add Product Form */}
        {showAddForm && canEditKanban && (
          <ProductForm
            kanbanId={currentKanban.id}
            initialColumn={getColumns()[0]}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {/* Edit Product Form */}
        {editingProduct && canEditKanban && (
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
            defaultLocationId={currentKanban?.locationId || undefined}
          />
        )}

        {/* Settings Modal */}
        {currentKanban && canEditKanban && (
          <KanbanSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            kanban={currentKanban}
            onDelete={handleDeleteKanban}
            productCount={getProductCount(currentKanban)}
          />
        )}

        {/* Transfer Confirmation Slider */}
        {canEditKanban && showTransferSlider && productToTransfer && currentKanban && (
          <TransferConfirmationSlider
            isOpen={showTransferSlider}
            onClose={handleCloseTransferSlider}
            product={productToTransfer}
            linkedKanbans={currentKanban.linkedKanbans || []}
            onConfirm={handleTransferConfirm}
          />
        )}

        {/* Bulk Action Modals */}
        {canEditKanban && (
          <>
            <BulkRejectModal
              isOpen={showRejectModal}
              onClose={() => setShowRejectModal(false)}
              products={getSelectedProducts()}
              onConfirm={handleBulkReject}
            />

            <BulkMoveModal
              isOpen={showMoveModal}
              onClose={() => setShowMoveModal(false)}
              products={getSelectedProducts()}
              availableColumns={getColumns()}
              currentColumn={getSelectedColumn(currentKanban?.products || []) || ""}
              onConfirm={handleBulkMove}
            />

            <GroupItemsModal
              isOpen={showGroupModal}
              onClose={() => setShowGroupModal(false)}
              products={getSelectedProducts()}
              onConfirm={handleBulkGroup}
            />
          </>
        )}

        {/* Edit Group Modal */}
        {currentKanban && activeGroup && canEditKanban && (
          <EditGroupModal
            isOpen={showEditGroupModal}
            onClose={() => setShowEditGroupModal(false)}
            group={activeGroup}
            products={activeGroup.products || []}
            onUpdate={handleUpdateGroup}
            onDelete={handleDeleteGroup}
          />
        )}

        {/* Bulk Action Bar */}
        {canEditKanban && hasSelection && currentKanban && (
          <BulkActionBar
            products={currentKanban.products}
            onReject={() => setShowRejectModal(true)}
            onDelete={handleBulkDelete}
            onGroup={() => setShowGroupModal(true)}
          />
        )}
      </div>

      <DragOverlay>
        {activeProduct ? (
          <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-4 opacity-95 rotate-3 transform scale-105 max-w-sm">
            {/* Drag indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                  />
                </svg>
              </div>
            </div>

            {/* Product name */}
            <h4 className="font-semibold text-gray-900 mb-2 text-center">
              {activeProduct.productDetails}
            </h4>

            {/* Product details summary */}
            <div className="space-y-2">
              {activeProduct.sku && (
                <div className="text-xs text-gray-500 text-center">
                  SKU: {activeProduct.sku}
                </div>
              )}

              {/* Tags and priority */}
              <div className="flex flex-wrap gap-1 justify-center">
                {activeProduct.priority && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      activeProduct.priority.toLowerCase() === "urgent"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : activeProduct.priority.toLowerCase() === "high"
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : activeProduct.priority.toLowerCase() === "medium"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : "bg-green-100 text-green-800 border-green-200"
                    }`}
                  >
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
        ) : activeGroup ? (
          <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-4 opacity-95 rotate-1 transform scale-105 max-w-sm">
            {/* Drag indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h10M4 18h6"
                  />
                </svg>
              </div>
            </div>

            {/* Group title */}
            <h4 className="font-semibold text-gray-900 mb-2 text-center">
              {activeGroup.groupTitle}
            </h4>

            {/* Group summary */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                {activeGroup.products?.length ?? 0} grouped item
                {(activeGroup.products?.length ?? 0) === 1 ? "" : "s"}
              </div>

              {activeGroup.settings?.unifiedFields && (
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {Object.entries(activeGroup.settings.unifiedFields)
                    .filter(([_, enabled]) => enabled)
                    .slice(0, 3)
                    .map(([field]) => (
                      <span
                        key={field}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {field}
                      </span>
                    ))}
                  {Object.entries(activeGroup.settings.unifiedFields).filter(
                    ([_, enabled]) => enabled,
                  ).length > 3 && (
                    <span className="text-[11px] text-gray-500">
                      +
                      {Object.entries(
                        activeGroup.settings.unifiedFields,
                      ).filter(([_, enabled]) => enabled).length - 3}{" "}
                      more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Drag hint */}
            <div className="mt-3 text-xs text-gray-400 text-center italic">
              Moving grouped items...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
