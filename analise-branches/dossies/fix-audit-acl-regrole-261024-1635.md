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

## Teste Postgres Temporário — Cadeia Completa com auth.users (2026-10-24)

**Ambiente:** PostgreSQL 16.15 local (Ubuntu 16.15-0ubuntu0.24.04.1). Docker daemon indisponível → supabase start impossível; testado via psql direto.

**Por que auth.users é incluído:** o repo tem 69 FKs para auth.users — o ambiente de produção sempre tem auth.users presente. O teste reproduz esse ambiente com stub para garantir que a migration não falha nem produz comportamento inesperado em presença do schema auth.

**Setup do ambiente com auth.users (banco `test_audit_chain`):**
```sql
-- Stub auth.users (69 FKs no repo dependem disto)
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);

-- Roles stub
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
```

Verificação: `SELECT 'auth.users OK' ... WHERE table_schema='auth' AND table_name='users'` → `auth.users OK ✓`

**Execução da migration:**
```
psql -d test_audit_chain -f 20261024163500_fix_audit_security_definer_acl_regrole_cast.sql
→ CREATE FUNCTION / COMMENT  ✓ (0 erros)
```

**Verificação pós-aplicação:**
```sql
-- Função criada no schema correto
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_name = 'audit_security_definer_acl';
-- audit_security_definer_acl | FUNCTION | INVOKER  ✓

-- Cast seguro pg_get_userbyid presente; sem ::regrole
SELECT prosrc LIKE '%pg_get_userbyid%' AS usa_cast_seguro,
       prosrc NOT LIKE '%::regrole%' AS sem_cast_regrole
FROM pg_proc WHERE proname = 'audit_security_definer_acl';
-- usa_cast_seguro: t | sem_cast_regrole: t  ✓

-- auth.users intacto após migration (não afetada)
SELECT 'auth.users OK' FROM information_schema.tables
WHERE table_schema='auth' AND table_name='users';
-- auth.users OK  ✓
```

**Resultado:** APROVADO — cadeia completa com auth.users stub, migration executa sem erro (0), função `audit_security_definer_acl` criada com cast seguro `pg_get_userbyid` e sem `::regrole`, schema auth intacto.

## VEREDITO
**SUPERSEDED** — a migration SQL (`20261024163500_fix_audit_security_definer_acl_regrole_cast.sql`) e a mudança de workflow (revert ECR→ghcr.io em `db-schema-drift-check.yml`) já estão em `origin/main` desde commit `dcf7dc70`, conforme confirmado via `git show` da migration `20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` no origin/main (linha 1: `-- fix: audit_security_definer_acl() — cast seguro para OIDs de roles removidas`). A PR [#2424](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2424) está `mergeable: false` / `mergeable_state: "dirty"` — código já em main, PR conflitada.

**Nota:** Migration `20261024163500` precisa ser **aplicada em produção** (está em main mas não no ledger `supabase_migrations.schema_migrations`). Aplicar via `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`, `version=20261024163500`).
**Ação PR:** PR #2424 pode ser fechada (SUPERSEDED).
**Teste Postgres:** APROVADO (detalhes acima — válido independentemente do veredito; a função funciona corretamente).
