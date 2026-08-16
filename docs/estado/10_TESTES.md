# 10 — TESTES (auditoria de estado)

> **Auditoria estática, somente leitura.** `node_modules` não está instalado neste
> ambiente. **Nenhum teste foi executado.** Toda afirmação sobre resultado de execução
> (passa/falha/verde/vermelho/flaky) está marcada como `NAO_VERIFICADO`.
> Fontes admitidas: exclusivamente arquivos de teste, `vitest.config.ts`,
> `playwright.config.ts`, `package.json` e `.github/workflows/**`.
> README/STATUS/CLAUDE.md/qa/*.md **não** foram usados como fonte de verdade.
>
> Data da auditoria: 2026-08-16 · Escopo: `tests/`, `e2e/`, `src/**/*.{test,spec}.*`,
> `src/tests/`, `src/test/`, `vitest.config.ts`, `playwright.config.ts`, `qa/`.

---

## Sumário executivo — as 8 constatações que importam

| # | Constatação | Evidência-âncora |
|---|---|---|
| 1 | **A suíte completa do Vitest (1.189 arquivos) nunca roda em CI.** O job mais abrangente (`ci.yml:94`) usa `test:quality`, que exclui `tests/hooks/**` (108 arquivos). Os demais gates rodam de 3 a 25 arquivos nomeados à mão. | `package.json:54`, `.github/workflows/ci.yml:94`, `package.json:55,57` |
| 2 | **555 specs Playwright existem; ~12 rodam no pipeline padrão de PR.** `playwright.yml:31` roda só `--project=chromium-smoke`, cujo `testMatch` casa 7 arquivos, mais 5 specs nomeadas. | `playwright.config.ts:126-132`, `.github/workflows/playwright.yml:31,38` |
| 3 | **Teste-espelho na trilha de segurança:** `tests/lib/rbac-permissions.test.ts` testa uma matriz de papéis `admin/manager/seller/viewer` que **não existe mais**. O alvo real (`src/hooks/auth/useRBAC.tsx:12`) declara `'agente' \| 'dev' \| 'supervisor'`. O teste nunca importa o alvo. | `tests/lib/rbac-permissions.test.ts:15,52`; `src/hooks/auth/useRBAC.tsx:12` |
| 4 | **O contrato SSOT do Supabase (REGRA #1) é vacuamente verde.** As 3 asserções de `src/tests/contracts/supabase-config.test.ts` estão atrás de `if (!isSupabaseHosted) return;`, e `tests/setup.ts:10` injeta `http://localhost:54321` quando `VITE_SUPABASE_URL` não vem do ambiente — que é exatamente o caso no job que roda esse arquivo. | `src/tests/contracts/supabase-config.test.ts:10,13,19,24`; `tests/setup.ts:10`; `.github/workflows/ci.yml:94` (sem `env:`) |
| 5 | **108 suítes "live" de Edge Functions fazem skip silencioso por design.** `describeLive = LIVE ? describe : describe.skip`, e `LIVE` é falso sob o stub de `tests/setup.ts:11` (`.test.signature`). | `tests/edge-functions/live/_live-client.ts:56-62`; `tests/setup.ts:11` |
| 6 | **42 testes de "integração" de Edge Functions testam o próprio mock.** Mockam `fetch` com um corpo literal e depois asseram esse mesmo corpo. Nenhum importa `supabase/functions/**`. | `tests/edge-functions/integration/health-check.test.ts:17-31`; `tests/p0/_mocks.ts:68-82` |
| 7 | **4 nomes de projeto Playwright inexistentes** (`routes-mobile`, `routes-public`, `routes-authed`, `chromium`) são invocados por scripts npm e por 1 workflow — comandos que não podem selecionar nenhum teste. | `package.json:96,124,125,126,128,174,209`; `.github/workflows/e2e-flows.yml:248`; `playwright.config.ts:38-134` |
| 8 | **80 de 85 specs visuais não têm baseline commitada** e 205 chamadas `test.skip(...)` desativam casos e2e em runtime quando o ambiente não tem dados. | ver §C.2 e §C.7 |

---

## A) Panorama quantitativo

### A.1 Censo de arquivos, linhas e declarações

Comando (Python + `os.walk`, regex `\.(test|spec)\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$`;
`it/test` = `^\s*(it|test)(\.\w+(\(...\))?)?\s*(\.each\(...\))?\s*\(`;
`describe` = `^\s*describe(\.\w+)?\s*\(`):

| Raiz | Arquivos | Linhas | `describe(` | `it(`/`test(` |
|---|---:|---:|---:|---:|
| `tests/` | 604 | 93.857 | 1.580 | 6.032 |
| `src/**` (co-localizado, `__tests__/` e irmãos) | 569 | 96.369 | 1.492 | 5.443 |
| `e2e/` | 556 | 60.994 | 577 (`test.describe(`) | 2.848 |
| `src/tests/` | 33 | 4.411 | 70 | 323 |
| `scripts/__tests__/` | 6 | 945 | 13 | 52 |
| `supabase/functions/**` (Deno, fora do escopo) | 28 | 4.080 | — | 213 (`Deno.test(`) |
| **TOTAL** | **1.796** | **260.656** | **3.732** | **14.911** |

`src/test/` (3 arquivos) **não contém testes** — são helpers:
`src/test/detect-flaky-vitest.mjs`, `src/test/mockStructuredLogger.ts`,
`src/test/sellerCartRestoreHelpers.tsx`.

`qa/` (escopo declarado, 13 arquivos na raiz) **não contém código executável de teste**:
são 22 relatórios `.md`, 1 allowlist JSON (`qa/pdf-color-allowlist.json`, consumida por
`src/components/pdf/__tests__/pdfHardcodedColors.test.ts:60`), exports PDF/HTML/PNG de
baseline manual e SQL de rascunho. **Nenhum runner aponta para `qa/`.**

### A.2 Distribuição por tipo (heurística de caminho + nome)

| Tipo | Arquivos |
|---|---:|
| unit / componente | 873 |
| e2e (Playwright) | 565 |
| integração / live | 170 |
| segurança / RLS / SSOT | 46 |
| fuzz / property / stress | 45 |
| contrato | 32 |
| regressão | 13 |
| a11y | 12 |
| visual / snapshot | 12 |
| **TOTAL** | **1.768** |

### A.3 Top diretórios por volume de casos

| Diretório | Arquivos | `it()`/`test()` |
|---|---:|---:|
| `src/components/**` | 231 | 1.910 |
| `src/hooks/**` | 98 | 1.288 |
| `tests/components/` | 94 | 1.229 |
| `e2e/flows/` | 181 | 1.125 |
| `src/lib/**` | 90 | 940 |
| `tests/hooks/` | 108 | 849 |
| `src/pages/**` | 92 | 814 |
| `tests/lib/` | 53 | 762 |
| `tests/unit/` | 30 | 642 |
| `tests/edge-functions/` | 146 | 574 |
| `e2e/routes/` | 88 | 179 |

### A.4 Runners declarados

**Vitest** (`vitest.config.ts:40-47` include / `:51-70` exclude):

```
include: tests/**/*.{test,spec}.*  |  src/**/*.{test,spec}.*
         e2e/scripts/__tests__/*.test.ts
         scripts/__tests__/**/*.{test,spec}.{ts,mts,cts}
exclude: tests/__deprecated__      (vitest.config.ts:57)
         tests/e2e/**              (vitest.config.ts:63)
         tests/navigation-tooltips.spec.ts      (:64)
         tests/security/notification-rls.spec.ts (:65)
         tests/rls/live-rls.test.ts             (:69)
```

→ **1.189 arquivos** casam o Vitest.
`typecheck.enabled: false` (`vitest.config.ts:48-50`) — nenhum teste valida tipos.
`retry: 2` (`vitest.config.ts:81`) — falhas intermitentes são absorvidas.

**Playwright** (`playwright.config.ts:9,16`): `testDir: './e2e'`, `testMatch: '**/*.spec.ts'`
→ **555 arquivos**. `retries: 5` em CI (`playwright.config.ts:23`).

**Interseção Vitest ∩ Playwright = 0** (o exclude de `tests/e2e/**` e o `testDir` disjunto
garantem isso). **52 arquivos de teste no disco não casam nenhum dos dois** — §C.4.

