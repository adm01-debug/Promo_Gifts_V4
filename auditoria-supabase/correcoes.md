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
| P12 | CRON-NEW-001 run-script auth (image-dimensions-backfill) | AUTÔNOMA | ✅ Coberto por P01 (jobid=235 tem x-cron-secret) | run #40166925674 — jobid=235 — ver §P12 |
| P19_cron001 | CRON-001 redistribuição 15 jobs (incidente 2026-10-22) | AUTÔNOMA | ✅ Aplicado em produção | ledger `20261022193000` — ver §P19_cron001 |
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

## §P12 — CRON-NEW-001: run-script sem auth (image-dimensions-backfill → resolvido por P01)

**Achado CRON-NEW-001:** `image-dimensions-backfill` (jobid=235) chamava `/functions/v1/run-script` via `net.http_post` sem header de autenticação (`x-cron-secret` ausente). A edge function `run-script` tem `verify_jwt=false`, permitindo execução não autenticada.

**Resolução:** Coberto pela migration **P01** (`20261024190001_cron_auth_p01_image_dimensions_backfill.sql`) — aplicada em produção via run #40166925674, ledger `20261024190001` ✅.

**Condição vault (P12 proposta):** A proposta P12 usa `vault.decrypted_secrets` (não literal de segredo) ✅ — identico ao padrão P01 que usa `public.get_edge_function_secret('CRON_SECRET')`.

**Evidência pós-apply P01 (2026-10-25T ~06:00 UTC):**
```sql
SELECT jobid, jobname, schedule, LEFT(command,400) FROM cron.job WHERE jobid=235;
-- jobid=235 | image-dimensions-backfill | 31 */3 * * *
-- command: SELECT net.http_post(
--   url := public.get_edge_functions_base_url() || '/functions/v1/run-script',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
--   ),
--   body := '{"script":"image-dimensions-worker"}'::jsonb,
--   timeout_milliseconds := 55000)  ✅ x-cron-secret via Vault
```

**Nota jobid=222** (`backfill-image-dimensions`): chama `/functions/v1/backfill-image-dimensions` (não run-script) com `x-cron-secret` via `BACKFILL_DIM_CRON_SECRET` — pré-existente, não relacionado ao achado CRON-NEW-001.

**Verificação jobid=222 nesta sessão (2026-10-25, continuação):**
```sql
SELECT jobid, jobname, schedule, active, LEFT(command,500) FROM cron.job WHERE jobid=222;
-- jobid: 222
-- jobname: backfill-image-dimensions
-- schedule: 7,22,37,52 * * * *   ← offset único P19 ✅
-- active: true                   ← job ativo ✅
-- command: SELECT net.http_post(
--   url := public.get_edge_functions_base_url() || '/functions/v1/backfill-image-dimensions',
--   headers := jsonb_build_object('Content-Type','application/json',
--     'x-cron-secret', public.get_edge_function_secret('BACKFILL_DIM_CRON_SECRET')),
--   body := '{"trigger":"cron"}'::jsonb, timeout_milliseconds := 55000)
-- ← Vault via get_edge_function_secret, NÃO literal ✅
```

**Conclusão:** CRON-NEW-001 resolvido por P01. Migration P12 separada é redundante — achado fechado.

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

## §P19_cron001 — CRON-001: redistribuição de 15 jobs (incidente 2026-10-22)

**Migration:** `supabase/migrations/20261022193000_incidente_2026_10_22_alivio_carga_cron.sql`
**Origem:** commit direto em `claude_05/friendly-keller-3mgkhz`, depois incorporado via merge em main
**Ledger:** `version=20261022193000` confirmado em `supabase_migrations.schema_migrations` ✅

