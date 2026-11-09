# CI Baseline — Análise de PRs

**Data:** 2026-11-09
**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX`

## Limitação: `npm ci` indisponível

O registry `europe-west1-npm.pkg.dev` (Lovable) retorna HTTP 403 neste ambiente.
Nenhum `npm ci`, typecheck local, lint local ou build local é possível.
Baseline estabelecido exclusivamente via evidência de CI do GitHub Actions.

## Estado de Gate Final por SHA

| SHA | Evento | Gate Final | Evidência |
|-----|--------|-----------|----------|
| `1368a918` | main antes de #3361 | SUCCESS | run_id=42677295865 (deploy-gates.yml) |
| `908f30ab` | main após merge #3264 | SUCCESS | check_run=129290526546 |
| `6b859b0f` | main após merge #3257 | SUCCESS | check_run=128955748854 |
| `9346b048` | main após merge #3261 | SUCCESS | check_run=128960805201 |
| `167f5f8d` | main atual (após #3361) | DESCONHECIDO | 0 Gate Final runs encontrados via github_list_check_runs |

## Nota sobre main atual (`167f5f8d`)

SHA `167f5f8d` resultou do merge de #3361 por adm01-debug em 2026-11-09T19:01:12Z.
Zero Gate Final check runs encontrados — o deploy-gates.yml pode ainda estar rodando
ou não ter sido triggerado no momento da verificação.

## Gates individuais verificados (pré-baseline)

- **Gate 0 (SSOT):** check_run=128951479367 → SUCCESS (SHA de #3179)
- **Gate 1 (Lint+TS):** check_run=129266757585 → SUCCESS, annotations_count=0
- **Gate 2 (vitest):** check_run=129266757427 → success
- **Gate Final (SHA `1368a918`):** run_id=42677295865 → conclusion=success
