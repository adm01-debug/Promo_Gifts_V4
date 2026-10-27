# Baseline — rev30 (sessão f0ceb220, rev30)
**Data:** 2026-10-27
**main HEAD:** `00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c`
**Commit:** fix(e2e): corrige falhas E2E mobile, tooltips e personalization specs (PR #2602, merge por session_01Knr9enFAok62bHihBK1UUP)

## Gate Final
- **Run #40218104943** — SHA `c113300c` — conclusion=**success** ✅ (2026-10-25T17:56:46Z)
  - 17 jobs passaram: Gate 0, Gate 0.5, Gate 1 (sub-gates 1.1–1.18), Gate 2, Gate 2.5, Gate 3, Gate 5, Gate 5.5, Gate 6
- **Nota:** SHA `00eeec9ac` (current main) não disparou novo CI run (commit foi E2E-only, não toca `src/` de forma a quebrar gates). Baseline de referência = último run success em SHA `c113300c`.

## Testes
- **429 testes / 0 falhas** — confirmado via logs Gate Final run #40218104943
- **Falhas pré-existentes em `00eeec9ac`** (fonte: PR #2605 body):
  1. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:33` — race condition Date.now()
  2. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:60` — race condition Date.now()
  3. `tests/integration/replenishment-resilience.test.ts:16` — missing await
  4. `src/components/products/gallery/PromoFlixPlayer.tsx` tests — React 19 volumechange duplicate listener
  5. `e2e/catalog/novidades-reposicao-card-parity.spec.ts:214` — threshold 64px insuficiente

## TypeScript
- `tsc --noEmit`: **0 erros** — confirmado SHA `2ca5ef04e`

## Build Vite
- `vite build`: **sucesso em 11.77s** — confirmado SHA `2ca5ef04e`

## Lint
- ESLint: OOM - FATAL ERROR JavaScript heap out of memory — pré-existente, não é regressão

## Merge Tests vs main HEAD `00eeec9ac` (rev30)
| PR | Resultado | Head SHA |
|---|---|---|
| #2420 | NO_MERGE_BASE | c10816b95c |
| #2572 | CLEAN | c653bef927 |
| #2579 | CLEAN | dbac87d8dc |
| #2580 | CLEAN | 41198d9a33 |
| #2587 | CLEAN | 243e5d21cf |
| #2588 | CLEAN | 1a71dd86bc |
| #2590 | CLEAN | 46c07b88df |
| #2591 | CLEAN | 1797d8afb3 |
| #2592 | CLEAN | 936b10424c |
| #2593 | CLEAN | 7f36981f2c |
| #2594 | CLEAN | 87bff9e7ba |
| #2597 | CLEAN | 3e46211c68 |
| #2600 | CLEAN | 1c0fbf6147 |
| #2603 | CLEAN | ab1ea3b316 |
| #2604 | CLEAN | e33d2fe4aa |
| #2605 | CLEAN | 9bfead1417 |

## Evidência de bloqueio por PR (rev30)

### DRAFT (5 PRs) — GitHub API HTTP 405
Evidência API: tentativa de merge de PR #2602 → HTTP 405 `{"message":"Pull Request is still a draft","status":"405"}` (rev29). PR #2602 foi depois mergeado por outra sessão.
- #2580: `draft: true` (API list_pull_requests 2026-10-27)
- #2597: `draft: true` (API get_pull_request 2026-10-27)
- #2600: `draft: true` (API list_pull_requests 2026-10-27)
- #2603: `draft: true` (API get_pull_request 2026-10-27)
- #2604: `draft: true` (API get_pull_request 2026-10-27)
- #2605: `draft: true` (API get_pull_request 2026-10-27)

### .github/workflows (6 PRs) — "Não tocar .github/workflows"
- #2590: 1 arquivo → `.github/workflows/gitleaks-history-audit.yml`
- #2591: 1 arquivo → `.github/workflows/codeql.yml`
- #2592: 1 arquivo → `.github/workflows/stale.yml`
- #2593: 1 arquivo → `.github/workflows/codeql.yml`
- #2594: 1 arquivo → `.github/workflows/e2e-update-editor-sheet-snapshots.yml`
- #2572: 62 arquivos incluindo `.github/workflows/contract-tests.yml` + branch `claude_05/*` (REGRA#10)
- #2597: inclui `.github/workflows/ratchet-weekly.yml` (também DRAFT)

### Migrações sem aprovação PO (2 PRs adicionais)
- #2580: `supabase/migrations/20260916202000_e23_force_rls_secret_tables.sql` + draft
- #2603: 5 migrations incluindo `20261027200000_supplier_stricker_rls_deny_all.sql` (RLS) + draft

### DECISAO_HUMANA — semântica/quebra de API
- #2420: `git merge-base origin/main refs/remotes/pr/2420` → EMPTY (NO_MERGE_BASE; branch órfã)
- #2579: `package.json` version: `-"1.2.1"` → `+"1.0.0"` (DOWNGRADE)
- #2587: `package.json` zustand: `^4.5.0` → `^5.0.16` (major) DECISAO_HUMANA
- #2588: `package.json` react-day-picker: `^8.10.0` → `^10.0.2`; `calendar.tsx:22-24` usa API v8 (`modifiers`, `modifiersClassNames`, `formatters.formatCaption`)

### #2604 — DRAFT + REGRA#8 workflow
- 1 arquivo: `.github/workflows/schema-snapshot-export.yml`
- `continue-on-error: true` em 3 steps psql observacionais (E036/E037/E072)

### #2605 — DRAFT (sem REGRA#8)
- 5 arquivos: somente testes (`*.test.ts`, `*.spec.ts`)
- Corrige 5 falhas pré-existentes em main `00eeec9ac`
- Bloqueio único: DRAFT — PO converte DRAFT→ready para CI rodar
