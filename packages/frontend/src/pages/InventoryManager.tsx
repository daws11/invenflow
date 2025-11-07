import { useEffect, useState } from 'react';
import type { InventoryItem } from '@invenflow/shared';
import { useInventoryStore } from '../store/inventoryStore';
import { InventoryGrid } from '../components/InventoryGrid';
import { InventoryList } from '../components/InventoryList';
import { InventoryGroupedView } from '../components/InventoryGroupedView';
import { InventoryGroupedList } from '../components/InventoryGroupedList';
import { InventoryFilters } from '../components/InventoryFilters';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ViewModeDropdown } from '../components/ViewModeDropdown';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

export default function InventoryManager() {
  const {
    items,
    groupedItems,
    stats,
    loading,
    error,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    filters,
    viewMode,
    displayMode,
    groupedViewMode,
    selectedItem,
    showDetailModal,
    fetchInventory,
    fetchGroupedInventory,
    fetchStats,
    setFilters,
    clearFilters,
    setViewMode,
    setDisplayMode,
    setGroupedViewMode,
    setSelectedItem,
    setShowDetailModal,
    setPage,
    refreshInventory,
    clearError,
  } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (displayMode === 'individual') {
      fetchInventory();
    } else {
      fetchGroupedInventory();
    }
    fetchStats();
  }, [displayMode, fetchInventory, fetchGroupedInventory, fetchStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  const handleProductClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  
  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading inventory</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    clearError();
                    refreshInventory();
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Inventory Manager</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track all your inventory items from receive kanbans
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {/* Display Mode Toggle */}
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => setDisplayMode('individual')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-l-md transition-colors ${
                  displayMode === 'individual'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Individual View"
              >
                <Squares2X2Icon className="h-4 w-4 mr-2" />
                Individual
              </button>
              <button
                onClick={() => setDisplayMode('grouped')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium border-t border-b border-r rounded-r-md transition-colors ${
                  displayMode === 'grouped'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Grouped View"
              >
                <RectangleStackIcon className="h-4 w-4 mr-2" />
                Grouped
              </button>
            </div>

            {/* View Mode Toggle/Dropdown */}
            {displayMode === 'individual' ? (
              <ViewModeDropdown
                currentMode={viewMode}
                onModeChange={setViewMode}
              />
            ) : (
              /* Grouped View Mode Toggle */
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  onClick={() => setGroupedViewMode('grid')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-l-md transition-colors ${
                    groupedViewMode === 'grid'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Grid View"
                >
                  <Squares2X2Icon className="h-4 w-4 mr-2" />
                  Grid
                </button>
                <button
                  onClick={() => setGroupedViewMode('list')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium border-t border-b border-r rounded-r-md transition-colors ${
                    groupedViewMode === 'list'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  <TableCellsIcon className="h-4 w-4 mr-2" />
                  List
                </button>
              </div>
            )}

            <button
              onClick={refreshInventory}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalStats.total.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-purple-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Purchased</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalStats.purchased.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-yellow-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Received</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalStats.received.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Stored</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalStats.stored.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-red-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Low Stock</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalStats.lowStock.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search products..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm leading-4 font-medium transition-colors ${
                showFilters
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            {Object.keys(filters).length > 2 && ( // More than just sortBy and sortOrder
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-3">
          <InventoryFilters onClose={() => setShowFilters(false)} />
        </div>
      )}

      {/* Inventory Display */}
      <div className="bg-white shadow rounded-lg">
        {displayMode === 'grouped' ? (
          <div className={groupedViewMode === 'grid' ? 'p-6' : ''}>
            {groupedViewMode === 'list' ? (
              <InventoryGroupedList
                items={groupedItems}
                loading={loading}
              />
            ) : (
            <InventoryGroupedView
              items={groupedItems}
              loading={loading}
            />
            )}
          </div>
        ) : viewMode === 'list' ? (
          <InventoryList
            items={items}
            loading={loading}
            onProductClick={handleProductClick}
          />
        ) : (
          <InventoryGrid
            items={items}
            loading={loading}
            viewMode={viewMode}
            onProductClick={handleProductClick}
          />
        )}
      </div>

      {/* Pagination (only for individual mode) */}
      {displayMode === 'individual' && totalPages > 1 && (
        <div className="bg-white shadow rounded-lg px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedItem && (
        <ProductDetailModal
          item={selectedItem}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}
