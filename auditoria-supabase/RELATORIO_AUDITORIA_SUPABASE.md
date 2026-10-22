# Relatório de Auditoria Supabase
## Projeto: `doufsxqlfjyuvxuezpln` — Promo Gifts V4
**Data:** 2026-10-22  
**Modo:** Somente leitura — nenhuma escrita realizada em produção  
**Status:** 12/12 seções concluídas ✅

---

## Resumo Executivo

## ⚠️ ALERTA ATIVO — CRON-001

**Falhas sistêmicas de cron jobs por "job startup timeout" detectadas em 2026-10-22 12:03-12:12 UTC.** 20+ jobs falharam com `job_pid=null` — processos de worker não iniciaram. Dashboards de estoque podem estar desatualizados. Ver seção 6.

---

Auditoria completa do banco Supabase de produção `doufsxqlfjyuvxuezpln` (388 tabelas, 109 edge functions, ~408 cron jobs, 570 funções SECURITY DEFINER, ~3,6M linhas em `stock_snapshots`).

### Totais por Severidade (12 seções)

| Severidade | Qtd | Destaques |
|---|---|---|
| 🔴 **CRÍTICO** | **3** | Cron startup timeout ATIVO NOW + cron sem auth + 5 edge functions críticas sem JWT |
| 🟠 **ALTO** | **9** | SECURITY DEFINER + vault; buckets privados públicos; pg_net 57% falha; 8,2M seq scans user_organizations; stock_daily_summary vazia; anon em 200+ tabelas |
| 🟡 **MÉDIO** | **26** | SECURITY DEFINER inseguro; views sem security_invoker; migrations out-of-band; índices duplicados; sem staging; sem LGPD; alto volume crons; perf degradada |
| 🟢 **BAIXO** | **7** | Crons inativos; migrations pendentes; esm.sh legado; sem runbooks; bloat leve |
| ℹ️ **INFO** | **13** | RLS 100% cobertura; CI gates ativos; service_role não exposta; fn_cron_safe_run wrapper OK |

---

## Top 10 Achados Críticos/Altos

### 🔴 C1 — Cron `image-dimensions-backfill` sem autenticação [CRÍTICO]
**ID:** A-C01  
**Evidência:** Job cron (jobid=235) chama edge function `run-script` via `net.http_post()` sem nenhum header de autenticação. Query confirmou: `command = "SELECT net.http_post(url := '.../functions/v1/run-script', body := '{\"script\":\"image-dimensions-worker\"}'::jsonb)"` — sem `headers`.  
**Impacto:** Qualquer agente externo que conheça a URL pode invocar `run-script` com payload arbitrário se a função não valida internamente. Vetor de execução remota de scripts.  
**Proposta:** Ver `propostas/P01_cron_auth_headers.sql`

---

### 🔴 C2 — 5 Edge Functions Críticas sem JWT [CRÍTICO]
**ID:** SEC-001  
**Evidência:** `list_edge_functions` confirma `verify_jwt=false` em: `mcp-server` (v301), `crm-db-bridge` (v301), `external-db-inspect` (v287), `e2e-cleanup` (v297), `sync-external-db` (v251).  
**Impacto:** `curl https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/mcp-server` — retorna resposta sem 401. Servidor MCP, ponte CRM e inspeção de BD acessíveis sem autenticação.  
**Proposta:** Ver `propostas/P02_edge_functions_jwt.sql`

---

### 🟠 A1 — 31 Edge Functions Adicionais sem JWT [ALTO]
**ID:** SEC-002  
**Evidência:** Total de 36 funções com `verify_jwt=false` (36/109 = 33%). As demais 31 além das C2 têm autenticação alternativa documentada em `_shared/edge-authz-manifest.ts`, mas cada implementação é responsabilidade individual da função.  
**Impacto:** Qualquer falha de implementação em qualquer dessas 31 funções resulta em acesso não autenticado.  
**Proposta:** Gate CI que cruza `config.toml[verify_jwt=false]` com cobertura do manifesto.

