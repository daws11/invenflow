# Stock Adjustment Feature - Implementation Summary

## Overview
Fitur stock adjustment memungkinkan pengguna (admin/manager) untuk melakukan koreksi stok manual langsung dari movement history atau halaman inventory. Fitur ini berguna untuk:
- Koreksi kesalahan pencatatan
- Penyesuaian setelah stock opname
- Pencatatan barang rusak/hilang/kadaluarsa
- Penyesuaian karena retur

## Database Changes

### Movement Logs Table - New Fields
Tabel `movement_logs` diperluas untuk mendukung stock adjustment:

```sql
ALTER TABLE movement_logs ADD COLUMN movement_type text DEFAULT 'transfer' NOT NULL;
ALTER TABLE movement_logs ADD COLUMN adjustment_type text;
ALTER TABLE movement_logs ADD COLUMN adjustment_reason text;
ALTER TABLE movement_logs ADD COLUMN reference_number text;
ALTER TABLE movement_logs ADD COLUMN approved_by text;
ALTER TABLE movement_logs ADD COLUMN approved_at timestamp;
CREATE INDEX movement_logs_movement_type_idx ON movement_logs (movement_type);
```

**Field Descriptions:**
- `movement_type`: 'transfer' (normal movement) atau 'adjustment' (stock adjustment)
- `adjustment_type`: Tipe adjustment (manual_increase, manual_decrease, correction, reconciliation, damaged, expired, lost, returned, transfer_correction)
- `adjustment_reason`: Alasan adjustment (required)
- `reference_number`: Nomor referensi (optional, untuk tracking)
- `approved_by`: User yang meng-approve adjustment
- `approved_at`: Timestamp approval

### Locations Table - Unique Constraint
Fixed race condition untuk General locations:

```sql
DROP INDEX IF EXISTS locations_area_name_idx;
ALTER TABLE locations ADD CONSTRAINT locations_area_name_unique UNIQUE(area, name);
```

## Backend API Endpoints

### 1. POST /api/stock-adjustments
Create stock adjustment dengan tipe dan quantity change yang spesifik.

**Request:**
```typescript
{
  productId: string;          // UUID product yang akan di-adjust
  locationId?: string | null; // Location ID (optional)
  adjustmentType: StockAdjustmentType; // Tipe adjustment
  quantityChange: number;     // Perubahan qty (+ atau -)
  reason: string;             // Alasan (required)
  referenceNumber?: string;   // Nomor referensi
  notes?: string | null;      // Catatan tambahan
}
```

**Adjustment Types:**
- `manual_increase`: Penambahan manual (barang ditemukan)
- `manual_decrease`: Pengurangan manual (barang hilang)
- `correction`: Koreksi kesalahan pencatatan
- `reconciliation`: Hasil stock opname
- `damaged`: Barang rusak
- `expired`: Barang kadaluarsa
- `lost`: Barang hilang/dicuri
- `returned`: Barang diretur
- `transfer_correction`: Koreksi transfer sebelumnya

**Response:**
```typescript
{
  adjustment: MovementLog;    // Log adjustment
  product: Product;           // Product yang diupdate
  stockBefore: number;        // Stok sebelum adjustment
  stockAfter: number;         // Stok setelah adjustment
}
```

**Permissions:** Requires `admin` or `manager` role

---

### 2. POST /api/stock-adjustments/inline
Quick adjustment dengan cara set quantity baru langsung (tidak perlu hitung selisih).

**Request:**
```typescript
{
  productId: string;        // UUID product
  locationId?: string | null;
  newQuantity: number;      // Quantity baru yang diinginkan
  reason: string;           // Alasan adjustment
  notes?: string | null;
}
```

**Response:**
```typescript
{
  adjustment: MovementLog;
  product: Product;
  stockBefore: number;
  stockAfter: number;
  quantityChange: number;   // Calculated difference
}
```

**Use Case:** 
Cocok untuk inline edit di movement history table - user tinggal input angka baru, sistem otomatis hitung selisihnya.

**Permissions:** Requires `admin` or `manager` role

---

### 3. GET /api/stock-adjustments
List stock adjustments dengan filter dan pagination.

**Query Parameters:**
```typescript
{
  productId?: string;
  locationId?: string;
  adjustmentType?: StockAdjustmentType;
  status?: 'pending' | 'approved' | 'rejected';
  dateFrom?: string;
  dateTo?: string;
  adjustedBy?: string;
  page?: number;         // Default: 1
  pageSize?: number;     // Default: 20, max: 100
}
```