---

## B) O que está realmente protegido

Critério de classificação:
- ✅ **IMPLEMENTADO_TOTAL** — o teste importa o alvo real, asserta comportamento observável e algum runner o coleta.
- 🟨 **IMPLEMENTADO_PARCIAL** — importa o alvo, mas asserta forma/string/estrutura em vez de comportamento, ou só parte da área tem cobertura, ou o gate depende de segredo ausente.
- 🟦 **SUGERIDO_OU_INICIADO** — arquivo existe mas é espelho/mock-de-si-mesmo/skip por padrão.
- ⬛ **MORTO_OU_ABANDONADO** — nenhum runner coleta, ou o alvo importado não existe mais.

| Área funcional | Arquivos de teste (com linha) | Importa o alvo real? | Runner coleta? | Classe |
|---|---|---|---|---|
| **SSOT do projeto Supabase** (REGRA #1) | `src/tests/contracts/supabase-config.test.ts:2` (importa `@/integrations/supabase/client`) | **Sim** | Vitest (`test:quality`, `ci.yml:94`) | 🟦 — as 3 asserções ficam atrás de `if (!isSupabaseHosted) return;` (`:13,19,24`) e `tests/setup.ts:10` força `localhost:54321` no job que a roda |
| **Fallback SSOT do client** | `src/integrations/supabase/__tests__/ssot-fallback.test.ts`, `…/ssot-fallback-log-severity.test.ts` | Sim | Vitest | 🟨 |
| **Relatório SSOT (schema/markdown/bump)** | `tests/ssot/` (8 arq., 61 casos) — `ssot-report-schema.test.ts`, `ssot-gates.fuzz.test.ts` etc. | Parcial — vários leem/escrevem arquivos e invocam scripts | Vitest | 🟨 |
| **RBAC / matriz de permissões** | `tests/lib/rbac-permissions.test.ts:15,52,59` | **NÃO** — reimplementa a matriz | Vitest | 🟦 **espelho com drift confirmado** (papéis reais em `src/hooks/auth/useRBAC.tsx:12`) |
| **Papéis / roles (UI)** | `tests/unit/roles.test.ts` (em `test:ci-core`, `package.json:55`) | Sim (`src/lib/roles.ts`) | Vitest (quality-gate.yml:122) | ✅ |
| **RLS — políticas críticas** | `tests/rls/critical-tables-rls.test.ts:12-13` ("mirror of actual DB") | **NÃO** — constantes locais | Vitest | 🟦 espelho; 2 casos são `expect(true).toBe(true)` (`:321,327`) |
| **RLS — verificação viva** | `tests/rls/personas.test.ts:17`, `owner-only-tables-rls.test.ts:167,230`, `no-empty-rls-policies.test.ts:32`, `e2e-cleanup-rate-limit.test.ts:21` | Sim (`createClient` real) | Vitest, mas `describe.skip` sem credenciais | 🟦 |
| **RLS — live** | `tests/rls/live-rls.test.ts` | Sim | **Nenhum** (`vitest.config.ts:69` exclui) | ⬛ |
| **Edge Functions — integração** | `tests/edge-functions/integration/**` (42 arq. com `mockEdgeFunctionFetch`) | **NÃO** — mockam `fetch` e asseram o próprio mock | Vitest + `edge-integration-all.yml:70` | 🟦 |
| **Edge Functions — live** | `tests/edge-functions/live/**` (103 descritores + harness) | Sim (HTTP real) | Vitest, mas `describe.skip` por padrão (`_live-client.ts:62`) | 🟦 |
| **Edge Functions — handler direto (Deno)** | `supabase/functions/log-login-attempt/index_test.ts`, `supabase/functions/tests/seller-carts-rls_test.ts` | Sim | `deno test` em `edge-integration-all.yml:52` e `cart-header-quality-gate.yml:140` | ✅ (2 de 30 arquivos Deno) |
| **Catálogo de produtos / filtros** | `src/components/products/__tests__/**` (89 arq. mapeados p/ `src/components/products`), `tests/components/products/**` | Sim | Vitest | ✅ |
| **Carrinhos do vendedor** | `src/components/cart/__tests__/**` (18 arq.), `src/contexts/__tests__/SellerCartContext.test.tsx`, `e2e/carrinhos/**` (43 specs) | Parcial — 4 arquivos de `cart/__tests__` não importam alvo (§C.1) | Vitest; e2e só via workflows dedicados | 🟨 |
| **Orçamentos — cálculo** | `src/logic/quotes/__tests__/calculations.test.ts` (105 casos em `src/logic`) | Sim | Vitest + `ci-quotes-wizard.yml` | ✅ |
| **Orçamentos — cálculo (duplicata espelho)** | `tests/unit/quote-calculations.test.ts:20,33` | **NÃO** — `calcItemTotal`/`calcQuoteTotal` locais | Vitest | 🟦 |
| **Orçamentos — hooks** | `src/hooks/quotes/__tests__/**` (63 arq. mapeados) | Sim | Vitest | ✅ |
| **Orçamentos — layout/UI (contratos regex)** | `src/pages/quotes/__tests__/quote-builder-*.contract.test.ts` (6 arq.) | **NÃO** — `readFileSync` + `toMatch` no `.tsx` | Vitest | 🟨 (protege string de className, não comportamento) |
| **Frete / freight-quest** | `tests/unit/freight-quest/freight-calculations.test.ts`, `…/freight-property-based.test.ts`, `tests/regression/freight-quest-regression-suite.test.ts` | **NÃO** — `calcFreight`/`calcTotal` locais | Vitest + `ci-freight-quality.yml`, `freight-quality-gates.yml` | 🟦 espelho |
| **Frete — helpers reais** | `tests/hooks/quotes/quoteHelpers.freight.test.ts` (nomeado em `ci-freight-quality.yml:36`) | Sim | Vitest (workflow dedicado) — **fora** de `test:quality` (§C.4) | 🟨 |
| **PDF / proposta** | `src/components/pdf/**/__tests__/**` (23 arq.), 2 `.snap` | Sim | Vitest + `pdf-quality.yml` | ✅ |
| **PDF — cores hardcoded** | `src/components/pdf/__tests__/pdfHardcodedColors.test.ts:49,101` | Não (varre a árvore com `readFileSync`) | Vitest | 🟨 (gate de lint, não teste) |
| **Magazine / revista** | `tests/magazine/` (12 arq., 84 casos), `src/pages/magazine/**` (28 arq. mapeados), `e2e/magazine/` (4 specs) | Sim | Vitest + `magazine-unit-tests.yml`, `magazine-typed-queries.yml` | ✅ (exceto `magazine-templates-gallery-visual.spec.ts`, §C.5) |
| **Estoque / inventário** | `src/components/inventory/__tests__/**` (47 arq.), `tests/stock-*.test.*`, `src/lib/inventory/**` (27) | Sim | Vitest + `stock-module-quality.yml`, `stock-filter-stress.yml` | ✅ |
| **Autenticação / sessão** | `tests/contexts/AuthContext.test.tsx` (+114 arquivos mapeados p/ `src/contexts/AuthContext.tsx`), `src/lib/auth/**` (23) | Sim | Vitest | ✅ |
| **Auth — cenários P0 (recovery, MFA, logout global)** | `tests/p0/auth-recovery.test.ts:13-36` | Não | Vitest | 🟦 7 `it.skip` com corpo `expect(true).toBe(true)` |
| **Busca global** | `src/components/search/__tests__/searchSanitization.test.ts:20,23` | **NÃO** — regex copiada | Vitest + `global-search-gate.yml` | 🟦 espelho (comentário aponta "line 426"; o real está em `src/components/search/useGlobalSearch.ts:465`) |
| **Busca global — UI** | `src/components/search/__tests__/GlobalSearchPalette*.test.tsx`, `tests/components/search/GlobalSearchPalette.test.tsx` | Sim (mas com `vi.mock` de módulos inexistentes, §C.5) | Vitest | 🟨 |
| **Telemetria** | `tests/lib/telemetry-logic.test.ts:*` (7 funções locais) | **NÃO** | Vitest | 🟦 espelho |
| **Telemetria — real** | `src/lib/telemetry/**` (32 arquivos de teste mapeados) | Sim | Vitest | ✅ |
| **Reposição / replenishment** | `src/hooks/products/__tests__/useReplenishments*.{test,integration}.*`, `tests/snapshots/replenishment-errors.test.ts` | Sim | Vitest + `replenishment-quality.yml` (que chama um script npm inexistente, §C.4) | 🟨 |
| **Navegação / rotas (guardas)** | `tests/admin/route-error-element-checker.test.ts`, `route-ref-checker.test.ts`, `src/routes/**` (3 arq.) | Parcial (checkers escrevem fixtures em disco) | Vitest | 🟨 |
| **Rotas da aplicação (e2e)** | `e2e/routes/**` (88 specs, 179 casos) — geradas por `e2e/routes/_factories.ts` | N/A (browser) | Playwright — **nenhum workflow as invoca por nome ou projeto existente** | 🟦 |
| **Design system / `src/components/ui`** | 115 arquivos de teste mapeados p/ `src/components/ui`, `e2e/ui/**` (26 specs) | Sim | Vitest; e2e via `ui-visual-a11y.yml`/`visual-tests.yml` | 🟨 (44 de 61 módulos `ui` nunca importados — §D) |
| **A11y** | `tests/a11y/` (2), `e2e/tooltips-a11y.spec.ts`, 12 arquivos classificados | Parcial | Vitest + Playwright | 🟨 |
| **Bridge / DB externo (legado)** | `tests/__deprecated__/bridge/**` (12 arq., 110 casos) | Alvos removidos (`@/components/BridgeStatusBanner`, `@/hooks/intelligence/useBridgeStatusBanner`) | **Nenhum** (`vitest.config.ts:57`) | ⬛ |
| **Fluxos e2e (`tests/e2e/`)** | 8 specs, 31 casos | Imports quebrados (`../fixtures/test-base`) | **Nenhum** | ⬛ |
| **Scripts de build/CI** | `scripts/__tests__/` (6 arq., 52 casos) | Sim | Vitest (5 de 6) | 🟨 — `check-invoke-direct-calls.test.mjs` órfão (§C.4) |

---

## C) As sete armadilhas

### C.1 — Teste-espelho (o teste reimplementa a lógica e testa a si mesmo)

**Método:** para cada arquivo de teste, extraí todos os especificadores de `import`/
`import()`/`require`/`vi.mock` e resolvi os que começam com `@/` ou `.`. Arquivo é
candidato quando **nenhum** especificador resolve para `src/`, `supabase/`, `scripts/`,
`api/` ou `medallion/`, **e** o próprio arquivo define funções de topo, **e** contém `expect(`.

**Resultado:** de 1.768 arquivos de teste, **834 não importam nenhum alvo**; excluindo
`e2e/` (browser, legítimo), `live/` (harness delegado) e `__deprecated__`, restam
**52 espelhos** confirmados. Os de maior impacto:

| Arquivo:linha | Função reimplementada | Alvo real | Drift observado |
|---|---|---|---|
| `tests/lib/rbac-permissions.test.ts:15` (`const rolePermissions`), `:52` (`hasPermission`), `:59` (`getRoleName`) | matriz RBAC inteira | `src/hooks/auth/useRBAC.tsx` | **SIM, crítico.** Teste usa `'admin' \| 'manager' \| 'seller' \| 'viewer'` (`:7`); o alvo declara `export type RoleName = 'agente' \| 'dev' \| 'supervisor'` (`src/hooks/auth/useRBAC.tsx:12`). O comentário `// Replicated from useRBAC.tsx` está em `:14`. |
| `src/components/search/__tests__/searchSanitization.test.ts:20,23` | `SANITIZE_REGEX` + `sanitizeSearchTerm` | `src/components/search/useGlobalSearch.ts:465` | **SIM.** O cabeçalho (`:19`) diz "Exact regex from useGlobalSearch.ts line 426"; a linha real hoje é 465. O teste está no gate `global-search-gate.yml`. |
| `tests/rls/critical-tables-rls.test.ts:12-13` (`RLS POLICY DEFINITIONS (mirror of actual DB)`), `:23,38,54` | políticas de `quotes`, `orders`, `profiles`, `user_roles`, `organizations` | banco `doufsxqlfjyuvxuezpln` | Não verificável estaticamente; por construção, qualquer mudança de policy no banco não quebra este teste. |
| `tests/rls/telemetry-logs-connections-access.test.ts` | `isSupervisorOrAbove`, `isAdmin`, `isDev`, `canViewAuditLogs`, `canViewTelemetry`, `canViewConnections`, `canManageConnections`, `evaluateGate` | gates reais em `src/hooks/**` | espelho |
| `tests/unit/quote-calculations.test.ts:20,33` | `calcItemTotal`, `calcQuoteTotal` | `src/logic/quotes/calculations.ts` | espelho (há teste real ao lado: `src/logic/quotes/__tests__/calculations.test.ts`) |
| `tests/unit/freight-quest/freight-calculations.test.ts`, `tests/unit/freight-quest/freight-property-based.test.ts`, `tests/regression/freight-quest-regression-suite.test.ts` | `calcFreight`, `calcQuoteTotal(s)` | lógica de frete em `src/` | espelho — **e estão em gates de qualidade de frete** (`ci-freight-quality.yml`, `freight-quality-gates.yml`) |
| `tests/components/pages/PageUtilities.test.ts:14,34,38,43` | `formatCNPJ`, `getStatusColor`, `calculateCartTotal`, `validateQuoteItems` | `QuoteViewPage`, `CartUtilComponents`, `useSellerCarts` | auto-declarado: `// Replicate formatCNPJ from QuoteViewPage` (`:13`) |
| `tests/lib/telemetry-logic.test.ts` | `getTimeThreshold`, `formatDuration`, `classifySeverity`, `calculateTopOffenders`, `prepareCSVRow`, `formatBucketTime`, `calculateBuckets` | `src/lib/telemetry/**` | espelho |
| `tests/lib/validate.test.ts` | `validateRequired`, `isNonEmptyString`, `isPositiveNumber` | — | espelho |
| `tests/hooks/useTechniquePricing.test.ts:2-3,11` | `filterMatchingTables` etc. | `src/hooks/simulation/useTechniquePricing.ts` | auto-declarado (`We replicate the internal pure logic`) **e** o `import type` em `:6` aponta para `@/hooks/useTechniquePricing`, caminho que não existe mais |
| `tests/hooks/useQuotes-helpers.test.ts` | `encodeShippingInNotes`, `decodeShippingFromNotes`, `encodeBitrixProductIdInNotes`, `decodeBitrixProductIdFromNotes` | helpers de `useQuotes` | espelho |
| `tests/hooks/useReplenishments.test.ts` | `calcDaysSinceReplenishment`, `calcDaysRemaining`, `isReplenishment` | `src/hooks/products/useReplenishments.ts` | espelho |
| `tests/hooks/super-filtro-price-sentinel.test.ts` | `applyPriceFilter` | filtro de preço real | espelho |
| `tests/ai-usage.test.ts` | `estimateCost` | — | espelho |
| `tests/color-navigation.test.ts` | `buildColorNavParams`, `findVariationByParams`, `buildShareMessage`, `filterMainImages` | navegação de cor | espelho (33 casos) |
| `tests/contracts/webhook-contracts.test.ts` | `zodErrorToFields`, `buildErrorResponse`, `parseVersioned`, `expectUnified422` | contrato de webhook | espelho parcial (importa `../contracts/webhook-schemas`, mas reimplementa o envelope) |
| `tests/edge-functions/parseAiResponse.test.ts` / `tests/functions/aiRecommendationsJsonParsing.test.ts` | `parseAiResponse` / `parseAIResponseContent` | edge function de IA | espelho — o segundo está `describe.skip` (`:58`) |
| `tests/unit/freight-coverage-validation.test.ts` | `validateCep` | — | espelho |
| `src/components/products/__tests__/QuickAddToQuote.guard.test.ts` | `shouldOpenSelector` | `QuickAddToQuote.tsx` | espelho co-localizado |
| `src/components/products/__tests__/QuickAddToQuote.toast.test.ts` | `buildToastPayload` | idem | espelho co-localizado |
| `src/components/cart/__tests__/CartHeaderButton.{delete,scrollHeight,undoSnapshot}.test.*` | `trashPointerDown`, `trashOnClick`, `scrollAreaHeight`, `makeHandler` | `CartHeaderButton.tsx` | espelho co-localizado |
| `src/components/quotes/__tests__/QuoteBuilderActionButtons.fuzz.test.ts` | `isSideBySide` | componente real | espelho |
| `src/hooks/products/__tests__/useSellerCarts.updateItemQuantity.rollback.test.tsx` | `clampQuantity` + harness próprio | `useSellerCarts.ts` | espelho |
| `src/pages/quotes/__tests__/conditions-collapse-persistence.test.ts` | `makeToggle` + `KEY` | persistência real | espelho |
| `tests/security/iframe-sandbox-gate.test.ts`, `tests/security/lint-0029-drift.test.ts` | `makeSandbox`, `fixture`, `run` | gates de lint | espelho de fixture (aceitável para lint-gate) |

**Categoria irmã — o mock é o sujeito do teste (42 arquivos):**
`tests/edge-functions/integration/**` importa `mockEdgeFunctionFetch` de
`tests/p0/_mocks.ts:68`, registra um corpo literal e depois asserta esse corpo.
Exemplo mínimo, `tests/edge-functions/integration/health-check.test.ts:18-31`:
o `body` com `status:"healthy"` é definido em `:21`, e `:29` asserta
`expect(data.status).toMatch(/^(healthy|degraded|unhealthy)$/)`. Nenhum arquivo de
`tests/edge-functions/` importa `supabase/functions/**` (verificado:
`grep -rln "from ['\"].*supabase/functions" tests/edge-functions/` → só
`tests/edge-functions/live/_authz.ts`).

### C.2 — Suíte desligada

**`.only`: 0 ocorrências** em `tests/`, `src/`, `e2e/`. **`xit`/`xdescribe`: 0.** **`.todo`: 0.**

**`describe.skip` estático (não condicional) — 18 blocos:**

| Local | Justificativa presente no arquivo |
|---|---|
| `tests/ssr/useDevGate.ssr.test.tsx:22` | — |
| `tests/lib/date-utils-extended.test.ts:18` | — |
| `tests/lib/theme-presets.test.ts:170,279,639,661` | 4 blocos (§3, §4, §11×2) de um arquivo de 104 casos que **está no `test:ci-core`** (`package.json:55`) e no `test:deploy-gate` (`:57`) |
| `tests/functions/aiRecommendationsJsonParsing.test.ts:58` | — |
| `tests/pages/AdminLoginAttemptsPage.test.tsx:58` | — |
| `src/components/layout/sidebar/__tests__/SidebarNavGroup.harmony.test.tsx:112,150,187` | comentário em `:7`: "removi describe.skip. CI do PR #168 falhou…" |
| `src/components/layout/sidebar/__tests__/SidebarNavGroup.collapse.test.tsx:168,218,248` | — |
| `src/components/layout/sidebar/__tests__/SidebarFocusVisible.test.ts:41` | — |
| `src/hooks/__tests__/useCatalogState.unit.test.tsx:108` | — |
| `src/services/__tests__/magazinePublishTrigger.test.ts:139` | justificado em `:23` e `:138` ("Para ativar: trocar `describe.skip` por `describe`") |
| `e2e/flows/99-auth-ui-baseline.spec.ts:16` | justificado em `:14` ("Commitar as imagens e remover este describe.skip") |
| `e2e/color-swatch-sweep.spec.ts:185` | "Cenário out-of-stock determinístico (mock)" |
| `e2e/scripts/__tests__/generate-fixtures.test.ts:17` | `// TODO(test-debt): 4 testes falham — console spy nao captura output.` (`:13-15`) |

**`describe.skip` condicional (gate por env) — 9 blocos, todos com skip padrão sem segredos:**
`tests/edge-functions/live/_live-client.ts:62` (governa **103 arquivos**),
`tests/rls/owner-only-tables-rls.test.ts:167,230`, `tests/rls/personas.test.ts:17`,
`tests/rls/e2e-cleanup-rate-limit.test.ts:21`, `tests/rls/no-empty-rls-policies.test.ts:32`,
`tests/integration/discountApprovalFlow.test.ts:346`, `tests/security/edge-authz-bypass.test.ts:36`,
`tests/security/restore-seller-cart-rpc.test.ts:125` (`describe.skipIf`),
`src/lib/external-db/kit-coverage.integration.test.ts:28`,
`src/hooks/products/__tests__/useReplenishments.integration.test.ts:14`.

**`it.skip`/`test.skip` estático com título literal — 59 casos.** Concentração:

| Arquivo | Casos |
|---|---:|
| `tests/p0/webhooks-resilience.test.ts` | 9 |
| `tests/p0/external-integrations.test.ts` | 8 |
| `tests/p0/edge-functions-failing.test.ts` | 8 |
| `tests/p0/auth-recovery.test.ts` | 7 |
| `tests/p0/rls-data-integrity.test.ts` | 5 |
| `e2e/flows/p0/05-admin-down.spec.ts` | 4 |
| `e2e/flows/p0/0{1,2,3,4}-*.spec.ts` | 3 cada |
| `tests/pages/AdminTelemetriaPage.test.tsx`, `tests/lib/personalization/adapters/price-response.adapter.test.ts`, `tests/contexts/AuthContext.test.tsx`, `src/components/quotes/__tests__/PdfGenerationDialog.print.test.tsx`, `src/components/layout/sidebar/__tests__/SidebarNoShadow.test.ts` | 1 cada |

**`test.fixme`: 8 ocorrências.**
**Bloco morto renomeado:** `tests/admin/__strict-ref-gate-smoke.skip.ts` — extensão `.skip.ts`
não casa `include` de nenhum runner; contém `expect(true).toBe(true)` em `:25`.

### C.3 — Asserção vacuamente verdadeira

**a) `expect(true).toBe(true)` — 45 ocorrências em 23 arquivos:**

