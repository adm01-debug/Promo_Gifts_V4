# 04 — FERRAMENTAS (estado medido)

> **Método:** auditoria somente-leitura, feita exclusivamente sobre o código-fonte
> (`src/**`). Nenhum `.md`, README ou STATUS foi usado como fonte. Toda afirmação
> carrega evidência `caminho:LINHA`. Onde não houve verificação, está marcado
> `NAO_VERIFICADO`.
>
> **Legenda:** ✅ IMPLEMENTADO_TOTAL · 🟨 IMPLEMENTADO_PARCIAL · 🟦 SUGERIDO_OU_INICIADO · ⬛ MORTO_OU_ABANDONADO

---

## 0. Como as ferramentas chegam à tela

O roteamento é centralizado e **lazy**: todas as páginas são declaradas em
`src/routes/lazy-pages.ts` e montadas por família de rota.

| Arquivo de rota | Ferramentas montadas |
|---|---|
| `src/routes/tools-routes.tsx:36-71` | simulador, estoque, kit builder, mockup, magic-up, BI, match, dropbox, cobertura, raio-x, magazine |
| `src/routes/product-routes.tsx:22-38` | produtos, novidades, reposição, favoritos, carrinhos, comparar, coleções |
| `src/routes/admin-routes.tsx:62-150` | admin, segurança, workflows, telemetria, EMA health, kit-templates |

Rotas concretas das ferramentas deste escopo:

- `/estoque` → `src/routes/tools-routes.tsx:40`
- `/montar-kit` → `src/routes/tools-routes.tsx:42`
- `/meus-kits` → `src/routes/tools-routes.tsx:44`
- `/mockup-generator` → `src/routes/tools-routes.tsx:47`
- `/mockups/historico` → `src/routes/tools-routes.tsx:48`
- `/magic-up` → `src/routes/tools-routes.tsx:49`
- `/inteligencia-comercial` → `src/routes/tools-routes.tsx:50`
- `/ferramentas/bi` → `src/routes/tools-routes.tsx:51`
- `/simulador` → `src/routes/tools-routes.tsx:38`
- `/simulador-precos` → `src/routes/tools-routes.tsx:39`
- `/novidades` → `src/routes/product-routes.tsx:32`
- `/reposicao` → `src/routes/product-routes.tsx:33`
- `/colecoes` → `src/routes/product-routes.tsx:36`
- `/tendencias` → `src/routes/admin-routes.tsx:64`
- `/admin/workflows` → `src/routes/admin-routes.tsx:135`

---

## A) Tabela por FERRAMENTA

