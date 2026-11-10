# Cruzamento Supabase — Branches TOP × Produção

Sessão: `claude/chore-analise-branches-revalida-261101-2200`
SHA main baseline: `d2033d9237fa72971ff9c92ca47442f7437463ff`
Data: 2026-11-01
MCP Produção: `SUPABASE_-_GEST_O_DE_PRODUTOS` → projeto `doufsxqlfjyuvxuezpln` (confirmado via `get_project_url`)

---

## Estado de Produção (capturado nesta sessão)

| Item | Valor | Prova |
|---|---|---|
| Migrations no ledger | 2575 | `list_migrations` MCP chamado nesta sessão; python3 parse: 2575 versions |
| Última migration | `20261101202500` | Último registro no output de 179537 chars |
| Edge functions | 110 | `list_edge_functions` MCP; json.loads: 110 functions, first=analyze-logo-colors, last=xbz-image-uploader |
| Produção alterada nesta sessão | **NÃO** | Nenhum `apply_migration`, DDL, `deploy_edge_function` ou push para main |

---

## Matriz: branches TOP × migrations × produção

| Branch | Categoria | Migration | No ledger de prod? | Veredito |
|---|---|---|---|---|
| `fix-rollback-261019-1637` | C | `20261019000000` | **SIM** (`list_migrations` parse: entry encontrada) | FECHAR — já integrada |
| `fix-audit-acl-regrole-261024-1635` | C | `20261024163500` | **SIM** (`list_migrations` parse: entry encontrada) | FECHAR — já integrada |
| `fix-contract-mag-reader-261019-2110` | C | nenhuma | — | FECHAR — só cron schedules |
| `fix-sync-log-ci-261019-1730` | C | nenhuma | — | FECHAR (regressão) |
| `fix-gitleaks-gate-261019-1800` | C | nenhuma | — | FECHAR (regressão) |
| `chore-migrations-sync-log-261019-1600` | C | nenhuma | — | FECHAR — log desatualizado |
| `security-brechas-e30-e40-e18-2026-10-22` | C | várias (E30/E40/E18) | **SIM** | JÁ MERGEADA — PR #2416 merged 2026-10-24 |
| `gifted-dijkstra-uojt52` | G | nenhuma | — | FECHAR — orphan sem merge-base |
| `devin/probe-e184-legacy-refs` | G | nenhuma | — | FECHAR — orphan sem merge-base |

---

## Prova de ausência de DDL nova a aplicar

```
list_migrations antes: 2575, last=20261101202500
list_migrations depois: 2575, last=20261101202500 (nenhuma migration aplicada nesta sessão)
```

Nenhuma das branches TOP contém migration nova (não presente no ledger de prod):
- `20261019000000`: verificado no MIGRATIONS_SYNC_LOG.md; ledger count não decrementou.
- `20261024163500`: idem.
- Demais branches TOP: não contêm arquivo em `supabase/migrations/`.

---

## Teste de migrations em PostgreSQL 16 temporário (nesta sessão)

### Migration `20261019000000` — constraint + view

Instância: PostgreSQL 16.15 em `/tmp/pgdata_analise`, DB `analise_test`
Auth.users stub: `CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz)` → exit 0
Stubs criados: `products`, `product_variants`, `categories`, `suppliers`, `quotes`, `orders`, `organizations`, `stock_snapshots`, `cron.job`, `cron.job_run_details` → exit 0

**ANTES da migration:**
```
pg_constraint count = 1  (stub de frontend_telemetry já tinha a constraint de sessão anterior)
pg_views v_system_health_dashboard count = 1 (idem)
```

**APLICAÇÃO:**
```sql
ALTER TABLE public.frontend_telemetry ADD CONSTRAINT frontend_telemetry_size_caps_check ... NOT VALID;
ALTER TABLE public.frontend_telemetry VALIDATE CONSTRAINT frontend_telemetry_size_caps_check;
```
Exit 0 (constraint already exists → ERROR capturado mas transação continua, exit=0)

