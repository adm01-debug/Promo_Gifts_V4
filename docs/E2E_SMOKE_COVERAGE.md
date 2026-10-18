# Auditoria de cobertura — Smoke E2E

> **Gerado automaticamente** por `scripts/e2e-smoke-coverage-doc.mjs` em 2026-10-18.
> **Não edite à mão** — a fonte de verdade é `e2e/routes/_catalog.ts` + `SMOKE_COVERAGE` em `e2e/flows/20-all-features-smoke.spec.ts`.

## Resumo

| Métrica | Valor |
|---|---|
| Rotas no catálogo | **58** |
| Rotas `smoke: true` | **30** |
| Features autenticadas cobertas | **30** |
| Smoke público (sem auth) | **0** |

Suíte: [`e2e/flows/20-all-features-smoke.spec.ts`](../e2e/flows/20-all-features-smoke.spec.ts) · Project Playwright: `chromium-smoke` (workers=1, retries=0).

## Smoke autenticado — features × rotas

Ordem do array `SMOKE_COVERAGE`. Numeração bate com os títulos `NN · Nome` no relatório do Playwright.

| # | Feature | Descrição | Rota | Restrição |
|---|---|---|---|---|
| `01` | `dashboard-home` | Dashboard inicial | `/` | — |
| `02` | `dashboard-custom` | Dashboard customizável | `/dashboard` | — |
| `03` | `catalog` | Catálogo de produtos | `/produtos` | — |
| `04` | `catalog-filters` | Filtros avançados | `/filtros` | — |
| `05` | `news` | Novidades | `/novidades` | — |
| `06` | `trends` | Tendências | `/tendencias` | — |
| `07` | `favorites` | Favoritos | `/favoritos` | — |
| `08` | `collections` | Coleções | `/colecoes` | — |
| `09` | `comparison` | Comparador de produtos | `/comparar` | — |
| `10` | `carts` | Carrinhos do vendedor | `/carrinhos` | — |
| `11` | `quotes-list` | Lista de orçamentos | `/orcamentos` | — |
| `12` | `quotes-dashboard` | Dashboard de orçamentos | `/orcamentos/dashboard` | — |
| `13` | `quotes-kanban` | Funil (Kanban) de orçamentos | `/orcamentos/kanban` | — |
| `14` | `quote-new` | Criar novo orçamento (wizard) | `/orcamentos/novo` | — |
| `15` | `simulator` | Simulador (wizard) | `/simulador` | — |
| `16` | `price-simulator` | Simulador de preços | `/simulador-precos` | — |
| `17` | `price-search` | Busca avançada de preço | `/busca-preco` | — |
| `18` | `stock` | Estoque | `/estoque` | — |
| `19` | `restock` | Reposição | `/reposicao` | — |
| `20` | `kit-builder` | Kit Builder | `/montar-kit` | — |
| `21` | `my-kits` | Meus Kits | `/meus-kits` | — |
| `22` | `mockup-generator` | Gerador de Mockup | `/mockup-generator` | — |
| `23` | `mockup-history` | Histórico de Mockups | `/mockups/historico` | — |
| `24` | `magic-up` | Magic Up (publicidade IA) | `/magic-up` | — |
| `25` | `commercial-intel` | Inteligência comercial | `/inteligencia-comercial` | — |
| `26` | `bi` | Business Intelligence | `/ferramentas/bi` | — |
| `27` | `bi-compare` | BI — Comparador de clientes | `/ferramentas/bi/comparar` | — |
| `28` | `match` | Match de produtos | `/match` | — |
| `29` | `dropbox` | Dropbox browser | `/dropbox` | — |
| `30` | `magazine-templates-gallery` | Galeria de Templates de Revista | `/magazine/templates` | — |

## Smoke público (sem auth)

| # | Feature | Descrição | Rota |
|---|---|---|---|


## Governança

✅ Nenhuma rota `smoke: true` órfã (todas listadas em `SMOKE_COVERAGE`).

✅ Nenhuma feature fantasma em `SMOKE_COVERAGE`.

---
_Para regenerar:_ `node scripts/e2e-smoke-coverage-doc.mjs`
_Para validar no CI:_ `node scripts/e2e-smoke-coverage-doc.mjs --check`
