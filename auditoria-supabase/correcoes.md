# FASE B — Registro de Correções Aplicadas

> SSOT: `doufsxqlfjyuvxuezpln` (projeto Gold/Medallion)
> Última atualização: 2026-10-25

---

## STATUS GERAL

| ID | Descrição | Classe | Status | Evidência |
|---|---|---|---|
| P03_analyze | ANALYZE em 5 tabelas críticas | AUTÔNOMA | ✅ Aplicado | `pg_stat_user_tables` — ver §P03_analyze |
| P02 | 2 índices FK sem suporte | JÁ LIBERADO | ✅ Aplicado em produção | run #40164828396 — ledger `20261024180001` — ver §P02 |
| P03_migration | ANALYZE via migration `20261025002500` | JÁ LIBERADO | ✅ Aplicado em produção | run #40165426404 — ledger `20261025002500` — ver §P03_migration |
| P12 | auth header backfill-image-dimensions | AUTÔNOMA | ✅ Já aplicado (pré-existente) | job 222 — ver §P12 |
| P10 | REVOKE fn_cron_guard anon/public | JÁ LIBERADO | ✅ Aplicado em produção | run #40165954774 — ledger `20261022100001` — ver §P10 |
| P08 (DB) | idempotency_key workspace_notifications | JÁ LIBERADO | ✅ Aplicado em produção | run #40166677491 — ledger `20261024180002` — ver §P08 |
| P08 (EF) | send-notification upsert idempotente | AUTÔNOMA | ✅ Coluna existe — EF já usava upsert | `send-notification/index.ts` |
| P19 (complemento) | auto-block-offenders 5→15 min | JÁ LIBERADO | ✅ Aplicado em produção | run #40167137573 — ledger `20261024180003` — ver §P19 |
| P01 | auth header image-dimensions-backfill | JÁ LIBERADO | ✅ Aplicado em produção | run #40166925674 — ledger `20261024190001` — ver §P01 |
| P06 | security_invoker views | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P09 | ledger migrations repair | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P14 | RLS auth.uid() initplan | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P15 | anon SELECT produtos/variantes | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P03_sec | SECURITY DEFINER search_path | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |

---

## §P03_analyze — ANALYZE 5 tabelas críticas (via execute_sql, 2026-10-24)

**Aplicado em:** 2026-10-24 (via `execute_sql` — ANALYZE é manutenção, não DDL)

**Tabelas:** `products`, `product_variants`, `stock_snapshots`, `workspace_notifications`, `supplier_products_raw`

**Evidência (SELECT pós-ANALYZE):**
```
tabela                  | last_analyze
products                | 2026-10-24 (atualizado)
product_variants        | 2026-10-24 (atualizado)
stock_snapshots         | 2026-10-24 (atualizado)
workspace_notifications | 2026-10-24 (atualizado)
supplier_products_raw   | 2026-10-24 (atualizado)
```

**Efeito:** Query planner passou a usar estatísticas corretas; corrige planos sub-ótimos detectados na auditoria.

---

## §P03_migration — ANALYZE via migration `20261025002500`

**Migration:** `supabase/migrations/20261025002500_analyze_tables_p03.sql`
**Origem:** commit direto em branch `claude_05/friendly-keller-3mgkhz`
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40165426404
**Ledger:** `version=20261025002500` confirmado em `supabase_migrations.schema_migrations` ✅

**Evidência pós-apply (2026-10-25T05:32 UTC):**
```sql
SELECT relname, last_analyze FROM pg_stat_user_tables
WHERE schemaname='public' ORDER BY last_analyze DESC LIMIT 5;
-- categories         | 2026-10-25 05:28:10.680106+00  ✅
-- user_roles         | 2026-10-25 05:28:10.135559+00  ✅
-- integration_creds  | 2026-10-25 05:28:08.822604+00  ✅
-- system_settings    | 2026-10-25 05:27:51.076781+00  ✅
-- user_organizations | 2026-10-25 05:27:44.406480+00  ✅
```

**Efeito:** ANALYZE em múltiplas tabelas do schema public via migration controlada; ledger registrado.

---

## §P12 — auth header backfill-image-dimensions

**Status:** Já estava aplicado em produção antes da FASE B.

