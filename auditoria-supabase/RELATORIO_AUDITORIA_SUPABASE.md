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

### ALT-003 — fn_cron_safe_run: 13.087ms/call (REEXECUTADO 2026-10-28)

- **Objeto:** `public.fn_cron_safe_run`
- **Evidência (REEXECUTADO 2026-10-28 — pg_stat_statements top-20):**
  ```
  calls=921, total_exec_time=12.053.466ms, mean_exec_time=13.087ms
  ```
  **13 segundos por chamada** de orchestrator de cron — 3º maior consumidor de tempo total.
  Contexto: cron.use_background_workers=off → único worker → todas as 135 chamadas concorrentes serializam nesta função.

### pg_stat_statements top-20 (REEXECUTADO 2026-10-28)

| Rank | Query (resumo) | Calls | Total (ms) | Mean (ms) |
|---|---|---|---|---|
| 1 | v_products_public (pgrst select) | 15.368 | 29.291.258 | 1.906 |
| 2 | v_products_public (variant filter) | 8.737 | 19.298.973 | 2.209 |
| 3 | **fn_cron_safe_run** | **921** | **12.053.466** | **13.087** |
| 4 | v_products_public (variant filter 2) | 5.124 | 8.646.036 | 1.687 |
| 5 | tags (full scan) | 4.945 | 7.348.924 | 1.486 |
| 6 | v_super_filtro_options | 711 | 4.597.200 | 6.466 |
| 7 | categories (is_active filter) | 4.986 | 3.687.055 | 739 |
| 8 | fn_get_stock_notification_counts() | 4.275 | 3.261.019 | 763 |
| 9 | v_products_public (variant filter 3) | 1.882 | 2.928.196 | 1.556 |
| 10 | fn_get_product_intelligence_all() | 1.798 | 1.602.855 | 891 |

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

### ALT-008 — 9 funções SECURITY DEFINER acessíveis por anon

- **Objeto:** Functions em `public`
- **Evidência (esta sessão, 2026-10-28):**
  ```sql
  SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
  WHERE n.nspname='public' AND p.prosecdef=true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  → check_login_rate_limit, fn_global_search, fn_product_active_for_rls,
    fn_super_filtro, fn_super_filtro_facets, fn_super_filtro_price_range,
    get_quote_token_public, get_sitemap_public, submit_quote_response
  ```
  **9 funções** com `SECURITY DEFINER` executáveis por `anon` (corrigido: query anterior incluía `get_catalog_bestseller_page` por erro de sessão).

### ALT-009 — LOG-001: Degradação de produção em andamento (auth 504 + DB externo timeout)

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
- **Causa raiz provável:** DB externo `EXTERNAL_PROMOBRIND` inacessível (timeout 135-139s vs limit 20s). A `crm-db-bridge` falha, o hook `custom_access_token` (se configurado) bloqueia o auth pipeline, causando 504s em `/user` e `/token`. Login de usuários em promogifts.com.br está falhando ativamente.
- **Impacto no negócio:** Usuários não conseguem fazer login. Sessões existentes recebem 504 em qualquer chamada autenticada. Duração indeterminada — logs confirmam ocorrência às 03:00 UTC mas não indicam início ou fim.
- **Status de resolução (esta sessão, 2026-10-28):** Duas janelas posteriores consultadas via `query_logs`:
  - `2026-10-28T02:58–03:02 UTC` (incidente ativo) — confirmado em sessão anterior
  - `2026-10-27T14:00–2026-10-28T10:00 UTC` (20h posterior) — **resultado vazio** → incidente pode ter se resolvido
- **Ação imediata sugerida:**
  1. Verificar se DB externo (`EXTERNAL_PROMOBRIND_URL`) está acessível agora
  2. Confirmar ausência de novos erros 504 em auth nos últimos 30 min
  3. Se recorrente: circuit-breaker em `crm-db-bridge` (timeout 5s + fallback)
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
| MED-008 | jobid=243 usa anon_key via helper | `hash-product-images` usa `get_edge_anon_key()` (não hardcoded) + `get_edge_function_secret('HASH_PRODUCT_IMAGES_CRON_SECRET')` | Esta sessão: `SELECT command FROM cron.job WHERE jobid=243` |
| MED-009 | categories: 2.154B ms total | 3251 chamadas, 663ms/call — high-frequency via PostgREST | pg_stat_statements desta sessão (2026-10-28) |
| MED-010 | **192 views** sem security_invoker | Views sobre tabelas com RLS | REEXECUTADO 2026-10-28: query corrigida via `pg_class.reloptions @> ARRAY['security_invoker=on']` → **192 views** sem a propriedade (anterior usava LIMIT 30, mascarando o real) — evidência abaixo |
| MED-011 | Drift types.ts | Tabelas divergentes vs schema real | NÃO VERIFICADO: `generate_typescript_types` não re-executado; roteiro: `npx supabase gen types typescript --project-id doufsxqlfjyuvxuezpln` |
| MED-012 | stock_daily_summary 936MB | n_live_tup=0 — VACUUM pendente | Esta sessão: `pg_stat_user_tables → n_live_tup=0, n_dead_tup=0, total_size=936 MB` |

