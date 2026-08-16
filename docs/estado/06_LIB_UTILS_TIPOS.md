# 06 — LIB / UTILS / TIPOS — Auditoria de estado (somente leitura)

**Escopo:** `src/lib/`, `src/integrations/`, `src/utils/`, `src/types/`, `src/data/`, `src/logic/`, `src/config/`, `src/constants/`
**Método:** medição direta no código (grep/find/leitura). Nenhum `.md`, README ou STATUS foi usado como fonte.
**Data da medição:** 2026-08-16 · Commit da árvore de trabalho no momento da leitura.

## Contagem real do escopo (medida, não declarada)

| Métrica | Valor | Comando |
|---|---|---|
| Arquivos `.ts`/`.tsx` totais no escopo | **404** | `find … -name '*.ts*' \| wc -l` |
| Arquivos de produção (sem `*.test.*`, `*.spec.*`, `__tests__/`) | **284** | idem + `grep -v` |
| Arquivos de teste | **120** | 404 − 284 |
| Linhas de produção | **53.593** | `xargs wc -l` |

O briefing indicava "402 arquivos / ~71.000 linhas". A medição encontra **404 arquivos** e **53.593 linhas de produção**
(71k só é atingido somando os 120 arquivos de teste). Diferença registrada, não corrigida.

Linhas por diretório (inclui testes):

| Diretório | Arquivos | Linhas |
|---|---|---|
| `src/lib/` | 301 | 47.060 |
| `src/integrations/` | 11 | 9.440 |
| `src/utils/` | 54 | 7.704 |
| `src/types/` | 29 | 4.313 |
| `src/data/` | 3 | 1.755 |
| `src/logic/` | 4 | 803 |
| `src/constants/` | 1 | 51 |
| `src/config/` | 1 | 29 |

**Legenda:** ✅ IMPLEMENTADO_TOTAL · 🟨 IMPLEMENTADO_PARCIAL · 🟦 SUGERIDO_OU_INICIADO · ⬛ MORTO_OU_ABANDONADO

---

## A) Tabela por CAPACIDADE TRANSVERSAL

### A.1 — Cliente Supabase e guardas de configuração (SSOT)

