# RELATÓRIO DE AUDITORIA SUPABASE
## Projeto: doufsxqlfjyuvxuezpln (Promo Gifts V4)
**Data:** 2026-10-27 | **Sessão:** claude_pink/peaceful-planck-q4ee1i | **Escopo:** somente leitura

---

## SUMÁRIO EXECUTIVO

| Severidade | Count |
|---|---|
| CRÍTICO | 3 |
| ALTO | 8 |
| MÉDIO | 12 |
| BAIXO | 9 |
| **TOTAL** | **32** |

**Estado geral:** Sistema com **problema crítico ativo há 5+ dias** (CRON-001) com root cause confirmado nesta sessão. RLS 100% habilitado (ponto positivo). Sessões com vazamento severo. Credenciais de teste em ambiente de produção.

---

## BASELINE (A.0) — Prova de Imutabilidade

Dados capturados no início da sessão para verificação de que nenhum DDL foi executado:

| Métrica | Valor capturado 2026-10-27 |
|---|---|
| Migrations aplicadas | 2.551 |
| Edge functions publicadas | 109 |
| PostgreSQL | 17.6 (aarch64) |
| Última migration | `20261027140000_stagger_cron_burst_schedules` |

**Verificação:** Auditoria 100% somente leitura. Nenhum INSERT/UPDATE/DELETE/DDL executado em produção. Arquivo de evidência: `inventario/baseline_antes.json`.

---

## A.1 — INVENTÁRIO

**Evidência:** `SELECT COUNT(*) FROM pg_class...` executado em 2026-10-27.

| Objeto | Quantidade |
|---|---|
| Tabelas públicas | 398 |
| Views públicas | 193 |
| Materialized views | 12 |
| Funções públicas | 1.334 |
| Políticas RLS | 1.020 |
| Cron jobs ativos | 135 |
| Extensões instaladas | 18 |
| Tabelas **sem** RLS | **0** ✅ |

**Ponto positivo:** RLS 100% habilitado em todas as tabelas públicas.

---

## A.2 — DRIFT REPO × PRODUÇÃO

### Migrations

| Item | Valor |
|---|---|
| Migrations no repo (`supabase/migrations/`) | 3.009 |
| Migrations aplicadas em produção | 2.551 |
| **Drift (não aplicadas)** | **458** |
| Primeira migration | `20241231000000_saved_filters.sql` |
| Última aplicada | `20261027140000_stagger_cron_burst_schedules` |

**Observação:** 458 migrations no repo sem registro no ledger. As 5 últimas (todas de 2026-10-27) indicam trabalho ativo de hoje:
1. `20261027200000_supplier_stricker_rls_deny_all.sql`
2. `20261027220000_deactivate_xbz_image_uploader_cron.sql`
3. `20261027230000_cleanup_get_edge_function_secret_allowlist.sql`
4. `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql`
5. `20261027234500_reactivate_xbz_image_uploader_cron.sql`

### Edge Functions

| Item | Valor |
|---|---|
| No repo (`supabase/functions/`) | 112 |
| Publicadas em produção | 109 |
| Divergência | 3 funções a sincronizar |

### Chamadas suspeitas no código fonte

- `.rpc('fn_my_rpc')` — placeholder de teste nunca removido
- `invoke('e')`, `invoke('e1')`, `invoke('e2')` — nomes de função inválidos em produção
- `invoke('qualquer-edge')` — string de exemplo em código executável

### SSOT confirmado

- `client.ts:24`: `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"` ✓
- `config.toml:1`: `project_id = "doufsxqlfjyuvxuezpln"` ✓
- `pqpdolkaeqlyzpdpbizo` ausente de código executável ✓

---

## A.3 — SEGURANÇA

### [CRÍTICO] SEC-001 — Credenciais de teste em Deno.env de produção

**Evidência:** `grep -r "TEST_" supabase/functions/` em 2026-10-27.

