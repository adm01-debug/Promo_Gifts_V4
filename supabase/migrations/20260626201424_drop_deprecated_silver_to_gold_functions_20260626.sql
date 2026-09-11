-- ============================================================
-- MELHORIA 1: Remover funções legadas __deprecated_20260606
-- Substituídas por fn_promote_padronizacao / fn_site_promote_to_gold.
-- Provado: 0 refs em funções, crons, views, triggers e código vivo.
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_silver_to_gold__deprecated_20260606(uuid);
DROP FUNCTION IF EXISTS public.fn_silver_batch_to_gold__deprecated_20260606(text,integer);

NOTIFY pgrst, 'reload schema';;
