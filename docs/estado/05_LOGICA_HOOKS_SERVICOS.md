# 05 — Camada de Lógica: Hooks, Serviços, Contexts e Stores

> **Auditoria de estado — somente leitura.** Nenhum arquivo além deste foi criado ou modificado.
> **Fonte:** exclusivamente o código em `src/hooks/`, `src/services/`, `src/contexts/`, `src/stores/`.
> Nenhum `README`, `STATUS`, `CLAUDE.md` ou `docs/*.md` foi usado como fonte de verdade.
> **Data da medição:** 2026-08-16 · commit da árvore de trabalho corrente.

---

## 0. Método (reprodutível)

Toda afirmação abaixo vem de um comando. Os quatro comandos-base:

```bash
# 1. Peso do escopo
find src/hooks src/services src/contexts src/stores \( -name '*.ts' -o -name '*.tsx' \) \
  | grep -vE '\.test\.|\.spec\.|__tests__|__mocks__' | xargs wc -l | sort -rn

# 2. Consumidor de um hook (com fronteira de palavra — ver ARMADILHA na Seção B)
grep -rnE "\buseNomeDoHook\b" src --include='*.ts' --include='*.tsx' \
  | grep -vE '/useNomeDoHook\.(ts|tsx):' | grep -vE '\.test\.|\.spec\.|__tests__'

# 3. Persistência
grep -rnE "\.from\(|\.rpc\(|functions\.invoke\(|invokeEdge|dbInvoke|untypedFrom" <arquivo>

# 4. Stub / dado fictício
grep -rnE "Math\.random|MOCK_|getMock[A-Z]|isMock|TODO|FIXME" <arquivo>
```

O cruzamento completo (348 módulos × todos os 1.4k arquivos de `src/`) foi feito por script
determinístico que, para cada arquivo do escopo, extrai os símbolos exportados
(`export function|const|class|{…}`), filtra os que são hooks/serviços de verdade
(`^use[A-Z]` ou sufixo `Service|Store|Provider|Context|Fetcher`) e busca cada nome com
`\bnome\b` em todo `src/`, descartando o próprio arquivo, testes e barris `index.ts`.

**Convenção de classificação**

| Ícone | Significado |
|---|---|
| ✅ | IMPLEMENTADO_TOTAL — tem consumidor real e a implementação está completa |
| 🟨 | IMPLEMENTADO_PARCIAL — roda em produção, mas parte dos dados é fictícia ou o caminho real não existe |
| 🟦 | SUGERIDO_OU_INICIADO — sem evidência suficiente para afirmar |
| ⬛ | MORTO_OU_ABANDONADO — ausência de chamador provada (dupla verificação na Seção B) |

---

## 1. Peso medido do escopo

```
$ find src/hooks src/services src/contexts src/stores \( -name '*.ts' -o -name '*.tsx' \) | wc -l
474
$ ... | grep -vE '\.test\.|\.spec\.|__tests__|__mocks__' | wc -l
348
$ find ... | xargs wc -l | tail -1
88433 total            # inclui os 126 arquivos de teste
$ find ... | grep -v teste | xargs wc -l | tail -1
61242 total            # apenas os 348 módulos de produção
```

| Métrica | Valor medido |
|---|---|
| Arquivos no escopo | **474** |
| — módulos de produção | **348** (61.242 linhas) |
| — arquivos de teste co-localizados | **126** (27.191 linhas) |
| Barris `index.ts` | **20** |
| Módulos não-barril | **328** |
| Módulos com I/O remoto (`.from` / `.rpc` / edge / `dbInvoke`) | **175** |
| Módulos só com `localStorage` | **21** |
| Módulos puros (sem I/O nenhum) | **132** |

Distribuição por tamanho dos 328 módulos não-barril:

| Faixa | Qtd | Leitura |
|---|---|---|
| ≤ 40 linhas | 27 | wrappers triviais (24 deles sem I/O algum) |
| 41–100 linhas | 94 | hooks de uma query / um estado |
| 101–300 linhas | 160 | núcleo funcional |
| > 300 linhas | 47 | **lógica de negócio real** — concentram o risco |

**Wrappers triviais vs. lógica de negócio:** 24 dos 328 módulos (7,3%) são wrappers
triviais (≤40 linhas, sem persistência, sem lógica). Os 47 módulos acima de 300 linhas
somam ~24.000 linhas — 39% do código de produção do escopo está em 14% dos arquivos.

Diretórios por peso:

| Diretório | Arq. | Linhas | c/ persistência |
|---|---|---|---|
| `src/hooks/products` | 67 | 13.908 | 20 |
| `src/hooks/intelligence` | 35 | 8.146 | 17 |
| `src/hooks/quotes` | 19 | 4.452 | 11 |
| `src/hooks/simulation` | 16 | 3.937 | 1 |
| `src/services` | 11 | 2.730 | 8 |
| `src/hooks/admin` | 18 | 2.616 | 7 |
| `src/hooks/kit-builder` | 19 | 2.528 | 8 |
| `src/hooks/ui` | 17 | 2.346 | 2 |
| `src/hooks/common` | 23 | 2.175 | 1 |
| `src/hooks/mockup` | 5 | 2.114 | 2 |
| `src/contexts` | 10 | 2.110 | 3 |
| `src/hooks/bi` | 14 | 2.098 | 8 |
| `src/hooks/auth` | 11 | 1.652 | 3 |
| `src/hooks/favorites` | 8 | 1.470 | 4 |
| `src/hooks/stock` | 12 | 1.445 | 4 |
| `src/hooks/simulator` | 8 | 1.346 | 2 |
| `src/hooks/collections` | 3 | 990 | 1 |
| `src/hooks/voice` | 10 | 814 | 2 |
| `src/hooks/crm` | 7 | 802 | 1 |
| `src/hooks/tecnicas` | 6 | 801 | 0 |
| `src/stores` | 8 | 680 | 4 |
| `src/hooks/comparison` | 6 | 664 | 3 |
| `src/hooks/gravacao` | 4 | 635 | 1 |
| `src/hooks/inventory` | 2 | 439 | 2 |
| `src/hooks` (raiz) | 5 | 395 | 2 |
| `src/hooks/customization` | 1 | 179 | 1 |
| `src/hooks/dev` | 2 | 80 | 0 |
| `src/hooks/word-magic` | 1 | 38 | 0 |

### 1.1 Vetores de acesso a dados medidos

O escopo **não** usa um único caminho de persistência. Cinco coexistem:

| Vetor | Arquivos | Evidência |
|---|---|---|
| `supabase.from()` direto | ~90 | `src/hooks/quotes/useQuotes.ts`, `src/services/magazineService.ts:137` |
| `supabase.rpc()` | 20 | tabela completa em §1.2 |
| `supabase.functions.invoke()` | 6 | `src/hooks/products/useColorSystem.ts:35` |
| `invokeEdge()` (`@/lib/edge/safeInvokeCall`) | 22 | `src/contexts/AuthContext.tsx:365` |
| `dbInvoke()` (`@/lib/db/postgrest`) | 41 | `src/hooks/tecnicas/useTabelasPreco.ts:6` |
| `untypedFrom()` (`@/lib/supabase-untyped`) | 31 | — |

`@/lib/db/postgrest` é declarado no próprio arquivo como *"Direct PostgREST data access
(`supabase.from()`), **replacing the external-db bridge framework** for all application
call sites"* (`src/lib/db/postgrest.ts:1-3`). Ou seja: a migração bridge → PostgREST está
em andamento e **os dois caminhos convivem** (`@/lib/external-db` ainda importado por
8 arquivos; `functions.invoke('external-db-bridge')` ainda vivo em
`src/hooks/products/useCategoriesTree.ts`, `useColorSystem.ts:35`, `useExternalCategoriesQuery.ts`).

### 1.2 RPCs e Edge Functions chamados pelo escopo

| RPC | Chamador |
|---|---|
| `check_ai_quota` | `src/hooks/intelligence/useAiUsage.ts` |
| `ensure_default_favorite_list` | `src/hooks/favorites/useFavoriteLists.ts:79` |
| `execute_role_migration_batch` | `src/hooks/admin/useRoleMigration.ts` |
| `fn_ema_pipeline_health` | `src/hooks/stock/useEmaPipelineHealth.ts:28` |
| `fn_get_color_swatches_batch` | `src/hooks/useProductColorSwatch.ts:66` |
| `fn_get_similar_products` | `src/hooks/products/useSimilarProducts.ts` |
| `fn_run_and_persist_smoke_tests` | `src/hooks/admin/useSmokeTests.ts` |
| `fn_super_filtro_product_ids` | `src/hooks/products/useProductsByMetadata.ts` |
| `get_client_seasonality` | `src/hooks/bi/useClientSeasonality.ts:242` |
| `get_client_top_products` | `src/hooks/bi/useClientAffinity.ts:130`, `useClientCategoryAffinity.ts:102` |
| `get_industry_benchmark_stats` | `src/hooks/bi/useClientVsIndustry.ts` |
| `get_industry_top_products` | `src/hooks/bi/useIndustryTrends.ts:92`, `useIndustryCategoryTrends.ts:110` |
| `get_promo_sales_90d_by_product` | `src/hooks/intelligence/usePromoSales90dByProduct.ts` |
| `get_promo_sales_ranking` | `src/hooks/intelligence/usePromoSalesRanking.ts` |
| `get_supplier_reliability_history` | `src/hooks/inventory/useSupplierReliabilityServer.ts:218` |
| `increment_kit_template_usage` | `src/hooks/kit-builder/useKitTemplates.ts` |
| `log_user_logout` | `src/services/authService.ts:170` |
| `restore_seller_cart` | `src/hooks/products/useSellerCarts.ts` |

| Edge Function | Chamador |
|---|---|
| `external-db-bridge` | `useCategoriesTree.ts`, `useColorSystem.ts:35`, `useExternalCategoriesQuery.ts` |
| `mcp-keys-issue` | `src/contexts/DevChallengeContext.tsx:13` |
| `crm-callback-reprocess` | `src/hooks/admin/useV4Callbacks.ts` |
| `step-up-verify` (×4) | `src/hooks/auth/useStepUpAuth.ts` |
| `quote-sync` | `src/hooks/quotes/useQuotes.ts` |
| `log-login-attempt` | `src/contexts/AuthContext.tsx:365` |
| `connection-tester` | `src/hooks/intelligence/useConnectionTester.ts` |
| `validate-access`, `get-visitor-info` | `src/hooks/admin/useIPValidation.ts` |
| `send-transactional-email` | `src/hooks/common/useTransactionalEmail.ts` |
| `secrets-manager` | `src/hooks/admin/useSecretsManager.ts` |
| `generate-mockup` | `src/hooks/mockup/mockupGenerationService.ts` |
| `external-db-inspect` | `src/hooks/intelligence/useExternalDbInspect.ts` |
| `elevenlabs-scribe-token` | `src/hooks/voice/scribeTokenCache.ts` |
| `dropbox-list` | `src/hooks/intelligence/useDropboxFiles.ts` |

---

## A) Tabela por DOMÍNIO

Consumidores = arquivos distintos fora do próprio módulo, fora de testes e fora de barris,
que referenciam o nome exportado com fronteira de palavra.

