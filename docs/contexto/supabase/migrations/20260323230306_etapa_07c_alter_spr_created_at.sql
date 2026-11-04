ALTER TABLE public.supplier_products_raw ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