| # | Ferramenta | Componentes principais (arquivo:linha) | Página que monta (arquivo:linha) | Hook / serviço | Tabela / RPC / edge function | Classe | Evidência | O que falta |
|---|---|---|---|---|---|---|---|---|
| 1 | **Estoque / Dashboard de Variações** | `src/components/inventory/StockDashboard.tsx:1`, `VariantStockTable.tsx:381`, `StockFilterToolbar.tsx:1`, `FutureStockDialog.tsx:1`, `SupplierRiskPanel.tsx:1` | `src/pages/admin/StockDashboardPage.tsx:31` (`<StockDashboard />`) | `useVariantStock` (`src/hooks/products/useVariantStock.ts:18`) → `fetchAndProcessStockData` (`src/hooks/stock/stockFetcher.ts:339-390`) | tabelas Ouro `products`→`v_products_public`, `product_variants`, `variant_supplier_sources`, `suppliers`→`v_suppliers_public` (`stockFetcher.ts:359,366,373,386`; aliases em `src/integrations/supabase/gold-relations.ts:39-42`); alertas em `mv_stock_rupture_alert` (`src/hooks/stock/useRuptureAlerts.ts:83`) | ✅ | fio completo página→hook→fetcher→Gold; invalidação de cache em `StockDashboardPage.tsx:17-20` | — |
| 2 | **Confiabilidade de Fornecedores (aba /estoque)** | `src/components/inventory/supplier-reliability/SupplierReliabilityTab.tsx:1`, `SupplierReliabilityTable.tsx:1` | lazy em `src/components/inventory/StockDashboard.tsx:36-40` | dentro do próprio `SupplierReliabilityTab` | flag `supplierReliability` (`src/lib/feature-flags.ts:45`) | 🟨 | monta e tem flag, mas **NAO_VERIFICADO** qual query alimenta a tabela (não abri o `SupplierReliabilityTab` linha a linha) | confirmar fonte de dados |
| 3 | **Risco preditivo de Ruptura (EMA)** | `src/components/inventory/risk/RupturePanelEma.tsx:128`, `risk/StockRiskHero.tsx:61`, `StockHeroRiskBanner.tsx`, `risk/WhatIfPanel.tsx:24`, `risk/RuptureSparkline.tsx:27`, `PurchaseOrderModal.tsx` | **NENHUMA** — zero import statements em todo `src/` | `useSupplierRiskBreakdown`, `useRupturaForecast`, `useWhatIfScenario`, `useRuptureKpiSummary`, `useEmaRiskSummary` | RPC `fn_ema_risk_summary`, `fn_ema_pipeline_health` (`src/hooks/stock/useEmaRiskSummary.ts:51-52`, `useEmaPipelineHealth.ts:28`) | ⬛ | ver §B, prova de ausência | os painéis existem, a flag `useEmaRupture` está **ligada** (`src/lib/feature-flags.ts:121`) e a descrição afirma que "habilita RupturePanelEma na página /estoque" (`feature-flags.ts:123-124`) — **isso é falso**: nada monta o painel. Só os *badges* EMA por linha estão vivos (`VariantStockTable.tsx:381-391`) |
| 4 | **Gerador de Mockup** | `src/components/mockup/MockupConfigPanel.tsx`, `MockupProductSelector.tsx`, `MultiAreaManager.tsx`, `LogoPositionEditor.tsx`, `MockupResultCard.tsx`, `approval/MockupApprovalTemplate.tsx` | `src/pages/mockups/MockupGenerator.tsx:104` (`useMockupGenerator()`) | `src/hooks/mockup/useMockupGenerator.ts`, `mockupGenerationService.ts` | **edge function `generate-mockup`** (`src/hooks/mockup/mockupGenerationService.ts:368`); persistência em `generated_mockups` (`:250`), storage `mockup-assets` (`:536`), rascunhos em `mockup_drafts` (`useMockupDraft.ts:113`) | ✅ | fio completo, com timeout 60 s e retry de erro transitório (`mockupGenerationService.ts:363-395`) | — |
| 5 | **Histórico de Mockups** | `src/components/mockup/MockupHistoryPanel.tsx` (829 linhas) | `src/pages/mockups/MockupHistoryPage.tsx` (rota `/mockups/historico`) | `mockupGenerationService.ts:119` (`untypedFrom('generated_mockups')`) | `generated_mockups`, `art_file_attachments`, storage `mockup-art-files` | ✅ | — | — |
| 6 | **Assistente IA de Mockup** | `src/components/ai/AIMockupAssistant.tsx:114` | `src/pages/mockups/MockupGenerator.tsx:555` (lazy em `:66-67`) | nenhum | **nenhuma** | 🟦 | **É IA falsa.** `setTimeout(…, 1500)` (`AIMockupAssistant.tsx:102,120`) e resposta sorteada de um array de 4 strings fixas: `responses[Math.floor(Math.random() * responses.length)]` (`AIMockupAssistant.tsx:114`) | ligar a uma edge function real (`expert-chat` ou similar) ou remover a UI |
| 7 | **Kit Builder** | `src/components/kit-builder/WizardSteps.tsx`, `BoxSelector.tsx`, `ItemSelector.tsx`, `KitSummary.tsx`, `KitBuilderHeader.tsx`, `KitHeroPricingCard.tsx`, `KitIsometricPreview.tsx` | `src/pages/kit-builder/KitBuilderPage.tsx:16` (`useKitBuilderPageState()`) | `src/hooks/kit-builder/useKitBuilderPageState.ts`, `useKitBuilderQueries.ts`, `useCustomKitPersistence.ts`, `useKitAutoSave.ts` | `custom_kits` (15 usos em `src/hooks/kit-builder/*`), `kit_templates`, RPC `increment_kit_template_usage`; produtos via `dbInvoke({table:'products'})` (`useKitBuilderQueries.ts:160-171`) | 🟨 | persiste e autossalva | ver §C: **fallback silencioso para `MOCK_BOXES`/`MOCK_ITEMS`** (`useKitBuilderQueries.ts:138,144,176,182`) sem nenhum aviso na UI; **"Montar com IA" descarta o resultado** (`KitBuilderPage.tsx:54`); **"Exportar PDF" é no-op** (`KitBuilderPage.tsx:105`) |
| 8 | **Kit — "Montar com IA"** | `src/components/kit-builder/KitAIPromptDialog.tsx:32`, montado em `KitBuilderHeader.tsx:278` | `src/pages/kit-builder/KitBuilderPage.tsx:36` (via header) | — | **edge function `kit-ai-builder`** (`KitAIPromptDialog.tsx:47`) | 🟨 | a chamada de IA é **real** e a sugestão aparece na tela; mas o `onApply` recebido é `() => {}` (`src/pages/kit-builder/KitBuilderPage.tsx:54`) e ainda assim exibe `toast.success('Sugestão aplicada — refine os detalhes!')` (`KitAIPromptDialog.tsx:68`) | implementar `onAIApply` — hoje o usuário recebe confirmação de sucesso de algo que não aconteceu |
| 9 | **Kit — sugestão de identidade IA** | `src/components/kit-builder/IdentitySuggestionButton.tsx:36` | **NENHUMA** | `src/hooks/kit-builder/useKitIdentitySuggestion.ts:33` | edge function `kit-identity-suggest` | ⬛ | `IdentitySuggestionButton.tsx` tem 0 import statements (§B) | o hook + edge function existem; falta montar o botão |
| 10 | **Biblioteca de Kits (Meus Kits)** | `src/components/kit-library/KitCard.tsx`, `KitLibraryFilters.tsx`, `KitTemplatePreviewDialog.tsx:19`, `RelatedTemplates.tsx`, `KitCategoryChips.tsx`, `KitCardSkeleton.tsx` | `src/pages/kit-builder/KitLibraryPage.tsx:19-23` | `useCustomKitPersistence` (`KitLibraryPage.tsx:25`) | `custom_kits`, `kit_templates` | ✅ | 6/6 arquivos do diretório com consumidor | — |
| 11 | **Simulador (wizard de personalização)** | `src/components/simulator/wizard/StepProduct.tsx`, `StepLocation.tsx`, `StepSpecs.tsx`, `StepComparison.tsx`, `PersonalizationSummary.tsx`, `ConfirmedSummary.tsx`, `WizardMockupPreview.tsx` | `src/pages/tools/SimuladorWizard.tsx:8-21`, render em `:292` | `useSimulatorWizard` (`src/hooks/simulator/useSimulatorWizard.ts`), `useWizardDrafts`, `useWizardPricing`, `wizardReducer.ts` | `simulator_wizard_drafts` (3 usos em `src/hooks/simulator/`) | ✅ | wizard completo, rascunhos persistidos | — |
| 12 | **Simulador de Preços (`/simulador-precos`)** | `src/components/pricing/ProductPriceSimulator.tsx`, `QuantityPriceCalculator.tsx` | `src/pages/tools/PriceSimulatorPage.tsx:54,58` | `useCustomizationPricing` (`QuantityPriceCalculator.tsx:35`) | **NAO_VERIFICADO** (fora do escopo `components/simulator`) | 🟨 | aba "Por Tiragem" recebe `productBasePrice={0}` e `onSelectTechnique={() => {}}` (`PriceSimulatorPage.tsx:58`); ambos são **props vestigiais** — o componente destrutura apenas `{ className }` (`QuantityPriceCalculator.tsx:34`) e ignora as duas | remover as props mortas da interface (`QuantityPriceCalculator.tsx:28,30`) — hoje elas sugerem uma integração que não existe |
| 13 | **Comparação de Cenários (simulador)** | `src/components/simulator/ScenarioComparison.tsx` (311 linhas) | **NENHUMA** | — | — | ⬛ | só o **tipo** `SimulationScenario` é importado (`src/hooks/simulation/useSimulation.ts:30`); o componente nunca é renderizado | — |
| 14 | **BI Comercial (`/inteligencia-comercial`)** | `src/components/intelligence/IntelligenceFilterBar.tsx`, `IntelligenceKPICards.tsx`, `MarketIntelligenceChart.tsx`, `SalesOverviewChart.tsx`, `CategoryRanking.tsx`, `SupplierSales.tsx`, `ZeroResultDiagnosisCallout.tsx` | `src/pages/bi/CommercialIntelligencePage.tsx:5-17`, render em `:261` | `useCommercialKPIs` (`CommercialIntelligencePage.tsx:48`), `useCommercialIntelligence.ts` | `quotes`, `orders`, `quote_items`, `order_items` (`src/hooks/intelligence/useCommercialIntelligence.ts:161-306`); `stock_daily_summary` via `dbInvoke` (`useMarketIntelligenceMacro.ts:58-60`) | 🟨 | fio real ligado | ver §C: `MarketIntelligenceChart` gera série de mercado com `Math.random()` (`:57,67,68`) quando não há dados reais |
| 15 | **BI de Cliente 360 (`/ferramentas/bi`)** | `src/components/bi/ClientOverview360.tsx:47`, `ClientHealthHero.tsx`, `ClientCategoryRadar.tsx`, `ClientSeasonalityHeatmap.tsx`, `ClientVsIndustryComparison.tsx`, `BundleSuggestions.tsx`, `EnrichedOrdersTimeline.tsx` | `src/pages/bi/BusinessIntelligencePage.tsx:27-45` | `useClientBI`, `useClientSeasonality`, `useChurnRisk`, `useClientAffinity`, `useIndustryTrends` (`src/hooks/bi/`) | RPC `get_client_seasonality`, `get_client_top_products`, `get_industry_top_products`, `get_industry_benchmark_stats`, `get_bundle_suggestions`; tabela `orders` | 🟨 | fio real ligado, com "Modo Demo" explícito (`BusinessIntelligencePage.tsx:228,244`) | ver §C: **`useClientBI.ts:125` injeta `MOCK_CLIENT_STATS.topCategories` mesmo no caminho de dados reais** (`isMock: false` em `:118`) — categoria fictícia sem badge |
| 16 | **BI Copiloto ("Pergunte ao BI")** | `src/components/bi/BIAiCopilot.tsx:112` | `src/pages/bi/BusinessIntelligencePage.tsx:40` | inline | **edge function `bi-copilot`** (`BIAiCopilot.tsx:112`) | ✅ | — | — |
| 17 | **Comparador de Clientes** | `src/components/bi/ClientComparator.tsx`, `ClientSelector.tsx` | `src/pages/clients/ClientComparatorPage.tsx` (rota `/ferramentas/bi/comparar`) | `src/hooks/bi/useClientsComparison.ts` | herda `useClientBI` (`useClientsComparison.ts:52`) | 🟨 | monta | herda o mock de `topCategories` do item 15 |
| 18 | **Tendências (`/tendencias`)** | `src/components/intelligence/TrendsHeatmap.tsx`, `ConversionFunnel.tsx`, `UnmetDemandCard.tsx`, `TopCategoriesCard.tsx`, `HotSearchesCard.tsx`, `TrendsInsightsCard.tsx`, `TrendsForecastChart.tsx`, `SavedViewsManager.tsx`, `TrendsTour.tsx`, `RealtimeBadge.tsx` | `src/pages/bi/TrendsPage.tsx` (rota em `src/routes/admin-routes.tsx:64`) | hooks inline nos cards | `search_analytics` (4×), `product_views` (3×), `quotes`, `orders`; **edge function `trends-insights`** | ✅ | modo demo é **honesto**: só com `?demo=1` e com badge "MODO DEMO — dados fictícios para avaliação" (`src/pages/bi/TrendsPage.tsx:461`) | — |
| 19 | **Geração de PDF (Proposta Comercial)** | `src/components/pdf/PropostaComercialTailwind.tsx:12-20` + `proposal/ProposalHeader.tsx`, `ProposalProductTable.tsx`, `ProposalTotals.tsx`, `ProposalNotes.tsx`, `ProposalSellerSignature.tsx`, `ProposalFooter.tsx` | `src/components/quotes/PdfGenerationDialog.tsx:29`; `src/utils/proposalPdfReactGenerator.ts:17` | `src/utils/proposalPdfReactGenerator.ts` (html2canvas + jsPDF) | — (render local) | ✅ | 13/13 arquivos não-teste com consumidor | — |
| 20 | **PDF — template HTML legado** | `src/components/pdf/ProposalHtmlTemplate.tsx:134` + `ProposalSections.tsx` (604 linhas) | `src/pages/quotes/QuoteViewPage.tsx:501` | — | — | 🟨 | **dois** caminhos de template coexistem (React/Tailwind e HTML legado) e ambos estão montados | consolidar; hoje há duplicação de 604+417 linhas com a mesma responsabilidade |
| 21 | **Novidades (`/novidades`)** | `src/components/novelties/NoveltyProductGrid.tsx`, `NoveltyStatsCards.tsx`, `ExpiringNoveltiesWidget.tsx`, `NoveltyCards.tsx`, `VirtualizedNoveltyGrid.tsx` | `src/pages/products/NoveltiesPage.tsx:4-6` | `src/hooks/products/useNovelties.ts` | `products` (via `resolveTable`, `useNovelties.ts:9,389,441,660`), `categories` (`:185`), `suppliers` (`:201`) | 🟨 | fio real ligado | barra de progresso de carregamento é fictícia: `prev + Math.random() * 12 + 3` (`NoveltyProductGrid.tsx:140`) — cosmético |
| 22 | **Reposição (`/reposicao`)** | `src/components/replenishments/ReplenishmentProductGrid.tsx`, `ReplenishmentStatsCards.tsx`, `RecentReplenishmentsWidget.tsx`, `ReplenishmentToolbar.tsx`, `ReplenishmentCards.tsx` | `src/pages/products/ReplenishmentsPage.tsx:4-6` | `useReplenishmentsWithDetails`, `useReplenishmentStats` (`src/hooks/products/useReplenishments.ts`), `useReposicaoVariantsSummary` | RPC `fn_get_reposicao_listing` (`useReplenishments.ts:201`), `fn_get_replenishment_stats` (`:255`), `fn_get_reposicao_variants_summary` (`useReposicaoVariantsSummary.ts:91`) | 🟨 | fio real, 3 RPCs dedicadas | mesmo progresso fictício: `prev + Math.random() * 12 + 3` (`ReplenishmentProductGrid.tsx:64`) |
| 23 | **Coleções (`/colecoes`)** | `src/components/collections/CollectionGridCard.tsx`, `CollectionTableView.tsx`, `CollectionFormDialog.tsx`, `AddToCollectionModal.tsx`, `ShareCollectionDialog.tsx`, `ExportCollectionButton.tsx`, `CollectionsTrashView.tsx`, `CollectionsHeatmap.tsx` | `src/pages/collections/CollectionsPage.tsx:15-22`, `CollectionDetailPage.tsx` | `src/hooks/collections/` | `collections` (8×), `collection_items` (8×), `collection_items_trash` (5×), `collection_products` (4×, untyped); RPC `get_collections_weekly_count`, `get_top_collected_products` | ✅ | 15/15 arquivos com consumidor; lixeira + export + share implementados | — |
| 24 | **Magic Up (gerador de anúncios IA)** | `src/components/magic-up/PromptGenerator.tsx:181`, `AdImageResult.tsx`, `PromptBank.tsx`, `MagicUpCampaignPanel.tsx`, `MagicUpBrandKitPanel.tsx`, `MagicUpVariationComparator.tsx`, `MagicUpQualityScore.tsx` | `src/pages/tools/MagicUp.tsx` → `src/pages/magic-up/MagicUpConfigPanel.tsx`, `MagicUpResultPanel.tsx` | `src/hooks/intelligence/useMagicUpGeneration.ts`, `useMagicUpState.ts` | **edge functions `generate-ad-prompt`** (`PromptGenerator.tsx:181`), **`generate-ad-image`** (`useMagicUpGeneration.ts:166`), **`magic-up-score`** (`:100`); tabelas `magic_up_generations` (9×), `magic_up_campaigns` (3×), `magic_up_brand_kits` (3×) | ✅ | 18/18 arquivos com consumidor; 3 edge functions + 3 tabelas | — |
| 25 | **Expert Chat (assistente conversacional)** | `src/components/expert/ExpertChatDialog.tsx:6`, `chat/useExpertChat.ts:508`, `chat/ChatMessageList.tsx`, `FlowFilterPanel.tsx`, `ProductLinkRenderer.tsx` | `src/components/layout/GlobalOverlay.tsx:44` → `src/components/quotes/QuickQuoteFAB.tsx:216` | `src/components/expert/chat/useExpertChat.ts` | **edge function `expert-chat`** via `fetch` streaming (`useExpertChat.ts:508`); `profiles` (`:165,661,675`), `quotes` (`:369`) | 🟨 | montado globalmente pelo FAB | `ExpertChatDialog.tsx:111` passa `setIsFromVoice={() => {}}` — a integração de voz para o expert está desligada; `ExpertChatButton.tsx` (85 linhas) é ⬛ (§B) |
| 26 | **Notificações** | `src/components/notifications/NotificationDrawer.tsx:718`, `NotificationsBadgeStatsPanel.tsx`, `NotificationPreferences.tsx`, `badge-stats/*` | `src/components/layout/Header.tsx:43` (`NotificationBell`) | `useNotifications` (`src/hooks/ui/useNotifications.ts:51`) → `useWorkspaceNotifications` + `usePushNotifications` | `workspace_notifications` (`src/hooks/ui/useWorkspaceNotifications.tsx:445,464,486,518`) | ✅ | 8/8 arquivos com consumidor; in-app + Web Push | — |
| 27 | **Dashboard Customizável (`/dashboard`)** | `src/components/dashboard/UpcomingDatesWidget.tsx`, `QuickActionsPanel.tsx`, `RecentKitsWidget.tsx`, `MyRecentQuotesWidget.tsx`, `MyDiscountRequestsWidget.tsx`, `MyClientsWidget.tsx` | `src/pages/CustomizableDashboard.tsx:17-22` | inline por widget | `custom_kits`, `quotes`, `orders`, `order_items`, `discount_approval_requests`; **edge function `commemorative-dates`** (`src/hooks/intelligence/useCommemorativeDates.ts:62-63`) | 🟨 | 6 widgets reais, dnd-kit implementado na própria página (`CustomizableDashboard.tsx:2-11`) | `DraggableDashboard.tsx` (463 linhas — framework genérico de widgets) é ⬛ (§B); a página reimplementou o drag do zero |
| 28 | **Workflows IA (`/admin/workflows`)** | `src/components/workflows/WorkflowCanvas.tsx:52`, `WorkflowStepCard.tsx`, `WorkflowEditDialog.tsx`, `workflowConstants.ts` | `src/pages/admin/AdminWorkflowsPage.tsx:32` | nenhum | **NENHUMA** — zero `.from()`, zero `.rpc()`, zero `invoke()` em todo `src/components/workflows/` | 🟦 | estado 100 % local em `useState` (`WorkflowCanvas.tsx:53-59`); "Ativar/Pausar" só troca `status` em memória (`:157-171`); nada é persistido e nenhum agente é executado | persistência + execução; hoje é maquete de UI |
| 29 | **Recomendações IA (painel)** | `src/components/ai/AIRecommendationsPanel.tsx:153` | **NENHUMA** | `useAIRecommendations` (`src/hooks/intelligence/useAIRecommendations.ts:168`) | edge function `ai-recommendations` | ⬛ | 0 import statements (§B). O **hook** está vivo, consumido por `src/components/products/SmartRecommendations.tsx:210` — é o painel que está órfão | — |
| 30 | **Chat IA genérico (`AIChat`)** | `src/components/ai/AIChat.tsx:196` | **NENHUMA** | inline | edge function `expert-chat` | ⬛ | 0 import statements (§B); duplica `src/components/expert/chat/useExpertChat.ts:508` | — |
| 31 | **Navegação por Categorias** | `src/components/categories/CategoryTreeNavigation.tsx`, `CategorySidebarPanel.tsx` | **NENHUMA** | — | — | ⬛ | 785 linhas, 0 consumidores (§B) | — |
| 32 | **Segurança (`/admin/seguranca`)** | `src/components/security/SecurityDashboard.tsx`, `GeoBlockingManager.tsx`, `IPRestrictionManager.tsx`, `TwoFactorSetup.tsx`, `MfaEnrollmentDialog.tsx`, `MfaChallengeDialog.tsx`, `PushNotificationSettings.tsx` | `src/pages/admin/AdminSegurancaPage.tsx` (rota `admin-routes.tsx:120`) | `src/components/security/useSecurityData.ts` | **NAO_VERIFICADO** | 🟨 | 9/10 arquivos com consumidor | `SecuritySettings.tsx` (16 linhas) é ⬛; fonte de dados não verificada |
| 33 | **Status do Sistema (`/admin/status`)** | `src/components/system/CloudStatusBanner.tsx`, `CloudStatusDot.tsx`, `MedallionPipelineCard.tsx`, `RootInteractivityGuard.tsx` | `src/pages/system/SystemStatusPage.tsx` (rota `admin-routes.tsx:141`) | — | **NAO_VERIFICADO** | 🟨 | 4/5 arquivos com consumidor | fonte não verificada |
| 34 | **Saúde do pipeline EMA (`/admin/ema-health`)** | — (página própria) | `src/pages/admin/EmaHealthPage.tsx:52` | `useEmaPipelineHealth` (`src/hooks/stock/useEmaPipelineHealth.ts:28`) | RPC `fn_ema_pipeline_health` | ✅ | única superfície viva do subsistema EMA | — |
| 35 | **Infra transversal** (`errors/`, `loading/`, `effects/`, `shared/`, `layout/`, `auth/`) | `EnhancedErrorBoundary.tsx:77`, `SectionErrorBoundary.tsx`, `ModernSkeletons.tsx`, `PageTransition.tsx`, `Clickable.tsx`, `SidebarReorganized.tsx`, `Header.tsx`, `ProtectedRoute.tsx` | várias (ex.: `src/routes/AppRoutes.tsx`, `MainLayout.tsx:1`) | — | — | ✅ | `shared/` 11/11, `errors/` 7/7, `effects/` 5/5, `loading/` 4/4 com consumidor | apenas `layout/PageHeader.tsx`, `layout/index.ts`, `auth/SupabaseConnectionDebug.tsx` órfãos (§B) |