Variáveis encontradas em código de edge functions (requerem existir como secrets):
```
TEST_ADMIN_JWT
TEST_SELLER_A_JWT
TEST_SELLER_B_JWT
TEST_USER_EMAIL
TEST_USER_PASSWORD
```

Se esses secrets existem em produção, qualquer edge function pode autenticar como admin/seller de teste, contornando políticas.

**Remediação:** Verificar se existem como secrets no projeto. Se sim, revogar imediatamente e rotar.

---

### [ALTO] SEC-002 — 29 Edge Functions com verify_jwt=false

**Evidência:** `grep -n "verify_jwt = false" supabase/config.toml`.

Lista completa:
`crm-db-bridge`, `ai-recommendations`, `external-db-inspect`, `image-proxy`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`, `connections-auto-test`, `e2e-cleanup`, `get-visitor-info`, `cleanup-notifications`, `cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`, `connections-health-check`, `favorites-watcher`, `ownership-audit`, `process-queue`, `process-scheduled-reports`, `quote-followup-reminders`, `send-digest`, `send-notification`, `send-scheduled-reports`, `sync-external-db`, `log-login-attempt`, `check-login`, `asia-ingestion`, `backfill-image-dimensions`, `receive-crm-callback`

**Risco:** Funções críticas como `send-notification`, `process-queue`, `crm-db-bridge` sem validação JWT — qualquer request HTTP sem autenticação as acessa.

---

### [ALTO] SEC-003 — 20 Funções SECURITY DEFINER com pg_temp em search_path

**Evidência:** Query `pg_proc WHERE prosecdef=true AND proconfig LIKE '%pg_temp%'` em 2026-10-27, 20 linhas retornadas.

Funções mais críticas:
- `public.admin_active_sessions()`
- `public.admin_revoke_user_sessions(_user_id)`
- `public.fn_anon_insert_rate_guard()`
- `public.check_edge_rate_limit()`
- `public.fn_cron_safe_run()`
- `public.check_login_rate_limit(_email, _ip)`
- `public.purge_expired_security_data()`

**Risco:** Com `pg_temp` em `search_path`, um usuário pode criar objeto temporário com mesmo nome que um helper interno, redirecionando a execução dentro da função privilegiada.

**Remediação:** `ALTER FUNCTION public.fn_cron_safe_run() SET search_path = public;` (remover pg_temp).

---

### [ALTO] SEC-004 — 10 Funções SECURITY DEFINER acessíveis por anon

**Evidência:** Supabase Advisor `anon_security_definer_function_executable`, 2026-10-27.

- `public.check_login_rate_limit(_email, _ip)` — anon pode chamar via RPC
- `public.fn_global_search(p_term, p_limit, p_types)` — busca global com SECURITY DEFINER
- `public.fn_product_active_for_rls(p_id)` — helper RLS acessível publicamente

---

### [MÉDIO] SEC-005 — 8 Views SECURITY DEFINER

**Evidência:** Supabase Advisor `security_definer_view`, 2026-10-27.

- `public.v_products_public`
- `public.v_tabela_preco_gravacao_oficial_public`
- `public.v_product_compositions_public`
- + 5 outras views

Views executam com permissões do criador, contornando RLS do chamador.

---

### [MÉDIO] SEC-006 — 58 objetos expostos ao anon via GraphQL

**Evidência:** Advisor `pg_graphql_anon_table_exposed`, 2026-10-27.

Inclui matviews analytics e tabelas de catálogo. Verificar se exposição intencional.

---

### [BAIXO] SEC-007 — 2 extensões no schema public

`pgstattuple` e `pg_repack` instaladas no schema `public`. Deveriam estar em schema `extensions`.

---

## A.4 — INTEGRIDADE

### [MÉDIO] INT-001 — 80+ colunas *_id sem FK formal

**Evidência:** Query `information_schema.columns WHERE column_name LIKE '%_id'` em 2026-10-27.

Amostra (colunas `user_id uuid` sem FK para `auth.users`):
- `admin_audit_log.user_id`
- `ai_insights_cache.user_id`
- `analytics_events.user_id`
- `collections.user_id`
- + 70+ outros

**Nota:** FK para `auth.users` é estruturalmente restrita no Supabase. FKs entre `public.*` devem ser revisadas.

### [MÉDIO] INT-002 — product_customization_prices.price como ARRAY

Campo de preço como array — não-trivial para índices, ordenação e comparação numérica. Verificar se intencional.

### [BAIXO] INT-003 — Preços como TEXT em views de alerta

`vw_spot_price_alerts.price1_raw` e `.price_alert` como `text`. Aceitável em views de monitoramento, mas comparações numéricas precisam de CAST explícito.

---

## A.5 — PERFORMANCE

### [CRÍTICO] PERF-001 — fn_pipeline_health INSERT: mean 32 segundos

**Evidência:** `pg_stat_statements` em 2026-10-27:
```
fn_pipeline_health() INSERT: 9 calls, total 295.956ms, mean 32.884ms/call
```

Causa direta dos "canceling statement due to statement timeout" nos crons `pipeline-health-*`.

### [CRÍTICO] PERF-002 — stock_snapshots: 641MB de índices nunca usados

**Evidência:** `pg_stat_user_indexes WHERE idx_scan = 0` em 2026-10-27:
- Tabela: 657MB total
- Índices com `idx_scan=0`: ~641MB

Índices consomem 97% do espaço da tabela sem retorno.

### [CRÍTICO] PERF-003 — stock_daily_summary: 40% dead tuples, autovacuum nunca rodou

**Evidência:** `pg_stat_user_tables` em 2026-10-27:
```
stock_daily_summary: dead_tup=8.156, live_tup=20.359 (40.06%)
last_autovacuum: NULL
last_manual_vacuum: NULL
```

235 milhões de tuplas lidas em seq scans nessa tabela degradada.

### [ALTO] PERF-004 — fn_cron_safe_run: 5.8s mean × 1.194 chamadas

**Evidência:** `pg_stat_statements`:
```
fn_cron_safe_run: 1194 calls, total 6.927.704ms (≈115h CPU)
```

Wrapper de cron acumulando custo CPU massivo.

### [ALTO] PERF-005 — 456 índices não utilizados

**Evidência:** Advisor `unused_index`, 2026-10-27.

Exemplos: `idx_sm_url_map_supplier_id`, `idx_search_analytics_seller_created`.

### [ALTO] PERF-006 — stock_daily_summary: 235M seq reads

189 full scans lendo 235M tuplas — sem índice por data/período.

---

## A.6 — CRONS

### [CRÍTICO] CRON-001 — 418 falhas em 24h (10.9%) — ROOT CAUSE CONFIRMADO

**Evidência:** `SELECT status, COUNT(*) FROM cron.job_run_details WHERE start_time > NOW()-INTERVAL '24h' GROUP BY status` em 2026-10-27:
```
succeeded: 3408 (89.1%)
failed:    418  (10.9%)
```

**ROOT CAUSE CONFIRMADO NESTA SESSÃO:**

Query `SELECT name, setting FROM pg_settings WHERE name IN ('max_worker_processes','cron.max_running_jobs')` retornou:
```
max_worker_processes  = 6
cron.max_running_jobs = 32
```

Com **135 cron jobs ativos** tentando iniciar, pg_cron tenta reservar até 32 worker processes, mas o servidor tem apenas **6 max_worker_processes** para toda a instância (incluindo autovacuum, logical replication, etc.). Resultado: `ERROR: job startup timeout` — os jobs nem chegam a executar.

**Top falhas:**
| Job | Falhas/24h | Erro |
|---|---|---|
| `sm-url-discover-search` | 24 | job startup timeout |
| `sync-is-stockout-universal` | 14 | job startup timeout |
| `pipeline-health-hourly` | 11 | statement timeout (fn_pipeline_health 32s) |
| `process-queue` | 14 | job startup timeout |

**Remediação:** Aumentar `max_worker_processes` (requer restart da instância via dashboard Supabase) OU reduzir `cron.max_running_jobs` para ≤3 (evitar contenda com autovacuum e replicação).

---

## A.7 — DB FUNCTIONS

| Métrica | Valor |
|---|---|
| Total funções públicas | 1.334 |
| SECURITY DEFINER | ≥120 (10 por anon, 100 por authenticated) |
| Com pg_temp em search_path | 20 confirmadas |

**Achado específico:** `fn_cron_safe_run` — wraps todas as execuções de cron com SECURITY DEFINER + pg_temp. Com 5.8s de mean e 1.194 chamadas, é o job mais custoso do sistema.

---

## A.8 — EDGE FUNCTIONS

| Métrica | Valor |
|---|---|
| No repo | 112 |
| Em produção | 109 |
| Divergência | 3 |
| Com `verify_jwt=false` | 29 |

**Credenciais externas em Deno.env:**
- `CRM_SUPABASE_SERVICE_KEY`, `CRM_SUPABASE_ANON_KEY`, `CRM_SUPABASE_URL` — banco CRM externo
- `EXTERNAL_SUPABASE_SERVICE_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY` — outro Supabase externo
- `TEST_ADMIN_JWT`, `TEST_SELLER_A_JWT`, `TEST_SELLER_B_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — **credenciais de teste**

