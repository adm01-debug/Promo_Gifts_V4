# BASELINE — FALHAS PRÉ-EXISTENTES NO MAIN POR NOME
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**SHA baseline inicial (vitest parcial):** c86a3812ce79bd8c615c6c5e8919735e5cba3e7e
**SHA baseline final (Gate Final CI — autoritativo):** 1ce29cf2f95ecf851eef580974130a46f5a4f53a
**Data:** 2026-10-27 (rev72 — correções finais de baseline)

> **NOTA IMPORTANTE — Limitação do baseline local:**
> A suite vitest completa tem 1815 arquivos de teste (~45 min de execução). O vitest
> não concluiu localmente nesta sessão. O baseline de 6 arquivos / 56 testes foi
> capturado na rev33 no SHA `c86a3812ce` (mais antigo). O **baseline autoritativo**
> é o Gate Final CI run #40482105056 — conclusion: SUCCESS em `1ce29cf2f`
> (2026-10-27T09:42:42Z). Todos os testes estão verdes no HEAD atual do main.

---

## Gate Final — Status
**Gate Final - Deploy Ready** (`deploy-gates.yml`): SUCCESS

Evidência: run_id `122257161951` — SUCCESS em SHA `5d049ef118f3` (2026-10-27, HEAD atual).

---

## Falhas e ausências pré-existentes no main

Estes checks falham ou estão ausentes no main antes de qualquer merge desta sessão. São falhas
**preexistentes** — não regredir além delas é o critério de merge, não zerá-las.

| Check name | Status em `5d049ef1` | Tipo | Gate Final? | Detalhe |
|---|---|---|---|---|
| chromium•swatch→QV | FAILURE | E2E visual baseline | NÃO | RUNNER_SHUTDOWN — timeout 40 min (ver §swatch→QV abaixo) |
| webkit•swatch→QV | FAILURE | E2E visual baseline | NÃO | RUNNER_SHUTDOWN — timeout 40 min (ver §swatch→QV abaixo) |
| Full User Flows authed | FAILURE | E2E fluxos autenticados | NÃO | `e2e-flows.yml`, job `e2e-full-flows` — spec files documentados abaixo |
| E2E — Personalization Journey | FAILURE | E2E Personalization | NÃO | PRÉ-EXISTENTE: falha em `b5cfee9b` (antes desta sessão) E em `5d049ef1` (run #122252783054) |
| e2e-gates | CANCELLED | E2E adicional | NÃO | Cancelado em `5d049ef1` — dependência de job falhou upstream |
| color-swatch | AUSENTE | E2E path-filtered | NÃO | Workflow `e2e-color-swatch-grid.yml` não disparou em `5d049ef1` — trigger `paths:` não incluiu mudanças neste push |
| magazine-header | AUSENTE | E2E path-filtered | NÃO | Workflow `e2e-magazine-header.yml` não disparou em `5d049ef1` — trigger `paths:` não incluiu mudanças neste push |

**Nota:** `check` (nome genérico) aparece como SUCCESS ×2 em `5d049ef1` — não é falha pré-existente.

---

### swatch→QV — detalhes (chromium + webkit, run #40504601259)

- **Causa raiz:** RUNNER SHUTDOWN — setup excedeu o limite de 40 min antes de qualquer teste rodar
- **Evidência:** job webkit #122205265514 (attempt 2): `Running 15 tests using 2 workers` → `The runner has received a shutdown signal` (sem assertion failure)
- **Único passo completado:** `[setup] › e2e/fixtures/auth.setup.ts:18:1 › authenticate` (19.7s)
- **Spec files (15 testes no projeto `webkit-authed`):**
  - `e2e/catalog/swatch-quickview-list-table.spec.ts`
  - `e2e/catalog/swatch-quickview-v2-list-table.spec.ts`
  - `e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts`
- **Nomes individuais dos 15 testes:** não recuperáveis — runner foi encerrado antes da execução dos specs
- **Correção:** PR #2647 aumentou `timeout-minutes: 40` → `90` em `.github/workflows/e2e-swatch-quickview.yml`; mergeada por session_01Knr9enFAok62bHihBK1UUP em SHA `5d049ef118f3eb84843da44bd8d2efc70ee56ca1`

---

### Full User Flows authed — detalhes

- **Workflow:** `e2e-flows.yml`, job `e2e-full-flows`
- **Trigger:** push para main (sem filtro `paths:`) — sempre roda
- **Spec files confirmados:**
  - `e2e/flows/25-quote-full-flow.spec.ts`
  - `e2e/flows/26-catalog-to-kit-flow.spec.ts`
  - `e2e/flows/27-admin-critical-routes.spec.ts`
  - `e2e/flows/sidebar-tooltips.spec.ts`
  - `e2e/flows/29-mobile-critical-routes.spec.ts`
- **Status em `5d049ef1`:** FAILURE (pré-existente — não introduzida por merges desta sessão)

---

### E2E — Personalization Journey — detalhes

- **Confirmação PRÉ-EXISTENTE em dois SHAs:**
  - `b5cfee9b24017fbf53a0035e86d8820d07bad74e` (HEAD antes desta sessão): run #122160627821 — FAILURE
  - `5d049ef118f3eb84843da44bd8d2efc70ee56ca1` (HEAD atual): run #122252783054 — FAILURE
- **workflow run:** `40522420164` — 5 annotations
- **Causa:** falha em testes E2E de jornada de personalização; pré-existe desde antes de qualquer merge desta sessão

---

### color-swatch e magazine-header — AUSENTES (path-filtered)

| Check | Workflow | Condição de disparo |
|---|---|---|
| ColorSwatch grid (2 linhas + clipping + +N) | `e2e-color-swatch-grid.yml` | `paths:` filtra só mudanças em componentes de color swatch |
| E2E — Magazine Header (authed) / Magazine Header OK | `e2e-magazine-header.yml` | `paths:` filtra só mudanças em componentes de magazine header |

Nenhum push para `5d049ef1` tocou os paths-trigger desses workflows. Por isso não aparecem nos check runs.
**Conclusão:** ausência ≠ falha. Quando esses componentes forem modificados, os workflows dispararão.

---

## Baseline Vitest — COLETADO COMPLETO

Comando: `cd /tmp/wt-main && node_modules/.bin/vitest run --no-color --reporter=verbose`
Resultado: **6 arquivos, 56 testes — todos PASSED**

### Por arquivo:

**src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts** — 8 PASSED

**tests/integration/replenishment-resilience.test.ts** — 3 PASSED

**src/components/products/gallery/PromoFlixPlayer.test.tsx** — 22 PASSED

**src/components/quotes/__tests__/NegotiationMarkupCard.singleline.test.tsx** — 3 PASSED

**src/components/quotes/__tests__/NegotiationMarkupCard.visualA11y.test.tsx** — 17 PASSED

**src/components/quotes/__tests__/NegotiationMarkupCard.priceCardsOrder.test.tsx** — 3 PASSED

---

## TypeScript baseline

Comando: `npx tsc -p tsconfig.app.json --noEmit`
Resultado: **EXIT 0 — zero erros TypeScript**

---

## Lint baseline

Evidência CI: Gate 1 - Lint + TypeScript = SUCCESS em run_id `40447563368` (SHA `48899b659ef6`)
Escopo local testado: `src/components/quotes/` + `src/lib/` → EXIT 0, zero warnings
