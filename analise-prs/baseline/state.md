# Baseline — rev29 (sessão f0ceb220, continuação)
**Data:** 2026-10-27
**main HEAD:** `1648890907d5831e2383157936f13742e326171c`
**Commit:** docs(ci): registra nota de governança sobre squash merge sem sufixo PR (#2601)

## Gate Final
- **Run #40218104943** — SHA `c113300c` — conclusion=**success** ✅ (2026-10-25T17:56:46Z)
  - 17 jobs passaram: Gate 0, Gate 0.5, Gate 1 (sub-gates 1.1–1.18), Gate 2, Gate 2.5, Gate 3, Gate 5, Gate 5.5, Gate 6
- **Nota:** SHA `1648890907d5` (current main) não disparou novo CI run pois é commit docs-only em `analise-prs/` (`paths-ignore: docs/**`). Baseline de referência = último run success em SHA `c113300c`.

## Testes
- **429 testes / 0 falhas** — confirmado via logs Gate Final run #40218104943 (job 121244048957)
- `npm run test:deploy-gate`: 334 testes, 0 falhas
- `npm run test:webhook-scenario-matrix`: 95 testes, 0 falhas

## TypeScript
- `tsc --noEmit`: **0 erros** — confirmado SHA `2ca5ef04e` (anterior ao PR #2601 docs-only)

## Build Vite
- `vite build`: **sucesso em 11.77s** — confirmado SHA `2ca5ef04e`

## Lint
- ESLint: OOM - FATAL ERROR JavaScript heap out of memory — pré-existente, não é regressão

## Merge Tests vs main HEAD (rev29 — executados nesta sessão)
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
| #2592 | CLEAN | 936b104240 |
| #2593 | CLEAN | 7f36981f2c |
| #2594 | CLEAN | 87bff9e7ba |
| #2597 | CLEAN | 3e46211c68 |
| #2600 | CLEAN | 1c0fbf6147 |
| #2602 | CLEAN | 8f88d21057 |
| #2603 | CLEAN | 9db01af0fe |

## Evidência de bloqueio por PR (rev29)

### DRAFT (5 PRs) — GitHub API HTTP 405
Tentativa de merge de PR #2602 retornou: `{"message":"Pull Request is still a draft","status":"405"}`
- #2580: `draft: true` (API list_pull_requests 2026-10-27)
- #2597: `draft: true` (API list_pull_requests 2026-10-27)
- #2600: `draft: true` (API list_pull_requests 2026-10-27)
- #2602: `draft: true` confirmado por `github_get_pull_request`; merge tentado → HTTP 405
- #2603: `draft: true` (API list_pull_requests 2026-10-27)

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
- #2579: `package.json` version: `-"1.2.1"` → `+"1.0.0"` (downgrade semântico)
- #2587: `package.json` zustand: `^4.5.0` → `^5.0.16` (major upgrade; decisão humana)
- #2588: `package.json` react-day-picker: `^8.10.0` → `^10.0.2` (major; `calendar.tsx:22-24` usa API v8: `modifiers`, `modifiersClassNames`, `formatters.formatCaption`)