---

## B) Ferramentas sem página / sem consumidor (prova de ausência)

**Critério de prova:** para cada arquivo, busca por *import statement* que o referencie
(`grep -rE "(import|from|lazy\()[^;]*['\"][^'\"]*/<Nome>['\"]" src/`), excluindo o próprio
arquivo, `__tests__/` e `*.test.*`. Resultado **0** = nenhum módulo do app o carrega.
Barris (`index.ts`) que apenas reexportam foram desconsiderados quando o próprio barril
não tem importador.

### B.1 — Subsistema EMA / Risco de Ruptura (inventory) — ⬛ ~1.480 linhas

| Arquivo | Linhas | Prova |
|---|---|---|
| `src/components/inventory/risk/RupturePanelEma.tsx` | 481 | 0 imports. Únicas menções ao nome estão em comentários (`src/hooks/stock/useRuptureKpiSummary.ts:2`) e no próprio arquivo (`:2,128,481`) |
| `src/components/inventory/StockHeroRiskBanner.tsx` | 303 | 0 imports. Única menção externa é um comentário em `src/lib/feature-flags.ts:65` |
| `src/components/inventory/risk/StockRiskHero.tsx` | 266 | 0 imports |
| `src/components/inventory/risk/WhatIfPanel.tsx` | 99 | 0 imports |
| `src/components/inventory/risk/RuptureSparkline.tsx` | 90 | só importado por `RupturePanelEma.tsx:46` → **morto por transitividade** |
| `src/components/inventory/PurchaseOrderModal.tsx` | 189 | só importado por `RupturePanelEma.tsx:47` → **morto por transitividade** |
| `src/hooks/stock/useSupplierRiskBreakdown.ts` | — | só usado por `RupturePanelEma.tsx:44` |
| `src/hooks/stock/useRuptureKpiSummary.ts` | — | só usado por `RupturePanelEma.tsx:43` |
| `src/hooks/stock/useRupturaForecast.ts` | — | só usado por `StockHeroRiskBanner.tsx:8` |
| `src/hooks/stock/useEmaRiskSummary.ts` | — | só usado por `StockHeroRiskBanner.tsx:7` |
| `src/hooks/stock/useWhatIfScenario.ts` | — | só usado por `WhatIfPanel.tsx:8` |
| `src/hooks/stock/useSavedStockViews.ts` | — | **0 consumidores** em todo `src/` |
| `src/hooks/stock/useStockNotes.ts` | — | **0 consumidores** em todo `src/` (tabela `stock_notes` inacessível pela UI) |