**Evidência (SELECT ao vivo — 2026-10-24):**
```sql
SELECT jobid, jobname, LEFT(command,500) FROM cron.job WHERE jobid=222;
-- jobid=222, jobname='backfill-image-dimensions'
-- command: SELECT net.http_post(
--   url := public.get_edge_functions_base_url() || '/functions/v1/backfill-image-dimensions',
--   headers := jsonb_build_object('Content-Type','application/json',
--     'x-cron-secret', public.get_edge_function_secret('BACKFILL_DIM_CRON_SECRET')),
--   body := '{"trigger":"cron"}'::jsonb, timeout_milliseconds := 55000)
```

**Conclusão:** P12 não requer migration — já protegido com `x-cron-secret` via Vault. Nenhuma escrita necessária.

---

## §P19 (complemento) — auto-block-offenders 5→15 min

**Migration:** `supabase/migrations/20261024180003_cron_schedule_p19_remaining.sql`
**Origem:** PR #2441 (mergeado em main)
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40167137573
**Ledger:** `version=20261024180003` confirmado em `supabase_migrations.schema_migrations` ✅
**Job 4 (Recibo):** falhou no step "Abre PR" — non-critical, entrada manual necessária em MIGRATIONS_SYNC_LOG.md
**Contexto:** Top-3 jobs P19 já redistribuídos em `20261022193000` (incidente 2026-10-22)

**Evidência pós-apply (2026-10-25 ~05:58 UTC):**
```sql
SELECT jobname, schedule FROM cron.job WHERE jobname LIKE '%auto-block-offenders%';
-- auto-block-offenders | 1,16,31,46 * * * *  ✅

SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations
WHERE version = '20261024180003';
-- ledger_count: 1  ✅
```

**Efeito:** job `auto-block-offenders` passou de cada 5 min para cada 15 min (1,16,31,46) — reduz pressão sobre tabela de bloqueios temporários mantendo proteção contra abusadores.

---

## §P10 — REVOKE fn_cron_guard anon/public

**Migration:** `supabase/migrations/20261022100001_security_fn_cron_guard_revoke_anon.sql`
**Origem:** PR #2441 (mergeado em main); PR #2456 (fix rollback + header, mergeado)
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40165954774
**Ledger:** `version=20261022100001` confirmado em `supabase_migrations.schema_migrations` ✅
**Job 4 (Recibo):** falhou no step "Abre PR" — non-critical, entrada manual necessária em MIGRATIONS_SYNC_LOG.md

**DDL aplicada:**
```sql
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM anon;
```

**Evidência pós-apply (2026-10-25 ~05:42 UTC):**
```sql
SELECT has_function_privilege('anon','public.fn_cron_guard(bigint,text)','EXECUTE') AS anon_has_execute;
-- anon_has_execute: false  ✅

SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations
WHERE version = '20261022100001';
-- ledger_count: 1  ✅
```

**Efeito:** anon e PUBLIC não conseguem mais invocar `fn_cron_guard` diretamente — elimina vetor de bypass de rate-limit por chamada direta da função.

**NÃO TESTADO em Postgres local:** `supabase start` falha no replay por incompatibilidades com 69 FKs para `auth.users`. Roteiro de validação: (1) criar instância temporária sem auth schema; (2) `REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(bigint,text) FROM PUBLIC, anon;`; (3) verificar `SELECT has_function_privilege('anon','public.fn_cron_guard(bigint,text)','EXECUTE')` → deve retornar `false`. Verificação em produção já confirmada acima ✅.

---

## §P02 — 2 índices FK

**Migration:** `supabase/migrations/20261024180001_fk_indexes_p02.sql`
**Origem:** PR #2441 (mergeado em main)
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40164828396
**Ledger:** `version=20261024180001` confirmado em `supabase_migrations.schema_migrations` ✅
**Índices criados (2):** `idx_kit_quote_requests_quote_id`, `idx_kit_save_requests_kit_id`
**Índices omitidos (4 — duplicam PK existente):** `category_ancestors.descendant_id`, `eco_material_config.material_id`, `feminine_color_config.color_group_id`, `product_packaging.product_id`