| Módulo (arquivo:linha) | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/integrations/supabase/client.ts:21` (`CURRENT_PROJECT_ID`), `:38` (`validateEnv`), `:73` (chamada) | 273 arquivos de produção + 40 de teste. Ex.: `src/components/ai/AIChat.tsx:16` | ✅ | Guarda executa no módulo top-level (`:73`) e o fallback é aplicado em `:75`/`:78` | Nada. Ver §B(a) |
| `src/integrations/supabase/runtime-validator.ts:10` (`validateSupabaseConfig`) | 1 — `src/main.tsx:9` (import) e `src/main.tsx:17` (chamada) | ✅ | Lança `Error` em `PROD` (`runtime-validator.ts:26-28`) | — |
| `src/integrations/supabase/lazy-client.ts:7` (`getSupabaseClient`) | 20. Ex.: `src/stores/useBadgeVisibilityStore.ts:3`, `src/components/providers/AppBootstrap.tsx:2` | ✅ | Import dinâmico do mesmo `client.ts` (`lazy-client.ts:8`) | — |
| `src/lib/supabase-untyped.ts` (`untypedFrom`) | 53 | ✅ | `src/components/admin/suppliers-manager/useSuppliersManager.ts:2` | Comentário `:19-22` prevê migração para `supabase.from()` que não ocorreu |
| `src/integrations/supabase/gold.ts:44` (`goldFrom`) | 2 — `src/components/admin/connections/LastSyncRunPanel.tsx:17`, `src/hooks/admin/useMedallionHealth.ts` | 🟨 | Caminho tipado Gold criado, mas 53 call-sites continuam em `untypedFrom` | Adoção: 2 de ~55 |
| `src/integrations/supabase/gold-relations.ts` | 5. Ex.: `src/hooks/stock/stockFetcher.ts:5` | ✅ | — | — |
| `src/lib/supabase-direct.ts:19` (`resolveTable`) | 3. Ex.: `src/hooks/products/novelty-core.ts:10` | 🟨 | `TABLE_ALIASES` (`:4-17`) duplica `BRIDGE_ALIASES` de `src/lib/db/postgrest.ts:53-59` | Dois mapas de alias independentes que precisam ser mantidos em sincronia manual |
| `src/lib/env/supabase-placeholder.ts:1` | 5. `src/components/providers/AppBootstrap.tsx:4` | ✅ | — | — |
| `src/lib/supabase/rest-client.ts` (`headRequestWithFallback`, `getSupabaseQueryConfig`) | **0** | ⬛ | Nenhuma ocorrência dos símbolos fora do arquivo | Provar ausência: ver §C |
| `src/lib/supabase/rls-validator.ts` (`validateRLSPolicies`, `canAccessTable`) | **0** | ⬛ | idem | idem |

### A.2 — Tipagem do schema Supabase

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/integrations/supabase/types.ts:9` (`Database`) | 134 prod + 3 teste. Ex.: `src/stores/useBadgeVisibilityStore.ts:4` | 🟨 | 7 `export type`; 153 tabelas em `Tables` (`:16`–`:7109`); Views em `:7109`; Functions em `:7307` | **5 das 8 tabelas exigidas estão ausentes** — ver §B(b) |
| `src/integrations/supabase/magazine-schema.ts:1-27` | 2 — `src/services/magazineService.ts:27,28` (+ 40 usos de `magazineDb` no mesmo arquivo) | ✅ | Workaround explícito porque `types.ts` perdeu `magazine_*` (`magazine-schema.ts:4-11`) | Existe porque `types.ts` está incompleto; é remendo, não solução |
| `src/integrations/supabase/rpc-overrides.ts` (`asTypedRPC`) | **0** | ⬛ | `grep -rn "asTypedRPC" src` → 0 fora do arquivo | — |
| `src/types/product-catalog.ts:25` (`Product`) | 57 prod + 11 teste. Ex.: `src/types/magazine.ts:10` | ✅ | Todos os campos críticos presentes — §B(c) | — |
| `src/types/product.ts:4` (`Product` DB-oriented) | 2, ambos internos a `src/types/` | 🟨 | `src/types/simulation.ts:20` re-exporta só `ProductColor`; `src/types/index.ts:15` é barrel morto | A interface `Product` de 56 campos não tem nenhum consumidor; só `ProductColor` sobrevive |
| `src/types/index.ts` (barrel SSOT declarado em `:2`) | **0** | ⬛ | `grep "from '@/types'"` → 0 resultados | Arrasta `types/mockup.ts`, `types/infrastructure/*` para morte por cadeia |