| Arquivo | Casos | Contexto |
|---|---:|---|
| `tests/p0/external-integrations.test.ts:25,31,36,43,49,55,59,65` | 8 | corpo único de `it.skip` |
| `tests/p0/auth-recovery.test.ts:14,18,22,26,30` (+2) | 7 | idem |
| `tests/p0/webhooks-resilience.test.ts:58,63,68,95` | 4 | idem |
| `tests/p0/edge-functions-failing.test.ts:95,101,106,112` | 4 | idem |
| `tests/p0/rls-data-integrity.test.ts:107,138,143` | 3 | idem |
| **`tests/rls/critical-tables-rls.test.ts:321,327`** | 2 | **ATIVOS** — `it('role changes are protected by prevent_role_self_update trigger')` e `it('profile.role sync is protected by prevent_profile_role_change trigger')`. Comentário: `// Structural assertion — trigger exists in DB`. Nada é verificado. |
| `e2e/flows/p0/04-checkout-blocked.spec.ts` (2), `03-quote-blocked.spec.ts`, `05-admin-down.spec.ts`, `e2e/flows/21-feature-matrix.spec.ts` | 5 | — |
| `tests/stock-performance.test.ts`, `tests/security/secdef-anon-drift.test.ts`, `tests/security/lint-0011-drift.test.ts`, `tests/magazine/regression-2026-07-15.test.tsx`, `tests/hooks/useIPValidation.test.ts:84`, `tests/hooks/useGlobalShortcuts-lastgat-isolation.test.ts:123`, `tests/components/products/StatsPopover.test.tsx:853`, `src/utils/__tests__/undoToast.stress.test.tsx`, `src/hooks/products/__tests__/usePublicoAlvoOptions.test.ts`, `src/components/quotes/__tests__/PdfGenerationDialog.print.test.tsx`, `src/components/pdf/proposal/__tests__/totalsBlocksEmitLocal.test.tsx` | 11 | 1 cada |