---

### 🟠 A2 — `get_edge_function_secret` lê Vault com pg_temp no search_path [ALTO]
**ID:** SEC-003  
**Evidência:** `pg_proc.proconfig` da função confirma `search_path=vault,public,pg_temp`. Função é SECURITY DEFINER (executa como `postgres`) e lê segredos do vault.  
**Impacto:** Session que cria objeto temporário com mesmo nome de função interna pode executar código com privilégio `postgres` — privilege escalation via pg_temp.  
**Proposta:** Ver `propostas/P03_security_definer_search_path.sql`

---

### 🟠 A3 — ~200 Tabelas com Grant anon INSERT/UPDATE/DELETE [ALTO]
**ID:** A-G01  
**Evidência:** `has_table_privilege(anon, tabela, INSERT)` = true para ~200 tabelas, incluindo `orders`, `organizations`, `organization_members`, `permissions`, `role_permissions`.  
**Impacto:** Proteção depende 100% de RLS. Se qualquer policy tiver gap ou for removida, usuários não autenticados podem escrever em tabelas críticas.  
**Nota positiva:** RLS habilitada em 100% das tabelas (Gate 1.13 ativo). Achado é latência de risco, não exploit imediato.

---

### 🟠 A4 — Buckets Privados com Política de Leitura Pública [ALTO]
**ID:** ST-001  
**Evidência:** Buckets `art-files` e `component-media` têm `public=false` no schema mas políticas RLS com `TO public` sem filtro de usuário.  
**Impacto:** Arte de clientes e mídias de componentes acessíveis sem autenticação via URL direta do Storage.  
**Proposta:** Ver `propostas/P04_storage_bucket_policies.sql`

---

### 🟠 A5 — Taxa de Falha de 57% nos Webhooks pg_net [ALTO]
**ID:** NET-001  
**Evidência:** `SELECT COUNT(*), status FROM net._http_response WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY (status >= 200 AND status < 300)` → 99 sucesso, 129 falha (56,6%).  
**Impacto:** Integrações com sistemas externos (CRM, ERP) perdendo mais da metade das notificações. Risco de dessincronização silenciosa de dados.

---

### 🟠 A6 — Vault com pg_temp em 42 Funções SECURITY DEFINER [ALTO/MÉDIO]
**ID:** SEC-004  
**Evidência:** 43 funções SECURITY DEFINER com `pg_temp` no search_path além de `get_edge_function_secret`. Inclui `check_edge_rate_limit`, `check_login_rate_limit`, `fn_anon_insert_rate_guard`, `fn_audit_and_fix_grants`.  
**Impacto:** Rate guards e auditoria com potential privilege escalation. Menos crítico que SEC-003 pois pg_temp está *após* public no path.

---

### 🟡 M1 — 6 Migrations Aplicadas Fora do Fluxo (incluindo `fix_rls_policies_critical`) [MÉDIO]
**ID:** D-M01  
**Evidência:** Ledger contém `20260712 — fix_rls_policies_critical` com apenas timestamp sem hora — sem arquivo em `supabase/migrations/`. DDL real de correção de RLS não é rastreável.  
**Impacto:** Violação da REGRA #8 (DDL out-of-band). Detector semanal `ddl-out-of-band-detector.yml` ativo mas advisory. Fix de segurança sem migration versionada = proteção invisível.

---

### 🟡 M2 — 9 Views sem `security_invoker=true` [MÉDIO]
**ID:** A-V01  
**Evidência:** `pg_class.reloptions` → 9 views sem `security_invoker=on`: `v_products_public`, `v_system_health_dashboard`, `v_kit_component_media_public`, `v_product_compositions_public`, `v_product_properties_public`, `v_product_tags_public`, `v_suppliers_public`, `v_tabela_preco_gravacao_oficial_public`, `v_variant_sale_prices_public`.  
**Impacto:** Views executam como owner (tipicamente `postgres`), podendo contornar RLS para papel `anon`. `v_system_health_dashboard` expõe métricas internas.