> **Agravante:** a flag `useEmaRupture` está `enabled: true` (`src/lib/feature-flags.ts:121`)
> e sua descrição afirma "Habilita RupturePanelEma + useRuptureAlerts na página /estoque"
> (`:123-124`). Metade disso é verdade: `useRuptureAlerts` roda (`VariantStockTable.tsx:390`),
> `RupturePanelEma` **nunca é montado**.

### B.2 — Kit Builder — ⬛ 1.819 linhas (14 componentes)

Todos com 0 import statements:

| Arquivo | Linhas |
|---|---|
| `src/components/kit-builder/KitComparisonDialog.tsx` | 248 |
| `src/components/kit-builder/KitOccasionSelector.tsx` | 188 |
| `src/components/kit-builder/KitCollaborationPanel.tsx` | 173 |
| `src/components/kit-builder/KitHealthCard.tsx` | 168 |
| `src/components/kit-builder/KitSmartSuggestions.tsx` | 134 |
| `src/components/kit-builder/KitPersonalizationPreview.tsx` | 123 |
| `src/components/kit-builder/KitVariantsManager.tsx` | 116 |
| `src/components/kit-builder/KitTemplates.tsx` | 112 |
| `src/components/kit-builder/IdentitySuggestionButton.tsx` | 112 |
| `src/components/kit-builder/KitOnboardingTour.tsx` | 98 |
| `src/components/kit-builder/SimilarKitsWidget.tsx` | 92 |
| `src/components/kit-builder/KitShortcutsDialog.tsx` | 88 |
| `src/components/kit-builder/KitStockForecastCard.tsx` | 85 |
| `src/components/kit-builder/KitMobileSummaryBar.tsx` | 82 |

