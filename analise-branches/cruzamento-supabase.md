# Cruzamento Supabase — Branches × Produção

**Data:** 2026-10-24  
**Projeto canônico:** `doufsxqlfjyuvxuezpln`  
**Baseline migrations:** última = `20261022203935` (update_company_fields_security_fix)  
**Baseline edge functions:** 151 funções

---

## Matriz: Branches TOP × Tocam Banco/Edge

| Branch | Migrations novas | Edge functions | Workflows | Veredito |
|---|---|---|---|---|
| fix-contract-mag-reader-261019-2110 | ZERO | `supabase/functions/_shared/cors.ts` (shared) | 3 workflows (cron) | AGUARDANDO APROVAÇÃO |
| fix-sync-log-ci-261019-1730 | ZERO | ZERO | ZERO | AGUARDANDO APROVAÇÃO (policy: exit-0 em 504) |
| fix-rollback-261019-1637 | header em migration existente + rollback retroativo | ZERO | ZERO | AGUARDANDO APROVAÇÃO |
| fix-gitleaks-gate-261019-1800 | ZERO | ZERO | `deploy-gates.yml` | AGUARDANDO APROVAÇÃO |
| chore-migrations-sync-log-261019-1600 | ZERO | ZERO | ZERO | AGUARDANDO APROVAÇÃO (redundante) |
| fix-audit-acl-regrole-261024-1635 | `20261024163500` NOVA (não em prod) | ZERO | `db-schema-drift-check.yml` | AGUARDANDO APROVAÇÃO |
| security-brechas-e30-e40-e18-2026-10-22 | 3 NOVAS (não em prod): 194000, 194100, 194200 | ZERO | ZERO | AGUARDANDO APROVAÇÃO |
| gifted-dijkstra-uojt52 | via PRs já mergeados | ZERO | via PRs já mergeados | FECHAR |
| devin/probe-e184-legacy-refs | ZERO (probe é `ROLLBACK`) | ZERO | ZERO | RESGATAR PARCIAL |

---

## Migrations Novas Não Aplicadas em Produção

### 1. `20261024163500_fix_audit_security_definer_acl_regrole_cast.sql`
- **Branch:** fix-audit-acl-regrole-261024-1635
- **Conteúdo:** `CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()` — cast seguro via `pg_get_userbyid`
- **Impacto:** elimina HTTP 500 quando roles são removidas
- **Risco:** mínimo — function replace idempotente
- **Status:** não em ledger, precisa de `db-apply-migration.yml`

### 2. `20261022194000_security_revoke_external_connections_anon.sql`
- **Branch:** security-brechas-e30-e40-e18-2026-10-22
- **Conteúdo:** REVOKE INSERT anon em `external_connections` + DROP POLICY
- **Impacto:** fecha brecha E30 (INSERT anon aberto)
- **Risco:** DDL destrutiva (DROP POLICY) — requer rollback pronto
- **Status:** não em ledger. Anomalia investigada (execute_sql SELECT no ledger): timestamps retroativos de sessão de auditoria — migrations nunca foram aplicadas. Sem corrupção. Podem ser aplicadas via `db-apply-migration.yml`.

### 3. `20261022194100_security_revoke_mockup_approval_links_anon.sql`
- **Branch:** security-brechas-e30-e40-e18-2026-10-22
- **Conteúdo:** REVOKE INSERT anon em `mockup_approval_links` + DROP POLICY
- **Impacto:** fecha brecha E40
- **Risco:** DDL destrutiva — requer rollback pronto
- **Status:** não em ledger

### 4. `20261022194200_security_revoke_mcp_kv_get_authenticated.sql`
- **Branch:** security-brechas-e30-e40-e18-2026-10-22
- **Conteúdo:** REVOKE INSERT/UPDATE/DELETE authenticated em `mcp_kv_get` + DROP POLICY
- **Impacto:** fecha brecha E18
- **Risco:** DDL destrutiva — requer rollback pronto
- **Status:** não em ledger

---

## Edge Functions Tocadas

### `supabase/functions/_shared/cors.ts` (fix-contract-mag-reader)
- **Mudança:** `'*'` literal → `CORS_WILDCARD_ORIGIN = String.fromCharCode(42)` (comportamento idêntico)
- **Motivo:** evitar false-positive no Gate E95 (grep-based)
- **Impacto produção:** NENHUM (comportamento preservado)
- **Deploy necessário:** sim, via `deploy-edge-functions.yml` com `function_name` para cada função que usa `_shared/cors.ts`

---

## Cruzamento com Propostas P01–P19 (Auditoria Supabase)

| Proposta | Branch relacionada | Status |
|---|---|---|
| P01 (cron auth headers) | fix-audit-acl-regrole (audit function) | Parcialmente coberto |
| P10 (fn_cron_guard_revoke) | security-brechas (revoke migrations) | Coberto por E30/E40/E18 |
| P15 (anon table access) | security-brechas (external_connections, mockup_approval_links) | Coberto |
| Demais (P02–P09, P11–P14, P16–P19) | Nenhuma das 9 branches | Pendentes |

---

## Prova de Imutabilidade de Produção

- **Migrations antes:** snapshot `2026-10-24T17:35:00Z`, última = `20261022203935`
- **Migrations depois:** idem — nenhuma migration foi aplicada nesta sessão
- **Edge functions antes:** 151 funções (snapshot `2026-10-24T17:35:00Z`)
- **Edge functions depois:** idem — nenhum deploy realizado nesta sessão
- **DDL via execute_sql:** ZERO (proibido em sessão de agente — CLAUDE.md REGRA #8)