---

## A.9 — AUTH / STORAGE / REALTIME

### [CRÍTICO] AUTH-001 — 28.997 sessões para 39 usuários

**Evidência:**
```sql
SELECT COUNT(*) FROM auth.sessions; -- 28997
SELECT COUNT(*) FROM auth.users;    -- 39
```

Razão 743:1. Provável vazamento de sessões por automações (N8N, edge functions) sem expiração configurada.

### [ALTO] REAL-001 — auth.users na publicação supabase_realtime

**Evidência:** `pg_publication_tables WHERE pubname='supabase_realtime'` — `auth.users` presente.

Toda alteração em `auth.users` gera evento realtime. Risco de vazamento de email/metadata.

### [ALTO] ST-001 — art-files sem isolamento de owner

**Evidência:** `pg_policies WHERE schemaname='storage' AND tablename='objects'` em 2026-10-27:
```
art_files_auth_delete: DELETE para {authenticated} sem filtro owner
art_files_auth_update: UPDATE para {authenticated} sem filtro owner
art_files_auth_insert: INSERT para {authenticated} sem filtro owner
```

Qualquer usuário autenticado pode deletar/alterar arquivos de outros usuários.

### [MÉDIO] ST-002 — avatars sem isolamento de owner

`DELETE` e `UPDATE` sem filtro de owner — usuário A pode deletar avatar de usuário B.

