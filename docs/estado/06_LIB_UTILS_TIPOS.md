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

## Resumo da medição

| Classificação | Arquivos | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 245 | 86,3% |
| 🟨 IMPLEMENTADO_PARCIAL | 10 | 3,5% |
| 🟦 SUGERIDO_OU_INICIADO | 4 | 1,4% |
| ⬛ MORTO_OU_ABANDONADO | 25 | 8,8% |
| **Total** | **284** | 100% |

Distribuição de consumidores: 28 módulos com 0 importadores · 70 com exatamente 1 · 142 com 2–7 · 44 com ≥8.

**Cinco achados de maior peso:**

1. **`types.ts` perdeu 5 das 8 tabelas exigidas** — `personalization_techniques`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates` têm **0 ocorrências** no arquivo. O módulo Magazine inteiro roda sobre um schema declarado à mão em `src/integrations/supabase/magazine-schema.ts` (§B(b)).
2. **10 das 13 feature flags nunca são lidas** em runtime; `setFeatureFlag`/`getAllFlags`/`getFlagRegistry` têm 0 consumidores — não existe painel de flags (§B(e)).
3. **~1.980 linhas mortas** em 24 módulos com 0 importadores, confirmadas por dupla verificação (§C).
4. **12 refactors abandonados** com o módulo antigo ainda em produção — incluindo `untypedFrom` (53 usos) vs `goldFrom` (2), e `formatCurrency` centralizado com 20+ reimplementações locais (§E).
5. **`route-matrix.ts` é declarada SSOT de RBAC mas não tem enforcement** — 478 linhas lidas apenas por uma página de visualização; os guards reais nunca a consultam (§A.10).

**Sem achados nestes pontos:** guardas do `client.ts` estão todas ativas (§B(a)); todos os 5 campos críticos do `Product` estão presentes (§B(c)); nenhum `Math.random()` em lógica de preço ou estoque (§B(f)).

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

## B) Itens obrigatórios de verificação

### B(a) — `src/integrations/supabase/client.ts`: guardas de configuração

**Arquivo NÃO foi modificado.** Leitura apenas.

| # | Guarda | Linha | O que valida | Ativa em runtime? | Evidência de execução |
|---|---|---|---|---|---|
| 1 | `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"` | `:21` | Constante SSOT do projeto canônico | n/a (constante) | Usada em `:22`, `:45`, `:85`, `:98`, `:132`, `:181`, `:185` |
| 2 | `CANONICAL_URL` / `CANONICAL_ANON_KEY` | `:22`, `:23-24` | Fallback embutido (URL + anon key hardcoded) | n/a | Consumidos em `:75`, `:78` |
| 3 | `validateEnv()` | `:38-71` | Rejeita `VITE_SUPABASE_URL` que não contenha `doufsxqlfjyuvxuezpln`, exceto `localhost`/`127.0.0.1` (`:43`) e `placeholder` (`:44`). Emite `log.warn('missing_env_url')` quando não há env (`:40`) e `log.warn('config_inconsistency')` quando aponta para projeto externo (`:54-59`) | **SIM** — chamada top-level em `:73` (`const envUrlIsValid = validateEnv();`), executa no import do módulo | `:73` |
| 4 | Dedup de warning | `:36`, `:51-53` | `Set` que emite no máximo 1 warn por par `(envUrl, expected)` por sessão | SIM (dentro de `validateEnv`) | `:52` |
| 5 | Fallback de URL | `:75` | `SUPABASE_URL = envUrlIsValid ? (envUrl \|\| CANONICAL_URL) : CANONICAL_URL` | **SIM** — avaliado no top-level | `:75` |
| 6 | Fallback de KEY | `:78` | Descarta a env key junto com a URL rejeitada (evita 401 "Invalid API key") | **SIM** | `:78` |
| 7 | Log de init | `:81-86` | Emite `project_id` e `is_canonical` | SIM | `:81` |
| 8 | `window.__SUPABASE_CLIENT_DEBUG__` | `:94-100` | Expõe `url`/`projectId`/`isCanonical` para testes E2E | SIM (quando `window` existe) | `:94` |
| 9 | Interceptor de fetch 401 | `:125-168` | Detecta `UNAUTHORIZED_LEGACY_JWT` / `Invalid JWT` / `Invalid API key` (`:130`) e emite diagnóstico distinto para projeto canônico vs. não-canônico (`:132-135`) | **SIM** — instalado em `global.fetch` do client (`:125`) | `:117-170` |
| 10 | Supressão de `AbortError` | `:161-165` | Não loga cancelamentos intencionais como erro | SIM | `:161` |
| 11 | `onAuthStateChange` → `wrong_project_detected` | `:174-191` | Warn quando `projectId !== CURRENT_PROJECT_ID` e não é local/placeholder (`:184-190`) | **SIM** — listener registrado no import | `:174` |

**Guardas fora do arquivo, complementares:**
- `src/integrations/supabase/runtime-validator.ts:10-29` — `validateSupabaseConfig()` **lança `Error` em `PROD`** (`:26-28`). Chamada em `src/main.tsx:17`, antes de `initSentry()` e do `createRoot`. Esta é a única guarda que **falha o boot**; as de `client.ts` só logam e aplicam fallback.
- Contrato de CI: o comentário `client.ts:12-15` afirma que `validate-supabase-config.mjs` exige `content.includes('validateEnv') && content.includes('CURRENT_PROJECT_ID')`. Ambos os literais estão presentes (`:38` e `:21`). **Não verifiquei o script `scripts/validate-supabase-config.mjs`** (fora do escopo) — NAO_VERIFICADO.

**Conclusão:** ✅ IMPLEMENTADO_TOTAL. Todas as 11 guardas estão ativas em runtime (executadas no import do módulo ou registradas como listener/interceptor).

### B(b) — `src/integrations/supabase/types.ts`: contagem e tabelas exigidas

**Contagem de `export type`: 7.** Linhas: `:1` (`Json`), `:9` (`Database`), `:8062` (`Tables`), `:8091` (`TablesInsert`), `:8116` (`TablesUpdate`), `:8141` (`Enums`), `:8158` (`CompositeTypes`).

Estrutura: `public.Tables` em `:16`–`:7108` (**153 tabelas**), `public.Views` em `:7109`, `public.Functions` em `:7307`, `public.Enums` em `:8012`.

| Tabela exigida | Presente? | Linha |
|---|---|---|
| `products` | ✅ **SIM** | `:4608` |
| `product_variants` | ✅ **SIM** | `:4518` |
| `suppliers` | ✅ **SIM** | `:6260` |
| `personalization_techniques` | ❌ **AUSENTE** | 0 ocorrências no arquivo inteiro |
| `supplier_products_raw` | ❌ **AUSENTE** | 0 ocorrências |
| `magazines` | ❌ **AUSENTE** | 0 ocorrências |
| `magazine_items` | ❌ **AUSENTE** | 0 ocorrências |
| `magazine_templates` | ❌ **AUSENTE** | 0 ocorrências |

Verificação: `grep -c "magazine" types.ts` → **0**; `grep -c "personalization_techniques" types.ts` → **0**; `grep -c "supplier_products_raw" types.ts` → **0**.

**Faltam 5 das 8.** Classificação: 🟨 IMPLEMENTADO_PARCIAL.

Consequências medidas no código:
- `src/integrations/supabase/magazine-schema.ts` existe **exclusivamente** para contornar a ausência de `magazine_*`. O cabeçalho (`:1-27`) declara o motivo e alerta que corrigir `types.ts` à mão não é seguro. `src/services/magazineService.ts` usa `magazineDb` em 40+ chamadas (`:136`, `:150`, `:255`, `:269`, `:313`, `:337`, `:346`, `:359`, `:421`, `:427`, `:432`, `:441`, `:449`, `:462`, `:482`, `:492`, `:526`, `:534`, …).
- `personalization_techniques` é tratada como tabela real e acessada por string, com alias explicitamente **removido** em três lugares: `src/lib/db/postgrest.ts:50-52`, `src/lib/external-db/rest-native.ts:9-12`, `src/lib/supabase-direct.ts:9-12`.
- `supplier_products_raw` é camada Bronze; `src/integrations/supabase/gold.ts:8-10` documenta que o frontend **nunca** deve lê-la (ADR 0007) — sua ausência é intencional por arquitetura, não um defeito.

### B(c) — Tipo `Product`: campos críticos

Existem **duas** interfaces `Product` no escopo.

**1. `src/types/product-catalog.ts:25` — tipo canônico de UI (57 consumidores de produção):**

| Campo | Presente | Linha | Assinatura |
|---|---|---|---|
| `price` | ✅ | `:31` | `price: number;` |
| `sale_price` | ✅ | `:32` | `sale_price?: number;` |
| `shortDescription` | ✅ | `:30` | `shortDescription: string;` |
| `category_id` | ✅ | `:35` | `category_id?: string \| null;` |
| `category_name` | ✅ | `:36` | `category_name?: string \| null;` |

**Todos os 5 campos críticos exigidos pela REGRA #2 estão presentes.** ✅

**2. `src/types/product.ts:4` — tipo DB-oriented:**

