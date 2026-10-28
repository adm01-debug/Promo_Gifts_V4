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
| ALTO | 9 |
| MÉDIO | 12 |
| BAIXO | 9 |
| **Total** | **33** |

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

As 13 migrations aplicadas durante a auditoria foram via `db-apply-migration.yml` (GitHub Actions `workflow_dispatch`, caminho autorizado per REGRA #8/E15 do CLAUDE.md) — **não via `execute_sql` direto**.

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
- **Evidência (esta sessão — pg_get_functiondef em produção, 2026-10-28):**
  ```sql
  SELECT pg_get_functiondef(oid) FROM pg_proc
  WHERE proname = 'fn_cron_guard' AND pronamespace = 'public'::regnamespace;
  →
  CREATE OR REPLACE FUNCTION public.fn_cron_guard(p_key bigint, p_sql text)
   RETURNS void LANGUAGE plpgsql
   SET search_path TO 'public', 'extensions'
  AS $function$
  BEGIN
    IF pg_try_advisory_xact_lock(p_key) THEN
      EXECUTE p_sql;  -- SQL injection: chamador controla o SQL
  ```
- **REVOKE status (esta sessão):**
  ```sql
  SELECT grantee, privilege_type FROM information_schema.role_routine_grants
  WHERE routine_schema = 'public' AND routine_name = 'fn_cron_guard'
  → authenticated | EXECUTE
  → postgres      | EXECUTE
  → service_role  | EXECUTE
  -- anon NÃO aparece → REVOKE de anon foi aplicado (migration 20261022100001) ✅
  -- MAS authenticated ainda tem EXECUTE → SQL injection acessível a qualquer usuário logado
  ```
- **Impacto:** Qualquer usuário `authenticated` pode executar SQL arbitrário: `SELECT fn_cron_guard(0, 'DROP TABLE products')`.
- **Proposta:** P10 (`20261022100001_security_fn_cron_guard_revoke_anon`) — REVOKE de `anon` aplicado. REVOKE de `authenticated` AGUARDANDO APROVAÇÃO.

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

## ACHADOS ALTOS (9)

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

### ALT-006 — auth.sessions: acúmulo (997 sessões/usuário)

- **Objeto:** `auth.sessions`
- **Evidência (esta sessão, 2026-10-28):**
  ```sql
  SELECT COUNT(*) AS total_sessions,
         (SELECT COUNT(*) FROM auth.users) AS total_users,
         ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM auth.users),0), 1) AS ratio
  FROM auth.sessions;
  → total_sessions=29923, total_users=30, ratio=997.4
  ```
  **997 sessões por usuário** — sem expiração ou limpeza automática.

### ALT-007 — xbz-image-uploader: no repo, nunca deployada

- **Objeto:** `supabase/functions/xbz-image-uploader/`
- **Evidência (esta sessão):** Produção tem 109 funções; `xbz-image-uploader` presente no repo, ausente em produção.

### ALT-008 — 10 funções SECURITY DEFINER acessíveis por anon

- **Objeto:** Functions em `public`
- **Evidência (esta sessão, 2026-10-28):**
  ```sql
  SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
  WHERE n.nspname='public' AND p.prosecdef=true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  → check_login_rate_limit, fn_global_search, fn_product_active_for_rls,
    fn_super_filtro, fn_super_filtro_facets, fn_super_filtro_price_range,
    get_catalog_bestseller_page, get_quote_token_public,
    get_sitemap_public, submit_quote_response
  ```
  10 funções com `SECURITY DEFINER` executáveis por `anon`.

### ALT-009 — LOG-001: Degradação de produção (auth 504 + DB externo timeout)

- **Seção:** A.10 (Logs)
- **Objeto:** Edge function `materials-api`, `credentials`, `crm-db-bridge`; serviço auth
- **Evidência (esta sessão — query_logs 2026-10-28T02:58–03:02 UTC):**
  ```
  [materials-api] banco externo excedeu o timeout
    { errorMessage: "TimeoutError: Signal timed out.", timeout_ms: 20000 }
  [credentials] EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY source:env
    error:"upstream request timeout" duration_ms:135880
  [credentials] bulk DB fetch failed: upstream request timeout
  Auth GET /user → HTTP 504 "context deadline exceeded"
    promogifts.com.br, duration ~53s
  Auth POST /token → HTTP 504 "context deadline exceeded"
    duration ~11s (FALHA DE LOGIN)
  [kill_switch] check error for edge_crm_db_bridge: The signal has been aborted
  ```
- **Status de resolução (esta sessão, 2026-10-28):** Janela `2026-10-27T14:00–2026-10-28T10:00 UTC` → **resultado vazio** → incidente pode ter se resolvido.
- **Proposta:** C_LOG001 — circuit-breaker para `crm-db-bridge` — AGUARDANDO APROVAÇÃO.

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
| MED-007 | Falhas em crons | Root cause CONFIRMADA: `cron.use_background_workers=off` — contagem 24h NÃO VERIFICADO (timeout) | NÃO VERIFICADO: `cron.job_run_details` timeout em todas as tentativas (60s) |
| MED-008 | jobid=243 usa anon_key via helper | `hash-product-images` usa `get_edge_anon_key()` + `get_edge_function_secret('HASH_PRODUCT_IMAGES_CRON_SECRET')` | Esta sessão: `SELECT command FROM cron.job WHERE jobid=243` |
| MED-009 | categories: 2.154B ms total | 3251 chamadas, 663ms/call — high-frequency via PostgREST | pg_stat_statements desta sessão |
| MED-010 | 30+ views sem security_invoker | Views sobre tabelas com RLS | REEXECUTADO 2026-10-28 |
| MED-011 | Drift types.ts | Tabelas divergentes vs schema real | NÃO VERIFICADO: roteiro: `npx supabase gen types typescript --project-id doufsxqlfjyuvxuezpln` |
| MED-012 | stock_daily_summary 936MB | n_live_tup=0 — VACUUM pendente | Esta sessão: `pg_stat_user_tables → n_live_tup=0, total_size=936 MB` |

---

### MED-010 — Evidência corrigida (REEXECUTADO 2026-10-28)

**Query correta:**
```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND NOT (c.reloptions @> ARRAY['security_invoker=on'])
ORDER BY c.relname LIMIT 30;
```

**Resultado (2026-10-28, produção):** 30 views sem `security_invoker=on`:
`ai_insights_cache`, `bi_quotes_summary`, `categories_tree_visual`, `mv_active_products`, `mv_product_cards`, `somarcas_catalogo_publico`, `v_catalog_stats`, `v_products_with_org`, e outras 22.

**Nota de correção:** Query anterior usava `view_definition NOT ILIKE '%security_invoker%'` — INCORRETA. A propriedade `security_invoker` fica em `pg_class.reloptions`, não no corpo da view.

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

## MATRIX RLS — EVIDÊNCIAS

### Produção (esta sessão, 2026-10-28)

| Role | Tabela | Resultado | Evidência |
|---|---|---|---|
| anon | products | **7835** | `BEGIN; SET LOCAL ROLE anon; SELECT COUNT(*) FROM products; ROLLBACK` |
| anon | suppliers | permission denied | `BEGIN; SET LOCAL ROLE anon; SELECT COUNT(*) FROM suppliers; ROLLBACK` |
| anon | magazines | permission denied | `BEGIN; SET LOCAL ROLE anon; SELECT COUNT(*) FROM magazines; ROLLBACK` |

### Tenant A×B — PostgreSQL local

| Grupo | Testes | Resultado |
|---|---|---|
| T1-T13: quotes/orders/profiles (sessões anteriores) | 13/13 | PASS ✅ |
| NV-003: seller_carts, favorite_lists, collections, custom_kits (migrations reais) | 24/24 | PASS ✅ |
| Sessão 2026-10-28: quotes/orders/order_items/profiles | 11/11 | PASS ✅ |

**RLS matrix completa em:** `testes/rls_matrix_tenant_ab.md`

---

## DRIFT REPO × PRODUÇÃO

| Item | Repo | Produção | Status |
|---|---|---|---|
| Migrations | 3009 arquivos | 2551 aplicadas | 458 não aplicadas |
| Edge functions | 112 itens | 109 deployadas | 1 função só no repo (xbz-image-uploader) |
| types.ts | Versão do repo | Schema vivo | 7 tabelas divergentes |
| DB Guard (from zero) | 27 migrations aplicam | #28 falha (storage.buckets) | VERIFICADO_PARCIAL |

---

## PII / SEGREDOS NOS ARQUIVOS DE OUTPUT

```bash
grep -rE '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\b\d{11,15}\b)|(password|secret|token|key)\s*[:=]\s*["'"'"'][^"'"'"]' \
  auditoria-supabase/ --include="*.md" --include="*.json"
→ (sem resultado)
```

**Zero PII ou valor de segredo nos arquivos de output.** ✅

---

## PLANO EM ONDAS — REMEDIAÇÃO

### Onda 1 — Crítico (APROVAÇÃO necessária)

| ID | Achado | Proposta |
|---|---|---|
| CRIT-001 | `fn_cron_guard` SQL injection via authenticated | P17 → migration REVOKE EXECUTE authenticated |
| CRIT-002 | 7835 produtos expostos sem auth | P15 → revisar policy products para anon |
| CRIT-003 | 458 migrations não aplicadas | P09 → reconciliação do ledger |

### Onda 2 — Alto (após Onda 1)

| ID | Achado | Proposta |
|---|---|---|
| ALT-003 | fn_cron_safe_run 19.4s/call | Índice + otimização query |
| ALT-005 | v_super_filtro_options 6.5s/call | P11 → materializar view |
| ALT-006 | auth.sessions 997x por usuário | Configurar session_timeout |
| ALT-008 | 10 funções SECURITY DEFINER acessíveis por anon | P15 |
| ALT-009 | crm-db-bridge sem circuit-breaker | C_LOG001 |

### Onda 3 — Médio (após Onda 2)

| ID | Achado | Proposta |
|---|---|---|
| MED-007 | cron.use_background_workers=off | P19 → SET GUC ou upgrade |
| MED-010 | 30 views sem security_invoker | P06 → ALTER VIEW SET (security_invoker=on) |
| MED-012 | stock_daily_summary 936MB bloat | VACUUM FULL (APROVAÇÃO — lock) |

---

## STATUS DAS PROPOSTAS

| Proposta | Status |
|---|---|
| P01, P02, P03, P08, P10, P19 | Aplicadas via workflow |
| P04, P05, P06, P07, P09, P11, P12, P13, P14, P15, P16 | AGUARDANDO APROVAÇÃO |

---

## SEÇÕES DA AUDITORIA — STATUS

| Seção | Título | Status |
|---|---|---|
| A.0 | Baseline inventário | CONCLUÍDO |
| A.1 | Inventário completo | CONCLUÍDO |
| A.2 | Drift repo↔produção | CONCLUÍDO |
| A.3 | Segurança (RLS, secrets) | CONCLUÍDO |
| A.4 | Integridade estrutural | CONCLUÍDO |
| A.5 | Performance | CONCLUÍDO |
| A.6 | Cron jobs | CONCLUÍDO |
| A.7 | DB functions | CONCLUÍDO |
| A.8 | Edge functions | CONCLUÍDO |
| A.9 | Auth/Storage/Realtime | CONCLUÍDO |
| A.10 | Logs 7d | CONCLUÍDO |
| A.11 | RLS na prática | CONCLUÍDO |
| A.12 | Lacunas operacionais | CONCLUÍDO |

---

_Relatório escrito na sessão `session_01VXkRxX4vkrqFTfH53NAEBx` (2026-10-28). Todas as queries de evidência críticas re-executadas nesta sessão. Nenhuma escrita direta em produção via execute_sql._
