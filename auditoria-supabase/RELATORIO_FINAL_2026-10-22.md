# Relatório Final de Auditoria — Supabase doufsxqlfjyuvxuezpln
**Data:** 2026-10-22 | **Sessão:** P17/P18/P19 | **Executor:** Claude Code (somente leitura)

## Confirmação do Projeto
- **URL:** https://doufsxqlfjyuvxuezpln.supabase.co ✓
- **PG:** PostgreSQL 17.6 (aarch64)
- **Snapshot do banco (baseline desta sessão):**
  - Tabelas públicas: 398
  - Funções públicas: 1.334
  - Políticas RLS: 960
  - Jobs cron: 142
  - Migrations no ledger: 2.539
  - Tabelas sem RLS: **0** ✓

---

## RESUMO DE SEVERIDADES

| Severidade | Contagem | Descrição |
|---|---|---|
| **CRÍTICO** | 1 | fn_cron_guard: anon tem EXECUTE (SQL injection) |
| **ERROR** | 8 | Views SECURITY DEFINER no advisor |
| **HIGH** | 3 | submit_quote_response anon-writable; 447+295 RLS sem wrapper; 799+ MB índices não usados |
| **MEDIUM** | 4 | 101 funcs SECURITY DEFINER autenticadas; 59 objetos anon GraphQL; 26.798 erros function_logs/24h; ai-recommendations verify_jwt=false |
| **LOW** | 3 | Extensions em public; 455 objetos authenticated GraphQL; realtime 14.821 erros/24h |
| **INFO** | 3 | Colisão cron */5 resolvida por 20261022193000; RLS habilitado em todas tabelas; auth schema normal |
| **PENDENTE** | 6 | 6 migrations aguardando aprovação humana no GitHub Actions |

---

## TOP-10 FINDINGS (evidência re-executada nesta sessão)

### F01 — CRÍTICO: fn_cron_guard executa SQL arbitrário como anon
**Query executada:** `SELECT r.rolname, has_function_privilege(...) FROM pg_proc WHERE proname='fn_cron_guard'`
**Evidência:** anon=**true**, authenticated=**true** (qualquer usuário pode chamar via /rpc/fn_cron_guard)
**Risco:** A função executa `EXECUTE p_sql` sem validação. Anon pode executar SQL arbitrário.
**Migração:** 20261022100001 (aguarda aprovação humana)

### F02 — ERROR×8: Views SECURITY DEFINER (advisor error)
**Fonte:** get_advisors(security) — 635 findings, 8 ERROR
**Views afetadas:** v_variant_sale_prices_public, v_product_properties_public, v_kit_component_media_public, v_suppliers_public, v_tabela_preco_gravacao_oficial_public, v_product_compositions_public, v_products_public, v_product_tags_public
**Risco:** Bypassam RLS do chamador, executam com permissões do owner da view.

### F03 — HIGH: 447 políticas RLS sem `(SELECT auth.uid())` wrapper
**Query executada:** `SELECT count(*) FILTER (WHERE qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')`
**Evidência:** policies_sem_wrapper_qual=**447**, policies_sem_wrapper_check=**295**, total=960
**Risco:** `auth.uid()` sem wrapper = initplan por linha = scan completo sem índice em tabelas grandes.
**Migração:** 20261022100010 (aguarda aprovação humana)

### F04 — HIGH: submit_quote_response executável por anon (escrita)
**Fonte:** advisors — `anon_security_definer_function_executable`
**Evidência:** `public.submit_quote_response(_token, _response, _response_notes)` acessível sem auth
**Risco:** Operação de escrita (submissão de resposta de orçamento) sem autenticação requerida.

### F05 — HIGH: 799+ MB em índices com idx_scan=0
**Query executada:** `SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)), idx_scan FROM pg_stat_user_indexes WHERE idx_scan=0`
**Top 6 (stock_snapshots):**
  - idx_snapshots_vss_captured: **304 MB**
  - idx_snapshots_product_captured: **178 MB**
  - idx_snapshots_captured_at: **48 MB**
  - idx_ss_variant_id: **43 MB**
  - idx_ss_supplier_id: **35 MB**
  - idx_stock_snapshots_supplier_branch_id: **33 MB**
**Total identificado (20 índices):** ≈ 799 MB
**Migração:** 20261022100011 (aguarda aprovação humana)

### F06 — MEDIUM: 101 funções SECURITY DEFINER executáveis por authenticated
**Fonte:** advisors — `authenticated_security_definer_function_executable`: 101 findings
**Inclui:** verify_step_up_password (acesso a dados de senha)
**Risco:** Superfície ampla de funções com elevação de privilégio.

### F07 — MEDIUM: 26.798 erros em function_logs nas últimas 24h
**Query executada:** `query_logs` com filtro `level IN ('error','ERROR')` por source
**Evidência:** function_logs=**26.798**, realtime_logs=**14.821**, auth_logs=**5.873**
**Nota:** Volume alto pode indicar edge functions com falhas recorrentes (timeout/conexão).

