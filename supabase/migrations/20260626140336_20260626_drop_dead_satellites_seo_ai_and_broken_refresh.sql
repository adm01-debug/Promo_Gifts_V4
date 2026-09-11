-- MELHORIA 1+2: remoção de cascas mortas (product_seo, product_ai) + função quebrada.
-- Evidência 2026-06-26: frontend 100% desacoplado (0 refs em src/ e edge functions);
-- v_products_public expõe key_benefits/use_cases/packaging_* como CONSTANTES NULL (não lê satélites);
-- fn_refresh_product_satellites é não-funcional (referencia products.key_benefits inexistente) + 0 callers.
-- PRESERVADOS: product_packaging (fn_promote_packaging_to_gold) e product_physical (fn_promote_padronizacao,
-- fn_site_promote_to_gold, fn_asia_site_promote_to_gold) por estarem acoplados ao pipeline medallion.
-- REVERSÍVEL: dados arquivados em _archive_*_20260626 (RLS deny-by-default).
-- fix_version: satellites-cleanup-v1

-- 1) Backup reversível (RLS deny-by-default; sem grants a anon/authenticated)
CREATE TABLE IF NOT EXISTS public._archive_product_seo_20260626 AS SELECT * FROM public.product_seo;
CREATE TABLE IF NOT EXISTS public._archive_product_ai_20260626  AS SELECT * FROM public.product_ai;
ALTER TABLE public._archive_product_seo_20260626 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._archive_product_ai_20260626  ENABLE ROW LEVEL SECURITY;

-- 2) Remover função morta/quebrada (RESTRICT implícito; aborta se algo inesperado depender)
DROP FUNCTION IF EXISTS public.fn_refresh_product_satellites(uuid);

-- 3) Remover cascas puras (0 leitores, 0 FKs-de-entrada, 0 views, 0 triggers, 0 publication)
DROP TABLE IF EXISTS public.product_seo;
DROP TABLE IF EXISTS public.product_ai;

-- 4) Recarregar cache PostgREST
NOTIFY pgrst, 'reload schema';;
