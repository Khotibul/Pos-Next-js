-- Enable pg_trgm extension for fast LIKE/ILIKE '%keyword%' search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Product search: name, sku, barcode
CREATE INDEX IF NOT EXISTS idx_product_name_trgm ON "Product" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_sku_trgm ON "Product" USING gin ("sku" gin_trgm_ops);

-- Supplier & Customer search
CREATE INDEX IF NOT EXISTS idx_supplier_name_trgm ON "Supplier" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customer_name_trgm ON "Customer" USING gin ("name" gin_trgm_ops);