### A.3 — Acesso a dados (PostgREST / bridge / RPC)

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/db/postgrest.ts` (605 l., `dbInvoke`) | 78 prod + 4 teste. Ex.: `src/components/admin/suppliers-manager/useSuppliersManager.ts:1` | ✅ | Caminho corrente declarado em `postgrest.ts:1-3` | — |
| `src/lib/external-db/index.ts` (barrel) | 13 diretos. Ex.: `src/components/admin/products/useProductsManager.ts:21` | 🟨 | O próprio barrel documenta em `:17-31` que a edge function foi desativada | Módulo em desmonte; o barrel avisa "não importar para novos recursos" |
| `src/lib/external-db/bridge.ts` (329 l.) | 5 (via barrel) | 🟨 | `external-db/index.ts:33-37`: chamadas interceptadas pelo kill-switch | Código de invocação de edge function desativada, mantido vivo |
| `src/lib/external-db/rest-native.ts` (808 l.) | 3. `src/hooks/intelligence/useExternalDatabase.ts:18`, `src/lib/external-db/bridge.ts:20` | 🟨 | Whitelist de tabelas em `rest-native.ts:28+` | Duplica responsabilidade de `db/postgrest.ts` |
| `src/lib/external-db/rpc-native.ts` (284 l., 12 exports) | **0** | ⬛ | Não é exportado por `external-db/index.ts`; `grep dispatchRpc/getCustomizationPrice` → 0 | Ver §C e §E |
| `src/lib/external-rpc.ts` | 14. Ex.: `src/components/simulator/wizard/QuantityRangeComparison.tsx:14` | ✅ | — | — |
| `src/lib/external-db/tables.ts` | 1 — `src/lib/external-db/index.ts:112` | 🟨 | O próprio arquivo diz em `:4-13` que as whitelists migraram para `rest-native.ts` | Casca vazia mantida no barrel |
| `src/lib/crm-db.ts` (736 l.) | 26. Ex.: `src/components/admin/suppliers-manager/useSuppliersManager.ts:5` | ✅ | — | — |
| `src/lib/db-retry.ts` | 2. `src/hooks/intelligence/useStockVelocityPrefetch.ts:14` | ✅ | — | — |
| `src/lib/external-db/kill-switch-client.ts` | 4. `src/hooks/intelligence/useExternalDatabase.ts:22` | ✅ | — | — |
| `src/lib/external-db/silent-empty-report.ts` | 9. Ex.: `src/hooks/products/useVariantSupplierSources.ts:70` | ✅ | — | — |

### A.4 — Formatação, moeda e locale

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/format.ts:22` (`formatCurrency`), `:44` (`round2`) | 38. Ex.: `src/components/bi/ClientSeasonalityHeatmap.tsx:23` | 🟨 | É o mais adotado dos três | **20+ reimplementações locais de `formatCurrency`** em componentes: `src/components/intelligence/TopClients.tsx:17`, `src/components/pricing/simulator/utils.ts:3`, `src/components/cart/CartUtilComponents.tsx:23`, `src/components/engraving/PricingPanel.tsx:111`, entre outros |
| `src/utils/currency.ts:38` (`formatBRL`) | 1 — `src/components/quotes/QuoteKanbanBoard.tsx:46` | 🟨 | Duplica `Intl.NumberFormat('pt-BR', BRL)` de `lib/format.ts:5-11` | Módulo criado como "centralização" (`currency.ts:3-5`) mas nunca adotado |
| `src/lib/format-utils.ts:11` | 1 prod — `src/components/intelligence/MarketIntelligenceChart.tsx:35` | ✅ | Escopo restrito a tooltips | — |
| `src/lib/date-utils.ts` | 1 — `src/utils/excelExport.ts:3` | ✅ | — | — |
| `src/lib/textUtils.ts` | 5. `src/components/catalog/CatalogActiveFilters.tsx:11` | ✅ | — | — |
| `src/utils/masks.ts` | 24. `src/components/admin/suppliers-manager/useSuppliersManager.ts:8` | ✅ | — | — |
| `src/utils/pixMask.ts` | 4 | ✅ | — | — |
| `src/lib/masked-suffix.ts` | 6 | ✅ | — | — |
| `src/lib/sensitive-masking.ts` | 7 | ✅ | — | — |

**`round2` tem 6 definições independentes** (evidência): `src/lib/format.ts:44`, `src/logic/quotes/calculations.ts:15`, `src/hooks/quotes/quoteHelpers.ts:17`, `src/components/ui/currency-input.tsx:22`, `src/components/quotes/QuoteItemsTable.tsx:26`, `src/services/orderService.ts:33`. Apenas 2 têm importadores (`quoteHelpers` em `src/components/quotes/QuoteBuilderSummaryColumn.tsx:102` e `src/hooks/quotes/quoteMarkup.ts:16`). `src/services/orderService.ts:33` usa fórmula **diferente** (`Math.round(value*100)/100`, sem `Number.EPSILON`).