**Response:**
```typescript
{
  items: Array<{
    ...MovementLog,
    product: Product,
    location: Location | null
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

### 4. GET /api/stock-adjustments/:id
Get single stock adjustment by ID.

**Response:**
```typescript
{
  ...MovementLog,
  product: Product,
  location: Location | null
}
```

---

### 5. PATCH /api/stock-adjustments/:id
Update pending stock adjustment (only status 'pending' can be edited).

**Request:**
```typescript
{
  quantityChange?: number;
  reason?: string;
  referenceNumber?: string;
  notes?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
}
```

**Permissions:** Requires `admin` or `manager` role

---

### 6. DELETE /api/stock-adjustments/:id
Cancel pending stock adjustment.

**Response:**
```typescript
{
  message: "Stock adjustment cancelled",
  id: string
}
```

**Permissions:** Requires `admin` or `manager` role

## Shared Types Package

### Stock Adjustment Types

File: `packages/shared/src/types/stock-adjustment.ts`

**Key Exports:**
```typescript
// Enums
export const StockAdjustmentType = z.enum([
  'manual_increase',
  'manual_decrease',
  'correction',
  'reconciliation',
  'damaged',
  'expired',
  'lost',
  'returned',
  'transfer_correction',
]);

// Schemas untuk validation
export const CreateStockAdjustmentSchema;
export const InlineStockAdjustmentSchema;
export const UpdateStockAdjustmentSchema;
export const StockAdjustmentFiltersSchema;
export const CreateBatchStockAdjustmentSchema;

