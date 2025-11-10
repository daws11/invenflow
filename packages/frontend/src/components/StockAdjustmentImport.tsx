import { useEffect, useMemo, useState } from 'react';
import { inventoryApi, kanbanApi } from '../utils/api';
import type { Kanban } from '@invenflow/shared';
import { XMarkIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type PreviewRow = {
  sku?: string;
  legacySku?: string;
  legacyId?: string;
  productName: string;
  supplier: string;
  category: string;
  dimensions?: string | null;
  newStockLevel: number;
  locationCode?: string;
  unitPrice?: number;
  notes?: string;
  originalPurchaseDate?: string;
};

function parseCsv(text: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0]!.split(',').map(h => h.trim());
  const rows: PreviewRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    const line = lines[i]!;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]!;
      if (ch === '"' ) {
        if (inQuotes && line[c+1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    const obj: any = {};
    header.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim();
    });
    if (!obj['Product Name'] && !obj['productName']) continue;
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    rows.push({
      sku: obj['SKU'] || obj['sku'] || undefined,
      legacySku: obj['LegacySKU'] || obj['legacySku'] || undefined,
      legacyId: obj['LegacyID'] || obj['legacyId'] || undefined,
      productName: obj['Product Name'] || obj['productName'],
      supplier: obj['Supplier'] || obj['supplier'],
      category: obj['Category'] || obj['category'],
      dimensions: obj['Dimensions'] || obj['dimensions'] || undefined,
      newStockLevel: toNum(obj['New Stock Level'] ?? obj['newStockLevel']) ?? 0,
      locationCode: obj['Location'] || obj['Location Code'] || obj['locationCode'] || undefined,
      unitPrice: toNum(obj['Unit Price'] ?? obj['unitPrice']),
      notes: obj['Notes'] || obj['notes'] || undefined,
      originalPurchaseDate: obj['Original Purchase Date'] || obj['originalPurchaseDate'] || undefined,
    });
  }
  return rows;
}

