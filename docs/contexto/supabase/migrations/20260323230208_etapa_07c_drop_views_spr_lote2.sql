-- Drop 9 views dependentes de supplier_products_raw (lote 2)
DROP VIEW IF EXISTS public.vw_somarcas_materials;
DROP VIEW IF EXISTS public.vw_somarcas_pending;
DROP VIEW IF EXISTS public.vw_somarcas_stats;
DROP VIEW IF EXISTS public.vw_somarcas_sync_status;
DROP VIEW IF EXISTS public.vw_supplier_products_raw_errors;
DROP VIEW IF EXISTS public.vw_supplier_products_raw_status;
DROP VIEW IF EXISTS public.vw_xbz_products_by_category;
DROP VIEW IF EXISTS public.vw_xbz_products_by_color;
DROP VIEW IF EXISTS public.vw_xbz_products_stats;