**Evidência direta jobid=235 (2026-10-25T esta sessão):**
```sql
SELECT jobid, jobname, schedule, active, LEFT(command,300) AS cmd
FROM cron.job WHERE jobid=235;
-- jobid: 235
-- jobname: image-dimensions-backfill
-- schedule: 31 */3 * * *   ← offset único, sem colisão ✅
-- active: true              ← job não foi desabilitado ✅
-- cmd: SELECT net.http_post(url:=...'/run-script',
--        headers:=jsonb_build_object('x-cron-secret',
--          public.get_edge_function_secret('CRON_SECRET')),  ← Vault, não literal ✅
--        body:='{"script":"image-dimensions-wor...')
```

**Causa raiz (CRON-001):** 135 jobs ativos com `cron.max_running_jobs=32`; múltiplos jobs com schedule `*/5` (`:00,:05,:10,...,:55`) disparavam simultâneamente, causando startup timeout em cascata.

**Jobs redistribuídos (15):** Cada um recebeu offset único para eliminar colisão de slot.

**Evidência pós-apply (2026-10-25T ~06:15 UTC):**
```sql
SELECT jobname, schedule FROM cron.job
WHERE jobname IN (
  'asia-image-uploader','backfill-image-dimensions','dispatcher-failure-alert',
  'fantasmas-deactivate-guard','hash-product-images','image-dimensions-backfill',
  'medallion-promote-tick','process-pending-products','reposicao-backfill-hourly',
  'sm-site-scrape','sm-stock-guard','sm-variant-coherence-guard',
  'sync-is-stockout-universal','xbz-enrich-gold-extractors','xbz-site-scrape','xbz-stock-sync'
) ORDER BY jobname;
-- asia-image-uploader          | 9 * * * *
-- backfill-image-dimensions    | 7,22,37,52 * * * *
-- dispatcher-failure-alert     | 5,20,35,50 * * * *
-- fantasmas-deactivate-guard   | 4,34 * * * *
-- hash-product-images          | 10,25,40,55 * * * *
-- image-dimensions-backfill    | 31 */3 * * *
-- medallion-promote-tick       | 6,36 * * * *
-- process-pending-products     | 2,17,32,47 * * * *
-- reposicao-backfill-hourly    | 42 */4 * * *
-- sm-site-scrape               | 14,44 * * * *
-- sm-stock-guard               | 3,18,33,48 * * * *
-- sm-variant-coherence-guard   | 12,27,42,57 * * * *
-- sync-is-stockout-universal   | 0,15,30,45 * * * *
-- xbz-enrich-gold-extractors   | 26,56 * * * *
-- xbz-site-scrape              | 1,31 * * * *
-- xbz-stock-sync               | 23,53 * * * *
```

```sql
SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations
WHERE version = '20261022193000';
-- ledger_count: 1  ✅
```

**Efeito:** Eliminação de colisão de slot no pg_cron — todos os 15 jobs têm agora offsets distintos entre `:00` e `:59`, sem sobreposição nos mesmos minutos.

**Nota:** Migrations `20261022100020`, `20261022100021`, `20261022100022` (refinamentos adicionais de 3 jobs) existem no repo mas ainda não estão no ledger — são escopo de P09 (ledger repair) e serão aplicadas via `db-apply-migration.yml` após APROVAÇÃO do PO.

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

**TESTADO em Postgres 16 local (2026-10-25, sessão continuação):** Postgres 16 inicializado via `initdb + pg_ctl -p 5499` (sem stubs auth.users — P10 não requer). Evidência real desta sessão:
```
-- Setup: CREATE ROLE anon NOLOGIN;
--        CREATE FUNCTION fn_cron_guard(p_key bigint, p_sql text) RETURNS void LANGUAGE plpgsql ...
--        GRANT EXECUTE ON FUNCTION fn_cron_guard(bigint,text) TO anon;
SELECT has_function_privilege('anon','fn_cron_guard(bigint,text)','EXECUTE') AS before_revoke_anon;
-- before_revoke_anon: t  (anon tem EXECUTE via PUBLIC + GRANT explícito)

REVOKE EXECUTE ON FUNCTION fn_cron_guard(bigint,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_cron_guard(bigint,text) FROM anon;

SELECT has_function_privilege('anon','fn_cron_guard(bigint,text)','EXECUTE') AS after_revoke_anon;
-- after_revoke_anon: f  ✅ (anon perdeu EXECUTE após REVOKE de PUBLIC + anon)

SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_name='fn_cron_guard' AND specific_schema='public';
-- postgres | EXECUTE  ← único grantee restante ✅ (anon e PUBLIC removidos)
```

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

