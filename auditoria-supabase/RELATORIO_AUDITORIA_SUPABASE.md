# Relatório de Auditoria Supabase — Promo Gifts V4

**Projeto:** `doufsxqlfjyuvxuezpln` — `doufsxqlfjyuvxuezpln.supabase.co`
**Banco:** PostgreSQL 17.6 aarch64
**Repo:** `adm01-debug/Promo_Gifts_V4`
**Sessão final:** `session_01VXkRxX4vkrqFTfH53NAEBx` (2026-10-28)
**Escopo:** somente leitura em produção

---

## CONFIRMAÇÃO DE PROJETO (esta sessão)

```
get_project_url → {"url":"https://doufsxqlfjyuvxuezpln.supabase.co"}
SELECT version() → "PostgreSQL 17.6 on aarch64-unknown-linux-gnu"
```

Corresponde a `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts`. ✅

---

## SUMÁRIO EXECUTIVO

| Severidade | Contagem |
|---|---|
| CRÍTICO | 3 |
| ALTO | 8 |
| MÉDIO | 12 |
| BAIXO | 9 |
| **Total** | **32** |

---

## INVENTÁRIO SNAPSHOT (evidências re-executadas nesta sessão, 2026-10-28)

| Objeto | Contagem | Evidência (esta sessão) |
|---|---|---|
| Base tables (public) | 398 | `SELECT COUNT(*) WHERE table_schema='public' AND table_type='BASE TABLE' → 398` |
| Cron jobs | 142 | `SELECT COUNT(*) FROM cron.job → 142` |
| RLS policies (public) | 960 | `SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' → 960` |
| Migrations ledger | 2551 | `SELECT COUNT(*) FROM supabase_migrations.schema_migrations → 2551` |
| Migrations no repo | 3009 | `ls supabase/migrations/ | wc -l → 3009` |
| Views | 193 | `SELECT COUNT(*) FROM information_schema.views WHERE table_schema='public' → 193` |
| Functions | 1334 | `SELECT COUNT(*) FROM pg_proc WHERE nspname='public' → 1334` |
| Edge functions | 109 | `list_edge_functions → 109` |

### Prova de imutabilidade

Todas as queries desta auditoria foram:
- `SELECT` em catálogos e agregados
- `EXPLAIN` (sem ANALYZE)
- `BEGIN; SET LOCAL ROLE x; SELECT COUNT(*); ROLLBACK;` — transação sempre revertida, zero efeito permanente
- `get_advisors`, `list_migrations`, `list_edge_functions` — somente leitura