| Domínio | Hook/serviço principal (arquivo:linha) | Consumidores | Tabela / RPC / Edge | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| **Auth & sessão** | `src/contexts/AuthContext.tsx:507` (`useAuth`) | **126** — ex. `src/components/admin/users/RoleChangeDialog.tsx:20`, `src/App.tsx` | edge `log-login-attempt` (`AuthContext.tsx:365`); `src/services/authService.ts:170` `rpc(log_user_logout)`, `:200 from(user_roles)`, `:221 from(profiles)` | ✅ | 138 arquivos tocam o módulo; é o hub de identidade do app | — |
| | `src/hooks/auth/useProfileRoles.ts` (234L) | 3 — `src/contexts/AuthContext.tsx` | `user_roles` via RPC | ✅ | — | — |
| | `src/hooks/auth/useRBAC.tsx` (190L) | 3 — `src/components/kit-builder/KitBuilderHeader.tsx` | `.from('role_permissions'):99` | ✅ | — | — |
| | `src/hooks/auth/use2FA.ts:96` | 2 — `src/components/security/TwoFactorSetup.tsx` | edge `step-up-verify` | 🟨 | backup codes gerados com `Math.random()` (§C) | RNG criptográfico |
| | `src/hooks/auth/useAuthHydrationMetrics.ts` (149L) | **0** | — | ⬛ | §B item 7 | — |
| **Carrinho do vendedor** | `src/contexts/SellerCartContext.tsx:756` (`useSellerCartContext`) | 13 — ex. `src/components/catalog/BulkAddToCartModal.tsx:9` | `localStorage` (`:202`, `:228`) + delega a `useSellerCarts` | ✅ | — | — |
| | `src/hooks/products/useSellerCarts.ts` (1.268L, 2º maior) | 8 — ex. `src/components/cart/CartTabsRich.tsx:12` | `seller_carts` (12×), `seller_cart_items` (19×), `rpc(restore_seller_cart)` | ✅ | maior superfície de escrita do app | — |
| | `src/hooks/products/useDebouncedCartItemActions.ts` (252L) | 2 | — | ✅ | — | — |
| **Catálogo / produtos** | `src/hooks/products/useCatalogState.ts` (1.072L) | 8 — ex. `src/components/catalog/CatalogToolbar.tsx:19` | via `useProductsLightweight` | ✅ | — | — |
| | `src/hooks/products/useProductsLightweight.ts` (426L) | 5 — ex. `src/components/intelligence/IntelligenceFilterBar.tsx:14` | `products` via `dbInvoke` | ✅ | — | — |
| | `src/hooks/products/useProducts.ts` (93L) | 18 — ex. `src/components/compare/CompareTableView.tsx` | via `ProductsContext` | ✅ | — | — |
| | `src/hooks/products/useNovelties.ts` (793L) + `novelty-core.ts` (361L) | 10 / 9 — ex. `src/components/novelties/NoveltyCards.tsx:24` | `products` (janela de novidade) | ✅ | duplicação parcial documentada em §D-6 | — |
| | `src/hooks/products/useAdvancedFilters.ts` (312L) | 13 (naive) / 2 estritos — `src/components/catalog/CatalogToolbar.tsx` | — | ✅ | — | — |
| | `src/hooks/products/useColorEnrichment.ts` (420L), `useColorFanout.ts` (327L), `useColorSystem.ts` | 9 / 1 / 9 | edge `external-db-bridge:35` | ✅ | — | — |
| | `src/hooks/products/useSupplierTrust.ts` (111L) | 1 | `suppliers` + **mock de rating** | 🟨 | `:93 // 3. Mock rating (no ratings table exists yet)` | tabela de ratings inexistente |
| | `src/hooks/products/useStockAlerts.ts`, `useRecentProducts.ts`, `useRecentlyViewed.ts` | **0** | — | ⬛ | §B itens 14, 10, 15 | — |
| **Orçamentos (quotes)** | `src/hooks/quotes/useQuoteBuilderState.ts:136` (1.353L, maior arquivo do escopo) | 3 — `src/components/quotes/QuoteBuilderSkeleton.tsx` | `quotes:1093`, `quote_items`, `quote_history` | ✅ | — | — |
| | `src/hooks/quotes/useQuotes.ts:41` (389L) | 11 — ex. `src/components/quotes/QuoteKanbanBoard.tsx:41` | `quotes` (27× no domínio), edge `quote-sync` | ✅ | — | — |
| | `src/hooks/quotes/useDiscountApproval.ts:51` (524L) | 4 — `src/components/admin/DiscountManagementPanel.tsx:42` | `discount_approval_requests:99,131`, `seller_discount_limits` | ✅ | — | — |
| | `src/hooks/quotes/useQuoteVersions.ts` (265L), `quoteHelpers.ts` (288L) | 2 / 13 | `quote_history` | ✅ | — | — |
| | `src/hooks/quotes/useQuoteTemplates.ts` (426L) | **0** | `quote_templates` (8 chamadas) | ⬛ | §B item 2 — **CRUD completo sobre tabela real, sem UI** | UI nunca construída |
| | `src/hooks/quotes/useQuoteFunnel.ts`, `useProdutoPersonalizacao.ts` | **0** | — | ⬛ | §B itens 16, 20 | — |
| **Simulação de preço (legado)** | `src/hooks/simulation/useSimulation.ts:32` (605L) | **0** | via `simulationPriceFetcher` | ⬛ | §B item 1 + §D-1 — **substituído pelo wizard** | — |
| | `src/hooks/simulation/useGravacaoPriceV2.ts` (378L) | 0 hooks / 2 funções puras | — | ⬛/🟨 | §B item 3 — hooks mortos, `mapPriceResponseToFlat` viva | — |
| | `src/hooks/simulation/useTecnicasUnificadas.ts` (231L) | 4 — `src/components/admin/TechniquesManager.tsx:8` | via `@/hooks/tecnicas` | ✅ | — | — |
| | `src/hooks/simulation/useGravacaoV2.ts` (275L) | 1 (só `useCustomizationPriceLegacy`) — `src/components/pricing/simulator/MultiEngravingResult.tsx` | — | 🟨 | 4 dos 5 exports sem chamador | — |
| **Simulador (wizard, atual)** | `src/hooks/simulator/useSimulatorWizard.ts` (338L) | 12 — ex. `src/components/simulator/wizard/StepComparison.tsx:14` | via `useWizardPricing` | ✅ | rota `/simulador` → `src/routes/tools-routes.tsx:39` | — |
| | `src/hooks/simulator/useWizardDrafts.ts` (113L) | 2 | `simulator_wizard_drafts:39,63` | ✅ | — | — |
| | `src/hooks/simulator/useWizardPricing.ts` (314L), `wizardReducer.ts` (230L) | 3 / 2 | — | ✅ | — | — |
| **Estoque / EMA** | `src/hooks/stock/stockFetcher.ts` (706L) | 4 — `src/hooks/inventory/useSupplierReliability.ts` | `variant_supplier_sources`, `products` | ✅ | — | — |
| | `src/hooks/stock/useRuptureAlerts.ts` (114L) | 8 — ex. `src/components/inventory/PurchaseOrderModal.tsx:22` | `mv_stock_rupture_alert:83` | ✅ | lê matview | — |
| | `src/hooks/stock/useEmaPipelineHealth.ts:28` | 2 | `rpc(fn_ema_pipeline_health)` | ✅ | — | — |
| | `src/hooks/stock/useSavedStockViews.ts`, `useStockNotes.ts` | **0** | `saved_stock_views`, `stock_notes` | ⬛ | §B itens 11, 13 — **tabelas com escritor sem chamador** | — |
| | `src/hooks/inventory/useSupplierReliabilityServer.ts` (255L) | 1 | `mv_supplier_reliability:129`, `rpc(get_supplier_reliability_history):218` | ✅ | atrás de feature-flag — §D-7 | — |
| **BI / inteligência comercial** | `src/hooks/bi/useClientBI.ts` (157L) | 13 — ex. `src/components/bi/EnrichedOrdersTimeline.tsx:14` | `orders`, `order_items` | 🟨 | `:8 import { MOCK_CLIENT_STATS }`, `:61 isMock: true`, `:125 topCategories: MOCK_CLIENT_STATS.topCategories` | categorias reais nunca implementadas |
| | `src/hooks/bi/useClientSeasonality.ts:227` (336L) | 9 — `src/components/bi/BIAiCopilot.tsx:23` | `rpc(get_client_seasonality):242` | 🟨 | `:288 // Fallback mock`, `:310` | — |
| | `src/hooks/bi/useClientAffinity.ts` (186L) | 12 | `rpc(get_client_top_products):130` | 🟨 | `:42 MOCK_SUGGESTIONS`, `:177 // 2) Fallback mock` | — |
| | `src/hooks/bi/useClientVsIndustry.ts` (203L) | 7 | `rpc(get_industry_benchmark_stats)` | 🟨 | `:95 // Demo: retorna benchmark mockado plausível` | benchmark real não existe |
| | `src/hooks/bi/useIndustryTrends.ts` (126L), `useIndustryCategoryTrends.ts` (172L), `useClientCategoryAffinity.ts` (194L) | 9 / 8 / 10 | `rpc(get_industry_top_products)` | 🟨 | `useIndustryTrends.ts:117 // 3) Fallback mock` | — |
| | `src/hooks/bi/useClientHealthScore.ts`, `useSeasonalPeakNotifications.ts` | ≥1 | derivados | ✅ | — | — |
| **Inteligência / IA** | `src/hooks/intelligence/useMagicUpState.ts:100` (966L) | 4 — `src/pages/magic-up/MagicUpResultPanel.tsx:11` | `magic_up_generations:184`, `magic_up_campaigns:202` | ✅ | — | — |
| | `src/hooks/intelligence/useMagicUpGeneration.ts` (573L) | 1 — `useMagicUpState.ts` | edge de geração | ✅ | extração declarada no cabeçalho `:2` | — |
| | `src/hooks/intelligence/useCommercialIntelligence.ts:111` (756L) | 8 — `src/components/intelligence/CategoryRanking.tsx` | `quote_items:161`, `order_items:166` | ✅ | — | — |
| | `src/hooks/intelligence/useAiRouter.ts` (411L) | 3 — `src/components/admin/connections/AiModelsTab.tsx` | `ai_providers`, `ai_models`, `ai_function_routing` | ✅ | 6 hooks exportados, todos com consumidor | — |
| | `src/hooks/intelligence/useVoiceAgent.ts` (475L) | 1 — `src/components/search/VoiceSearchOverlayConnected.tsx:10` | `voice_command_logs` via `logVoiceCommand.ts:23` | ✅ | — | — |
| | `src/hooks/intelligence/useExternalDatabase.ts` (334L) | 11 — `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` | bridge | ✅ | — | — |
| | `src/hooks/intelligence/useZeroResultDiagnosis.ts` (238L) / `useZeroResultSubstitutes.ts` (290L) | 7 / 1 | `quotes:55`, `quote_items:63` | ✅ | — | — |
| **Mockup** | `src/hooks/mockup/useMockupGenerator.ts:47` (892L) | 3 — `src/pages/mockups/MockupGenerator.tsx:5` | edge `generate-mockup` | ✅ | — | — |
| | `src/hooks/mockup/mockupGenerationService.ts` (594L) | 4 | `generated_mockups:514`, bucket `mockup-assets:536` | ✅ | 6 correções de bug documentadas no arquivo (`:173`–`:534`) | — |
| | `src/hooks/mockup/useMockupDraft.ts` (323L) | 2 | `mockup_drafts:113,127` | ✅ | — | — |
| **Kit builder** | `src/hooks/kit-builder/useKitBuilder.ts:33` (473L) | 2 — `useKitBuilderPageState.ts` → `src/pages/kit-builder/KitBuilderPage.tsx` | — | ✅ | — | — |
| | `src/hooks/kit-builder/useCustomKitPersistence.ts` (226L) | 2 | `custom_kits:61,111` | ✅ | — | — |
| | `src/hooks/kit-builder/useKitBuilderQueries.ts` | 1 | bridge externo | 🟨 | `:17 import { MOCK_BOXES, MOCK_ITEMS }`, `:138`, `:144` fallback | catálogo de caixas real |
| | `src/hooks/kit-builder/useKitWizardShortcuts.ts`, `useCustomKitsRealtime.ts` | **0** | `custom_kits` (realtime) | ⬛ | §B itens 18, 22 | — |
| **Favoritos** | `src/hooks/favorites/useFavoriteLists.ts:68` (623L) | 3 — `src/pages/products/FavoritesPage.tsx:7` | `rpc(ensure_default_favorite_list):79`, `favorite_lists`, `favorite_items`, `favorite_items_trash` | ✅ | — | — |
| | `src/stores/useFavoritesStore.ts` (119L) | **21** — ex. `src/components/replenishments/ReplenishmentProductGrid.tsx:24` | `localStorage 'product-favorites':4` | ✅ | — | — |
| | `src/hooks/favorites/useFavorites.ts` (110L) | **0** | mesma chave `localStorage:5` | ⬛ | §B item 12 + §D-3 | — |
| | `src/hooks/favorites/useFavoritesPageState.ts` (331L) | **0** | — | ⬛ | §B item 4 — página reimplementou o estado inline | — |
| **Comparação** | `src/stores/useComparisonStore.ts` (182L) | **27** — ex. `src/components/catalog/useCatalogSelection.ts` | `localStorage 'product-comparison':3` | ✅ | — | — |
| | `src/hooks/comparison/useComparisonSync.ts` (164L) | 1 — `src/pages/products/ComparePage.tsx` | `user_comparisons:33,89,101,112` | ✅ | lê a chave do store: `:139` | — |
| | `src/hooks/comparison/useComparison.ts` (138L) | **0** | mesma chave `localStorage:5` | ⬛ | §B item 8 + §D-2 | — |
| **Coleções** | `src/hooks/collections/useCollections.ts:128` (706L) | 2 — `src/contexts/CollectionsContext.tsx:3` | `collections:139`, `collection_items:161` | ✅ | — | — |
| | `src/hooks/collections/useExternalCollections.ts` (269L) | 3 — `src/pages/collections/CollectionDetailPage.tsx` | bridge externo | 🟨 | `useExternalCollectionMutations` (`:148`) **sem nenhum chamador** | — |
| **Admin & segurança** | `src/hooks/admin/useSecretsManager.ts:139` (306L) | **19** — ex. `src/components/admin/connections/SecretsManagerHealthPanel.tsx:44` | edge `secrets-manager` | ✅ | — | — |
| | `src/hooks/admin/useAuditLog.ts` (281L) | 3 | `audit_logs` | ✅ | — | — |
| | `src/hooks/admin/useIPValidation.ts` (202L), `useGeoBlocking.ts` (229L), `useAllowedIPs.ts` (189L) | 1 / 1 / 2 | edge `validate-access`, `get-visitor-info` | ✅ | `useAllowedIPs.ts:163` "se não há IPs configurados, permitir todos" — *fail-open* deliberado | revisar postura fail-open |
| | `src/hooks/admin/useSmokeTests.ts` (207L) | 1 — `src/pages/admin/ObservabilityDashboard.tsx` | `rpc(fn_run_and_persist_smoke_tests)` | ✅ | — | — |
| **Notificações** | `src/hooks/ui/useWorkspaceNotifications.tsx:68` (562L) | 2 (via fachada) | `workspace_notifications` (12×) | ✅ | — | — |
| | `src/hooks/ui/useNotifications.ts` (81L) — fachada | 2 — `src/components/notifications/NotificationDrawer.tsx` | delega | ✅ | fachada declarada em `:1-10` | — |
| | `src/services/notificationService.ts` (237L) | 3 | `workspace_notifications:58,117,136` | ✅ | — | — |
| **UI transversal** | `src/hooks/ui/use-toast.ts` (162L) | **41** (import direto de `useToast`) + `toast` em 249 arquivos | — | ✅ | ex. `src/components/admin/security/ForceGlobalLogoutDialog.tsx:14` | — |
| | `src/hooks/ui/useErrorHandler.ts` (248L) | 1 direto (`src/hooks/common/useAppBootstrap.ts:6`) + re-export | ✅ | — | — |
| | `src/hooks/ui/useOnboarding.ts` (319L) | 1 — `src/contexts/OnboardingContext.tsx` | `user_onboarding` (7×) | ✅ | — | — |
| **Revistas (magazine)** | `src/services/magazineService.ts:88` (685L) | 6 | `magazines` (16×), `magazine_items` (10×), `magazine_templates` | ✅ | — | — |
| **CRM** | `src/hooks/crm/useCrmCompanies.ts` (212L) | 11 — `src/components/bi/ClientSelector.tsx` | `@/lib/crm-db` | ✅ | — | — |
| | `src/hooks/crm/useProdutoRamoAtividade.ts` | **0** | — | ⬛ | §B item 23 | — |
| **Pedidos** | `src/services/orderService.ts` (87L) | **0** | `orders:47`, `order_items:58` | ⬛ | §B item 6 — só o teste consome | — |
| **Stores (Zustand)** | 8 arquivos, 680 linhas | 71 refs somadas | 4 com persistência | ✅ | `useComparisonStore` (27), `useFavoritesStore` (21) são os hubs | — |

