-- Script untuk menganalisis produk direct import tanpa location
-- yang akan dihapus

-- Hitung total produk direct import tanpa location
SELECT
    COUNT(*) as total_products_to_delete,
    COUNT(DISTINCT import_batch_id) as total_batches_affected
FROM products
WHERE import_source = 'direct-import'
AND location_id IS NULL;

-- Lihat detail produk yang akan dihapus
SELECT
    p.id,
    p.sku,
    p.product_details,
    p.category,
    p.supplier,
    p.stock_level,
    p.import_batch_id,
    ib.label as batch_label,
    ib.created_at as batch_created_at
FROM products p
LEFT JOIN import_batches ib ON p.import_batch_id = ib.id
WHERE p.import_source = 'direct-import'
AND p.location_id IS NULL
ORDER BY ib.created_at DESC, p.created_at DESC;

-- Lihat summary per batch import
SELECT
    ib.id as batch_id,
    ib.label as batch_label,
    ib.created_at as batch_created_at,
    COUNT(p.id) as products_count,
    SUM(p.stock_level) as total_stock_level
FROM products p
JOIN import_batches ib ON p.import_batch_id = ib.id
WHERE p.import_source = 'direct-import'
AND p.location_id IS NULL
GROUP BY ib.id, ib.label, ib.created_at
ORDER BY ib.created_at DESC;