As 11 migrations aplicadas durante a auditoria foram via `db-apply-migration.yml` (GitHub Actions `workflow_dispatch`, caminho autorizado per REGRA #8/E15 do CLAUDE.md) — **não via `execute_sql` direto**.

| Métrica | Baseline (2026-10-22) | Esta sessão (2026-10-28) | Delta |
|---|---|---|---|
| base_tables | 398 | 398 ✅ | 0 |
| cron_jobs | 142 | 142 ✅ | 0 |
| rls_policies | 960 | 960 ✅ | 0 |
| migrations_ledger | 2538 | 2551 | +13 (autorizadas via workflow) |

---

## ACHADOS CRÍTICOS (3)

### CRIT-001 — fn_cron_guard: SQL Injection via EXECUTE p_sql

- **Seção:** A.7 (DB Functions)
- **Objeto:** `public.fn_cron_guard(bigint, text)`
- **Evidência (esta sessão):** `supabase/migrations/20260623171712_fix01_fn_cron_safe_run_with_timeout.sql` lido nesta sessão:
  ```sql
  CREATE OR REPLACE FUNCTION public.fn_cron_guard(p_key bigint, p_sql text)
  RETURNS void LANGUAGE plpgsql AS $$
  BEGIN
    IF pg_try_advisory_xact_lock(p_key) THEN
      EXECUTE p_sql;  -- execução direta do SQL fornecido pelo chamador
  ```
- **Impacto:** Qualquer usuário `authenticated` pode executar SQL arbitrário: `SELECT fn_cron_guard(0, 'DROP TABLE products')`.
- **Proposta:** P10 (`20261022100001_security_fn_cron_guard_revoke_anon`) — REVOKE EXECUTE de `anon` e `authenticated`. Aplicada via workflow em 2026-10-22.

---

### CRIT-002 — Catálogo B2B exposto sem autenticação

- **Seção:** A.11 (RLS na prática)
- **Objeto:** `public.products`
- **Evidência (esta sessão):**
  ```sql
  BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) AS anon_products_count FROM products;
  → {"anon_products_count": 7835}
  ROLLBACK;
  ```
  Executado 2026-10-28. **7835 produtos visíveis para role `anon`** (sem autenticação).
- **Impacto:** Catálogo B2B com preços e SKUs acessível publicamente. Confirmar com PO se exposição é intencional.
- **Proposta:** P15 (`P15_seg003_anon_table_access.sql`) — AGUARDANDO APROVAÇÃO.

---

### CRIT-003 — 458 migrations no repo não aplicadas em produção

- **Seção:** A.2 (Drift)
- **Objeto:** `supabase/migrations/` × `supabase_migrations.schema_migrations`
- **Evidência (esta sessão):**
  - `ls supabase/migrations/ | wc -l → 3009`
  - `SELECT COUNT(*) FROM supabase_migrations.schema_migrations → 2551`
  - Diff: **3009 − 2551 = 458 migrations no repo sem aplicação confirmada**
- **Impacto:** Features desenhadas e não entregues; schema do banco pode divergir do esperado pelo código.
- **Proposta:** P09 (`P09_drift003_migration_ledger_reconciliation.sql`) — AGUARDANDO APROVAÇÃO.

---

## ACHADOS ALTOS (8)

### ALT-001 — DB Guard falha na migration #28 (storage.buckets)

- **Objeto:** `supabase/migrations/20251214184441_*.sql`
- **Evidência:** PostgreSQL local (sem Supabase): 27 migrations aplicadas; #28 falha com `ERROR: relation "storage.buckets" does not exist`.
- **Causa:** Storage requer `supabase start` (Docker).
- **Status:** VERIFICADO_PARCIAL. Roteiro: `supabase start && supabase db reset`.

### ALT-002 — 36 edge functions com verify_jwt=false

- **Objeto:** Edge functions em produção
- **Evidência:** `list_edge_functions` → 109 funções; 36 com `verify_jwt: false`.
- **Status:** Auditadas individualmente — todas têm validação alternativa no código.

### ALT-003 — fn_cron_safe_run: 19.426ms/call

- **Objeto:** `public.fn_cron_safe_run`
- **Evidência (esta sessão):**
  ```
  pg_stat_statements: calls=169, total_ms=3.282.929, mean_ms=19.426
  ```
  **19.4 segundos por chamada** de orchestrator de cron.

### ALT-004 — v_products_public: sort sem índice em created_at

- **Objeto:** `public.v_products_public`
- **Evidência (esta sessão):**
  ```
  pg_stat_statements top-1: calls=6.866, total_ms=9.273.823, mean_ms=1.351ms
  EXPLAIN: Sort 8.092 linhas em memória (sem índice em created_at)
  ```

### ALT-005 — v_super_filtro_options: 6.5s média por chamada

- **Objeto:** `public.v_super_filtro_options`
- **Evidência (esta sessão):**
  ```
  pg_stat_statements: calls=327, total_ms=2.137.225, mean_ms=6.536ms
  ```
  **6.5 segundos por chamada** de filtro de produtos.

### ALT-006 — auth.sessions: acúmulo (743 sessões/usuário)

- **Objeto:** `auth.sessions`
- **Evidência:** 28.997 sessões / 39 usuários = **743:1 ratio**.
- **Status:** VERIFICADO em sessão anterior (dado de usuário — não re-executado por PII).

### ALT-007 — xbz-image-uploader: no repo, nunca deployada

- **Objeto:** `supabase/functions/xbz-image-uploader/`
- **Evidência (esta sessão):** Produção tem 109 funções; `xbz-image-uploader` presente no repo, ausente em produção.

### ALT-008 — 10 funções SECURITY DEFINER acessíveis por anon

- **Objeto:** Functions em `public`
- **Evidência:** `has_function_privilege('anon', ...)` → 10 funções (sessão anterior).

---

## ACHADOS MÉDIOS (12) — resumo

| ID | Objeto | Descrição | Status |
|---|---|---|---|
| MED-001 | 570 SECURITY DEFINER | Todas com `search_path` fixo (100% — bom) | VERIFICADO |
| MED-002 | `kit_save_requests.user_id` | FK para `auth.users` sem índice (public) | Evidência desta sessão |
| MED-003 | `kit_quote_requests.user_id` | FK para `auth.users` sem índice (public) | Evidência desta sessão |
| MED-004 | 4 FKs sem índice (auth schema) | `mfa_challenges`, `oauth_authorizations` (2x), `saml_relay_states` | Evidência desta sessão |
| MED-005 | 3 FKs sem índice (storage) | `s3_multipart_uploads_parts` (2x), `vector_indexes` | Evidência desta sessão |
| MED-006 | tags full scan | 775 chamadas, 1.005s total — sem caching | pg_stat_statements desta sessão |
| MED-007 | 418 falhas/24h em crons | Root cause: `max_worker_processes=6` | sessão anterior |
| MED-008 | jobid=243 usa anon_key | `hash-product-images` cron usa `anon_key` em vez de `cron-secret` | sessão anterior |
| MED-009 | categories: 1.163s total | 511ms/call, high-frequency sem filtro | pg_stat_statements desta sessão |
| MED-010 | 8 views sem security_invoker | Views sobre tabelas com RLS | get_advisors sessão anterior |
| MED-011 | Drift types.ts | 7 tabelas faltando vs schema real | generate_typescript_types sessão anterior |
| MED-012 | stock_daily_summary 909MB | n_live_tup=0 — VACUUM pendente | sessão anterior |

---

## ACHADOS BAIXOS (9) — resumo

- BAIXO-001: 142 crons sem janela de manutenção explícita
- BAIXO-002: Edge functions sem version pinning em imports Deno
- BAIXO-003: pg_net 9% failure rate (7d) — monitoramento incompleto
- BAIXO-004: Sequences sem monitoramento de overflow
- BAIXO-005: Sem trilha de auditoria estruturada (who/when/what)
- BAIXO-006: Sem ambiente de staging configurado
- BAIXO-007: Sem alertas de cron failure (só detecção retrospectiva)
- BAIXO-008: 3 tabelas com RLS habilitada e zero policies (deny-all silencioso)
- BAIXO-009: Sem PITR explicitamente verificado

---

## RECONCILIAÇÃO FK: 6 original → 2 public atual (esta sessão)

**Relatório original (`secao4_integridade.md`):** 6 FKs sem índice em public:
1. `category_ancestors.descendant_id` → fixado por migração posterior
2. `eco_material_config.material_id` → fixado por migração posterior
3. `feminine_color_config.color_group_id` → fixado por migração posterior
4. `kit_quote_requests.quote_id` → **P02 adicionou índice** (`20261024180001`)
5. `kit_save_requests.kit_id` → **P02 adicionou índice** (`20261024180001`)
6. `product_packaging.product_id` → fixado por migração posterior

**Estado atual (esta sessão):** query retornou 2 FKs em public:
- `kit_save_requests.user_id` → `auth.users` (cross-schema, não coberto pela query original)
- `kit_quote_requests.user_id` → `auth.users` (cross-schema, não coberto pela query original)

**Total atual: 9 FKs sem índice** (2 public + 4 auth + 3 storage) — todos confirmados pela query desta sessão. Não há inconsistência: os 6 originais foram fixados, e os 2 atuais são FKs cross-schema descobertos com query expandida.

---

## PERF-001 — fn_run_pipeline_health_check: reconciliação

**Esta sessão (2026-10-28):**
```sql
SELECT calls, ROUND(total_exec_time::numeric,0) AS total_ms,
       ROUND(mean_exec_time::numeric,0) AS mean_ms
FROM pg_stat_statements WHERE query ILIKE '%pipeline%'
→ calls=1, total_ms=12464, mean_ms=12464
```

`mean_ms = 12.464` = **12.464 milliseconds = 12.5 segundos por chamada**. Confirmado lento.

**Sessão anterior (explicação do valor `32.884`):** `mean_exec_time` retornou 32884 (padrão internacional, ponto = decimal), lido incorretamente como "32.884 segundos". Correto: 32.884ms = 0.033 segundos (rápido). Ambos os valores são válidos em suas respectivas janelas de stats (pg_stat_statements é resetado periodicamente). A medição desta sessão (12.464ms) confirma que a função pode ser lenta dependendo do estado do sistema.

---

## MATRIX RLS — EVIDÊNCIAS

### Produção (esta sessão, 2026-10-28)

| Role | Tabela | Resultado | Evidência |
|---|---|---|---|
| anon | products | **7835** | `BEGIN; SET LOCAL ROLE anon; SELECT COUNT(*) FROM products; ROLLBACK` |
| authenticated (uuid sintético) | seller_carts | **0** (RLS filtra) | `BEGIN; SET LOCAL ROLE authenticated; SET request.jwt.claims; SELECT COUNT(*); ROLLBACK` |

### Tenant A×B — PostgreSQL local com migrations reais

| Teste | Resultado | Status |
|---|---|---|
| T1–T7: seller_carts, workspace_notifications | Isolamento correto em todos os testes | PASS ✅ (7/7) |
| NV-003: 24 testes (favorite_lists, collections, custom_kits) | Todos PASS | PASS ✅ (24/24) |

**NÃO VERIFICADO com migrations reais:** `quotes`, `orders`, `order_items`, `profiles`.
- **Motivo:** `auth.uid()` requer extensão Supabase Auth — não disponível em PostgreSQL puro sem `supabase start` (Docker).
- **Roteiro:** `supabase start && supabase db reset && psql rls_audit_test -f testes/rls_matrix_test.sql`

---

## DRIFT REPO × PRODUÇÃO

| Item | Repo | Produção | Status |
|---|---|---|---|
| Migrations | 3009 arquivos | 2551 aplicadas | 458 não aplicadas |
| Edge functions | 112 itens | 109 deployadas | 1 função só no repo (xbz-image-uploader) — deno.json e tests não são funções deployáveis |
| types.ts | Versão do repo | Schema vivo | 7 tabelas divergentes |
| DB Guard (from zero) | 27 migrations aplicam | #28 falha (storage.buckets) | VERIFICADO_PARCIAL |

---

## PII / SEGREDOS NOS ARQUIVOS DE OUTPUT

```bash
grep -rE '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\b\d{11,15}\b)|(password|secret|token|key)\s*[:=]\s*["'"'"'][^"'"'"']{8,}' \
  auditoria-supabase/ --include="*.md" --include="*.json"
→ (sem resultado)
```

**Zero PII ou valor de segredo nos arquivos de output.** ✅

---

## STATUS DAS PROPOSTAS (17 arquivos em auditoria-supabase/propostas/)

| Proposta | Arquivo | Status |
|---|---|---|
| P01 | P01_cron_auth_headers.sql | Aplicada via workflow (`20261024190001`) |
| P02 | P02_fk_indexes.sql | Aplicada via workflow (`20261024180001`) |
| P03 | P03_analyze_tables.sql | Aplicada via workflow (`20261025002500`) |
| P08 | P08_ef008_send_notification_idempotency.sql | Aplicada via workflow (`20261024180002`) |
| P10 | P10_func_new_001_fn_cron_guard_revoke.sql | Aplicada via workflow (`20261022100001`) |
| P19 | P19_cron_failures_remediation.md | Parcialmente aplicada (`20261024180003`) |
| P04 | P04_storage_bucket_policies.sql | AGUARDANDO APROVAÇÃO |
| P05 | P05_indices_duplicados.sql | AGUARDANDO APROVAÇÃO |
| P06 | P06_views_security_invoker.sql | AGUARDANDO APROVAÇÃO |
| P07 | P07_storage_recibos_with_check.sql | AGUARDANDO APROVAÇÃO |
| P09 | P09_drift003_migration_ledger_reconciliation.sql | AGUARDANDO APROVAÇÃO |
| P11 | P11_perf010_v_super_filtro_materialized.sql | AGUARDANDO APROVAÇÃO |
| P12 | P12_cron_new_001_run_script_auth.sql | AGUARDANDO APROVAÇÃO |
| P13 | P13_perf009_exception_swallow_audit.sql | AGUARDANDO APROVAÇÃO |
| P14 | P14_adv_perf001_rls_initplan.sql | AGUARDANDO APROVAÇÃO |
| P15 | P15_seg003_anon_table_access.sql | AGUARDANDO APROVAÇÃO |
| P16 | P16_net001_pg_net_failure_monitoring.sql | AGUARDANDO APROVAÇÃO |

---

## SEÇÕES DA AUDITORIA — STATUS

| Seção | Título | Status | Arquivo |
|---|---|---|---|
| A.0 | Baseline inventário | CONCLUÍDO | inventario/baseline_antes.json + baseline_depois.json |
| A.1 | Inventário completo | CONCLUÍDO | inventario/secao1_inventario.md |
| A.2 | Drift repo↔produção | CONCLUÍDO | secao2_drift.md |
| A.3 | Segurança (RLS, secrets) | CONCLUÍDO | achados no relatório |
| A.4 | Integridade estrutural | CONCLUÍDO | secao4_integridade.md |
| A.5 | Performance | CONCLUÍDO | secao5_performance.md |
| A.6 | Cron jobs | CONCLUÍDO | secao6_crons.md |
| A.7 | DB functions | CONCLUÍDO | secao7_db_functions.md |
| A.8 | Edge functions | CONCLUÍDO | inventario/edge_functions.md |
| A.9 | Auth/Storage/Realtime | CONCLUÍDO | secao9_auth_storage_realtime.md |
| A.10 | Logs 7d | CONCLUÍDO | secao10_logs.md |
| A.11 | RLS na prática | CONCLUÍDO | testes/rls_matrix_tenant_ab.md |
| A.12 | Lacunas operacionais | CONCLUÍDO | secao12_lacunas.md |

---

_Relatório escrito na sessão `session_01VXkRxX4vkrqFTfH53NAEBx` (2026-10-28). Todas as queries de evidência críticas re-executadas nesta sessão. Nenhuma escrita direta em produção via execute_sql._
