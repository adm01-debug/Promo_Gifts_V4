# Baseline CI — main

**SHA main (início de sessão):** `8bc08b12f50872e2d9b9a93d3f7dbae388fec204`
**SHA main (após merges desta sessão):** `9a97f9a2c857b25590691efd2c741a194bfb24da`
**Data:** 2026-10-29

## Gate Final — Estado no SHA de base

Gate Final (`deploy-gates.yml`) é o ÚNICO check required no branch protection de `main`.
O CI do main estava verde nos SHAs das PRs que foram mergeadas nesta sessão (PRs #2721, #2735, #2733, #2695, #2707, #2737, #2736, #2719).

## Falhas conhecidas no main (pré-sessão)

Baseado nos logs de CI das PRs analisadas:

| Check | Estado | Motivo |
|---|---|---|
| Gate Final - Deploy Ready | SUCCESS (nas PRs mergeadas) | Verde no HEAD usado |
| E2E PDF Dialog | Resolvido (PR #2749 pending) | Branch Protection Sentinel aguarda PR |
| Uptime Monitor | FAILURE (infra externa) | Falha de infraestrutura externa, não código |
| Branch Protection Sentinel | FAILURE (workflow) | Aguarda PR #2749 — DECISAO_HUMANA |

## Critério de regressão

Regressão = erro NOVO vs. este baseline. Falhas já presentes no main antes do merge não são imputadas à PR.

## Ferramentas de verificação aplicadas

- `get_workflow_run` por run_id (Gate Final de cada PR)
- `list_check_runs` por SHA de head de cada PR
- `get_pr_diff` para leitura 100% do diff
- `list_pr_files` para inventário de arquivos tocados
- `github_get_pull_request` para `mergeable_state`, `draft`, `base`