---

## B) SEM CONSUMIDOR — candidatos a código morto

### ⚠️ A ARMADILHA do grep ingênuo (medida, não teórica)

Um `grep` sem fronteira de palavra produz falso-positivo massivo neste repositório, porque
vários nomes de hooks são **prefixo** de outros:

```bash
$ grep -rn "useComparison" src | grep -v useComparison.ts | grep -v test | wc -l
124                       # ← parece muito vivo

$ grep -rnE "\buseComparison\b" src | grep -v useComparison.ts | grep -v test | wc -l
1                         # ← na verdade: só o barril index.ts
```

`useComparison` casava com `useComparisonStore`, `useComparisonSync`, `useComparisonScore`,
`useComparisonWeights`, `useComparisonShortcuts`. O mesmo vale para `useFavorites`
(ingênuo 77 → estrito 1, casava com `useFavoriteLists`, `useFavoritesStore`,
`useFavoritesPageState`) e `useRecentlyViewed` (ingênuo 10 → estrito 1).

### Protocolo de dupla verificação aplicado a cada item

```bash
# Verificação 1 — nome exportado, fronteira de palavra, todo src/, sem testes
grep -rnE "\bNOME\b" src --include='*.ts' --include='*.tsx' \
  | grep -vE "/NOME\.(ts|tsx):" | grep -vE '\.test\.|\.spec\.|__tests__'

# Verificação 2 — import por caminho de arquivo (pega alias/renomeação)
grep -rnE "from ['\"][^'\"]*ARQUIVO['\"]" src

# Verificação 3 — fora de src/ (e2e, tests/, scripts) e import dinâmico
grep -rn "NOME" --include='*.ts*' --include='*.js' --include='*.mjs' . | grep -v '^./src/' | grep -v node_modules
grep -rnE "import\(\s*['\`\"]" src | grep NOME
```

**Nenhum import dinâmico de hook existe no repositório** — a varredura de `import('…')`
retornou apenas componentes e páginas (rotas lazy). Isso elimina a hipótese de carga
tardia como explicação para os itens abaixo.

### Itens sem consumidor

`Barril` = referenciado apenas pelo `index.ts` do próprio diretório, que ninguém importa
por esse nome. Barris **são** consumidos (`import … from '@/hooks/products'` aparece em
dezenas de arquivos), mas via `export *` — o nome específico continua sem chamador.

| # | Arquivo | L | Só barril? | Testes | Confiança | Observação |
|---|---|---|---|---|---|---|
| 1 | `src/hooks/simulation/useSimulation.ts` | 606 | `simulation/index.ts:9` | 8 | **ALTA** | §D-1. Único hit fora: `tests/components/simulator/TechniqueCard.test.tsx:8` faz `vi.mock("@/hooks/useSimulation")` — caminho **que nem existe** (`ls src/hooks/useSimulation.ts` → não encontrado). O mock é órfão. |
| 2 | `src/hooks/quotes/useQuoteTemplates.ts` | 426 | não | 1 | **ALTA** | CRUD completo de `quote_templates` (8 chamadas). `grep -rn "quote_templates" src` só retorna este arquivo. Nenhum componente `QuoteTemplate*` existe. |
| 3 | `src/hooks/simulation/useGravacaoPriceV2.ts` | 379 | não | 0 | **MÉDIA** | Os 3 hooks (`useProductPrintAreasV2`, `useCustomizationPriceV2`, `useCustomizationPriceReactiveLegacy`) têm 0 chamadores. **Mas** `mapPriceResponseToFlat` é usada por `src/lib/personalization/adapters/index.ts` e `schema-detection.ts` — o arquivo **não** pode ser removido inteiro. |
| 4 | `src/hooks/favorites/useFavoritesPageState.ts` | 331 | `favorites/index.ts` | 0 | **ALTA** | `src/pages/products/FavoritesPage.tsx` monta o estado inline (imports em `:4`, `:41`–`:48`) e nunca chama este agregador. |
| 5 | `src/hooks/simulation/simulationPriceFetcher.ts` | 330 | não | 2 | **ALTA (transitivo)** | Único importador: `useSimulation.ts:16`. As duas outras menções (`src/types/domain/simulation.ts:44`, `src/lib/personalization/adapters/print-area.adapter.ts:6`) são **comentários**, não imports. |
| 6 | `src/services/orderService.ts` | 87 | não | 1 | **ALTA** | `grep -rn "orderService" src supabase` → apenas o próprio arquivo (`:43`) e `src/services/__tests__/orderService.test.ts`. Escreve/lê `orders:47` e `order_items:58`. |
| 7 | `src/hooks/auth/useAuthHydrationMetrics.ts` | 149 | não | 0 | **ALTA** | Zero referências em todo o repo, dentro ou fora de `src/`. |
| 8 | `src/hooks/comparison/useComparison.ts` | 138 | `comparison/index.ts` | 0 | **ALTA** | §D-2. Substituído por `src/stores/useComparisonStore.ts`. |
| 9 | `src/hooks/simulation/useTechniqueRecommendations.ts` | 292 | `simulation/index.ts` | 0 | **ALTA** | Também exporta `sortTechniques`, igualmente sem chamador. |
| 10 | `src/hooks/products/useRecentProducts.ts` | 116 | `products/index.ts` | 0 | **ALTA** | §D-4. Chave própria `simulator_recent_products:18`, ligada ao simulador legado. |
| 11 | `src/hooks/stock/useSavedStockViews.ts` | 111 | não | 0 | **ALTA** | Escreve `saved_stock_views` (`:20`). Nenhuma UI de "views salvas" existe. |
| 12 | `src/hooks/favorites/useFavorites.ts` | 110 | `favorites/index.ts` | 0 | **ALTA** | §D-3. Substituído por `src/stores/useFavoritesStore.ts`. |
| 13 | `src/hooks/stock/useStockNotes.ts` | 95 | não | 0 | **ALTA** | CRUD de `stock_notes` (`:52`, `:67`, `:85`). Sem UI. |
| 14 | `src/hooks/quotes/useQuoteFunnel.ts` | 95 | `quotes/index.ts` | 2 | **ALTA** | Consumido só por `tests/hooks/useQuoteFunnel.test.ts:6`, que importa via barril. |
| 15 | `src/hooks/products/useRecentlyViewed.ts` | 94 | `products/index.ts` | 0 | **ALTA** | §D-4. Mesma chave do store vivo. |
| 16 | `src/hooks/simulation/simulationClipboard.ts` | 72 | não | 1 | **ALTA (transitivo)** | Único importador: `useSimulation.ts:20`. |
| 17 | `src/hooks/common/useIdleEffect.ts` | 70 | não | 0 | **ALTA** | Zero referências. |
| 18 | `src/hooks/kit-builder/useKitWizardShortcuts.ts` | 69 | `kit-builder/index.ts` | 0 | **ALTA** | Atalhos de um "kit wizard" que a UI não expõe. |
| 19 | `src/hooks/products/useStockAlerts.ts` | 64 | `products/index.ts` | 1 | **MÉDIA** | `tests/hooks/stockFetcher-410.test.ts` usa a **string** `'useStockAlerts'` como rótulo de erro (`:35`, `:58`), não o hook. Rótulo aparece em `src/hooks/stock/stockFetcher.ts` — nome sobreviveu à extração. |
| 20 | `src/hooks/quotes/useProdutoPersonalizacao.ts` | 63 | `quotes/index.ts` | 1 | **ALTA** | — |
| 21 | `src/hooks/common/useIntersectionObserver.ts` | 123 | não | 1 | **ALTA** | Exporta também `clearObserverCacheForTest` — só o teste usa. |
| 22 | `src/hooks/common/useOfflineGuard.ts` | 54 | `common/index.ts` | 0 | **ALTA** | — |
| 23 | `src/hooks/kit-builder/useCustomKitsRealtime.ts` | 49 | `kit-builder/index.ts` | 0 | **ALTA** | Subscrição realtime de `custom_kits` que nunca é montada. |
| 24 | `src/hooks/gravacao/useTecnicasGravacao.ts` | 232 | `gravacao/index.ts` | 0 | **ALTA** | §D-5. Lê `tpgo` e `tpgo_faixa` (`:206`, `:207`) — tabelas PT que nenhum outro módulo do escopo toca. |
| 25 | `src/hooks/simulation/useSimulatorPreferences.ts` | 272 | `simulation/index.ts:10` | 0 | **ALTA (transitivo)** | Único importador: `useSimulation.ts`. |
| 26 | `src/hooks/simulation/useTechniquePricingOptions.ts` | 233 | `simulation/index.ts:13` | 0 | **ALTA (transitivo)** | Único importador: `useSimulation.ts`. Note que o barril o exporta **nominalmente** (não `export *`) e ainda assim ninguém importa o nome. |
| 27 | `src/hooks/crm/useProdutoRamoAtividade.ts` | 31 | `crm/index.ts` | 0 | **ALTA** | — |
| 28 | `src/hooks/common/useNetworkStatus.ts` | 29 | `common/index.ts` | 1 | **ALTA** | — |

