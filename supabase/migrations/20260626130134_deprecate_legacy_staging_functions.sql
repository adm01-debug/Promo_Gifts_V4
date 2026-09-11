-- Melhoria 4/4 — Aposentadoria das funções legadas do plano antigo (staging->processing).
-- Substituídas integralmente pelo medallion: fn_ingest_supplier_raw/fn_ingest_bronze_batch
-- (Bronze) -> fn_standardize_raw/fn_standardize_supplier (Silver) -> fn_promote_padronizacao
-- (Gold). Comprovado 0 referências no DB (funções/triggers/cron/views).
-- Estratégia: depreciação REVERSÍVEL e NÃO-disruptiva — remove exposição PostgREST
-- (REVOKE authenticated/PUBLIC), mantém service_role/postgres (n8n intacto), documenta.
-- DROP definitivo recomendado após janela com track_functions=pl confirmando 0 chamadas.
-- fix_version=2026-06-26_deprecate_legacy_staging
-- ANTI-REGRESSÃO (Lovable bot): NÃO recriar grant de EXECUTE p/ authenticated nestas.

REVOKE EXECUTE ON FUNCTION public.fn_stage_variant(uuid,uuid,text,text,jsonb) FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_stage_product(uuid,uuid,text,jsonb)        FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_process_staged_product(uuid)               FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_process_all_staged_products(uuid,integer)  FROM authenticated, PUBLIC;

COMMENT ON FUNCTION public.fn_stage_variant(uuid,uuid,text,text,jsonb) IS
  'DEPRECATED 2026-06-26 — LEGADO MORTO: aponta p/ supplier_variants_raw (tabela inexistente); chamada falharia. '
  'Substituído pelo medallion (variantes via fn_standardize_variant/fn_promote_variants_of_parent). NÃO USAR. '
  'fix_version=2026-06-26_deprecate_legacy_staging. ANTI-REGRESSÃO Lovable bot: não recriar nem reconceder a authenticated.';

COMMENT ON FUNCTION public.fn_stage_product(uuid,uuid,text,jsonb) IS
  'DEPRECATED 2026-06-26 — legado do plano staging->processing. Substituído por fn_ingest_supplier_raw/fn_ingest_bronze_batch (Bronze). '
  'Sem chamadas no DB. NÃO USAR. fix_version=2026-06-26_deprecate_legacy_staging.';

COMMENT ON FUNCTION public.fn_process_staged_product(uuid) IS
  'DEPRECATED 2026-06-26 — legado. Substituído por fn_standardize_raw -> fn_promote_padronizacao. Sem chamadas no DB. NÃO USAR.';

COMMENT ON FUNCTION public.fn_process_all_staged_products(uuid,integer) IS
  'DEPRECATED 2026-06-26 — legado. Substituído por fn_standardize_supplier (batch) -> fn_promote_supplier. Sem chamadas no DB. NÃO USAR.';;
