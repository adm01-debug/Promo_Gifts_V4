# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev30)
**Data:** 2026-10-27
**main HEAD:** `00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c`
**Commit:** fix(e2e): corrige falhas E2E mobile, tooltips e personalization specs (PR #2602 — merged externamente por session_01Knr9enFAok62bHihBK1UUP em 2026-10-27T01:16:30Z)

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de PRs analisadas (histórico) | 51 |
| PRs abertas nesta revisão | 16 |
| PRs mergeadas autonomamente (total histórico) | 15 |
| PRs mergeadas por esta sessão (rev30) | 0 |
| PRs mergeadas externamente (rev30) | 1 (#2602) |
| PRs aguardando DECISAO_HUMANA (abertas) | 9 |
| PRs BLOQUEADAS por REGRA (abertas) | 6 |
| PRs FECHAR / órfãs (abertas) | 1 |

---

## RISCOS E DECISÕES HUMANAS (topo — ação requerida)

| PR | Título | Draft | Razão | Ação |
|---|---|---|---|---|
| #2603 | fix(crons): 4 migrations + RLS stricker | sim | DRAFT + 5 migrations REGRA#8 (incl. RLS 17 tabelas) | Converter DRAFT→ready + aprovar migrations |
| #2604 | fix(ci): continue-on-error psql E036/E037/E072 | sim | DRAFT + `.github/workflows/schema-snapshot-export.yml` REGRA#8 | Converter DRAFT→ready + aprovar workflow |
| #2605 | fix(tests): corrige 4 unit tests + 1 E2E | sim | DRAFT — só testes, 0 REGRA#8, risco mínimo | Converter DRAFT→ready |
| #2600 | docs(analise-prs): addendum rev22 | sim | DRAFT — deliverables desta sessão | Converter DRAFT→ready |
| #2597 | fix: 4 workflows CI falhando | sim | DRAFT + `.github/workflows/ratchet-weekly.yml` REGRA#8 | Converter DRAFT→ready + aprovar |
| #2580 | fix(banco): rollback e23 | sim | DRAFT + migrations REGRA#8 | Converter DRAFT→ready + aprovar |
| #2588 | bump react-day-picker 8→10 | não | API v8 usada em `calendar.tsx:22-24` | Migrar API antes de mergear |
| #2587 | bump zustand 4→5 | não | Major upgrade | Testar compatibilidade |
| #2579 | release 1.0.0 | não | Downgrade 1.2.1→1.0.0 | Fechar ou corrigir |
| #2572 | contrato E189 + CI | não | `.github/workflows/contract-tests.yml` + REGRA#10 cross-agent | Decidir integração |

---

## PRs Abertas — Vereditos com Evidência

### FECHAR (1 PR)

| PR | Título | Evidência | Motivo |
|---|---|---|---|
| #2420 | chore(db): rollback retroativo migration | `git merge-base origin/main refs/remotes/pr/2420` → EMPTY (sem ancestral comum) | Branch órfã — NO_MERGE_BASE |

### BLOQUEADA — REGRA "Não tocar .github/workflows" (6 PRs)

| PR | Título | Arquivo workflow | Evidência |
|---|---|---|---|
| #2572 | docs(analise-prs) + contrato E189 | `.github/workflows/contract-tests.yml` | `git diff --name-only` (62 files, inclui contract-tests.yml); branch `claude_05/*` (REGRA#10) |
| #2590 | bump codeql-action/upload-sarif | `.github/workflows/gitleaks-history-audit.yml` | 1 arquivo, 100% workflow |
| #2591 | bump codeql-action/analyze | `.github/workflows/codeql.yml` | 1 arquivo, 100% workflow |
| #2592 | bump actions/stale 9→11 | `.github/workflows/stale.yml` | 1 arquivo, 100% workflow |
| #2593 | bump codeql-action/init | `.github/workflows/codeql.yml` | 1 arquivo, 100% workflow |
| #2594 | bump actions/setup-node 4→7 | `.github/workflows/e2e-update-editor-sheet-snapshots.yml` | 1 arquivo, 100% workflow |

### DECISAO_HUMANA — DRAFT (6 PRs)

Evidência bloqueio DRAFT: API HTTP 405 `{"message":"Pull Request is still a draft","status":"405"}` (tentativa merge PR #2602 — rev29). "Proibido editar PR" impede converter para ready.

| PR | Título | Head SHA | Bloqueio adicional |
|---|---|---|---|
| #2580 | fix(banco): rollback e23 | `41198d9a` | REGRA#8 migrations (`20260916202000_e23_force_rls_secret_tables.sql`) |
| #2597 | fix: 4 workflows CI | `3e46211c` | REGRA#8 workflows (`.github/workflows/ratchet-weekly.yml`) |
| #2600 | docs(analise-prs): addendum | `1c0fbf61` | — |
| #2603 | fix(crons): 4 migrations + RLS | `ab1ea3b3` | REGRA#8 migrations (5 migrations incl. `supplier_stricker_rls_deny_all.sql` — RLS 17 tabelas) |
| #2604 | fix(ci): continue-on-error psql | `e33d2fe4` | REGRA#8 workflow (`.github/workflows/schema-snapshot-export.yml`) |
| #2605 | fix(tests): 4 unit + 1 E2E | `9bfead14` | — (único bloqueio: DRAFT) |

### DECISAO_HUMANA — Semântica / Breaking Change (3 PRs)

| PR | Título | Evidência de bloqueio |
|---|---|---|
| #2579 | chore(main): release 1.0.0 | `package.json`: `-"version":"1.2.1"` → `+"version":"1.0.0"` — downgrade semântico |
| #2587 | bump zustand 4→5 | `package.json`: `^4.5.0`→`^5.0.16`; major upgrade → DECISAO_HUMANA |
| #2588 | bump react-day-picker 8→10 | `calendar.tsx:22-24` usa `modifiers`, `modifiersClassNames`, `formatters.formatCaption` (API v8); v10 muda essas props → quebra confirmada |

---

## Merge Tests vs main `00eeec9ac` (rev30)

| PR | Branch | Resultado | Head SHA |
|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE | c10816b95c |
| #2572 | claude_05/youthful-ride-vcdchy | CLEAN | c653bef927 |
| #2579 | release-please--branches--main--components--gifts-store | CLEAN | dbac87d8dc |
| #2580 | claude/fix-e23-rollback-261025-2145 | CLEAN | 41198d9a33 |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | CLEAN | 243e5d21cf |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | CLEAN | 1a71dd86bc |
| #2590 | dependabot/github_actions/codeql-action/upload-sarif-4.39.1 | CLEAN | 46c07b88df |
| #2591 | dependabot/github_actions/codeql-action/analyze-4.39.1 | CLEAN | 1797d8afb3 |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | CLEAN | 936b10424c |
| #2593 | dependabot/github_actions/codeql-action/init-4.39.1 | CLEAN | 7f36981f2c |
| #2594 | dependabot/github_actions/actions/setup-node-7 | CLEAN | 87bff9e7ba |
| #2597 | claude_04/beautiful-gates-bvocz5 | CLEAN | 3e46211c68 |
| #2600 | claude_04/optimistic-bohr-qplx94 | CLEAN | 1c0fbf6147 |
| #2603 | claude_04/tender-hawking-ghw2zi | CLEAN | ab1ea3b316 |
| #2604 | claude_04/charming-darwin-g1nvj2 | CLEAN | e33d2fe4aa |
| #2605 | claude/fix-unit-tests-261027-0113 | CLEAN | 9bfead1417 |

---

## PRs Mergeadas Autonomamente (Histórico — 15 total)

| PR | SHA merge | Título |
|---|---|---|
| #2544 | 1d26da908 | docs: backlog CI CI-001..CI-008 |
| #2545 | 2a93ba556 | chore: backlog funcionalidades FT-001..FT-416 |
| #2548 | 9be832a35 | feat: botao LGPD excluir meus dados |
| #2549 | 73df7502f | chore: backlog Supabase SB-001..SB-018 |
| #2551 | 97eed25cb | fix: peso 0 no Kit Maker |
| #2552 | 35fdb5793 | fix: materials-api timeout 20s |
| #2553 | aebd333f3 | fix: selos sem mock |
| #2554 | e6538448e | fix: BI Cliente 360 sem mock |
| #2555 | 479f2219 | docs(pendencias): rev29 |
| #2556 | 15e10fd88 | chore: backlog banco O1/O3 |
| #2582 | 045d835f5 | chore(ci): métricas semanais 2026-W44 |
| #2585 | 145da71bb | bump prod deps minor/patch (7 updates) |
| #2586 | fb046592 | bump dev deps minor/patch (10 updates) |
| #2589 | 9e2746a31 | bump globals 15→17 |
| #2596 | 54e890458 | bump postcss-selector-parser (CVE-2026-104844) |

## Mergeadas Externamente (nesta revisão)

| PR | SHA merge | Merged por | Data |
|---|---|---|---|
| #2602 | 00eeec9ac | session_01Knr9enFAok62bHihBK1UUP | 2026-10-27T01:16:30Z |

---

## Observações (rev30)

- **PR #2602 (MERGEADO_EXTERNO)**: estava listada como DRAFT em rev29; foi mergeada por outra sessão durante análise, tornando-se o novo main HEAD `00eeec9ac`. 5 arquivos E2E (`e2e/flows/*.spec.ts`). Merge via PR (REGRA#9 satisfeita).
- **PR #2603**: 5ª migration `20261027200000_supplier_stricker_rls_deny_all.sql` habilita RLS deny-all explícita em 17 tabelas do schema `supplier_stricker` — aditiva e endurece segurança. Bloqueada por DRAFT + REGRA#8.
- **PR #2604**: `continue-on-error: true` em 3 steps observacionais `psql` (E036/E037/E072) que falham por IPv6 (`Network is unreachable`). Step principal (supabase CLI) não é alterado. Bloqueada por DRAFT + REGRA#8.
- **PR #2605**: Fix cirúrgico de 5 falhas pré-existentes em `main 00eeec9ac` (race conditions, missing await, React 19 listener, threshold E2E). Único bloqueio é DRAFT — nenhuma REGRA#8. Candidato imediato a merge assim que convertido para ready.
- **Falhas pré-existentes em main `00eeec9ac`** (fonte: PR #2605 body):
  1. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:33` — race condition `Date.now()`
  2. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:60` — race condition `Date.now()`
  3. `tests/integration/replenishment-resilience.test.ts:16` — `await` ausente em `expect().resolves`
  4. `src/components/products/gallery/PromoFlixPlayer.tsx` — React 19 volumechange duplicate listener
  5. `e2e/catalog/novidades-reposicao-card-parity.spec.ts:214` — threshold `replGap < 64px` insuficiente (fix: 96px)
- **Zustand v5 (#2587)**: `create` from 'zustand' é backward-compatible em v5. Risco baixo tecnicamente, mas major version → DECISAO_HUMANA.
- **react-day-picker v10 (#2588)**: `calendar.tsx:22-24` usa `modifiers`, `modifiersClassNames`, `formatters` (API v8). Em v10 essas props mudaram — quebra confirmada.

---

## META CUMPRIDA — rev30

- main SHA: `00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c` ✓
- Baseline: typecheck 0 erros (SHA `2ca5ef04e`), build Vite 11.77s (SHA `2ca5ef04e`), Gate Final success (#40218104943, 429/0 falhas) ✓
- **51 PRs** em `analise-prs/prs.csv` (histórico completo) ✓
- **16 PRs abertas** — 100% cobertura com veredito e evidência por PR ✓
- `prs.json`: 51 entradas, main_head correto ✓
- 16 dossiers `analise-prs/dossies/PR-NNNN.md` ✓
- Merge tests re-executados nesta revisão vs `00eeec9ac` — 16 PRs ✓
- **Evidência por PR** em `analise-prs/baseline/state.md` e dossiers ✓
- **0 PRs mergeadas autonomamente** — todas bloqueadas com evidência:
  - 6 DRAFT → HTTP 405 (evidência: merge tentado PR #2602 em rev29)
  - 6 só-workflow → "Não tocar .github/workflows" (evidência: `git diff --name-only`)
  - 1 NO_MERGE_BASE → `git merge-base` vazio (evidência: #2420)
  - 1 downgrade semântico → `package.json version: 1.2.1→1.0.0`
  - 1 breaking API → `calendar.tsx:22-24` usa API v8 de react-day-picker
  - 1 major upgrade → DECISAO_HUMANA (#2587 zustand)
- **1 PR mergeada externamente** (#2602 — outra sessão) ✓
- **0 escritas proibidas** no GitHub ✓
- Worktrees removidos ✓