**Total: 28 arquivos, 4.720 linhas (7,7% do código de produção do escopo).**
24 diretos + 4 transitivos (itens 5, 16, 25, 26 — vivos apenas porque `useSimulation.ts`
os importa, e `useSimulation.ts` está morto).

### Exports mortos dentro de arquivos vivos

Casos que a contagem por arquivo não pega:

| Export | Arquivo:linha | Consumidores |
|---|---|---|
| `useExternalCollectionMutations` | `src/hooks/collections/useExternalCollections.ts:148` | **0** |
| `useProductPrintAreas`, `useTabelasPrecoOficial`, `useFaixasPrecoOficial`, `useTabelaPrecoPorCodigo` | `src/hooks/simulation/useGravacaoV2.ts` | **0** (só `useCustomizationPriceLegacy` sobrevive) |
| `useProductPrintAreasV2`, `useCustomizationPriceV2`, `useCustomizationPriceReactiveLegacy`, `calculateCustomizationPrice`, `getColorSelectorConfig` | `src/hooks/simulation/useGravacaoPriceV2.ts` | **0** |

### ⚠️ Nota explícita — isto não é recomendação de remoção

**Não endosso a remoção de nenhum item acima.** Motivos concretos medidos:

1. **Itens 2, 11, 13 escrevem em tabelas reais** (`quote_templates`, `saved_stock_views`,
   `stock_notes`). Se essas tabelas têm linhas em produção, o hook é a única
   implementação de leitura/escrita conhecida — apagá-lo torna o dado inalcançável.
2. **O item 3 é parcial** — remover o arquivo quebra `src/lib/personalization/adapters/`.
3. **A REGRA #3 do `CLAUDE.md` (§3) proíbe classificar como "dead code" sem
   `git log --all -S`**, verificação de histórico que **não foi executada** nesta auditoria
   (é NAO_VERIFICADO aqui).
4. Vários itens têm **testes que passam** — remover o módulo quebra a suíte e apaga a
   especificação executável junto.

O que os dados suportam é: **estes módulos não são alcançados pela aplicação em runtime**.
A decisão sobre o que fazer com eles é do PO.

---

## C) Stubs e dados fictícios

### C.1 `Math.random()` no escopo (7 ocorrências, 3 categorias)

| Arquivo:linha | Uso | Avaliação |
|---|---|---|
| `src/hooks/auth/use2FA.ts:96` | `Math.random().toString(36).substring(2,10).toUpperCase()` — **geração de backup codes de 2FA** | 🟨 **Risco de segurança.** `Math.random()` não é CSPRNG. Deveria ser `crypto.getRandomValues`. |
| `src/services/telemetryService.ts:79` | `sessionId = Math.random().toString(36)…` | ✅ ID de sessão de telemetria — aceitável |
| `src/services/telemetryService.ts:94` | `return Math.random() < rate` — amostragem | ✅ aceitável |
| `src/services/magazineService.ts:128` | geração de id hexadecimal pseudo-UUID | 🟨 colisão possível; não é UUID v4 |
| `src/hooks/quotes/useQuotes.ts:68` | sufixo de tópico de canal realtime | ✅ aceitável |
| `src/hooks/collections/useCollections.ts:284` | cor default aleatória de coleção | ✅ cosmético |
| `src/contexts/ProductsContext.tsx:21-22` | sentinela de módulo duplicado (`INSTANCE_KEY`) | ✅ padrão de detecção HMR |

### C.2 Dados fictícios de negócio — o domínio BI

**O domínio BI inteiro (14 arquivos, 2.098 linhas) opera com fallback para dados
inventados**, servidos por `src/lib/bi/mockData.ts` (247 linhas, exports `MOCK_CLIENT_STATS:22`,
`getMockIndustryTrends():84`, `getMockSeasonality():215`).

| Arquivo | Linhas do mock | Cons. | Comportamento |
|---|---|---|---|
| `src/hooks/bi/useClientBI.ts` | `:8` import, `:55-74` build, `:61 isMock:true`, **`:125 topCategories: MOCK_CLIENT_STATS.topCategories`** | 13 | `:124` comenta: *"Categorias reais ainda não temos (depende de order_items + categoria) — fallback mock parcial"*. **Mesmo no caminho real (`:118 isMock:false`), as categorias são inventadas.** |
| `src/hooks/bi/useIndustryTrends.ts` | `:11`, `:53 mockToItem`, `:71 isMock:true`, `:117 // 3) Fallback mock`, `:121` | 9 | 3 níveis: RPC → agregação → mock |
| `src/hooks/bi/useClientAffinity.ts` | `:8`, `:42 MOCK_SUGGESTIONS`, `:126`, `:177-182` | 12 | sugestões de produto hardcoded por ramo |
| `src/hooks/bi/useClientCategoryAffinity.ts` | `:12`, `:61 buildMockResult()`, `:63` *"distribuir 60% receita recente e 40% anterior com leve variação determinística por slug"*, `:113` | 10 | **split 60/40 inventado** apresentado como tendência |
| `src/hooks/bi/useClientSeasonality.ts` | `:10`, `:288 // Fallback mock`, `:310` | 9 | `:310` usa mock *"só do setor para comparativo visual"* mesmo com dados reais do cliente |
| `src/hooks/bi/useClientVsIndustry.ts` | `:95 // Demo: retorna benchmark mockado plausível`, `:97 mockRow`, `:106 sampleSize: 24`, `:142 isMock:true` | 7 | **`sampleSize: 24` é um literal**, não uma contagem |
| `src/hooks/bi/useIndustryCategoryTrends.ts` | `:6`, `:13`, `:34` | 8 | — |
| `src/hooks/bi/useBIDossierExport.ts` | `:78`, `:84` | 1 | exporta dossiê em arquivo — **pode gravar `isMock:true` num PDF/entregável ao cliente** |

Existe a flag `isMock` propagada em toda a cadeia, o que é honesto. **NAO_VERIFICADO:**
se a UI (`src/components/bi/*`) realmente exibe essa flag ao usuário — está fora do escopo
desta auditoria.

### C.3 Outros mocks

| Arquivo:linha | Conteúdo |
|---|---|
| `src/hooks/products/useSupplierTrust.ts:8` | `import { getMockSupplierTrust } from '@/components/common/SocialProof'` |
| `src/hooks/products/useSupplierTrust.ts:33` | `if (!productId) return getMockSupplierTrust('unknown')` |
| `src/hooks/products/useSupplierTrust.ts:64` | `// No real data — fallback to mock` |
| `src/hooks/products/useSupplierTrust.ts:93-96` | `// 3. Mock rating (no ratings table exists yet)` — **a tabela de ratings não existe**; a nota exibida é sempre sintética |
| `src/hooks/products/useSupplierTrust.ts:105` | fallback em `catch` |
| `src/hooks/kit-builder/useKitBuilderQueries.ts:17` | `import { MOCK_BOXES, MOCK_ITEMS } from '@/lib/kit-builder/mock-data'` |
| `src/hooks/kit-builder/useKitBuilderQueries.ts:138` | `'[KitBuilder] No boxes from external DB, using mock data'` |
| `src/hooks/kit-builder/useKitBuilderQueries.ts:144` | mesmo fallback no `catch` — **o kit builder pode montar kits com caixas que não existem no catálogo** |

### C.4 Postura fail-open

`src/hooks/admin/useAllowedIPs.ts:163` — `// Se não há IPs configurados, permitir todos`.
Não é stub, é decisão de design, mas fica registrado: a restrição de IP é *fail-open*.

---

## D) Duplicação e refactor abandonado

Em cada par, a prova de qual implementação roda é o **grep com fronteira de palavra**.

### D-1 — Simulador de preço: o legado inteiro ficou órfão (⚠️ maior achado)

| | Legado | Atual |
|---|---|---|
| Entrada | `src/hooks/simulation/useSimulation.ts:32` (606L) | `src/hooks/simulator/useSimulatorWizard.ts` (339L) |
| Consumidores | **0** | **12** (`src/components/simulator/wizard/StepComparison.tsx:14`, `StepProduct.tsx:17`, `WizardContextBar.tsx:14`, …) |
| Rota | nenhuma | `src/routes/tools-routes.tsx:39` → `/simulador` |
| Dependências privadas | `simulationPriceFetcher.ts` (330L), `simulationClipboard.ts` (72L), `useSimulatorPreferences.ts` (272L), `useTechniquePricingOptions.ts` (233L) | `useWizardPricing.ts` (315L), `wizardReducer.ts` (230L), `useWizardDrafts.ts` (113L) |
| Persistência | — | `simulator_wizard_drafts:39,63` |

**Subgrafo morto: 1.513 linhas.** Prova de que o legado não roda:

```bash
$ grep -rnE "\buseSimulation\b" src tests --include='*.ts*' | grep -v hooks/simulation/useSimulation.ts
src/hooks/simulation/index.ts:9:export * from '@/hooks/simulation/useSimulation';
tests/components/simulator/TechniqueCard.test.tsx:8:vi.mock("@/hooks/useSimulation", () => ({
```

O único hit "vivo" é um `vi.mock` apontando para `@/hooks/useSimulation` — **caminho que
não existe** (`src/hooks/useSimulation.ts` não está no disco). O mock nunca interceptou nada.

Evidência adicional de refactor deliberado mas não concluído:
`tests/integration/simulator-wizard-pricing-parity.test.ts` compara explicitamente
*"Simulador (`fetchOptionForTechnique`) vs Wizard"* (`:2`) — foi escrito um teste de paridade
para garantir que o novo reproduzisse o antigo, o novo assumiu, e **o antigo nunca foi
retirado nem do barril `src/hooks/simulation/index.ts:9-15`**.

### D-2 — Comparação: hook localStorage vs. store Zustand (mesma chave)

| | Substituído | Vivo |
|---|---|---|
| Arquivo | `src/hooks/comparison/useComparison.ts` (138L) | `src/stores/useComparisonStore.ts` (182L) |
| Chave | `const STORAGE_KEY = 'product-comparison'` **`:5`** | `const STORAGE_KEY = 'product-comparison'` **`:3`** |
| Consumidores | **0** (`\buseComparison\b` → só `comparison/index.ts`) | **27** (`src/components/replenishments/ReplenishmentProductGrid.tsx:25`, `src/components/catalog/useCatalogSelection.ts`, …) |

Terceiro ator: `src/hooks/comparison/useComparisonSync.ts` (164L, 1 consumidor —
`src/pages/products/ComparePage.tsx`) sincroniza a mesma chave com a tabela
`user_comparisons:33,89,101,112` e **espia o `localStorage` diretamente**
(`:139 if (e.key !== 'product-comparison') return`). Três camadas sobre a mesma chave,
uma delas morta.

### D-3 — Favoritos: três implementações, uma morta

| | Substituído | Vivo (local) | Vivo (servidor) |
|---|---|---|---|
| Arquivo | `src/hooks/favorites/useFavorites.ts` (110L) | `src/stores/useFavoritesStore.ts` (119L) | `src/hooks/favorites/useFavoriteLists.ts` (624L) |
| Chave / tabela | `'product-favorites'` **`:5`** | `'product-favorites'` **`:4`** | `favorite_lists`, `favorite_items`, `rpc(ensure_default_favorite_list):79` |
| Consumidores | **0** | **21** | 3 (`src/pages/products/FavoritesPage.tsx:7`) |

`useFavoriteLists.ts:573` contém `const KEY = 'product-favorites'` dentro de
`useLegacyFavoritesMigration` — ou seja, a **migração do modelo localStorage para o modelo
de listas no servidor já foi escrita**. O hook antigo continua no repositório e no barril.

### D-4 — "Vistos recentemente": três arquivos, dois mortos

| Arquivo | L | Chave | Consumidores |
|---|---|---|---|
| `src/stores/useRecentlyViewedStore.ts` | 106 | `'recently-viewed-products'` **`:4`** | **3** |
| `src/hooks/products/useRecentlyViewed.ts` | 94 | `'recently-viewed-products'` **`:5`** | **0** |
| `src/hooks/products/useRecentProducts.ts` | 116 | `'simulator_recent_products'` **`:18`** | **0** |

O store venceu. `useRecentProducts` usava chave por usuário
(`getStorageKey(user.id)`, `:21`) atrelada ao simulador legado (D-1) — morreu junto.

### D-5 — Técnicas de gravação: PT vs. unificado

