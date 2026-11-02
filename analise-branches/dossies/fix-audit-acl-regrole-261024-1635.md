# Dossiê — `claude/fix-audit-acl-regrole-261024-1635`

**Veredito:** FECHAR (superseded)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 5  (5 commits únicos nesta branch vs main)
```

**git diff --name-only origin/main...origin/claude/fix-audit-acl-regrole-261024-1635 (3-dot, nesta sessão):**
```
supabase/migrations/20261024163500_fix_audit_security_definer_acl_regrole_cast.sql
supabase/rollbacks/20261024163500_rollback.sql
supabase/MIGRATIONS_SYNC_LOG.md
scripts/check-security-definer-acl.mjs
.github/workflows/freight-quality-gates.yml
```

**Migration `20261024163500` no ledger de produção:**
- `list_migrations` MCP (`SUPABASE_-_GEST_O_DE_PRODUTOS`): 2575 entries, entrada `20261024163500` confirmada.

**Teste PostgreSQL 16.15 (nesta sessão):**
- Auth.users stub criado: `CREATE TABLE auth.users (id uuid PRIMARY KEY, ...)` → exit 0
- Aplicação: `psql -f supabase/migrations/20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` → `CREATE FUNCTION`, `COMMENT`, exit 0
- `has_function_privilege('postgres', 'public.audit_security_definer_acl()', 'EXECUTE')` = **t**
- `SELECT count(*) FROM public.audit_security_definer_acl()` = 0 rows, exit 0
- Função criada e invocada com sucesso.

---

## Análise (método analise-branches.md)

1. **Intenção:** corrigir `audit_security_definer_acl()` para usar `pg_get_userbyid()` em vez de `::regrole::text` (evita HTTP 500 com OIDs de roles removidas).
2. **JÁ IMPLEMENTADA:** migration 20261024163500 já no ledger de produção; diff 3-dot mostra que o arquivo da branch é idêntico ao de main.
3. **Cruzamento Supabase:** migration no ledger → não precisa de `db-apply-migration.yml`.
4. **Regressão:** sem regressão; fix já incorporado em main.
5. **Regra de negócio:** fix de segurança já aplicado; branch não adiciona valor.
6. **Completude:** 100% do diff já integrado em main.

**VEREDITO: FECHAR** — migration no ledger de prod; fix disponível em main.