**b) Asserção que aceita quase todo valor JS:**
`tests/hooks/_helpers/smoke-template.ts:20`
```ts
expect(["object","function","boolean","string","number","undefined"].includes(t)).toBe(true);
```
`t` é `typeof result.current`. Só `symbol` e `bigint` falhariam — impossíveis para um hook.
Consumido por `tests/hooks/quotes-smoke.test.ts` e `tests/hooks/catalog-comparison-smoke.test.ts`.

**c) Early-return que zera as asserções (o caso mais grave):**
`src/tests/contracts/supabase-config.test.ts`
```
:10   const isSupabaseHosted = SUPABASE_URL.includes('.supabase.co');
:13   it(...) { if (!isSupabaseHosted) return; expect(SUPABASE_URL).toContain(CURRENT_PROJECT_ID); ... }
:19   it(...) { if (!isSupabaseHosted) return; ... }
:24   it(...) { if (!isSupabaseHosted) return; ... }
```
`tests/setup.ts:10` faz `vi.stubEnv('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'http://localhost:54321')`.
O único job que coleta este arquivo é `.github/workflows/ci.yml:94` (`npm run test:quality`),
e esse step **não define `VITE_SUPABASE_URL`**. Logo `isSupabaseHosted === false` e os três
testes retornam sem executar nenhuma asserção. O gate que a REGRA #1 do `CLAUDE.md`
descreve como protetor do SSOT está, em CI, contando 3 testes verdes com 0 asserções.
*(Nota: `quality-gate.yml:123-124` define `VITE_SUPABASE_URL: https://placeholder.supabase.co`
— que passaria no `isSupabaseHosted` — mas o script daquele job, `test:ci-core`
(`package.json:55`), não inclui este arquivo.)*

