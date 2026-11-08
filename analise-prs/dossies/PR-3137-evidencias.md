# PR #3137 — Evidências de diff 100% lido

**Branch:** codex/fix-ci-e2e-detector-false-neg-261107-0238  
**Título:** fix(ci): impede falso negativo detector E2E + reconcilia migration history

## Arquivos alterados (10 total)

### GOVERNANCE (REGRA#8) — 1 workflow + 1 migration + 1 rollback
| Arquivo | Mudança |
|---|---|
| `.github/workflows/db-reconcile-migration-history.yml` | NOVO — workflow `workflow_dispatch` para reconciliar histórico de migrations via `preflight-migration-history-revert.mjs` |
| `supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql` | NOVO — cria tabelas de dependência pública (bootstrap) |
| `supabase/rollbacks/20260511235959_rollback.sql` | NOVO — rollback da migration bootstrap |

### NÃO-GOVERNANCE (7 arquivos)

| Arquivo | Mudança |
|---|---|
| `scripts/migration-history-revert-manifest.json` | NOVO — manifesto de revert com lista de migrations a reconciliar |
| `scripts/migration-ledger-remote-only-allowlist.json` | NOVO — allowlist de migrations remotas-only |
| `scripts/preflight-migration-history-revert.mjs` | NOVO — preflight de revert de histórico (read-only: valida antes de aplicar) |
| `supabase/MIGRATIONS_SYNC_LOG.md` | Atualiza log com status da reconciliação |
| `tests/scripts/bootstrap-public-dependencies.test.mjs` | NOVO — testes do script bootstrap |
| `tests/scripts/db-reconcile-migration-history-workflow.test.mjs` | NOVO — testes do workflow de reconciliação |
| `tests/scripts/preflight-migration-history-revert.test.mjs` | NOVO — testes do preflight |

## Regressão potencial (não-governance)

- `scripts/preflight-migration-history-revert.mjs`: Script novo, apenas leitura/validação — sem impacto em produção quando não acionado pelo workflow. **Risco zero**.
- `supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql`: Migration nova em data antiga (2026-05-11). **Risco: REGRA#8** — migration DDL requer aprovação humana; aplica DDL que pode conflitar com estado atual do banco.

## Regra de negócio
PR cria infraestrutura para reconciliar histórico de migrations fora de sincronia. É complementar ao fluxo E15 (único caminho autorizado). O workflow novo segue o padrão `workflow_dispatch`.

## Conflito
**CONFLITO** em `package.json` (versões de dependências divergem do main).

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — `.github/workflows/db-reconcile-migration-history.yml` (novo workflow) + `supabase/migrations/` (nova migration DDL em data passada). Requer análise humana do impacto da migration bootstrap no banco atual.
