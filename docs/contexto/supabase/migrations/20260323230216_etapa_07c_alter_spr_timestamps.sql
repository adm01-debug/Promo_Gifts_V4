-- Converter 4 colunas de supplier_products_raw para timestamptz
ALTER TABLE public.supplier_products_raw ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN imported_at TYPE timestamptz USING imported_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN processed_at TYPE timestamptz USING processed_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
