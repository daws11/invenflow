import { Fragment, useEffect, useMemo, useState } from 'react';
import { StoredLogFilters, StoredLogWithRelations } from '@invenflow/shared';
import { useStoredLogStore } from '../store/storedLogStore';
import { useKanbanStore } from '../store/kanbanStore';
import {
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatRemovalType = (type?: string | null) => {
  if (!type) return 'Unknown';
  return type === 'auto' ? 'Auto' : type.charAt(0).toUpperCase() + type.slice(1);
};

type LocalFilters = {
  search: string;
  kanbanId: string;
  removalType: string;
  startDate: string;
  endDate: string;
};

const defaultFilters: LocalFilters = {
  search: '',
  kanbanId: '',
  removalType: '',
  startDate: '',
  endDate: '',
};

export default function StoredLogPage() {
  const { items, total, page, pageSize, loading, error, fetchLogs } = useStoredLogStore();
  const { kanbans, fetchKanbans } = useKanbanStore();
  const [filters, setFilters] = useState<LocalFilters>(defaultFilters);
  const [appliedParams, setAppliedParams] = useState<Partial<StoredLogFilters>>({
    page: 1,
    pageSize: 25,
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const receiveKanbans = useMemo(
    () => kanbans.filter((k) => k.type === 'receive'),
    [kanbans],
  );

  useEffect(() => {
    if (kanbans.length === 0) {
      fetchKanbans();
    }
  }, [kanbans.length, fetchKanbans]);

  useEffect(() => {
    fetchLogs(appliedParams);
  }, [appliedParams, fetchLogs]);

  const buildFilterParams = (override?: Partial<StoredLogFilters>) => {
    const params: Partial<StoredLogFilters> = {
      page: 1,
      pageSize: appliedParams.pageSize ?? 25,
      ...override,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.kanbanId) params.kanbanId = filters.kanbanId;
    if (filters.removalType) params.removalType = filters.removalType as 'auto' | 'manual';
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    return params;
  };

  const handleApplyFilters = () => {
    setExpandedRowId(null);
    setAppliedParams(buildFilterParams());
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setExpandedRowId(null);
    setAppliedParams({
      page: 1,
      pageSize: appliedParams.pageSize ?? 25,
    });
  };

  const handlePageChange = (newPage: number) => {
    setExpandedRowId(null);
    setAppliedParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setExpandedRowId(null);
    setAppliedParams((prev) => ({
      ...prev,
      page: 1,
      pageSize: newSize,
    }));
  };

  const handleRefresh = () => {
    setExpandedRowId(null);
    fetchLogs(appliedParams);
  };

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  const renderRowDetails = (log: StoredLogWithRelations) => {
    const metadata = (log.metadata || {}) as Record<string, unknown>;
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Product Snapshot
            </p>
            <dl className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium">{log.category || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Supplier</dt>
                <dd className="font-medium">{log.supplier || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium">{log.unit || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Stock Level</dt>
                <dd className="font-medium">
                  {typeof log.stockLevel === 'number' ? log.stockLevel : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Additional Info</p>
            <dl className="space-y-2 text-sm text-gray-700">
              <div>
                <dt className="text-gray-500">Notes</dt>
                <dd className="font-medium">{(metadata.notes as string) || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tags</dt>
                <dd className="font-medium">
                  {tags.length > 0 ? tags.join(', ') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Product Link</dt>
                <dd className="font-medium">
                  {metadata.productLink ? (
                    <a
                      href={String(metadata.productLink)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Open link
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stored Log</h1>
          <p className="text-sm text-gray-600">
            Historical record of every card that left the Stored column automatically.
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
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search by product, SKU, or reason..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filters.kanbanId}
            onChange={(e) => setFilters((prev) => ({ ...prev, kanbanId: e.target.value }))}
            className="min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All receive kanbans</option>
            {receiveKanbans.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select
            value={filters.removalType}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                removalType: e.target.value,
              }))
            }
            className="min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All removals</option>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
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
                  Stored At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Removed At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Removal
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{log.productDetails}</div>
                      <div className="text-xs text-gray-500">{log.sku || 'No SKU'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.kanbanName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(log.storedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(log.removedAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.removalType === 'auto'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {formatRemovalType(log.removalType)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{log.removalReason || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setExpandedRowId((prev) => (prev === log.id ? null : log.id))
                        }
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expandedRowId === log.id ? (
                          <>
                            Hide details <ChevronUpIcon className="w-4 h-4 ml-1" />
                          </>
                        ) : (
                          <>
                            View details <ChevronDownIcon className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRowId === log.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        {renderRowDetails(log)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No stored log entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-6 flex justify-center">
            <div className="text-sm text-gray-600">Loading stored logs...</div>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, total)} of {total} records
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