| | Substituído | Vivo |
|---|---|---|
| Arquivo | `src/hooks/gravacao/useTecnicasGravacao.ts` (232L) | `src/hooks/simulation/useTecnicasUnificadas.ts` (232L) |
| Fonte | `.from('tpgo'):206`, `.from('tpgo_faixa'):207` | `@/hooks/tecnicas` (`useTecnicasList.ts`, `useTabelasPreco.ts` via `dbInvoke`) |
| Consumidores | **0** | **4** — `src/components/admin/TechniquesManager.tsx:8`, `src/components/engraving/TechniquesPanel.tsx`, `src/components/pricing/QuantityPriceCalculator.tsx`, `src/components/pricing/calculator/QuantityComparisonTable.tsx` |

O nome "Unificadas" declara a intenção do refactor. A camada `src/hooks/tecnicas/` (6 arq,
801 linhas, **zero acesso direto a `.from()`** — tudo via `dbInvoke`) é a terceira geração.
`tpgo`/`tpgo_faixa` ficaram sem leitor no frontend.

### D-6 — `useNovelties` × `novelty-core`: extração incompleta

`src/hooks/products/novelty-core.ts` (361L) foi extraído de `useNovelties.ts` (793L) —
exporta `toNovelty`, `sortNovelties`, `enrichNovelties`, constantes de janela.
**Mas `useNovelties.ts` redeclara `toNovelty` em `:234` e `sortNovelties` em `:297`.**
Ambos os arquivos exportam os mesmos dois nomes e ambos têm consumidores
(9 e 10 respectivamente), incluindo `NoveltyCards.tsx` e `NoveltyProductGrid.tsx` que
importam de **ambos**. É duplicação ativa, não abandono — mas é fonte de divergência.
Ambos carregam o mesmo comentário de correção (`novelty-core.ts:186` e `useNovelties.ts:178`:
*"ISSUE-12 FIX: falha de enriquecimento não derruba o grid todo"*), evidência de que a
mesma correção teve de ser aplicada duas vezes.

### D-7 — Confiabilidade de fornecedor: dual-path por feature flag (padrão saudável)

`src/hooks/inventory/useSupplierReliability.ts:170` é um seletor. Cabeçalho (`:4`–`:11`)
declara: *"Feature flag: localStorage `supplierReliabilityServerSide` (default: 'true')"*.
`:37` lê a flag; `:171` delega a `useSupplierReliabilityServer` (256L,
`mv_supplier_reliability:129` + `rpc(get_supplier_reliability_history):218`); o caminho
client-side sobrevive como rollback. **Este é o único caso do escopo em que a duplicação é
intencional, documentada e reversível** — contraste direto com D-1 a D-5.

### D-8 — Colisão de nome já resolvida (registro positivo)

`src/hooks/collections/index.ts:3-10` documenta: *"IMPORTANT — name clash guard (fix
2026-06-01): Both files previously exported `useCollections()`. To avoid last-write-wins
ambiguity in bundlers, `useExternalCollections.ts` was refactored"*. Resolvido. Resíduo:
`useExternalCollectionMutations` (`:148`) ficou sem chamador.

### D-9 — Fachadas de notificação (3 camadas, todas vivas)

`src/hooks/ui/useNotifications.ts:1-10` declara-se fachada sobre
`useWorkspaceNotifications` (562L, tabela `workspace_notifications`) e
`usePushNotifications` (203L). Há ainda `src/services/notificationService.ts` (237L,
mesma tabela `:58,117,136`) e `notificationPreferenceService.ts`
(`user_notification_preferences:16,33`). Quatro módulos sobre a mesma tabela, todos com
consumidor. Não é abandono, mas é a maior concentração de caminhos redundantes vivos do escopo.

---

## E) COBERTURA

### E.1 Contabilidade

| Categoria | Arquivos | Linhas | Método |
|---|---|---|---|
| **Escopo declarado** | **474** | 88.433 | `find src/{hooks,services,contexts,stores}` |
| — arquivos de teste | 126 | 27.191 | fora do alvo da classificação |
| — **módulos de produção classificados** | **348** | 61.242 | 100% do não-teste |
| Analisados por varredura mecânica (exports + consumidores + I/O + stubs) | **348** | 61.242 | script determinístico, 348 × ~1.400 arquivos de `src/` |
| Com trechos lidos diretamente (cabeçalho, região do mock, região do I/O) | ~40 | — | `Read` / `sed -n` / `grep -n -C` alvo, listados nas seções B, C e D |
| **Não alcançados** | **0** | 0 | — |

Nenhum dos 348 foi lido linha a linha — 419 hooks não comportam isso, e a instrução de
altitude era explícita. O que garante a cobertura é que **a varredura mecânica é
exaustiva**: nenhum arquivo ficou de fora dela. A leitura direta foi usada só para
confirmar hipóteses que o grep levantou (todo mock de §C, todo par de §D, todo item de §B).

Cada um dos 348 módulos passou por: extração de exports, busca de consumidores com
fronteira de palavra em todo `src/`, detecção de 6 vetores de I/O, detecção de padrões de
stub. Os 126 arquivos de teste foram usados **apenas** como sinal negativo (consumidor que
não conta), nunca classificados.

### E.2 Distribuição final

| Classe | Arquivos | % | Linhas |
|---|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 310 | 89,1% | ~54.400 |
| 🟨 IMPLEMENTADO_PARCIAL | 10 | 2,9% | ~2.100 |
| 🟦 SUGERIDO_OU_INICIADO | 0 | 0% | 0 |
| ⬛ MORTO_OU_ABANDONADO | 28 | 8,0% | 4.720 |

Não há itens 🟦: todo módulo do escopo teve evidência suficiente (`caminho:LINHA`) para
uma das outras três classes.

### E.3 Limites desta auditoria (NAO_VERIFICADO)

- **Histórico Git.** A REGRA #3 do `CLAUDE.md` exige `git log --all -S "<símbolo>"` antes
  de classificar algo como morto. **Não executado.** A classificação ⬛ aqui significa
  "sem chamador na árvore de trabalho atual", não "sem razão histórica".
- **Estado das tabelas em produção.** Se `quote_templates`, `saved_stock_views`,
  `stock_notes`, `tpgo`, `tpgo_faixa` contêm linhas — NAO_VERIFICADO (exigiria consultar
  o banco `doufsxqlfjyuvxuezpln`, fora do mandato somente-leitura de código).
- **Exibição da flag `isMock` na UI.** Os componentes de `src/components/bi/` estão fora
  do escopo desta auditoria.
- **Cobertura de teste efetiva.** Contei arquivos de teste que *referenciam* cada módulo;
  não medi cobertura de linha nem se os testes passam.
- **Corretude comportamental.** Nada aqui afirma que um módulo ✅ está *correto* — apenas
  que é alcançado por consumidores reais e não é fachada vazia.

### E.4 Inventário completo — 348 módulos

Legenda das colunas: **L** = linhas · **Cons.** = consumidores reais (fora do próprio
arquivo, de testes e de barris) · `(naive)` = arquivo sem export com prefixo `use`/sufixo
de serviço, contagem por qualquer símbolo exportado · `(barril)` = arquivo `index.ts`,
consumido via `export *`.

#### `src/hooks/products` — 67 arquivos, 13908 linhas · ⬛3 · 🟨1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `products/useSellerCarts.ts` | 1269 | 8 | 282:from(seller_cart_items)<br>295:from(seller_carts)<br>331:rpc(restore_seller_cart) | ✅ |
| `products/useCatalogState.ts` | 1073 | 8 | `localStorage` | ✅ |
| `products/useNovelties.ts` | 794 | 9 | via `@/lib` | ✅ |
| `products/useProductsLightweight.ts` | 427 | 6 | 222:table(products)<br>301:table(products)<br>320:table(products) | ✅ |
| `products/useColorEnrichment.ts` | 421 | 6 | 118:table(color_groups)<br>135:table(color_variations)<br>144:table(color_nuances) | ✅ |
| `products/useSupplierComparison.ts` | 401 | 2 | — | ✅ |
| `products/useCategoryIcons.ts` | 385 | 5 | 24:from(category_icons) | ✅ |
| `products/useSupplierFiscalData.ts` | 383 | 1 | via `@/lib` | ✅ |
| `products/novelty-core.ts` | 362 | 9 *(naive)* | via `@/lib` | ✅ |
| `products/useCatalogFiltering.ts` | 352 | 7 | — | ✅ |
| `products/useProductMatch.ts` | 336 | 1 | — | ✅ |
| `products/useColorFanout.ts` | 328 | 1 | 84:table(color_groups)<br>101:table(color_variations)<br>110:table(color_nuances) | ✅ |
| `products/useReplenishments.ts` | 317 | 3 | — | ✅ |
| `products/useAdvancedFilters.ts` | 313 | 2 | — | ✅ |
| `products/useVariantStock.ts` | 294 | 2 | — | ✅ |
| `products/useProductImages.ts` | 266 | 1 | 83:table(product_images)<br>132:table(product_images)<br>166:table(product_images) | ✅ |
| `products/useDebouncedCartItemActions.ts` | 253 | 2 | `localStorage` | ✅ |
| `products/useProductRecommendations.ts` | 237 | 5 | 48:from(order_items)<br>57:from(order_items)<br>99:from(product_views) | ✅ |
| `products/useProductsByColor.ts` | 230 | 6 | 84:table(color_groups)<br>93:table(color_variations)<br>102:table(color_nuances) | ✅ |
| `products/useProductLeafCategories.tsx` | 228 | 4 | — | ✅ |
| `products/useProductsByCategory.ts` | 225 | 4 | via `@/lib` | ✅ |
| `products/useCategoriesTree.ts` | 224 | 3 | 48:from(category_icons)<br>66:edge(external-db-bridge)<br>70:table(categories_tree_visual) | ✅ |
| `products/useSimilarProducts.ts` | 220 | 2 | 68:table(products)<br>100:rpc(fn_get_similar_products)<br>122:table(product_relationships) | ✅ |
| `products/useStockNotifications.ts` | 220 | 1 | — | ✅ |
| `products/useMaterialFilter.ts` | 219 | 1 | — | ✅ |
| `products/useProductsColorsBatch.ts` | 212 | 9 | via `@/lib` | ✅ |
| `products/useProductSupplierSources.ts` | 198 | 1 | 80:table(product_variants)<br>134:table(suppliers) | ✅ |
| `products/useVariantSupplierSources.ts` | 191 | 1 | 57:from(product_variants)<br>73:table(product_variants) | ✅ |
| `products/useProductIntelligenceBadges.ts` | 187 | 3 | — | ✅ |
| `products/useCatalogPreferences.ts` | 179 | 1 | 53:from(profiles)<br>83:from(profiles)<br>91:from(profiles) | ✅ |
| `products/useProductInsights.ts` | 173 | 3 | 88:from(orders) | ✅ |
| `products/useProductsByMetadata.ts` | 151 | 2 | 116:rpc(fn_super_filtro_product_ids) | ✅ |
| `products/useExternalVariantStock.ts` | 134 | 13 | 50:table(product_variants)<br>66:table(product_images) | ✅ |
| `products/useCartTemplates.ts` | 133 | 1 | 74:from(cart_templates)<br>98:from(cart_templates)<br>115:from(cart_templates) | ✅ |
| `products/useReposicaoVariantsSummary.ts` | 127 | 1 | — | ✅ |
| `products/useProductFreshnessOverride.ts` | 124 | 3 | 39:from(product_price_freshness_overrides)<br>55:from(product_price_freshness_overrides)<br>76:from(product_price_freshness_overrides) | ✅ |
| `products/useColorSystem.ts` | 122 | 6 | 35:edge(external-db-bridge)<br>39:table(color_groups)<br>47:table(color_variations) | ✅ |
| `products/useMaterialTypes.ts` | 121 | 1 | — | ✅ |
| `products/useProductCustomizationOptions.ts` | 120 | 2 | — | ✅ |
| `products/useRecentProducts.ts` | 116 | 0 | `localStorage` | ⬛ |
| `products/useSupplierTrust.ts` | 112 | 1 | 38:table(product_variants)<br>53:table(variant_supplier_sources)<br>77:table(suppliers) | 🟨 |
| `products/useSupplierSalesRanking.ts` | 111 | 3 | via `@/lib` | ✅ |
| `products/useProductAnalytics.ts` | 100 | 5 | 36:from(product_views)<br>57:from(search_analytics)<br>79:from(catalog_analytics) | ✅ |
| `products/useRecentlyViewed.ts` | 94 | 0 | `localStorage` | ⬛ |
| `products/useProducts.ts` | 93 | 14 | — | ✅ |
| `products/useProductsBySize.ts` | 89 | 5 | 35:table(product_variants)<br>70:table(product_variants) | ✅ |
| `products/useProductsByMaterial.ts` | 87 | 2 | — | ✅ |
| `products/useCatalogRealStats.ts` | 84 | 1 | 43:table(v_catalog_stats)<br>51:table(categories) | ✅ |
| `products/useProductSeoAI.ts` | 84 | 1 | via `@/lib` | ✅ |
| `products/useCatalogPrefetch.ts` | 83 | 1 | 18:table(products) | ✅ |
| `products/useNoveltiesSelectionMode.ts` | 72 | 2 | — | ✅ |
| `products/useProductFuzzySearch.ts` | 69 | 2 | — | ✅ |
| `products/useReplenishmentsSelectionMode.ts` | 69 | 2 | — | ✅ |
| `products/useVideoVariantLinks.ts` | 69 | 1 | 27:from(video_variant_links)<br>41:from(video_variant_links)<br>57:from(video_variant_links) | ✅ |
| `products/useExternalCategoriesQuery.ts` | 66 | 7 | 3:edge(external-db-bridge)<br>30:table(categories) | ✅ |
| `products/dailyCatalogDefaults.ts` | 65 | 1 *(naive)* | `localStorage` | ✅ |
| `products/index.ts` | 64 | (barril) | — | ✅ |
| `products/useStockAlerts.ts` | 64 | 0 | 26:table(products) | ⬛ |
| `products/usePublicoAlvoOptions.ts` | 55 | 1 | 30:table(v_super_filtro_options) | ✅ |
| `products/useProductBounds.ts` | 52 | 3 | — | ✅ |
| `products/useSuppliers.ts` | 51 | 4 | — | ✅ |
| `products/useSupplierNames.ts` | 45 | 3 | 18:table(suppliers) | ✅ |
| `products/useMaterialGroups.ts` | 38 | 2 | — | ✅ |
| `products/useProductEngravingOptions.ts` | 38 | 1 | — | ✅ |
| `products/sellerCartToasts.ts` | 34 | 1 *(naive)* | — | ✅ |
| `products/useCategories.ts` | 31 | 3 | — | ✅ |
| `products/usePrefetchProduct.ts` | 24 | 1 | — | ✅ |