| Campo | Presente | Linha |
|---|---|---|
| `shortDescription` | ✅ | `:9` |
| `price` | ✅ | `:10` |
| `sale_price` | ✅ | `:11` |
| `category_id` | ✅ | `:14` (`number \| null`, tipo divergente do outro) |
| `category_name` | ✅ | `:15` |

Este segundo `Product` **não tem nenhum consumidor**: `grep "from '@/types/product'"` → 0. Só é alcançado por `src/types/simulation.ts:20` (que re-exporta apenas `ProductColor`) e por `src/types/index.ts:15` (barrel sem importadores). Classificação: 🟨 — o tipo está completo, mas morto exceto por um único símbolo re-exportado.

Observação medida: `src/types/domain/simulation.ts:18` marca `SimulatorProductColor` como `@deprecated Use ProductColor from @/types/product` — apontando para o arquivo praticamente morto.

### B(d) — `src/data/`: dados estáticos alimentam produção?

Três arquivos, **1.755 linhas**, todos hardcoded (sem I/O). Todos têm consumidor.

| Arquivo | Linhas | Natureza | Consumidor (arquivo:linha) | Alimenta tela de produção? |
|---|---|---|---|---|
| `src/data/mock-match-products.ts` | 939 | **Mock hardcoded** — 20+ produtos fictícios (`id: 'mock-001'`, `:12`), imagens todas `/placeholder.svg` (`:7`). Cabeçalho `:1-4`: "Used when real product data is not yet available" | `src/pages/products/ProductMatchPage.tsx:12` | **SIM** — página de rota `/…match…`. Prova: é a única fonte importada nessa página para `MOCK_MATCH_PRODUCTS` |
| `src/data/mockData.ts` | 127 | **Constantes de negócio** (não mock, apesar do nome): `CATEGORIES`, `SUPPLIERS`, `PUBLICO_ALVO`, `DATAS_COMEMORATIVAS`, `ENDOMARKETING`. O cabeçalho `:3-14` documenta a limpeza de 812→110 linhas que removeu os mocks reais | `src/components/admin/products/ProductMarketingSection.tsx:16` (tags de marketing), `src/hooks/common/useSearch.ts:5` (`CATEGORIES`, `SUPPLIERS`) | **SIM** — busca global e formulário admin de produto |
| `src/data/pantone-coated.ts` | 689 | **Catálogo de referência** Pantone (~500 cores, hex + RGB), com parser `h()` em `:19` | `src/components/mockup/LogoColorAnalyzer.tsx:15` (`searchPantone`), `src/utils/color-matching.ts:8` (`PANTONE_CATALOG`) | **SIM** — análise de cor de logo no módulo de mockup |

**Resposta direta:** sim, são dados estáticos/seed hardcoded, e **os três alimentam telas de produção**. O caso mais relevante é `mock-match-products.ts`: uma página de produção renderiza 939 linhas de produtos fictícios com imagens placeholder. Classificação do conjunto: ✅ quanto a ter consumidor; 🟨 quanto à adequação de `mock-match-products.ts` (dados falsos em rota de produção — não há fallback para dados reais no arquivo).

Mocks adicionais **fora** de `src/data/` que também chegam a telas:
- `src/lib/bi/mockData.ts` (247 l.) → 6 hooks de BI: `src/hooks/bi/useClientBI.ts:8`, `useIndustryTrends.ts:11`, `useClientCategoryAffinity.ts:12`, `useIndustryCategoryTrends.ts:13`, `useClientSeasonality.ts:10`, `useClientAffinity.ts:8`.
- `src/lib/bi/demoClient.ts` (21 l.) → 4 consumidores, incluindo `src/pages/bi/BusinessIntelligencePage.tsx:28` e `src/hooks/crm/useCrmCompanies.ts:15` (`DEMO_COMPANY`).
- `src/lib/kit-builder/mock-data.ts` (172 l., `MOCK_BOXES`, `MOCK_ITEMS`) → `src/hooks/kit-builder/useKitBuilderQueries.ts:17`.

### B(e) — Sistema de feature flags / toggles

**Existe. Arquivo único: `src/lib/feature-flags.ts` (207 linhas).**

- Union de tipos: `:12-70` (`FeatureFlag`)
- Registro central: `:79` (`FLAG_REGISTRY`)
- Leitura: `:157` (`isFeatureEnabled`)
- Override em runtime: `:154` (`runtimeOverrides` Map), `:183` (`setFeatureFlag`)
- Override de dev via `localStorage` (`ff_<flag>`): `:172-175`
- Restrição por papel: `:166-169` (`allowedRoles`)

**As 13 flags, defaults e adoção real:**

| # | Flag | Default | Linha do default | Lida em runtime? | Call-site |
|---|---|---|---|---|---|
| 1 | `mfa` | **false** | `:81` | **não** | — |
| 2 | `ai_recommendations` | **true** | `:85` | **não** | — |
| 3 | `presentation_mode` | **true** | `:89` | **não** | — |
| 4 | `voice_commands` | **true** | `:93` | **não** | — |
| 5 | `magic_up` | **true** | `:97` | **não** | — |
| 6 | `e2e_tests` | **false** | `:101` | **não** | — |
| 7 | `advanced_analytics` | **true** (roles `admin`,`manager`) | `:105` | **não** | — |
| 8 | `custom_kits_v2` | **false** | `:110` | **não** | — |
| 9 | `crm_bridge_enabled` | **true** | `:114` | **não** | — |
| 10 | `useEmaRupture` | **true** | `:121` | **SIM (5×)** | `src/components/inventory/risk/RupturePanelEma.tsx:129`, `StockRiskHero.tsx:64`, `VariantStockTable.tsx:382`, `src/hooks/stock/useSupplierRiskBreakdown.ts:32`, `useRuptureAlerts.ts:58` |
| 11 | `supplierReliability` | **true** | `:127` | **SIM (1×)** | `src/components/inventory/StockDashboard.tsx:129` |
| 12 | `useColorSwatchesV2` | **true** | `:138` | **SIM (3×)** | `src/components/products/ProductCard.tsx:235`, `ProductListItem.tsx:163`, `src/components/products/table-view/ProductTableRow.tsx:137` |
| 13 | `magazineModule` | **true** | `:146` | **não** | — |

**Medição:** apenas **3 das 13 flags** são consultadas em código de produção (9 call-sites, em 7 arquivos). **10 flags são declaradas e nunca lidas** — incluindo `mfa` (false), `crm_bridge_enabled` (true, com 8 linhas de documentação em `:113-119` sobre desligamento degradado) e `magazineModule` (true, cujo módulo `/magazine` não é gateado em lugar nenhum).

`setFeatureFlag` (`:183`), `getAllFlags` (`:190`) e `getFlagRegistry` (`:202`) têm **0 consumidores de produção** — não existe UI de administração de flags.

**Classificação: 🟨 IMPLEMENTADO_PARCIAL.** O mecanismo está completo e funcional; a adoção é de 23%. Não há segundo sistema de flags: os `kill-switch` (`src/lib/external-db/kill-switch-client.ts`, 365 l.) são server-side via `system_kill_switches`, explicitamente distinguidos das flags em `feature-flags.ts:20-25`.

### B(f) — `Math.random()` fora de testes e valores hardcoded em cálculo

**`Math.random()` — 10 ocorrências no escopo, todas fora de testes:**

| Arquivo:linha | Uso | Legítimo? |
|---|---|---|
| `src/lib/telemetry/navigationMetrics.ts:100` | `if (Math.random() > sampleRate()) return;` — amostragem de telemetria | ✅ sim |
| `src/lib/telemetry/requestId.ts:23` | `Math.floor(Math.random() * 16)` — geração de request id hex | ✅ sim |
| `src/lib/auth/auth-flow-tracer.ts:73` | `bytes[i] = Math.floor(Math.random() * 256)` — entropia de trace id | ✅ sim |
| `src/lib/auth/safeAuthCall.ts:135` | `Math.round(base * (0.75 + Math.random() * 0.5))` — **jitter de backoff** | ✅ sim |
| `src/lib/auth/auth-utils.ts:20` | `FLOW_GREETINGS[Math.floor(Math.random() * …)]` — saudação aleatória (cosmético) | ✅ sim |
| `src/lib/external-db/kill-switch-client.ts:89`, `:90` | fallback de id quando `crypto.randomUUID` indisponível (documentado em `:73`, `:86`) | ✅ sim |
| `src/lib/external-db/invoke.ts:280` | `const jitter = Math.floor(Math.random() * 200);` — jitter de retry | ✅ sim |

**Nenhuma ocorrência de `Math.random()` em lógica de preço, estoque ou desconto.** ✅

**Valores hardcoded em lógica de preço/cálculo (achados):**

