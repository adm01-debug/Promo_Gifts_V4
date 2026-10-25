# Baseline — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (continuação)
**Data:** 2026-10-25
**main HEAD:** `c113300c034fb39126274fba9aa10ef05762ab13` (PR #2540 mergeada pelo PO — docs RELATORIO_CI)
**Commit anterior:** `cb0ccedec41c38fe79cbd2585216e4cbe3155ccd` (PR #2538 — docs RELATORIO_CI 3 entradas Gate Final)

## Gate Final
- **Run #40218104943** — SHA `c113300c` — conclusion=**success** ✅ (2026-10-25T17:56:46Z) ← CONFIRMADO NESTA SESSÃO
  - 17 jobs passaram: Gate 0, Gate 0.5, Gate 1 (sub-gates 1.1–1.18), Gate 2, Gate 2.5, Gate 3, Gate 5, Gate 5.5, Gate 6
  - E2E Playwright smoke: success (~2min, 17:54:52–17:56:36Z)
- **Run #40214531246** — SHA `4cb4feb4` — success ✅ (2026-10-25T17:20:35Z) ← referência anterior

## Testes
- **429 testes / 0 falhas** (baseline inalterada — confirmado run #40214531246)

## Ambiente local
- `npm install`: **FALHA 403** — registry `europe-west1-npm.pkg.dev` sem credenciais neste container
- `typecheck / lint / vitest local`: **NÃO EXECUTADO** — npm install impossível
- Baseline de CI usada: Gate Final GitHub Actions (autoritativo)

## Test-merges locais realizados nesta sessão

Para cada uma das 17 PRs abertas, foram executados:
```
git fetch origin refs/pull/N/head:refs/remotes/pr-test/N
git merge-base origin/main refs/remotes/pr-test/N   # detecta NO_MERGE_BASE
git merge-tree --write-tree $(git merge-base ...) origin/main refs/remotes/pr-test/N
```

**Resultados (evidência em prs.json `test_merge_evidence`):**
| PR | Resultado | Arquivos conflitantes |
|---|---|---|
| #2415 | CONFLICT | `.github/workflows/ci-security-drift.yml`, `deploy-gates.yml`, `PENDENCIAS.md`, `RELATORIO_CI.md`, `vitest.config.ts` |
| #2417 | NO_MERGE_BASE | — |
| #2418 | NO_MERGE_BASE | — |
| #2419 | NO_MERGE_BASE | — |
| #2420 | NO_MERGE_BASE | — |
| #2422 | NO_MERGE_BASE | — |
| #2428 | CONFLICT | `.gitleaks.toml` |
| #2432 | CLEAN | git cherry = 0 (JÁ_EM_MAIN) |
| #2443 | CLEAN | 1 commit único: `APROVACAO_FASE_B_IMPACTO.md` |
| #2449 | CONFLICT | `MIGRATIONS_SYNC_LOG.md`, 2 migrations |
| #2452 | CONFLICT | `analise-prs/dossies/PR-2441.md` |
| #2469 | CONFLICT | `.github/workflows/e2e-personalization.yml` |
| #2503 | CONFLICT | `RELATORIO_CI.md` |
| #2520 | CLEAN | 4 arquivos; downgrade 1.2.1→1.0.0 |
| #2529 | CONFLICT | `.gitleaks.toml`, `.github/workflows/e2e-personalization.yml` |
| #2532 | CONFLICT | `PENDENCIAS.md`, `RELATORIO_CI.md` |
| #2537 | CLEAN | `.github/workflows/contract-tests.yml` (+5/-5) |

**ZERO PRs mergeáveis autonomamente** — todas bloqueadas por CONFLICT, NO_MERGE_BASE, JÁ_EM_MAIN, REGRA#8 ou REGRA#10.