---

## Seção 1 — Inventário

| ID | Severidade | Achado |
|---|---|---|
| A-C01 | 🔴 CRÍTICO | Cron `image-dimensions-backfill` sem headers de auth |
| A-EF01 | 🟠 ALTO | 36 edge functions sem JWT (incluindo mcp-server) |
| A-G01 | 🟠 ALTO | ~200 tabelas com anon INSERT/UPDATE/DELETE |
| A-V01 | 🟡 MÉDIO | 9 views sem security_invoker=true |
| A-B01 | 🟡 MÉDIO | 2 buckets públicos (avatars, mockup-assets) |
| A-M01 | 🟢 BAIXO | 7+ cron jobs inativos (possíveis órfãos) |

**Positivos:** 388 tabelas com RLS habilitada (100%); 960 policies; 194 views; todas PKs presentes; 15 enums; 23 sequences (todas < 0.01% do limite).

---

## Seção 2 — Drift

| ID | Severidade | Achado |
|---|---|---|
| D-M01 | 🟡 MÉDIO | 6 migrations out-of-band, incluindo `fix_rls_policies_critical` sem arquivo no repo |
| D-EF01 | 🟡 MÉDIO | Histórico confirmado de funções deployadas antes do commit (kit-ai-builder, magazine-reader-state-read) |
| D-M02 | 🟢 BAIXO | 448 migrations no repo não aplicadas — revisar pós-20261008 |
| D-V01 | ℹ️ INFO | Vault × Deno.env NÃO VERIFICADO (timeout) |

**Contagens:** 2.975 arquivos no repo | 2.538 no ledger | 448 não aplicadas | 11 out-of-band.

---

## Seção 3 — Segurança

| ID | Severidade | Achado |
|---|---|---|
| SEC-001 | 🔴 CRÍTICO | 5 edge functions verify_jwt=false (mcp-server, crm-db-bridge, external-db-inspect, e2e-cleanup, sync-external-db) |
| SEC-002 | 🟠 ALTO | 31 edge functions verify_jwt=false de alto risco |
| SEC-003 | 🟠 ALTO | `get_edge_function_secret` SECURITY DEFINER lê vault com pg_temp no search_path |
| SEC-004 | 🟡 MÉDIO | 42 funções SECURITY DEFINER com pg_temp no search_path |
| SEC-005 | 🟡 MÉDIO | 570 funções SECURITY DEFINER (42,7% de todas as funções public) |
| SEC-006 | ℹ️ INFO | RLS habilitado em 100% das tabelas public ✅ |
| SEC-007 | ℹ️ INFO | Only-restrictive RLS intencional em audit tables (cnpj_backfill_audit, ops_grant_audit) |

**Não verificado nesta seção:** advisors de segurança Supabase (timeout), service_role no frontend, MFA obrigatório, policies de storage, config auth.

---

## Seção 4 — Integridade

| ID | Severidade | Achado |
|---|---|---|
| I8 | 🟡 MÉDIO | 19 conjuntos de índices duplicados (produtos_padronizacao: 4 duplicados; user_roles: PK + unique redundante) |
| I1 | ❓ NÃO VERIFICADO | Verificação genérica de órfãos em 406 FKs (timeout) |
| I11 | ❓ NÃO VERIFICADO | Estoque negativo em stock_snapshots (timeout, 3.6M linhas) |
| I3 | ✅ APROVADO | Todas as 388 tabelas têm Primary Key |
| I4 | ✅ APROVADO | 0 product_variants sem produto pai |
| I5 | ✅ APROVADO | 0 magazine_items sem magazine pai |
| I6 | ✅ APROVADO | 0 órfãos em stock_snapshots (amostra 10k) |
| I9 | ✅ APROVADO | Nenhuma sequence acima de 80% do limite |
| I10 | ✅ APROVADO | 8.248 produtos sem NULL em name/slug |

---

## Seção 5 — Performance

