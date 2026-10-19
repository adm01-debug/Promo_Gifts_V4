# Registro de Conflitos Semânticos (ledger vivo — protocolo multiagente §4)

> Toda resolução de conflito não trivial é registrada aqui. Padrão de commit: REGRA #3 do
> CLAUDE.md. "Main wins" não é heurística aceita; decisão é por arquivo, com razão.

| Data (UTC) | PR/branch | Arquivos | Decisão por arquivo | Razão | Verificação pós-merge |
|---|---|---|---|---|---|
| _(exemplo)_ 2026-08-29 | #0000 | `client.ts` | mantive guarda SSOT | invariante REGRA #1 | `node scripts/validate-supabase-config.mjs` ✅ |

## Registros

| Data (UTC) | PR/branch | Arquivos | Decisão por arquivo | Razão | Verificação pós-merge |
|---|---|---|---|---|---|
| 2026-10-18T17:30 | `claude/hopeful-heisenberg-dt4bl3` (c15df05a) | `.github/required-checks.json` | mantive JSON formatado do HEAD + restaurei "Compare GitHub × Canonical" (removido erroneamente em PR #2233 pelo paths filter) | Gate obrigatório não pode sumir de required-checks; REGRA #1 exige integridade do pipeline | `node scripts/check-workflow-contracts.mjs --gate` ✅ |
| 2026-10-18T17:30 | `claude/hopeful-heisenberg-dt4bl3` (c15df05a) | `supabase/MIGRATIONS_SYNC_LOG.md` | mantive hash `47a7acec...` para 20261008230000 (sha256sum verificado); adicionei 20261015150000 genuíno de main; descartei 5 entradas duplicadas (20261005124500/501/502/503, 20261005130000) | Duplicatas disparariam gate countVersionOccurrences; hash correto verificado por sha256sum | `node scripts/check-migrations-sync-log-gate.mjs` ✅ |