Hooks arrastados junto (só consumidos por esses componentes órfãos):
`useKitStockForecast` (só `KitStockForecastCard.tsx:8`), `useSimilarKits` (só `SimilarKitsWidget.tsx:14`),
`useKitVariants` (só `KitVariantsManager.tsx:11`), `useKitIdentitySuggestion` (só `IdentitySuggestionButton.tsx:14`),
`useKitCollaboration` (**0 consumidores** — só reexportado por `src/hooks/kit-builder/index.ts:10`),
`useKitWizardShortcuts` (**0 consumidores** — só `index.ts:17`).
As tabelas `kit_collaborators`, `kit_comments` e `kit_variants` só são tocadas por esses hooks
→ **três tabelas do banco sem nenhuma superfície de UI viva**.

### B.3 — Demais órfãos por diretório

| Diretório | Arquivo | Linhas | Observação |
|---|---|---|---|
| `mockup/` | `TemplateSelector.tsx` | 170 | 0 imports; 0 referências ao nome em todo `src/` |
| `mockup/` | `SaveTemplateDialog.tsx` | 76 | 0 imports (o `SaveTemplateDialog` vivo é outro: `src/components/cart/cart-utils/CartDialogs.tsx:125`) |
| `mockup/` | `GenerateButton.tsx` | 70 | 0 imports (o `GenerateButton` vivo é local: `src/pages/magic-up/MagicUpConfigPanel.tsx:600`) |
| `simulator/` | `TechniqueCard.tsx` | 556 | 0 imports; o `TechniqueCard` vivo é `src/components/products/customization/TechniqueCard.tsx` (`LocationPanel.tsx:19`) |
| `simulator/` | `TechniqueCardHelpers.tsx` | 119 | só importado por `simulator/TechniqueCard.tsx:36` → morto por transitividade |
| `simulator/` | `ScenarioComparison.tsx` | 311 | apenas o **tipo** é importado (`src/hooks/simulation/useSimulation.ts:30`) |
| `simulator/` | `MockupPreview.tsx` | 234 | 0 imports; substituído por `wizard/WizardMockupPreview.tsx` (`WizardMockupPreview.tsx:4` documenta a origem) |
| `simulator/` | `StockAlert.tsx` | 180 | 0 imports (`StockAlert` que aparece no grep é o **tipo** `src/types/stock.ts:248`) |
| `simulator/` | `NicheRecommendationBadge.tsx` | 177 | 0 referências ao nome em todo `src/` |
| `simulator/` | `SimulationPriceSourceBadge.tsx` | 117 | 0 referências ao nome em todo `src/` |
| `intelligence/` | `TopClients.tsx` | 102 | 0 referências |
| `intelligence/` | `SegmentAnalysis.tsx` | 91 | 0 referências |
| `bi/` | `ExportDossierButton.tsx` | 50 | 0 referências (o gerador `src/lib/bi/dossierPdfGenerator.ts` fica sem gatilho de UI) |
| `novelties/` | `NoveltiesSection.tsx` | 294 | 0 imports; menções apenas em comentário (`src/lib/novelty-dates.ts:4`) e numa lista de auditoria de teste |
| `expert/` | `ExpertChatButton.tsx` | 85 | 0 imports (o dialog é aberto pelo `QuickQuoteFAB.tsx:216`) |
| `dashboard/` | `DraggableDashboard.tsx` | 463 | só reexportado por `src/components/dashboard/index.ts:5-14`; **nada importa `@/components/dashboard`** (0 ocorrências) |
| `ai/` | `AIChat.tsx` | 375 | 0 imports fora do barril |
| `ai/` | `AIRecommendationsPanel.tsx` | 334 | 0 imports fora do barril |
| `categories/` | `CategorySidebarPanel.tsx` | 443 | 0 imports |
| `categories/` | `CategoryTreeNavigation.tsx` | 339 | 0 imports |
| `common/` | `StatusTimeline.tsx` | 267 | 0 referências |
| `common/` | `GlassElements.tsx` | 183 | 0 referências |
| `common/` | `UrgencyBadge.tsx` | 100 | 0 referências |
| `common/` | `ImageWithFallback.tsx` | 88 | 0 referências |
| `common/` | `BulkActionsBar.tsx` | 71 | 0 referências (o vivo é `common/BulkSelectionBar.tsx`) |
| `inventory/` | `VariantStockRowActions.tsx` | 336 | 0 imports (tem teste dedicado de 305 linhas testando código morto) |
| `inventory/` | `StockCategoryTreeSelect.tsx` | 214 | 0 imports; menção só em comentário (`src/lib/inventory/stock-filter.ts:80`) |
| `inventory/` | `HealthScoreInfoDialog.tsx` | 113 | 0 imports |
| `layout/` | `PageHeader.tsx` | 58 | 0 imports |
| `layout/` | `index.ts` | 17 | barril sem importador |
| `auth/` | `SupabaseConnectionDebug.tsx` | 112 | 0 imports |
| `security/` | `SecuritySettings.tsx` | 16 | 0 imports |
| `ui/` | `carousel.tsx` | 240 | 0 imports |
| `ui/` | `DataCard.tsx` | 204 | 0 imports |
| `ui/` | `LabeledField.tsx` | 194 | 0 imports |
| `ui/` | `LoadingState.tsx` | 171 | 0 imports |
| `ui/` | `form.tsx` | 167 | 0 imports (shadcn não usado) |
| `ui/` | `StatusBadge.tsx` | 149 | 0 imports |
| `ui/` | `LoadingButton.tsx` | 101 | 0 imports |
| `ui/` | `index.ts` | 4 | barril sem importador |
| `common/` | `EntityBadge/index.ts` | 2 | barril sem importador |