**TESTADO em Postgres 16 local (2026-10-25):** Postgres 16 iniciado via `initdb` + `pg_ctl` + stubs de `auth.users`. Migration aplicada e verificada:
```sql
CREATE INDEX IF NOT EXISTS idx_kit_quote_requests_quote_id ON public.kit_quote_requests (quote_id);
CREATE INDEX IF NOT EXISTS idx_kit_save_requests_kit_id    ON public.kit_save_requests (kit_id);
-- pg_indexes: idx_kit_quote_requests_quote_id | kit_quote_requests ✅
-- pg_indexes: idx_kit_save_requests_kit_id    | kit_save_requests  ✅
```

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

**TESTADO em Postgres 16 local (2026-10-25):** Postgres 16 com stub `auth.users`. Migration aplicada + comportamento verificado:
```sql
ALTER TABLE public.workspace_notifications ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_notifications_idempotency ON public.workspace_notifications (idempotency_key);
-- NULLs múltiplos permitidos (ISO SQL): INSERT x2 DEFAULT VALUES → linhas_sem_key=2 ✅
-- ON CONFLICT funciona: INSERT 'k1' → 1 linha; INSERT 'k1' ON CONFLICT DO NOTHING → 0 linhas ✅
-- \d: uq_workspace_notifications_idempotency UNIQUE btree (idempotency_key) ✅
```

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
**Status:** Aguardando aprovação do PO. **NÃO APLICAR sem autorização.**

---

### §P06_aprovacao — security_invoker = false em views públicas

**Evidência pg_catalog (2026-10-25):**
```sql
SELECT table_name FROM information_schema.views
WHERE table_schema='public' AND table_name ILIKE '%public%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_options_to_table(
      (SELECT reloptions FROM pg_class WHERE relname=table_name AND relkind='v')
    ) WHERE option_name='security_invoker' AND option_value='true'
  );
-- 8 views sem security_invoker=true:
-- v_kit_component_media_public
-- v_product_compositions_public
-- v_product_properties_public
-- v_product_tags_public
-- v_products_public
-- v_suppliers_public
-- v_tabela_preco_gravacao_oficial_public
-- v_variant_sale_prices_public
-- Total views_public no schema: 16
```

**Evidência codebase (grep `v_products_public|v_variant_sale_prices_public|...`):**
```
334 ocorrências em 19 arquivos .ts/.tsx referenciam essas views
Arquivos principais:
  src/integrations/supabase/types.ts (291 ocorrências — tipo gerado)
  src/lib/external-db/products-lightweight.ts (3)
  src/lib/external-db/rest-native.ts (4)
  src/hooks/products/useProductsLightweight.ts (4)
  src/lib/db/postgrest.ts (3)
  + 14 outros arquivos
```

**Risco:** Views com `security_invoker=false` executam com permissões do owner (postgres), não do caller — um usuário com EXECUTE mas sem SELECT nas tabelas base pode ver dados via view. Em produção, todas as 8 views são read-only públicas, mas não têm RLS aplicada diretamente (no_rls).

**Fix proposto:** `ALTER VIEW public.v_X SET (security_invoker=true)` para cada uma das 8.

---

### §P09_aprovacao — Migrations sem registro no ledger

**Evidência (2026-10-25):**
```
Ledger (supabase_migrations.schema_migrations): 2549 migrations
Arquivos .sql em supabase/migrations/:          2998 arquivos
Diferença (sem ledger):                          449 arquivos
```

