# 08 — Camada de Dados / Schema (estado DECLARADO no repositório)

**Data da auditoria:** 2026-08-16
**Escopo:** `supabase/migrations/`, `supabase/migrations-snapshot/`, `supabase/cron/`, `supabase/config.toml`, `medallion/`, `schemas/`, `api/`
**Método:** somente leitura de arquivos `.sql`/`.toml`/`.ts` do repositório. **Nenhum comando foi executado no banco.** Nenhum `.md` foi usado como fonte de verdade (inclusive `docs/SCHEMA_REFERENCE.md`, explicitamente descartado).
**Limite fundamental:** este documento descreve o que o **repositório declara**, não o que existe em produção. Divergências entre os dois são apontadas na seção G.

---

## A) Sumário quantitativo dos objetos DECLARADOS

Todos os números abaixo vêm de `grep` agregado sobre `supabase/migrations/` (1.672 arquivos `.sql`).

| Objeto | Ocorrências | Distintos | Comando |
|---|---:|---:|---|
| Arquivos de migration | 1672 | — | `ls supabase/migrations/*.sql \| wc -l` |
| `CREATE TABLE` | 461 | **267** | `grep -rhoiE "create +table +(if +not +exists +)?[a-z0-9_.\"]+" supabase/migrations/ \| sed -E 's/.*[[:space:]]//' \| tr -d '"' \| sort -u` |
| `CREATE [OR REPLACE] FUNCTION` | 1320 | **986** | `grep -rhoiE "create +(or +replace +)?function +[a-z0-9_.\"]+" supabase/migrations/ \| sed -E 's/.*[[:space:]]//' \| sort -u` |
| `CREATE [OR REPLACE] VIEW` | 99 | **57** | `grep -rhoiE "create +(or +replace +)?view +[a-z0-9_.\"]+" ... \| sort -u` |
| `CREATE MATERIALIZED VIEW` | 7 | **6** | `grep -rhoiE "create +materialized +view +[a-z0-9_.\"]+" ... \| sort -u` |
| `CREATE TRIGGER` | 268 | **221** | `grep -rhoiE "create +(or +replace +)?trigger +[a-z0-9_.\"]+" ... \| sort -u` |
| `CREATE POLICY` | 1787 | **1353** (nomes) | `grep -rhoiE "create +policy" supabase/migrations/ \| wc -l` |
| `DROP POLICY` | 865 | — | `grep -rhoiE "drop +policy" supabase/migrations/ \| wc -l` |
| `CREATE INDEX` | 1249 | **909** | `grep -rhoiE "create +(unique +)?index +(concurrently +)?(if +not +exists +)?[a-z0-9_.\"]+" ... \| sort -u` |
| `DROP INDEX` | 655 | — | `grep -rhoiE "drop +index" ... \| wc -l` |
| `CREATE TYPE` (enums) | — | **15** | `grep -rhoiE "create +type +[a-z0-9_.\"]+" ... \| sort -u` |
| `CREATE EXTENSION` | — | **7** | `grep -rhoiE "create +extension" ... \| sort -u` |
| `CREATE SCHEMA` | — | **5** | `grep -rhoiE "create +schema" ... \| sort -u` |
| `ENABLE ROW LEVEL SECURITY` | 525 | **273 tabelas** | `grep -rhoiE "alter +table .* enable +row +level +security" ... \| sort -u` |
| `SECURITY DEFINER` | 823 (em 383 arquivos) | — | `grep -rhoi "security definer" supabase/migrations/ \| wc -l` |
| `SECURITY INVOKER` | 282 | — | `grep -rhoi "security invoker" supabase/migrations/ \| wc -l` |
| `cron.schedule(...)` | 67 (em 48 arquivos) | **50 jobs** | `grep -rn "cron.schedule" supabase/migrations/ \| wc -l` |
| `cron.unschedule(...)` | 53 | 24 nomes | `grep -rn "cron.unschedule" supabase/migrations/ \| wc -l` |
| `COMMENT ON` (início de linha) | 433 | — | `grep -rhoiE "^comment on" ... \| wc -l` |

**Nota de ruído:** o regex de `CREATE TABLE` captura ~12 falsos positivos (`if`, `and`, `for`, `to`, `no`, `public.`) originados de statements multi-linha e comentários. Os 267 distintos já estão desses limpos. Contagem bruta sem limpeza: 286.

### Distribuição dos 267 relações por schema

| Schema | Tabelas declaradas |
|---|---:|
| `public` | 258 |
| `cf_recon` | 5 (`cf_image`, `crawl_run`, `action_log`, `metric_snapshot`, `remediation`) |
| `backup` | 3 (todas `*_20260616`, já dropadas — ver §E) |
| `archive` | 1 (`_cleanup_manifest`) |

### Schemas declarados
`archive`, `backup`, `cf_recon`, `extensions`, `internal`
Evidência: `supabase/migrations/20260616181001_cf_recon_foundation.sql:8` (`create schema if not exists cf_recon`), `supabase/migrations/20260512201600_t16_move_backup_tables_to_schema_backup.sql:18` (`backup`), `supabase/migrations/20260717000070_move_mv_product_leaf_category_to_internal.sql:42` (`internal`), `supabase/migrations/20260416183821_54ccc054-be01-4793-ab8d-d415f2108fe9.sql:2` (`extensions`).
`archive` e `backup` foram **dropados** em `supabase/migrations/20260716000008_drop_archive_backup_schemas.sql` (`DROP SCHEMA IF EXISTS backup CASCADE` no fim do arquivo, com validação `RAISE EXCEPTION` se sobreviverem).

### Extensões declaradas (7)
`pg_cron`, `pg_net`, `pg_trgm`, `pgcrypto`, `pg_stat_statements`, `unaccent`, `moddatetime`
Primeira: `supabase/migrations/20251214185543_9d672d9b-00a3-4d8b-89c8-4dc5d4e3512d.sql:2-3` (`pg_cron`, `pg_net`).
Migração para schema dedicado: `supabase/migrations/20260716000044_move_extensions_to_extensions_schema.sql:55`.

### Enums / tipos declarados (15)
`public.app_role`, `public.org_role`, `public.quote_status`, `public.order_status`, `public.payment_status`, `public.fulfillment_status`, `public.conversation_event_type`, `public.step_up_action`, `public.role_migration_status`, `public.role_migration_item_status`, `public.categoria_cor_enum`, `public.familia_cor_enum`, `public.tipo_cor_enum`, `produtos_padronizacao_status`, `supplier_raw_status`
(+ `silver_norm_status` declarado fora de `supabase/migrations/`, em `medallion/migrations/001_create_silver_layer.sql:17`)

### Materialized views declaradas (6)
| MV | Evidência |
|---|---|
| `public.mv_product_leaf_category` | `supabase/migrations/20260618200000_drift_catalog_analytics_baseline.sql:169` (cron de refresh) |
| `internal.mv_product_leaf_category` | `supabase/migrations/20260717000070_move_mv_product_leaf_category_to_internal.sql:42` |
| `analytics.mv_product_intelligence` | `supabase/migrations/20260618200000_drift_catalog_analytics_baseline.sql:176` |
| `public.mv_product_images_audit` | `supabase/migrations/20260616003120_product_images_audit_matview_e1.sql:121` |
| `public.mv_supplier_reliability` | `supabase/migrations/20260622111500_supplier_reliability_pipeline_v1.sql:427` |
| `public.product_popularity_30d` | inventário `create materialized view` |