export function StockAdjustmentImport() {
  const [receiveKanbans, setReceiveKanbans] = useState<Kanban[]>([]);
  const [targetKanbanId, setTargetKanbanId] = useState<string>('');
  const [targetKanbanDetail, setTargetKanbanDetail] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    kanbanApi.getAll().then(ks => {
      const receives = ks.filter(k => (k as any).type === 'receive');
      setReceiveKanbans(receives);
      if (receives.length > 0) {
        setTargetKanbanId(receives[0]!.id);
      }
    }).catch(() => {});
  }, []);

  // Load selected receive kanban details (includes location object)
  useEffect(() => {
    if (!targetKanbanId) {
      setTargetKanbanDetail(null);
      return;
    }
    kanbanApi.getById(targetKanbanId).then((data) => {
      setTargetKanbanDetail(data);
    }).catch(() => setTargetKanbanDetail(null));
  }, [targetKanbanId]);

  const handleFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const rows = parseCsv(text);
    setPreview(rows);
    setTouched(true);
  };

  const canImport = useMemo(() => {
    return Boolean(targetKanbanId) && preview.length > 0 && !processing;
  }, [targetKanbanId, preview, processing]);

  // Basic per-row validation
  const validations = useMemo(() => {
    const hasDefaultLocation = Boolean(targetKanbanDetail?.location?.id || targetKanbanDetail?.locationId);
    return preview.map(row => {
      const errors: string[] = [];
      if (!row.productName) errors.push('Missing Product Name');
      if (!row.supplier) errors.push('Missing Supplier');
      if (!row.category) errors.push('Missing Category');
      if (row.newStockLevel === undefined || row.newStockLevel === null || Number.isNaN(row.newStockLevel)) errors.push('Missing New Stock Level');
      if (typeof row.newStockLevel === 'number' && row.newStockLevel < 0) errors.push('Stock cannot be negative');
      // Only require per-row location when no default location on receive kanban
      if (!hasDefaultLocation && !row.locationCode) errors.push('Missing Location Code (no default location on kanban)');
      return { ok: errors.length === 0, errors };
    });
  }, [preview, targetKanbanDetail]);
  const invalidCount = validations.filter(v => !v.ok).length;

  const onImport = async () => {
    if (!canImport || invalidCount > 0) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        importBatchLabel: `Import ${new Date().toISOString().slice(0,19).replace('T',' ')}`,
        targetReceiveKanbanId: targetKanbanId,
        items: preview.map(r => ({
          sku: r.sku,
          legacySku: r.legacySku,
          legacyId: r.legacyId,
          productName: r.productName,
          supplier: r.supplier,
          category: r.category,
          dimensions: r.dimensions ?? undefined,
          newStockLevel: r.newStockLevel,
          locationCode: r.locationCode,
          unitPrice: r.unitPrice,
          notes: r.notes,
          originalPurchaseDate: r.originalPurchaseDate,
        })),
      };
      const res = await inventoryApi.importStored(payload);
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Import failed');
    } finally {
      setProcessing(false);
    }
  };

  const templateHeaders = [
    'SKU','LegacySKU','LegacyID','Product Name','Supplier','Category','Dimensions','New Stock Level','Location','Unit Price','Notes','Original Purchase Date'
  ];

  const downloadTemplate = () => {
    const csv = templateHeaders.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-adjustment-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Stock (Stored)</h2>
            <p className="text-xs text-gray-500 mt-1">Upload CSV to create/update Stored items with movement logs.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center text-xs px-3 py-2 border rounded-md hover:bg-gray-50"
              title="Download CSV Template"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Template
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Target Receive Kanban</label>
            <select
              value={targetKanbanId}
              onChange={e => setTargetKanbanId(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              {receiveKanbans.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            {targetKanbanDetail?.location ? (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-[10px] rounded bg-green-50 text-green-700 border border-green-200">
                Default Location: {targetKanbanDetail.location.name}
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-200">
                No default location set
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">CSV File</label>
            <label className="inline-flex items-center px-3 py-2 text-xs font-medium border rounded-md bg-white hover:bg-gray-50 cursor-pointer">
              <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
                className="hidden"
              />
            </label>
            {file && <span className="text-xs text-gray-600 truncate max-w-[200px]">{file.name}</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {preview.length === 0 && (
          <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-md p-4">
            Upload a CSV file to see a preview here. Use the template for correct columns. If your receive kanban has a default location, the Location column can be left blank.
          </div>
        )}

        {preview.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
              <div className="text-xs text-gray-600">
                Rows: <span className="font-medium">{preview.length}</span>
                {touched && (
                  <>
                    {' • '}
                    {invalidCount > 0 ? (
                      <span className="inline-flex items-center text-red-600">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        {invalidCount} invalid
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        All rows valid
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {templateHeaders.map(h => (
                      <th key={h} className="px-2 py-2 text-left text-gray-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-2 py-2 text-left text-gray-600 font-medium">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 300).map((r, i) => {
                    const v = validations[i];
                    return (
                      <tr key={i} className={`border-t ${v?.ok ? '' : 'bg-red-50'}`}>
                        <td className="px-2 py-1">{r.sku || ''}</td>
                        <td className="px-2 py-1">{r.legacySku || ''}</td>
                        <td className="px-2 py-1">{r.legacyId || ''}</td>
                        <td className="px-2 py-1">{r.productName}</td>
                        <td className="px-2 py-1">{r.supplier}</td>
                        <td className="px-2 py-1">{r.category}</td>
                        <td className="px-2 py-1">{r.dimensions || ''}</td>
                        <td className="px-2 py-1">{r.newStockLevel}</td>
                        <td className="px-2 py-1">{r.locationCode || ''}</td>
                        <td className="px-2 py-1">{r.unitPrice ?? ''}</td>
                        <td className="px-2 py-1">{r.notes || ''}</td>
                        <td className="px-2 py-1">{r.originalPurchaseDate || ''}</td>
                        <td className="px-2 py-1">
                          {v?.ok ? (
                            <span className="text-green-600">OK</span>
                          ) : (
                            <div className="text-red-600">{v?.errors[0]}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {preview.length > 300 && (
              <div className="p-2 text-xs text-gray-500">Showing first 300 rows...</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2 text-xs text-red-600">{error}</div>
      )}

      {result && (
        <div className="px-4 pb-2 text-xs text-gray-700">
          <div className="font-medium">Import Result</div>
          <div>Total: {result.totals.total}, Success: {result.totals.successful}, Skipped: {result.totals.skipped}, Failed: {result.totals.failed}</div>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 px-4 py-3 border-t bg-white">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center text-xs px-3 py-2 border rounded-md hover:bg-gray-50"
            title="Download CSV Template"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
            Download Template
          </button>
          <button
            disabled={!canImport || invalidCount > 0}
            onClick={onImport}
            className={`text-xs px-4 py-2 rounded-md ${(!canImport || invalidCount > 0) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {processing ? 'Processing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}