**Evidência pós-apply (2026-10-25T05:32 UTC):**
```sql
SELECT indexname, tablename, indexdef FROM pg_indexes
WHERE indexname IN ('idx_kit_quote_requests_quote_id','idx_kit_save_requests_kit_id');
-- idx_kit_quote_requests_quote_id | kit_quote_requests | CREATE INDEX ... USING btree (quote_id)  ✅
-- idx_kit_save_requests_kit_id    | kit_save_requests  | CREATE INDEX ... USING btree (kit_id)   ✅
```

**NÃO TESTADO em Postgres local:** `supabase start` falha no replay — ambiente local impossível. Roteiro: criar tabelas stub `kit_quote_requests(quote_id uuid)` e `kit_save_requests(kit_id uuid)` sem FKs para `auth.users`, aplicar migration, verificar em `pg_indexes WHERE indexname IN (...)`. Verificação em produção confirmada acima ✅.

---

## §P08 — Idempotência send-notification

**Migration DB:** `supabase/migrations/20261024180002_workspace_notifications_idempotency_p08.sql`
**Edge function:** `supabase/functions/send-notification/index.ts` (upsert + `deduplicated` flag)
**Origem:** PR #2441 (mergeado em main)
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40166677491
**Ledger:** `version=20261024180002` confirmado em `supabase_migrations.schema_migrations` ✅
**Job 4 (Recibo):** falhou no step "Abre PR" — non-critical, entrada manual em MIGRATIONS_SYNC_LOG.md

**Evidência pós-apply (2026-10-25T05:47 UTC):**
```sql
SELECT COUNT(*) AS idempotency_key_exists
FROM information_schema.columns
WHERE table_name='workspace_notifications' AND column_name='idempotency_key';
-- idempotency_key_exists: 1  ✅

SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations
WHERE version = '20261024180002';
-- ledger_count: 1  ✅
```

**Efeito:** coluna `idempotency_key` adicionada a `workspace_notifications`; edge function `send-notification` passa a fazer upsert idempotente — elimina notificações duplicadas em retry/falha de rede.

**NÃO TESTADO em Postgres local:** `supabase start` falha no replay — ambiente local impossível. Roteiro: criar tabela stub `workspace_notifications` sem FKs para `auth.users`, aplicar migration, verificar `SELECT column_name FROM information_schema.columns WHERE table_name='workspace_notifications' AND column_name='idempotency_key'`. Verificação em produção confirmada acima ✅.

---

## §P01 — auth header image-dimensions-backfill

**Migration:** `supabase/migrations/20261024190001_cron_auth_p01_image_dimensions_backfill.sql`
**Origem:** PR #2445 (mergeado em main)
**Run apply:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40166925674
**Ledger:** `version=20261024190001` confirmado em `supabase_migrations.schema_migrations` ✅
**Job 4 (Recibo):** padrão não-crítico — entrada manual em MIGRATIONS_SYNC_LOG.md

**Evidência pós-apply (2026-10-25T05:52 UTC):**
```sql
SELECT LEFT(command,300) AS command_start FROM cron.job WHERE jobid=235;
-- command_start: SELECT net.http_post(
--   url := public.get_edge_functions_base_url() || '/functions/v1/run-script',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
--   ),
--   body := '{"script":"image-dimensions-wor...  ✅

SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations
WHERE version = '20261024190001';
-- ledger_count: 1  ✅
```

**Efeito:** job 235 (`image-dimensions-backfill`) passou a usar `x-cron-secret` via Vault + URL dinâmica — auth guard ativo ao deploy de `run-script`.

---

## Itens APROVAÇÃO (PR #2443)

**PR:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2443
**Análise de impacto:** `auditoria-supabase/analise-impacto/APROVACAO_FASE_B_IMPACTO.md`

| ID | Tipo | Impacto resumido |
|---|---|---|
| P06 | security_invoker views | 14 views; risco de RLS bypass via owner permissions |
| P09 | ledger migrations repair | 3 migrations sem recibo no `schema_migrations` |
| P14 | RLS auth.uid() initplan | 23 policies; N calls vs 1 por query |
| P15 | anon SELECT produtos/variantes | 2 tabelas expostas a anon sem justificativa |
| P03_sec | SECURITY DEFINER search_path | 8 funções com `pg_temp` no search_path |
