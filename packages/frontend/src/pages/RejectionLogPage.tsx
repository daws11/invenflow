import { useEffect, useMemo, useState } from 'react';
import { Product, Kanban } from '@invenflow/shared';
import { useKanbanStore } from '../store/kanbanStore';
import { productApi } from '../utils/api';
import { formatDateWithTime } from '../utils/formatters';
import { useToast } from '../store/toastStore';
import {
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

type LocalFilters = {
  search: string;
  kanbanId: string;
};

const defaultFilters: LocalFilters = {
  search: '',
  kanbanId: '',
};

export default function RejectionLogPage() {
  const { kanbans, fetchKanbans, currentKanban, refreshCurrentKanban } = useKanbanStore();
  const toast = useToast();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LocalFilters>(defaultFilters);

  const orderKanbans = useMemo(
    () => kanbans.filter((k) => k.type === 'order'),
    [kanbans],
  );

  const kanbanMap = useMemo(() => {
    const map = new Map<string, Kanban>();
    for (const k of kanbans) {
      map.set(k.id, k);
    }
    return map;
  }, [kanbans]);

  useEffect(() => {
    if (kanbans.length === 0) {
      fetchKanbans();
    }
  }, [kanbans.length, fetchKanbans]);

  const loadRejected = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productApi.getRejected();
      setItems(data);
    } catch (err: any) {
      console.error('Failed to load rejection log', err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to load rejection log',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRejected();
  }, []);

  const handleApplyFilters = () => {
    // No-op for now since filtering is done client-side via useMemo
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleRefresh = async () => {
    await loadRejected();
  };

  const handleRestore = async (product: Product) => {
    try {
      await productApi.unreject(product.id);
      setItems((prev) => prev.filter((p) => p.id !== product.id));

      // Refresh current kanban if it matches the restored product's kanban
      if (currentKanban && currentKanban.id === product.kanbanId) {
        await refreshCurrentKanban();
      }

      toast.success('Product restored to kanban');
    } catch (err: any) {
      console.error('Failed to restore product', err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to restore product',
      );
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;

    if (filters.kanbanId) {
      result = result.filter((item) => item.kanbanId === filters.kanbanId);
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((item) => {
        return (
          item.productDetails.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.supplier && item.supplier.toLowerCase().includes(q)) ||
          (item.rejectionReason &&
            item.rejectionReason.toLowerCase().includes(q))
        );
      });
    }

    return result.sort((a, b) => {
      const aTime = a.rejectedAt
        ? new Date(a.rejectedAt as unknown as string).getTime()
        : 0;
      const bTime = b.rejectedAt
        ? new Date(b.rejectedAt as unknown as string).getTime()
        : 0;
      return bTime - aTime;
    });
  }, [items, filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rejection Log</h1>
          <p className="text-sm text-gray-600">
            View and restore products that were rejected from order kanbans.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search by product, SKU, supplier, or reason..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filters.kanbanId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, kanbanId: e.target.value }))
            }
            className="min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All order kanbans</option>
            {orderKanbans.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kanban
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const k = kanbanMap.get(item.kanbanId);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.productDetails}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.sku || 'No SKU'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {k?.name || 'Unknown kanban'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.columnStatus}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.rejectedAt
                        ? formatDateWithTime(
                            item.rejectedAt as unknown as string,
                          )
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                      <div className="truncate" title={item.rejectionReason || undefined}>
                        {item.rejectionReason || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestore(item)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                  >
                    No rejected products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-6 flex justify-center">
            <div className="text-sm text-gray-600">Loading rejected products...</div>
          </div>
        )}
      </div>
    </div>
  );
}