// Helper functions
export function getAdjustmentDirection(quantityChange: number);
export function getAdjustmentTypeLabel(type: StockAdjustmentType): string;
```

## Frontend Implementation (TODO)

### Komponen yang Perlu Dibuat

#### 1. InlineStockAdjustment Component
Komponen untuk inline edit stock pada movement history table.

**Features:**
- Input field untuk quantity baru
- Dropdown untuk pilih reason
- Auto-submit on blur atau Enter
- Loading state
- Error handling
- Confirmation dialog

**Props:**
```typescript
interface InlineStockAdjustmentProps {
  productId: string;
  currentQuantity: number;
  locationId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

#### 2. StockAdjustmentModal Component
Modal untuk create stock adjustment lebih detail.

**Features:**
- Form dengan semua fields (adjustment type, quantity change, reason, etc.)
- Validation
- Preview stock before/after
- Submit & cancel buttons

#### 3. StockAdjustmentHistory Component
List view untuk melihat history adjustments dengan filter.

**Features:**
- Table view dengan columns: Date, Product, Location, Type, Quantity Change, Reason, Adjusted By
- Filter by date range, adjustment type, status
- Pagination
- Export to CSV

### API Client Functions

File: `packages/frontend/src/utils/api.ts`

```typescript
export const stockAdjustmentApi = {
  create: (data: CreateStockAdjustmentSchema) => 
    api.post('/stock-adjustments', data),
  
  createInline: (data: InlineStockAdjustmentSchema) => 
    api.post('/stock-adjustments/inline', data),
  
  list: (filters: StockAdjustmentFiltersSchema) => 
    api.get('/stock-adjustments', { params: filters }),
  
  getById: (id: string) => 
    api.get(`/stock-adjustments/${id}`),
  
  update: (id: string, data: UpdateStockAdjustmentSchema) => 
    api.patch(`/stock-adjustments/${id}`, data),
  
  cancel: (id: string) => 
    api.delete(`/stock-adjustments/${id}`),
};
```

### Integration Points

1. **Movement History Table**
   - Add "Adjust Stock" action button untuk setiap product
   - On click, tampilkan inline edit atau modal
   - After success, refresh table

2. **Inventory Page**
   - Add "Stock Adjustment" button di toolbar
   - Bulk adjustment option (multi-select products)

3. **Product Detail Page**
   - Add "Adjust Stock" button
   - Show adjustment history in movement logs tab

## Security & Permissions

### Role-Based Access
- **Admin & Manager**: Full access (create, update, cancel adjustments)
- **Operator**: Read-only (can view adjustment history)
- **Viewer**: Read-only

### Audit Trail
Semua adjustments tercatat di `movement_logs` table dengan:
- Who: `movedBy` (creator), `approvedBy` (approver)
- When: `createdAt`, `approvedAt`
- What: `quantityMoved`, `fromStockLevel`, `toStockLevel`
- Why: `adjustmentReason`, `adjustmentType`, `notes`
- Reference: `referenceNumber`

## Testing Checklist

### Backend
- [ ] POST /api/stock-adjustments - create adjustment
- [ ] POST /api/stock-adjustments/inline - inline adjustment
- [ ] GET /api/stock-adjustments - list with filters
- [ ] GET /api/stock-adjustments/:id - get single
- [ ] PATCH /api/stock-adjustments/:id - update pending
- [ ] DELETE /api/stock-adjustments/:id - cancel pending
- [ ] Permissions testing (admin, manager, operator, viewer)
- [ ] Negative quantity validation
- [ ] Non-stored product validation
- [ ] Cache invalidation after adjustment

### Frontend
- [ ] Inline stock adjustment component
- [ ] Stock adjustment modal
- [ ] Integration with movement history
- [ ] Integration with inventory page
- [ ] Error handling & user feedback
- [ ] Loading states
- [ ] Permission checks on UI

## Migration Guide

### For Existing Data
All existing movement logs will have `movement_type = 'transfer'` by default. No data migration needed.

### Database Backup
Sebelum apply migration, backup database:
```bash
pg_dump -U username -d invenflow > backup_before_stock_adjustment.sql
```

### Apply Migration
```bash
cd packages/backend
psql postgresql://username@localhost:5432/invenflow -f src/db/migrations/0038_charming_hex.sql
```

### Rollback (jika diperlukan)
```sql
ALTER TABLE movement_logs DROP COLUMN movement_type;
ALTER TABLE movement_logs DROP COLUMN adjustment_type;
ALTER TABLE movement_logs DROP COLUMN adjustment_reason;
ALTER TABLE movement_logs DROP COLUMN reference_number;
ALTER TABLE movement_logs DROP COLUMN approved_by;
ALTER TABLE movement_logs DROP COLUMN approved_at;
DROP INDEX movement_logs_movement_type_idx;
```

## Usage Examples

### Example 1: Inline Stock Adjustment
```typescript
// User clicks on stock quantity in movement history table
// Opens inline editor, inputs new quantity: 45 (from 50)

const response = await fetch('/api/stock-adjustments/inline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: 'product-uuid',
    newQuantity: 45,
    reason: 'Found 5 damaged items during inspection',
    notes: 'Items damaged in warehouse section B'
  })
});

// Response:
// {
//   stockBefore: 50,
//   stockAfter: 45,
//   quantityChange: -5,
//   adjustment: { ... },
//   product: { ... }
// }
```

### Example 2: Stock Reconciliation
```typescript
// After physical count, adjust to actual quantity

await fetch('/api/stock-adjustments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: 'product-uuid',
    adjustmentType: 'reconciliation',
    quantityChange: -3, // 3 items less than recorded
    reason: 'Monthly stock opname - Nov 2025',
    referenceNumber: 'SO-2025-11-001',
    notes: 'Physical count: 47, System: 50'
  })
});
```

### Example 3: Damaged Items
```typescript
// Record damaged items

await fetch('/api/stock-adjustments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: 'product-uuid',
    adjustmentType: 'damaged',
    quantityChange: -10,
    reason: 'Damaged during transport',
    referenceNumber: 'DMG-2025-11-20-001',
    notes: 'Boxes fell from forklift'
  })
});
```

## Benefits

1. **Transparency**: Semua perubahan stok tercatat dengan lengkap
2. **Audit Trail**: Clear history siapa, kapan, dan kenapa adjust stok
3. **Flexibility**: Support berbagai tipe adjustment (rusak, hilang, koreksi, etc.)
4. **Easy to Use**: Inline edit untuk quick adjustment
5. **Permission Control**: Only admin/manager can adjust
6. **Reporting**: Filter dan export adjustment history

## Next Steps

1. ✅ Create stock adjustment types (shared package)
2. ✅ Update movement logs schema
3. ✅ Create backend API endpoints
4. 🔄 Create frontend components (TODO)
5. ⏳ Add to movement history table
6. ⏳ Add to inventory page
7. ⏳ Testing & validation
8. ⏳ Documentation untuk end users

---

## Technical Notes

### Why Extend Movement Logs?
Kita extend `movement_logs` table instead of creating separate `stock_adjustments` table karena:
1. Stock adjustments adalah "special type" of movement
2. Reuse existing infrastructure (invalidation, WebSocket, etc.)
3. Unified history untuk semua perubahan stok
4. Simplify query dan reporting

### Performance Considerations
- Index on `movement_type` untuk fast filtering
- Pagination untuk large datasets
- Cache invalidation after adjustments
- Batch operations untuk mass adjustments (future)

### Security Considerations
- Role-based access control (RBAC)
- Audit logging
- Input validation dengan Zod
- Transaction untuk data consistency
- Prevent negative stock levels


