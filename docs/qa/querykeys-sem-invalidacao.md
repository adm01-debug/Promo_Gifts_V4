# QueryKeys sem invalidação — varredura (etapa 187)

Varredura automática de **toda** `queryKey` literal em `src/` (arquivos `.ts`/`.tsx`,
excluindo testes) cruzada com as escritas no cliente.

## Método

1. Extraídas as chaves literais no formato `queryKey: ['nome', ...]` — chaves montadas a
   partir de constantes (ex.: `QUOTE_VIEWED_MAP_QUERY_KEY`) **não** são capturadas pelo
   regex e aparecem aqui apenas quando há também um literal equivalente.
2. Para cada chave, coletadas as tabelas lidas via `from('tabela')` **no mesmo arquivo**
   que declara a chave.
3. Cruzado com as tabelas que sofrem `.insert(` / `.update(` / `.delete(` / `.upsert(` em
   qualquer ponto de `src/`.

**Ressalva importante:** a coluna 3 é *co-ocorrência de tabela*, não prova de bug. Uma
chave que lê `quotes` e existe uma escrita em `quotes` em outro arquivo é **candidata**;
só a leitura do hook e do fluxo de escrita confirma se a invalidação falta. O objetivo
desta etapa é reduzir 270 chaves a uma lista curta o suficiente para auditoria manual.

## Resultado

- chaves literais distintas: **270**
- com ocorrência única (candidatas): **201**
  - com escrita no cliente em pelo menos uma das tabelas lidas: **44**
  - sem nenhuma escrita no cliente nas tabelas lidas: **157**
- com mais de uma ocorrência (chave compartilhada, menor risco de erro de digitação): **69**

## 1. Candidatas — chave de ocorrência única + tabela lida é escrita no cliente

