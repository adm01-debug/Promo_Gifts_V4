# PR #3150 — Evidências de diff 100% lido

**Branch:** codex/fix-ci-migrations-pending-261107-0238  
**Título:** fix(ci): libera migrations pendentes + hardening de funções de ruptura/busca

## Arquivos alterados (17 total)

### GOVERNANCE (REGRA#8) — 2 workflows + 3 migrations + 3 rollbacks
| Arquivo | Mudança |
|---|---|
| `.github/workflows/db-schema-drift-check.yml` | CONFLITO — atualiza drift check |
| `.github/workflows/deploy-gates.yml` | CONFLITO — atualiza gates |
| `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` | Drop/revoke funções criadas por agente |
| `supabase/migrations/20261107143505_fix_sb0003_fn_get_rupture_alerts_hardened.sql` | Hardening de `fn_get_rupture_alerts` (rename de `20261101150000`) |
| `supabase/migrations/20261107143509_fn_global_search_clamp_limit_hardened.sql` | Hardening de `fn_global_search` (rename de `20261101190101`) |
| `supabase/rollbacks/20261101202000_rollback.sql` | Rollback da migration drop/revoke |
| `supabase/rollbacks/20261107143505_rollback.sql` | Rollback da migration fn_get_rupture_alerts |
| `supabase/rollbacks/20261107143509_rollback.sql` | Rollback da migration fn_global_search |

### NÃO-GOVERNANCE (9 arquivos)

| Arquivo | Mudança |
|---|---|
| `PENDENCIAS.md` | CONFLITO — adiciona itens |
| `audit/supabase-reference-catalog.temporary.json` | Atualiza catálogo de referência |
| `scripts/check-supabase-migration-ledger.mjs` | Atualiza verificação do ledger |
| `scripts/drift-baseline.mjs` | CONFLITO — fix BOM UTF-8 (também em PR#3205) |
| `scripts/migration-ledger-remote-only-allowlist.json` | Atualiza allowlist |
| `supabase/MIGRATIONS_SYNC_LOG.md` | Atualiza log de sincronização |
| `tests/scripts/check-supabase-migration-ledger.test.mjs` | Testes do ledger |
| `tests/scripts/drift-baseline.test.mjs` | Testes do drift baseline |
| `tests/security/security-definer-acl-gate.test.ts` | Testes de ACL para SECURITY DEFINER |

## Regressão potencial (não-governance)

- `scripts/drift-baseline.mjs`: Mesmo arquivo modificado em PR#3205 (BOM fix). **Conflito semântico** entre as duas PRs — uma delas pode reverter a correção da outra.
- `supabase/migrations/20261107143505_*` renomeia arquivo que estava em PR#3179 como `20261101150000`. Se ambas forem mergeadas, haverá conflito de versão no ledger.
- `deploy-gates.yml` CONFLITO: alto risco de regressão em CI.

## Regra de negócio
PR válida — hardening de funções com `search_path` explícito e clamp de limite de busca são correções de segurança legítimas. Rename de migrations para data correta é boa prática.

## Conflitos
**6 conflitos** em: `.github/workflows/db-schema-drift-check.yml`, `.github/workflows/deploy-gates.yml`, `PENDENCIAS.md`, `scripts/drift-baseline.mjs`, `supabase/MIGRATIONS_SYNC_LOG.md`.

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — 2 workflows + 3 migrations + 3 rollbacks + 6 conflitos incluindo `deploy-gates.yml` (gate crítico). Conflito com PR#3205 em `drift-baseline.mjs` requer decisão de qual PR tem prioridade.
