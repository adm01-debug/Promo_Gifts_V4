# Estado do CI no SHA fixado

## SHA fixado: `145da71bb8c451eebadc75c4bb059397f8d468f7`

**Gate Final — NAO VERIFICADO** (nenhum run de `deploy-gates.yml` encontrado para este SHA;
Multiplos runs em queued sugere gargalo de infra GitHub Actions)

### Gates com falha pre-existente (antes das PRs desta sessao)

| Gate | SHA da falha | Causa | Evidencia |
|---|---|---|---|
| Gate 1.9 (divida tecnica) | `15e10fd8` | PR#2556 backlog banco aumentou ratchets | progresso.json sessao_f0ceb220_addendum.pr_entregaveis |

### Linha de base de regressao: SHA `7d3bd4ba`

| Gate | Resultado | Evidencia |
|---|---|---|
| Gate Final completo | success | run #40223579961 (2026-10-25T19:02:42Z) |
| Testes unitarios | 429 / 0 falhas | progresso.json baseline.testes=429 baseline.falhas=0 |
| Gate 0 (SSOT Supabase) | passing | incluido no Gate Final success |

### Testes falhando por nome na linha de base `7d3bd4ba`

**NENHUM** - Gate Final success com 429/0.
Detalhe por nome: vide `vitest-per-test-name.txt` (0 falhas registradas).

### Testes/Gates com falha conhecida em `145da71b`

| Teste/Gate | Falha | Pre-existente? |
|---|---|---|
| Gate 1.9 ratchet | CONFIRMADO em `15e10fd8` | Sim - PR#2556, sessao anterior |
| Demais gates | NAO VERIFICADO | NAO VERIFICADO |

**Impacto nos merges:** todas as 5 PRs mergeadas nesta sessao (#2582, #2596, #2589, #2586, #2585)
sao bump de deps ou metricas semanais. Nenhuma toca o codigo afetado pelo Gate 1.9.