| # | chave | declarada em | tabela lida | escrita em |
| --- | --- | --- | --- | --- |
| 1 | `admin-discount-exceeded` | `pages/admin/SellerDiscountLimitsAdminPage.tsx` | `discount_approval_requests`, `profiles`, `seller_discount_limits`, `user_roles` | `components/admin/DiscountApprovalQueue.tsx`, `components/admin/SellerDiscountLimitsPanel.tsx`, `components/admin/users/useUserManagement.ts` (+9) |
| 2 | `admin-kit-items-heatmap` | `pages/admin/KitTemplatesMetricsPage.tsx` | `custom_kits`, `kit_templates` | `hooks/admin/useAdminKitTemplates.ts`, `hooks/kit-builder/useCustomKitPersistence.ts`, `hooks/kit-builder/useKitTemplates.ts` (+2) |
| 3 | `admin-kit-templates` | `hooks/kit-builder/useTemplateSnapshot.ts` | `kit_templates` | `hooks/admin/useAdminKitTemplates.ts` |
| 4 | `admin-kit-templates-metrics` | `pages/admin/KitTemplatesMetricsPage.tsx` | `custom_kits`, `kit_templates` | `hooks/admin/useAdminKitTemplates.ts`, `hooks/kit-builder/useCustomKitPersistence.ts`, `hooks/kit-builder/useKitTemplates.ts` (+2) |
| 5 | `ai-quota-status` | `hooks/intelligence/useAiUsage.ts` | `ai_usage_quotas` | — |
| 6 | `ai-usage-logs` | `hooks/intelligence/useAiUsage.ts` | `ai_usage_quotas` | — |
| 7 | `ai-usage-stats` | `hooks/intelligence/useAiUsage.ts` | `ai_usage_quotas` | — |
| 8 | `all-products-promobrind-full` | `components/admin/product-groups/useProductGroups.ts` | `product_group_members`, `product_groups` | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx`, `components/admin/personalization/usePersonalizationData.ts` |
| 9 | `catalog-preferences` | `hooks/products/useCatalogPreferences.ts` | `profiles` | `components/expert/chat/useExpertChat.ts`, `hooks/simulation/useSimulatorPreferences.ts`, `services/authService.ts` (+1) |
| 10 | `connections-incident-timeline-72h` | `components/admin/connections/useIncidentTimeline72h.ts` | `workspace_notifications` | `components/admin/DiscountNotificationFilterPanel.tsx`, `hooks/bi/useSeasonalPeakNotifications.ts`, `hooks/ui/useWorkspaceNotifications.tsx` (+3) |
| 11 | `connections-pulse-bar` | `components/admin/connections/usePulseBarStatus.ts` | `external_connections`, `outbound_webhooks` | `components/admin/connections/ConnectionsOverviewTable.tsx`, `components/admin/connections/WebhooksTab.tsx` |
| 12 | `connections-recent-incidents` | `components/admin/connections/useRecentIncidents.ts` | `workspace_notifications` | `components/admin/DiscountNotificationFilterPanel.tsx`, `hooks/bi/useSeasonalPeakNotifications.ts`, `hooks/ui/useWorkspaceNotifications.tsx` (+3) |
| 13 | `conversion-funnel` | `components/intelligence/ConversionFunnel.tsx` | `product_views`, `quotes`, `search_analytics` | `components/admin/DiscountApprovalQueue.tsx`, `components/expert/chat/useExpertChat.ts`, `components/search/useGlobalSearch.ts` (+8) |
| 14 | `gold-sync-status` | `hooks/intelligence/useGoldSyncStatus.ts` | `quotes` | `components/admin/DiscountApprovalQueue.tsx`, `components/expert/chat/useExpertChat.ts`, `hooks/quotes/discountApprovalResponder.ts` (+6) |
| 15 | `hot-searches` | `components/intelligence/HotSearchesCard.tsx` | `search_analytics` | `components/search/useGlobalSearch.ts`, `hooks/products/useProductAnalytics.ts` |
| 16 | `kit-suggestions` | `components/kit-builder/KitSmartSuggestions.tsx` | `custom_kits` | `hooks/kit-builder/useCustomKitPersistence.ts`, `hooks/kit-builder/useKitTemplates.ts`, `pages/kit-builder/KitLibraryPage.tsx` |
| 17 | `magic-up-clients` | `hooks/intelligence/useMagicUpState.ts` | `magic_up_brand_kits` | — |
| 18 | `mcp-key-auto-revocations` | `components/admin/security/keys/audit/useAutoRevocations.ts` | `profiles` | `components/expert/chat/useExpertChat.ts`, `hooks/products/useCatalogPreferences.ts`, `hooks/simulation/useSimulatorPreferences.ts` (+2) |
| 19 | `mockup-history` | `pages/mockups/MockupHistoryPage.tsx` | `generated_mockups` | `hooks/mockup/mockupGenerationService.ts` |
| 20 | `my-clients-widget` | `components/dashboard/MyClientsWidget.tsx` | `quotes` | `components/admin/DiscountApprovalQueue.tsx`, `components/expert/chat/useExpertChat.ts`, `hooks/quotes/discountApprovalResponder.ts` (+6) |
| 21 | `my-recent-quotes-widget` | `components/dashboard/MyRecentQuotesWidget.tsx` | `quotes` | `components/admin/DiscountApprovalQueue.tsx`, `components/expert/chat/useExpertChat.ts`, `hooks/quotes/discountApprovalResponder.ts` (+6) |
| 22 | `pending-discount-approvals-count` | `pages/admin/AdminUsuariosPage.tsx` | `discount_approval_requests` | `components/admin/DiscountApprovalQueue.tsx`, `hooks/quotes/discountApprovalResponder.ts`, `hooks/quotes/useDiscountApproval.ts` (+1) |
| 23 | `product-custom-rules` | `components/products/ProductPersonalizationRules.tsx` | `product_components`, `product_group_members` | `components/admin/ProductPersonalizationManager.tsx`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx` (+2) |
| 24 | `product-frequently-bought` | `hooks/products/useProductRecommendations.ts` | `product_views`, `quote_items` | `hooks/products/useProductAnalytics.ts`, `services/quoteItemsReorder.ts`, `services/quoteService.ts` |
| 25 | `product-group-rules` | `components/products/ProductPersonalizationRules.tsx` | `product_components`, `product_group_members` | `components/admin/ProductPersonalizationManager.tsx`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx` (+2) |
| 26 | `product-personalization-source` | `components/products/ProductPersonalizationRules.tsx` | `product_components`, `product_group_members` | `components/admin/ProductPersonalizationManager.tsx`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx` (+2) |
| 27 | `product-personalized` | `hooks/products/useProductRecommendations.ts` | `product_views`, `quote_items` | `hooks/products/useProductAnalytics.ts`, `services/quoteItemsReorder.ts`, `services/quoteService.ts` |
| 28 | `product-trending` | `hooks/products/useProductRecommendations.ts` | `product_views`, `quote_items` | `hooks/products/useProductAnalytics.ts`, `services/quoteItemsReorder.ts`, `services/quoteService.ts` |
| 29 | `product-variants-for-videos` | `components/admin/products/video-gallery/useProductVideoGallery.ts` | `video_variant_links` | `hooks/products/useVideoVariantLinks.ts` |
| 30 | `products-listing-latency-alert` | `pages/admin/telemetry/useProductsListingLatencyAlert.ts` | `query_telemetry` | `pages/admin/telemetry/useTelemetryData.ts` |
| 31 | `produto-personalizacao` | `hooks/quotes/useProdutoPersonalizacao.ts` | `product_components` | `components/admin/ProductPersonalizationManager.tsx`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx` (+1) |
| 32 | `query-telemetry-error-counters` | `pages/admin/telemetry/useErrorCounters.ts` | `query_telemetry` | `pages/admin/telemetry/useTelemetryData.ts` |
| 33 | `quote-builder-handoff-telemetry` | `components/admin/telemetry/QuoteBuilderHandoffCard.tsx` | `frontend_telemetry` | `lib/error-reporter.ts`, `lib/freight/telemetry.ts`, `lib/telemetry/quoteHandoffTelemetry.ts` (+2) |
| 34 | `quote-item-counts` | `hooks/quotes/useQuoteItemCounts.ts` | `quote_items` | `services/quoteItemsReorder.ts`, `services/quoteService.ts` |
| 35 | `recent-kits-widget` | `components/dashboard/RecentKitsWidget.tsx` | `custom_kits` | `hooks/kit-builder/useCustomKitPersistence.ts`, `hooks/kit-builder/useKitTemplates.ts`, `pages/kit-builder/KitLibraryPage.tsx` |
| 36 | `resolve-products-select-comparison` | `pages/admin/telemetry/useResolveProductsSelectComparison.ts` | `query_telemetry` | `pages/admin/telemetry/useTelemetryData.ts` |
| 37 | `role-audit-log` | `components/admin/users/RoleAuditLogPanel.tsx` | `admin_audit_log`, `profiles` | `components/expert/chat/useExpertChat.ts`, `hooks/products/useCatalogPreferences.ts`, `hooks/quotes/useDiscountApproval.ts` (+3) |
| 38 | `sales-history` | `hooks/intelligence/useSalesHistory.ts` | `profiles`, `quote_items` | `components/expert/chat/useExpertChat.ts`, `hooks/products/useCatalogPreferences.ts`, `hooks/simulation/useSimulatorPreferences.ts` (+4) |
| 39 | `seller-margin-median` | `components/quotes/MarginInsightBadge.tsx` | `quotes` | `components/admin/DiscountApprovalQueue.tsx`, `components/expert/chat/useExpertChat.ts`, `hooks/quotes/discountApprovalResponder.ts` (+6) |
| 40 | `similar-kits` | `hooks/kit-builder/useSimilarKits.ts` | `kit_templates` | `hooks/admin/useAdminKitTemplates.ts`, `hooks/kit-builder/useTemplateSnapshot.ts` |
| 41 | `simulator-preferences` | `hooks/simulation/useSimulatorPreferences.ts` | `profiles` | `components/expert/chat/useExpertChat.ts`, `hooks/products/useCatalogPreferences.ts`, `services/authService.ts` (+1) |
| 42 | `trends-heatmap` | `components/intelligence/TrendsHeatmap.tsx` | `product_views`, `search_analytics` | `components/search/useGlobalSearch.ts`, `hooks/products/useProductAnalytics.ts` |
| 43 | `trends-top-categories` | `components/intelligence/TopCategoriesCard.tsx` | `product_views` | `hooks/products/useProductAnalytics.ts` |
| 44 | `unmet-demand` | `components/intelligence/UnmetDemandCard.tsx` | `search_analytics` | `components/search/useGlobalSearch.ts`, `hooks/products/useProductAnalytics.ts` |

Estas 44 exigem leitura manual do fluxo de escrita antes de qualquer patch: em vários
casos a escrita é seguida de `invalidateQueries` explícito (padrão correto) e a chave só
parece órfã porque a invalidação usa outra chave. Nenhuma delas foi alterada nesta etapa.

## 2. Chaves de ocorrência única sem escrita no cliente nas tabelas lidas

Dados materializados por RPC/edge function, tabelas somente-leitura ou snapshots
históricos. Sem risco de cache obsoleto por mutation do próprio app.

| chave | arquivo | tabelas lidas |
| --- | --- | --- |
| `admin-cf-images` | `pages/admin/AdminCloudflareImagesPage.tsx` | — |
| `all-technique-dimensions-v7` | `hooks/mockup/useMockupTechniques.ts` | — |
| `app-health-summary` | `pages/admin/telemetry/useAppHealth.ts` | — |
| `audit-history` | `components/audit/AuditHistory.tsx` | — |
| `available-sizes` | `hooks/products/useProductsBySize.ts` | — |
| `bi-bundle-suggestions` | `components/bi/BundleSuggestions.tsx` | — |
| `bi-client-affinity-v2` | `hooks/bi/useClientAffinity.ts` | — |
| `bi-client-category-affinity-raw` | `hooks/bi/useClientCategoryAffinity.ts` | — |
| `bi-industry-category-trends` | `hooks/bi/useIndustryCategoryTrends.ts` | — |
| `bi-industry-trends-v2` | `hooks/bi/useIndustryTrends.ts` | — |
| `bi-lookalikes` | `components/bi/ClientLookalikes.tsx` | — |
| `bundle-suggestions` | `components/cart/BundleSuggestionCard.tsx` | — |
| `catalog-real-stats` | `hooks/products/useCatalogRealStats.ts` | — |
| `category-icons` | `hooks/products/useCategoryIcons.ts` | `category_icons` |
| `client-mockups` | `hooks/mockup/useClientMockups.ts` | — |
| `client-orders-history` | `hooks/bi/useClientOrdersHistory.ts` | `orders` |
| `client-top-products` | `hooks/crm/useClientTopProducts.ts` | `order_items`, `orders` |
| `collections-weekly-count` | `components/collections/CollectionsHeatmap.tsx` | — |
| `color-enrichment-batch` | `hooks/products/useColorEnrichment.ts` | — |
| `color-fanout` | `hooks/products/useColorFanout.ts` | — |
| `color-system-external` | `hooks/products/useColorSystem.ts` | — |
| `commercial-category-ranking` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `commercial-opportunities` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `commercial-segments` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `commercial-supplier-sales` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `commercial-top-clients` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `contextual-suggestions` | `hooks/intelligence/useContextualSuggestions.ts` | — |
| `crm-companies` | `hooks/crm/useCrmCompanies.ts` | — |
| `crm-companies-infinite` | `hooks/crm/useCrmCompanies.ts` | — |
| `crm-companies-selector` | `hooks/crm/useCrmCompanies.ts` | — |
| `crm-company` | `hooks/crm/useCrmCompanies.ts` | — |
| `crm-customer` | `hooks/crm/useCrmCompanies.ts` | — |
| `discontinued-check` | `components/kit-builder/DiscontinuedItemsAlert.tsx` | `products` |
| `discount-approval-audit` | `components/admin/DiscountApprovalAuditTrail.tsx` | `discount_approval_audit` |
| `ema-coverage-stats` | `components/inventory/StockHeroRiskBanner.tsx` | — |
| `ema-kpi-by-level` | `hooks/stock/useRuptureKpiSummary.ts` | — |
| `ema-risk-summary-banner` | `hooks/stock/useEmaRiskSummary.ts` | — |
| `expiring-novelties` | `hooks/products/useNovelties.ts` | — |
| `external-print-areas` | `hooks/simulation/useExternalSimulator.ts` | — |
| `external-product` | `hooks/simulation/useExternalSimulator.ts` | — |
| `external-products-list` | `hooks/simulation/useExternalSimulator.ts` | — |
| `external-products-search` | `hooks/simulation/useExternalSimulator.ts` | — |
| `external-tags-admin` | `components/admin/products/ProductTagsSection.tsx` | — |
| `external-techniques-catalog` | `components/admin/products/sections/engraving/useEngravingWizard.ts` | — |
| `external-variant-stock` | `hooks/products/useExternalVariantStock.ts` | — |
| `faixas-preco-oficial` | `hooks/simulation/useGravacaoV2.ts` | — |
| `fav-client-picker-search` | `components/favorites/FavoritesClientPicker.tsx` | — |
| `favorites-weekly-count` | `components/favorites/FavoritesHeatmap.tsx` | — |
| `global-leaf-categories` | `hooks/products/useProductLeafCategories.tsx` | — |
| `has-print-areas` | `hooks/simulation/usePrintAreas.ts` | — |
| `intelligence-product-ids` | `hooks/intelligence/useCommercialIntelligence.ts` | — |
| `is-novelty` | `hooks/products/useNovelties.ts` | — |
| `kill-switch-notice` | `hooks/system/useKillSwitchNotice.ts` | — |
| `kit-maker` | `components/kit-builder/KitMakerLanding.tsx` | — |
| `kit-stock-validation` | `hooks/kit-builder/useKitStockValidation.ts` | — |
| `kit-variant-options` | `components/kit-builder/VariantSelector.tsx` | — |
| `login-attempt-stats` | `hooks/auth/useLoginAttempts.ts` | `login_attempts` |
| `login-attempts` | `hooks/auth/useLoginAttempts.ts` | `login_attempts` |
| `magazine-crm-companies` | `pages/magazine/components/MagazineClientPicker.tsx` | — |
| `market-intel-insights-usage` | `pages/admin/ai-usage/MarketIntelInsightsUsagePanel.tsx` | `ai_usage_events` |
| `market-intelligence-macro` | `hooks/intelligence/useMarketIntelligenceMacro.ts` | — |
| `material-groups` | `hooks/products/useMaterialGroups.ts` | — |
| `material-groups-admin` | `components/admin/products/ProductMaterialsSection.tsx` | — |
| `material-search` | `hooks/products/useMaterialTypes.ts` | — |
| `material-types` | `hooks/products/useMaterialTypes.ts` | — |
| `material-types-admin` | `components/admin/products/ProductMaterialsSection.tsx` | — |
| `material-types-by-group` | `hooks/products/useMaterialTypes.ts` | — |
| `materials-complete` | `hooks/products/useMaterialTypes.ts` | — |
| `medallion-health` | `hooks/admin/useMedallionHealth.ts` | — |
| `mockup-client-search` | `components/mockup/MockupClientSelector.tsx` | — |
| `mockup-customization-options` | `hooks/mockup/useMockupTechniques.ts` | — |
| `novelties-details` | `hooks/products/useNovelties.ts` | — |
| `novelties-rpc` | `hooks/products/useNovelties.ts` | — |
| `novelty-count` | `hooks/products/useNovelties.ts` | — |
| `novelty-product-ids` | `hooks/products/useNovelties.ts` | — |
| `novelty-stats` | `hooks/products/useNovelties.ts` | — |
| `price-tables` | `pages/advanced-price-search/useAdvancedPriceSearch.ts` | — |
| `print-areas` | `hooks/simulation/usePrintAreas.ts` | — |
| `print-areas-v2` | `hooks/simulation/useGravacaoPriceV2.ts` | — |
| `product-customization-options` | `hooks/products/useProductCustomizationOptions.ts` | — |
| `product-engraving-options-v6` | `hooks/products/useProductEngravingOptions.ts` | — |
| `product-images` | `hooks/products/useProductImages.ts` | — |
| `product-images-batch` | `hooks/products/useProductImages.ts` | — |
| `product-insights` | `hooks/products/useProductInsights.ts` | `orders` |
| `product-intelligence-data` | `hooks/intelligence/useStockHistory.ts` | — |
| `product-primary-image` | `hooks/products/useProductImages.ts` | — |
| `product-print-areas-v2` | `hooks/simulation/useGravacaoV2.ts` | — |
| `product-techniques-multi` | `components/pricing/calculator/TechniqueMultiSelector.tsx` | — |
| `product-variants-axes` | `components/admin/products/ProductVariationAxesConfig.tsx` | — |
| `product-variants-for-gallery` | `components/admin/products/image-gallery/useProductImageGallery.ts` | — |
| `product-view-count` | `pages/products/ProductDetail.tsx` | `products` |
| `products-by-materials` | `hooks/products/useProductsByMaterial.ts` | — |
| `products-by-size` | `hooks/products/useProductsBySize.ts` | — |
| `produto-ramo-atividade` | `hooks/crm/useProdutoRamoAtividade.ts` | — |
| `promo-sales-90d-by-product-v2` | `hooks/intelligence/usePromoSales90dByProduct.ts` | — |
| `promo-sales-ranking-v2` | `hooks/intelligence/usePromoSalesRanking.ts` | — |
| `promobrind-categories` | `hooks/products/useCategories.ts` | — |
| `promobrind-products` | `hooks/products/useProducts.ts` | — |
| `promobrind-products-catalog` | `hooks/products/useProductsLightweight.ts` | — |
| `promobrind-products-lightweight` | `hooks/products/useProductsLightweight.ts` | — |
| `quote-client-logos` | `hooks/quotes/useQuoteClientLogos.ts` | — |
| `quote-companies-search` | `components/quotes/company-contact/CompanySearchDropdown.tsx` | — |
| `quote-companies-selector` | `components/quotes/company-contact/CompanySearchDropdown.tsx` | — |
| `quote-company-by-id` | `components/quotes/CompanyContactSelector.tsx` | — |
| `quote-company-contacts` | `components/quotes/CompanyContactSelector.tsx` | — |
| `quotes` | `hooks/quotes/useQuotes.ts` | — |
| `ramos-atividade-admin` | `components/admin/products/ProductRamosSection.tsx` | — |
| `replenishment-count` | `hooks/useReplenishments.ts` | — |
| `reposicao-variants-summary` | `hooks/products/useReposicaoVariantsSummary.ts` | — |
| `rls-denials` | `pages/admin/RlsDenialsAdminPage.tsx` | `rls_denial_log` |
| `ruptura-forecast-7-15-30` | `hooks/stock/useRupturaForecast.ts` | — |
| `search-autocomplete-categories` | `hooks/common/useSearch.ts` | — |
| `search-autocomplete-suppliers` | `hooks/common/useSearch.ts` | — |
| `segmentos-atividade-admin` | `components/admin/products/ProductRamosSection.tsx` | — |
| `share-company-search` | `components/products/share/ShareContactSelector.tsx` | — |
| `share-contacts` | `components/products/share/ShareContactSelector.tsx` | — |
| `similar-products` | `hooks/products/useSimilarProducts.ts` | — |
| `simulator-clients` | `hooks/simulation/useSimulation.ts` | — |
| `simulator-products-promobrind` | `hooks/simulation/useSimulation.ts` | — |
| `simulator-techniques-external` | `hooks/simulation/useSimulation.ts` | — |
| `simulator-variants` | `components/pricing/ProductPriceSimulator.tsx` | — |
| `sparkline` | `components/inventory/risk/RuptureSparkline.tsx` | — |
| `sparkline-supplier-batch` | `hooks/intelligence/useSparklineSales.tsx` | — |
| `stock-alerts` | `hooks/products/useStockAlerts.ts` | — |
| `stock-daily-summary` | `hooks/intelligence/useStockHistory.ts` | — |
| `stock-notif-counts` | `hooks/products/useStockNotifications.ts` | — |
| `stock-notif-low` | `hooks/products/useStockNotifications.ts` | — |
| `stock-notif-novelty` | `hooks/products/useStockNotifications.ts` | — |
| `stock-notif-restocks` | `hooks/products/useStockNotifications.ts` | — |
| `stock-notif-stockout` | `hooks/products/useStockNotifications.ts` | — |
| `stock-velocity` | `hooks/intelligence/useStockHistory.ts` | — |
| `stock-velocity-batch` | `hooks/intelligence/useStockVelocityPrefetch.ts` | `mv_stock_velocity` |
| `super-filtro-options` | `hooks/products/usePublicoAlvoOptions.ts` | — |
| `supplier-default-lead-time` | `hooks/products/useSupplierDefaultLeadTime.ts` | `supplier_settings` |
| `supplier-names` | `hooks/products/useSupplierNames.ts` | — |
| `supplier-reliability` | `hooks/inventory/useSupplierReliability.ts` | — |
| `supplier-reliability-history` | `hooks/inventory/useSupplierReliabilityServer.ts` | — |
| `supplier-reliability-server` | `hooks/inventory/useSupplierReliabilityServer.ts` | — |
| `supplier-risk-breakdown` | `hooks/stock/useSupplierRiskBreakdown.ts` | — |
| `supplier-sales-ranking` | `hooks/products/useSupplierSalesRanking.ts` | — |
| `supplier-trust` | `hooks/products/useSupplierTrust.ts` | — |
| `tabela-preco-codigo` | `hooks/simulation/useGravacaoV2.ts` | — |
| `tabelas-preco-oficial` | `hooks/simulation/useGravacaoV2.ts` | — |
| `techniques` | `hooks/quotes/useQuotes.ts` | — |
| `techniques-all` | `hooks/simulation/usePrintAreas.ts` | — |
| `techniques-selector-external` | `components/personalization/TechniqueSelector.tsx` | — |
| `techniques-sla-external` | `components/personalization/TechniqueSLACard.tsx` | — |
| `top-collected-products` | `components/collections/CollectionsEmptyStateSmart.tsx` | — |
| `top-favorited-products` | `components/favorites/FavoritesEmptyStateSmart.tsx` | — |
| `trends-daily` | `pages/bi/TrendsPage.tsx` | — |
| `trends-insights` | `components/intelligence/TrendsInsightsCard.tsx` | — |
| `trends-kpi-snapshot` | `pages/bi/TrendsPage.tsx` | — |
| `trends-products` | `pages/bi/TrendsPage.tsx` | — |
| `trends-searches` | `pages/bi/TrendsPage.tsx` | — |
| `variant-supplier-sources` | `hooks/products/useVariantSupplierSources.ts` | `product_variants` |
| `whatif` | `hooks/stock/useWhatIfScenario.ts` | — |
| `wizard-locations-v6` | `hooks/simulator/useSimulatorWizard.ts` | — |

## 3. Chaves compartilhadas (mais de uma ocorrência)

| chave | ocorrências | arquivos |
| --- | --- | --- |
| `product-components` | 14 | `components/admin/ProductPersonalizationManager.tsx`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx`, `components/admin/personalization/usePersonalizationData.ts` |
| `component-locations` | 10 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx`, `components/admin/personalization/usePersonalizationData.ts` |
| `location-techniques` | 10 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx`, `components/admin/personalization/usePersonalizationData.ts` |
| `product-images-ext` | 10 | `components/admin/products/image-gallery/useProductImageGallery.ts` |
| `video-variant-links` | 9 | `components/admin/products/video-gallery/useProductVideoGallery.ts`, `hooks/products/useVideoVariantLinks.ts` |
| `custom-kits` | 7 | `hooks/kit-builder/useCustomKitsRealtime.ts`, `hooks/kit-builder/useKitTemplates.ts`, `pages/kit-builder/KitLibraryPage.tsx` |
| `magic-up-history` | 7 | `hooks/intelligence/useMagicUpGeneration.ts`, `hooks/intelligence/useMagicUpState.ts` |
| `product-videos-ext` | 7 | `components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `favorite-membership` | 6 | `components/catalog/useCatalogSelection.ts`, `hooks/favorites/useFavoriteLists.ts`, `hooks/favorites/useFavoriteQuickAdd.ts` |
| `product-membership` | 6 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/GroupInheritance.tsx`, `components/admin/personalization/usePersonalizationData.ts` |
| `favorite-items` | 5 | `components/catalog/useCatalogSelection.ts`, `hooks/favorites/useFavoriteLists.ts`, `hooks/favorites/useFavoriteQuickAdd.ts` |
| `group-components` | 5 | `components/admin/hooks/useGroupPersonalization.ts` |
| `product-groups` | 5 | `components/admin/hooks/useGroupPersonalization.ts`, `components/admin/product-groups/useProductGroups.ts` |
| `active-sales-goal` | 4 | `hooks/intelligence/useSalesGoals.ts` |
| `commemorative-dates` | 4 | `hooks/intelligence/useCommemorativeDates.ts` |
| `favorite-trash` | 4 | `hooks/favorites/useFavoriteLists.ts` |
| `group-location-techniques` | 4 | `components/admin/hooks/useGroupPersonalization.ts` |
| `group-locations` | 4 | `components/admin/hooks/useGroupPersonalization.ts` |
| `kit-builder` | 4 | `hooks/kit-builder/useKitBuilderQueries.ts` |
| `kit-templates` | 4 | `hooks/admin/useAdminKitTemplates.ts`, `hooks/kit-builder/useTemplateSnapshot.ts` |
| `replenishments-details` | 4 | `components/replenishments/ReplenishmentProductGrid.tsx`, `hooks/products/useReplenishments.ts`, `hooks/useReplenishments.ts` |
| `sales-goals` | 4 | `hooks/intelligence/useSalesGoals.ts` |
| `discount-approval-queue` | 3 | `components/admin/DiscountApprovalQueue.tsx`, `pages/admin/DiscountRequestDetailPage.tsx` |
| `discount-notifications` | 3 | `components/admin/DiscountNotificationFilterPanel.tsx` |
| `favorite-lists` | 3 | `components/catalog/useCatalogSelection.ts`, `hooks/favorites/useFavoriteQuickAdd.ts` |
| `kit-print-areas` | 3 | `components/admin/products/kit-components/PrintAreasManager.tsx`, `components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `my-discount-requests-widget` | 3 | `components/dashboard/MyDiscountRequestsWidget.tsx`, `hooks/quotes/useDiscountApproval.ts` |
| `ownership-audit-reports` | 3 | `components/admin/OwnershipRepairDialog.tsx`, `pages/admin/OwnershipAuditAdminPage.tsx` |
| `print-area-techniques` | 3 | `components/admin/products/sections/engraving/useEngravingWizard.ts` |
| `product-group-members` | 3 | `components/admin/product-groups/useProductGroups.ts` |
| `product-materials-full` | 3 | `components/admin/products/ProductMaterialsSection.tsx` |
| `role-permissions` | 3 | `hooks/auth/useRBAC.tsx`, `pages/admin/RolePermissionsPage.tsx` |
| `saved-simulations` | 3 | `hooks/simulation/useSimulation.ts` |
| `saved-stock-views` | 3 | `hooks/stock/useSavedStockViews.ts` |
| `saved-trends-views` | 3 | `components/intelligence/SavedViewsManager.tsx` |
| `seller-discount-limits` | 3 | `components/admin/SellerDiscountLimitsPanel.tsx`, `pages/admin/SellerDiscountLimitsAdminPage.tsx` |
| `stock-notes` | 3 | `hooks/stock/useStockNotes.ts` |
| `techniques-external` | 3 | `components/admin/hooks/useGroupPersonalization.ts`, `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/usePersonalizationData.ts` |
| `v4-callbacks` | 3 | `hooks/admin/useV4Callbacks.ts` |
| `variant-stock-data` | 3 | `hooks/products/useVariantStock.ts`, `pages/admin/StockDashboardPage.tsx` |
| `wizard-drafts` | 3 | `hooks/simulator/useWizardDrafts.ts` |
| `admin-active-sessions` | 2 | `hooks/admin/useAdminSessions.ts` |
| `admin-all-memberships` | 2 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/usePersonalizationData.ts` |
| `admin-discount-impact` | 2 | `pages/admin/SellerDiscountLimitsAdminPage.tsx` |
| `admin-product-groups-search` | 2 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/usePersonalizationData.ts` |
| `admin-products-promobrind-full` | 2 | `components/admin/personalization-manager/usePersonalizationManager.ts`, `components/admin/personalization/usePersonalizationData.ts` |
| `admin-seller-discount-limits` | 2 | `pages/admin/SellerDiscountLimitsAdminPage.tsx` |
| `ai-usage-quotas` | 2 | `hooks/intelligence/useAiUsage.ts` |
| `bi` | 2 | `hooks/bi/useClientSeasonality.ts`, `hooks/bi/useClientVsIndustry.ts` |
| `cart-companies-local` | 2 | `components/cart/CartCompanyPicker.tsx`, `components/cart/CartCompanyPickerDialog.tsx` |
| `cart-companies-search` | 2 | `components/cart/CartCompanyPicker.tsx`, `components/cart/CartCompanyPickerDialog.tsx` |
| `component-media` | 2 | `components/admin/products/kit-components/ComponentMediaManager.tsx` |
| `discount-approval-detail` | 2 | `pages/admin/DiscountRequestDetailPage.tsx` |
| `ema-pipeline-health` | 2 | `hooks/stock/useEmaPipelineHealth.ts`, `pages/admin/EmaHealthPage.tsx` |
| `failed-deliveries` | 2 | `components/admin/connections/FailedDeliveriesPanel.tsx` |
| `integrations-health` | 2 | `components/admin/connections/FailedDeliveriesPanel.tsx`, `components/admin/connections/useIntegrationsHealthCard.ts` |
| `kit-components` | 2 | `components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `magic-up-brand-kit` | 2 | `hooks/intelligence/useMagicUpState.ts` |
| `magic-up-campaigns` | 2 | `hooks/intelligence/useMagicUpState.ts` |
| `permissions-catalog` | 2 | `pages/admin/RolePermissionsPage.tsx` |
| `product-tags` | 2 | `components/admin/products/ProductTagsSection.tsx` |
| `product-variants` | 2 | `components/admin/products/useProductVariants.ts` |
| `produto-ramos` | 2 | `components/admin/products/ProductRamosSection.tsx` |
| `quote-products-promobrind-search` | 2 | `hooks/quotes/useQuoteBuilderState.ts`, `pages/freight/FreightSimulatorPage.tsx` |
| `ramo-atividade` | 2 | `hooks/crm/useRamoAtividadeFilho.ts` |
| `related-products` | 2 | `components/products/RelatedProducts.tsx`, `hooks/products/useProducts.ts` |
| `replenishment-stats` | 2 | `hooks/products/useReplenishments.ts`, `hooks/useReplenishments.ts` |
| `rupture-alerts` | 2 | `hooks/stock/useRuptureAlerts.ts`, `pages/admin/StockDashboardPage.tsx` |
| `system_settings` | 2 | `hooks/admin/useSystemSettings.ts` |

## 4. O que foi corrigido nesta rodada

A varredura confirmou o padrão que a etapa 186 já atacava: as chaves do orçamento eram
invalidadas uma a uma, em seis pontos diferentes de `useQuotes.ts`, e os widgets do
painel (`quote-item-counts`, `my-discount-requests-widget`, `seller-discount-limits`)
ficavam fora. A correção centralizou tudo em `invalidateQuoteCaches(queryClient)`
(`src/hooks/quotes/quoteCacheInvalidation.ts`), garantindo que os quatro prefixos sejam
sempre invalidados juntos — coberto por teste que trava a lista de prefixos.

Próxima ação recomendada: auditar as 44 candidatas da seção 1 por área (quotes, admin/kit,
intelligence, connections) em etapas separadas, uma PR por área.
