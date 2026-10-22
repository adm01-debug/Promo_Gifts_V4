# Relatório de Auditoria — Supabase Promo Gifts V4

**Projeto:** `doufsxqlfjyuvxuezpln` (GESTÃO DE PRODUTOS — PROMO GIFTS V4)  
**Data:** 2026-10-22  
**Modo:** Somente Leitura  
**Repo:** `adm01-debug/Promo_Gifts_V4`  
**Branch:** `claude/happy-faraday-0vgza3`

---

## ⚠️ ALERTA IMEDIATO — CRÍTICO ATIVO AGORA

**[CRON-001]** Cron jobs falhando em massa com `"job startup timeout"` em produção **neste momento** (2026-10-22 12:03–12:12 UTC). 20+ jobs com `job_pid = null` — os workers não conseguiram nem iniciar.

**Ação imediata:** verificar `pg_stat_activity` no Supabase Dashboard para queries bloqueantes/longas. Ver Seção 6 e Wave 0 abaixo.

---

## 1. Escopo

| Dimensão | Cobertura |
|---|---|
| Schema `public` | ✅ Completo |
| Edge Functions (109 publicadas) | ✅ Inventário + código-fonte |
| RLS (960 policies) | ✅ Cobertura completa |
| Storage (11 buckets) | ✅ Policies + mime types |
| Auth (39 usuários) | ✅ Configuração |
| pg_cron (300+ jobs) | ✅ Status em tempo real |
| pg_net (228 req/7 dias) | ✅ Taxa de falha |
| DB Functions (1.334) | ✅ SECURITY DEFINER |
| Logs / Observabilidade | ⚠️ Parcial (sem acesso ao ClickHouse via MCP) |
| PITR / Backup | ⚠️ NÃO VERIFICADO (requer Dashboard) |

---

## 2. Resumo Executivo

O banco de produção está em **estado misto**: a cobertura de segurança de base é excelente (RLS 100% habilitada, todas as SECURITY DEFINER com `search_path` explícito, gates CI ativos), mas há um incidente crítico ativo nos cron jobs, falha expressiva nos webhooks (57%), e gaps em monitoramento e documentação.

| Severidade | Quantidade | Ação |
|---|---|---|
| **CRÍTICO** | **1** | Intervir agora |
| **ALTO** | **7** | Esta semana |
| **MÉDIO** | **22** | Próximas 4 semanas |
| **BAIXO** | **8** | Próximo trimestre |
| **INFO** | **12** | Monitorar |
| **NÃO VERIFICADO** | **3** | Verificar via Dashboard |

---

## 3. Achados por Severidade

### CRÍTICO

---