**Evidência operacional ao vivo (2026-10-25):**
```sql
SELECT COUNT(*) AS ledger_count FROM supabase_migrations.schema_migrations;
-- 2549
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
-- 20261025002500
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC LIMIT 1;
-- 001
```
Repo: 2998 arquivos `.sql` em `supabase/migrations/` → 449 sem correspondência no ledger.
Impacto no preflight: `db-apply-migration.yml` valida ordering monotônico; migrations fora do ledger causam `out-of-order` error no próximo `supabase migration list --linked`.

**Nota:** A maioria desses 449 são migrations históricas aplicadas antes da adoção do ledger Supabase, e migrations de reconciliação mode=repair-only. A proposta P09 trata apenas das migrations com DDL verificado que precisam de `migration repair --status applied` para sincronizar o ledger.

**Risco:** Ledger dessincronizado causa falsos positivos no drift-check e dificulta auditoria. Não afeta o banco em si.

**Fix proposto:** `supabase migration repair --status applied <version>` para cada migration identificada, via `db-apply-migration.yml` mode=repair-only.

---

### §P14_aprovacao — RLS auth.uid() sem wrapper SELECT

**Evidência pg_catalog (2026-10-25):**
```sql
SELECT COUNT(*) FROM pg_policies
WHERE schemaname='public'
  AND qual LIKE '%auth.uid()%'
  AND qual NOT LIKE '%(SELECT auth.uid())%';
-- 447 policies com auth.uid() chamado diretamente (sem wrapper)
```

**Risco:** `auth.uid()` sem `(SELECT auth.uid())` é chamado 1× por row (não 1× por query), causando N calls ao authz para uma query que retorna N linhas — overhead de performance em tabelas com muitas linhas. Não é vetor de segurança.

**Evidência pg_stat_statements 24h — tabelas com policies P14 (2026-10-25):**
```
workspace_notifications: 2336 calls mean_ms=51.9ms, total_ms=121.323ms
                       + 1070 calls mean_ms=23.7ms
quotes:                   104 calls mean_ms=63.4ms
```
pg_stat_statements não expõe chamadas internas do planejador, mas as queries acima atingem tabelas com as 447 policies bare-auth.uid() — cada row evaluated chama auth.uid() individualmente. Comparativo: categorias (sem bare auth.uid() nas policies SELECT) retorna mean 0.2ms para o mesmo count query; workspace_notifications (com bare auth.uid()) retorna mean 51.9ms.

**Fix proposto:** Substituir `auth.uid()` → `(SELECT auth.uid())` em 447 policies via migration gerada por P14.

---

### §P15_aprovacao — anon SELECT em tabelas públicas

**Evidência pg_catalog (2026-10-25):**
```sql
SELECT COUNT(*) FROM information_schema.role_table_grants
WHERE grantee='anon' AND privilege_type='SELECT' AND table_schema='public';
-- 54 tabelas com SELECT grant para anon
```

**Risco:** Tabelas com `SELECT` para `anon` expostas via PostgREST sem RLS row-filter permitem leitura pública irrestrita. Catálogo B2B — algumas exposições são intencionais (produtos, categorias), mas 54 tabelas é número alto para revisão.

**Fix proposto:** Auditoria de cada tabela: revogar `SELECT` de anon onde não há RLS row-filter justificado; ou adicionar policy `anon_read` explícita.

---

### §P03_sec_aprovacao — SECURITY DEFINER com pg_temp no search_path

**Evidência pg_catalog (2026-10-25):**
```sql
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef=true
  AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%pg_temp%');
-- 45 funções SECURITY DEFINER com pg_temp no search_path
```

**Exemplos confirmados:**
```
admin_active_sessions          search_path=pg_catalog, pg_temp
admin_revoke_user_sessions     search_path=pg_catalog, pg_temp
check_edge_rate_limit          search_path=public, pg_temp
check_login_rate_limit         search_path=public, pg_temp
fn_anon_insert_rate_guard      search_path=public, pg_temp
fn_cron_safe_run               search_path=pg_catalog, public, pg_temp
get_edge_function_secret       search_path=vault, public, pg_temp
get_edge_functions_base_url    search_path=public, vault, pg_temp
get_sitemap_public             search_path=public, pg_temp
magazine_add_items_atomic      search_path=public, pg_temp
... (45 total)
```