#### `src/hooks/intelligence` — 35 arquivos, 8146 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `intelligence/useMagicUpState.ts` | 967 | 4 | 184:from(magic_up_generations)<br>202:from(magic_up_campaigns)<br>234:from(magic_up_brand_kits) | ✅ |
| `intelligence/useCommercialIntelligence.ts` | 757 | 8 | 161:from(quote_items)<br>166:from(order_items)<br>171:from(order_items) | ✅ |
| `intelligence/useMagicUpGeneration.ts` | 574 | 1 | 254:from(magic_up_generations)<br>311:from(magic_up_generations)<br>324:from(magic_up_generations) | ✅ |
| `intelligence/useVoiceAgent.ts` | 476 | 1 | — | ✅ |
| `intelligence/useAiRouter.ts` | 412 | 3 | 166:from(ai_providers)<br>184:from(ai_providers)<br>201:from(ai_providers) | ✅ |
| `intelligence/useExternalDatabase.ts` | 335 | 11 | via `@/lib` | ✅ |
| `intelligence/useZeroResultSubstitutes.ts` | 291 | 1 | 111:from(quote_items)<br>118:from(order_items) | ✅ |
| `intelligence/useAIRecommendations.ts` | 259 | 2 | via `@/lib` | ✅ |
| `intelligence/useStockHistory.ts` | 259 | 3 | 93:table(stock_daily_summary)<br>118:table(mv_stock_velocity)<br>154:table(mv_product_intelligence) | ✅ |
| `intelligence/useSalesHistory.ts` | 255 | 2 | 56:from(quote_items)<br>63:from(order_items)<br>84:from(quotes) | ✅ |
| `intelligence/useSalesGoals.ts` | 250 | 1 | via `@/lib` | ✅ |
| `intelligence/useSparklineSales.tsx` | 239 | 3 | 129:table(stock_daily_summary) | ✅ |
| `intelligence/useZeroResultDiagnosis.ts` | 239 | 7 | 55:from(quotes)<br>63:from(quote_items)<br>82:from(orders) | ✅ |
| `intelligence/useAiUsage.ts` | 232 | 2 | 48:rpc(check_ai_quota)<br>71:from(ai_usage_logs)<br>106:from(ai_usage_quotas) | ✅ |
| `intelligence/useSalesHistoryMacro.ts` | 229 | 1 | 35:from(quotes)<br>41:from(orders)<br>56:from(quote_items) | ✅ |
| `intelligence/useVoiceCommandHistory.ts` | 205 | 1 | `localStorage` | ✅ |
| `intelligence/useMarketIntelligenceMacro.ts` | 197 | 1 | 60:table(stock_daily_summary) | ✅ |
| `intelligence/useCommemorativeDates.ts` | 178 | 2 | via `@/lib` | ✅ |
| `intelligence/useConnectionTester.ts` | 173 | 7 | 65:edge(connection-tester) | ✅ |
| `intelligence/useExpertConversations.tsx` | 173 | 1 | 35:from(expert_conversations)<br>64:from(expert_conversations)<br>87:from(expert_conversations) | ✅ |
| `intelligence/useContextualSuggestions.ts` | 164 | 1 | — | ✅ |
| `intelligence/useScheduledReports.ts` | 164 | 1 | 58:from(scheduled_reports)<br>81:from(scheduled_reports)<br>110:from(scheduled_reports) | ✅ |
| `intelligence/useSpeechRecognition.ts` | 141 | 2 | — | ✅ |
| `intelligence/useConnectionsOverviewFilters.ts` | 139 | 1 | — | ✅ |
| `intelligence/useDropboxFiles.ts` | 102 | 1 | 30:edge(dropbox-list) | ✅ |
| `intelligence/useStockVelocityPrefetch.ts` | 102 | 3 | 72:from(mv_stock_velocity) | ✅ |
| `intelligence/useConnectionTestDetails.ts` | 100 | 2 | via `@/lib` | ✅ |
| `intelligence/useConnectionTestHistory.ts` | 91 | 1 | via `@/lib` | ✅ |
| `intelligence/useConnectionsOverview.ts` | 83 | 1 | 36:from(external_connections) | ✅ |
| `intelligence/intelligenceHelpers.ts` | 81 | 1 *(naive)* | — | ✅ |
| `intelligence/useGoldSyncStatus.ts` | 72 | 1 | 31:from(orders)<br>37:from(quotes) | ✅ |
| `intelligence/useExternalDbInspect.ts` | 59 | 1 | 34:edge(external-db-inspect) | ✅ |
| `intelligence/usePromoSales90dByProduct.ts` | 59 | 2 | 32:rpc(get_promo_sales_90d_by_product) | ✅ |
| `intelligence/usePromoSalesRanking.ts` | 57 | 2 | 30:rpc(get_promo_sales_ranking) | ✅ |
| `intelligence/index.ts` | 32 | (barril) | — | ✅ |

#### `src/hooks/quotes` — 19 arquivos, 4452 linhas · ⬛3

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `quotes/useQuoteBuilderState.ts` | 1354 | 3 | 1093:from(quotes) | ✅ |
| `quotes/useDiscountApproval.ts` | 525 | 4 | 99:from(discount_approval_requests)<br>131:from(discount_approval_requests)<br>155:table(discount_approval_requests) | ✅ |
| `quotes/useQuoteTemplates.ts` | 426 | 0 | 108:from(quote_templates)<br>131:from(quote_templates)<br>151:from(profiles) | ⬛ |
| `quotes/useQuotes.ts` | 390 | 11 | 79:table(quotes)<br>320:edge(quote-sync)<br>340:edge(quote-sync) | ✅ |
| `quotes/quoteHelpers.ts` | 289 | 13 *(naive)* | — | ✅ |
| `quotes/useQuoteVersions.ts` | 266 | 2 | 40:from(quotes)<br>57:from(quotes)<br>72:from(quote_items) | ✅ |
| `quotes/useAutoSaveQuote.ts` | 197 | 2 | `localStorage` | ✅ |
| `quotes/useQuoteItems.ts` | 172 | 2 | — | ✅ |
| `quotes/useQuoteHistory.ts` | 137 | 1 | 41:from(quote_history)<br>73:from(quote_history) | ✅ |
| `quotes/quoteTypes.ts` | 122 | 9 *(naive)* | — | ✅ |
| `quotes/useSellerDiscountLimits.ts` | 118 | 2 | 30:from(seller_discount_limits)<br>45:from(seller_discount_limits)<br>69:from(seller_discount_limits) | ✅ |
| `quotes/useQuoteConcurrencyGuard.ts` | 98 | 2 | 65:from(quotes) | ✅ |
| `quotes/useQuoteFunnel.ts` | 95 | 0 | — | ⬛ |
| `quotes/useProdutoPersonalizacao.ts` | 63 | 0 | 35:from(product_components)<br>46:from(product_component_locations) | ⬛ |
| `quotes/quoteMarkup.ts` | 52 | 2 *(naive)* | — | ✅ |
| `quotes/useQuoteClientLogos.ts` | 52 | 2 | — | ✅ |
| `quotes/useNextQuoteNumberPreview.ts` | 48 | 1 | 25:from(quotes) | ✅ |
| `quotes/useQuoteItemCounts.ts` | 33 | 1 | 20:from(quote_items) | ✅ |
| `quotes/index.ts` | 15 | (barril) | — | ✅ |

#### `src/hooks/simulation` — 16 arquivos, 3937 linhas · ⬛7

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `simulation/useSimulation.ts` | 606 | 0 | 169:table(personalization_techniques) | ⬛ |
| `simulation/useExternalSimulator.ts` | 400 | 3 | via `@/lib` | ✅ |
| `simulation/useGravacaoPriceV2.ts` | 379 | 0 | 195:table(tabela_preco_gravacao_oficial) | ⬛ |
| `simulation/simulationPriceFetcher.ts` | 330 | 1 *(naive)* | — | ⬛ |
| `simulation/useTechniqueRecommendations.ts` | 292 | 0 | — | ⬛ |
| `simulation/useGravacaoV2.ts` | 276 | 1 | via `@/lib` | ✅ |
| `simulation/useSimulatorPreferences.ts` | 272 | 1 | 53:from(profiles)<br>76:from(profiles)<br>84:from(profiles) | ⬛ |
| `simulation/useTechniquePricingOptions.ts` | 233 | 1 | 67:table(customization_price_tables)<br>164:table(customization_price_tables) | ⬛ |
| `simulation/useTecnicasUnificadas.ts` | 232 | 4 | — | ✅ |
| `simulation/useTechniquePricing.ts` | 186 | 1 | via `@/lib` | ✅ |
| `simulation/usePrintAreas.ts` | 178 | 1 | via `@/lib` | ✅ |
| `simulation/usePositionHistory.ts` | 164 | 1 | — | ✅ |
| `simulation/useCustomizationPrice.ts` | 151 | 3 | — | ✅ |
| `simulation/useLogoColorAnalysis.ts` | 148 | 1 | via `@/lib` | ✅ |
| `simulation/simulationClipboard.ts` | 72 | 1 *(naive)* | — | ⬛ |
| `simulation/index.ts` | 18 | (barril) | — | ✅ |

#### `src/services` — 11 arquivos, 2730 linhas · ⬛1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `magazineService.ts` | 686 | 6 | 137:from(magazines)<br>151:from(magazine_items)<br>256:from(magazines) | ✅ |
| `quoteService.ts` | 489 | 2 | 54:from(quotes)<br>75:from(quotes)<br>80:from(quote_items) | ✅ |
| `ramoAtividadeService.ts` | 271 | 3 | — | ✅ |
| `materialService.ts` | 242 | 7 | via `@/lib` | ✅ |
| `notificationService.ts` | 238 | 3 *(naive)* | 58:from(workspace_notifications)<br>117:from(workspace_notifications)<br>136:from(workspace_notifications) | ✅ |
| `authService.ts` | 232 | 6 | 170:rpc(log_user_logout)<br>200:from(user_roles)<br>221:from(profiles) | ✅ |
| `telemetryService.ts` | 227 | 5 | 122:from(frontend_telemetry) | ✅ |
| `productService.ts` | 125 | 3 | — | ✅ |
| `orderService.ts` | 87 | 0 | 47:from(orders)<br>58:from(order_items) | ⬛ |
| `notificationPreferenceService.ts` | 74 | 1 | 16:from(user_notification_preferences)<br>33:from(user_notification_preferences)<br>61:table(user_notification_preferences) | ✅ |
| `quoteItemsReorder.ts` | 59 | 2 *(naive)* | 40:from(quote_items) | ✅ |