| Valor | Arquivo:linha | Impacto |
|---|---|---|
| Markup limitado a **50%** | `src/logic/quotes/calculations.ts:48` — `Math.min(50, Math.max(0, markupPercent \|\| 0))` | Teto comercial fixo em código, sem configuração |
| Desconto percentual limitado a **100%** | `src/logic/quotes/calculations.ts:62` — `Math.min(100, safeValue)` | Correto, mas fixo |
| `PACKING_EFFICIENCY = 0.75` | `src/lib/kit-builder/volume-calculator.ts:13` | 75% de aproveitamento de caixa assumido |
| `VOLUME_WARNING_THRESHOLD = 0.85` | `src/lib/kit-builder/volume-calculator.ts:16` | — |
| Profundidade fallback `* 0.5` | `src/lib/kit-builder/volume-calculator.ts:257` | Estimativa geométrica arbitrária |
| Faixas de uso 100/85/50 | `src/lib/kit-builder/volume-calculator.ts:143-154` | — |
| Ajuste de preço por cor = razão linear | `src/lib/personalization/calculators.ts:126-127` — `basePrice * (requestedColors / tableMaxColors)` | Regra de negócio inventada em código, sem tabela |
| Ajuste de preço por área = razão linear | `src/lib/personalization/calculators.ts:150-152` | idem |
| `CATALOG_LOW_STOCK_THRESHOLD = 10` | `src/lib/catalog-stock-status.ts:27` | — |
| `SOON_THRESHOLD_DAYS = 3` | `src/lib/carts/shipping-deadline.ts:12` | — |
| `DEFAULT_RUPTURE_HORIZON = 3` | `src/lib/inventory/rupture-risk.ts:22` | — |
| `NOVELTY_WINDOW_DAYS = 30` | `src/lib/products/novelty-days.ts:9` | — |
| Faixas de health score `>= 80` / `>= 50` | `src/lib/inventory/health-score.ts:51-52` | — |
| Score `2.0` + `totalVolume / 5` para produto novo | `src/lib/trending-score.ts:44-47` | Constantes de ranking sem origem documentada |
| Crítico em `min * 0.25` | `src/lib/inventory/health-score.ts:8-9` (comentário) | — |
| **Anon key JWT completa** | `src/integrations/supabase/client.ts:24` | Chave pública embutida como fallback — intencional (é anon key), mas hardcoded |

**Divergência de arredondamento monetário:** `src/services/orderService.ts:33` usa `Math.round(value * 100) / 100`, enquanto as outras 5 definições de `round2` usam `Math.round((v + Number.EPSILON) * 100) / 100`. Comportamentos diferentes em casos de borda de ponto flutuante.

---

## C) "Sem consumidor" — dupla verificação e confiança

Método de dupla verificação aplicado a cada candidato:
1. grep por **caminho de import** (`@/…`, relativo, `import()` dinâmico, barrel do diretório);
2. grep por **cada símbolo exportado** isoladamente (`\bNome\b`), cobrindo `Nome<T>(`, re-export por barrel, uso como tipo e chamada indireta;
3. grep por **import de efeito colateral** (`import 'caminho'` sem símbolo);
4. separação entre consumidores de produção e de teste.

| Módulo | Linhas | Exports verificados | Import path | Símbolos | Side-effect | Consumidor de teste | Confiança |
|---|---|---|---|---|---|---|---|
| `src/lib/external-db/rpc-native.ts` | 284 | `dispatchRpc`, `getCustomizationPrice`, `getProductCustomizationOptions`, `getCategoryDescendants`, `getProductPrintAreas`, `getProductPrintAreasV2`, `linkProductPrintAreas`, `backfillProductPrintAreas`, `findFornecedorPriceTable` (+3 tipos) | 0 | 0 | 0 | 0 | **ALTA** — só citado em prosa (`src/lib/external-rpc.ts:6`) |
| `src/lib/print-area-grouping.ts` | 316 | 12 (`groupPrintAreasByComponent`, `flattenTechniques`, `summarizeGroups`, …) | 0 | 0 | 0 | 0 | **ALTA** — `flattenTechniques` existe, mas é uma função **local** independente em `src/components/kit-builder/PersonalizationConfig.tsx:67` |
| `src/lib/telemetry/bridgeAlertThresholds.ts` | 202 | 9 | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/telemetry/longTaskWatchdog.ts` | 184 | 7 | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/pdf/whitelabel-comparison.ts` | 123 | `fetchClientBranding`, `exportWhitelabelComparisonPDF`, `ClientBranding` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/supabase/rest-client.ts` | 127 | `headRequestWithFallback`, `getSupabaseQueryConfig` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/supabase/rls-validator.ts` | 164 | `validateRLSPolicies`, `canAccessTable` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/auth/safeMfaCall.ts` | 77 | `safeMfaCall`, `MfaErrorKind` | 0 | 0 | 0 | **1** (`src/lib/auth/__tests__/safeMfaCall.fuzz.test.ts:5`) | **ALTA** — testado (150+ cenários) mas nunca chamado em produção |
| `src/lib/payments/order-payment-simulator.ts` | 57 | `simulateOrderPayment`, `OrderPaymentState` | 0 | 0 | 0 | **1** (`src/lib/payments/__tests__/order-payment-simulator.test.ts:2`) | **ALTA** |
| `src/lib/auth/token-audit.ts` | 43 | `stripTokens`, `auditErrorMessage`, `safeErrorMessage` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/auth/auth-audit.ts` | 28 | `runAuthAudit` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/auth/apply-seller-scope.ts` | 52 | `applySellerScope`, `shouldShortCircuitForSelf`, `SellerScopeOptions` | 0 | 0 (só comentários) | 0 | 0 | **ALTA** — `src/hooks/intelligence/useCommercialIntelligence.ts:227` diz literalmente "REMOVIDO: applySellerScope." |
| `src/integrations/supabase/rpc-overrides.ts` | 53 | `asTypedRPC`, `SupabaseRPCCaller`, `GetProfileAndRolesResult` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/navigation/filter-dev-only-items.ts` | 47 | `filterDevOnlyItems`, `isItemVisibleForRoles` | 0 | 0 | 0 | 0 | **ALTA** — existe `src/lib/navigation/filter-restricted-items.ts` (38 l.) em paralelo |
| `src/lib/system/dev-infra-messages.ts` | 12 | `shouldShowDevInfraMessages` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/theme-presets-css-vars-patch.ts` | 42 | `BUG_04_PATCH`, `validateBug04Patch` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/lib/design-policy.ts` | 20 | `NO_ORANGE_GLOW_POLICY` | 0 | 0 | 0 | 0 (só o **nome do arquivo** como string em `src/components/layout/sidebar/__tests__/SidebarMobileRegression.test.ts:31`) | **ALTA** |
| `src/utils/security-audit.ts` | 23 | `checkSecurityDefinerAccess` | 0 | 0 | 0 | 0 | **ALTA** |
| `src/integrations/lovable/index.ts` | 41 | `lovable` | 0 | 0 (14 hits de "lovable" são todos strings/comentários: `src/components/auth/SocialLoginButtons.tsx:59`, `src/components/seo/PageSEO.tsx:17`, …) | 0 | 0 | **ALTA** |
| `src/types/index.ts` | 17 | barrel `export type *` de 7 módulos | 0 (`grep "from '@/types'"` → 0) | n/a | n/a | 0 | **ALTA** |
| `src/types/infrastructure/index.ts` | 8 | barrel de `./promobrind` | 0 | n/a | n/a | 0 | **ALTA** — morte por cadeia |
| `src/types/infrastructure/promobrind.ts` | 301 | tipos do BD externo | 1 (só o barrel morto acima) | 0 diretos | n/a | 0 | **ALTA** — morte por cadeia |
| `src/types/mockup.ts` | 37 | tipos de mockup | 1 (só `src/types/index.ts:17`) | 0 diretos | n/a | 0 | **ALTA** — morte por cadeia |
| `src/lib/personalization/repositories/index.ts` | 14 | barrel | 0 | n/a | n/a | 0 | **MÉDIA** — os arquivos que ele reexporta (`technique.repository.ts`, `priceTable.repository.ts`) **estão vivos** via `src/lib/personalization/index.ts:19,23`. O barrel é redundante, os módulos não |
| `src/lib/personalization/services/index.ts` | 15 | barrel de `pricing.service` | 0 | n/a | n/a | 0 | **MÉDIA** — mesma situação (`src/lib/personalization/index.ts:28`) |
| `src/types/browser.d.ts`, `canvas-confetti.d.ts`, `jest-dom.d.ts`, `jspdf-autotable.d.ts` | 161 | declarações ambiente | 0 | n/a | n/a | n/a | **BAIXA** → classificados 🟦: `.d.ts` ambiente é consumido pelo compilador via `tsconfig`, não por import. **NAO_VERIFICADO** se estão no `include` do tsconfig |
| `src/lib/console-filter.ts` | 57 | efeito colateral | — | — | **1** (`src/main.tsx:1`) | — | **ALTA — VIVO.** Falso positivo do grep de símbolos; detectado pela verificação de side-effect |

**Total: 28 módulos com 0 importadores de caminho.** Destes: 24 confirmados ⬛ MORTO com confiança ALTA; 2 barrels redundantes (confiança MÉDIA, os módulos-alvo vivem); 4 `.d.ts` reclassificados 🟦 (não mensurável por grep); 1 falso positivo corrigido (`console-filter.ts`, vivo).

**Linhas mortas medidas (excluindo `.d.ts` e barrels):** ≈ **1.980 linhas** em 24 arquivos.