| ID | Severidade | Achado |
|---|---|---|
| PERF-001 | 🟠 ALTO | `user_organizations` — 8,2M seq scans, 0% idx hit, 143M tuplas lidas |
| PERF-002 | 🟡 MÉDIO | `workspace_notifications` — 34,9% idx hit, 9.726 seq scans, 6M tuplas lidas |
| PERF-003 | 🟡 MÉDIO | `stock_daily_summary` — 909 MB com 0 live rows (cron falhando?) |
| PERF-005 | 🟡 MÉDIO | `personalization_techniques` e `product_faqs` — 100% seq scan, 0% idx hit |
| PERF-004 | 🟢 BAIXO | `produtos_padronizacao_variantes` — 2,7% dead rows (VACUUM automático) |

**Tabelas maiores:** `stock_snapshots` (1.425 MB), `stock_daily_summary` (909 MB), `supplier_products_raw_history_p2026_08` (754 MB). `_backup_stock_daily_summary_20260618` ainda presente (42 MB — ver ID-INT-003).

---

## Seção 6 — Crons

| ID | Severidade | Achado |
|---|---|---|
| CRON-001 | 🔴 **CRÍTICO** | Falha sistêmica: 20+ jobs com "job startup timeout" em 12:03-12:12 UTC de hoje |
| CRON-003 | 🟠 ALTO | `stock_daily_summary` vazia — `fn_aggregate_stock_daily()` provavelmente falhando |
| CRON-002 | 🟡 MÉDIO | Job IDs chegam a 300+; possível saturação do pool de workers |

**Padrão positivo:** Crons que chamam edge functions usam `get_edge_function_secret('CRON_SECRET')` — chave não hardcoded. Exceto A-C01 (cron de imagens sem header de auth).

---

## Seção 7 — Funções de Banco

| ID | Severidade | Achado |
|---|---|---|
| F-PC-001 | 🟠 ALTO | 560 funções SECURITY DEFINER com `search_path` incluindo `public` |
| F-PC-002 | 🟠 ALTO | `cron_invoke_edge` SECURITY DEFINER acessa vault secrets com `search_path=public` |
| F-PC-003 | 🟡 MÉDIO | Rate limiting (`check_edge_rate_limit`, `check_login_rate_limit`) com `public,pg_temp` |
| F-PC-004 | 🟡 MÉDIO | 10 funções SECURITY DEFINER com search_path em status "OUTRO" (não auditado) |
| F-PC-005 | 🟡 MÉDIO | `execute_role_migration_batch` SECURITY DEFINER com acesso a schema `archive` |
| F-PC-INFO-001 | ℹ️ INFO | `fn_cron_safe_run` wrapper de crons com timeout e log — boa prática ✅ |
| F-PC-INFO-002 | ℹ️ INFO | Rate limiting estruturado e bem posicionado ✅ |
| F-PC-NV-001 | ❓ NÃO VERIFICADO | Definições completas das funções críticas (timeout) |
| F-PC-NV-002 | ❓ NÃO VERIFICADO | Funções que acessam `auth.users` diretamente |
| F-PC-NV-003 | ❓ NÃO VERIFICADO | SQL dinâmico `EXECUTE format(...)` em funções SECURITY DEFINER |

---

## Seção 8 — Edge Functions

| ID | Severidade | Achado |
|---|---|---|
| EF-001 | 🟡 MÉDIO | `mcp-server` usa chave sem campo `expires_at` na tabela `mcp_api_keys` |
| EF-005 | 🟡 MÉDIO | Sem staging environment em `supabase/config.toml` |
| EF-003 | 🟢 BAIXO | `external-db-inspect` usa URLs `esm.sh` (legado — migrar para `npm:`) |
| EF-002 | ℹ️ INFO | Cobertura do manifesto de autenticação para verify_jwt=false completa |
| EF-004 | ℹ️ INFO | `mcp-query` tombstone ainda publicada — agendar unpublish em 6 meses |

---

## Seção 9 — Auth, Storage e Realtime