**Total medido de código de ferramenta sem consumidor: ≈ 8.900 linhas** (~9,4 % das ~95.000
do escopo), concentradas em Kit Builder (1.819), inventory/EMA (1.480), simulator (1.694),
ui (1.230) e ai+categories (1.491).

---

## C) Dado fictício / hardcoded (arquivo:linha)

### C.1 — Crítico: mock apresentado como dado real

| # | Local | O que acontece |
|---|---|---|
| C1 | `src/hooks/bi/useClientBI.ts:125` | No ramo de **dados reais** (`isMock: false`, linha `:118`), o campo `topCategories` é preenchido com `MOCK_CLIENT_STATS.topCategories` — categorias fixas ("Garrafas e Squeezes", "Canetas Premium"…, `src/lib/bi/mockData.ts:28-34`). O comentário admite (`:124`: *"Categorias reais ainda não temos… fallback mock parcial"*), mas **a UI não exibe badge de simulação nesse caso** — o badge só aparece quando `bi.isMock === true` (`src/components/bi/ClientOverview360.tsx:78-83`). Propaga para o comparador (`src/hooks/bi/useClientsComparison.ts:52`). |
| C2 | `src/hooks/kit-builder/useKitBuilderQueries.ts:138,144,176,182` | Quando o banco externo devolve 0 caixas/itens **ou lança erro**, o Kit Builder passa a servir `MOCK_BOXES`/`MOCK_ITEMS` (`src/lib/kit-builder/mock-data.ts:8,63` — SKUs `CX-KRAFT-P`, ids `mock-box-1`…). O aviso vai só para o logger (`:137,143`); **nenhum indicador na UI**. Um vendedor pode montar e salvar em `custom_kits` um kit inteiro composto de produtos que não existem. |
| C3 | `src/components/ai/AIMockupAssistant.tsx:102-120` | "Assistente IA" do gerador de mockup (montado em `src/pages/mockups/MockupGenerator.tsx:555`) **não chama IA alguma**: `setTimeout(…, 1500)` simula latência e a resposta é `responses[Math.floor(Math.random() * responses.length)]` sobre um array de 4 frases fixas (`:104-109`). |
| C4 | `src/pages/kit-builder/KitBuilderPage.tsx:54` | `onAIApply={() => {}}`. O diálogo "Montar com IA" chama de verdade a edge function `kit-ai-builder` (`src/components/kit-builder/KitAIPromptDialog.tsx:47`), exibe a sugestão, e ao clicar em aplicar dispara `toast.success('Sugestão aplicada — refine os detalhes!')` (`:68`) — **confirmação de sucesso para uma operação que não ocorre**. |
| C5 | `src/pages/kit-builder/KitBuilderPage.tsx:105` | `onExportPDF={() => {}}`. `KitSummary` repassa a prop ao botão (`src/components/kit-builder/KitSummary.tsx:153`) — botão de exportar PDF do kit sem efeito. |