---

## E) Refactors abandonados (módulo novo criado, antigo ainda rodando)

| # | Módulo NOVO | Módulo ANTIGO ainda em uso | Qual roda (prova) |
|---|---|---|---|
| 1 | `src/lib/db/postgrest.ts` (605 l.) — declara em `:1-3` substituir "the external-db bridge framework for all application call sites" | `src/lib/external-db/*` (21 arquivos, ~4.900 l.) | **Ambos rodam.** `postgrest.ts`: 78 consumidores (`src/components/admin/suppliers-manager/useSuppliersManager.ts:1`). `external-db/index.ts`: 13 consumidores (`src/components/admin/products/useProductsManager.ts:21`). O próprio barrel novo avisa em `external-db/index.ts:29-31`: "Não importe diretamente de bridge.ts, rest-native.ts ou invoke.ts para novos recursos" — mas `src/hooks/intelligence/useExternalDatabase.ts:17,18,22` importa exatamente esses três |
| 2 | `src/lib/external-db/rpc-native.ts` (284 l.) | `src/lib/external-rpc.ts` (83 l.) | **O antigo roda.** `external-rpc.ts`: 14 consumidores (`src/components/simulator/wizard/QuantityRangeComparison.tsx:14`). `rpc-native.ts`: **0**, e nem sequer é reexportado pelo barrel `external-db/index.ts` |
| 3 | `src/integrations/supabase/gold.ts:44` (`goldFrom`, tipado por relação Gold auditada) | `src/lib/supabase-untyped.ts` (`untypedFrom`, cast permissivo `SupabaseClient<any>`) | **O antigo roda.** `untypedFrom`: 53 consumidores. `goldFrom`: 2 (`src/components/admin/connections/LastSyncRunPanel.tsx:17`, `src/hooks/admin/useMedallionHealth.ts`). Adoção de 3,6% |
| 4 | `src/utils/currency.ts:38` (`formatBRL`) — cabeçalho `:3-5` diz "Centraliza a lógica de formatação para evitar inconsistências" | `src/lib/format.ts:22` (`formatCurrency`) + 20 cópias locais | **O antigo roda.** `lib/format.ts`: 38 consumidores. `utils/currency.ts`: **1** (`src/components/quotes/QuoteKanbanBoard.tsx:46`). A "centralização" criou uma terceira via em vez de eliminar as cópias |
| 5 | `src/lib/print-area-grouping.ts` (316 l., 12 helpers) | `src/lib/fetch-print-areas.ts` (159 l.) + `flattenTechniques` local em `src/components/kit-builder/PersonalizationConfig.tsx:67` | **O antigo roda.** `fetch-print-areas.ts`: 4 consumidores (`src/hooks/simulation/useGravacaoPriceV2.ts:178`). `print-area-grouping.ts`: 0 |
| 6 | `src/lib/external-db/tables.ts` — o próprio arquivo diz em `:4-13` que "as whitelists agora vivem em rest-native.ts" e que "`ExternalTable` foi migrado (concluído)" | `src/lib/external-db/rest-native.ts:28+` | **O novo roda**, mas o antigo ficou: `tables.ts` continua reexportado em `src/lib/external-db/index.ts:112` (`export * from './tables'`). Casca esvaziada mantida na superfície pública |
| 7 | `src/integrations/supabase/magazine-schema.ts` (120 l.) | `src/integrations/supabase/types.ts` (deveria conter `magazine_*`) | **O workaround roda.** Não é refactor abandonado, é remendo permanente: `magazine-schema.ts:4-17` explica que corrigir `types.ts` decairia no próximo deploy. `src/services/magazineService.ts` depende 100% dele |
| 8 | `src/lib/navigation/filter-restricted-items.ts` (38 l., 2 consumidores) | `src/lib/navigation/filter-dev-only-items.ts` (47 l., 0 consumidores) | **O de 38 linhas roda**; o outro está morto. Provável renomeação sem remoção |
| 9 | `src/lib/catalog-stock-status.ts:62` (16 consumidores) | `src/lib/products/stock-status.ts:133` (2 consumidores prod) | **Ambos rodam** com lógicas semelhantes de `qty <= 0` / `minOrderQuantity >= 1`. Duas fontes de verdade para status de estoque |
| 10 | `src/lib/telemetry/structuredLogger.ts` (30 consumidores, usado pelo `client.ts:4`) | `src/lib/logger.ts` (269 consumidores) | **Ambos rodam.** Migração para logger estruturado parou em 10% |
| 11 | `src/lib/supabase-direct.ts:4` (`TABLE_ALIASES`) | `src/lib/db/postgrest.ts:53` (`BRIDGE_ALIASES`) | **Ambos rodam**, com conteúdos parcialmente sobrepostos e o mesmo comentário sobre `personalization_techniques` copiado em três arquivos (`supabase-direct.ts:9-12`, `postgrest.ts:50-52`, `rest-native.ts:9-12`) |
| 12 | `src/types/product-catalog.ts:25` (`Product`, 57 consumidores) | `src/types/product.ts:4` (`Product`, 0 consumidores diretos) | **O novo roda.** O antigo sobrevive só por `ProductColor` re-exportado em `src/types/simulation.ts:20` |

---

## D) COBERTURA

| Métrica | Valor |
|---|---|
| Arquivos de produção no escopo | **284** |
| Lidos integralmente ou em trecho substancial | **41** |
| Alcançados por grep estrutural (contagem de consumidores + símbolos exportados) | **284 (100%)** |
| Não alcançados | **0** |

**Nenhum arquivo ficou sem medição.** Todo arquivo de produção do escopo passou pelo script de contagem de consumidores (import por alias `@/…`, por barrel de diretório, por caminho relativo e por `import()` dinâmico), e os 28 com resultado zero passaram adicionalmente por verificação símbolo-a-símbolo e por side-effect (§C).

### Limitações declaradas (NAO_VERIFICADO)
- **`.d.ts` ambiente** (`src/types/browser.d.ts`, `canvas-confetti.d.ts`, `jest-dom.d.ts`, `jspdf-autotable.d.ts` — 161 linhas): consumo é feito pelo compilador via `tsconfig`, não por import. Não inspecionei `tsconfig*.json` (fora do escopo). Classificados 🟦.
- **`scripts/validate-supabase-config.mjs`**: fora do escopo. O contrato citado em `client.ts:12-15` foi verificado apenas do lado do `client.ts` (os literais `validateEnv` e `CURRENT_PROJECT_ID` existem).
- **Consumidores fora de `src/`** (edge functions em `supabase/functions/`, scripts, `e2e/`): não contabilizados. Um módulo marcado ⬛ poderia, em tese, ser usado ali — mas nenhum dos 24 mortos é de natureza server-side.
- **Uso indireto por string** (ex.: nome de tabela montado dinamicamente) não é detectável por este método.
- Colunas "Classificação" da lista abaixo aplicam a regra: **0 importadores → ⬛**; ≥1 → ✅; exceções marcadas 🟨/🟦 estão justificadas na coluna Observação e nas seções A–C.

### Lista completa — 284 arquivos

