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
- **429 testes / 0 falhas** — confirmado via logs do Gate Final run #40218104943 (job 121244048957)

### Suítes de teste por nome (Gate 2 — job 121244048957, SHA `c113300c`)

| Comando | Arquivos | Tests passados | Tests falhando |
|---|---|---|---|
| `npm run test:deploy-gate` | 3 | **334** | **0** |
| `npm run test:webhook-scenario-matrix` | 1 | **95** | **0** |
| **Total** | **4** | **429** | **0** |

**Testes falhando por nome: NENHUM** — todas as 429 assertions passaram.

Evidência direta dos logs (job 121244048957, 2026-10-25T17:49:51–17:54:26Z):
```
Test Files  3 passed (3)
      Tests  334 passed (334)    ← npm run test:deploy-gate
   Start at  14:49:51
   Duration  4.40s

Test Files  1 passed (1)
      Tests  95 passed (95)     ← webhook-scenario-matrix
   Start at  14:49:56
   Duration  1.24s
```

## Typecheck / Lint / Build — evidência de CI (Gate Final run #40218104943)

Container não tem `node_modules` (npm 403 ao registry privado `europe-west1-npm.pkg.dev`).
Execução local impossível. Baseline extraída diretamente dos logs do CI autoritativo.

### Typecheck (Gate 1 — job 121244048940, step "Run npm run typecheck")
- **Resultado: 0 erros** (conclusion=success)
- Período: 2026-10-25T17:49:49Z → 17:50:49Z (~60s)
- Evidência: step conclusion=success no job 121244048940

### Lint (Gate 1 — job 121244048940, step "Run npm run lint:baseline")
- **Resultado: 0 erros** (conclusion=success)
- Período: 2026-10-25T17:50:49Z → 17:52:51Z (~2min)
- Evidência: step conclusion=success no job 121244048940

### Build (Gate 6 — job 121245372874, step "Run npm run build")
- **Resultado: success** (conclusion=success)
- Período: 2026-10-25T17:55:04Z → 17:55:16Z (~12s)
- Evidência: step conclusion=success no job 121245372874; SBOM + build provenance attestation gerados

### Sub-gates Gate 1 (42 steps — todos success)
Todos os 42 sub-steps do job `static-gates` (Gate 1) tiveram conclusion=success:
Gates 1.1–1.18 inclusive (Product fields, types drift, migration contracts, bundle size,
ratchets TODO/FIXME/`as any`, indexed-access, workflow contracts, RLS policies, secrets inventory,
CODEOWNERS, ledger de conflitos, etc.)

**Baseline de CI (run #40218104943, SHA `c113300c`):**
- typecheck: **0 erros**
- lint: **0 erros**
- build: **success**
- testes: **429 / 0 falhas**
- Testes falhando por nome: **NENHUM**

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
