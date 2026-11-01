# Relatório de CI — Sessão 2026-11-01

**Sessão:** https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj  
**Branch de trabalho:** `claude/fix-ci-workflows-20261101-1200`  
**Base em:** `de5345d` (origin/main — 2026-11-01)

---

## Baseline Local (branch de trabalho)

| Check | Resultado |
|---|---|
| Build Vite | ✅ PASSOU (`✓ built in ~11s`) |
| TypeScript (`tsc --noEmit`) | ✅ PASSOU (exit 0) |
| Soft-delete gate (`check-soft-delete-policy.mjs`) | ✅ PASSOU (atual: 568 · baseline: 576 — drift positivo) |
| TS Unused Locals Ratchet | ✅ PASSOU (baseline: 0, atual: 0) |
| Vitest (unitários) | ✅ PASSOU (exit 0) |
| ESLint | ⚠️ OOM no container local (exit 0 por tratamento) — CI usa ambiente com mais memória |

---

## Correções Aplicadas Nesta Sessão

### Fix 1 — Gate 1.12: soft-delete regression em `stock_notes`
- **Commit:** `5ae127e` (já mergeado em `main` via PR #2871 por sessão anterior)
- **Arquivo:** `supabase/migrations/20261031000000_create_stock_notes.sql`
- **Causa:** migration criava tabela sem `deleted_at` e sem `-- soft-delete-exempt`
- **Fix:** adicionado `-- soft-delete-exempt: notas de usuário — hard-delete intencional por policy`

### Fix 2 — CI Security & Drift: lint-0029 allowlist desatualizada
- **Arquivo:** `.security/lint-0029-allowlist.json`
- **Causa:** função `public.perf002_drop_unused_snapshot_indexes()` (SECURITY DEFINER, pg_cron) criada em `20261101194657` não estava documentada na allowlist
- **Fix:** adicionada entrada com reason explicando origem PERF-002 e migration de remoção pendente

### Fix 3 — DB Apply Migration E15: preflight faltando artefatos de rollback
- **Arquivos:** `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` + `supabase/rollbacks/20261101202000_rollback.sql` (criado)
- **Causa:** migration não tinha `-- Rollback:` nas primeiras 40 linhas e rollback file estava ausente
- **Fix:** adicionado header `-- Rollback:` + criado arquivo `supabase/rollbacks/20261101202000_rollback.sql`
- **Status pós-fix:** `preflight-migration-apply` retorna `static-pass` localmente

---

## Workflows Ainda Falhando em `main` — ver PENDENCIAS.md

11 workflows estavam falhando quando esta sessão iniciou. Desses:
- 3 já tinham sido corrigidos por commits recentes de main (Policies Baseline via `e170f5b`, TS Unused Locals via `b78ab0a`)
- 2 foram corrigidos por esta PR (lint-0029 + preflight migration)
- 6 permanecem abertos por dependerem de infraestrutura, DB ao vivo ou investigação de código — ver PENDENCIAS.md
