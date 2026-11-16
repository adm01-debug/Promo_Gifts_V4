# Nota: Limitação de Baseline Local

## Problema

`npm ci` retorna HTTP 403 neste ambiente para o registry privado do Lovable:
```
npm error 403 403 Forbidden - GET https://europe-west1-npm.pkg.dev/gpt-engineer-app/npm-registry/@...
```

**Causa:** Registry privado `europe-west1-npm.pkg.dev` exige credenciais do Lovable, não disponíveis no container de agente.

## Estratégia de Baseline

Como `npm ci` falha, o baseline foi estabelecido via **evidência de CI do GitHub Actions** para o SHA mais recente do main verificado antes do início dos merges.

### SHA de baseline da sessão
- **SHA início de sessão (antes dos 6 merges):** `0818809d` (Gate 1=FAILURE, Gate 6=SKIPPED)
- **SHA baseline Gate Final SUCCESS:** `c1d47d13bee8089eb62e3c47db1b7b500dcf1042`
  - run_id: 42652746997
  - check_run_id: 129290526546
  - conclusion: success
  - Verificado via: `github_list_check_runs`

### Arquivos de evidência CI nesta pasta
- `typecheck.txt` — Gate 1 (Lint+TypeScript) por SHA
- `build.txt` — Gate 6 (Build Vite) por SHA
- `gate-2-unit-tests.txt` — Gate 2 (vitest) por SHA
- `lint.txt` — Gate 1 lint annotations por SHA

## Implicação para análise de regressão

Regressão medida como: **check que era SUCCESS no baseline e passou a FAILURE depois de um merge**.

Pré-condição de cada merge aprovado: Gate Final = SUCCESS no head SHA da PR (ou evidência equivalente de que o diff não introduz erros).