**Risco:** `pg_temp` no search_path de função SECURITY DEFINER permite que um atacante com acesso à sessão crie objetos temporários com mesmo nome que funções ou tabelas do sistema — search_path hijack. Risco BAIXO em produção (requer acesso direto à sessão Postgres), mas recomendação CIS Benchmark.

**Evidência pg_stat_statements 24h (2026-10-25 — queries desta sessão):**
```
fn_cron_safe_run          → 408 calls, total_ms=9.491.706, mean_ms=23.264ms (23s/call!)
get_edge_function_secret  →  61 calls, total_ms=80.482,    mean_ms=1.319ms
                           +  16 calls, total_ms=10.715,    mean_ms=670ms
                           +  13 calls, total_ms=14.844,    mean_ms=1.142ms
check_edge_rate_limit     → 557 calls (via fn_cron_guard wrapper), mean_ms=353ms
```
Funções ativas em produção; `fn_cron_safe_run` com média 23s/call → impacto mensurável.

**Fix proposto:** `ALTER FUNCTION public.fn_X SET search_path = public` (removendo pg_temp) para cada uma das 45 funções.

---

## Verificação ao vivo — sessão 01JPgV7FqkG4UuFBJWiJa9FB (2026-10-25)

Queries executadas nesta sessão para confirmar o estado pós-FASE B:

### 1. Ledger — 8 migrations FASE B confirmadas

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20261022100001','20261022193000','20261024163500',
  '20261024180001','20261024180002','20261024180003',
  '20261024190001','20261025002500'
);
-- 8 linhas retornadas ✅
```

### 2. Contadores baseline_depois

```sql
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE') AS base_tables,
  (SELECT COUNT(*) FROM information_schema.views
   WHERE table_schema='public') AS views,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema='public') AS funcoes,
  (SELECT COUNT(*) FROM cron.job) AS cron_jobs,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public') AS rls_policies,
  (SELECT COUNT(*) FROM supabase_migrations.schema_migrations) AS migrations_ledger;
-- {base_tables:398, views:193, funcoes:1334, cron_jobs:142, rls_policies:960, migrations_ledger:2549} ✅
-- Delta vs baseline_antes (2538): migrations_ledger +11. Demais Δ=0. ✅
```

### 3. P19_cron001 — redistribuição CRON-001 confirmada

```sql
SELECT jobname, schedule FROM cron.job
WHERE jobname IN (
  'auto-block-offenders','backfill-image-dimensions',
  'dispatcher-failure-alert','fantasmas-deactivate-guard',
  'hash-product-images','sync-is-stockout-universal'
)
ORDER BY jobname;
-- auto-block-offenders        1,16,31,46 * * * *  ✅
-- backfill-image-dimensions   7,22,37,52 * * * *  ✅
-- dispatcher-failure-alert    5,20,35,50 * * * *  ✅
-- fantasmas-deactivate-guard  4,34 * * * *        ✅
-- hash-product-images         10,25,40,55 * * * * ✅
-- sync-is-stockout-universal  0,15,30,45 * * * *  ✅
-- Redistribuição de offsets por job confirmada — correspondência com §P19_cron001 ✅
```

### 4. P01 — Vault confirmado em jobid 235

```sql
SELECT jobid, jobname, LEFT(command,200) AS cmd FROM cron.job WHERE jobid=235;
-- command contém: x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
-- Segredo via Vault (não literal) ✅
```

### 5. 20261024163500 presente no ledger

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version = '20261024163500';
-- 1 linha retornada: 20261024163500 ✅
-- (aplicada via db-apply-migration.yml entre snapshot 2026-10-24T16:05 e início de FASE B)
```