### A.5 — Validação (Zod) e dados fiscais

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/validations/index.ts` | 2 — `src/hooks/quotes/useQuoteBuilderState.ts:26` | ✅ | Barrel de `authSchema`, `profileSchema`, `quoteSchema`, `goalSchema` | — |
| `src/lib/validations/quoteSchema.ts` | 2 (via barrel) | ✅ | `src/lib/validations/index.ts:17` | — |
| `src/lib/validations/authSchema.ts` / `profileSchema.ts` / `goalSchema.ts` | 2 cada (só via barrel) | ✅ | `index.ts:1`, `:9`, `:20` | — |
| `src/utils/cnpj-schema.ts`, `cnpj-errors.ts`, `cnpj-lookup.ts`, `viacep.ts` | 2–3 cada, todos convergindo em `src/components/admin/suppliers-manager/useSuppliersManager.ts:9-12` | ✅ | — | Uso concentrado num único componente |
| `src/lib/security/validation.ts` | 1 — `src/components/ui/chart.tsx:5` | ✅ | — | — |
| `src/lib/security/file-validation.ts` | 1 — `src/components/admin/ImageUploadButton.tsx:7` | ✅ | — | — |
| `src/lib/personalization/rpc-validator.ts` | 4. `src/hooks/simulation/useCustomizationPrice.ts:10` | ✅ | — | — |
| `src/lib/carts/shipping-deadline.ts:20` (`shippingDeadlineSchema`) | 3. `src/hooks/products/useSellerCarts.ts:797` | ✅ | — | — |

### A.6 — Cálculo de preço, desconto, frete e volume

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/logic/quotes/calculations.ts` (82 l.) | 3 (2 são testes próprios). Consumidor prod: ver `src/hooks/quotes/` | ✅ | `applyMarkup` em `:47` | Markup limitado a **50% hardcoded** (`:48`) — §B(f) |
| `src/lib/personalization/calculators.ts:22` (`calculatePrice`) | 2 via `src/lib/personalization/index.ts:9` | ✅ | Faixas em `:92`, ajuste por cor em `:116`, por área em `:136` | Fatores proporcionais são fórmulas fixas, sem tabela de configuração |
| `src/lib/personalization/services/pricing.service.ts` (341 l.) | 2 via `src/lib/personalization/index.ts:28` | ✅ | — | — |
| `src/lib/kit-builder/price-calculator.ts` | 1 — `src/lib/kit-builder/index.ts:41` (barrel com 48 consumidores) | ✅ | `calculateTotalKitPrice` em `:56` | — |
| `src/lib/kit-builder/volume-calculator.ts` | 1 — `src/lib/kit-builder/index.ts:29` | ✅ | — | Constantes fixas: `PACKING_EFFICIENCY = 0.75` (`:13`), `VOLUME_WARNING_THRESHOLD = 0.85` (`:16`), fallback `* 0.5` (`:257`) |
| `src/lib/quotes/discount-validation-messages.ts` (186 l.) | ver tabela D | ✅ | — | — |
| `src/lib/carts/shipping-deadline.ts:12` (`SOON_THRESHOLD_DAYS = 3`) | 3 | ✅ | — | Limiar hardcoded |
| `src/lib/trending-score.ts:29` | 3. `src/components/intelligence/TopCategoriesCard.tsx:12` | ✅ | — | `totalVolume / 5` e `score 2.0` hardcoded (`:44-47`) |
| `src/lib/forecast.ts` | 2. `src/components/bi/ClientSeasonalityHeatmap.tsx:30` | ✅ | — | — |
| `src/lib/inventory/health-score.ts` | 3. `src/components/inventory/HealthScoreInfoDialog.tsx:16` | ✅ | — | Faixas `>= 80` / `>= 50` hardcoded (`:51-52`) |
| `src/lib/inventory/rupture-risk.ts:22` | 3. `src/components/inventory/StockFilterToolbar.tsx:22` | ✅ | `DEFAULT_RUPTURE_HORIZON = 3` | — |
| `src/lib/catalog-stock-status.ts:27` | 16. `src/components/replenishments/ReplenishmentCards.tsx:20` | ✅ | `CATALOG_LOW_STOCK_THRESHOLD = 10` | — |
| `src/lib/products/stock-status.ts` | 2 prod + 3 teste | ✅ | — | Coexiste com `catalog-stock-status.ts` (16 consumidores) — dois status de estoque |
| `src/lib/products/novelty-days.ts:9` | 2. `src/components/products/ProductStatusBadge.tsx:9` | ✅ | `NOVELTY_WINDOW_DAYS = 30` | — |
| `src/lib/payments/order-payment-simulator.ts` | **0** prod (1 teste) | ⬛ | Só `src/lib/payments/__tests__/order-payment-simulator.test.ts:2` | — |