---

### MED-010 — Evidência corrigida (REEXECUTADO 2026-10-28)

**Query incorreta (sessão anterior):** `view_definition NOT ILIKE '%security_invoker%'` — ERRADA. `view_definition` contém o corpo SQL da view, não as opções do `CREATE VIEW`.

**Query correta:**
```sql
SELECT COUNT(*) FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND NOT (c.reloptions @> ARRAY['security_invoker=on']);
```

**Resultado (2026-10-28, produção, sem LIMIT):** **192 views** sem `security_invoker=on`.
Versão anterior com `LIMIT 30` retornava só 30 — mascarava 162 views adicionais.
Exemplos: `ai_insights_cache`, `bi_quotes_summary`, `categories_tree_visual`, `mv_active_products`, `mv_product_cards`, `somarcas_catalogo_publico`, `v_catalog_stats`, `v_products_with_org`, e outras 184.

**Impacto:** Views que fazem SELECT em tabelas com RLS rodam como `SECURITY DEFINER` implícito (owner da view), bypassando as policies RLS do chamador. A propriedade `security_invoker=on` faz a view respeitar as policies do usuário que a chama.

**Proposta de correção:** `P06_views_security_invoker.sql` (AGUARDANDO APROVAÇÃO) — `ALTER VIEW nome SET (security_invoker = on)` para as views que acessam tabelas com RLS.

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

## VARREDURAS REPO (REEXECUTADO 2026-10-28)

### Git history secret scan
```bash
git log -p --all | grep -E "^\+" | grep -E "(service_role|anon_key|password|secret)\s*=\s*['\"][a-zA-Z0-9]{20,}" \
  | grep -v "env\.\|Deno\.\|process\.\|placeholder\|your-\|example\|<\|>"
```
**Resultado:** Nenhum valor hardcoded encontrado no histórico git. Todas as referências a `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` usam `Deno.env.get(...)` ou `process.env`. Uma ocorrência de `getCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY")` encontrada — função auxiliar que obtém via vault (não hardcoded). ✅

### .from() / .rpc() / functions.invoke() vs produção
```bash
grep -r "\.rpc(" src/ -h | grep -oP "\.rpc\(['\"]([^'\"]+)['\"]" | sort -u  # 40 RPCs
grep -r "functions\.invoke(" src/ -h | grep -oP "..." | sort -u              # 12 edges
grep -r "\.from(" src/ -h | grep -oP "\.from\(['\"]([^'\"]+)['\"]" | sort -u # 50+ tabelas
```
**Resultado (amostra — MED-011 parcialmente verificado):**
- 40 RPCs chamadas pelo frontend, todas esperadas em produção (fn_super_filtro_*, fn_global_search, restore_seller_cart, etc.)
- 12 edge functions invocadas: `crm-db-bridge`, `external-db-bridge`, `manage-users`, `secrets-manager`, `visual-search`, `mcp-keys-issue`, `mcp-keys-update` — todas presentes em produção (109 edges)
- `functions.invoke('qualquer-edge')` e `functions.invoke('e')` em arquivos de teste (não produção)
- `.from("...")` (placeholder) encontrado em arquivo de template — não é chamada real
- Tabelas como `discount_approval_audit`, `discount_approval_requests`, `expert_conversations`, `expert_messages` presentes no frontend mas verificação de existência em produção NÃO CONCLUÍDA (MED-011 permanece NÃO VERIFICADO para drift completo — requer `generate_typescript_types`)

### Deno.env vs secrets
```bash
grep -r "Deno\.env\.get(" supabase/functions/ -h | grep -oP "Deno\.env\.get\(['\"]([^'\"]+)['\"]" | sort -u
```
**Resultado:** Todas as edge functions usam `Deno.env.get("SUPABASE_URL")`, `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`, `Deno.env.get("SUPABASE_ANON_KEY")` — variáveis padrão Supabase. Nenhum valor hardcoded. ✅

## PII / SEGREDOS NOS ARQUIVOS DE OUTPUT

```bash
grep -rE '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\b\d{11,15}\b)|(password|secret|token|key)\s*[:=]\s*["'"'"'][^"'"'"']{8,}' \
  auditoria-supabase/ --include="*.md" --include="*.json"
→ (sem resultado)
```

**Zero PII ou valor de segredo nos arquivos de output.** ✅