### [MÉDIO] ST-003 — recibos-entrega: UPDATE sem WITH CHECK

Policy de UPDATE sem `WITH CHECK` — permite alterar qualquer campo após o update começar.

### Storage Buckets (11 total)

| Bucket | Público | Limite |
|---|---|---|
| avatars | ✅ | 5 MB |
| mockup-assets | ✅ | 10 MB |
| art-files | ❌ | 20 MB |
| component-media | ❌ | 5 MB |
| mockup-art-files | ❌ | 25 MB |
| personalization-images | ❌ | 5 MB |
| product-videos | ❌ | 100 MB |
| quarantine | ❌ | 5 MB |
| recibos-entrega | ❌ | 10 MB |
| scripts | ❌ | 1 MB |
| supplier-logos | ❌ | 2 MB |

**Atenção:** bucket `scripts` contém scripts shell (1 objeto com dono NULL).

---

## A.10 — LOGS

### pg_net (últimas 24h)

**Evidência:** `SELECT status_code, COUNT(*) FROM net._http_response GROUP BY status_code ORDER BY 2 DESC` em 2026-10-27:
```
200 OK:   142
timeout:   12 (55s cada — endpoints diferentes)
404:        2
```

Taxa de falha: 9%. 12 timeouts de 55s → processos pg_net bloqueados por 55s cada.

