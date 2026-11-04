-- ETAPA 7A: Converter timestamp WITHOUT time zone -> WITH time zone (lote 1: 13 colunas)
ALTER TABLE public.packaging_types ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.packaging_types ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.packagings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.packagings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.product_packagings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.product_packagings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.product_variants ALTER COLUMN last_sync_at TYPE timestamptz USING last_sync_at AT TIME ZONE 'UTC';
ALTER TABLE public.products ALTER COLUMN last_sync_at TYPE timestamptz USING last_sync_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_field_mappings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_field_mappings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_field_priority ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_import_batches ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_import_batches ALTER COLUMN finished_at TYPE timestamptz USING finished_at AT TIME ZONE 'UTC';