### C.2 — Mock com `Math.random()` (série não determinística)

| # | Local | O que acontece |
|---|---|---|
| C6 | `src/components/intelligence/MarketIntelligenceChart.tsx:57,67,68` | `generateMockMarketData()` cria a série de estoque/depleção do mercado com `Math.random()`. Fornecedores fictícios com **nomes de aparência real** — "Brasil Brindes", "Master Promo", "Premium Gifts" (`:136-139`). Ativado sempre que `useMarketIntelligenceMacro` volta vazio (`:167`). *Atenuante:* existe badge de demo (`:265,535`). *Agravante:* por ser `Math.random()` e não seed, os números **mudam a cada troca de período** — um gráfico "de mercado" instável. |
| C7 | `src/components/novelties/NoveltyProductGrid.tsx:140` | Barra de progresso de carregamento avança `prev + Math.random() * 12 + 3` a cada 300 ms — não reflete progresso real. Cosmético. |
| C8 | `src/components/replenishments/ReplenishmentProductGrid.tsx:64` | Idem, mesma fórmula. |
| C9 | `src/components/ui/sidebar.tsx:635` | Largura de skeleton randômica (`Math.floor(Math.random() * 40) + 50`%). Cosmético e legítimo. |

### C.3 — Mock sinalizado corretamente (sem ação)

| Local | Observação |
|---|---|
| `src/pages/trends/trends-mock.ts` + `src/pages/bi/TrendsPage.tsx:461` | Modo demo só com `?demo=1` (`trends-mock.ts:223`) e badge explícito "MODO DEMO — dados fictícios para avaliação". **Este é o padrão correto.** |
| `src/lib/bi/demoClient.ts:5-17` | Cliente demo "Acme Brindes Corporativos (Demo)" com id sentinela `demo-client-bi-preview`; selecionado por ação explícita do usuário (`src/pages/bi/BusinessIntelligencePage.tsx:228`) e sinalizado (`:244`). Correto. |
| `src/components/products/StockHistoryChart.tsx:127` | Exibe indicador quando `isDemo` (`src/components/products/useStockChartData.ts:59`). Correto. |
| `src/components/inventory/risk/ProductRiskDetail.tsx:91,99-101,205` | Cai em `generateMockStockData/Velocity/Intelligence` (`src/lib/stock-chart-utils.ts:61,124,212`) quando não há dados; **exibe aviso em `:205`**. Este componente **está montado** (via `SupplierRiskPanel.tsx:16,373` ← `StockDashboard.tsx:44-46,732`), portanto é mock ativo em produção — mas sinalizado. |

### C.4 — Props/handlers vestigiais

| Local | Observação |
|---|---|
| `src/pages/tools/PriceSimulatorPage.tsx:58` | `productBasePrice={0}` e `onSelectTechnique={() => {}}`; `QuantityPriceCalculator` destrutura só `{ className }` (`src/components/pricing/QuantityPriceCalculator.tsx:34`) e ignora ambas as props declaradas em `:28,30`. |
| `src/components/mockup/MultiAreaManager.tsx:156,165` | `onNameChange={() => {}}` e `onRemove={() => {}}` — renomear/remover área não funciona nesse caminho. |
| `src/components/expert/ExpertChatDialog.tsx:111` | `setIsFromVoice={() => {}}` — origem por voz nunca é registrada. |
| `src/components/catalog/BulkAddToCartModal.tsx:143` | `onCreated={() => {}}` — empresa criada no picker não é propagada. |

### C.5 — Ferramenta sem persistência nenhuma

| Local | Observação |
|---|---|
| `src/components/workflows/WorkflowCanvas.tsx:53-59` | O "Workflows IA" (`/admin/workflows`) nasce de `crypto.randomUUID()` em `useState` e morre no unmount. Zero `.from()`, `.rpc()` ou `invoke()` em `src/components/workflows/**`. Os toasts de sucesso (`:92,102,119`) confirmam operações puramente locais. |

---

## D) COBERTURA

### D.1 — Contagem