| Arquivo | Consumidores (prod) | Primeiro consumidor | Classificação | Observação |
|---|---|---|---|---|
| `src/config/skeleton.config.ts` | 1 | `src/components/loading/SkeletonMonitor.tsx:5` | ✅ | — |
| `src/constants/filters.ts` | 10 | `src/components/catalog/CatalogToolbar.tsx:2` | ✅ | — |
| `src/data/mock-match-products.ts` | 1 | `src/pages/products/ProductMatchPage.tsx:12` | ✅ | — |
| `src/data/mockData.ts` | 2 | `src/components/admin/products/ProductMarketingSection.tsx:16` | ✅ | — |
| `src/data/pantone-coated.ts` | 2 | `src/components/mockup/LogoColorAnalyzer.tsx:15` | ✅ | — |
| `src/integrations/lovable/index.ts` | 0 | — | ⬛ | — |
| `src/integrations/supabase/client.ts` | 273 | `src/components/ai/AIChat.tsx:16` | ✅ | — |
| `src/integrations/supabase/gold-relations.ts` | 5 | `src/hooks/stock/stockFetcher.ts:5` | ✅ | — |
| `src/integrations/supabase/gold.ts` | 2 | `src/components/admin/connections/LastSyncRunPanel.tsx:17` | 🟨 | 2 consumidores vs 53 de supabase-untyped.ts |
| `src/integrations/supabase/lazy-client.ts` | 20 | `src/stores/useBadgeVisibilityStore.ts:3` | ✅ | — |
| `src/integrations/supabase/magazine-schema.ts` | 2 | `src/services/magazineService.ts:27` | ✅ | — |
| `src/integrations/supabase/rpc-overrides.ts` | 0 | — | ⬛ | — |
| `src/integrations/supabase/runtime-validator.ts` | 1 | `src/main.tsx:9` | ✅ | — |
| `src/integrations/supabase/types.ts` | 134 | `src/stores/useBadgeVisibilityStore.ts:4` | 🟨 | 5 das 8 tabelas exigidas ausentes |
| `src/lib/access/access-denied-strings.tsx` | 1 | `src/components/access/DevAccessDeniedPage.tsx:24` | ✅ | — |
| `src/lib/access/access-policy.ts` | 1 | `src/components/layout/ProtectedRoute.tsx:7` | ✅ | — |
| `src/lib/access/dev-route-telemetry.ts` | 1 | `src/components/access/DevAccessDeniedPage.tsx:2` | ✅ | — |
| `src/lib/access/log-access-denied.ts` | 1 | `src/components/layout/DevRoute.tsx:6` | ✅ | — |
| `src/lib/access/request-dev-access.ts` | 1 | `src/components/access/DevAccessDeniedPage.tsx:23` | ✅ | — |
| `src/lib/access/security-utils.ts` | 2 | `src/components/access/DevAccessDeniedPage.tsx:25` | ✅ | — |
| `src/lib/analytics/cartAnalytics.ts` | 3 | `src/components/products/QuickAddToQuote.tsx:22` | ✅ | — |
| `src/lib/analytics/intelligenceAnalytics.ts` | 1 | `src/components/intelligence/ZeroResultDiagnosisCallout.tsx:11` | ✅ | — |
| `src/lib/analytics/mfaNavigationAnalytics.ts` | 3 | `src/components/layout/AdminRoute.tsx:10` | ✅ | — |
| `src/lib/analytics/zeroResultAnalytics.ts` | 2 | `src/components/intelligence/ZeroResultDiagnosisCallout.tsx:10` | ✅ | — |
| `src/lib/auth/apply-seller-scope.ts` | 0 | — | ⬛ | — |
| `src/lib/auth/auth-audit.ts` | 0 | — | ⬛ | — |
| `src/lib/auth/auth-debug.ts` | 3 | `src/components/auth/SocialLoginButtons.tsx:5` | ✅ | — |
| `src/lib/auth/auth-flow-tracer.ts` | 1 | `src/pages/auth/SSOCallbackPage.tsx:11` | ✅ | — |
| `src/lib/auth/auth-utils.ts` | 1 | `src/contexts/AuthContext.tsx:20` | ✅ | — |
| `src/lib/auth/invoke-full-scope.ts` | 5 | `src/components/admin/connections/IssueMcpKeyForm.tsx:34` | ✅ | — |
| `src/lib/auth/is-duplicate-account-error.ts` | 1 | `src/components/admin/users/useUserManagement.ts:6` | ✅ | — |
| `src/lib/auth/oauth-error-explainer.ts` | 1 | `src/pages/auth/SSOCallbackPage.tsx:14` | ✅ | — |
| `src/lib/auth/oauth-error-messages.ts` | 2 | `src/components/auth/SocialLoginButtons.tsx:7` | ✅ | — |
| `src/lib/auth/oauth-pending.ts` | 2 | `src/components/auth/SocialLoginButtons.tsx:6` | ✅ | — |
| `src/lib/auth/post-login-redirect.ts` | 4 | `src/components/layout/ProtectedRoute.tsx:8` | ✅ | — |
| `src/lib/auth/rate-limit.ts` | 1 | `src/contexts/AuthContext.tsx:14` | ✅ | — |
| `src/lib/auth/resolve-redirect-target.ts` | 1 | `src/pages/auth/Auth.tsx:4` | ✅ | — |
| `src/lib/auth/safeAuthCall.ts` | 3 | `src/services/authService.ts:3` | ✅ | — |
| `src/lib/auth/safeMfaCall.ts` | 0 | — | ⬛ | — |
| `src/lib/auth/session-recovery.ts` | 2 | `src/hooks/products/useSellerCarts.ts:13` | ✅ | — |
| `src/lib/auth/step-up-error.ts` | 3 | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx:46` | ✅ | — |
| `src/lib/auth/token-audit.ts` | 0 | — | ⬛ | — |
| `src/lib/auth/visibility-scope.ts` | 6 | `src/components/common/ScopeBadge.tsx:7` | ✅ | — |
| `src/lib/bi/categoryResolver.ts` | 7 | `src/components/bi/EnrichedOrdersTimeline.tsx:15` | ✅ | — |
| `src/lib/bi/demoClient.ts` | 4 | `src/components/bi/ConfirmQuoteSuggestionsModal.tsx:21` | ✅ | — |
| `src/lib/bi/dossierPdfGenerator.ts` | 2 | `src/hooks/bi/useBIDossierExport.ts:16` | ✅ | — |
| `src/lib/bi/executive-summary.ts` | 4 | `src/components/bi/ExecutiveSummaryButton.tsx:27` | ✅ | — |
| `src/lib/bi/industryRecommendations.ts` | 3 | `src/components/bi/EmpiricalRecommendations.tsx:8` | ✅ | — |
| `src/lib/bi/mockData.ts` | 6 | `src/hooks/bi/useClientBI.ts:8` | ✅ | — |
| `src/lib/bi/pptxGenerator.ts` | 2 | `src/components/bi/ExecutiveSummaryButton.tsx:26` | ✅ | — |
| `src/lib/carts/shipping-deadline.ts` | 3 | `src/hooks/products/useSellerCarts.ts:797` | ✅ | — |
| `src/lib/carts/status-transition-guard.ts` | 2 | `src/hooks/products/useSellerCarts.ts:765` | ✅ | — |
| `src/lib/catalog-stock-status.ts` | 16 | `src/components/replenishments/ReplenishmentCards.tsx:20` | ✅ | — |
| `src/lib/chunk-recovery.ts` | 4 | `src/components/errors/EnhancedErrorBoundary.tsx:17` | ✅ | — |
| `src/lib/cloud-status.ts` | 5 | `src/components/system/CloudStatusBanner.tsx:65` | ✅ | — |
| `src/lib/comparison-utils.ts` | 3 | `src/components/compare/ComparisonDuelView.tsx:11` | ✅ | — |
| `src/lib/connection-error-copy.ts` | 5 | `src/components/admin/connections/TestAllConnectionsButton.tsx:42` | ✅ | — |
| `src/lib/connections-config.ts` | 3 | `src/components/admin/connections/ConnectionsOverviewFilters.tsx:23` | ✅ | — |
| `src/lib/console-filter.ts` | 1 | `src/main.tsx:1` | ✅ | Import de efeito colateral (sem símbolo) — falso positivo do grep corrigido |
| `src/lib/crm-db.ts` | 26 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:5` | ✅ | — |
| `src/lib/customization/format-engraving-title.ts` | 5 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:103` | ✅ | — |
| `src/lib/date-utils.ts` | 1 | `src/utils/excelExport.ts:3` | ✅ | — |
| `src/lib/db-retry.ts` | 2 | `src/hooks/intelligence/useStockVelocityPrefetch.ts:14` | ✅ | — |
| `src/lib/db/postgrest.ts` | 78 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:1` | ✅ | — |
| `src/lib/design-policy.ts` | 0 | — | ⬛ | — |
| `src/lib/dom/scroll-lock.ts` | 5 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:98` | ✅ | — |
| `src/lib/edge/invokeBottlenecks.ts` | 1 | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx:47` | ✅ | — |
| `src/lib/edge/invokeExport.ts` | 2 | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx:38` | ✅ | — |
| `src/lib/edge/invokeTelemetrySink.ts` | 4 | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx:46` | ✅ | — |
| `src/lib/edge/safeInvokeCall.ts` | 60 | `src/components/admin/users/PromotionDialog.tsx:25` | ✅ | — |
| `src/lib/env/supabase-placeholder.ts` | 5 | `src/components/providers/AppBootstrap.tsx:4` | ✅ | — |
| `src/lib/error-kind-inference.ts` | 3 | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx:24` | ✅ | — |
| `src/lib/error-reporter.ts` | 3 | `src/components/simulator/wizard/SimulatorErrorBoundary.tsx:21` | ✅ | — |
| `src/lib/export-collection-pdf.ts` | 1 | `src/components/catalog/useCatalogSelection.ts:183` | ✅ | — |
| `src/lib/external-db-prewarm.ts` | 2 | `src/contexts/AuthContext.tsx:210` | ✅ | — |
| `src/lib/external-db/batch-import.ts` | 6 | `src/components/admin/products/bulk-import/StepPreview.tsx:17` | ✅ | — |
| `src/lib/external-db/bridge-status-events.ts` | 2 | `src/lib/error-reporter.ts:14` | ✅ | — |
| `src/lib/external-db/bridge.ts` | 5 | `src/lib/external-db/index.ts:48` | 🟨 | edge function desativada por kill-switch |
| `src/lib/external-db/health-check.ts` | 2 | `src/lib/cloud-status.ts:22` | ✅ | — |
| `src/lib/external-db/immutableCache.ts` | 1 | `src/lib/external-db/products-detail.ts:7` | ✅ | — |
| `src/lib/external-db/index.ts` | 28 | `src/components/admin/products/hooks/useSkuValidation.ts:23` | ✅ | — |
| `src/lib/external-db/invoke.ts` | 3 | `src/hooks/intelligence/useExternalDatabase.ts:17` | 🟨 | edge function desativada por kill-switch |
| `src/lib/external-db/kill-switch-client.ts` | 4 | `src/hooks/intelligence/useExternalDatabase.ts:22` | ✅ | — |
| `src/lib/external-db/kill-switch-telemetry.ts` | 2 | `src/lib/external-db/bridge.ts:28` | ✅ | — |
| `src/lib/external-db/kit-coverage.ts` | 1 | `src/lib/external-db/products-detail.ts:8` | ✅ | — |
| `src/lib/external-db/price-tables.ts` | 2 | `src/lib/external-db/index.ts:108` | ✅ | — |
| `src/lib/external-db/product-types.ts` | 6 | `src/hooks/products/useStockAlerts.ts:3` | ✅ | — |
| `src/lib/external-db/products-detail.ts` | 3 | `src/hooks/products/useCatalogPrefetch.ts:5` | ✅ | — |
| `src/lib/external-db/products-lightweight.ts` | 3 | `src/hooks/products/useProductsLightweight.ts:14` | ✅ | — |
| `src/lib/external-db/products.ts` | 2 | `src/contexts/ProductsContext.tsx:14` | ✅ | — |
| `src/lib/external-db/rest-native.ts` | 3 | `src/hooks/intelligence/useExternalDatabase.ts:18` | ✅ | — |
| `src/lib/external-db/rpc-native.ts` | 0 | — | ⬛ | — |
| `src/lib/external-db/silent-empty-report.ts` | 9 | `src/hooks/products/useVariantSupplierSources.ts:70` | ✅ | — |
| `src/lib/external-db/tables.ts` | 1 | `src/lib/external-db/index.ts:112` | 🟨 | esvaziado; só re-export vestigial no barrel |
| `src/lib/external-db/techniques.ts` | 2 | `src/lib/external-db/index.ts:104` | ✅ | — |
| `src/lib/external-db/types.ts` | 97 | `src/components/admin/suppliers-manager/SupplierTable.tsx:14` | ✅ | — |
| `src/lib/external-rpc.ts` | 14 | `src/components/simulator/wizard/QuantityRangeComparison.tsx:14` | ✅ | — |
| `src/lib/feature-flags.ts` | 9 | `src/components/inventory/risk/RupturePanelEma.tsx:37` | 🟨 | 10 de 13 flags nunca lidas em runtime |
| `src/lib/feedback.ts` | 3 | `src/components/products/ProductQuickActionsFAB.tsx:20` | ✅ | — |
| `src/lib/fetch-print-areas.ts` | 4 | `src/hooks/simulation/useGravacaoPriceV2.ts:178` | ✅ | — |
| `src/lib/forecast.ts` | 2 | `src/components/bi/ClientSeasonalityHeatmap.tsx:30` | ✅ | — |
| `src/lib/format-utils.ts` | 1 | `src/components/intelligence/MarketIntelligenceChart.tsx:35` | ✅ | — |
| `src/lib/format.ts` | 38 | `src/components/bi/ClientSeasonalityHeatmap.tsx:23` | ✅ | — |
| `src/lib/image-converter.ts` | 1 | `src/hooks/mockup/useMockupGenerator.ts:13` | ✅ | — |
| `src/lib/intelligence/degradation.ts` | 4 | `src/components/admin/telemetry/DegradedBlocksCard.tsx:21` | ✅ | — |
| `src/lib/intelligence/degradationRegistry.ts` | 2 | `src/components/admin/telemetry/DegradedBlocksCard.tsx:20` | ✅ | — |
| `src/lib/intelligence/degradationSink.ts` | 1 | `src/lib/intelligence/degradation.ts:17` | ✅ | — |
| `src/lib/inventory/future-stock-stats.ts` | 1 | `src/components/inventory/FutureStockDialog.tsx:39` | ✅ | — |
| `src/lib/inventory/health-score.ts` | 3 | `src/components/inventory/HealthScoreInfoDialog.tsx:16` | ✅ | — |
| `src/lib/inventory/rupture-risk.ts` | 3 | `src/components/inventory/StockFilterToolbar.tsx:22` | ✅ | — |
| `src/lib/inventory/stock-filter.ts` | 1 | `src/hooks/products/useVariantStock.ts:15` | ✅ | — |
| `src/lib/inventory/supplier-reliability/aggregate.ts` | 1 | `src/lib/inventory/supplier-reliability/index.ts:5` | ✅ | — |
| `src/lib/inventory/supplier-reliability/extract.ts` | 1 | `src/lib/inventory/supplier-reliability/index.ts:2` | ✅ | — |
| `src/lib/inventory/supplier-reliability/index.ts` | 8 | `src/components/inventory/supplier-reliability/ReliabilityKpiBar.tsx:3` | ✅ | — |
| `src/lib/inventory/supplier-reliability/matching.ts` | 2 | `src/lib/inventory/supplier-reliability/index.ts:3` | ✅ | — |
| `src/lib/inventory/supplier-reliability/score.ts` | 2 | `src/lib/inventory/supplier-reliability/index.ts:4` | ✅ | — |
| `src/lib/inventory/supplier-reliability/types.ts` | 94 | `src/components/admin/suppliers-manager/SupplierTable.tsx:14` | ✅ | — |
| `src/lib/kit-builder/index.ts` | 48 | `src/components/kit-builder/KitBuilderHeader.tsx:39` | ✅ | — |
| `src/lib/kit-builder/mock-data.ts` | 2 | `src/hooks/kit-builder/useKitBuilderQueries.ts:17` | ✅ | — |
| `src/lib/kit-builder/price-calculator.ts` | 1 | `src/lib/kit-builder/index.ts:41` | ✅ | — |
| `src/lib/kit-builder/types.ts` | 98 | `src/components/admin/suppliers-manager/SupplierTable.tsx:14` | ✅ | — |
| `src/lib/kit-builder/volume-calculator.ts` | 1 | `src/lib/kit-builder/index.ts:29` | ✅ | — |
| `src/lib/kit-library/buildCustomKitInsert.ts` | 1 | `src/pages/kit-builder/KitLibraryPage.tsx:30` | ✅ | — |
| `src/lib/lazyWithRetry.ts` | 15 | `src/components/catalog/CatalogToolbar.tsx:21` | ✅ | — |
| `src/lib/logger.ts` | 269 | `src/stores/useFavoritesStore.ts:2` | ✅ | — |
| `src/lib/masked-suffix.ts` | 6 | `src/components/admin/connections/RotationHistoryRow.tsx:6` | ✅ | — |
| `src/lib/mcp/scopes.ts` | 5 | `src/components/admin/connections/McpTab.tsx:23` | ✅ | — |
| `src/lib/mockup-storage.ts` | 1 | `src/hooks/mockup/mockupGenerationService.ts:30` | ✅ | — |
| `src/lib/navigation/active-match.ts` | 2 | `src/components/layout/SidebarReorganized.tsx:50` | ✅ | — |
| `src/lib/navigation/filter-dev-only-items.ts` | 0 | — | ⬛ | — |
| `src/lib/navigation/filter-restricted-items.ts` | 1 | `src/components/common/EnhancedSpotlight.tsx:10` | ✅ | — |
| `src/lib/navigation/restricted-routes.ts` | 7 | `src/components/navigation/Breadcrumbs.tsx:6` | ✅ | — |
| `src/lib/notifications-metrics.ts` | 4 | `src/components/notifications/NotificationsBadgeStatsPanel.tsx:8` | ✅ | — |
| `src/lib/novelty-dates.ts` | 2 | `src/components/novelties/NoveltiesSection.tsx:24` | ✅ | — |
| `src/lib/payments/order-payment-simulator.ts` | 0 | — | ⬛ | — |
| `src/lib/pdf/totalsColorScheme.ts` | 2 | `src/components/pdf/ProposalSections.tsx:17` | ✅ | — |
| `src/lib/pdf/whitelabel-comparison.ts` | 0 | — | ⬛ | — |
| `src/lib/personalization/adapters/customization-options.adapter.ts` | 1 | `src/lib/personalization/adapters/index.ts:16` | ✅ | — |
| `src/lib/personalization/adapters/index.ts` | 14 | `src/components/admin/techniques-manager/TechniqueTable.tsx:14` | ✅ | — |
| `src/lib/personalization/adapters/price-response.adapter.ts` | 1 | `src/lib/personalization/adapters/index.ts:14` | ✅ | — |
| `src/lib/personalization/adapters/print-area.adapter.ts` | 1 | `src/lib/personalization/adapters/index.ts:22` | ✅ | — |
| `src/lib/personalization/adapters/raw-row.adapter.ts` | 1 | `src/lib/personalization/adapters/index.ts:34` | ✅ | — |
| `src/lib/personalization/adapters/raw-row.types.ts` | 2 | `src/lib/personalization/adapters/index.ts:41` | ✅ | — |
| `src/lib/personalization/adapters/schema-detection.ts` | 4 | `src/lib/personalization/rpc-validator.ts:14` | ✅ | — |
| `src/lib/personalization/calculators.ts` | 2 | `src/lib/personalization/index.ts:9` | ✅ | — |
| `src/lib/personalization/index.ts` | 1 | `src/hooks/tecnicas/useTabelasPreco.ts:9` | ✅ | — |
| `src/lib/personalization/repositories/index.ts` | 0 | — | ⬛ | Barrel redundante; os repositórios que reexporta vivem via `src/lib/personalization/index.ts:19,23` |
| `src/lib/personalization/repositories/priceTable.repository.ts` | 4 | `src/lib/personalization/index.ts:23` | ✅ | — |
| `src/lib/personalization/repositories/technique.repository.ts` | 3 | `src/lib/personalization/index.ts:19` | ✅ | — |
| `src/lib/personalization/rpc-contracts.ts` | 5 | `src/hooks/simulation/useCustomizationPrice.ts:11` | ✅ | — |
| `src/lib/personalization/rpc-validator.ts` | 4 | `src/hooks/simulation/useCustomizationPrice.ts:10` | ✅ | — |
| `src/lib/personalization/selectors.ts` | 1 | `src/lib/personalization/index.ts:11` | ✅ | — |
| `src/lib/personalization/services/index.ts` | 0 | — | ⬛ | Barrel redundante; `pricing.service` vive via `src/lib/personalization/index.ts:28` |
| `src/lib/personalization/services/pricing.service.ts` | 2 | `src/lib/personalization/index.ts:28` | ✅ | — |
| `src/lib/personalization/transformers.ts` | 3 | `src/lib/personalization/index.ts:12` | ✅ | — |
| `src/lib/personalization/types.ts` | 94 | `src/components/admin/suppliers-manager/SupplierTable.tsx:14` | ✅ | — |
| `src/lib/personalization/validators.ts` | 2 | `src/lib/personalization/index.ts:10` | ✅ | — |
| `src/lib/print-area-grouping.ts` | 0 | — | ⬛ | — |
| `src/lib/product-bounds-detector.ts` | 2 | `src/components/mockup/approval/MockupLayoutButtons.tsx:11` | ✅ | — |
| `src/lib/products/kit-detection.ts` | 5 | `src/components/products/ProductCard.tsx:79` | ✅ | — |
| `src/lib/products/novelty-days.ts` | 2 | `src/components/products/ProductStatusBadge.tsx:9` | ✅ | — |
| `src/lib/products/stock-status.ts` | 2 | `src/hooks/products/useCatalogFiltering.ts:11` | ✅ | — |
| `src/lib/query-config.ts` | 5 | `src/hooks/tecnicas/useTabelasPreco.ts:8` | ✅ | — |
| `src/lib/quote-status-config.ts` | 10 | `src/components/quotes/QuoteVersionCompare.tsx:20` | ✅ | — |
| `src/lib/quotes/collapsedItemsStorage.ts` | 1 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:95` | ✅ | — |
| `src/lib/quotes/discount-validation-messages.ts` | 1 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:86` | ✅ | — |
| `src/lib/quotes/expiration.ts` | 1 | `src/components/quotes/QuoteListCellRenderer.tsx:15` | ✅ | — |
| `src/lib/quotes/exportDiscountAuditPdf.ts` | 1 | `src/components/admin/DiscountApprovalAuditTrail.tsx:25` | ✅ | — |
| `src/lib/quotes/personalizationSummary.ts` | 3 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:89` | ✅ | — |
| `src/lib/quotes/quotesLayout.ts` | 1 | `src/components/quotes/QuotesConfigurableList.tsx:43` | ✅ | — |
| `src/lib/rbac/route-matrix.ts` | 1 | `src/pages/admin/AdminRbacRoutesPage.tsx:21` | 🟨 | SSOT declarativa sem enforcement; só página de visualização |
| `src/lib/roles.ts` | 2 | `src/components/admin/users/types.tsx:7` | ✅ | — |
| `src/lib/routePrefetch.ts` | 2 | `src/components/layout/sidebar/SidebarNavGroup.tsx:10` | ✅ | — |
| `src/lib/security/file-validation.ts` | 1 | `src/components/admin/ImageUploadButton.tsx:7` | ✅ | — |
| `src/lib/security/lastInternalRoute.ts` | 4 | `src/components/layout/AdminRoute.tsx:9` | ✅ | — |
| `src/lib/security/magazine-guard.ts` | 2 | `src/services/magazineService.ts:24` | ✅ | — |
| `src/lib/security/mfaChallengeDismissal.ts` | 3 | `src/components/layout/AdminRoute.tsx:8` | ✅ | — |
| `src/lib/security/rls-denial-logger.ts` | 1 | `src/hooks/quotes/useDiscountApproval.ts:9` | ✅ | — |
| `src/lib/security/safeToast.ts` | 2 | `src/main.tsx:8` | ✅ | — |
| `src/lib/security/sanitize-error.ts` | 49 | `src/components/catalog/useCatalogSelection.ts:8` | ✅ | — |
| `src/lib/security/sanitize-message.ts` | 6 | `src/components/search/VisualSearchButton.tsx:15` | ✅ | — |
| `src/lib/security/sanitize.ts` | 1 | `src/lib/security/magazine-guard.ts:13` | ✅ | — |
| `src/lib/security/validation.ts` | 1 | `src/components/ui/chart.tsx:5` | ✅ | — |
| `src/lib/sensitive-masking.ts` | 7 | `src/components/admin/connections/ConnectionTimelineDrawer.tsx:44` | ✅ | — |
| `src/lib/sentry.ts` | 4 | `src/main.tsx:6` | ✅ | — |
| `src/lib/stock-chart-utils.ts` | 7 | `src/components/intelligence/MarketIntelligenceChart.tsx:43` | ✅ | — |
| `src/lib/supabase-direct.ts` | 3 | `src/hooks/products/novelty-core.ts:10` | 🟨 | TABLE_ALIASES duplicado com db/postgrest.ts |
| `src/lib/supabase-untyped.ts` | 53 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:2` | ✅ | — |
| `src/lib/supabase/rest-client.ts` | 0 | — | ⬛ | — |
| `src/lib/supabase/rls-validator.ts` | 0 | — | ⬛ | — |
| `src/lib/supplier-colors.ts` | 6 | `src/components/inventory/VariantStockTable.tsx:5` | ✅ | — |
| `src/lib/sw-register.ts` | 1 | `src/main.tsx:4` | ✅ | — |
| `src/lib/system/dev-gate/DevInfraGate.ts` | 4 | `src/hooks/admin/useDevGate.ts:3` | ✅ | — |
| `src/lib/system/dev-gate/providers.ts` | 1 | `src/lib/system/dev-gate/DevInfraGate.ts:3` | ✅ | — |
| `src/lib/system/dev-gate/types.ts` | 94 | `src/components/admin/suppliers-manager/SupplierTable.tsx:14` | ✅ | — |
| `src/lib/system/dev-infra-messages.ts` | 0 | — | ⬛ | — |
| `src/lib/telemetry/bridgeAlertThresholds.ts` | 0 | — | ⬛ | — |
| `src/lib/telemetry/bridgeCallMetrics.ts` | 7 | `src/hooks/dev/useBridgeMetrics.ts:7` | ✅ | — |
| `src/lib/telemetry/correlationId.ts` | 1 | `src/lib/telemetry/restoreLogger.ts:22` | ✅ | — |
| `src/lib/telemetry/instrumentationControl.ts` | 3 | `src/components/admin/telemetry/InstrumentationToggleButton.tsx:21` | ✅ | — |
| `src/lib/telemetry/longTaskWatchdog.ts` | 0 | — | ⬛ | — |
| `src/lib/telemetry/magazineMetrics.ts` | 1 | `src/pages/magazine/components/MagazineErrorBoundary.tsx:23` | ✅ | — |
| `src/lib/telemetry/navigationMetrics.ts` | 2 | `src/components/common/RouteScrollReset.tsx:4` | ✅ | — |
| `src/lib/telemetry/quoteHandoffTelemetry.ts` | 2 | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx:21` | ✅ | — |
| `src/lib/telemetry/quoteStatusTelemetry.ts` | 1 | `src/services/quoteService.ts:24` | ✅ | — |
| `src/lib/telemetry/requestId.ts` | 12 | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx:39` | ✅ | — |
| `src/lib/telemetry/restoreEventSchema.ts` | 1 | `src/lib/telemetry/restoreLogger.ts:27` | ✅ | — |
| `src/lib/telemetry/restoreLogger.ts` | 3 | `src/hooks/favorites/useFavoriteLists.ts:12` | ✅ | — |
| `src/lib/telemetry/secretsManagerCallMetrics.ts` | 2 | `src/components/admin/connections/SecretsManagerHealthPanel.tsx:43` | ✅ | — |
| `src/lib/telemetry/structuredLogger.ts` | 30 | `src/components/admin/security/keys/useMcpKeys.ts:14` | ✅ | — |
| `src/lib/textUtils.ts` | 5 | `src/components/catalog/CatalogActiveFilters.tsx:11` | ✅ | — |
| `src/lib/theme-presets-css-vars-patch.ts` | 0 | — | ⬛ | — |
| `src/lib/theme-presets.ts` | 5 | `src/components/ThemeInitializer.tsx:9` | ✅ | — |
| `src/lib/to-error-message.ts` | 23 | `src/components/admin/telemetry/BreakerStatusCard.tsx:19` | ✅ | — |
| `src/lib/trending-score.ts` | 3 | `src/components/intelligence/TopCategoriesCard.tsx:12` | ✅ | — |
| `src/lib/trends-export.ts` | 2 | `src/components/admin/connections/ExportButton.tsx:10` | ✅ | — |
| `src/lib/utils.ts` | 610 | `src/components/catalog/CatalogToolbar.tsx:22` | ✅ | — |
| `src/lib/validations/authSchema.ts` | 2 | `src/lib/validations/index.ts:1` | ✅ | — |
| `src/lib/validations/goalSchema.ts` | 2 | `src/lib/validations/index.ts:20` | ✅ | — |
| `src/lib/validations/index.ts` | 2 | `src/hooks/quotes/useQuoteBuilderState.ts:26` | ✅ | — |
| `src/lib/validations/profileSchema.ts` | 2 | `src/lib/validations/index.ts:9` | ✅ | — |
| `src/lib/validations/quoteSchema.ts` | 2 | `src/lib/validations/index.ts:17` | ✅ | — |
| `src/lib/variant-matching.ts` | 1 | `src/components/compare/SyncedZoomGallery.tsx:7` | ✅ | — |
| `src/lib/webhook-events-catalog.ts` | 3 | `src/components/admin/connections/EventsMultiSelect.tsx:13` | ✅ | — |
| `src/lib/webhook-events-payload-samples.ts` | 1 | `src/components/admin/connections/WebhookPlaygroundPanel.tsx:25` | ✅ | — |
| `src/logic/quotes/calculations.ts` | 1 | `src/hooks/quotes/useQuoteBuilderState.ts:41` | ✅ | — |
| `src/types/advancedFilters.ts` | 5 | `src/hooks/intelligence/useContextualSuggestions.ts:4` | ✅ | — |
| `src/types/browser.d.ts` | 0 (ambiente) | n/a — resolvido pelo compilador | 🟦 | `.d.ts` ambiente; não mensurável por import (§C) |
| `src/types/canvas-confetti.d.ts` | 0 (ambiente) | n/a — resolvido pelo compilador | 🟦 | `.d.ts` ambiente; não mensurável por import (§C) |
| `src/types/colorSwatch.ts` | 2 | `src/types/product-catalog.ts:7` | ✅ | — |
| `src/types/crm.ts` | 19 | `src/components/bi/ClientSelector.tsx:12` | ✅ | — |
| `src/types/customization.ts` | 13 | `src/components/kit-builder/PersonalizationConfig.tsx:41` | ✅ | — |
| `src/types/domain/index.ts` | 1 | `src/components/pricing/simulator/types.ts:8` | ✅ | — |
| `src/types/domain/personalization.ts` | 1 | `src/types/domain/index.ts:8` | ✅ | — |
| `src/types/domain/simulation.ts` | 1 | `src/types/domain/index.ts:9` | ✅ | — |
| `src/types/domain/simulator-wizard.ts` | 14 | `src/components/simulator/wizard/StepComparison.tsx:15` | ✅ | — |
| `src/types/external-db.ts` | 6 | `src/components/admin/products/useProductsManager.ts:25` | ✅ | — |
| `src/types/gravacao-database.ts` | 2 | `src/types/index.ts:12` | ✅ | — |
| `src/types/gravacao.ts` | 6 | `src/components/admin/products/sections/engraving/types.ts:6` | ✅ | — |
| `src/types/index.ts` | 0 | — | ⬛ | barrel sem nenhum importador de `@/types` |
| `src/types/infrastructure/index.ts` | 0 | — | ⬛ | barrel alcançável só por types/index.ts (morto) |
| `src/types/infrastructure/promobrind.ts` | 1 | `src/types/infrastructure/index.ts:8` | ⬛ | só types/infrastructure/index.ts (morto) |
| `src/types/jest-dom.d.ts` | 0 (ambiente) | n/a — resolvido pelo compilador | 🟦 | `.d.ts` ambiente; não mensurável por import (§C) |
| `src/types/jspdf-autotable.d.ts` | 0 (ambiente) | n/a — resolvido pelo compilador | 🟦 | `.d.ts` ambiente; não mensurável por import (§C) |
| `src/types/magazine.ts` | 28 | `src/services/magazineService.ts:23` | ✅ | — |
| `src/types/mockup-approval.ts` | 5 | `src/components/mockup/approval/MockupLayoutButtons.tsx:13` | ✅ | — |
| `src/types/mockup.ts` | 1 | `src/types/index.ts:17` | ⬛ | só types/index.ts (morto) |
| `src/types/product-catalog.ts` | 57 | `src/types/magazine.ts:10` | ✅ | — |
| `src/types/product.ts` | 2 | `src/types/simulation.ts:20` | 🟨 | só `ProductColor` sobrevive via types/simulation.ts |
| `src/types/quote.ts` | 7 | `src/types/index.ts:16` | ✅ | — |
| `src/types/ramo-atividade.ts` | 7 | `src/components/filters/filter-panel/sections/RamosFilter.tsx:8` | ✅ | — |
| `src/types/simulation.ts` | 11 | `src/types/domain/index.ts:9` | ✅ | — |
| `src/types/stock.ts` | 19 | `src/components/inventory/StockFilterToolbar.tsx:42` | ✅ | — |
| `src/types/tecnica-unificada.ts` | 12 | `src/types/index.ts:11` | ✅ | — |
| `src/utils/cloudflare-stream.ts` | 2 | `src/components/admin/products/ProductVideoGallery.tsx:18` | ✅ | — |
| `src/utils/cnpj-errors.ts` | 2 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:10` | ✅ | — |
| `src/utils/cnpj-lookup.ts` | 2 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:12` | ✅ | — |
| `src/utils/cnpj-schema.ts` | 3 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:9` | ✅ | — |
| `src/utils/color-group-hex.ts` | 2 | `src/components/products/ProductListItem.tsx:45` | ✅ | — |
| `src/utils/color-image-resolver.ts` | 10 | `src/components/catalog/CatalogContent.tsx:2` | ✅ | — |
| `src/utils/color-matching.ts` | 1 | `src/hooks/simulation/useLogoColorAnalysis.ts:9` | ✅ | — |
| `src/utils/color-variant-carousel.ts` | 3 | `src/components/products/ProductCard.tsx:50` | ✅ | — |
| `src/utils/colorSorting.ts` | 4 | `src/components/products/ProductQuickView.tsx:38` | ✅ | — |
| `src/utils/currency.ts` | 1 | `src/components/quotes/QuoteKanbanBoard.tsx:46` | 🟨 | duplica lib/format.ts; 1 consumidor |
| `src/utils/excelExport.ts` | 1 | `src/pages/quotes/QuotesListPage.tsx:323` | ✅ | — |
| `src/utils/image-utils.ts` | 46 | `src/components/catalog/BulkVariantWizard.tsx:28` | ✅ | — |
| `src/utils/imageProxy.ts` | 28 | `src/components/admin/products/image-gallery/ImageGrid.tsx:23` | ✅ | — |
| `src/utils/laser-logo-processor.ts` | 1 | `src/components/mockup/logo-editor/useLogoProcessing.ts:2` | ✅ | — |
| `src/utils/masks.ts` | 24 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:8` | ✅ | — |
| `src/utils/performance-budget.ts` | 1 | `src/main.tsx:25` | ✅ | — |
| `src/utils/performance.ts` | 4 | `src/components/effects/PageTransition.tsx:4` | ✅ | — |
| `src/utils/personalizationExport.ts` | 1 | `src/components/products/ProductPersonalizationRules.tsx:32` | ✅ | — |
| `src/utils/pixMask.ts` | 4 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:4` | ✅ | — |
| `src/utils/price-freshness.ts` | 6 | `src/components/admin/products/sections/ProductPriceSection.tsx:8` | ✅ | — |
| `src/utils/product-colors.ts` | 2 | `src/hooks/products/useProducts.ts:9` | ✅ | — |
| `src/utils/product-mapper.ts` | 3 | `src/hooks/products/useProducts.ts:10` | ✅ | — |
| `src/utils/product-search.ts` | 9 | `src/components/search/useGlobalSearch.ts:22` | ✅ | — |
| `src/utils/product-sorting.ts` | 5 | `src/components/products/ProductTableView.tsx:26` | ✅ | — |
| `src/utils/productPdfExport.ts` | 1 | `src/pages/admin/AdminProductFormPage.tsx:607` | ✅ | — |
| `src/utils/proposalPdfReactGenerator.ts` | 4 | `src/components/quotes/PdfGenerationDialog.tsx:30` | ✅ | — |
| `src/utils/quote-number.ts` | 2 | `src/hooks/quotes/useNextQuoteNumberPreview.ts:9` | ✅ | — |
| `src/utils/security-audit.ts` | 0 | — | ⬛ | — |
| `src/utils/undoToast.tsx` | 16 | `src/components/quotes/QuoteBuilderSummaryColumn.tsx:97` | ✅ | — |
| `src/utils/viacep.ts` | 2 | `src/components/admin/suppliers-manager/useSuppliersManager.ts:11` | ✅ | — |