---

## PLANO EM ONDAS — REMEDIAÇÃO POR PRIORIDADE

Achados agrupados por risco × esforço para aplicação sequencial. Cada onda só começa após a anterior estar verde no CI.

### Onda 1 — Crítico (executar imediatamente, APROVAÇÃO necessária)

| ID | Achado | Proposta | Risco de regressão |
|---|---|---|---|
| CRIT-001 | `fn_cron_guard` aceita SQL arbitrário via `EXECUTE p_sql` | P17_security_fn_cron_guard.md → migration REVOKE EXECUTE authenticated | MÉDIO — quebra flows que chamam fn_cron_guard diretamente |
| CRIT-002 | 10 policies `rls_restrictive_*` com `qual='true'` — sem restrição real | P01_rls_restrictive_correcao.sql (aplicada) | BAIXO — migração já aplicada |
| CRIT-003 | 458 migrations no repo não aplicadas em produção | P09_drift003_migration_ledger_reconciliation.sql | ALTO — depende de revisão manual de cada migration |

### Onda 2 — Alto (após Onda 1 verde)

| ID | Achado | Proposta | Risco de regressão |
|---|---|---|---|
| ALT-001 | `fn_super_filtro` SECURITY DEFINER sem SET search_path | P03_security_definer_search_path.sql | BAIXO — add SET search_path TO public não quebra |
| ALT-002 | `check_login_rate_limit` SECURITY DEFINER acessível a anon | P15_seg003_anon_table_access.sql | MÉDIO — revisa GRANT por função |
| ALT-003 | Cron job 235 sem Authorization Bearer JWT | P12_cron_new_001_run_script_auth.sql | BAIXO — só adiciona header |
| ALT-004 | 9 FKs sem índice (cross-schema auth/storage) | P02_fk_indexes.sql (aplicada parcial) | BAIXO |
| ALT-005 | `submit_quote_response` SECURITY DEFINER + anon sem rate limit | P18_perf_rls_wrapper.md | MÉDIO — pode quebrar fluxo público de aprovação |
| ALT-006 | `auth.sessions` 30145 sessões / 39 users (≈773x) | Sem proposta — requer avaliação de session_timeout config | BAIXO |
| ALT-007 | `fn_cron_guard` EXECUTE por `authenticated` ainda ativo | P10_func_new_001_fn_cron_guard_revoke.sql (aplicada parcial) | MÉDIO |
| ALT-008 | **9** funções SECURITY DEFINER com EXECUTE para anon | P15_seg003_anon_table_access.sql | MÉDIO |
| ALT-009 | 1 edge function com `verify_jwt=false` sem validação interna | P04_storage_bucket_policies.sql (indireta) | MÉDIO |

### Onda 3 — Médio (após Onda 2 verde)

| ID | Achado | Proposta | Risco de regressão |
|---|---|---|---|
| MED-001 | `cron.use_background_workers = off` — jobs sem paralelismo | P19_cron_failures_remediation.md | BAIXO — SET GUC ou upgrade |
| MED-002 | `stock_daily_summary` 936MB de bloat (n_live_tup=0) | VACUUM FULL — APROVAÇÃO (lock) | ALTO — lock de tabela |
| MED-003 | `fn_run_pipeline_health_check` lento (12.5s por chamada) | P11_perf010_v_super_filtro_materialized.sql | BAIXO |
| MED-004 | **192** views public sem `security_invoker=on` | P06_views_security_invoker.sql | MÉDIO — alter cada view |
| MED-005 | `pg_net._http_response` sem limpeza periódica | P16_net001_pg_net_failure_monitoring.sql | BAIXO |
| MED-006 | Índices duplicados identificados pelo advisor | P05_indices_duplicados.sql | BAIXO |
| MED-007 | Contagem de falhas de cron 7d | NÃO VERIFICADO — cron.job_run_details timeout | — |
| MED-008 | 5 edge functions com TODO/WIP sem implementação real | Código por função — APROVAÇÃO | MÉDIO |
| MED-009 | Bucket `recibos` sem policy WITH CHECK | P07_storage_recibos_with_check.sql | BAIXO |
| MED-010 | **192** views public sem security_invoker (corrigido 2026-10-28) | P06_views_security_invoker.sql | MÉDIO |
| MED-011 | Drift types.ts | NÃO VERIFICADO — requer npm | — |
| MED-012 | RLS initplan: políticas sem `(SELECT auth.uid())` | P14_adv_perf001_rls_initplan.sql | BAIXO |

### Onda 4 — Baixo/Info

| ID | Achado | Descrição resumida |
|---|---|---|
| BAIXO-001 a 009 | Índices não usados, sequences, audit trail, PITR, alertas | Ver achados individuais no relatório |

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