### A.7 — Geração de PDF / Excel / PPTX

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/bi/pptxGenerator.ts` (951 l.) | 2. `src/components/bi/ExecutiveSummaryButton.tsx:26` | ✅ | — | — |
| `src/lib/bi/dossierPdfGenerator.ts` (597 l.) | 2. `src/hooks/bi/useBIDossierExport.ts:16` | ✅ | — | — |
| `src/utils/proposalPdfReactGenerator.ts` | 4. `src/components/quotes/PdfGenerationDialog.tsx:30` | ✅ | — | — |
| `src/utils/productPdfExport.ts` | 1. `src/pages/admin/AdminProductFormPage.tsx:607` | ✅ | — | — |
| `src/utils/excelExport.ts` | 1. `src/pages/quotes/QuotesListPage.tsx:323` | ✅ | — | — |
| `src/utils/personalizationExport.ts` | 1. `src/components/products/ProductPersonalizationRules.tsx:32` | ✅ | — | — |
| `src/lib/export-collection-pdf.ts` | 1. `src/components/catalog/useCatalogSelection.ts:183` | ✅ | — | — |
| `src/lib/quotes/exportDiscountAuditPdf.ts` | 1. `src/components/admin/DiscountApprovalAuditTrail.tsx:25` | ✅ | — | — |
| `src/lib/pdf/totalsColorScheme.ts` | 2. `src/components/pdf/ProposalSections.tsx:17` | ✅ | — | — |
| `src/lib/trends-export.ts` | 2. `src/components/admin/connections/ExportButton.tsx:10` | ✅ | — | — |
| `src/lib/pdf/whitelabel-comparison.ts` (123 l., `exportWhitelabelComparisonPDF`) | **0** | ⬛ | `grep exportWhitelabelComparisonPDF src` → 0 | — |
| `src/types/jspdf-autotable.d.ts` | 0 imports (ambient) | 🟦 | Declaração de tipos ambiente — consumo implícito pelo compilador | Não verificável por grep |

### A.8 — Telemetria, log e observabilidade

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/logger.ts` | **269** prod + 20 teste. Ex.: `src/stores/useFavoritesStore.ts:2` | ✅ | Logger dominante do app | — |
| `src/lib/telemetry/structuredLogger.ts` | 30. Ex.: `src/components/admin/security/keys/useMcpKeys.ts:14`, `src/integrations/supabase/client.ts:4` | ✅ | Logger estruturado paralelo | Dois loggers coexistem (269 vs 30) |
| `src/lib/telemetry/requestId.ts` | 12 | ✅ | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx:39` | — |
| `src/lib/telemetry/bridgeCallMetrics.ts` | 7. `src/hooks/dev/useBridgeMetrics.ts:7` | ✅ | — | — |
| `src/lib/telemetry/navigationMetrics.ts` | 2. `src/main.tsx:7`, `src/components/common/RouteScrollReset.tsx:4` | ✅ | — | — |
| `src/lib/sentry.ts` | 4. `src/main.tsx:6` | ✅ | — | — |
| `src/lib/error-reporter.ts` | 3. `src/main.tsx:5` | ✅ | — | — |
| `src/lib/telemetry/longTaskWatchdog.ts` (184 l., 7 exports) | **0** | ⬛ | `grep startLongTaskWatchdog src` → 0 | — |
| `src/lib/telemetry/bridgeAlertThresholds.ts` (202 l., 9 exports) | **0** | ⬛ | `grep evaluateAlerts\|getThresholds src` → 0 | — |
| `src/lib/analytics/intelligenceAnalytics.ts` | 1 prod + 3 teste | ✅ | `src/components/intelligence/ZeroResultDiagnosisCallout.tsx:11` | — |
| `src/utils/security-audit.ts` (`checkSecurityDefinerAccess`) | **0** | ⬛ | — | — |
| `src/lib/auth/auth-audit.ts` (`runAuthAudit`) | **0** | ⬛ | — | — |
| `src/lib/auth/token-audit.ts` (`stripTokens`, `auditErrorMessage`, `safeErrorMessage`) | **0** | ⬛ | — | — |

### A.9 — Cache e configuração de query

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/query-config.ts:14` (`CACHE_TIMES`), `:41` (`GC_TIMES`) | 5. `src/hooks/tecnicas/useTabelasPreco.ts:8` | ✅ | Tiers documentados e travados por teste (`:6-8`) | Só 5 consumidores para uma política global de cache |
| `src/lib/external-db/immutableCache.ts` (219 l.) | 1 — `src/lib/external-db/products-detail.ts:7` | ✅ | — | — |
| `src/config/skeleton.config.ts:5` (`SKELETON_THRESHOLDS`) | 1 — `src/components/loading/SkeletonMonitor.tsx:5` | ✅ | — | — |
| `src/lib/routePrefetch.ts` | 2. `src/components/layout/sidebar/SidebarNavGroup.tsx:10` | ✅ | — | — |
| `src/lib/external-db-prewarm.ts` | 2. `src/contexts/AuthContext.tsx:210` | ✅ | — | — |