| Diretório | Arquivos `.ts/.tsx` | (sem teste) | Linhas | Método de verificação |
|---|---|---|---|---|
| `inventory/` | 81 | 41 | 16.537 | grep de importadores em 100 %; leitura parcial de `StockDashboard`, `StockDashboardPage`, `ProductRiskDetail`, `VariantStockTable`, `stockFetcher`, `useVariantStock` |
| `mockup/` | 42 | 40 | 9.124 | grep 100 %; leitura de `mockupGenerationService`, `MockupGenerator` |
| `kit-builder/` | 41 | 41 | 6.081 | grep 100 %; leitura de `KitBuilderPage`, `KitAIPromptDialog`, `KitBuilderHeader`, `useKitBuilderQueries` |
| `kit-library/` | 6 | 6 | 655 | grep 100 %; leitura de `KitLibraryPage` |
| `intelligence/` | 27 | 27 | 5.895 | grep 100 %; leitura de `MarketIntelligenceChart`, `useMarketIntelligenceMacro` |
| `simulator/` | 24 | 24 | 5.436 | grep 100 %; leitura de `SimuladorWizard`, `wizard/index.ts` |
| `bi/` | 22 | 22 | 4.960 | grep 100 %; leitura de `BusinessIntelligencePage`, `ClientOverview360`, `useClientBI`, `mockData` |
| `pdf/` | 32 | 13 | 4.874 | grep 100 %; leitura de exports de `ProposalHtmlTemplate`, `PropostaComercialTailwind` |
| `novelties/` | 16 | 7 | 3.633 | grep 100 %; leitura de `NoveltiesPage`, `NoveltyProductGrid` (trecho) |
| `expert/` | 14 | 14 | 3.105 | grep 100 %; leitura parcial de `useExpertChat`, `ExpertChatDialog` |
| `collections/` | 15 | 15 | 2.890 | grep 100 %; leitura de `CollectionsPage` |
| `magic-up/` | 18 | 18 | 2.705 | grep 100 %; leitura de `useMagicUpGeneration`, `PromptGenerator` (trecho) |
| `replenishments/` | 10 | 9 | 2.178 | grep 100 %; leitura de `ReplenishmentsPage`, `ReplenishmentProductGrid` (trecho) |
| `dashboard/` | 10 | 10 | 2.134 | grep 100 %; leitura de `CustomizableDashboard`, `DraggableDashboard` (trecho) |
| `notifications/` | 8 | 7 | 1.718 | grep 100 %; leitura de `useNotifications` |
| `ai/` | 4 | 4 | 1.049 | grep 100 %; leitura de `AIMockupAssistant` (trecho), `index.ts` |
| `categories/` | 3 | 3 | 785 | grep 100 % |
| `workflows/` | 4 | 4 | 566 | grep 100 %; leitura de `WorkflowCanvas` |
| `effects/` | 5 | 5 | 562 | grep 100 % |
| `loading/` | 4 | 4 | 1.005 | grep 100 % |
| `errors/` | 7 | 3 | 996 | grep 100 % |
| `system/` | 5 | 4 | 801 | grep 100 % |
| `security/` | 10 | 10 | 2.482 | grep 100 % |
| `common/` | 30 | 27 | 4.409 | grep 100 % |
| `shared/` | 11 | 5 | 1.904 | grep 100 % |
| `layout/` | 34 | 17 | 6.197 | grep 100 % |
| `auth/` | 8 | 7 | 1.400 | grep 100 % |
| `ui/` | 73 | 61 | 8.812 | grep 100 % |
| **TOTAL** | **564** | **418** | **≈ 102.900** | |

- **Alcançados por grep de importador:** 564 / 564 (100 % do escopo).
- **Lidos (integral ou trecho substantivo):** 38 arquivos de `src/components/**` + 24 de
  `src/pages/**`, `src/hooks/**`, `src/lib/**`, `src/routes/**`.
- **Não alcançados:** nenhum arquivo do escopo ficou fora do mapeamento de consumidores.

### D.2 — Verificações NÃO feitas (declaradas)

- **Fonte de dados de `supplier-reliability/`** (item A2): `NAO_VERIFICADO`.
- **Fonte de dados de `security/`** (`useSecurityData.ts`) e `system/`: `NAO_VERIFICADO`.
- **Conteúdo das edge functions** (`supabase/functions/**`, 108 diretórios): não auditado —
  este relatório verifica apenas que o frontend *invoca* cada uma, não o que elas fazem.
- **Existência real das tabelas/RPCs citadas no banco `doufsxqlfjyuvxuezpln`:** não consultada
  (auditoria somente de código, sem tocar produção). As tabelas listadas são as que o
  **código pede**.
- **`src/components/ui/`** foi apenas varrido por órfãos; não houve análise funcional.

### D.3 — Lista completa com classificação

**✅ IMPLEMENTADO_TOTAL (13)** — Estoque/Dashboard · Gerador de Mockup · Histórico de Mockups ·
Biblioteca de Kits · Simulador (wizard) · BI Copiloto · Tendências · Geração de PDF (React) ·
Coleções · Magic Up · Notificações · Saúde do pipeline EMA · Infra transversal
(`errors`/`loading`/`effects`/`shared`)

**🟨 IMPLEMENTADO_PARCIAL (11)** — Confiabilidade de Fornecedores (fonte não verificada) ·
Kit Builder (mock silencioso + 2 handlers no-op) · Kit "Montar com IA" (resultado descartado) ·
Simulador de Preços (props vestigiais) · BI Comercial (`Math.random()` no gráfico de mercado) ·
BI Cliente 360 (`topCategories` mock no caminho real) · Comparador de Clientes (herda o mock) ·
PDF template legado (duplicação com o React) · Novidades (progresso fictício) ·
Reposição (progresso fictício) · Expert Chat (voz desligada) · Dashboard Customizável
(framework de widgets morto ao lado) · Segurança · Status do Sistema

**🟦 SUGERIDO_OU_INICIADO (2)** — Workflows IA (sem persistência, sem execução) ·
Assistente IA de Mockup (IA simulada por `Math.random()`)

**⬛ MORTO_OU_ABANDONADO (6 subsistemas + 40 arquivos avulsos)** — Risco preditivo de Ruptura
(EMA: 6 componentes + 7 hooks) · Kit Builder avançado (14 componentes + 3 tabelas órfãs) ·
Comparação de Cenários do simulador · Recomendações IA (painel) · Chat IA genérico ·
Navegação por Categorias — mais os órfãos avulsos de `mockup/`, `simulator/`, `intelligence/`,
`bi/`, `novelties/`, `expert/`, `dashboard/`, `common/`, `layout/`, `auth/`, `security/`, `ui/`
listados em §B.3.

---

## E) Três coisas que exigem decisão

1. **`useClientBI.ts:125`** — dado fictício vazando para o caminho "real" do BI de cliente,
   sem sinalização. É o único mock deste relatório que o usuário não tem como distinguir.
2. **`useKitBuilderQueries.ts:138,144,176,182`** — kits podem ser salvos em `custom_kits`
   contendo produtos `mock-box-*`/`mock-item-*` sem qualquer alerta.
3. **Subsistema EMA** — 1.480 linhas de UI + 5 hooks + RPCs `fn_ema_*` implantadas, com a
   feature flag ligada e a descrição da flag afirmando que o painel está montado. Ou se monta
   `RupturePanelEma`, ou se remove o subsistema e se corrige `src/lib/feature-flags.ts:120-124`.