**Atenção:** o schema `analytics` **nunca é criado** por `CREATE SCHEMA` nas migrations, embora `analytics.mv_product_intelligence` seja referenciada. Idem `mv_stock_velocity` / `mv_stock_rupture_alert`, usadas pelo frontend e nunca declaradas (§D/§G).

---

## B) Ritmo do projeto — distribuição das migrations

Comando: `ls supabase/migrations/*.sql | sed 's#.*/##' | grep -oE '^[0-9]{6}' | sort | uniq -c`

| Ano-mês | Migrations |
|---|---:|
| 2024-12 | 2 |
| 2025-01 | 24 |
| 2025-12 | 54 |
| 2026-01 | 15 |
| 2026-02 | 22 |
| 2026-03 | 165 |
| 2026-04 | 246 |
| 2026-05 | 421 |
| 2026-06 | **580** |
| 2026-07 | 105 |
| **sem prefixo de data** | **38** |

- **Primeira:** `supabase/migrations/20241231000000_saved_filters.sql`
- **Última:** `supabase/migrations/20260718140000_close_anon_write_default_privilege.sql`
- Hiato de 11 meses entre 2025-01 e 2025-12 (nenhuma migration).
- Pico absoluto em 2026-06 (580 migrations = 35% do total em um único mês). Queda para 105 em 2026-07 e **zero em 2026-08** — o repositório está parado há ~1 mês no que diz respeito a schema.

### 38 migrations sem prefixo de timestamp — 🟨 risco de ordenação
Comando: `ls supabase/migrations/ | grep -vE '^[0-9]{6}'`

Cinco delas usam prefixo numérico curto (`001_notification_system.sql` … `005_push_subscriptions.sql`) e 33 usam nome descritivo terminado em `_20260623` (ex.: `products_1_sku_promo_backfill_and_autosync_trigger_20260623.sql`, `gravacao_fix4_drop_dead_calculate_personalization_price_20260623.sql`, `verify_rls_policies.sql`, `fix_rls_head_requests.sql`).

Como o Supabase CLI ordena alfabeticamente, `001_*` roda **antes de tudo** e `verify_*`/`vpp_*`/`vss_*` rodam **depois de tudo**, independentemente da data real. As tabelas declaradas em `001_notification_system.sql:7`, `002_notification_preferences.sql:5`, `003_notification_templates.sql:5,21,43` e `005_push_subscriptions.sql:5` (`notifications`, `notification_preferences`, `notification_templates`, `webhook_configs`, `webhook_logs`, `push_subscriptions`) são **redeclaradas** depois por migrations com timestamp (ex.: `20251227180003_push_subscriptions.sql:4`, `20251220140213_*.sql:2`). Classificação: **⬛ MORTO_OU_ABANDONADO** para os arquivos `001`–`005`, que hoje só produzem `IF NOT EXISTS` no-ops.

---

## C) Domínios de dados

Legenda de consumo: **src** = referenciada por `.from('<tabela>')` em `src/`; **edge** = referenciada em `supabase/functions/`.
Comandos-base:
`grep -rhoE "\.from\(\s*['\"]\`[a-z0-9_]+['\"]\`" src/ | sort -u` → 120 relações
`grep -rhoE "\.rpc\(\s*['\"]\`[a-z0-9_]+['\"]\`" src/ | sort -u` → 43 RPCs
(idem para `supabase/functions/` → 89 relações / 46 RPCs)

