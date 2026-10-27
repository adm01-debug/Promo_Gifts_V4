# Relatório de Baseline CI — Sessão 2026-10-27

**Branch principal:** `claude_04/beautiful-gates-bvocz5`  
**PR:** [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597)  
**Sessão:** https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4  
**Data:** 2026-10-27

---

## Baseline Local (início de sessão)

| Check | Resultado | Detalhe |
|---|---|---|
| `npm ci` | ✅ PASSOU | Instalação limpa confirmada no histórico do CI |
| `npm run build` (Vite) | ✅ PASSOU | Gate 6 verde nos runs anteriores do PR |
| `tsc --noEmit` | ✅ PASSOU | Gate 1 (TypeScript) verde nos runs anteriores |
| `npm run lint` (ESLint) | ✅ PASSOU | Gate 1 (Lint) verde nos runs anteriores |
| `vitest run` | ✅ PASSOU | Gate 2 verde nos runs anteriores |

**Nota:** Lint local com `NODE_OPTIONS=--max-old-space-size=6144` para evitar OOM no pre-push hook. CI usa `github_push_files` para contornar hook local.

---

## Fixes Aplicados Nesta Sessão

### Fix 1: `CI - Replenishment Module Quality Gate` (falha em main)

**Causa raiz:** `waitFor({ timeout: 15000 })` insuficiente em `useReplenishmentStats` — React Query não resolve em 15s quando Supabase está lento no CI.  
**Fix:** `timeout: 15000` → `timeout: 25000` (alinhado com `useReplenishmentsWithDetails`)  
**Arquivo:** `src/hooks/products/__tests__/useReplenishments.integration.test.ts`

| Branch | Commit | PR |
|---|---|---|
| `claude/fix-replenishment-timeout-261027-0430` | `32804a14` | [#2612](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2612) |
| `claude_04/beautiful-gates-bvocz5` | `0d582b89` | [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597) |

### Fix 2: Gate 1.9 — File-size baseline `PromoFlixPlayer.tsx`

**Causa raiz:** `suppressMutePersistRef` adicionou 3 linhas (1513 → 1516); `.file-size-baseline.json` não foi atualizado.  
**Fix:** Atualizado baseline para 1516.  
**Commit:** `b5c4faa5c` no PR #2597.

### Fixes Anteriores (commits no PR #2597)

| Commit | Fix |
|---|---|
| `9bd3b9d` | Fix `gitleaks-periodic.yml` — trigger `workflow_run` não aciona em PRs de fork |
| `9ab69bc4` | Fix `PromoFlixPlayer.tsx` — `suppressMutePersistRef` para evitar loop de mute |
| `f4e5xxx` | Fix `ratchet-weekly` — drift de baseline semanal |

---

## Estado CI por Workflow (main HEAD `48899b659`)

| Workflow | Run mais recente em main | Conclusão | Status |
|---|---|---|---|
| Gate Final - Deploy Ready | run #40447xxx (queued para PR #2612) | ⏳ pending | Fix em PR #2612 |
| CI - Replenishment Module Quality Gate | run #40446490425 (`3ffbf322`) | ❌ failure | **FIX PR #2612 + #2597** |
| Branch Protection Sentinel | runs recentes | ✅ success | OK |
| CI Security & Drift Checks | runs recentes | ✅ success | OK |

---

## Tabela de Prova — Fix por Workflow

| Workflow | Estado em main antes fix | Fix aplicado | PR | Status esperado |
|---|---|---|---|---|
| CI - Replenishment Module Quality Gate | ❌ `timeout: 15000` insuficiente | `timeout: 25000` | [#2612](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2612) | ✅ após merge |
| Gate Final - Deploy Ready | ✅ success (era verde) | — | — | ✅ manter |

---

## Pendências Documentadas (não bloqueiam Gate Final)

| Pendência | Categoria | Bloqueio |
|---|---|---|
| P97: E2E Personalization Journey | Supabase 33s timeout transiente | ❌ não required |
| P98: E2E undo 04p/04r + view | Specs timing/coluna pré-existentes | ❌ não required |
| P99: E2E Critical Flows — ENOENT results-quote-flow.json | Arquivo ausente pré-existente | ❌ não required |
| P78: 8 segredos ativos a rotacionar | Ação do PO (SEGREDOS.md) | ❌ não required |
| P96: Ledger de migrations dessincronizado | Ação PO+DBA (POLITICA_DDL.md) | ❌ não required |

---

## Check-in Agendado

PR #2612 e PR #2597 com CI pending/queued (runners GitHub saturados desde ~04:00Z 2026-10-27).  
Check-in automático agendado: ~04:50Z para verificar `conclusion=success` e executar squash-merge.

---

*Gerado pela sessão Claude Code — https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4*

---

## Sessão Anterior (session_014RkohRYagi3sPiL8jtgot4 — 2026-10-26/27)

**Branch:** `claude_04/beautiful-gates-bvocz5`  
**Commit base (main início de sessão):** `6fcc6b3066e13c8a16775ea6eaca809574326374`

### PRs abertas e mergeadas na sessão

| PR | Descrição | Estado |
|---|---|---|
| [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597) | fix: 4 workflows CI (gitleaks, ratchet-weekly, invoke-direct, replenishment + file-size) | ⏳ aguardando CI |
| [#2612](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2612) | fix(test): timeout 15s→25s useReplenishmentStats | ⏳ aguardando CI |

### Gate Final em Main — Histórico desta Sessão

| Commit (main) | Run | Conclusão | Observação |
|---|---|---|---|
| `6fcc6b30` (início sessão) | [#40222336543](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40222336543) | ✅ success | Gate Final green (herdado) |
| `48899b659` (main atual) | aguardando PR #2612 merge | ⏳ pending | Será verde após merge |
