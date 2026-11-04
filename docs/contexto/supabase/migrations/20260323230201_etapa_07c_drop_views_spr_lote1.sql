-- Drop 9 views dependentes de supplier_products_raw (lote 1)
DROP VIEW IF EXISTS public.vw_asia_products_by_category;
DROP VIEW IF EXISTS public.vw_asia_products_by_color;
DROP VIEW IF EXISTS public.vw_asia_products_by_tag;
DROP VIEW IF EXISTS public.vw_asia_products_errors;
DROP VIEW IF EXISTS public.vw_asia_products_low_stock;
DROP VIEW IF EXISTS public.vw_asia_products_pending;
DROP VIEW IF EXISTS public.vw_asia_products_promo;
DROP VIEW IF EXISTS public.vw_asia_products_stats;
DROP VIEW IF EXISTS public.vw_products_ai_status;
