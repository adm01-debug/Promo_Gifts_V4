-- ETAPA 7C: DROP todas as 18 views dependentes de supplier_products_raw
DROP VIEW IF EXISTS public.vw_asia_products_by_category CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_by_color CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_by_tag CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_errors CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_low_stock CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_pending CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_promo CASCADE;
DROP VIEW IF EXISTS public.vw_asia_products_stats CASCADE;
DROP VIEW IF EXISTS public.vw_products_ai_status CASCADE;
DROP VIEW IF EXISTS public.vw_somarcas_materials CASCADE;
DROP VIEW IF EXISTS public.vw_somarcas_pending CASCADE;
DROP VIEW IF EXISTS public.vw_somarcas_stats CASCADE;
DROP VIEW IF EXISTS public.vw_somarcas_sync_status CASCADE;
DROP VIEW IF EXISTS public.vw_supplier_products_raw_errors CASCADE;
DROP VIEW IF EXISTS public.vw_supplier_products_raw_status CASCADE;
DROP VIEW IF EXISTS public.vw_xbz_products_by_category CASCADE;
DROP VIEW IF EXISTS public.vw_xbz_products_by_color CASCADE;
DROP VIEW IF EXISTS public.vw_xbz_products_stats CASCADE;

-- ALTER timestamps
ALTER TABLE public.supplier_products_raw ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN imported_at TYPE timestamptz USING imported_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN processed_at TYPE timestamptz USING processed_at AT TIME ZONE 'UTC';
ALTER TABLE public.supplier_products_raw ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