**d) Assertivas triviais em massa:** 255 usos de `.toBeDefined()` e 94 de
`.toBeGreaterThanOrEqual(0)` (esta última verdadeira para qualquer contagem/tamanho não
negativo). Não foram auditadas caso a caso — sinalizadas como volume.

**e) Padrão e2e "isVisible().catch(() => false)" — 274 ocorrências.**
Ex.: `e2e/routes/_factories.ts:107-113` faz `.isVisible({timeout:8000}).catch(() => false)`
e depois `expect(visible).toBe(true)`. Isso converte erro de localizador em `false`, o que é
correto; mas o padrão inverso (`expect(...).toBe(false)` sobre um `catch(()=>false)`) é
vacuamente verdadeiro. Não quantifiquei a proporção invertida — `NAO_VERIFICADO`.

**f) Arquivos sem nenhum `expect`/`assert`/`toMatchSnapshot` — 166.**
Desses, 103 são `tests/edge-functions/live/*.test.ts` (delegam ao harness
`_live-suite.ts`, comportamento legítimo) e 55 são `e2e/routes/**` gerados por
`e2e/routes/_factories.ts` (também delegam). Restam **8 casos reais a investigar**:
`tests/admin/admin-ref-warning-guard.test.tsx`, `tests/admin/reduced-app-navigation.test.tsx`,
`tests/admin/skeleton-fallbacks-ref-warning.test.tsx`, `tests/admin/skeleton-navigation-integration.test.tsx`,
`tests/hooks/catalog-comparison-smoke.test.ts`, `tests/hooks/quotes-smoke.test.ts`,
`tests/security/notification-rls.spec.ts`, `e2e/theme-validation.spec.ts`,
`e2e/product-colors.spec.ts`, `e2e/flows/04c9-discount-approval-pagination-asc.spec.ts`.

### C.4 — Sem runner (órfãos)

**Método:** cruzei a árvore real de arquivos `*.{test,spec}.*` contra os `include`/`exclude`
de `vitest.config.ts:40-70` e o `testDir`+`testMatch` de `playwright.config.ts:9,16`.

**52 arquivos de teste que nenhum runner coleta:**

| Grupo | Arquivos | Motivo |
|---|---:|---|
| `supabase/functions/**/*.test.ts` | 29 | Fora do `include` do Vitest e do `testDir` do Playwright. São testes Deno (213 `Deno.test(`), mas o CI só invoca `deno test` para 2 arquivos com sufixo `_test.ts` (`edge-integration-all.yml:52`, `cart-header-quality-gate.yml:140`) — nenhum dos 29 |
| `tests/__deprecated__/bridge/**` | 12 | `vitest.config.ts:57` |
| `tests/e2e/*.spec.ts` | 8 | `vitest.config.ts:63` exclui, e `testDir: './e2e'` (`playwright.config.ts:9`) não alcança `tests/e2e/` |
| `tests/navigation-tooltips.spec.ts` | 1 | `vitest.config.ts:64` |
| `tests/security/notification-rls.spec.ts` | 1 | `vitest.config.ts:65` |
| `tests/rls/live-rls.test.ts` | 1 | `vitest.config.ts:69` |
| `scripts/__tests__/check-invoke-direct-calls.test.mjs` | 1 | o include de `scripts/` aceita só `{ts,mts,cts}` (`vitest.config.ts:46`); o arquivo é `.mjs` |

Lista nominal dos `supabase/functions` órfãos (amostra): `_shared/createEdge.test.ts`,
`_shared/credentials.test.ts`, `_shared/kill_switch.test.ts`, `_shared/token-revocation.test.ts`,
`_shared/url-allowlist.test.ts`, `_shared/dispatcher-auth.test.ts`,
`_shared/contracts/schemas/{product-webhook,webhook-inbound}.test.ts`,
`receive-crm-callback/index.test.ts`, `mcp-keys-issue/rls-isolation.test.ts`,
`webhook-dispatcher/dispatcherAuth.test.ts`, `crm-db-bridge/*.test.ts` (7),
`connections-auto-test/*.test.ts` (3), `secrets-manager/list-contract.test.ts`,
`tests/{edge_integration,production-readiness}.test.ts`.

**Órfãos "de segundo grau" — coletados por um runner mas nunca invocados por CI:**

- **`tests/hooks/**` (108 arquivos, 849 casos)** — excluídos explicitamente pelo único
  job amplo de Vitest: `"test:quality": "vitest run --exclude 'tests/hooks/**'"`
  (`package.json:54`, usado em `.github/workflows/ci.yml:94`). Apenas 5 arquivos desse
  diretório são nomeados em workflows específicos (`ci-freight-quality.yml:36`,
  `stock-module-quality.yml:65-67`, `supplier-comparison.yml:8`).
- **`e2e/routes/**` (88 specs)** — o pipeline padrão (`playwright.yml:31`) roda só
  `chromium-smoke`; os scripts que teoricamente cobririam essas rotas
  (`test:e2e:regression`, `test:e2e:mobile`) referenciam projetos inexistentes (§C.7).
- **A suíte Vitest completa (`npm test`, `package.json:53`) não é invocada por
  nenhum workflow.** Os que existem: `test:quality` (tudo menos `tests/hooks/**`),
  `test:ci-core` (25 arquivos, `quality-gate.yml:122`), `test:ci-core:coverage`
  (3 arquivos, `full-ci.yml:52` e `freight-quality-gates.yml:281`), `test:deploy-gate`
  (3 arquivos, `deploy-gates.yml:75`).

**Script npm referenciado por workflow mas inexistente:**
`.github/workflows/replenishment-quality.yml:56,69` chamam `npm run test:e2e:card-parity`;
essa chave não existe em `package.json`.

### C.5 — Alvo inexistente (import que não resolve no disco)

**Método:** resolvi cada especificador `@/…` e `./…` contra `['', .ts, .tsx, .d.ts, .js, .jsx, .mjs, .cjs, .mts, .json, /index.ts, /index.tsx, /index.js]`.

**53 imports quebrados**, separados por severidade:

**(a) Import de valor — quebra a coleta do arquivo (5, descontando `__deprecated__` e órfãos):**

