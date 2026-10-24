# FASE B — Registro de Correções Aplicadas

> SSOT: `doufsxqlfjyuvxuezpln` (projeto Gold/Medallion)
> Última atualização: 2026-10-24

---

## STATUS GERAL

| ID | Descrição | Classe | Status | Evidência |
|---|---|---|---|---|
| P03_analyze | ANALYZE em 5 tabelas críticas | AUTÔNOMA | ✅ Aplicado | `pg_stat_user_tables` — ver §P03 |
| P12 | auth header backfill-image-dimensions | AUTÔNOMA | ✅ Já aplicado (pré-existente) | job 222 — ver §P12 |
| P10 | REVOKE fn_cron_guard anon/public | JÁ LIBERADO | ⏳ Aguardando merge PR #2441 | migration `20261022100001` em main |
| P02 | 6 índices FK sem suporte | JÁ LIBERADO | ⏳ Aguardando merge PR #2441 | migration `20261024180001` em PR #2441 |
| P08 (DB) | idempotency_key workspace_notifications | JÁ LIBERADO | ⏳ Aguardando merge PR #2441 | migration `20261024180002` em PR #2441 |
| P08 (EF) | send-notification upsert idempotente | AUTÔNOMA | ⏳ Aguardando merge PR #2441 | `send-notification/index.ts` em PR #2441 |
| P19 (complemento) | auto-block-offenders 5→15 min | JÁ LIBERADO | ⏳ Aguardando merge PR #2441 | migration `20261024180003` em PR #2441 |
| P01 | auth header image-dimensions-backfill | JÁ LIBERADO | ⏳ Aguardando merge PR #2442 | migration `20261024190001` em PR #2442 |
| P06 | security_invoker views | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P09 | ledger migrations repair | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P14 | RLS auth.uid() initplan | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P15 | anon SELECT produtos/variantes | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |
| P03_sec | SECURITY DEFINER search_path | APROVAÇÃO | 🔓 PR #2443 aberto | aguardando PO |

---

## §P03_analyze — ANALYZE 5 tabelas críticas

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

**Conclusão:** P12 não requer migration — já protegido com `x-cron-secret` via Vault.

---

## §P10 — REVOKE fn_cron_guard anon/public

**Migration:** `supabase/migrations/20261022100001_security_fn_cron_guard_revoke_anon.sql`
**PR #2441:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2441
**Status CI:** Em execução (2026-10-24T23:06)
**Pós-merge:** Aplicar via `db-apply-migration.yml` com version `20261022100001`

---

## §P02 — 6 índices FK

**Migration:** `supabase/migrations/20261024180001_fk_indexes_p02.sql`
**PR #2441:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2441
**Índices:** `idx_category_ancestors_descendant_id`, `idx_eco_material_config_material_id`, `idx_feminine_color_config_color_group_id`, `idx_kit_quote_requests_quote_id`, `idx_kit_save_requests_kit_id`, `idx_product_packaging_product_id`
**Pós-merge:** Aplicar via `db-apply-migration.yml` com version `20261024180001`

---

## §P08 — Idempotência send-notification

**Migration DB:** `supabase/migrations/20261024180002_workspace_notifications_idempotency_p08.sql`
**Edge function:** `supabase/functions/send-notification/index.ts` (upsert + `deduplicated` flag)
**PR #2441:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2441
**Pós-merge:** Aplicar migration `20261024180002` + deploy `send-notification` via `deploy-edge-functions.yml`

---

## §P19 (complemento) — auto-block-offenders 5→15 min

**Migration:** `supabase/migrations/20261024180003_cron_schedule_p19_remaining.sql`
**PR #2441:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2441
**Contexto:** Top-3 jobs P19 já redistribuídos em `20261022193000` (incidente 2026-10-22)
**Pós-merge:** Aplicar via `db-apply-migration.yml` com version `20261024180003`

---

## §P01 — auth header image-dimensions-backfill

**Migration:** `supabase/migrations/20261024190001_cron_auth_p01_image_dimensions_backfill.sql`
**PR #2442:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2442
**Detalhe:** job 235 chama `/functions/v1/run-script` sem auth. Migration adiciona `x-cron-secret` via `get_edge_function_secret('CRON_SECRET')` e substitui URL hardcoded por `get_edge_functions_base_url()`.
**Nota:** `run-script` não está deployada — auth guard entrará em vigor ao deploy.
**Pós-merge:** Aplicar via `db-apply-migration.yml` com version `20261024190001`

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
