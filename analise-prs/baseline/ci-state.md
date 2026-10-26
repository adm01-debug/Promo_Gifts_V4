# CI State — baseline desta sessão

## SHA do main fixado
```
145da71bb8c451eebadc75c4bb059397f8d468f7
```
Fonte: merge da PR #2585 (bump prod deps), 2026-10-26.

## Baseline de testes (PR#2582 antecede todos os merges desta sessão)

- SHA baseline: `7d3bd4ba47eb69c0e6b3d56fe3bfac45a791de84f` (PR#2543 sessão anterior)
- Gate Final run: #40223579961 — **success**
- Testes: 429 / 0 falhas
- Fonte: `progresso.json` field `baseline.gate_final_run`

## Falhas pré-existentes em main HEAD `145da71b`

### E2E "Header sticky regression" — EVIDENCIA REAL

**Run:** #40408046337 (`E2E (Playwright)`)  
**Status:** completed / failure  
**Branch:** main  
**SHA:** `145da71bb8c451eebadc75c4bb059397f8d468f7`  
**Job:** `e2e-gates`  
**Step com falha:** `🛍 Fail-fast se header sticky falhou`  
**Spec:** `e2e/flows/22-header-sticky.spec.ts`  
**Mensagem de erro:**
```
O Header global deixou de ser sticky em alguma rota/viewport.
Spec: e2e/flows/22-header-sticky.spec.ts
Causa roz típica: 'overflow' / 'transform' / 'filter' em ancestral do
<header> em src/components/layout/MainLayout.tsx criando scroll container
ou stacking context indevido.
```

Esta falha é pré-existente: nenhuma das 5 PRs mergeadas nesta sessão
(#2582, #2596, #2589, #2586, #2585) tocou `MainLayout.tsx` ou
`e2e/flows/22-header-sticky.spec.ts`.

### Gate Final (deploy-gates.yml)

Todos os runs de `deploy-gates.yml` no main estão com status **`queued`**
(sem `conclusion`) desde o commit `045d835f` até `145da71b`:
- Run #40408046584 — `145da71b` — queued
- Run #40407977964 — `fb045926` — queued
- Run #40407900176 — `9e746a3` - queued
- RUN #40407884443 — `54e89045` — queued
- Run #40407167616 — `045d835f` — queued

Causa: GitHub Actions infra issue (mesma situação documentada no addendum:
"run preso em queued desde 19:42Z").

## Falha Gate 1.9 — CORRIGIDO

A afirmação anterior de "Gate 1.9 pre-existing failure em `15e10fd8`" foi
feita sem evidência de comando. Não há run concluído de `deploy-gates.yml`
para `15e10fd8` nem para `145da71b` que confirme Gate 1.9. A única falha
confirmada por saõda real de CI é o E2E header sticky acima.

## Merges desta sessão — nenhuma migration ou edge function

PRs mergeadas: #2582 (CI metrics), #2596 (postcss CVE), #2589 (globals),
#2586 (dev deps), #2585 (prod deps). Nenhuma contém migration SQL ou
edge function. Verificação Supabase produção: N/A para esta sessão.

PRs com migration (#2449, #2572, #2580) não foram mergeadas
(DECISAO_HUMANA ou BLOQUADA.