### A.10 — Segurança, sanitização e RBAC

| Módulo | Consumidores | Classificação | Evidência | O que falta |
|---|---|---|---|---|
| `src/lib/security/sanitize-error.ts` | 49. `src/components/catalog/useCatalogSelection.ts:8` | ✅ | — | — |
| `src/lib/security/sanitize-message.ts` | 6. `src/components/search/VisualSearchButton.tsx:15` | ✅ | — | — |
| `src/lib/security/sanitize.ts` | 1 — `src/lib/security/magazine-guard.ts:13` | ✅ | Uso interno único | — |
| `src/lib/security/safeToast.ts` | 2. `src/main.tsx:8` (instalado em `:21`) | ✅ | — | — |
| `src/lib/security/magazine-guard.ts` | 2. `src/services/magazineService.ts:24` | ✅ | — | — |
| `src/lib/security/rls-denial-logger.ts` | 1. `src/hooks/quotes/useDiscountApproval.ts:9` | ✅ | — | — |
| `src/lib/security/lastInternalRoute.ts`, `mfaChallengeDismissal.ts` | 4 e 3. `src/components/layout/AdminRoute.tsx:8-9` | ✅ | — | — |
| `src/lib/access/*` (6 arquivos) | 1–2 cada, convergindo em `src/components/access/DevAccessDeniedPage.tsx` e `src/components/layout/DevRoute.tsx:6` | ✅ | — | — |
| `src/lib/roles.ts` | 2. `src/components/RoleBadge.tsx:7`, `src/components/admin/users/types.tsx:7` | ✅ | — | — |
| `src/lib/rbac/route-matrix.ts` (478 l., `RBAC_ROUTES`) | **1** — `src/pages/admin/AdminRbacRoutesPage.tsx:21` | 🟨 | Declarado "SSOT auditável" em `:1-4`, mas é lido só por uma página de visualização | **Nenhum enforcement em runtime**: os guards reais (`AdminRoute`, `DevRoute`, `ProtectedRoute`) não consultam esta matriz. Divergência entre matriz e roteador é silenciosa |
| `src/lib/mcp/scopes.ts` | 5. `src/components/admin/connections/McpTab.tsx:23` | ✅ | — | — |
| `src/lib/auth/apply-seller-scope.ts` (`applySellerScope`) | **0** | ⬛ | Só citado em comentários: `src/hooks/intelligence/useCommercialIntelligence.ts:227` ("REMOVIDO"), `src/hooks/intelligence/useSalesHistory.ts:83,92` (`rls-allow:`) | Escopo de vendedor foi removido do código mas o módulo ficou |

### A.11 — Autenticação (subsistema `src/lib/auth/`, 19 arquivos)

| Módulo | Consumidores | Classificação | Evidência |
|---|---|---|---|
| `src/lib/auth/safeAuthCall.ts` (329 l.) | 3 prod + 7 teste. `src/services/authService.ts:3` | ✅ | — |
| `src/lib/auth/oauth-error-explainer.ts` / `oauth-error-messages.ts` / `oauth-pending.ts` | 1–2 cada. `src/pages/auth/SSOCallbackPage.tsx:14`, `src/components/auth/SocialLoginButtons.tsx:6-7` | ✅ | — |
| `src/lib/auth/session-recovery.ts`, `post-login-redirect.ts`, `resolve-redirect-target.ts`, `rate-limit.ts`, `step-up-error.ts`, `invoke-full-scope.ts`, `auth-debug.ts`, `auth-flow-tracer.ts`, `visibility-scope.ts`, `auth-utils.ts`, `is-duplicate-account-error.ts` | 1–6 cada | ✅ | Ver §D |
| `src/lib/auth/safeMfaCall.ts` | **0** prod (1 teste de fuzz com 150+ cenários) | ⬛ | `src/lib/auth/__tests__/safeMfaCall.fuzz.test.ts:5` é o único importador |
| `src/lib/auth/auth-audit.ts`, `token-audit.ts`, `apply-seller-scope.ts` | **0** | ⬛ | §C |