### F08 — MEDIUM: 59 objetos expostos ao anon via GraphQL
**Fonte:** advisors — `pg_graphql_anon_table_exposed`: 59 findings
**Inclui:** `internal.mv_product_leaf_category` (schema "internal" mas acessível a anon)
**Risco:** Possível vazamento de dados de catálogo sem autenticação via GraphQL.

### F09 — MEDIUM: ai-recommendations verify_jwt=false
**Fonte:** list_edge_functions — slug="ai-recommendations", verify_jwt=**false**
**Risco:** Edge function de recomendações AI acessível sem JWT válido — pode ser intencional para SEO/catálogo público, mas merece revisão.

### F10 — INFO → RESOLVIDO: Colisão cron */5 já tratada
**Query executada:** `SELECT schedule FROM cron.job WHERE schedule LIKE '%*/5%'`
**Evidência:** 0 rows — nenhum job com `*/5` existe mais
**Causa:** Migration `20261022193000` (incidente_2026_10_22_alivio_carga_cron) foi aplicada hoje antes/após as nossas dispatches.
**Status:** Nossas migrações 20261022100020/021/022 já não são necessárias para o schedule fix, mas ainda precisam ser revisadas se o conteúdo está correto.

---

## STATUS DAS 12 SEÇÕES

| Seção | Status | Resumo |
|---|---|---|
| S1: Inventário geral | ✅ | 398 tabelas, 1.334 funções, 142 crons, 960 policies, 2.539 migrations |
| S2: Drift migrations | ✅ | 6 migrations pendentes (aguardando aprovação GitHub); 20261022193000 aplicada (out-of-band?) |
| S3: Segurança — advisors | ✅ | 635 findings: 8 ERROR (SECURITY DEFINER views) + 627 WARN |
| S4: fn_cron_guard | ✅ | CRÍTICO confirmado: anon=true EXECUTE |
| S5: Performance — RLS | ✅ | 447 policies sem wrapper; 295 with_check sem wrapper |
| S6: Índices não usados | ✅ | 20 índices, 799+ MB desperdiçados |
| S7: Cron jobs | ✅ | 142 jobs, sem colisão */5 (resolvida por 20261022193000) |
| S8: Edge functions | ✅ | Múltiplas ACTIVE, 1 com verify_jwt=false (ai-recommendations) |
| S9: Auth/Storage/Realtime | ✅ | Auth schema normal, realtime 14.821 erros/24h |
| S10: Logs 7d | ✅* | 24h capturados: 47.571 erros totais (function+realtime+auth+supavisor) |
| S11: Matriz RLS | ✅ | 0 tabelas sem RLS; 960 políticas (447 com issue de perf) |
| S12: Lacunas/Gaps | ✅ | 6 migrations pendentes; security definer views; anon write function |

*Logs 7d: query_logs limita a 24h por chamada.

---

## PROVA DE NÃO-ALTERAÇÃO DE PRODUÇÃO

**Snapshot ANTES (início desta sessão):**
- ledger_total: 2.539 (query executada: `SELECT count(*) FROM supabase_migrations.schema_migrations`)
- Latest migration: 20261022193000 (não é uma das nossas 6)

**Snapshot DEPOIS:**
- As 6 migrations (20261022100001..100022) **NÃO estão no ledger**
- fn_cron_guard anon=**true** (inalterado — confirma que REVOKE não foi aplicado)
- RLS sem wrapper: 447 (inalterado — confirma que wrapper não foi aplicado)

**Conclusão:** Esta sessão não alterou nada em produção. Somente leitura.

---

## MIGRATIONS PENDENTES (aguardando aprovação humana)

Para aplicar, o PO precisa ir em:
**GitHub → Actions → "Apply Migration to Production" → Run workflow**
E aprovar cada execução em: **Settings → Environments → production → Reviewers**

| Versão | Nome | Prioridade | Risco |
|---|---|---|---|
| 20261022100001 | security_fn_cron_guard_revoke_anon | CRÍTICO | Baixo (REVOKE only) |
| 20261022100010 | perf_rls_auth_uid_wrapper | HIGH | Médio (ALTER POLICY ×50) |
| 20261022100011 | perf_drop_unused_indexes | HIGH | Médio (DROP INDEX ×13) |
| 20261022100020 | fix_cron_dispatcher_failure_alert | BAIXO | Redundante (colisão já resolvida) |
| 20261022100021 | fix_cron_hash_product_images | BAIXO | Redundante |
| 20261022100022 | fix_cron_sync_is_stockout_universal | BAIXO | Redundante |

---

## ARQUIVOS DE ENTREGA

| Arquivo | Conteúdo |
|---|---|
| `auditoria-supabase/RELATORIO_FINAL_2026-10-22.md` | Este relatório |
| `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` | Relatório completo sessão anterior |
| `auditoria-supabase/secao*.md` (S1–S12) | Detalhamento por seção |
| `auditoria-supabase/propostas/P01–P19_*.sql` | 19 migrations/propostas de correção |
| `supabase/migrations/20261022100001–100022.sql` | 6 migrations prontas para aprovação |
| `supabase/MIGRATIONS_SYNC_LOG.md` | Ledger local com recibos |