| Arquivo:linha | Import | Real |
|---|---|---|
| `e2e/scripts/__tests__/generate-fixtures.test.ts:5` | `../fixtures/permissions-matrix` → `e2e/scripts/fixtures/…` | existe em `e2e/fixtures/permissions-matrix.ts` (falta um `../`). **Este arquivo está no `include` do Vitest** (`vitest.config.ts:45`) |
| `e2e/magazine/magazine-templates-gallery-visual.spec.ts:17,18,19,20` | `./fixtures/test-base`, `./helpers/nav`, `./helpers/waits`, `./fixtures/selectors` | existem em `e2e/fixtures/` e `e2e/helpers/` (falta um `../`). O spec irmão `magazine-templates-gallery.spec.ts` usa os caminhos corretos. Coletado pelo Playwright → erro de coleta |
| `tests/e2e/catalog-flows.spec.ts:5,6` | `../fixtures/test-base`, `../helpers/nav` | órfão de qualquer forma (§C.4) |
| `tests/__deprecated__/bridge/BridgeStatusBanner.test.tsx:3,5` e `useBridgeStatusBanner.test.ts:3` | `@/components/BridgeStatusBanner`, `@/hooks/intelligence/useBridgeStatusBanner` | módulos removidos; diretório excluído |
| `tests/__deprecated__/bridge/external-db-bridge.test.ts:6,7` | `./_live-suite`, `./descriptors` | idem |

*Falso positivo descartado:* `tests/admin/route-error-element-checker.test.ts:100`
(`import Boom from "./Boom"`) está dentro de um template literal escrito em disco como fixture.

**(b) `import type` de módulo inexistente — invisível em runtime (typecheck desligado em `vitest.config.ts:48`):**

| Arquivo:linha | Import type | Onde o módulo está hoje |
|---|---|---|
| `tests/a11y/onda5-a11y.test.tsx:8` | `@/hooks/useMagicUpState` | `src/hooks/intelligence/useMagicUpState.ts` |
| `tests/components/magic-up-onda5.test.tsx:9` | `@/hooks/useMagicUpState` | idem |
| `tests/hooks/useReplenishmentsSelectionMode.test.ts:6` | `@/hooks/useReplenishments` | `src/hooks/products/useReplenishments.ts` |
| `tests/hooks/useTechniquePricing.test.ts:6` | `@/hooks/useTechniquePricing` | `src/hooks/simulation/useTechniquePricing.ts` |
| `tests/pages/kit-builder/useKitBuilderQuote.test.ts:11` | `@/hooks/useKitBuilder` | `src/hooks/kit-builder/useKitBuilder.ts` |

**(c) `vi.mock()` de módulo inexistente — 35 ocorrências.** O mock é registrado para um
caminho que nada importa; o módulo real (movido/renomeado) **passa sem mock**, ou o
componente sob teste depende de um módulo que não é o mockado. Lista completa:

```
src/components/products/ProductGrid.test.tsx:52            @/utils/cdn-utils
src/hooks/quotes/__tests__/useQuoteTemplates.test.ts:41    @/hooks/use-toast
src/tests/MockupDeletion.test.tsx:100                      @/hooks/mockup/MockupTechniqueHandlers
src/tests/NavigationStructure.test.tsx:33                  ../hooks/useCatalogPrefetch
tests/components/filters/FilterPanel.test.tsx:8,13,37,41,48  useCategoryIcons, useMaterialFilter,
                                                             useSuppliers, useRamoAtividadeFilter,
                                                             useAdvancedFilters
tests/components/kit-builder/KitBuilderComponents.test.tsx:57   @/hooks/useKitStockValidation
tests/components/layout/MainLayout.breadcrumbs.test.tsx:48,52   @/hooks/useScrollLockFix, useGlobalShortcuts
tests/components/mockup/MockupHistoryPanel.test.tsx:17     @/components/mockup/MockupSkeleton
tests/components/pages/AdvancedPriceSearchPage.test.tsx:22 @/hooks/useTecnicasUnificadas
tests/components/pages/Auth.test.tsx:9,17,25,29            CaptchaWidget, SessionGate,
                                                           TermsCheckbox, PasskeyLogin
tests/components/pages/Index.test.tsx:43,47,85,89,117      productssByMaterial, productsFuzzySearch,
                                                           ProductCardSkeleton,
                                                           ProductListItemSkeleton,
                                                           ContextualTooltips
tests/components/pages/MagicUp.test.tsx:28                 @/hooks/usePrintAreas
tests/components/pricing/QuantityPriceCalculator.test.tsx:12,20  useExternalSimulator, useTecnicasUnificadas
tests/components/products/ProductCard.test.tsx:54          @/hooks/productsBounds
tests/components/search/GlobalSearchPalette.test.tsx:19,27 useVoiceCommandHistory, useVoiceFeedback
tests/components/simulator/TechniqueCard.test.tsx:8        @/hooks/useSimulation
tests/hooks/useMockupGenerator.test.ts:40,56,68            useMockupDraft, usePositionHistory,
                                                           useLogoColorAnalysis
tests/__deprecated__/bridge/BridgeMetricsPerformance.test.tsx:18,21  (diretório excluído)
```

Note `@/hooks/productssByMaterial` e `@/hooks/productsBounds` — nomes com erro de digitação
que nunca existiram: o mock nunca teve efeito desde o commit original.

### C.6 — Testes que fazem grep/regex no código-fonte em vez de testar comportamento

**141 chamadas de `readFileSync` em 72 arquivos de teste.** São gates de lint disfarçados de
testes: quebram quando alguém reformata uma linha, e passam quando o comportamento regride.

Os mais explícitos (o teste é *só* regex sobre `.tsx`):

| Arquivo:linha | O que asserta |
|---|---|
| `src/pages/quotes/__tests__/quote-builder-shipping-trigger-width.contract.test.ts:9,13-17` | `SRC.toMatch(/<div className="grid grid-cols-1 md:grid-cols-3 gap-3…" data-testid="freight-grid">…/)` |
| `src/pages/quotes/__tests__/quote-builder-calendar-popover.contract.test.ts` | idem |
| `src/pages/quotes/__tests__/quote-builder-delivery-toggle-placement.contract.test.ts` | idem |
| `src/pages/quotes/__tests__/quote-builder-delivery-trigger-width.contract.test.ts` | idem |
| `src/pages/quotes/__tests__/quote-builder-shipping-fob-pre-inline.contract.test.ts` | idem |
| `src/pages/quotes/__tests__/quote-builder-freight-block-consumers.contract.test.ts` | define `grepInProd()` |
| `src/hooks/quotes/__tests__/handoff-clear-autosave.contract.test.ts` | regex sobre fonte |
| `src/utils/__tests__/cnpj-callsites.audit.test.ts:7,39` | varre a árvore e casa regex |
| `src/components/layout/sidebar/__tests__/SidebarNoShadow.test.ts:28,47,54,63,65,74,87` | `not.toMatch(/\bdark:shadow-(?!none\b)/)` em 6 arquivos |
| `src/components/layout/sidebar/__tests__/SidebarFocusVisible.test.ts` | idem (e o bloco está `describe.skip` em `:41`) |
| `src/components/layout/__tests__/SidebarReorganized.tooltips.test.ts` | idem |
| `src/components/pdf/__tests__/pdfHardcodedColors.test.ts:49,101-103` | `expect(src).toMatch(/export const PDF_TOKENS\s*=/)` |
| `src/components/quotes/__tests__/QuoteBuilderSummary{Alignment,Column.collapsedHeader}.test.ts`, `QuoteItemsTableLayout.test.ts` | classes Tailwind por regex |
| `src/components/inventory/__tests__/{StockAlertsIndicator.width,StockDashboard.header-removed.regression}.test.ts` | idem |
| `src/components/products/__tests__/{ProductCardImage.aspect,ProductCustomizationOptions.summary-color*}.test.ts` | idem |
| `src/components/ui/__tests__/timeline.lock.test.ts`, `src/components/shared/__tests__/Clickable.integration-audit.test.ts`, `src/hooks/mockup/__tests__/mockup-audit.test.ts`, `src/tests/skeleton-integrity.test.ts`, `src/pages/auth/__tests__/auth-copy.smoke.test.ts` | varredura + regex |
| `tests/a11y/clickable-drift.test.ts`, `tests/security/{lint-0011-drift,lint-0029-drift,secdef-anon-drift,security-headers}.test.ts`, `tests/contracts/{quote-conditions-spec-contract,supabase-types-coverage.contract}.test.ts`, `tests/lib/theme-fonts-preload.test.ts`, `tests/ssot/*` (6) | varredura + regex |

Consequência mensurável: `src/pages/quotes/__tests__/*.contract.test.ts` protege literais de
`className` do `QuoteBuilderPage.tsx`. Um `<Select>` que renderize corretamente mas com
outra string de grid falha; um `<Select>` que mantenha a string e pare de funcionar passa.

