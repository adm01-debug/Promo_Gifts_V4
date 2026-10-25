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
- `npm install`: **FALHA 403** — registry `europe-west1-npm.pkg.dev` sem credenciais neste container; `node_modules` ausente confirmado (`ls node_modules/.bin/tsc` → not found)
- `typecheck / lint / vitest local`: **NÃO EXECUTADO** — impossível sem `node_modules`; limitação permanente do container, não negligência
- Baseline de CI usada: Gate Final GitHub Actions (autoritativo) — run #40218104943 (429 testes / 0 falhas)

## Git worktrees — confirmação
```
git worktree list
/home/user/Promo_Gifts_V4  991bccb20  [claude_05/youthful-ride-vcdchy]
```
**Apenas o worktree primário** — nenhum worktree de teste criado nesta sessão. Todos os test-merges foram feitos via `git fetch` + `git merge-tree --write-tree` (operação somente-leitura, sem commit).

## Vercel — investigação de falha no PR #2529

**Sintoma:** 3 pushes consecutivos (`3e5e619`, `23bd5fcc7`, `991bccb20`) falharam com `Resource provisioning failed`.

**Investigação do deployment `dpl_DpFQFz7H3SVu3Yw3fAS5SBu8EFW9`:**
- `state: ERROR`
- `errorCode: BUILD_FAILED`
- `errorMessage: "Resource provisioning failed"`
- `buildingAt: 1792952457023`, `ready: 1792952458928` → duração: **~1.9 segundos** (build real leva minutos)
- Runtime logs: **"No logs found"** — o build **nunca chegou a executar**

**Diagnóstico:** falha de infraestrutura anterior ao build, não falha de código. O build não rodou porque o Vercel não conseguiu provisionar o ambiente.

**Causa raiz (documentada em `CLAUDE.md §REGRA#11`):** projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) — criado por um agente em 2026-09-15 ao rodar `vercel link` fora do diretório raiz — conectado ao mesmo repo e causando 2× builds em todo push.

**Solução:** PO deve remover o projeto fantasma no dashboard Vercel. Fora do escopo desta sessão (requer ação humana no painel).

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
