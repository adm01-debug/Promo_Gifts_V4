# PR #3127 — Evidências de diff 100% lido

**Branch:** codex/fix-ci-e2e-stability-261107-0238  
**Título:** fix(ci): estabiliza testes E2E e unifica contrato de autenticação

## Arquivos alterados (11 total)

### GOVERNANCE (REGRA#8) — 3 arquivos de workflow
| Arquivo | Mudança |
|---|---|
| `.github/workflows/e2e-flows.yml` | Remove `if:` condicional no job `e2e-quote-flow`; adiciona `min: '9'` em check-min-tests |
| `.github/workflows/e2e-stock.yml` | Whitespace fix em `persist-credentials`; adiciona `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` |
| `.github/workflows/e2e.yml` | Refactora `playwright.config.ts`, adiciona `E2E_GENERAL_REGRESSION=1`, restringe `testMatch` por projeto, desabilita traces/screenshots/video em regressão geral |

### NÃO-GOVERNANCE (8 arquivos de E2E + src)

| Arquivo | Mudança |
|---|---|
| `playwright.config.ts` | Adiciona `isGeneralRegression`, `authenticatedOnlySpecs`, `generalPublicSpecs`, `generalAuthedSpecs`; restringe `testMatch` por projeto; desabilita rastreio em regressão geral |
| `e2e/actions-order.spec.ts` | Refactora: usa `requireAuth()`, `installSwatchCatalogMocks(force:true)`, `switchCatalogView`, `viewRows`; adiciona `MOBILE_ACTIONS = 3 ações`; remove módulo `Estoque` do loop |
| `e2e/admin/stock-dashboard-empty.spec.ts` | Adiciona `test.skip(project !== 'chromium-authed')` + `requireAuth()` |
| `e2e/auth-debug-removal.spec.ts` | Troca `toHaveScreenshot` (baseline binário) por asserções funcionais determinísticas |
| `e2e/catalog/helpers/swatch-view.ts:67` | `.click()` → `.evaluate((el) => el.click())` para evitar problemas de geometria em viewport estreito |
| `e2e/flows/sidebar-tooltips.spec.ts` | Extrai `expectTooltipOnHover()` com `toPass({timeout:7500})` para tolerar delay Radix |
| `e2e/helpers/swatch-catalog-mocks.ts:144` | Adiciona parâmetro `options: {force?:boolean}` em `installSwatchCatalogMocks` |
| `e2e/protected-routes.spec.ts` | Remove `/pedidos` de rotas protegidas; adiciona `/auth`, `/forgot-password-confirmation`, `/unauthorized`, `/termos`, `/privacidade`, `/revista-publica/test-token` em públicas |
| `e2e/routes/public/reset-password.spec.ts` | Troca `toHaveScreenshot` por asserções funcionais |
| `e2e/sidebar-logo.spec.ts:28` | `iconBox?.width < 20` → `iconBox?.width === 24` (contrato V3 AppLogo) |
| `e2e/spa-rewrite.spec.ts` | Whitespace; `directAsset` fallback para Vite dev |
| `src/components/products/list-item/ListItemActions.tsx:38-50` | Envolve `QuickAddToQuote` em `Tooltip` + `TooltipContent`; reordena classes Tailwind |

## Regressão potencial (não-governance)

- `e2e/actions-order.spec.ts:35`: Remove `Estoque` dos módulos — testes de estoque não rodarão mais no CI geral. **Risco baixo**: módulo Estoque tem workflow próprio (`e2e-stock.yml`).
- `playwright.config.ts:95`: `retries: isGeneralRegression ? 0 : ...` — sem retry em regressão geral pode aumentar falsos negativos por flakiness. **Risco baixo**: specs gerais são mais estáveis.
- `e2e/protected-routes.spec.ts:11`: Remove `/pedidos` de rotas protegidas — se a rota for reintroduzida sem teste, haverá lacuna. **Risco baixo**: mudança de fato da rota.
- `src/components/products/list-item/ListItemActions.tsx:38-50`: Wrapping em `Tooltip` adiciona nó DOM. **Sem risco funcional**: `QuickAddToQuote` continua recebendo todos os props iguais.

## Regra de negócio
PR válida — estabiliza flakiness do CI E2E, corrige seletores frágeis, unifica contrato de auth. Sem alteração de lógica de negócio.

## Conflito
**CONFLITO** em `PENDENCIAS.md` e possivelmente `RELATORIO_CI.md` (sessões posteriores editaram esses arquivos).

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — 3 arquivos de `.github/workflows/`. O conteúdo é sólido e sem risco funcional, mas workflows requerem decisão humana por regra de governança.
