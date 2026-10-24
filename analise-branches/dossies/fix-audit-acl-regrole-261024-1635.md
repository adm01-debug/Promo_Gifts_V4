# Dossiê — claude/fix-audit-acl-regrole-261024-1635

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** ahead: 5 | Behind: ~81

## Intenção
Corrigir função `public.audit_security_definer_acl()` que causava HTTP 500 ao usar `::regrole::text` em roles removidas. Cast seguro via `pg_get_userbyid()`. Inclui ajuste em workflow de drift-check, allowlist de ledger e recibo de migration.

## Commits únicos (git cherry + = 5)
```
cf091447 fix(db): cast seguro em audit_security_definer_acl para roles removidas
8a10866f chore(ci): allowlist 4 versões remote_only bloqueantes no ledger (PR #2404)
951b4b56 fix(ci): reverte registry E104 de ECR Public para ghcr.io
c3bfedd6 chore(ci): adiciona recibo pendente Gate 1.13.3 para migration 20261024163500
6a36664f fix(ci): porta baseline de migration-refs para inventario/branches.json (PR #2408)
```

## Arquivos modificados (5)
- `supabase/migrations/20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` — migration nova (99 linhas: `CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()`)
- `.github/workflows/db-schema-drift-check.yml` — reverte registry E104 (ECR → ghcr.io)
- `.migration-refs-baseline.json` — bump de baseline de referências
- `.migration-ledger-remote-only-allowlist.json` — allowlist de 4 versões
- `supabase/MIGRATIONS_SYNC_LOG.md` — recibo de migration

## Análise da Migration
- `20261024163500` não está em produção (ledger baseline: última = `20261022203935`; 20261024163500 > 20261022203935)
- Conteúdo: `CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()` usando `pg_get_userbyid(a.grantee)` em vez de `a.grantee::regrole::text`
- Fix legítimo: `::regrole` lança exceção quando a role não existe mais; `pg_get_userbyid` retorna NULL silenciosamente
- **Esta é uma nova migration que precisa ser aplicada em produção**

## Cruzamento Supabase
- **Migrations:** SIM — `20261024163500` nova, não em produção
- **Edge functions:** ZERO
- **Workflow:** SIM — `.github/workflows/db-schema-drift-check.yml`

## Teste Postgres Temporário (2026-10-24)

**Ambiente:** PostgreSQL 16.15 local (Ubuntu 16.15-0ubuntu0.24.04.1). Docker daemon indisponível → supabase start impossível; testado via psql direto.

**Verificação do SQL da migration (lido diretamente via `git show origin/claude/fix-audit-acl-...`):**
- `grep -i "auth\." 20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` → zero ocorrências
- Migration é `CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()` que usa `pg_get_userbyid(a.grantee)` em vez de `a.grantee::regrole::text` — opera em `pg_catalog`, sem referência ao schema `auth`.

**Conclusão:** migration não referencia `auth.users` nem FKs do schema `auth`. Stubs de `auth.users` desnecessários para este teste.

**Execução:**
```
psql -d test_branch_analysis -f 20261024163500_fix_audit_security_definer_acl_regrole_cast.sql
→ SET / CREATE FUNCTION / COMMENT   ✓ (0 erros)
```

**Verificação pós-aplicação:**
```sql
SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_name = 'audit_security_definer_acl';
-- Resultado: audit_security_definer_acl | FUNCTION  ✓
```

**Resultado:** APROVADO — migration executa sem erro, função criada corretamente no banco de teste.

## VEREDITO
**AGUARDANDO APROVAÇÃO** — nova migration DDL (`CREATE OR REPLACE FUNCTION`) não aplicada em produção + toca workflow `.github/workflows/db-schema-drift-check.yml`. Requer aprovação humana e aplicação via `db-apply-migration.yml` (único caminho autorizado — CLAUDE.md REGRA #8).

**O que muda em produção:** `audit_security_definer_acl()` substituída por versão com cast seguro — elimina HTTP 500 quando role foi removida. Risco: mínimo (function replace idempotente, só muda o cast). Rollback: recriar a versão anterior da função (disponível em git history do main).
**ID auditoria:** relacionado a P03 (security_definer search_path) e Gate 1.13 (RLS).
**Teste Postgres:** APROVADO (detalhes acima).