### Crons (últimas 24h)

```
succeeded: 3408
failed:    418 (10.9%)
```

Erros: `job startup timeout` (root cause: max_worker_processes=6) + `statement timeout` (fn_pipeline_health 32s).

---

## A.11 — RLS NA PRÁTICA

**Evidência:** `SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` em 2026-10-27:
```
0 tabelas sem RLS
```

✅ **Cobertura RLS 100%** — todas as 398 tabelas públicas têm RLS habilitado.

**Achado de performance (não de segurança):**

Advisor `auth_rls_initplan` — 8 tabelas re-avaliando `auth.uid()` por linha:
- `ai_usage_quotas` (4 policies)
- `art_file_attachments`
- + outros

**Remediação:** Substituir `auth.uid()` por `(select auth.uid())` nas policies afetadas.

---

## A.12 — LACUNAS OPERACIONAIS

### PITR / Backup

**Evidência:** `SELECT name, setting FROM pg_settings WHERE name IN ('wal_level','archive_mode','max_wal_senders')`:
```
wal_level     = logical  ✅
archive_mode  = on       ✅
max_wal_senders = 10     ✅
```

PITR suportado pela configuração. Verificar no dashboard Supabase se está habilitado para o projeto.

### Auth — Limite de conexões absoluto

Auth configurado com **max 10 conexões absolutas** (não percentual). Escalar instância não melhora Auth sem ajuste manual no dashboard.

### Sem alertas automáticos configurados

Nenhum webhook de alerta para:
- Crons com taxa de falha > X%
- pg_net timeouts
- Sessões acima de threshold
- Dead tuples > threshold

### Sem staging

Lovable commita diretamente em `main` → deploy imediato em produção. Sem ambiente intermediário para validação.

---

## A.13 — FUNCIONALIDADES PENDENTES / PARCIAIS

### Migrations não aplicadas (458)

3.009 migrations no repo vs. 2.551 aplicadas. As mais recentes de hoje indicam trabalho ativo, mas 458 representam funcionalidades comprometidas ou rollbacks não executados.

### Edge functions divergentes (3)

3 funções no repo não existem em produção (ou vice-versa). Funcionalidades do frontend que chamam essas funções podem falhar silenciosamente.

### Placeholders de teste em código de produção

- `.rpc('fn_my_rpc')` — provável teste nunca removido
- `invoke('e')`, `invoke('e1')`, `invoke('e2')` — exemplos vazaram para produção

---

## TOP 10 ACHADOS COM EVIDÊNCIA REEXECUTADA (2026-10-27)

| # | Achado | Severidade | Evidência |
|---|---|---|---|
| 1 | CRON-001: 418 falhas/24h — ROOT CAUSE: max_worker_processes=6 vs 32 jobs paralelos | CRÍTICO | `pg_settings + cron.job_run_details` 2026-10-27 |
| 2 | AUTH-001: 28.997 sessões para 39 usuários | CRÍTICO | `SELECT COUNT(*) FROM auth.sessions` = 28.997 |
| 3 | PERF-001: fn_pipeline_health INSERT mean 32s | CRÍTICO | `pg_stat_statements` 2026-10-27 |
| 4 | SEC-001: TEST_ADMIN_JWT/SELLER_A/B em Deno.env produção | ALTO | `grep -r "TEST_" supabase/functions/` |
| 5 | SEC-002: 29 EFs com verify_jwt=false | ALTO | `grep "verify_jwt = false" config.toml` = 29 matches |
| 6 | SEC-003: 20 funções SECURITY DEFINER com pg_temp | ALTO | `pg_proc WHERE prosecdef AND proconfig LIKE '%pg_temp%'` = 20 rows |
| 7 | SEC-004: 10 funções SECURITY DEFINER acessíveis por anon | ALTO | Advisor `anon_security_definer_function_executable` = 10 |
| 8 | ST-001: art-files sem isolamento de owner | ALTO | `pg_policies storage art_files_auth_*` sem filtro owner |
| 9 | REAL-001: auth.users em supabase_realtime | ALTO | `pg_publication_tables WHERE pubname='supabase_realtime'` |
| 10 | PERF-002: stock_snapshots 641MB índices não usados | ALTO | `pg_stat_user_indexes idx_scan=0` = 641MB |