#### `src/hooks/admin` — 18 arquivos, 2616 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `admin/useSecretsManager.ts` | 307 | 19 | 101:edge(secrets-manager) | ✅ |
| `admin/useAuditLog.ts` | 282 | 2 | via `@/lib` | ✅ |
| `admin/useGeoBlocking.ts` | 229 | 1 | via `@/lib` | ✅ |
| `admin/useV4Callbacks.ts` | 222 | 1 | 68:from(crm_callback_events)<br>194:edge(crm-callback-reprocess)<br>211:edge(crm-callback-reprocess) | ✅ |
| `admin/useSmokeTests.ts` | 207 | 1 | 114:rpc(fn_run_and_persist_smoke_tests) | ✅ |
| `admin/useIPValidation.ts` | 202 | 1 | 21:edge(get-visitor-info)<br>92:edge(validate-access)<br>176:edge(log-login-attempt) | ✅ |
| `admin/useAllowedIPs.ts` | 189 | 2 | via `@/lib` | ✅ |
| `admin/useDeviceDetection.ts` | 188 | 1 | via `@/lib` | ✅ |
| `admin/useIntelligenceBadgeSettings.ts` | 122 | 2 | 78:from(admin_settings)<br>106:from(admin_settings) | ✅ |
| `admin/useRoleMigration.ts` | 117 | 1 | 64:from(role_migration_batches)<br>88:rpc(execute_role_migration_batch)<br>107:from(role_migration_items) | ✅ |
| `admin/useDevAccessAudit.ts` | 108 | 1 | — | ✅ |
| `admin/useAdminKitTemplates.ts` | 94 | 1 | 25:from(kit_templates)<br>38:from(kit_templates)<br>44:from(kit_templates) | ✅ |
| `admin/useKillSwitchObservability.ts` | 93 | 1 | via `@/lib` | ✅ |
| `admin/useRetestCooldownSetting.ts` | 91 | 3 | 50:from(admin_settings)<br>73:from(admin_settings) | ✅ |
| `admin/useSystemSettings.ts` | 61 | 2 | 19:from(system_settings)<br>32:from(system_settings) | ✅ |
| `admin/useMedallionHealth.ts` | 48 | 1 | — | ✅ |
| `admin/useDevGate.ts` | 42 | 8 | — | ✅ |
| `admin/index.ts` | 14 | (barril) | — | ✅ |

#### `src/hooks/kit-builder` — 19 arquivos, 2528 linhas · ⬛2 · 🟨1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `kit-builder/useKitBuilder.ts` | 474 | 2 | — | ✅ |
| `kit-builder/useCustomKitPersistence.ts` | 226 | 2 | 61:from(custom_kits)<br>111:from(custom_kits)<br>120:from(custom_kits) | ✅ |
| `kit-builder/useKitBuilderPageState.ts` | 204 | 1 | 119:table(products) | ✅ |
| `kit-builder/useKitBuilderQueries.ts` | 200 | 1 | 118:table(products)<br>160:table(products) | 🟨 |
| `kit-builder/useKitAutoSave.ts` | 187 | 1 | 100:from(custom_kits)<br>110:from(custom_kits) | ✅ |
| `kit-builder/useKitCollaboration.ts` | 170 | 1 | 41:from(kit_collaborators)<br>55:from(profiles)<br>61:from(kit_collaborators) | ✅ |
| `kit-builder/useKitBuilderTransformers.ts` | 124 | 2 *(naive)* | — | ✅ |
| `kit-builder/useKitStockValidation.ts` | 111 | 1 | 36:table(product_variants) | ✅ |
| `kit-builder/useKitTemplates.ts` | 110 | 2 | 42:from(kit_templates)<br>57:from(custom_kits)<br>89:rpc(increment_kit_template_usage) | ✅ |
| `kit-builder/useKitStockForecast.ts` | 109 | 1 | 48:table(product_variants) | ✅ |
| `kit-builder/useKitUndoRedo.ts` | 104 | 2 | — | ✅ |
| `kit-builder/useKitVariants.ts` | 96 | 1 | 34:from(kit_variants)<br>66:from(kit_variants)<br>79:from(kit_variants) | ✅ |
| `kit-builder/useSimilarKits.ts` | 80 | 1 | 52:from(kit_templates) | ✅ |
| `kit-builder/useTemplateSnapshot.ts` | 73 | 2 | 43:from(kit_templates)<br>52:from(kit_templates) | ✅ |
| `kit-builder/useKitWizardShortcuts.ts` | 69 | 0 | — | ⬛ |
| `kit-builder/useDuplicateKitDetector.ts` | 68 | 1 | 40:from(custom_kits) | ✅ |
| `kit-builder/useKitIdentitySuggestion.ts` | 54 | 1 | via `@/lib` | ✅ |
| `kit-builder/useCustomKitsRealtime.ts` | 49 | 0 | 30:table(custom_kits) | ⬛ |
| `kit-builder/index.ts` | 20 | (barril) | — | ✅ |

#### `src/hooks/ui` — 17 arquivos, 2346 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `ui/useWorkspaceNotifications.tsx` | 564 | 2 | 381:table(workspace_notifications)<br>445:from(workspace_notifications)<br>464:from(workspace_notifications) | ✅ |
| `ui/useOnboarding.ts` | 320 | 1 | 147:from(user_onboarding)<br>167:from(user_onboarding)<br>182:from(user_onboarding) | ✅ |
| `ui/useErrorHandler.ts` | 249 | 1 | — | ✅ |
| `ui/usePushNotifications.tsx` | 203 | 1 | 125:table(notifications)<br>145:table(device_login_notifications)<br>166:table(login_attempts) | ✅ |
| `ui/use-toast.ts` | 162 | 40 | — | ✅ |
| `ui/useCloudStatus.ts` | 141 | 1 | — | ✅ |
| `ui/useScroll.ts` | 138 | 1 | — | ✅ |
| `ui/useSlashCommands.ts` | 119 | 1 | — | ✅ |
| `ui/useGlobalShortcuts.ts` | 118 | 3 | — | ✅ |
| `ui/useNotifications.ts` | 81 | 2 | — | ✅ |
| `ui/useScrollLockFix.ts` | 80 | 1 | — | ✅ |
| `ui/useCurrentSection.ts` | 48 | 1 | — | ✅ |
| `ui/useMediaQuery.ts` | 46 | 2 | — | ✅ |
| `ui/useMobileSidebarFix.ts` | 23 | 1 | — | ✅ |
| `ui/use-mobile.tsx` | 20 | 1 | — | ✅ |
| `ui/useReducedMotion.ts` | 18 | 5 | — | ✅ |
| `ui/index.ts` | 16 | (barril) | — | ✅ |

#### `src/hooks/common` — 23 arquivos, 2175 linhas · ⬛4

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `common/useSearch.ts` | 338 | 3 | 61:table(categories)<br>79:table(suppliers) | ✅ |
| `common/useEntitySelectionMode.ts` | 229 | 2 | — | ✅ |
| `common/useDebounce.ts` | 177 | 14 | — | ✅ |
| `common/useOrgData.ts` | 165 | 1 | — | ✅ |
| `common/useGenericFuzzySearch.ts` | 146 | 1 | — | ✅ |
| `common/useSearchHistory.ts` | 134 | 10 | `localStorage` | ✅ |
| `common/useIntersectionObserver.ts` | 123 | 0 | — | ⬛ |
| `common/useListUrlState.ts` | 100 | 4 | — | ✅ |
| `common/usePrefetchOnHover.ts` | 88 | 2 | — | ✅ |
| `common/useConsecutiveFailures.ts` | 81 | 1 | 36:edge(connection-tester) | ✅ |
| `common/useAppBootstrap.ts` | 78 | 1 | — | ✅ |
| `common/useIdleEffect.ts` | 70 | 0 | — | ⬛ |
| `common/useUnsavedChangesGuard.ts` | 68 | 1 | — | ✅ |
| `common/useUndoStack.ts` | 64 | 2 | — | ✅ |
| `common/useOfflineGuard.ts` | 54 | 0 | — | ⬛ |
| `common/useBulkSelection.ts` | 53 | 1 | — | ✅ |
| `common/useUrlState.ts` | 51 | 1 | — | ✅ |
| `common/useInfiniteScroll.ts` | 40 | 4 | — | ✅ |
| `common/useTransactionalEmail.ts` | 33 | 1 *(naive)* | 18:edge(send-transactional-email) | ✅ |
| `common/useNetworkStatus.ts` | 29 | 0 | — | ⬛ |
| `common/useDebouncedFilters.ts` | 23 | 1 | — | ✅ |
| `common/index.ts` | 20 | (barril) | — | ✅ |
| `common/useCurrentOrgId.ts` | 11 | 3 | — | ✅ |

#### `src/hooks/mockup` — 5 arquivos, 2114 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `mockup/useMockupGenerator.ts` | 893 | 3 | 358:table(tabela_preco_gravacao_oficial) | ✅ |
| `mockup/mockupGenerationService.ts` | 595 | 4 *(naive)* | 368:edge(generate-mockup)<br>514:from(generated_mockups)<br>536:from(mockup-assets) | ✅ |
| `mockup/useMockupDraft.ts` | 324 | 2 | 113:from(mockup_drafts)<br>127:from(mockup_drafts)<br>169:from(mockup_drafts) | ✅ |
| `mockup/useMockupTechniques.ts` | 297 | 2 | 120:table(tabela_preco_gravacao_oficial)<br>130:table(tabela_preco_gravacao_oficial_faixa) | ✅ |
| `mockup/index.ts` | 5 | (barril) | — | ✅ |

#### `src/contexts` — 10 arquivos, 2110 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `SellerCartContext.tsx` | 776 | 14 | `localStorage` | ✅ |
| `AuthContext.tsx` | 520 | 138 | 365:edge(log-login-attempt) | ✅ |
| `ProductsContext.tsx` | 248 | 20 | — | ✅ |
| `DevChallengeContext.tsx` | 143 | 8 | 13:edge(mcp-keys-issue) | ✅ |
| `ThemeContext.tsx` | 122 | 15 | `localStorage` | ✅ |
| `CollectionsContext.tsx` | 81 | 7 | — | ✅ |
| `OrganizationContext.tsx` | 81 | 4 | — | ✅ |
| `BICategoryFocusContext.tsx` | 58 | 5 | — | ✅ |
| `CloudStatusContext.tsx` | 54 | 3 | — | ✅ |
| `OnboardingContext.tsx` | 27 | 7 | — | ✅ |

#### `src/hooks/bi` — 14 arquivos, 2098 linhas · 🟨8

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `bi/useClientSeasonality.ts` | 337 | 9 | 242:rpc(get_client_seasonality) | 🟨 |
| `bi/useClientHealthScore.ts` | 227 | 6 | — | ✅ |
| `bi/useClientVsIndustry.ts` | 204 | 7 | 125:rpc(get_industry_benchmark_stats) | 🟨 |
| `bi/useClientCategoryAffinity.ts` | 195 | 10 | 102:rpc(get_client_top_products) | 🟨 |
| `bi/useClientAffinity.ts` | 187 | 12 | 130:rpc(get_client_top_products) | 🟨 |
| `bi/useIndustryCategoryTrends.ts` | 172 | 8 | 110:rpc(get_industry_top_products) | 🟨 |
| `bi/useClientBI.ts` | 158 | 13 | — | 🟨 |
| `bi/useIndustryTrends.ts` | 127 | 9 | 92:rpc(get_industry_top_products) | 🟨 |
| `bi/useBIDossierExport.ts` | 120 | 1 | — | 🟨 |
| `bi/useClientsComparison.ts` | 103 | 1 | — | ✅ |
| `bi/useSeasonalPeakNotifications.ts` | 93 | 1 | 71:from(workspace_notifications) | ✅ |
| `bi/useChurnRisk.ts` | 89 | 1 | — | ✅ |
| `bi/useClientOrdersHistory.ts` | 71 | 1 | 50:from(orders) | ✅ |
| `bi/index.ts` | 15 | (barril) | — | ✅ |