### C.7 — Snapshots

**Snapshots Vitest (`.snap`): 8 arquivos. Órfãos: 0.** Todos têm o `.test.tsx`/`.test.ts`
correspondente no diretório pai de `__snapshots__`:

```
src/components/cart/__tests__/__snapshots__/PopoverQtyInput.snapshot.test.tsx.snap
src/components/pdf/proposal/__tests__/__snapshots__/ProposalProductTable.visualContrast.test.tsx.snap
src/components/pdf/proposal/__tests__/__snapshots__/ProposalSections.snapshots.test.tsx.snap
src/components/products/__snapshots__/PriceFreshnessBadge.snapshots.test.tsx.snap
src/components/quotes/__tests__/__snapshots__/NegotiationMarkupCard.visualA11y.test.tsx.snap
tests/admin/__snapshots__/skeleton-snapshots.test.tsx.snap
tests/components/__snapshots__/magic-up-onda5.test.tsx.snap
tests/snapshots/__snapshots__/replenishment-errors.test.ts.snap
```

**Baselines Playwright: 5 diretórios `*-snapshots`, 27 PNG. Órfãos: 0.**

```
e2e/optimized-image-visual.spec.ts-snapshots
e2e/visual/preview-button.spec.ts-snapshots
e2e/quotes/quote-number-subtitle.spec.ts-snapshots
e2e/quotes/quote-reset-stepper-layout.spec.ts-snapshots
e2e/quotes/quote-item-editor-sheet-header.spec.ts-snapshots
```

**O problema não é órfão — é o inverso: 80 specs chamam `toHaveScreenshot()`/`toMatchSnapshot()`
sem nenhuma baseline commitada** (85 specs usam a API; só 5 têm diretório). Entre elas todo o
`e2e/ui/*-visual.spec.ts` (8), `e2e/visual/**` (4 de 5), `e2e/admin/stock-*-visual.spec.ts` (3),
`e2e/quotes/**` (15), `e2e/flows/{23,24,38}-*.spec.ts`. Consequência em runtime:
`NAO_VERIFICADO` (o Playwright normalmente falha na primeira execução em CI e grava a baseline
localmente), mas o fato estrutural é que **não há artefato versionado contra o qual comparar**.

**Projetos Playwright inexistentes invocados (armadilha correlata):**
`playwright.config.ts:38-134` define exatamente 10 projetos —
`setup`, `chromium-public`, `firefox-public`, `webkit-public`, `chromium-authed`,
`firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`, `chromium-smoke`.
Referências a nomes que **não existem**:

| Local | Projeto invocado |
|---|---|
| `package.json:96` (`test:e2e`) | `routes-mobile` |
| `package.json:124` (`test:e2e:regression`) | `routes-public`, `routes-authed` |
| `package.json:125` (`…:headed`) | `routes-public`, `routes-authed` |
| `package.json:126` (`…:ui`) | `routes-public`, `routes-authed` |
| `package.json:128` (`test:e2e:mobile`) | `routes-mobile` |
| `package.json:174` (`test:e2e:mobile:flows`) | `routes-mobile` |
| `package.json:209` (`test:e2e:novelties:snapshots`) | `chromium` (existe `chromium-public`/`-authed`/`-smoke`, não `chromium`) |
| `.github/workflows/e2e-flows.yml:248` | `routes-mobile` |

Isto é exatamente a falha que a REGRA #5 do `CLAUDE.md` descreve ("Não criar projetos que
não existem (ex.: `chromium-public`)") — só que invertida: os projetos foram removidos/
renomeados e os invocadores não.

**Skips dinâmicos em e2e — 322 chamadas `test.skip(...)`:**

- **196** no padrão `if (<condição de dados>) test.skip(true, "<motivo>")` — o teste
  desaparece silenciosamente quando o ambiente não tem dados. Motivos mais frequentes:
  `"Catálogo vazio neste ambiente"` (15), `"Card sem trigger de carrinho neste ambiente"` (13),
  `"Botão Trocar ausente"` (9), `"sem dados seedados"` (6), `"Popover do QuickAdd não abriu"` (10),
  `"Tabela de estoque vazia"` (5), `"precisa de 2+ carrinhos"` (5).
  Arquivos mais afetados: `e2e/flows/03b-product-thumb-quickview.spec.ts` (10),
  `e2e/catalog/novidades-reposicao-card-parity.spec.ts` (10),
  `e2e/routes/app/stock-filters-no-text.spec.ts` (8), `e2e/flows/pdf-dialog.spec.ts` (7).
- **9 incondicionais** (`test.skip(true, …)` sem `if`):
  `e2e/optimized-image-visual.spec.ts:52`, `e2e/rbac-navigation.spec.ts:120`,
  `e2e/visual/preview-button.spec.ts:112`, `e2e/flows/03e-quickview-actions-order.spec.ts:44`,
  `e2e/flows/04c7-discount-approval-realtime-status.spec.ts:33`,
  `e2e/flows/mfa-challenge-go-back.spec.ts:76`, `e2e/flows/pdf-dialog.spec.ts:478,521`,
  `e2e/routes/app/stock-filters-no-text.spec.ts:119`.
- Restante: gates por env (`!SUPABASE_ANON_KEY` 7×, `!E2E_USER || !E2E_PASS` 7×).

---

## D) Áreas do sistema sem cobertura de teste identificada

**Método:** listei os 1.931 módulos-fonte de `src/**` (`.ts`/`.tsx`, excluindo `.d.ts`,
`__tests__/`, `__mocks__/` e arquivos de teste) e cruzei com o conjunto de **todos** os
especificadores de import resolvidos em qualquer arquivo de teste (incluindo `vi.mock`).

- Módulos-fonte em `src/`: **1.931**
- Importados por pelo menos um teste: **689 (35,7 %)**
- **Nunca importados por nenhum teste: 1.247 (64,6 %)**

> Ressalva: cobertura por import é limite superior de "existe algum teste que toca o módulo".
> Não mede execução de linha. A cobertura real (thresholds de 60 %/60 %/50 %/60 % em
> `vitest.config.ts:114-119`) é `NAO_VERIFICADO`.

### D.1 Diretórios de `src/components` sem cobertura por import

| Diretório | Sem teste / total |
|---|---|
| `src/components/admin/connections` | **82 / 99** |
| `src/components/ui` | 44 / 61 |
| `src/components/kit-builder` | 31 / 36 |
| `src/components/products` | 30 / 68 |
| `src/components/quotes` | 28 / 42 |
| `src/components/intelligence` | **27 / 27** |
| `src/components/admin/products` | 24 / 25 |
| `src/components/bi` | **22 / 22** |
| `src/components/mockup` | 20 / 29 |
| `src/components/compare` | 20 / 25 |
| `src/components/admin` | 18 / 22 |
| `src/components/simulator/wizard` | **17 / 17** |
| `src/components/common` | 15 / 24 |
| `src/components/collections` | 14 / 15 |
| `src/components/admin/telemetry` | 13 / 14 |
| `src/components/admin/products/sections` | **12 / 12** |
| `src/components/admin/products/image-gallery` | **12 / 12** |
| `src/components/favorites` | **12 / 12** |
| `src/components/admin/security` | **12 / 12** |
| `src/components/magic-up` | 11 / 18 |
| `src/components/search` | 9 / 17 |
| `src/components/admin/products/kit-components` | **9 / 9** |
| `src/components/admin/users` | 9 / 10 |
| `src/components/admin/security/keys` | **8 / 8** |
| `src/components/admin/security/keys/audit` | **8 / 8** |
| `src/components/pricing/simulator` | 8 / 10 |
| `src/components/expert/chat` | **7 / 7** |
| `src/components/admin/badges-manager` | **7 / 7** |

### D.2 Diretórios de `src/hooks` sem cobertura por import

| Diretório | Sem teste / total |
|---|---|
| `src/hooks/products` | 28 / 67 |
| `src/hooks/kit-builder` | 18 / 19 |
| `src/hooks/intelligence` | 18 / 35 |
| `src/hooks/bi` | **14 / 14** |
| `src/hooks/admin` | 12 / 18 |
| `src/hooks/stock` | 9 / 12 |
| `src/hooks/simulation` | 9 / 16 |
| `src/hooks/crm` | **7 / 7** |

