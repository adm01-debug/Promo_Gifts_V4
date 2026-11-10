# Dossiê — `claude/fix-rollback-261019-1637`

**Veredito:** FECHAR (superseded)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 2  (2 commits únicos nesta branch vs main)
```

**git diff --name-only origin/main...origin/claude/fix-rollback-261019-1637 (3-dot, nesta sessão):**
```
supabase/migrations/20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard.sql
supabase/MIGRATIONS_SYNC_LOG.md
```

**Diff completo lido (nesta sessão):**
```diff
 -- mirror: DDL aplicada em produção fora do fluxo de migration (out-of-band)
+-- Rollback: see supabase/rollbacks/20261019000000_rollback.sql
```
Única mudança real: +1 linha de comentário em `20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard.sql`.

**Migration `20261019000000` no ledger de produção:**
- `list_migrations` MCP (`SUPABASE_-_GEST_O_DE_PRODUTOS`): 2575 entries, entrada `20261019000000` confirmada.

**Teste PostgreSQL 16.15 (nesta sessão):**
- Auth.users stub criado: `CREATE TABLE auth.users (id uuid PRIMARY KEY, ...)` → exit 0
- Constraint: `ALTER TABLE frontend_telemetry ADD CONSTRAINT frontend_telemetry_size_caps_check ... NOT VALID` → exit 0
- `VALIDATE CONSTRAINT frontend_telemetry_size_caps_check` → exit 0
- `has_table_privilege('postgres', 'public.frontend_telemetry', 'SELECT')` = **t**
- Sintaxe válida; migration JÁ APLICADA em produção.

---

## Análise (método analise-branches.md)

1. **Intenção:** registrar migration espelho (OOB) 20261019000000 + adicionar referência ao rollback.sql
2. **JÁ IMPLEMENTADA:** migration 20261019000000 já está no ledger de produção (2575 entries); rollback ref é 1 linha de comentário já em main.
3. **Cruzamento Supabase:** migration no ledger → não precisa de `db-apply-migration.yml`.
4. **Regressão:** sem regressão detectada.
5. **Regra de negócio:** sem impacto funcional — apenas comentário.
6. **Completude:** branch não adiciona nada que main não tenha.

**VEREDITO: FECHAR** — 100% do diff já integrado em main.