#### [ID-CRON-001] Falha sistêmica de cron jobs — "job startup timeout" ATIVO AGORA
- **Severidade:** CRÍTICO
- **Objeto:** `cron.job_run_details` — múltiplos job IDs (273, 206, 222, 285, 214, 205, 213, 269, 210, 275, 205, 219, 296, 204, 100, 15, 243, 300, 268, 207)
- **Evidência:** Query em `cron.job_run_details` retornou 20+ falhas com `status = 'failed'` e `return_message = 'job startup timeout'` entre 12:03 e 12:12 UTC de 2026-10-22. `job_pid = null` em todas — os processos de worker não iniciaram.
- **Impacto:** Jobs de limpeza (notifications, novelties, rate limits), agregação de estoque e outros não estão executando. `stock_daily_summary` (909 MB) pode estar vazia. Taxa de falha de 57% em `pg_net` é agravada por esta falha.
- **Causa provável:** Banco sob carga excessiva → workers de pg_cron sem conexões disponíveis; `max_worker_processes` atingido; seq scans massivos em `user_organizations` (8,2M scans — ID-PERF-001) contribuem para carga.
- **Correção imediata:**
  1. Dashboard → Database → Query Editor: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 20;`
  2. Identificar e terminar queries bloqueantes com `SELECT pg_terminate_backend(pid)`
  3. Verificar `SHOW max_worker_processes; SHOW cron.max_running_jobs;`
  4. Após desobstruir: reexecutar `SELECT public.fn_aggregate_stock_daily();` manualmente se stock_daily_summary estiver vazia
- **Esforço:** Urgente (minutos para investigação, horas para resolução completa)

---

### ALTO

---

#### [ID-SEC-001] 5 edge functions críticas com `verify_jwt=false` sem auth alternativa robusta
- **Severidade:** ALTO
- **Objeto:** `mcp-server`, `crm-db-bridge`, `external-db-inspect`, `e2e-cleanup`, `sync-external-db`
- **Evidência:** `list_edge_functions` → 36 funções com `verify_jwt=false`. As 5 listadas são classificadas como risco crítico por tipo de operação (acesso a BD externo, limpeza de dados, sincronização).
- **Impacto:** Sem JWT, qualquer agente externo pode invocar essas funções sem autenticação Supabase. `mcp-server` usa `X-MCP-Key` mas sem expiração. `crm-db-bridge` expõe operações de CRM.
- **Correção sugerida:** Habilitar `verify_jwt=true` + token interno `CRON_SECRET` / `X-MCP-Key` validado. Ou garantir que auth alternativa está auditada e documentada no manifesto `_shared/edge-authz-manifest.ts`.
- **Esforço:** Médio (revisão por função + hardening)

---

#### [ID-SEC-002] 31 edge functions adicionais com `verify_jwt=false`
- **Severidade:** ALTO
- **Objeto:** 31 edge functions restantes com JWT desativado
- **Evidência:** Total de 36 funções com `verify_jwt=false` — 5 críticas (SEC-001) + 31 restantes classificadas por `_shared/edge-authz-manifest.ts`.
- **Impacto:** Cada função é responsável pela própria autenticação. Se o manifesto não cobrir alguma, a função fica exposta.
- **Correção sugerida:** Gate CI que cruze `config.toml[verify_jwt=false]` com entradas do manifesto. Auditoria linha a linha do manifesto.
- **Esforço:** Pequeno (gate CI + auditoria)

---

#### [ID-SEC-003] `get_edge_function_secret` — SECURITY DEFINER lê vault com `pg_temp` no search_path
- **Severidade:** ALTO
- **Objeto:** Função `get_edge_function_secret` (SECURITY DEFINER, `search_path = vault, public, pg_temp`)
- **Evidência:** Seção 3, query de SECURITY DEFINER com pg_temp. Função lê secrets do Supabase Vault com `pg_temp` após `vault` e `public` no search_path.
- **Impacto:** Em SECURITY DEFINER (roda como `postgres`), se uma sessão cria um objeto temporário com nome de função interna, há risco de escalada de privilégio. Como `pg_temp` está após `public`, o risco é menor mas real.
- **Correção sugerida:** Alterar para `SET search_path = vault, public` (remover `pg_temp`) ou `SET search_path = ''` com qualificação completa de todas as referências internas.
- **Esforço:** Pequeno (1 migration `ALTER FUNCTION ... SET search_path = vault, public`)

---

#### [ID-CRON-003] `stock_daily_summary` vazia — cron de agregação falhando
- **Severidade:** ALTO
- **Objeto:** Tabela `stock_daily_summary` + job ID 4 (`fn_aggregate_stock_daily`)
- **Evidência:** `stock_daily_summary` tem 909 MB mas `n_live_tup = 0`. Job 4 chama `fn_aggregate_stock_daily()` às 22:30 UTC diariamente; falhas em massa de cron (CRON-001) provavelmente impedem a execução.
- **Impacto:** Dashboards e relatórios de estoque mostrando dados desatualizados ou ausentes.
- **Correção sugerida:** Após resolver CRON-001, verificar `SELECT COUNT(*), MAX(reference_date) FROM stock_daily_summary;`. Se vazio, executar `SELECT public.fn_aggregate_stock_daily();` manualmente.
- **Esforço:** Trivial após resolução de CRON-001

---

#### [ID-PERF-001] `user_organizations` — 8,2 milhões de seq scans, 0% índice
- **Severidade:** ALTO
- **Objeto:** Tabela `user_organizations`
- **Evidência:** `pg_stat_user_tables` → `seq_scan = 8.263.269`, `idx_scan = 609`, `idx_hit_pct = 0%`, `n_live_tup = 0`. 143,5M tuplas lidas via full scan.
- **Impacto:** Tabela usada em RLS policies e permissões com full table scan. Contribui para sobrecarga que causa CRON-001.
- **Correção sugerida:** `ANALYZE user_organizations;` → se tabela tem rows, criar `CREATE INDEX CONCURRENTLY ON user_organizations(user_id)` (ou `organization_id`). Se tabela foi esvaziada intencionalmente, investigar queries que ainda a acessam.
- **Esforço:** Pequeno

---

#### [ID-ST-001] Buckets privados `art-files` e `component-media` com SELECT público
- **Severidade:** ALTO
- **Objeto:** Storage buckets `art-files` (private) e `component-media` (private)
- **Evidência:** Buckets com `public=false` têm políticas RLS `TO public` com qualificador `true` — qualquer pessoa com URL do objeto pode acessar sem autenticação.
- **Impacto:** Arte de clientes e mídias de componentes acessíveis publicamente. Potencial vazamento de material proprietário.
- **Correção sugerida:** Ver `propostas/P01_storage_buckets_privados.sql`.
- **Esforço:** Pequeno (2 políticas RLS)

---

#### [ID-NET-001] Taxa de falha de 57% em webhooks `pg_net`
- **Severidade:** ALTO
- **Objeto:** `net._http_response` (últimos 7 dias)
- **Evidência:** 228 requisições: 99 sucesso (43%), 129 falha/pendente (57%).
- **Impacto:** Integrações externas (CRM, ERP, callbacks) não recebendo notificações. Parte da falha pode ser causada por CRON-001. Perda de dados de venda/estoque possível.
- **Correção sugerida:** Após resolver CRON-001: inspecionar `SELECT url, count(*) FROM net._http_response WHERE status_code NOT BETWEEN 200 AND 299 GROUP BY url ORDER BY count DESC` para identificar endpoints problemáticos.
- **Esforço:** Médio (investigação + retry logic)

---

### MÉDIO (seleção dos mais relevantes)

| ID | Achado | Objeto | Esforço |
|---|---|---|---|
| SEC-003 | pg_temp em 42 funções SECURITY DEFINER (além de SEC-003) | `check_edge_rate_limit`, `check_login_rate_limit` etc | Pequeno |
| INT-001 | 6 FKs sem índice (full scan em DELETE/UPDATE do pai) | `kit_quote_requests`, `product_packaging` etc | Trivial |
| INT-002 | Stats desatualizadas em tabelas com 0 live rows mas scans altos | `user_organizations`, `system_settings` etc | Trivial |
| PERF-002 | `workspace_notifications` 34,9% idx hit — 9.726 seq scans | `workspace_notifications` | Trivial |
| PERF-003 | `stock_daily_summary` 909 MB com 0 rows | `stock_daily_summary` | Ver CRON-001 |
| PERF-005 | `personalization_techniques`/`product_faqs` 100% seq scan | Tabelas de catálogo | Pequeno |
| CRON-002 | 300+ job IDs — possível sobrecarga de pool pg_cron | `cron.job` | Médio |
| FUNC-002 | `cron_invoke_edge` SECURITY DEFINER com chamada HTTP — risco SSRF | `cron_invoke_edge` | Pequeno |
| EF-001 | Chaves MCP sem expiração automática | `mcp_api_keys` | Pequeno |
| EF-005 | Sem ambiente de staging | `supabase/config.toml` | Médio |
| AU-001 | Sem política de senha configurada (default: 6 chars) | Supabase Auth | Trivial |
| ST-002 | Bucket `scripts` aceita shell scripts sem restrição de MIME | `scripts` bucket | Pequeno |
| ST-003 | Política UPDATE em `recibos-entrega` sem WITH CHECK | `recibos-entrega` bucket | Trivial |
| RT-001 | `auth.users` na publicação Realtime (adição manual) | `supabase_realtime` | Pequeno |
| LOG-002 | Sem alertas automáticos para erros de edge function | Observabilidade | Pequeno |
| LOG-003 | `pg_net` sem alerta automático para taxa de falha | Observabilidade | Pequeno |
| RLS-003 | `is_supervisor_or_above()` — verificar ausência de bypass | RLS policies | Trivial |
| GAP-001 | PITR — não confirmado via SQL (requer Dashboard) | Backup | Trivial |
| GAP-002 | Sem runbook de disaster recovery | Documentação | Pequeno |
| GAP-004 | Cobertura de audit log não verificada para tabelas críticas | `audit_log` triggers | Pequeno |
| GAP-006 | Sem política LGPD formal documentada | Compliance | Médio |

---

### BAIXO

| ID | Achado | Esforço |
|---|---|---|
| INT-003 | Backup table `_backup_stock_daily_summary_20260618` (42 MB) em produção | Trivial |
| PERF-004 | Bloat leve (2,7%) em `produtos_padronizacao_variantes` | N/A |
| FUNC-003 | Função `e2e_cleanup_check_rate_limit` em schema de produção | Trivial |
| AU-002 | Sem política de expiração de sessão documentada | Trivial |
| EF-003 | `external-db-inspect` usando `esm.sh` (legado, deve migrar para `npm:`) | Trivial |
| LOG-004 | Wraparound monitor sem runbook de resposta a incidente | Pequeno |
| GAP-003 | Soft-delete sem política de purge documentada | Pequeno |

---

### INFO (destaques positivos)

| ID | Achado |
|---|---|
| SEC-006 | RLS habilitada em 100% das tabelas — resultado excelente |
| FUNC-001 | 100% das 570 funções SECURITY DEFINER com `search_path` explícito |
| RLS-001 | Zero tabelas sem RLS, zero tabelas com RLS sem policies |
| RLS-002 | Gate CI 1.13.2 (anon INSERT rate guard) ativo e funcionando |
| GAP-007 | `SUPABASE_SERVICE_ROLE_KEY` não exposto no bundle frontend |
| EF-002 | `_shared/edge-authz-manifest.ts` documenta autenticação de todas as funções sem JWT |

---

## 4. Itens Não Verificados (requerem acesso ao Supabase Dashboard)

| ID | Item | Como Verificar |
|---|---|---|
| GAP-001 | PITR ativo e janela de retenção | Dashboard → Database → Backups |
| LOG-001 | Logs de edge function e postgres (ClickHouse) | Dashboard → Logs → Logs Explorer |
| GAP-004 | Cobertura de triggers de auditoria por tabela | Dashboard → Query Editor: `SELECT trigger_schema, trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table` |

---

## 5. Plano de Remediação por Ondas

### Wave 0 — AGORA (hoje, CRON-001 ativo)

1. **Verificar `pg_stat_activity`** no Dashboard → identificar queries longas/bloqueantes
2. **Terminar processes bloqueantes** se encontrados
3. **Após desbloquear:** executar `SELECT public.fn_aggregate_stock_daily();` se `stock_daily_summary` estiver vazia
4. **Monitorar** `cron.job_run_details` nas próximas 30 min para confirmar recuperação

### Wave 1 — Esta Semana (segurança crítica)

| Prioridade | ID | Ação |
|---|---|---|
| 1 | SEC-003 | Remover `pg_temp` de `get_edge_function_secret` search_path |
| 2 | ST-001 | Corrigir policies RLS de `art-files` e `component-media` (ver P01) |
| 3 | SEC-001 | Revisar 5 edge functions críticas sem JWT — hardening de auth |
| 4 | NET-001 | Investigar endpoints com mais falhas em `pg_net` |
| 5 | PERF-001 | `ANALYZE user_organizations` + criar índice em `user_id` |

### Wave 2 — Próximas 2 Semanas (performance e integridade)

| ID | Ação | SQL |
|---|---|---|
| INT-001 | Criar 6 índices em FKs sem suporte | Ver `propostas/P02_fk_indexes.sql` |
| INT-002 | `ANALYZE` nas tabelas com stats obsoletas | Ver `propostas/P03_analyze_tables.sql` |
| PERF-002 | Índice em `workspace_notifications(user_id, is_read, created_at DESC)` | Trivial |
| PERF-005 | Índices em `personalization_techniques` e `product_faqs` | Pequeno |
| ST-003 | Adicionar `WITH CHECK` na policy UPDATE de `recibos-entrega` | Trivial |
| EF-001 | Adicionar campo `expires_at` em `mcp_api_keys` | 1 migration |

### Wave 3 — Próximo Mês (observabilidade e governança)

| ID | Ação |
|---|---|
| LOG-002/LOG-003 | Configurar alertas Supabase para error rate de edge functions e pg_net |
| RT-001 | Avaliar remoção de `auth.users` da publicação Realtime |
| GAP-002 | Criar `docs/runbooks/disaster-recovery.md` |
| GAP-006 | Criar `docs/compliance/LGPD.md` |
| EF-005/GAP-005 | Avaliar Supabase Branch ou projeto separado para staging |
| CRON-002 | Auditar e desativar cron jobs obsoletos (IDs até 300+) |

### Wave 4 — Próximo Trimestre (manutenção preventiva)

| ID | Ação |
|---|---|
| INT-003 | DROP da backup table `_backup_stock_daily_summary_20260618` (com aprovação do PO) |
| FUNC-003 | Mover ou remover `e2e_cleanup_check_rate_limit` do schema público |
| GAP-003 | Implementar política de purge para soft-delete (90 dias) |
| GAP-001 | Documentar PITR após confirmação no Dashboard |

---

## 6. Matriz de Severidade por Seção

| Seção | CRÍTICO | ALTO | MÉDIO | BAIXO | INFO |
|---|---|---|---|---|---|
| 3 — Segurança | 1* | 2 | 2 | 0 | 2 |
| 4 — Integridade | 0 | 0 | 2 | 1 | 0 |
| 5 — Performance | 0 | 1 | 3 | 1 | 0 |
| 6 — Crons | 1 | 1 | 1 | 0 | 0 |
| 7 — DB Functions | 0 | 0 | 1 | 1 | 2 |
| 8 — Edge Functions | 0 | 0 | 2 | 1 | 3 |
| 9 — Auth/Storage/Realtime | 0 | 2 | 4 | 1 | 1 |
| 10 — Logs | 0 | 0 | 2 | 1 | 1 |
| 11 — RLS | 0 | 1† | 1 | 0 | 3 |
| 12 — Lacunas | 0 | 0 | 5 | 1 | 1 |
| **TOTAL** | **1** | **7** | **23** | **7** | **13** |

*SEC-001 classificado como CRÍTICO na Seção 3, ALTO aqui (agregado por severidade de negócio)  
†RLS-004 duplica ST-001 — contado uma vez no total

---

## 7. Pontos Positivos (o que está bem)

1. **RLS 100% habilitada** — todas as tabelas do schema público com RLS e ao menos uma policy. Zero tabelas em "deny-all silencioso".
2. **100% das SECURITY DEFINER com `search_path` explícito** — nenhuma função vulnerável a path injection pelo caminho clássico. `check_hardening_status` usa `search_path=""` (melhor prática).
3. **Infraestrutura de auditoria robusta** — `audit_rls_coverage`, `audit_rls_matrix`, `audit_mcp_api_keys_changes`, `check_hardening_status`.
4. **Manifesto de edge function auth** — `_shared/edge-authz-manifest.ts` documenta justificativa de auth de todas as 36 funções sem JWT.
5. **Gates CI abrangentes** — Gate 0 (SSOT), Gates 1.13/1.13.1/1.13.2 (RLS), Gate E23 (secrets), Gate 1.14 (secrets inventory).
6. **`service_role` key não exposta no frontend** — sem hardcoding de chave de produção no bundle.
7. **CRON_SECRET via vault** — crons que chamam edge functions usam `get_edge_function_secret('CRON_SECRET')` — chave não hardcoded.

---

## 8. Arquivos Gerados por Esta Auditoria

| Arquivo | Conteúdo |
|---|---|
| `auditoria-supabase/inventario/secao1_inventario.md` | Inventário completo: tabelas, views, funções, policies |
| `auditoria-supabase/secao2_drift.md` | Análise de drift entre repo e banco |
| `auditoria-supabase/secao3_seguranca.md` | Segurança: edge functions, SECURITY DEFINER, RLS |
| `auditoria-supabase/secao4_integridade.md` | Constraints, FKs sem índice, stats |
| `auditoria-supabase/secao5_performance.md` | Seq scans, tabelas grandes, índices |
| `auditoria-supabase/secao6_crons.md` | pg_cron: falhas ativas, configuração |
| `auditoria-supabase/secao7_db_functions.md` | DB functions: SECURITY DEFINER audit |
| `auditoria-supabase/secao8_edge_functions.md` | Edge functions: JWT, auth, deploy |
| `auditoria-supabase/secao9_auth_storage_realtime.md` | Auth, Storage buckets, Realtime, pg_net |
| `auditoria-supabase/secao10_logs.md` | Logs e observabilidade |
| `auditoria-supabase/secao11_rls.md` | RLS: cobertura, policies anon, gates CI |
| `auditoria-supabase/secao12_lacunas.md` | PITR, disaster recovery, LGPD, staging |
| `auditoria-supabase/propostas/P01_storage_buckets_privados.sql` | Fix: art-files e component-media |
| `auditoria-supabase/propostas/P02_fk_indexes.sql` | Índices para 6 FKs sem suporte |
| `auditoria-supabase/propostas/P03_analyze_tables.sql` | ANALYZE em tabelas com stats obsoletas |
| `auditoria-supabase/progresso.json` | Controle de progresso das seções |

---

*Auditoria conduzida em modo somente leitura. Nenhuma alteração foi feita no banco de produção.*