### D.3 Outras áreas com zero cobertura por import

- `src/pages/admin` — 34 / 40 sem teste; `src/pages/admin/telemetry` — **13 / 13**
- `src/pages/dev` — **8 / 8**
- `src/pages/__visual` — **8 / 8**
- `src/pages/magazine/components` — 8 / 11
- `src/lib` (raiz) — 13 / 52; `src/lib/external-db` — 7 / 21
- `src/utils` — 12 / 30
- `src/types` — 9 / 18

### D.4 Áreas cobertas por e2e mas por nenhum gate de CI

`e2e/routes/admin/**` (22 specs), `e2e/routes/app/**` (22), `e2e/routes/public/**` (5),
`e2e/routes/quotes/**` (6): 88 specs geradas por `e2e/routes/_factories.ts`, executáveis
apenas por `test:e2e:regression`/`test:e2e:mobile` — que apontam para projetos inexistentes
(§C.7). Isso sobrepõe-se exatamente às áreas de D.1/D.2 com pior cobertura unitária
(`admin/connections`, `bi`, `intelligence`, `admin/security`).

---

## E) Cobertura desta auditoria

### E.1 Inventário auditado

| Alvo do escopo | No disco | Inspecionado | Método |
|---|---:|---:|---|
| `tests/**` (arquivos de teste) | 604 | 604 | parser AST-leve (regex sobre imports/`describe`/`it`/`expect`) em 100 %; leitura integral de 14 arquivos |
| `tests/**` (não-teste: helpers, fixtures, README) | 34 | 6 | leitura dirigida: `tests/setup.ts`, `tests/setup-ref-warning-capture.ts` (existência), `tests/p0/_mocks.ts`, `tests/hooks/_helpers/smoke-template.ts`, `tests/edge-functions/live/_live-client.ts`, `tests/edge-functions/live/_live-suite.ts` |
| `e2e/**` (`*.spec.ts`) | 555 | 555 | parser em 100 %; leitura integral de 3 (`e2e/routes/app/dashboard.spec.ts`, trechos de `_factories.ts`, `magazine-templates-gallery-visual.spec.ts`) |
| `e2e/**` (não-spec: fixtures, helpers, scripts) | 85 | 4 | listagem + resolução de imports |
| `src/**/*.{test,spec}.{ts,tsx}` (co-localizados) | 569 | 569 | parser em 100 %; leitura integral de 4 |
| `src/tests/**` | 33 | 33 | parser; leitura integral de `src/tests/contracts/supabase-config.test.ts` |
| `src/test/**` | 3 | 3 | listagem — confirmado que são helpers, não testes |
| `scripts/__tests__/**` | 6 | 6 | parser + cruzamento com `include` |
| `vitest.config.ts` | 1 | 1 | leitura integral (140 linhas) |
| `playwright.config.ts` | 1 | 1 | leitura integral (140 linhas) |
| `qa/**` | 13 raiz + 6 subdirs | listagem completa + 1 arquivo | confirmado: nenhum código de teste executável |
| `package.json` (scripts) | 1 | 1 | extração de todos os 100+ scripts com `test`/`e2e`/`vitest`/`playwright` |
| `.github/workflows/**` | 107 | 107 | grep de comandos de runner + `--project=` em 100 %; leitura integral de 4 (`ci.yml`, `playwright.yml`, `quality-gate.yml`, `edge-integration-all.yml`) e parcial de 6 |
| **Fora do escopo, inspecionado por causa dos órfãos** | `supabase/functions/**/*.test.ts` (28) | listagem + contagem de `Deno.test(` | cruzamento com `deno test` nos workflows |

### E.2 Comandos que produziram os números

```bash
# censo de arquivos/linhas/declarações (Python, os.walk + regex)
#   arquivo de teste  = \.(test|spec)\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$
#   it/test           = ^\s*(it|test)(\.\w+(\([^)]*\))?)?\s*(\.each\([^)]*\))?\s*\(
#   describe          = ^\s*describe(\.\w+)?\s*\(
#   test.describe     = grep -rc "test\.describe(" e2e --include="*.spec.ts"
#   Deno.test         = grep -rc "Deno.test(" supabase/functions --include="*.test.ts"

# imports de cada teste (import / import() / require / vi.mock) + resolução em disco
#   extensões testadas: '' .ts .tsx .d.ts .js .jsx .mjs .cjs .mts .json /index.ts /index.tsx /index.js

# órfãos: simulação dos include/exclude de vitest.config.ts:40-70
#         + testDir/testMatch de playwright.config.ts:9,16

# desativados
grep -rn "describe\.skip"                       tests src e2e --include="*.ts" --include="*.tsx"
grep -rn "^\s*\(it\|test\)\.skip\s*(\s*[\`'\"]" tests src e2e --include="*.ts" --include="*.tsx"
grep -rn "\b\(describe\|it\|test\)\.only\s*("   tests src e2e   # → 0
grep -rn "\bx\(it\|describe\|test\)\s*("        tests src e2e   # → 0
grep -rn "\.fixme\s*("                          tests src e2e   # → 8

# vacuidade
grep -rn "expect(true)\.toBe(true)"             tests src e2e   # → 45
grep -rn "\.toBeDefined()"                      tests src e2e   # → 255
grep -rn "toBeGreaterThanOrEqual(0)"            tests src e2e   # → 94
grep -rn "catch(() => false)"                   e2e             # → 274

# grep-no-fonte
grep -rn "readFileSync("  tests src scripts/__tests__ --include="*.test.*"   # → 141 em 72 arquivos

# snapshots
find . -path ./node_modules -prune -o -name "*.snap" -print              # → 8
find . -path ./node_modules -prune -o -name "*-snapshots" -type d -print # → 5
grep -rl "toHaveScreenshot\|toMatchSnapshot" e2e --include="*.spec.ts"   # → 85

# runners no CI
grep -rhoE "(npx )?(playwright test|vitest run)[^\"']*" .github/workflows/
grep -rhoE "\-\-project[= ][a-zA-Z0-9_-]+"              .github/workflows/ package.json
```

### E.3 O que ficou de fora (declaração explícita)

1. **Execução.** Nada foi rodado. Todo resultado de execução — verde/vermelho, contagem de
   falhas, flakiness, tempo, cobertura efetiva de linha — é **`NAO_VERIFICADO`**.
   Em particular, não afirmo que os imports quebrados de §C.5(a) *causem* falha hoje,
   apenas que os caminhos não resolvem no disco.
2. **Cobertura de linha/branch.** Os thresholds em `vitest.config.ts:114-119`
   (60/60/50/60) existem, mas `all: false` (`:103`) significa que só arquivos tocados por
   teste entram no denominador. O número real é **`NAO_VERIFICADO`**.
3. **Semântica das 14.911 asserções.** Auditei padrões de vacuidade por regex e li ~30
   arquivos integralmente. Não julguei caso a caso os 255 `.toBeDefined()` nem os 94
   `.toBeGreaterThanOrEqual(0)`.
4. **Qualidade dos 103 descritores `tests/edge-functions/live/*`.** Verifiquei o harness
   (`_live-suite.ts`, `_live-client.ts`, `_authz.ts`) e o mecanismo de skip; não auditei
   descritor a descritor.
5. **`supabase/functions/**` (testes Deno).** Fora do escopo declarado. Incluídos apenas em
   §C.4 porque são órfãos dos runners auditados. Não avaliei sua qualidade interna.
6. **`scripts/**` fora de `scripts/__tests__/`** (gates `.mjs` chamados por workflows como
   `validate-supabase-config.mjs`, `check-invoke-direct-calls.mjs`): não são arquivos de
   teste e não estavam no escopo.
7. **Conteúdo dos 27 PNG e dos 8 `.snap`.** Verifiquei existência e correspondência
   arquivo↔teste, não o conteúdo.
8. **`.a11y/`, `.security/`, `artifacts/`, `visual-diff-report/`, `audit/`** — diretórios de
   saída, não de teste; não auditados.
9. **Histórico Git.** Não usei `git log`/`git blame` para datar as regressões apontadas.