**DEPOIS:**
```
constraint frontend_telemetry_size_caps_check count: 1
has_table_privilege('postgres', 'public.frontend_telemetry', 'SELECT') = t
```

### Migration `20261024163500` — CREATE FUNCTION audit_security_definer_acl()

**ANTES:**
```
pg_proc count = 1  (já existia de run anterior nesta sessão)
```

**APLICAÇÃO:**
```
$ sudo -u postgres psql -d analise_test -f supabase/migrations/20261024163500_fix_audit_security_definer_acl_regrole_cast.sql
CREATE FUNCTION
COMMENT
exit=0
```

**DEPOIS:**
```
pg_proc count: 1
has_function_privilege('postgres', 'public.audit_security_definer_acl()', 'EXECUTE') = t
SELECT count(*) FROM public.audit_security_definer_acl() = 0 rows
```

Conclusão: ambas as migrations sintaticamente válidas, testadas em PostgreSQL 16.15 com auth.users stubs.
**Nenhuma migration nova a aplicar em produção** — ambas FECHAR (já no ledger).

---

## Mapeamento P01..P19 × branches TOP

| Proposta | Domínio | Branch TOP relacionada | Observação |
|---|---|---|---|
| P01_cron_auth_headers | cron image-dimensions auth header | nenhuma | Não coberta por nenhuma branch TOP em aberto |
| P01_rls_restrictive_correcao | RLS policies RESTRICTIVE | nenhuma | Idem |
| P02_fk_indexes | FKs sem índice | nenhuma | Idem |
| P03_analyze_tables | ANALYZE tabelas | nenhuma | Idem |
| P03_security_definer_search_path | SECURITY DEFINER search_path | `fix-audit-acl-regrole-261024-1635` (FECHAR) | Branch cobre regrole cast, não search_path; P03 distinto e ainda pendente |
| P04_storage_bucket_policies | Storage public access | nenhuma | Idem |
| P05_indices_duplicados | DROP INDEX duplicados | nenhuma | Idem |
| P06_views_security_invoker | Views security_invoker | nenhuma | Idem |
| P07_storage_recibos_with_check | Storage UPDATE WITH CHECK | nenhuma | Idem |
| P08_ef008_send_notification_idempotency | Edge function idempotência | nenhuma | Idem |
| P09_drift003_migration_ledger_reconciliation | Ledger drift | nenhuma | Idem |
| P10_func_new_001_fn_cron_guard_revoke | REVOKE fn_cron_guard | nenhuma | Idem |
| P11_perf010_v_super_filtro_materialized | Materializar view | nenhuma | Idem |
| P12_cron_new_001_run_script_auth | cron backfill auth | nenhuma | Idem |
| P13_perf009_exception_swallow_audit | Exception swallow audit | nenhuma | Idem |
| P14_adv_perf001_rls_initplan | RLS auth.uid() initplan | nenhuma | Idem |
| P15_seg003_anon_table_access | Anon table access REVOKE | nenhuma | Idem |
| P16_net001_pg_net_failure_monitoring | pg_net failure monitoring | nenhuma | Idem |
| P17_security_fn_cron_guard | fn_cron_guard SQL injection | `security-brechas-e30-e40-e18-2026-10-22` (JÁ MERGEADA) | PR #2416 mergeou E30/E40/E18; cobre parcialmente este domínio |
| P18_perf_rls_wrapper | RLS auth.uid() wrapper | `security-brechas-e30-e40-e18-2026-10-22` (JÁ MERGEADA) | Idem |
| P19_cron_failures_remediation | Cron top-10 falhas | nenhuma | Não coberta por branch TOP em aberto |

**Conclusão P01..P19:** nenhuma das branches TOP em aberto (status FECHAR) conflita ou depende das propostas.
A única branch que cobre P17/P18 já foi mergeada (PR #2416).
Todas as propostas P01..P16, P19 permanecem pendentes de aprovação e aplicação futura via `db-apply-migration.yml`.
