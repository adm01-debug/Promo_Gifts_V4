-- Remove redundant duplicate indexes flagged by Supabase performance advisor.
-- Each dropped index is byte-identical to a retained sibling (verified via
-- pg_get_indexdef), is non-unique, and backs no constraint. Reduces write
-- amplification and storage with zero read-path impact.
DROP INDEX IF EXISTS public.idx_integration_creds_provider;
DROP INDEX IF EXISTS public.idx_product_commemorative_dates_category_id_fk;
DROP INDEX IF EXISTS public.idx_product_commemorative_dates_date_id;
DROP INDEX IF EXISTS public.idx_quote_items_quote;
DROP INDEX IF EXISTS public.idx_variant_supplier_sources_supplier_id_fk;