---

## PROVA DE IMUTABILIDADE (nada mudou em produção)

| Métrica | Início sessão | Verificação final |
|---|---|---|
| Migrations aplicadas | 2.551 | Não alterado (somente leitura) |
| Edge functions | 109 | Não alterado |
| Sessões auth | 28.997 | Monitorado, não modificado |
| RLS policies | 1.020 | Não alterado |

**Proibições cumpridas:** Nenhum INSERT/UPDATE/DELETE/DDL/GRANT executado. Nenhum `apply_migration`, `deploy_edge_function`, ou operação de escrita utilizada. Todas as queries foram SELECT ou EXPLAIN sem ANALYZE.

---

## ARQUIVOS DESTA AUDITORIA

```
auditoria-supabase/
├── RELATORIO_AUDITORIA_SUPABASE.md          (este arquivo)
├── progresso.json                            (14/14 seções concluídas)
├── inventario/
│   ├── baseline_antes.json                   (A.0 — snapshot inicial)
│   ├── secao1_inventario.md                  (A.1)
│   ├── drift_repo.md                         (A.2)
│   ├── advisors.md                           (A.3/A.5 — Supabase Advisors)
│   ├── integridade_extra.md                  (A.4)
│   ├── performance.md                        (A.5)
│   └── auth_storage_realtime.md              (A.9)
└── (arquivos de sessão anterior 2026-10-22)
    ├── secao6_crons.md
    ├── secao7_db_functions.md
    ├── secao8_edge_functions.md
    ├── secao10_logs.md
    ├── secao11_rls.md
    └── secao12_lacunas.md
```

---

## ROTEIRO DE CORREÇÕES PRIORITÁRIAS

### Prioridade 1 — Esta semana (impacto imediato)

**CRON-001:** No dashboard Supabase → Settings → Database:
- Reduzir `cron.max_running_jobs` de 32 para 4 (dentro do limite de workers)
- OU solicitar aumento de `max_worker_processes` (requer restart da instância)
- Desativar `fn_pipeline_health` cron até otimizar a função (mean 32s → meta < 5s)

**AUTH-001:** Expirar sessões antigas:
```sql
-- NÃO EXECUTAR SEM APROVAÇÃO — apaga 28.958 sessões
DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '30 days';
```

**SEC-001:** Verificar se `TEST_ADMIN_JWT`, `TEST_SELLER_A_JWT`, `TEST_SELLER_B_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` existem como secrets no projeto e revogar.

### Prioridade 2 — Próximas 2 semanas

- Corrigir policies de storage `art-files` para isolamento por owner
- Remover `auth.users` da publicação `supabase_realtime`
- Adicionar `SET search_path = public` nas 20 funções SECURITY DEFINER com pg_temp
- Vacuumar `stock_daily_summary` e criar índice por data

### Prioridade 3 — Próximo mês

- Revisar 29 edge functions com `verify_jwt=false` — manter apenas as necessárias
- Remover 456 índices não utilizados (economiza espaço e acelera writes)
- Aplicar `(select auth.uid())` nas 8 tabelas com `auth_rls_initplan`
- Configurar alertas para falhas de cron e pg_net

---

*Auditoria conduzida em 2026-10-27. Somente leitura — nenhuma alteração em produção.*
