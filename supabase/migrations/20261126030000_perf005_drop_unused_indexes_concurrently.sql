-- Rollback: supabase/rollbacks/20261126030000_rollback.sql
--
-- PERF-005 — drop dos 48 indices com idx_scan=0.
--
-- Historico das reemissoes deste mesmo lote (o arquivo nunca aplicado e
-- substituido, nao editado — o gate E75 recusa editar migration pendente,
-- `scripts/check-migrations-sync-log-gate.mjs:199-203`):
--   1. 20261126012000 — barrada no preflight do E15 (run 45737271027):
--      faltava a linha "-- approved-by:" exigida pelo opt-out de E63.
--   2. 20261126020000 — barrada no preflight (run 45739911853): a linha existia,
--      mas o valor "@adm01-debug" nao conta para `parseOptOut`
--      (`scripts/preflight-migration-apply.mjs:121-133`): o nome tem de comecar
--      com letra/digito (`^[\p{L}\p{N}]`), e "@" reprova. Reproducao local:
--      parseOptOut(...) -> {"transactionNone":true,"approvedBy":null}.
--   3. 20261126030000 — este arquivo: mesmo SQL dos anteriores, com
--      "-- approved-by: adm01-debug" (mesmo formato do precedente aceito
--      `20261018170000_e069_drop_redundant_prefix_index.sql`).
--
-- Por que reemitir em vez de editar 20261101205400: o gate E75 recusa migration
-- MODIFICADA sem recibo valido — a 20261101205400 nunca teve linha no
-- MIGRATIONS_SYNC_LOG.md (mesmo caminho que a 20261119081500 ja usou para
-- reemitir a 20261117172500). O arquivo historico fica intocado.
--
-- Por que CONCURRENTLY: o apply do E15 (run 45730238702) falhou com
-- "canceling statement due to lock timeout" em
-- DROP INDEX public.idx_products_padronizacao_id. DROP INDEX sem CONCURRENTLY
-- pede ACCESS EXCLUSIVE na tabela e o workflow usa lock_timeout=1s; em
-- `products`, com leitura 24/7, isso nunca passa. Padrao identico ao de
-- 20261018170000_e069_drop_redundant_prefix_index.sql.
--
-- transaction: none
-- approved-by: adm01-debug
--
-- lock_timeout: nao sobrepoe o default do workflow (1s). Cada DROP e atomico por
-- si (CONCURRENTLY nao roda em bloco de transacao) e todos usam IF EXISTS, entao
-- se um alvo perder a corrida do lock o re-run continua de onde parou — preferimos
-- falhar rapido a enfileirar leitores da loja atras de um AccessExclusiveLock.
--
-- Lista identica a de 20261101205400: os 64 indices originais menos os 16 que
-- passaram a ter idx_scan > 0 (evidencia: docs/contexto/supabase/stats.md,
-- secao 'Indices nunca usados', snapshot vivo de 2026-11-26). Apos esta
-- migration aplicada, a 20261101205400 pode ser aplicada em seguida como
-- no-op (todos os alvos ja nao existem) so para receber linha no ledger.
--

DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_daily_summary_supplier_branch_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_daily_summary_supplier_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_spr_import_batch_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_spr_variant_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_spr_images_pending;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_vss_org_supplier;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_vss_supplier_sku_xbz;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_variant_supplier_sources_supplier_branch_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_produto_ramo_atividade_filho;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_padvar_pad;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_padvar_sem_colorid;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_produtos_padronizacao_sub_brand_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_produtos_site_padronizacao_raw_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kcer_component;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kcer_kit;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kcer_source;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_component_enrichment_raw_promoted_padronizacao_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_component_enrichment_raw_promoted_component_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_component_padronizacao_raw_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kcpad_kit;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_components_name;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_kit_components_secondary_material_type_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_kit_components_component_product_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_kit_components_padronizacao_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_pkc_color_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ai_queue_product_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ai_queue_pending;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_backfill_queue_dispatch;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_prod_comm_product;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_commemorative_dates_category_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_properties_property_definition_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_supplier_import_batches_supplier_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_sre_variant_date;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_sre_supplier_date;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_padronizacao_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_ncm_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_sub_brand_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_xbz_reliability;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_fiscal_ncm_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_fiscal_ncm_code;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_xbz_upload_mapping_status;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_xbz_staging_status;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_frontend_telemetry_user_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_supply_sync_status;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_faixa_v11_dim;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tpgof_tabela_qty;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_pat_tabela;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_pat_location_code;