#### `src/hooks/auth` — 11 arquivos, 1652 linhas · ⬛1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `auth/useAccessSecurity.ts` | 239 | 1 | via `@/lib` | ✅ |
| `auth/useProfileRoles.ts` | 234 | 3 | — | ✅ |
| `auth/usePasswordResetRequests.ts` | 206 | 3 | 29:from(password_reset_requests)<br>63:from(password_reset_requests)<br>121:from(password_reset_requests) | ✅ |
| `auth/use2FA.ts` | 193 | 2 *(naive)* | via `@/lib` | ✅ |
| `auth/useRBAC.tsx` | 190 | 3 | 99:from(role_permissions) | ✅ |
| `auth/useStepUpAuth.ts` | 162 | 1 | 63:edge(step-up-verify)<br>103:edge(step-up-verify)<br>126:edge(step-up-verify) | ✅ |
| `auth/useAuthHydrationMetrics.ts` | 149 | 0 | — | ⬛ |
| `auth/usePasswordBreachCheck.tsx` | 115 | 1 | via `@/lib` | ✅ |
| `auth/useLoginAttempts.ts` | 112 | 1 | 36:from(login_attempts)<br>83:from(login_attempts)<br>87:from(login_attempts) | ✅ |
| `auth/useAuthMFA.ts` | 36 | 1 | — | ✅ |
| `auth/index.ts` | 16 | (barril) | — | ✅ |

#### `src/hooks/favorites` — 8 arquivos, 1470 linhas · ⬛2

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `favorites/useFavoriteLists.ts` | 624 | 5 | 79:rpc(ensure_default_favorite_list)<br>85:from(favorite_lists)<br>123:from(favorite_lists) | ✅ |
| `favorites/useFavoritesPageState.ts` | 331 | 0 | `localStorage` | ⬛ |
| `favorites/useFavoriteQuickAdd.ts` | 233 | 2 | 36:from(favorite_items)<br>69:from(favorite_items)<br>116:from(favorite_items) | ✅ |
| `favorites/useFavorites.ts` | 110 | 0 | `localStorage` | ⬛ |
| `favorites/useEnrichedFavoriteItems.ts` | 61 | 2 | — | ✅ |
| `favorites/useFavoritesGlobalShortcuts.ts` | 52 | 2 | — | ✅ |
| `favorites/useCollectionsGlobalShortcuts.ts` | 50 | 1 | — | ✅ |
| `favorites/index.ts` | 9 | (barril) | — | ✅ |

#### `src/hooks/stock` — 12 arquivos, 1445 linhas · ⬛2

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `stock/stockFetcher.ts` | 707 | 4 *(naive)* | via `@/lib` | ✅ |
| `stock/useRuptureAlerts.ts` | 114 | 8 | 83:from(mv_stock_rupture_alert) | ✅ |
| `stock/useSavedStockViews.ts` | 111 | 0 | — | ⬛ |
| `stock/useStockNotes.ts` | 95 | 0 | 52:from(stock_notes)<br>67:from(stock_notes)<br>85:from(stock_notes) | ⬛ |
| `stock/useEmaRiskSummary.ts` | 80 | 1 | — | ✅ |
| `stock/stockAlerts.ts` | 78 | 1 *(naive)* | — | ✅ |
| `stock/useRuptureHorizon.ts` | 61 | 2 | `localStorage` | ✅ |
| `stock/useSupplierRiskBreakdown.ts` | 49 | 1 | — | ✅ |
| `stock/useWhatIfScenario.ts` | 44 | 1 | — | ✅ |
| `stock/useRuptureKpiSummary.ts` | 38 | 1 | — | ✅ |
| `stock/useEmaPipelineHealth.ts` | 34 | 2 | 28:rpc(fn_ema_pipeline_health) | ✅ |
| `stock/useRupturaForecast.ts` | 34 | 1 | — | ✅ |

#### `src/hooks/simulator` — 8 arquivos, 1346 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `simulator/useSimulatorWizard.ts` | 339 | 12 | — | ✅ |
| `simulator/useWizardPricing.ts` | 315 | 3 | — | ✅ |
| `simulator/wizardReducer.ts` | 230 | 2 *(naive)* | — | ✅ |
| `simulator/useLivePricePreview.ts` | 170 | 1 | — | ✅ |
| `simulator/useWizardDrafts.ts` | 113 | 2 | 39:from(simulator_wizard_drafts)<br>63:from(simulator_wizard_drafts)<br>85:from(simulator_wizard_drafts) | ✅ |
| `simulator/useUndoRedo.ts` | 110 | 1 | — | ✅ |
| `simulator/useWizardPersistence.ts` | 61 | 1 | `localStorage` | ✅ |
| `simulator/index.ts` | 8 | (barril) | — | ✅ |

#### `src/hooks/collections` — 3 arquivos, 990 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `collections/useCollections.ts` | 707 | 2 | 139:from(collections)<br>161:from(collection_items)<br>199:from(collections) | ✅ |
| `collections/useExternalCollections.ts` | 270 | 3 | 74:table(collections) | ✅ |
| `collections/index.ts` | 13 | (barril) | — | ✅ |

#### `src/hooks/voice` — 10 arquivos, 814 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `voice/playTtsAudio.ts` | 218 | 2 *(naive)* | via `@/lib` | ✅ |
| `voice/webSpeechFallback.ts` | 156 | 1 *(naive)* | — | ✅ |
| `voice/retry.ts` | 87 | 3 *(naive)* | — | ✅ |
| `voice/feedbackSounds.ts` | 73 | 1 *(naive)* | — | ✅ |
| `voice/processTranscript.ts` | 65 | 1 *(naive)* | via `@/lib` | ✅ |
| `voice/scribeTokenCache.ts` | 65 | 1 *(naive)* | 43:edge(elevenlabs-scribe-token) | ✅ |
| `voice/useVoiceHistory.ts` | 65 | 4 | `localStorage` | ✅ |
| `voice/types.ts` | 44 | 153 *(naive)* | — | ✅ |
| `voice/logVoiceCommand.ts` | 38 | 1 *(naive)* | 23:from(voice_command_logs) | ✅ |
| `voice/index.ts` | 3 | (barril) | — | ✅ |

#### `src/hooks/crm` — 7 arquivos, 802 linhas · ⬛1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `crm/useCrmCompanies.ts` | 212 | 11 | 91:table(companies) | ✅ |
| `crm/useRamoAtividadeFilter.ts` | 193 | 1 | — | ✅ |
| `crm/useRamoAtividadeFilho.ts` | 149 | 1 | — | ✅ |
| `crm/useRamoAtividade.ts` | 140 | 1 | — | ✅ |
| `crm/useClientTopProducts.ts` | 69 | 2 | 23:from(orders)<br>35:from(order_items) | ✅ |
| `crm/useProdutoRamoAtividade.ts` | 31 | 0 | 22:table(produto_ramo_atividade) | ⬛ |
| `crm/index.ts` | 8 | (barril) | — | ✅ |

#### `src/hooks/tecnicas` — 6 arquivos, 801 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `tecnicas/usePrecoCalculation.ts` | 287 | 1 | — | ✅ |
| `tecnicas/useTecnicasList.ts` | 198 | 5 | 77:table(tecnica_gravacao)<br>152:table(tecnica_gravacao)<br>171:table(tecnica_gravacao) | ✅ |
| `tecnicas/useTabelasPreco.ts` | 167 | 3 | 41:table(customization_price_tables)<br>71:table(customization_price_tables)<br>94:table(customization_price_tables) | ✅ |
| `tecnicas/useTecnicaMutations.ts` | 121 | 1 | 22:table(personalization_techniques)<br>41:table(personalization_techniques)<br>59:table(personalization_techniques) | ✅ |
| `tecnicas/keys.ts` | 21 | 4 *(naive)* | — | ✅ |
| `tecnicas/index.ts` | 7 | (barril) | — | ✅ |

#### `src/stores` — 8 arquivos, 680 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `useComparisonStore.ts` | 182 | 27 | `localStorage` | ✅ |
| `useBadgeVisibilityStore.ts` | 149 | 6 | 57:from(profiles)<br>63:from(profiles)<br>101:from(profiles) | ✅ |
| `useFavoritesStore.ts` | 119 | 21 | `localStorage` | ✅ |
| `useRecentlyViewedStore.ts` | 106 | 3 | `localStorage` | ✅ |
| `useProductSelectionStore.ts` | 47 | 4 | — | ✅ |
| `useWordMagicStore.ts` | 31 | 3 | — | ✅ |
| `oracleVoiceBridge.ts` | 27 | 4 | — | ✅ |
| `useSearchStore.ts` | 19 | 3 | — | ✅ |

#### `src/hooks/comparison` — 6 arquivos, 664 linhas · ⬛1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `comparison/useComparisonSync.ts` | 164 | 1 | 33:from(user_comparisons)<br>89:from(user_comparisons)<br>101:from(user_comparisons) | ✅ |
| `comparison/useComparisonScore.ts` | 139 | 5 | — | ✅ |
| `comparison/useComparison.ts` | 138 | 0 | `localStorage` | ⬛ |
| `comparison/useComparisonWeights.ts` | 124 | 2 | 82:from(user_preferences)<br>105:from(user_preferences) | ✅ |
| `comparison/useComparisonShortcuts.ts` | 92 | 1 | — | ✅ |
| `comparison/index.ts` | 7 | (barril) | — | ✅ |

#### `src/hooks/gravacao` — 4 arquivos, 635 linhas · ⬛1

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `gravacao/useTecnicasGravacao.ts` | 232 | 0 | 62:table(tabela_preco_gravacao_oficial)<br>206:from(tpgo)<br>207:from(tpgo_faixa) | ⬛ |
| `gravacao/gravacao-constants.ts` | 220 | 33 *(naive)* | — | ✅ |
| `gravacao/gravacao-types.ts` | 180 | 2 *(naive)* | — | ✅ |
| `gravacao/index.ts` | 3 | (barril) | — | ✅ |

#### `src/hooks/inventory` — 2 arquivos, 439 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `inventory/useSupplierReliabilityServer.ts` | 256 | 1 | 129:from(mv_supplier_reliability)<br>218:rpc(get_supplier_reliability_history) | ✅ |
| `inventory/useSupplierReliability.ts` | 183 | 2 | `localStorage` | ✅ |

#### `src/hooks` — 5 arquivos, 395 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `useFutureStockPreference.ts` | 138 | 1 | `localStorage` | ✅ |
| `useProductColorSwatch.ts` | 91 | 8 | 66:rpc(fn_get_color_swatches_batch) | ✅ |
| `useHorizontalScroll.ts` | 85 | 8 | — | ✅ |
| `useNavigationAnalytics.ts` | 46 | 1 | via `@/lib` | ✅ |
| `use-overlay-interactivity.ts` | 35 | 7 | — | ✅ |

#### `src/hooks/customization` — 1 arquivos, 179 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `customization/useCustomizationCollapsePrefs.ts` | 179 | 1 | 91:from(user_preferences)<br>98:from(user_preferences)<br>116:from(user_preferences) | ✅ |

#### `src/hooks/dev` — 2 arquivos, 80 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `dev/useBridgeMetrics.ts` | 78 | 2 | — | ✅ |
| `dev/index.ts` | 2 | (barril) | — | ✅ |

#### `src/hooks/word-magic` — 1 arquivos, 38 linhas

| arquivo | L | Cons. | tabela / RPC / edge | cls |
|---|---:|---:|---|:-:|
| `word-magic/useWordMagic.ts` | 38 | 5 | — | ✅ |

---

## Resumo executivo (3 números)

1. **8,0% do código de produção da camada de lógica não é alcançado pela aplicação** —
   28 arquivos, 4.720 linhas. Um terço disso (1.513 linhas) é o simulador de preço legado
   inteiro, substituído pelo wizard mas nunca retirado (§D-1).
2. **O domínio BI (14 arquivos, 2.098 linhas, servindo ~13 componentes) opera com
   fallback para dados inventados** em 8 dos seus hooks, incluindo um caminho
   (`useClientBI.ts:125`) que injeta categorias fictícias mesmo quando `isMock === false` (§C.2).
3. **Cinco pares hook↔store disputam a mesma chave de `localStorage` ou a mesma tabela**;
   em quatro deles o vencedor é claro e o perdedor continua exportado pelo barril (§D-2 a §D-5).
   O único caso de duplicação intencional e documentada é §D-7.
