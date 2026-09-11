
-- MELHORIA 1 · PASSO 3/5 (revisado)
-- Drop views afetadas + função dependente, em ordem correta

-- 1. A função depende da view, CASCADE a elimina também
DROP VIEW IF EXISTS public.v_products_public CASCADE;

-- 2. Outras views que referenciam colunas mortas
DROP VIEW IF EXISTS public.vw_product_all_packaging_options;
DROP VIEW IF EXISTS public.vw_packagings_catalog;
DROP VIEW IF EXISTS public.v_product_active_badge;
;