### A.12 — Feature toggles

Ver §B(e). Resumo: `src/lib/feature-flags.ts` — 🟨.

### A.13 — Dados estáticos / seed

Ver §B(d). Resumo: 3 arquivos em `src/data/`, todos com consumidor — 2 alimentam telas de produção, 1 é catálogo de referência.

### A.14 — Utilitários de imagem, cor e catálogo

| Módulo | Consumidores | Classificação | Evidência |
|---|---|---|---|
| `src/utils/image-utils.ts` (397 l.) | 46. `src/components/catalog/BulkVariantWizard.tsx:28` | ✅ | — |
| `src/utils/imageProxy.ts` | 28. `src/components/admin/products/image-gallery/ImageGrid.tsx:23` | ✅ | — |
| `src/utils/colorSorting.ts` (407 l.) | 4. `src/components/products/ProductQuickView.tsx:38` | ✅ | — |
| `src/utils/color-image-resolver.ts` | 10. `src/components/catalog/CatalogContent.tsx:2` | ✅ | — |
| `src/utils/color-matching.ts` | 1. `src/hooks/simulation/useLogoColorAnalysis.ts:9` | ✅ | — |
| `src/utils/product-mapper.ts` (280 l.) | 3. `src/hooks/products/useProducts.ts:10` | ✅ | — |
| `src/utils/product-search.ts`, `product-sorting.ts`, `product-colors.ts`, `color-group-hex.ts`, `color-variant-carousel.ts` | 2–9 cada | ✅ | Ver §D |
| `src/lib/print-area-grouping.ts` (316 l., 12 exports) | **0** | ⬛ | `grep groupPrintAreasByComponent src` → 0. Existe um `flattenTechniques` **local** e independente em `src/components/kit-builder/PersonalizationConfig.tsx:67` |
| `src/lib/fetch-print-areas.ts` | 4. `src/hooks/simulation/useGravacaoPriceV2.ts:178` | ✅ | Este é o caminho vivo de print areas |

### A.15 — Tema e UI de base

| Módulo | Consumidores | Classificação | Evidência |
|---|---|---|---|
| `src/lib/utils.ts` (6 l., `cn`) | **610** prod + 4 teste | ✅ | Módulo mais consumido do repo |
| `src/lib/theme-presets.ts` (1106 l.) | 5. `src/components/ThemeInitializer.tsx:9`, `src/hooks/common/useAppBootstrap.ts:8`, `src/pages/admin/AdminTemasPage.tsx:16` | ✅ | — |
| `src/lib/theme-presets-css-vars-patch.ts` (`BUG_04_PATCH`, `validateBug04Patch`) | **0** | ⬛ | — |
| `src/lib/design-policy.ts` (`NO_ORANGE_GLOW_POLICY`) | **0** | ⬛ | Só referenciado como *string* em `src/components/layout/sidebar/__tests__/SidebarMobileRegression.test.ts:31` |
| `src/lib/lazyWithRetry.ts` | 15. `src/components/catalog/CatalogToolbar.tsx:21` | ✅ | — |
| `src/lib/dom/scroll-lock.ts` | 5. `src/components/quotes/QuoteBuilderSummaryColumn.tsx:98` | ✅ | — |
| `src/utils/undoToast.tsx` | 16. `src/components/quotes/QuoteBuilderSummaryColumn.tsx:97` | ✅ | — |
| `src/lib/console-filter.ts` | 1 — `src/main.tsx:1` (import side-effect, sem símbolo) | ✅ | Consumo só detectável por import de efeito colateral |

---