| Domínio | Tabelas decl. | RLS decl. | Consumido em `src/` | Cron associado | Classificação | Evidência |
|---|---:|---:|---:|---|---|---|
| **Medallion / ingestão de fornecedores** | 21 | 10 | 1 (`product_sync_logs`) | `process-pending-products`, `spr-requeue-failed-hourly`, `purge-spr-history-daily`, `medallion-coverage-daily`, `pipeline-classify-categories`, `pipeline-print-profiles`, `reconcile-stock-gold-daily`, `expire-supplier-promises`, `refresh-mv-supplier-reliability` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/migrations/20260603221821_silver_02_produtos_padronizacao.sql:12`; `supabase/migrations/20260610122909_p1_historico_01_particionamento_mensal.sql:13` |
| **Produtos / catálogo (Gold)** | 40 | 39 | 14 | `refresh-mv-product-leaf-category`, `refresh-category-ancestors`, `refresh-mv-product-images-audit`, `hash-product-images`, `generate-blurhashes`, `backfill-image-dimensions`, `vacuum-analyze-weekly` | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20250102000000_gifts_production.sql:32` (`public.products`); `supabase/migrations/20260517142928_6b941536-8848-4704-81f9-1e1024cb7ecd.sql:1` |
| **Orçamentos / cotações / pedidos** | 29 | 28 | 11 | `daily-expire-quotes` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/migrations/20260623000000_fix_audit_novo_orcamento_batch2.sql:72`; `supabase/migrations/20250103080000_complete_schema.sql:396` |
| **Coleções / favoritos / kits / comparações** | 19 | 19 | 13 | `purge-favorite-trash` | ✅ IMPLEMENTADO_TOTAL | `supabase/cron/cron-config.sql:72`; `supabase/migrations/20260418175315_6317f072-62ee-49c8-af36-6c992764a582.sql:5` |
| **Mockups / Magic Up / IA** | 23 | 23 | 14 | `ai-queue-stuck-cleanup`, `cleanup-stale-ai-pending-logs` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/migrations/20260622131000_ai_queue_cleanup_cron.sql:11`; `supabase/migrations/20260622_ai_usage_logs_hardening_observability.sql:65` |
| **Notificações / webhooks / integrações** | 28 | 27 | 13 | `process-notification-queue`, `send-daily-digest`, `cleanup-old-notifications`, `process-webhook-outbox`, `webhook-retry-failed`, `webhook-logs-cleanup-daily`, `cleanup-product-webhook-nonces-hourly`, `check-dead-letters-daily`, `connections-auto-test` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/cron/cron-config.sql:12,31,50`; `supabase/migrations/20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql:144,159` |
| **Segurança / auth / RBAC / hardening** | 50 | 49 | 25 | `auto-block-extreme-offenders`, `auto-revoke-orphan-mcp-full-keys`, `snapshot-hardening-daily`, `hardening-regression-check-daily`, `expire-stale-password-reset-requests`, `cleanup-expired-token-revocations`, `kill_switch_hits_purge_weekly` | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql:211,217`; `supabase/migrations/20260524210002_harden_password_reset_requests_rls.sql:120` |
| **Auditoria / logs / observabilidade / config** | 33 | 33 | 12 | `purge-audit-logs-daily`, `log-retention-daily`, `cleanup-log-tables-weekly`, `schema-drift-check`, `smoke_tests_monthly`, `smoke_tests_runs_purge`, `cron_job_run_details_purge_weekly`, `pgrst-schema-reload` | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20260602_002_fix_cron_jobs_never_ran.sql:33,40`; `supabase/migrations/20260522151617_fase_4_gate_ci_pg_cron_schedule.sql:2` |
| **Gamificação / recompensas** | 11 | 11 | 1 (`seller_discount_limits`) | — | ⬛ MORTO_OU_ABANDONADO | tabelas em `supabase/migrations/20250103080000_complete_schema.sql`; existe migration `20250103120000_schema_no_gamification.sql` (schema alternativo *sem* gamificação) e `DROP TABLE public.achievements` no inventário de drops |
| **Organizações / multi-tenant** | 2 | 2 | 0 | — | 🟦 SUGERIDO_OU_INICIADO | `organizations`, `organization_members` declaradas mas zero `.from('organizations')` em `src/` e em `supabase/functions/` |
| **Reconciliação Cloudflare (`cf_recon`)** | 5 + 1 (`public.cf_recon_inflight`) | 1 | 0 | `cf-recon-dispatch`, `cf-recon-collect` (`* * * * *`) | 🟨 IMPLEMENTADO_PARCIAL | `supabase/migrations/20260616181001_cf_recon_foundation.sql:8,12,24,36,51`; `supabase/migrations/20260616172002_product_images_cf_reconciliation_cron.sql:7-8` |

### Famílias de funções (986 distintas)
Prefixos dominantes: `fn_` (352), `get_` (111), `classify_` (50), `update_` (25), `cleanup_` (19), `generate_` (17), `check_` (17), `is_` (16), `trg_` (15), `log_` (14), `validate_` (13), `set_` (13).
As 50 funções `classify_*` (`classify_bone`, `classify_camiseta`, `classify_guarda_chuva`, `classify_kit_executivo`, …) formam um classificador de categoria hard-coded por nome de produto — todas listadas como "dead functions" em `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql:15`.

### RLS
- 273 tabelas com `ENABLE ROW LEVEL SECURITY` declarado, sobre 258 tabelas `public` declaradas (o excedente vem de tabelas ativadas mas nunca criadas no repo — ver §G).
- Apenas **1** ocorrência de `FORCE ROW LEVEL SECURITY` em todo o repositório.
- **15 tabelas `public` declaradas SEM `ENABLE RLS` declarado:** `_backup_quotes_orgid_null_20260614`, `color_analysis_staging`, `import_staging_images`, `personalization_technique_mappings`, `scraper_images_staging`, `sm_images_staging`, `supplier_products_raw_bkp_20260604`, `supplier_products_raw_history_p2026_06..p2026_10`, `user_organizations`, `webhook_delivery_locks`, `xbz_gallery_staging`.
  As 5 partições `supplier_products_raw_history_p*` herdam RLS da tabela-mãe particionada (`supabase/migrations/20260610122909_p1_historico_01_particionamento_mensal.sql:29-37`), mas `personalization_technique_mappings` e `user_organizations` são tabelas comuns — **candidatas a gap real**. NAO_VERIFICADO em runtime.

---

## D) ARQUITETURA MEDALLION — Bronze → Silver → Gold

**Veredito: 🟨 IMPLEMENTADO_PARCIAL, e com DUAS gerações de Silver sobrepostas no repositório.**

### Bronze
- Tabela canônica: `public.supplier_products_raw`.
- **A `CREATE TABLE public.supplier_products_raw` NÃO EXISTE em `supabase/migrations/`.** Só existem os derivados: `supplier_products_raw_history` (`supabase/migrations/20260604120414_spr_p3_history_versionamento.sql:4`, reescrita particionada em `supabase/migrations/20260610122909_p1_historico_01_particionamento_mensal.sql:13`) e o backup `supplier_products_raw_bkp_20260604` (`supabase/migrations/20260604120255_spr_p2p3_backup_normalize_docs.sql:4`, dropado em `supabase/migrations/20260604233002_spr_drop_bkp_table.sql:4`).
- Nome referenciado em 127 arquivos de migration — a tabela é tratada como preexistente.

### Silver — geração 1 (LEGADO, aposentada)
Declarada **fora** de `supabase/migrations/`, em `medallion/migrations/001_create_silver_layer.sql`:
- `silver_products` (linha 21), `silver_variants` (linha 70), `silver_print_areas` (linha 105), `silver_images_queue` (linha 135)
- enum `silver_norm_status` (linha 17), trigger `fn_silver_set_updated_at` (linha 157)
- O cabeçalho declara "APLICADO EM PRODUÇÃO: 2025-06" (linha 11) — **esta migration nunca entra no pipeline do Supabase CLI**, pois vive em `medallion/`, não em `supabase/migrations/`.

Aposentadoria: `supabase/migrations/20260605160300_silver_unify_04_deprecate_legacy_silver.sql:1-40` marca com `COMMENT` de DEPRECATED as 4 tabelas e 12 funções (`fn_spot_to_silver`, `fn_xbz_to_silver`, `fn_asia_to_silver`, `fn_sm_to_silver`, os 4 `*_batch_to_silver`, `fn_silver_to_gold`, `fn_silver_batch_to_gold`, `fn_bronze_to_silver_all`, `fn_normalize_silver_all`). Depois movidas para `backup`/`archive` (`supabase/migrations/20260610122207_p0_seguranca_01_fecha_anon_bronze_custos_e_fns.sql:35`) e finalmente dropadas (`supabase/migrations/20260716000008_drop_archive_backup_schemas.sql:94`).
Classificação: **⬛ MORTO_OU_ABANDONADO**.

### Silver — geração 2 (CANÔNICA)
- `public.produtos_padronizacao` — `supabase/migrations/20260603221821_silver_02_produtos_padronizacao.sql:12`
- `public.produtos_padronizacao_variantes` — `supabase/migrations/20260603223723_silver_05_variantes_e_chave_pai.sql` (mesmo arquivo, `CREATE TABLE` na linha 37 de `20260603221821_*`)
- Contrato documentado em SQL: `supabase/migrations/20260605011700_pad_silver_comments_documentation.sql:2`
  > *"Camada SILVER (medallion). Conforma produtos do BRONZE (supplier_products_raw via raw_id) e os equivale ao GOLD (products via product_id). Fluxo: pending -> standardized -> promoted | rejected."*
- FKs de amarração das três camadas: `.../20260605011700_...sql:4` (`raw_id -> supplier_products_raw (BRONZE)`) e `:5` (`product_id -> products (GOLD)`).
- Cadeia de 52 migrations `silver_*` / `pad_silver_*` / `silver_depara_*` entre `20260603221755` e `20260610120500`.
- Padronizador data-driven: `supabase/migrations/20260610120400_silver_depara_05_standardize_variant_depara.sql:107`.

### Gold
- `public.products` — `supabase/migrations/20250102000000_gifts_production.sql:32` (redeclarada em `20250103080000_complete_schema.sql:80`, `20251214200524_*.sql:2`, `20260517142928_*.sql:1`).
- Funções de promoção Silver→Gold vigentes: `fn_promote_supplier`, `fn_asia_site_promote_to_gold`, `fn_site_to_silver_all`, `fn_xbz_enrich_gold_extractors`, `fn_reconcile_stock_gold`.
- Fast-path que **contorna** a cadeia Bronze→Silver→Gold, documentado no próprio SQL: `supabase/migrations/20260606110100_fase8_02_document_xbz_stock_fastpath.sql:6` — lê `supplier_products_raw.stock_data` e escreve direto em `variant_supplier_sources` + rollup em `products`. O comentário se defende explicitamente: *"NAO e violacao Bronze->Gold (escreve na camada de sourcing canonica)"*.

### Conclusão sobre Medallion
Declarada **parcialmente**: a camada Silver-2 e as funções de promoção estão integralmente no repo; a **tabela Bronze e a tabela `variant_supplier_sources` (referenciada em 56 arquivos) nunca são criadas por nenhuma migration**. O `medallion/` do repo contém 1 arquivo `.sql` (Silver legado morto) e 22 arquivos `.md` de relatório — a pasta é, em termos executáveis, **⬛ MORTA**.

---

## E) Cron jobs declarados

**50 jobs distintos** em 67 `cron.schedule(...)` (48 arquivos de migration + `supabase/cron/cron-config.sql`).

| Job | Agendamento | O que chama | Evidência (última declaração) |
|---|---|---|---|
| `process-notification-queue` | `* * * * *` | edge fn `process-queue` | `supabase/cron/cron-config.sql:12` |
| `cf-recon-dispatch` | `* * * * *` | `public.fn_cf_recon_dispatch()` | `supabase/migrations/20260616172002_product_images_cf_reconciliation_cron.sql:7` |
| `cf-recon-collect` | `* * * * *` | `public.fn_cf_recon_collect()` | `supabase/migrations/20260616172002_product_images_cf_reconciliation_cron.sql:8` |
| `process-webhook-outbox` | `* * * * *` | `public.fn_process_webhook_outbox_batch()` | `supabase/migrations/20260623000000_fix_audit_novo_orcamento_batch2.sql:156` |
| `external-db-bridge-keepalive` | `*/4 * * * *` | edge fn `external-db-bridge` | `supabase/migrations/20260525170000_harden_cron_runtime_secrets_and_acl.sql:10` |
| `canary-log-login-attempt` | `*/5 * * * *` | edge fn `log-login-attempt` | `supabase/cron/cron-config.sql:92` |
| `hash-product-images` | `*/5 * * * *` | edge fn `hash-product-images` | `supabase/migrations/20260617000002_hash_product_images_cron.sql:37` |
| `generate-blurhashes` | `*/5 * * * *` | edge fn `generate-blurhashes` | `supabase/migrations/20260617000003_generate_blurhashes_cron.sql:38` |
| `backfill-image-dimensions` | `*/5 * * * *` | edge fn `backfill-image-dimensions` | `supabase/migrations/20260617000005_fix_backfill_dim_cron_add_auth_header.sql:22` |
| `process-pending-products` | `*/5 * * * *` | pipeline de ingestão (Bronze→Silver) | `supabase/migrations/20260611120400_fase9_05_restore_main_ingestion_cron.sql:9` |
| `cleanup-stale-ai-pending-logs` | `*/10 * * * *` | `public.ai_usage_logs` (UPDATE) | `supabase/migrations/20260622_ai_usage_logs_hardening_observability.sql:65,67` |
| `pipeline-classify-categories` | `*/10 * * * *` | `public.fn_backfill_product_categories()` | `supabase/migrations/20260606110200_fase8_03_pipeline_category_classification_cron.sql:11` |
| `webhook-retry-failed` | `*/10 * * * *` | `public.retry_failed_webhook_deliveries()` | `supabase/migrations/20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql:144` |
| `auto-block-extreme-offenders` | `*/15 * * * *` | `public.auto_block_extreme_offenders()` | `supabase/migrations/20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql:217` |
| `auto-revoke-orphan-mcp-full-keys` | `*/15 * * * *` | `public.auto_revoke_orphan_full_keys()` | `supabase/migrations/20260426122751_c0bc82e4-dc78-47da-8da4-74691b181d3d.sql:166` |
| `connections-auto-test` | `*/15 * * * *` | edge fn `connections-auto-test` | `supabase/migrations/20260619210000_fix_cron_connections_auto_test_canonical_url.sql:35` (8 redefinições) |
| `pipeline-print-profiles` | `*/15 * * * *` | `public.fn_apply_print_profiles()` | `supabase/migrations/20260611120300_fase9_04_cron_print_profiles.sql:6` |
| `refresh-mv-supplier-reliability` | `*/15 * * * *` | refresh `mv_supplier_reliability` | `supabase/migrations/20260622111500_supplier_reliability_pipeline_v1.sql:427` |
| `pgrst-schema-reload` | `*/15 * * * *` | `public.fn_pgrst_reload()` | `supabase/migrations/20260623183200_pgrst_auto_reload_cron.sql:5` |
| `cleanup-product-webhook-nonces-hourly` | `17 * * * *` | `public.cleanup_expired_webhook_request_nonces()` | `supabase/migrations/20260524202319_add_product_webhook_nonces.sql:54` |
| `spr-requeue-failed-hourly` | `25 * * * *` | `public.fn_spr_requeue_failed()` | `supabase/migrations/20260610121713_p0_quarentena_01_promote_failures_marcam_bronze.sql:192` |
| `refresh-all-materialized-views` | `30 * * * *` | `public.refresh_all_materialized_views()` | `supabase/migrations/20260602010000_fix_mv_refresh_cron_missing.sql:46` |
| `ai-queue-stuck-cleanup` | `0 * * * *` | UPDATE `ai_enrichment_queue` | `supabase/migrations/20260622131000_ai_queue_cleanup_cron.sql:11` |
| `send-daily-digest` | `0 * * * *` | edge fn `send-digest` | `supabase/cron/cron-config.sql:31` |
| `cleanup-expired-token-revocations` | `0 * * * *` | DELETE `user_token_revocations` | `supabase/migrations/20260526120000_fix_schema_divergences_4_tables.sql:78` |
| `refresh-mv-product-leaf-category` | `0 */4 * * *` → `37 */4 * * *` | refresh `internal.mv_product_leaf_category` | `supabase/migrations/20260717000072_fix_cron_and_fn_after_mv_move_to_internal.sql:46,58` |
| `refresh-mv-product-images-audit` | `0 */6 * * *` | `REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_product_images_audit` | `supabase/migrations/20260616003120_product_images_audit_matview_e1.sql:121` |
| `refresh-category-ancestors` | `0 1 * * *` | rebuild `category_ancestors` | `supabase/migrations/20260618200000_drift_catalog_analytics_baseline.sql:183` |
| `schema-drift-check` | `0 2 * * *` | `public.fn_run_schema_drift_check()` | `supabase/migrations/20260522151617_fase_4_gate_ci_pg_cron_schedule.sql:2` |
| `vacuum-analyze-weekly` | `0 2 * * 6` | `ANALYZE public.product_images` | `supabase/migrations/20260605014600_fix_vacuum_analyze_weekly_cron_no_vacuum_in_txn.sql:16` (4 redefinições) |
| `refresh-analytics-mv-product-intelligence` | `30 2 * * *` | `REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_intelligence` | `supabase/migrations/20260618200000_drift_catalog_analytics_baseline.sql:176` |
| `purge-audit-logs-daily` | `0 3 * * *` | `public.purge_old_audit_logs()` | `supabase/migrations/20260503134916_03743408-92b5-4ba0-aa2b-5ec84beb7894.sql:34` |
| `cleanup-log-tables-weekly` | `0 3 * * 0` | `public.fn_cleanup_log_tables()` | `supabase/migrations/20260602_002_fix_cron_jobs_never_ran.sql:33` |
| `cleanup-old-notifications` | `0 3 * * 0` | edge fn `cleanup-notifications` | `supabase/cron/cron-config.sql:50` |
| `daily-expire-quotes` | `30 3 * * *` | `public.fn_expire_overdue_quotes()` | `supabase/migrations/20260623000000_fix_audit_novo_orcamento_batch2.sql:72` |
| `purge-spr-history-daily` | `30 3 * * *` | `public.fn_purge_spr_history()` | `supabase/migrations/20260604233004_spr_maintenance_and_history_retention.sql:30` |
| `webhook-logs-cleanup-daily` | `30 3 * * *` | `public.cleanup_webhook_logs()` | `supabase/migrations/20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql:159` |
| `medallion-coverage-daily` | `37 3 * * *` | `public.fn_snapshot_medallion_coverage()` | `supabase/migrations/20260611120400_v2_05_monitoring_coverage.sql:100` |
| `log-retention-daily` | `0 4 * * *` | `public.fn_cleanup_log_tables()` | `supabase/migrations/20260602_002_fix_cron_jobs_never_ran.sql:40` |
| `purge-favorite-trash` | `0 4 * * *` | `public.purge_favorite_trash_old()` | `supabase/cron/cron-config.sql:72` |
| `hardening-regression-check-daily` | `0 4 * * *` | `public.notify_hardening_regression()` | `supabase/migrations/20260419121414_3259f186-81ef-478e-80da-0d5950fc86fe.sql:102` |
| `expire-supplier-promises` | `0 4 * * *` | UPDATE `supplier_replenishment_events` | `supabase/migrations/20260622111500_supplier_reliability_pipeline_v1.sql:425` |
| `cron_job_run_details_purge_weekly` | `0 4 * * 0` | `DELETE FROM cron.job_run_details` | `supabase/migrations/20260524204210_colapso_p0_rotacionar_cron_job_run_details_20260524.sql:12` |
| `kill_switch_hits_purge_weekly` | `0 4 * * 0` | `DELETE FROM public.kill_switch_hits` | `supabase/migrations/20260524213813_colapso_fase3_kill_switch_telemetry.sql:81` |
| `snapshot-hardening-daily` | `5 4 * * *` | `public.snapshot_hardening_status()` | `supabase/migrations/20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql:211` |
| `reconcile-stock-gold-daily` | `10 5 * * *` | `public.fn_reconcile_stock_gold()` | `supabase/migrations/20260610122504_p0_estoque_01_fn_reconcile_stock_gold.sql:82` |
| `expire-stale-password-reset-requests` | `0 6 * * *` | `public.expire_stale_password_reset_requests()` | `supabase/migrations/20260524210002_harden_password_reset_requests_rls.sql:120` |
| `check-dead-letters-daily` | `0 8 * * *` | dead-letters de `crm_callback_events` | `supabase/migrations/20260707113531_205c38da-b21e-455b-bf0a-fe762e894e57.sql:63` |
| `smoke_tests_monthly` | `0 3 1 * *` | `public.fn_run_smoke_tests()` | `supabase/migrations/20260525005350_colapso_fase5_smoke_tests_mensal_history_v2.sql:146` |
| `smoke_tests_runs_purge` | `0 4 1 * *` | `DELETE FROM public.smoke_tests_runs` | `supabase/migrations/20260525005350_colapso_fase5_smoke_tests_mensal_history_v2.sql:158` |

### Observações sobre cron
- **`connections-auto-test` foi redefinido 8 vezes e "desagendado" 7 vezes** entre 2026-04-29 e 2026-06-19 (URL hardcoded → base URL dinâmica → API key → URL canônica). Sinal claro de instabilidade — 🟨.
- **`vacuum-analyze-weekly` redefinido 4 vezes**; `supabase/migrations/20260605014600_fix_vacuum_analyze_weekly_cron_no_vacuum_in_txn.sql` troca `VACUUM ANALYZE` por `ANALYZE` porque `VACUUM` não roda dentro de transação — bug real corrigido.
- **`cleanup-stale-ai-pending-logs`**: o corpo do job está **comentado** (`--   UPDATE public.ai_usage_logs`) em `supabase/migrations/20260622_ai_usage_logs_hardening_observability.sql:65-67`. Job agendado com payload inerte → 🟦 SUGERIDO_OU_INICIADO.
- **`log-retention-daily` e `cleanup-log-tables-weekly` chamam a mesma função** `public.fn_cleanup_log_tables()` em horários diferentes (mesmo arquivo, linhas 33 e 40) — redundância.
- Jobs **desagendados e nunca reagendados** (⬛): `process-marked-products` (`supabase/migrations/20260604221000_fix_raw_v2_race_and_batch_spam.sql:327`), `stock_mv_intelligence_refresh` e `stock_mv_velocity_refresh` (`supabase/migrations/20260522021541_p1_db_hardening_ops001_perf001_perf002.sql:4-5`), `web-vitals-regression-check-daily` (`supabase/migrations/20260417171441_83bb6a48-4d55-4495-a23b-4539e6ed5707.sql:5`), `external-db-bridge-keepalive` (aposentado em `supabase/migrations/20260601140000_fix_cron_retire_external_db_bridge_keepalive.sql:13`, posterior ao último `schedule`).
- Bug de código gerado: `supabase/migrations/20260619210000_fix_cron_connections_auto_test_canonical_url.sql:28` contém `cron.unschedule('<nome>')` — placeholder literal `<nome>` nunca substituído.

---

## F) Tabelas declaradas SEM consumidor no frontend

**130 das 258 tabelas `public` declaradas (50,4%)** não aparecem em `.from('...')` nem em `src/` nem em `supabase/functions/`.

Prova (comando de verificação individual):
```
grep -rn "from('<nome_tabela>'" src/         # vazio
grep -rn "from('<nome_tabela>'" supabase/functions/   # vazio
```

Blocos mais relevantes (candidatos a feature dormente):

| Bloco | Tabelas sem consumidor | Classificação |
|---|---|---|
| **Gamificação** | `achievements`, `user_achievements`, `seller_achievements`, `point_transactions`, `user_points`, `rewards`, `store_rewards`, `user_rewards`, `reward_redemptions`, `seller_gamification` (10/11) | ⬛ MORTO_OU_ABANDONADO |
| **Multi-tenant** | `organizations`, `organization_members`, `user_organizations` | 🟦 SUGERIDO_OU_INICIADO |
| **CRM / contatos** | `client_contacts`, `client_notes`, `company_addresses`, `company_contacts`, `contact_emails`, `contact_phones`, `bitrix_sync_logs` | 🟦 SUGERIDO_OU_INICIADO |
| **Cotações legadas (pt-BR)** | `cotacoes`, `cotacao_eventos` (coexistem com `quotes`/`quote_history` em inglês, que são consumidas) | ⬛ duplicação de domínio |
| **Comissões / metas** | `commission_entries`, `commission_rules`, `sales_goals` | ⬛ (as duas primeiras foram dropadas — ver §G) |
| **Infra "clássica" nunca usada** | `redis_config`, `websocket_sessions`, `cache_entries`, `rate_limits`, `template_versions`, `two_factor_secrets`, `webhook_configs`, `webhook_logs`, `audit_trail`, `optimization_logs`, `analytics_events`, `feature_flags` — todas criadas em bloco em `supabase/migrations/20251228000000..20251228000011_*.sql` | ⬛ MORTO_OU_ABANDONADO |
| **Personalização granular** | `personalization_locations`, `personalization_sizes`, `personalization_simulations`, `personalization_technique_mappings`, `product_personalization_areas`, `product_personalization_options`, `product_print_areas`, `product_technique_pricing_tiers`, `product_component_location_techniques`, `product_group_location_techniques`, `product_group_locations`, `product_group_components`, `product_kit_components` | 🟨 (usadas via views `v_*_public`, não por acesso direto) |
| **Mockup — módulo de créditos** | `mockup_credits`, `mockup_credit_transactions`, `mockup_approval_links`, `mockup_generation_jobs`, `mockup_templates` (mas `mockup_drafts`, `mockup_prompt_configs`, `mockup_prompt_history` **são** consumidas) | 🟨 IMPLEMENTADO_PARCIAL |
| **Magic Up — social** | `magic_up_comments`, `magic_up_reactions`, `magic_up_public_shares` (mas `magic_up_campaigns`, `magic_up_generations`, `magic_up_brand_kits` são consumidas) | 🟨 IMPLEMENTADO_PARCIAL |
| **Reações / trash** | `collection_item_reactions`, `favorite_item_reactions`, `comparison_reactions`, `kit_share_tokens`, `user_favorites`, `user_filter_presets` | 🟦 |
| **Staging de ingestão** | `_asia_api_staging`, `sm_images_staging`, `xbz_gallery_staging`, `scraper_images_staging`, `import_staging_images`, `color_analysis_staging` | ✅ correto — são internas ao pipeline, consumo esperado é via SQL/cron |
| **Observabilidade interna** | `schema_drift_log`, `schema_drift_allowlist`, `smoke_tests_runs`, `smoke_test_runs`, `navigation_analytics`, `search_queries`, `web_vitals`, `entity_versions`, `medallion_coverage_snapshots` | ✅ correto — consumo por cron/CI |

**Duplicações detectadas no próprio inventário:** `smoke_test_runs` **e** `smoke_tests_runs`; `audit_log`, `audit_logs` **e** `audit_trail`; `notification_preferences` **e** `user_notification_preferences`; `ip_whitelist`, `user_allowed_ips` **e** `user_ip_allowlist`; `rate_limits`, `request_rate_limits` **e** `edge_rate_limits`. Todas convivem no schema declarado.

---

## G) Objetos criados e depois removidos

### G.1 — Tabelas com `DROP` posterior ao último `CREATE` (15)

| Tabela | Criada em | Dropada em |
|---|---|---|
| `public.web_vitals` | `supabase/migrations/20260323225021_544d47f7-3124-4c33-9ea0-cc6cd8ab9652.sql:2` | `supabase/migrations/20260417171441_83bb6a48-4d55-4495-a23b-4539e6ed5707.sql:16` |
| `public.workspace_notifications` | `supabase/migrations/20260330104621_b1c5cde5-1d76-43c7-b27d-7ce25242435c.sql:2` | `supabase/migrations/20260411210929_9736ba78-4ddb-466f-b54d-c1c5f9d0d35f.sql:9` |
| `public.commission_rules` | `supabase/migrations/20260416153503_5163f0f9-e6f0-4664-9f53-8cdb24d9150e.sql:2` | `supabase/migrations/20260417174309_81d5d176-b034-40c0-abb0-12c6ffc8f6c9.sql:5` |
| `public.commission_entries` | `supabase/migrations/20260416153503_5163f0f9-e6f0-4664-9f53-8cdb24d9150e.sql:15` | `supabase/migrations/20260417174309_81d5d176-b034-40c0-abb0-12c6ffc8f6c9.sql:4` |
| `public.kit_variants` | `supabase/migrations/20260418175315_6317f072-62ee-49c8-af36-6c992764a582.sql:5` | `supabase/migrations/20260419024928_74dafaf0-67e3-42ef-83f5-1634b4a26328.sql:11` |
| `public.kit_comments` | `supabase/migrations/20260418175315_6317f072-62ee-49c8-af36-6c992764a582.sql:157` | `supabase/migrations/20260419024928_74dafaf0-67e3-42ef-83f5-1634b4a26328.sql:8` |
| `public.product_price_history` | `supabase/migrations/20260317205124_5fdf0e1d-c8cb-49bd-8324-d63f86795020.sql:2` | `supabase/migrations/20260326160831_980fd4e0-cc49-496a-bcee-4bb009313444.sql:11` |
| `public.product_supplier_sources` | `supabase/migrations/20260325124134_358bb2ce-0972-48ac-95a5-54b456907dd5.sql:3` | `supabase/migrations/20260326160831_980fd4e0-cc49-496a-bcee-4bb009313444.sql:8` |
| `public.product_personalization_areas` | `supabase/migrations/20260324201423_2dcd7bae-b019-488e-82e9-909882093806.sql:3` | `supabase/migrations/20260326160831_980fd4e0-cc49-496a-bcee-4bb009313444.sql:5` |
| `public.quote_comments` | `supabase/migrations/20260317212837_5deaff1e-a171-4f3f-a601-6d83e2068fd9.sql:3` | `supabase/migrations/20260627200000_drop_quote_comments_orphan_table.sql:6` |
| `public.user_passkeys` | `supabase/migrations/20251231124614_527fd53c-cfd4-4106-b454-fdc2ed3a708e.sql:2` | `supabase/migrations/20260507145245_drop_user_passkeys_table.sql:6` |
| `public.supplier_products_raw_bkp_20260604` | `supabase/migrations/20260604120255_spr_p2p3_backup_normalize_docs.sql:4` | `supabase/migrations/20260604233002_spr_drop_bkp_table.sql:4` |
| `backup.product_images_display_order_20260616` | `supabase/migrations/20260616180002_product_images_m2_display_order_deterministic.sql:12` | `supabase/migrations/20260716000008_drop_archive_backup_schemas.sql:102` |
| `backup.product_images_type_xbz_20260616` | `supabase/migrations/20260616180005_product_images_m5_reclassify_xbz_product_to_gallery.sql:10` | `supabase/migrations/20260716000008_drop_archive_backup_schemas.sql:103` |
| `backup.products_imageproj_20260616` | `supabase/migrations/20260616180004_product_images_m4_projection_repair_and_hashlegacy_softpurge.sql:16` | `supabase/migrations/20260716000008_drop_archive_backup_schemas.sql:104` |

**Casos de vida curta (funcionalidade nasceu e morreu):**
- **Comissões:** criadas 2026-04-16, dropadas 2026-04-17 — **1 dia**. `public.auto_create_commission_entry` e `public.validate_commission_status` dropadas no mesmo commit (`.../20260417174309_*.sql:2-3`). ⬛
- **Kits com variantes/comentários:** criados 2026-04-18, dropados 2026-04-19 — **1 dia**. ⬛
- **Web Vitals:** tabela + `get_web_vitals_summary` + `get_web_vitals_regression` + cron `web-vitals-regression-check-daily`, todos criados entre 2026-04-17 08h e 17h e dropados no mesmo dia (`.../20260417171441_*.sql:5,12,13,16`). ⬛

### G.2 — Funções com `DROP` posterior ao último `CREATE` (23)
Destaques:

| Função | Criada em | Dropada em |
|---|---|---|
| `public.calculate_personalization_price` | `supabase/migrations/20250103070000_complete_catalog_structure.sql:299` | `supabase/migrations/gravacao_fix4_drop_dead_calculate_personalization_price_20260623.sql:4` |
| `public.fn_convert_cart_to_quote` | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql:15` | `supabase/migrations/20260614213000_drop_fn_convert_cart_to_quote.sql:26` (**30 minutos depois**) |
| `public.fn_extract_asia_variants` | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql:11332` | `supabase/migrations/20260605142000_drop_dead_code_variant_functions.sql:6` |
| `public.fn_process_staged_variant` | `.../20260513000000_reconcile_orphan_functions_from_prod.sql:15498` | `.../20260605142000_drop_dead_code_variant_functions.sql:7` |
| `public.fn_process_all_staged_variants` | `.../20260513000000_reconcile_orphan_functions_from_prod.sql:15112` | `.../20260605142000_drop_dead_code_variant_functions.sql:8` |
| `public.fn_spr_normalize` / `fn_sync_raw_status` / `fn_set_initial_processed_state` | `20260604120255:11`, `20260603215610:7`, `20260513000000:16912` | `supabase/migrations/20260604233005_spr_cutover_status_part1.sql:185,186,187` |
| `public.check_seller_cart_limit` / `enforce_seller_cart_limit` | `20260623124424_*.sql:2`, `20260623111612_*.sql:1` | `supabase/migrations/20260623172606_7e1223b3-a854-4699-be3d-f2e8be157d8d.sql:6,7` (mesmo dia) |
| `public.audit_trigger_func` / `get_record_history` | `supabase/migrations/20251227180001_audit_log_universal.sql:40,157` | `supabase/migrations/20260626202416_create_audit_log_generic_entity_audit.sql:58,59` |
| `public.fn_version_supplier_raw_on_hash_change` | `supabase/migrations/20260605025255_fix_bronze_versioning_compare_raw_data.sql:3` | `supabase/migrations/20260605025338_drop_redundant_bronze_versioning_trigger.sql:4` (**43 segundos depois**) |
| `public._rls_test_as` | `supabase/migrations/20260426130639_eb1f50ad-de51-4942-95a7-e7f8b03f59d8.sql:3` | `supabase/migrations/20260426130701_c4f052a8-c32c-4b3d-8c6c-23687b247332.sql:1` (**22 segundos depois**) |

### G.3 — Faxina em massa (2026-06-20/21) — 19 migrations `faxina_*` (21 no total, 2 de 2026-04)
Sequência de arquivamento e restauração no mesmo par de dias:
- `supabase/migrations/20260620150000_faxina_tier1_archive_orphan_tables.sql` (arquiva tabelas órfãs)
- `supabase/migrations/20260620160500_faxina_tier3_archive_dead_functions.sql`
- `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql:15` (array com ~120 assinaturas, incluindo todas as `classify_*`)
- **Reversões no dia seguinte:** `20260621100100_faxina_restore_active_tables_from_archive.sql`, `20260621210000_faxina_complete_archive_restore_11_tables_APLICADO.sql`, `20260621220000_faxina_restore_kit_builder_family_APLICADO.sql`, `20260621230000_faxina_restore_security_notifications_APLICADO.sql`, `20260621235500_faxina_restore_18_frontend_referenced_tables_APLICADO.sql`

Ou seja: **a faxina arquivou 30+ tabelas que estavam em uso e teve de restaurá-las em 5 migrations no dia seguinte.** 🟨 — evidência de que a classificação de "dead code" foi feita sem checar consumo real.

### G.4 — Índices
655 `DROP INDEX` contra 1249 `CREATE INDEX`. O maior bloco é `supabase/migrations/20260716000036_drop_unused_indexes.sql`, parcialmente revertido no arquivo seguinte `supabase/migrations/20260716000037_restore_fk_indexes_after_036.sql:9-10` (*"162 findings minus 5 partition children…"*). Mesmo padrão da faxina: remoção agressiva → restauração imediata.

---

## H) Divergência repo × produção (declaração incompleta)

Este é o achado mais importante desta auditoria: **o repositório NÃO declara o schema completo.**

### H.1 — Relações usadas por `src/` e nunca declaradas (13 de 120)
Comando: cruzamento de `grep -rhoE "\.from\('[a-z0-9_]+'" src/` contra o inventário de `CREATE TABLE`/`CREATE VIEW`.

`ai_function_routing`, `ai_models`, `ai_providers`, `avatars`, **`magazines`**, **`magazine_items`**, `magazine_reader_state`, `mv_stock_rupture_alert`, `mv_stock_velocity`, `stock_notes`, `tabela_preco_gravacao_oficial`, `tpgo`, `tpgo_faixa`

- O módulo **Magazine inteiro não tem uma única `CREATE TABLE` no repositório**, apesar de: 5 edge functions declaradas em `supabase/config.toml` (`magazine-public-view`, `magazine-public-react`, `magazine-reader-state-read`, `magazine-reader-state-write`, `magazine-import-local`), `src/services/magazineService.ts`, `src/types/magazine.ts` e migrations que fazem `DROP INDEX public.idx_magazines_org` (`supabase/migrations/20260716000036_drop_unused_indexes.sql:144-146`) e `CREATE INDEX ... ON magazine_public_view_events` (`supabase/migrations/20260716000037_restore_fk_indexes_after_036.sql:206`). As tabelas existem em produção; a declaração não existe no repo.

### H.2 — Objetos alterados mas nunca criados
- `public.supplier_products_raw` — Bronze, referenciada em 127 arquivos, `CREATE TABLE` = 0.
- `public.variant_supplier_sources` — "fonte-da-verdade de estoque, ADR 0007" (`supabase/migrations/20260606110100_fase8_02_document_xbz_stock_fastpath.sql:6`), referenciada em 56 arquivos, `CREATE TABLE` = 0.
- `public.vw_sitemap_all` — consumida por `api/sitemap.ts:5`, apenas `ALTER VIEW ... SET (security_invoker = on)` em `supabase/migrations/20260716000023_security_invoker_views.sql:63`; `CREATE VIEW` = 0.
- `analytics` schema — `analytics.mv_product_intelligence` refrescada por cron, `CREATE SCHEMA analytics` = 0.

### H.3 — RPCs chamadas e não declaradas
- Em `src/` (4 de 43): `fn_ema_pipeline_health`, `fn_get_color_swatches_batch`, `fn_get_similar_products`, `fn_my_rpc`.
- Em `supabase/functions/` (7 de 46): `fn_apply_crm_callback`, `fn_check_login_allowed`, `fn_get_product_ai_context`, `fn_save_ai_enrichment_results`, `send_digest_notification`, `set_config`, e um `fn` (falso positivo de template string).

### H.4 — Snapshot desatualizado
`supabase/migrations-snapshot/SNAPSHOT_META.json` declara `"generated_at": "2026-07-01"`, `"migrations_count": 1564`, `"live_schema": null`, `"drift": null`.
Hoje há **1.672** migrations. O snapshot está **108 migrations atrás** e nunca capturou o schema vivo nem o drift. `supabase/migrations-snapshot/ALL_IN_ONE.sql` (127.990 linhas) é a concatenação daquele estado — o próprio cabeçalho (linhas 1-8) diz *"APENAS auditoria/leitura. NÃO aplicar direto no banco."*
Classificação: 🟨 IMPLEMENTADO_PARCIAL / desatualizado.

### H.5 — `supabase/config.toml`
- `project_id = "doufsxqlfjyuvxuezpln"` (linha 1) — coerente com a REGRA #1 do projeto.
- **39 blocos `[functions.*]`**: 36 com `verify_jwt = false` e 3 com `verify_jwt = true` (`word-magic`, `generate-mockup`, `analyze-logo-colors`). Comandos: `grep -c "^\[functions\." supabase/config.toml` → 39; `grep -c "verify_jwt = false" supabase/config.toml` → 36.
- `[auth] enable_signup = false`, `enable_anonymous_sign_ins = false`.
- O bloco Magazine (comentário no arquivo) documenta um GAP corrigido em 2026-07-12: as 5 edges do módulo foram deployadas sem entrada no config, caindo no default `verify_jwt = true`, o que quebrava 100% do fluxo público.

### H.6 — `schemas/` e `api/`
- `schemas/ssot-report.schema.json` — JSON Schema draft-07 do artefato `scripts/ssot-report.mjs`, `schemaVersion` const `2.0.0`, com `canonical: "doufsxqlfjyuvxuezpln"` e `forbidden: "pqpdolkaeqlyzpdpbizo"` hardcoded como `const`. ✅ IMPLEMENTADO_TOTAL (guarda do SSOT).
- `api/sitemap.ts` (133 linhas) — Vercel serverless function que lê `vw_sitemap_all` via PostgREST. **Contém a `anon key` hardcoded como fallback** (`api/sitemap.ts:17-19`). ✅ funcional, 🟨 quanto à higiene de segredo (chave anon é pública por design, mas o fallback hardcoded impede rotação).

---

## I) COBERTURA — o que foi e o que NÃO foi verificado

### Método efetivamente empregado
1. **Não li os 1.672 arquivos `.sql` linha a linha.** O inventário foi produzido por `grep -rhoiE` agregado sobre `supabase/migrations/`, com deduplicação e limpeza de ruído em Python. Todos os comandos estão citados na seção A.
2. **Leitura integral de 4 arquivos:** `supabase/config.toml`, `supabase/migrations-snapshot/SNAPSHOT_META.json`, `medallion/migrations/001_create_silver_layer.sql` (parcial: linhas de `CREATE`/`COMMENT`), `supabase/cron/cron-config.sql` (126 linhas).
3. **Leitura parcial dirigida (~15 arquivos):** migrations de Silver/unificação, faxina, drop de schemas, cron.
4. **Extração programática de cron** com janela de 30 linhas por `cron.schedule` para capturar nome, agendamento e alvo.
5. **Cruzamento repo × frontend** por `grep` de `.from('...')` e `.rpc('...')` em `src/` e `supabase/functions/`.

### O que ficou fora / NAO_VERIFICADO
- **Estado real do banco de produção `doufsxqlfjyuvxuezpln`**: NAO_VERIFICADO. Nenhuma query foi executada. Contagem real de tabelas, funções, policies, jobs em `cron.job`, e quais migrations constam em `supabase_migrations.schema_migrations` — tudo desconhecido a partir do repositório.
- **Se as migrations foram efetivamente aplicadas**: NAO_VERIFICADO. Um `CREATE TABLE` no repo não prova existência em produção, e a §H prova o inverso (objetos em produção sem declaração no repo).
- **Colunas, tipos, constraints e FKs**: NAO_VERIFICADO. A auditoria foi por objeto, não por coluna. A REGRA #2 do projeto (campos `price`, `sale_price`, `shortDescription`, `category_id`, `category_name` em `Product`) **não foi checada** — está fora do escopo desta camada.
- **Conteúdo semântico das 1.353 policies**: NAO_VERIFICADO. Só foi contado nome e tabela-alvo; nenhuma expressão `USING`/`WITH CHECK` foi analisada.
- **Quais das 986 funções são `SECURITY DEFINER`**: parcial. Sabe-se que há 823 ocorrências do token em 383 arquivos e 282 de `SECURITY INVOKER`, mas **o mapeamento função → modo não foi feito** (exigiria parsing de bloco, não `grep` de linha). NAO_VERIFICADO por função.
- **`supabase/functions/` (edge functions)**: usado apenas como fonte de `.from()`/`.rpc()` para o cruzamento de consumo. O código das edges **não foi auditado** — fora do escopo desta seção.
- **`medallion/` (22 arquivos `.md`)**: deliberadamente ignorados como fonte, conforme regra 3. Só o único `.sql` foi lido.
- **Ordem de aplicação real das 38 migrations sem timestamp**: inferida pela ordenação alfabética do Supabase CLI, **não confirmada** contra o histórico de aplicação.
- **`docs/SCHEMA_REFERENCE.md`**: não lido, não citado, não usado — conforme instrução.

### Confiabilidade das contagens
Os números de **objetos distintos** têm margem de erro estimada em ±3% para baixo: statements `CREATE TABLE`/`CREATE FUNCTION` quebrados em múltiplas linhas, ou gerados dentro de `EXECUTE format(...)` / blocos `DO $$`, não são capturados por `grep` de linha única. Há evidência concreta disso: `supabase/migrations/20260610122909_p1_historico_01_particionamento_mensal.sql:92` cria partições via `format('CREATE TABLE public.%I PARTITION OF ...')` — objetos que existem mas não entram no inventário. Os números devem ser lidos como **piso**, não como total.