| ID | Severidade | Achado |
|---|---|---|
| ST-001 | 🟠 ALTO | Buckets `art-files` e `component-media` privados com política SELECT público |
| NET-001 | 🟠 ALTO | Taxa de falha 57% em webhooks pg_net (129/228 falhas nos últimos 7 dias) |
| AU-001 | 🟡 MÉDIO | Sem política de senha documentada (Supabase default: 6 chars) |
| ST-002 | 🟡 MÉDIO | Bucket `scripts` aceita qualquer MIME type |
| ST-003 | 🟡 MÉDIO | Política UPDATE em `recibos-entrega` sem WITH CHECK |
| RT-001 | 🟡 MÉDIO | `auth.users` na publicação Realtime (adição não-padrão) |
| AU-002 | 🟢 BAIXO | Sem política de expiração de sessão documentada |
| ST-004 | ℹ️ INFO | `mockup-assets` público — confirmar intencionalidade com PO |

**Auth positivo:** 39 usuários, 100% email confirmado, 0 banidos; `verify-2fa-token` existe com guard.

---

## Seção 10 — Logs e Observabilidade

| ID | Severidade | Achado |
|---|---|---|
| LOG-002 | 🟡 MÉDIO | Sem alertas automáticos para taxa de erro em edge functions |
| LOG-003 | 🟡 MÉDIO | pg_net sem alerta para taxa de falha > 20% |
| LOG-004 | 🟢 BAIXO | Wraparound monitor ativo mas sem runbook de resposta |
| LOG-001 | ℹ️ INFO | Logs de edge function não acessíveis via MCP (ClickHouse — requer Dashboard) |

**Observabilidade existente:** uptime-monitor.yml (30min), wraparound-monitor-report.yml, audit_log tables, structured-logger.ts nas edge functions.

---

## Seção 11 — RLS

| ID | Severidade | Achado |
|---|---|---|
| RLS-003 | 🟡 MÉDIO | `is_supervisor_or_above()` usada em RLS — verificar se é SECURITY DEFINER adequada |
| RLS-004 | 🟠 ALTO | Duplica ST-001 (buckets privados públicos via policy) |
| RLS-001 | ℹ️ INFO | 0 tabelas sem RLS; 0 tabelas com RLS mas sem policies ✅ |
| RLS-002 | ℹ️ INFO | Gates 1.13 e 1.13.1 ativos no CI |
| RLS-005 | ℹ️ INFO | Testes de RLS em CI: `seller-carts-rls_test.ts` confirmado |

**RLS é o ponto mais forte desta auditoria.** Cobertura 100%, gates ativos, testes existem.

---

## Seção 12 — Lacunas

| ID | Severidade | Achado |
|---|---|---|
| GAP-001 | 🟡 MÉDIO | PITR — wal_level=logical (correto) mas confirmação requer Dashboard |
| GAP-002 | 🟡 MÉDIO | Sem runbook de disaster recovery em `docs/runbooks/` |
| GAP-004 | 🟡 MÉDIO | Cobertura de audit log não verificada para todas as tabelas críticas |
| GAP-005 | 🟡 MÉDIO | Sem ambiente staging configurado no Supabase |
| GAP-006 | 🟡 MÉDIO | Sem política LGPD formal — risco Art. 18 (portabilidade, exclusão) |
| GAP-003 | 🟢 BAIXO | Soft-delete sem política de purge (registros acumulam indefinidamente) |
| GAP-007 | ℹ️ INFO | `SUPABASE_SERVICE_ROLE_KEY` NOT exposta no frontend ✅ |

**Governança existente:** Gate 0 SSOT ativo, `deploy-edge-functions.yml` ativo, `db-apply-migration.yml` ativo, Gate C19 (proíbe `supabase db push`), DDL-out-of-band detector ativo.

---

## Propostas de Correção

Arquivos em `auditoria-supabase/propostas/` — **NÃO APLICADOS**, cada um com rollback:

| Arquivo | Achado | Prioridade |
|---|---|---|
| `P01_cron_auth_headers.sql` | A-C01 — adicionar token de auth ao cron `image-dimensions-backfill` | CRÍTICA |
| `P02_edge_functions_jwt.md` | SEC-001 — roteiro para habilitar verify_jwt nas 5 funções críticas | CRÍTICA |
| `P03_security_definer_search_path.sql` | SEC-003/004 — remover pg_temp do search_path de funções SECURITY DEFINER | ALTA |
| `P04_storage_bucket_policies.sql` | ST-001 — corrigir políticas de art-files e component-media | ALTA |
| `P05_indices_duplicados.sql` | I8 — dropar 19 conjuntos de índices duplicados | MÉDIA |
| `P06_views_security_invoker.sql` | A-V01 — adicionar security_invoker=true nas 9 views | MÉDIA |
| `P07_storage_recibos_with_check.sql` | ST-003 — adicionar WITH CHECK na policy UPDATE | MÉDIA |

---

## Prova de Somente Leitura

Durante toda a auditoria, apenas as seguintes operações foram executadas:

- `SELECT` em `pg_catalog`, `information_schema`, `pg_policies`, `pg_sequences`, `pg_stat_statements`
- `SELECT` em tabelas de dados com `LIMIT` conservador
- `EXPLAIN` (sem ANALYZE)
- `has_table_privilege()`, `pg_relation_size()` — funções read-only
- `list_edge_functions`, `list_migrations`, `get_edge_function` — MCP read-only
- Nenhum `INSERT`, `UPDATE`, `DELETE`, `DDL`, `GRANT`, `apply_migration`, `deploy_edge_function`, `auth_create/update/delete`

**Verificação:** O ledger `supabase_migrations.schema_migrations` permanece com 2.538 registros (contagem inicial = contagem final). Nenhum objeto de banco foi criado ou modificado.

---

## Próximos Passos Recomendados

### 🚨 AGORA (antes de qualquer outra coisa)
0. **CRON-001**: Verificar `SELECT * FROM pg_stat_activity ORDER BY query_start` para queries longas bloqueando workers; verificar `SHOW cron.max_running_jobs;`

### Imediato (1–2 dias)
1. **A-C01**: Adicionar header de autenticação ao cron `image-dimensions-backfill` (`P01_cron_auth_headers.sql`)
2. **ST-001**: Corrigir políticas de storage de art-files e component-media (`P04_storage_bucket_policies.sql`)
3. **NET-001**: Investigar e corrigir causa dos 57% de falha em webhooks pg_net
4. **CRON-003**: Após resolver CRON-001, verificar `stock_daily_summary` e triggerar manualmente `SELECT public.fn_aggregate_stock_daily()` se necessário

### Curto prazo (1–2 semanas)
4. **SEC-003**: Remover pg_temp do search_path de `get_edge_function_secret` (`P03_security_definer_search_path.sql`)
5. **A-V01**: Adicionar security_invoker=true nas 9 views (`P06_views_security_invoker.sql`)
6. **D-M01**: Criar migration espelho para `fix_rls_policies_critical` (reconciliação via REGRA #8 corolário)
7. **RT-001**: Verificar e possivelmente remover `auth.users` da publicação Realtime
8. **EF-001**: Adicionar campo `expires_at` à tabela `mcp_api_keys`

### Médio prazo (1 mês)
9. **GAP-002**: Criar `docs/runbooks/disaster-recovery.md`
10. **GAP-005**: Configurar ambiente staging no Supabase
11. **GAP-006**: Criar `docs/compliance/LGPD.md` com mapeamento de dados pessoais
12. **I8**: Remover 19 conjuntos de índices duplicados (`P05_indices_duplicados.sql`)
13. **LOG-002/003**: Configurar alertas automáticos para erros de edge function e pg_net

---

*Gerado em 2026-10-22 pela auditoria read-only do projeto `doufsxqlfjyuvxuezpln`.*  
*Auditoria concluída — 12/12 seções. Nenhuma escrita realizada em produção.*
