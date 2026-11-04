-- ETAPA 7B: Lote 2 SEM supplier_products_raw (depende de view)
ALTER TABLE public.supplier_import_batches ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_packagings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_packagings ALTER COLUMN last_price_update TYPE timestamptz USING last_price_update AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_packagings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_unit_conversions ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_value_mappings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_value_mappings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.system_documentation ALTER COLUMN atualizado_em TYPE timestamptz USING atualizado_em AT TIME ZONE 'UTC';
ALTER TABLE public.system_documentation ALTER COLUMN criado_em TYPE timestamptz USING criado_em AT TIME ZONE 'UTC';
