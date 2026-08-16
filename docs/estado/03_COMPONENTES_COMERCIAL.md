# 03 — Componentes do Núcleo Comercial (auditoria de estado)

**Data da medição:** 2026-08-16
**Escopo:** `src/components/{products,quotes,cart,search,filters,compare,pricing,catalog,favorites,personalization,engraving}`
**Arquivos no escopo:** 388 (281 produtivos + 107 de teste)
**Método:** leitura de código apenas. README/STATUS/CLAUDE.md **não** foram usados como fonte.
Toda afirmação carrega evidência `caminho:LINHA`. Onde não houve verificação, está marcado `NAO_VERIFICADO`.

**Legenda:** ✅ IMPLEMENTADO_TOTAL · 🟨 IMPLEMENTADO_PARCIAL · 🟦 SUGERIDO_OU_INICIADO · ⬛ MORTO_OU_ABANDONADO

---

## 0. Mapa das duas camadas de dados (pré-requisito para ler as tabelas)

O núcleo comercial fala com **dois bancos distintos**, e quase todo achado desta auditoria decorre disso:

| Camada | Entrada | Tabelas | Evidência |
|---|---|---|---|
| **BD externo (catálogo Promobrind)** | `dbInvoke` / PostgREST | `products`, `product_variants`, `product_images`, `categories`, `suppliers`, `color_groups`, `color_variations`, `customization_price_tables`, `tecnica_gravacao` | `src/lib/external-db/products.ts:95`, `src/lib/external-db/products-detail.ts:99`, `src/hooks/tecnicas/useTabelasPreco.ts:40` |
| **Supabase interno (`doufsxqlfjyuvxuezpln`)** | `supabase.from()` / `supabase.rpc()` | `quotes`, `quote_items`, `quote_item_personalizations`, `quote_history`, `seller_carts`, `seller_cart_items`, `favorite_lists`, `favorite_items`, `favorite_items_trash`, `saved_filters`, `user_comparisons`, `price_history`, `search_analytics` | `src/services/quoteService.ts:54`, `src/hooks/products/useSellerCarts.ts:282`, `src/hooks/favorites/useFavoriteLists.ts:85`, `src/components/filters/FilterPresets.ts:36` |

Existem **três caminhos diferentes** para materializar um `Product` no front, e eles **não são equivalentes**:

| Caminho | Função de mapeamento | SELECT | Consumidores |
|---|---|---|---|
| **A — catálogo leve** | `mapLightweightToProduct` (`src/hooks/products/useProductsLightweight.ts:62`) | `PRODUCT_SELECT_LIGHTWEIGHT` (`:146`) | Catálogo `/` e Super Filtro `/filtros` |
| **B — lista enriquecida** | `mapPromobrindToProduct` (`src/utils/product-mapper.ts:92`) | `PRODUCT_SELECT_FIELDS_WITH_SALE` (`src/lib/external-db/product-types.ts:223`) | `ProductsContext` (Comparar, Favoritos, Coleções, Vistos), `useProducts`, Match, Revista |
| **C — detalhe** | `mapPromobrindToProduct` sobre `fetchPromobrindProductById` (`src/lib/external-db/products-detail.ts:72`) | `PRODUCT_SELECT_FIELDS_DETAIL` (`:265`) | PDP `/produto/:id` |

O caminho **B** é o que produz a maior parte dos fios quebrados descritos na seção B.

### Campos críticos do tipo `Product` (REGRA #2)

O tipo canônico é `src/types/product-catalog.ts:25`. Os cinco campos exigidos **existem na declaração**:

| Campo | Declaração | Populado no caminho A | Populado no caminho B | Populado no caminho C |
|---|---|---|---|---|
| `price` | `product-catalog.ts:31` | ✅ `useProductsLightweight.ts:87` (`sale_price ?? cost_price ?? 0`) | 🟨 `product-mapper.ts:149` → `getProductPrice` = `sale_price ?? base_price ?? 0`, e **`base_price` nunca é selecionado** (`product-types.ts:210` + ausência em `:223`) → cai em `0` | idem B |
| `sale_price` | `product-catalog.ts:32` | ⬛ nunca escrito no caminho A | ✅ `product-mapper.ts:150` | ✅ idem |
| `shortDescription` | `product-catalog.ts:30` | ✅ `useProductsLightweight.ts:84` | ✅ `product-mapper.ts:146` | ✅ idem |
| `category_id` | `product-catalog.ts:35` | ✅ `useProductsLightweight.ts:85` (`leaf_category_id`) | ✅ `product-mapper.ts:147` | ✅ idem |
| `category_name` | `product-catalog.ts:36` | ✅ `useProductsLightweight.ts:86` (`leaf_category_name` ou mapa de `categories`) | ⬛ **sempre `null`** — `category_name` **não está** em `PRODUCT_SELECT_FIELDS_WITH_SALE` (`product-types.ts:223-232`) e `enrichProducts` só preenche `supplier_name` (`src/lib/external-db/products.ts:563-565`) | ✅ resolvido em `products-detail.ts:115-180` |

**Consumo real dos campos na UI (medido):**
- `price` é o campo efetivamente exibido: `ProductCard.tsx:921`, `ProductCard.tsx:577`, `applyProductFilters.ts:233`.
- `sale_price` só é lido em **dois** pontos, ambos de telemetria: `ProductCard.tsx:1026` e `ProductCard.tsx:1062`. Nenhum componente exibe preço "de/por" a partir dele. `comparePrice` (`product-catalog.ts:34`) **nunca é escrito por nenhum mapper**.
- `shortDescription` tem **um único consumidor**: `ProductQuickView.tsx:596-598`.
- `category_name` é lido em `useGlobalSearch.ts:397`, `SimilarProducts.tsx:74`, `FavoritesPage.tsx:304`; `category.name` em `CompareTableView.tsx:297`, `ProductListItem.tsx:593`, `ProductDetail.tsx:169`.

> **Observação de higiene de tipos:** existe um segundo `Product` em `src/types/product.ts:4`, com os mesmos cinco campos, mas **sem nenhum importador em `src/`** (verificado: nenhum `from '@/types/product'`). É código morto de tipo. O tipo vivo é `src/types/product-catalog.ts:25`.

---

## A) Tabelas por fluxo de negócio

### Fluxo 1 — Catálogo / listagem

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Grade paginada infinita | `pages/Index.tsx:140` → `catalog/CatalogContent.tsx:62` → `products/VirtualizedProductGrid.tsx` → `products/ProductCard.tsx` | `useCatalogState` (`hooks/products/useCatalogState.ts:337`) → `useProductsCatalog` (`useProductsLightweight.ts:403`) | `products` (view `v_products_public`) via `dbInvoke` | ✅ | `useProductsLightweight.ts:300-316` monta 4 páginas de 500 em paralelo; `:377` calcula `nextOffset` | — |
| Ordenação best-seller server-side | `catalog/CatalogToolbar.tsx:112` | `fetchBestSellerCatalogPage` (`useProductsLightweight.ts:202`) | RPC `get_catalog_bestseller_page` (`:207`) | ✅ | `:249-255` com fallback client-side gracioso | — |
| Visão tabela | `products/ProductTableView.tsx` + `products/table-view/ProductTableRow.tsx` | mesmo `useCatalogState` | idem | ✅ | `CatalogContent.tsx:223-238` | — |
| Seleção em massa + ações | `catalog/useCatalogSelection.ts`, `catalog/CatalogBulkModals.tsx:70`, `catalog/BulkAddToCartModal.tsx`, `catalog/BulkVariantWizard.tsx` | `useCatalogSelection` | `seller_cart_items` (via contexto de carrinho) | ✅ | `catalog/useCatalogSelection.ts:20-21` | — |
| Contagem total do catálogo | `catalog/CatalogHeader.tsx:97` | `useProductsCatalog` | `countMode: 'exact'` (`useProductsLightweight.ts:309`) | ✅ | — | — |
| Nome de categoria no card | `products/ProductListItem.tsx:593` | `mapLightweightToProduct` | `categories` + `leaf_category_name` | ✅ | `useProductsLightweight.ts:70-73` | — |
| Badge "Destaques"/"Novidade"/"Promoção" | `products/ProductStatusBadge.tsx`, `products/NoveltyBadge.tsx` | `mapLightweightToProduct:103-105` | colunas `is_featured/is_bestseller/is_new/is_on_sale` | ✅ | — | — |
| Frescor de preço | `products/PriceFreshnessBadge.tsx:922` (uso em `ProductCard.tsx:922`) | `mapLightweightToProduct:114` | coluna `price_updated_at` | 🟨 | caminho A grava `priceFreshnessThresholdDays: null` (`useProductsLightweight.ts:115`); só o caminho B/C traz o threshold real (`product-mapper.ts:216`) | threshold por produto no catálogo — hoje o badge usa default fixo |
| Editar threshold de frescor | `products/PriceFreshnessThresholdEditor.tsx:31` | — | — | ⬛ | zero referências fora do próprio arquivo (ver seção D) | consumidor |

### Fluxo 2 — Busca

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Busca do catálogo (inline) | `catalog/CatalogHeader.tsx:106` → `search/SmartSearchInput.tsx` → `search/SearchResultGroups.tsx` | `useCatalogState.handleSearch` (`:937`) + `useProductFuzzySearch` | `products` (`_search` server-side, `useProductsLightweight.ts:258`) | ✅ | — | — |
| Paleta global (⌘K) | `layout/Header.tsx:232` → `search/GlobalSearchPalette.tsx` | `search/useGlobalSearch.ts:104` | Edge `semantic-search` (`:318`); `products`, `custom_kits` (`:548`), `generated_mockups` (`:568`), `art_file_attachments` (`:589`), `cart_templates` (`:611`), `magic_up_generations` (`:632`), `product_components` (`:658`), `component_media` (`:679`); RPC `search_records_rerank` (`:730`); grava `search_analytics` (`:759`) | 🟨 | fio completo UI→edge→tabelas | ver B-2: filtro de categoria e subtítulo de produto ficam inertes porque `category_name` não vem no SELECT |
| Busca por voz | `search/VoiceSearchOverlayConnected.tsx` → `search/VoiceSearchOverlay.tsx` + `search/voice/*` | `useVoiceAgent` (`hooks/intelligence`) | ElevenLabs (lazy 205KB) | 🟨 | `VoiceSearchOverlayConnected.tsx:36` | `search/voice/VoiceOverlaySections.tsx` (201 linhas) está órfão — as seções vivas foram reimplementadas inline (`VoiceOverlaySections.tsx:155` admite isso em comentário) |
| Busca visual (imagem) | `search/VisualSearchButton.tsx:273` | `invokeEdge` (`:53`) | Edge function | 🟨 | o único importador não-barrel é `search/AdvancedSearch.tsx:8`, que por sua vez está órfão (seção D) | rota/consumidor real |
| Cache de busca | `search/searchCache.ts` | `useGlobalSearch.ts:11` | memória | ✅ | — | — |
| Busca avançada (formulário) | `search/AdvancedSearch.tsx:378 linhas` | — | — | ⬛ | só re-exportado em `search/index.ts:4` | consumidor |
| Busca com sugestões (variante) | `search/SearchWithSuggestions.tsx` | — | — | ⬛ | só re-exportado em `search/index.ts:1` | consumidor |
| Paleta antiga | `search/GlobalSearch.tsx:74` (480 linhas) | — | — | ⬛ | zero referências (seção D) | remover — substituída por `GlobalSearchPalette` |

### Fluxo 3 — Filtros

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Painel de filtros | `filters/FilterPanel.tsx:52` + `filters/filter-panel/sections/*` | `filters/filter-panel/useFilterPanelState.ts` | — | ✅ | — | — |
| Filtro por cor (server-side) | `filters/InlineColorGroupFilter.tsx`, `filters/ColorGroupFilter.tsx` | `useProductsByColor` | `color_groups` (`useProductsByColor.ts:84`), `color_variations` (`:93`), `color_nuances` (`:102`), `product_variants` (`:185`) | ✅ | `useCatalogState.ts:428-436`; `applyProductFilters.ts:107-116` | — |
| Filtro por categoria (com descendentes) | `filters/ExternalCategoryFilter.tsx:39` | `useProductsByCategory` | Edge `categories-api` action `products_by_categories` (`useProductsByCategory.ts:96-102`) | ✅ | `applyProductFilters.ts:117-125` | — |
| Filtro por material | `filters/filter-panel/sections/MaterialsFilter.tsx` | `useProductsByMaterial` → `materialService` | Edge externa via `fetch` (`services/materialService.ts:75`) | ✅ | `applyProductFilters.ts:198-207` | — |
| Filtro por tamanho | `filters/filter-panel/sections/SizeFilter.tsx` | `useProductsBySize` | `product_variants` (`useProductsBySize.ts:35`) | ✅ | `applyProductFilters.ts:281-299`; wiring no catálogo em `useCatalogState.ts:452` | — |
| Filtros de metadados (público-alvo, datas, ramos, segmentos, tags) | `filters/filter-panel/sections/RamosFilter.tsx`, `filters/CommemorativeDateFilter.tsx` | `useProductsByMetadata` | RPC `fn_super_filtro_product_ids` (`useProductsByMetadata.ts:116`) | ✅ | `useCatalogState.ts:438-445`; `applyProductFilters.ts:145-152` | — |
| Filtros puramente client-side (preço, estoque, kit, gênero, embalagem) | `filters/filter-panel/sections/SimpleFilters.tsx`, `filters/DebouncedPriceInput.tsx` | `applyProductFilters` | — | ✅ | `applyProductFilters.ts:228-278` | — |
| Presets de filtro salvos | `filters/PresetsBar.tsx:55` (usado em `pages/products/FiltersPage.tsx:472`) | `useFilterPresets` (`filters/FilterPresets.ts`) | `saved_filters` (`FilterPresets.ts:36,88,137,175,194`) | ✅ | CRUD completo UI→tabela | — |
| Filtros salvos (2ª implementação) | `filters/SavedFilters.tsx` (444 linhas) | `useSavedFilters` | **localStorage** (`SavedFilters.tsx:53,74`) | ⬛ | só re-exportado em `filters/index.ts:5` | duplicata morta do `PresetsBar`; nenhum consumidor |
| Filtros do painel que dependem de `product.tags` | — | `applyProductFilters.ts:153-197, 301-315` | — | 🟨 | os blocos só rodam quando `!hasMetadataFilter`; nos caminhos A e B `tags` vem sempre vazio (`useProductsLightweight.ts:112`; `product-types.ts:223` não seleciona `tags`) | são fallbacks inertes por construção — funcionam só via RPC |

### Fluxo 4 — Detalhe do produto (PDP)

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Carregar produto | `pages/products/ProductDetail.tsx:84` → `pages/products/product-detail/ProductDetailHero.tsx` | `useProduct` (`hooks/products/useProducts.ts:70`) → `productService.fetchProductById` (`services/productService.ts:92`) → `fetchPromobrindProductById` (`external-db/products-detail.ts:72`) | `products`, `product_images` (`:100`), `product_variants` (`:224`), `product_videos` (`:250`), `categories` (`:137`), `suppliers` (`:147`), `product_materials` (`:157`), `v_kit_component_complete` (`:301`), `product_kit_components` (`:311`) | ✅ | fio completo | — |
| Galeria + zoom | `products/ProductGallery.tsx` + `products/gallery/{GalleryColorVariations,GalleryFullscreen,GalleryVideoPlayer}.tsx` | `useProductImages` | `product_images` | ✅ | `ProductDetailHero.tsx` (import de `ProductGallery`) | — |
| Player de vídeo "PromoFlix" | `products/gallery/PromoFlixPlayer.tsx` (1512 linhas) | — | `product_videos` (via produto) | ✅ | consumido por `ProductGallery.tsx` | — |
| Contador de visualizações | `ProductDetail.tsx:110-124` | `useQuery` inline | `products.view_count` (`:113`) | ✅ | comentário `:108` documenta a decisão de RLS | — |
| Estoque futuro / reposição | `products/FutureStockModal.tsx:48` | `useProductVariantsWithStock` (`:67`) | `product_variants` | ✅ | consumido em `ProductDetail.tsx:433` | — |
| Comparação de fornecedores | `compare/SupplierComparisonModal.tsx:38` | `useSupplierComparison` → `useProducts` | caminho B | 🟨 | `hooks/products/useSupplierComparison.ts:2` | herda `category_name=null` e `price=0` do caminho B (ver B-1/B-3) |
| Produtos similares | `products/SimilarProducts.tsx:74` | `useSimilarProducts` | RPC `fn_get_similar_products` (`hooks/products/useSimilarProducts.ts:100`) + `products` (`:68`) | ✅ | resolve `category_name` por mapa próprio em `SimilarProducts.tsx:122` | — |
| Recomendações IA | `products/SmartRecommendations.tsx` | Edge | Edge function | 🟦 | consumidores: 2 refs | NAO_VERIFICADO (não li o conteúdo) |
| Recomendações IA — versão fake | `products/SmartRecommendationsMock.tsx:189` | — | array literal (`:25`) com imagens do Unsplash | ⬛ | zero consumidores | ver seções C e D |
| Compartilhar produto (WhatsApp) | `products/ShareActions.tsx` → `products/share/{SharePreviewDialog,ShareAllColorsDialog,ShareKitDialog,PhotoSelector}.tsx` | `products/share/whatsapp.ts:32` | `window.open` | ✅ | `pages/Index.tsx:199` também usa `SharePreviewDialog` | — |
| Regras de personalização | `products/ProductPersonalizationRules.tsx:141` | query inline | `product_components` (`:141`), `product_group_members` (`:153`) | ✅ | consumido em `products/ProductQuickActions.tsx:250` | — |
| Histórico de estoque | `products/StockHistoryChart.tsx` | `products/useStockChartData.ts:32` | `useStockDailySummary`/`useStockVelocity`/`useProductIntelligenceData` | 🟨 | `useStockChartData.ts:59` define `isDemo = !hasData && !hasError` e cai em `generateMockStockData/Velocities/Intelligence` (`:88,62,63,64`) | ver seção C — o gráfico mostra dados sintéticos quando a query volta vazia |
| Histórico de preços (gráfico) | `products/PriceHistoryChart.tsx:26` | — | — | ⬛ | zero consumidores | consumidor |
| Navegação por seções da PDP | `products/ProductSectionNav.tsx:21` | — | — | ⬛ | zero consumidores | consumidor |
| Galeria com zoom (alternativa) | `products/ZoomableGallery.tsx:23` + `products/zoomable-gallery/*` | — | — | ⬛ | zero consumidores da raiz (os 3 sub-arquivos só a servem) | 4 arquivos, 582 linhas mortas |
| QuickView | `products/ProductQuickView.tsx:596` | `useProductImages`, `useWordMagic` | `product_images` | ✅ | único consumidor de `shortDescription` | — |
| QuickView — galeria alternativa | `products/quick-view/QuickViewGallery.tsx:29` | — | — | ⬛ | zero consumidores | consumidor |

### Fluxo 5 — Personalização / gravação

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Opções de personalização do produto | `products/ProductCustomizationOptions.tsx:198` | `useProductCustomizationOptions` (`hooks/products/useProductCustomizationOptions.ts`) | RPC `fn_get_product_customization_options` via `invokeExternalRpc` (`:10`) | ✅ | consumido em `products/ProductQuickActions.tsx:17` e `quotes/QuoteProductCustomization.tsx:12` | — |
| Configuração por local de gravação | `products/customization/{ConfigurationPanelV6,ConfigurationPanel,LocationPanel,LocationCard,TechniqueCard,TechniqueOption,VariationSelector}.tsx` | idem | idem | ✅ | `customization/index.ts:9` re-exporta; `LocationCard` → `VariationSelector` | — |
| Cadastro de técnicas (backoffice) | `engraving/TechniquesPanel.tsx:72` | `useTecnicasUnificadas`, `useCategoriasTecnicas` | `tecnica_gravacao` (`external-db/techniques.ts:198,219`) | ✅ | rota `pages/tools/EngravingRegistrationPage.tsx:52` | — |
| Tabelas de preço de gravação | `engraving/PricingPanel.tsx:55` | `useTabelasPreco` (`hooks/tecnicas/useTabelasPreco.ts:21`), `calcularPreco` (`hooks/tecnicas/usePrecoCalculation.ts:75`) | `customization_price_tables` (`useTabelasPreco.ts:41`) e `tabela_preco_gravacao_oficial` (`external-db/techniques.ts:121`) | ✅ | rota `EngravingRegistrationPage.tsx:56` | — |
| Seletor de técnica (personalization) | `personalization/TechniqueSelector.tsx:97` | `useQuery` + `dbInvoke` (`:1`) | tabela externa de técnicas | 🟨 | re-exportado em `personalization/index.ts:2`; o `TechniqueSelector` que a UI usa é o de `pricing/simulator/TechniqueSelector.tsx` (`ProductPriceSimulator.tsx:348`) | consumidor real — duplicata de nome |
| SLA de técnica | `personalization/TechniqueSLACard.tsx:80` | `useQuery` + `dbInvoke` | tabela externa | ⬛ | só re-exportado em `personalization/index.ts:1`; zero consumidores | consumidor |
| Customização de tema | `personalization/ThemeCustomization.tsx:21` | — | — | ⬛ | zero referências | consumidor |

### Fluxo 6 — Comparação

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Lista de comparação | `compare/FloatingCompareBar.tsx` (em `pages/Index.tsx:176`), `pages/products/ComparePage.tsx:92` | `stores/useComparisonStore.ts` (zustand) | **localStorage** (`useComparisonStore.ts:3,53`) | ✅ | intencional (estado efêmero de sessão) | — |
| Resolução de produtos | `ComparePage.tsx:116-129` | `useProductsContext.getProductsByIds` (`contexts/ProductsContext.tsx:157`) | `products` (caminho B) via `fetchPromobrindProducts` (`ProductsContext.tsx:97`) | 🟨 | lazy-fetch em lote de 50ms funciona | ver B-1 e B-3: categoria e preço vêm quebrados |
| Tabela comparativa | `compare/CompareTableView.tsx:293-297` | — | — | 🟨 | linha "Categoria" renderiza `p.category?.name` (`:297`), que é `'Sem categoria'` para todo produto | corrigir origem do dado |
| Score / pesos | `compare/ComparisonScoreCard.tsx`, `hooks/comparison/useComparisonScore.ts` | `useComparisonScore` | localStorage/memória | ✅ | `ComparePage.tsx` importa de `@/hooks/comparison` | — |
| Popover de pesos | `compare/ComparisonWeightsPopover.tsx:21` | `useComparisonWeights` | — | ⬛ | zero consumidores (o `ComparePage` importa só `useComparisonShortcuts`/`useComparisonSync`) | consumidor |
| Compartilhar comparação | `compare/ShareComparisonDialog.tsx:62` | — | `user_comparisons` | ✅ | `ComparePage.tsx:...` importa o dialog | — |
| Comparações recentes | `compare/RecentComparisonsSidebar.tsx:36` | — | RPC `get_user_recent_comparisons` | ✅ | — | — |
| Estado vazio inteligente | `compare/CompareEmptyStateSmart.tsx:29` | — | RPC `get_top_compared_products` | ✅ | — | — |
| Sparkline de preço | `compare/PriceSparkline.tsx:31` | — | `price_history` | ✅ | consumido por `CompareTableView` | — |
| Overlay de preço histórico | `compare/HistoricalPriceOverlay.tsx:17` | — | `price_history` (`:35`) | ⬛ | zero consumidores | consumidor |
| Conselheiro IA | `compare/AIComparisonAdvisor.tsx:51` | `invokeEdge` | Edge `comparison-ai-advisor` | ✅ | `ComparePage.tsx` importa | — |
| Modo foco | `compare/FocusModeToggle.tsx:10,45` | — | — | ⬛ | zero consumidores | consumidor |
| Zoom de imagem em célula | `compare/ImageZoomCell.tsx:17` | — | — | ⬛ | zero consumidores | consumidor |
| Cheatsheet de atalhos | `compare/ComparisonShortcutsCheatsheet.tsx:37` | — | — | ⬛ | zero consumidores (embora `useComparisonShortcuts` esteja ativo) | consumidor |
| Coluna arrastável | `compare/SortableColumnWrapper.tsx:61` | — | — | ⬛ | zero consumidores | consumidor |
| Hook `useComparison` (legado) | `hooks/comparison/useComparison.ts:17` | — | localStorage `product-comparison` | ⬛ | só re-exportado em `hooks/comparison/index.ts:2`; a UI usa `stores/useComparisonStore.ts` | duplicata morta |

### Fluxo 7 — Favoritos

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Listas de favoritos (CRUD) | `favorites/FavoriteListsSidebar.tsx`, `favorites/CreateListDialog.tsx`, `favorites/ShareListDialog.tsx` | `useFavoriteLists` (`hooks/favorites/useFavoriteLists.ts`) | `favorite_lists` (`:85,123,152,185,218,235`), RPC `ensure_default_favorite_list` (`:79`) | ✅ | fio completo | — |
| Itens da lista | `pages/products/FavoritesPage.tsx:150` | `useEnrichedFavoriteItems` | `favorite_items` (`useFavoriteLists.ts:172,276,299,327,342,393,412`) | ✅ | — | — |
| Lixeira (TTL 30d) | `favorites/FavoritesTrashView.tsx` | `useFavoriteTrash` | `favorite_items_trash` (`useFavoriteLists.ts:359,452,538,547`) | ✅ | — | — |
| Nota por item | `favorites/ItemNoteEditor.tsx` | `useEnrichedFavoriteItems.updateItem` | `favorite_items` | ✅ | `FavoritesPage.tsx:44` | — |
| Queda de preço | `favorites/PriceDropBadge.tsx` | `price_at_save` gravado em `useFavoriteQuickAdd.ts:76-82` | `favorite_items.price_at_save` | ✅ | — | — |
| Heatmap semanal | `favorites/FavoritesHeatmap.tsx:22` | — | RPC `get_favorites_weekly_count` | ✅ | — | — |
| Estado vazio inteligente | `favorites/FavoritesEmptyStateSmart.tsx:24` | — | RPC `get_top_favorited_products` | ✅ | — | — |
| Seletor rápido de lista | `favorites/QuickListPicker.tsx` | `useFavoriteQuickAdd` (`hooks/favorites/useFavoriteQuickAdd.ts:22`) | `favorite_items` (`:69`) | ✅ | — | — |
| Migração localStorage → nuvem | — | `useLegacyFavoritesMigration` (`useFavoriteLists.ts:566`) | `favorite_items` upsert (`:604`) | 🟨 | one-shot por usuário, com flag `favorites-migrated-<uid>` (`:572`) | ver B-4: após a migração, favoritar pela grade volta a gravar só em localStorage |
| **Favoritar pelo card do catálogo** | `products/ProductCard.tsx:451-465`, `catalog/CatalogContent.tsx:183,230` | `useFavoritesStore` (`stores/useFavoritesStore.ts:70`) | **localStorage apenas** (`:64`) | 🟨 | ver B-4 | ligar ao `useFavoriteQuickAdd` |

### Fluxo 8 — Carrinho (carrinhos do vendedor)

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Adicionar ao carrinho | `products/ProductCard.tsx:354` (`addToActiveCart`), `products/QuickAddToQuote.tsx:65`, `products/ProductQuickActionsFAB.tsx:30-31` | `useSellerCartContext` (`contexts/SellerCartContext.tsx:756`) → `useSellerCarts` (`hooks/products/useSellerCarts.ts:189`) | `seller_cart_items` insert (`useSellerCarts.ts:572,1076,1140`) | ✅ | fio completo UI→contexto→hook→tabela | — |
| Painel do carrinho (header) | `cart/CartHeaderButton.tsx:109` + `cart/PopoverQtyInput.tsx`, `cart/CartItemErrorAlert.tsx`, `cart/cartCompanyCnpj.ts` | `useSellerCartContextSafe` (`SellerCartContext.tsx:773`) | `seller_cart_items` | ✅ | — | — |
| Reordenar itens (drag) | `cart/SortableCartItem.tsx` | `useSellerCarts` | `seller_cart_items` update (`:1000-1035`) | ✅ | — | — |
| Múltiplos carrinhos / empresa | `cart/CartCompanyPicker.tsx`, `cart/CartCompanyPickerDialog.tsx`, `cart/CartSelectorDialog.tsx` | `useSellerCarts` | `seller_carts` (`:295,354,419,440,494,745,803,851`) | ✅ | limite em `MAX_SELLER_CARTS` (`CartHeaderButton.tsx:39`) | — |
| Restaurar carrinho (undo) | `cart/cart-utils/CartDialogs.tsx` | `useSellerCarts` | RPC `restore_seller_cart` (`:331`) | ✅ | — | — |
| Exportar CSV/PDF | `cart/cart-utils/CartExport.ts:72,86` | — | client-side (`Blob`, `:76`) | ✅ | usado por `cart/CartUtilComponents.tsx` | — |
| Estado vazio inteligente | `cart/CartEmptyStateSmart.tsx` | — | — | ✅ | `pages/products/SellerCartsPage.tsx` | — |
| Abas ricas de carrinho | `cart/CartTabsRich.tsx:30` (265 linhas) | — | — | ⬛ | zero consumidores (tem teste em `__tests__/CartTabsRich.limit.test.tsx`, mas nenhum uso em app) | consumidor |
| Sugestão de bundle | `cart/BundleSuggestionCard.tsx:24,29` | — | RPC `get_bundle_suggestions` (`:29`) | ⬛ | zero consumidores — RPC real, componente nunca montado | consumidor |

### Fluxo 9 — Orçamento (quote)

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Builder — criar/editar | `pages/quotes/QuoteBuilderPage.tsx:117` → `quotes/QuoteBuilderSummaryColumn.tsx:715`, `quotes/QuoteBuilderStepper.tsx`, `quotes/QuoteItemsTable.tsx` | `useQuoteBuilderState` (`hooks/quotes/useQuoteBuilderState.ts:144`) → `useQuotes` (`hooks/quotes/useQuotes.ts:204,213`) → `quoteService` | `quotes` insert/update, `quote_items`, `quote_item_personalizations` (`services/quoteService.ts:54,75,80,94,334,349`); RPC `update_quote_transactional` (`:294`) | ✅ | fio completo | — |
| Reordenar itens (persistente) | `quotes/QuoteBuilderSummaryColumn.tsx:99` | `persistItemsOrder` (`services/quoteItemsReorder.ts:26`) | `quote_items.sort_order` (`:38`) | ✅ | — | — |
| Autosave | `quotes/QuoteAutoSave.tsx` + `quotes/quoteAutoSaveStatus.ts` | `useAutoSaveQuote` | localStorage + `quotes` | ✅ | — | — |
| Guarda de concorrência | `quotes/QuoteConcurrencyAlert.tsx` | `useQuoteConcurrencyGuard` (`hooks/quotes/useQuoteConcurrencyGuard.ts:65`) | `quotes` | ✅ | versão passada em `quoteService.ts:299` | — |
| Busca de produto no builder | `quotes/QuoteBuilderProductSearch.tsx` + `quotes/QuoteProductColorSelector.tsx` | `useExternalVariantStock` (`hooks/products/useExternalVariantStock.ts:50`) | `product_variants`, `product_images` | ✅ | — | — |
| Personalização do item | `quotes/QuoteProductCustomization.tsx:12` → `products/ProductCustomizationOptions.tsx` | `useProductCustomizationOptions` | RPC `fn_get_product_customization_options` | ✅ | — | — |
| Cliente/contato | `quotes/CompanyContactSelector.tsx` + `quotes/company-contact/{CompanySearchDropdown,ContactSelector}.tsx` | `crm-db` | CRM externo | ✅ | `CompanySearchDropdown.tsx:449 linhas` | — |
| Status + transições | `quotes/QuotesStatusChips.tsx`, `quotes/QuoteStatusTimeline.tsx` | `quoteService.updateQuoteStatus` (`:366`) | `quotes.status` + validação `isValidQuoteTransition` (`:380`) | ✅ | telemetria de transição inválida em `:383` | — |
| Aprovação de desconto | — | `useDiscountApproval` (`hooks/quotes/useDiscountApproval.ts`) | `discount_approval_requests` (`:99,131,343,437,500`), `quotes` (`:173,187,373`), `quote_history` (`:201,377`), `admin_audit_log` (`:222`), `workspace_notifications` (`:258,406`) | ✅ | fio completo | — |
| Card de aprovação (UI) | `quotes/QuoteApprovalCard.tsx:22` | — | — | ⬛ | zero consumidores — a lógica de aprovação existe e é usada, mas **este** card não | consumidor |
| Versões / comparação | `quotes/QuoteVersionHistory.tsx` → `quotes/QuoteVersionCompare.tsx:146,157` | `useQuoteVersions` (`hooks/quotes/useQuoteVersions.ts:40,57,72,122`) | `quotes`, `quote_items` | ✅ | `pages/quotes/QuoteViewPage.tsx` | — |
| Histórico | `quotes/QuoteHistoryPanel.tsx` | `useQuoteHistory` (`hooks/quotes/useQuoteHistory.ts:41,73`) | `quote_history` | ✅ | — | — |
| Kanban | `quotes/QuoteKanbanBoard.tsx:59` + `quotes/QuoteCard.tsx` | `useQuotes` | `quotes` | ✅ | `pages/quotes/QuotesKanbanPage.tsx` | — |
| Lista configurável | `quotes/QuotesConfigurableList.tsx:76` + `quotes/QuoteListCellRenderer.tsx` | `useQuotesListPage` | `quotes` | ✅ | — | — |
| Templates | — | `useQuoteTemplates` (`hooks/quotes/useQuoteTemplates.ts:108,131,188,211,244,259,287,370`) | `quote_templates` | ✅ | — | — |
| Geração de PDF | `quotes/PdfGenerationDialog.tsx:30` + `quotes/PdfPrintHelpDialog.tsx` | `generateProposalPDFv2` (`utils/proposalPdfReactGenerator`) | client-side + telemetria `pdf.print` (`:39`) | ✅ | `pages/quotes/QuoteViewPage.tsx` | — |
| Handoff simulador → orçamento | `hooks/quotes/useQuoteBuilderState.ts:609-670` | `location.state.simulationData` | — | 🟨 | funciona só a partir de `components/simulator/wizard/StepComparison.tsx:65` | ver B-5: os CTAs de `pricing/` mandam payload e rota errados |
| Navegação do builder | `quotes/QuoteBuilderNavigation.tsx:11` | — | — | ⬛ | zero consumidores | consumidor |
| Editor de lista de itens | `quotes/ItemsListEditor.tsx:24` | — | — | ⬛ | zero consumidores | consumidor |
| Filtros de orçamento | `quotes/QuoteFilters.tsx:34` | — | — | ⬛ | zero consumidores | consumidor |
| Assinatura do orçamento | `quotes/QuoteSignaturePad.tsx:17` | — | — | ⬛ | zero consumidores | fluxo de assinatura inexistente |
| Seletor de cliente (legado) | `quotes/ClientPicker.tsx:23` | — | — | ⬛ | zero consumidores (substituído por `CompanyContactSelector`) | remover |
| Banner de validade | `quotes/QuoteValidityBanner.tsx:9` | — | — | ⬛ | zero consumidores | consumidor |
| Badge de margem | `quotes/MarginInsightBadge.tsx:22,41` | query inline | `quotes` (`:41`) | ⬛ | zero consumidores — consulta real, componente nunca montado | consumidor |

### Fluxo 10 — Precificação / simulador

| Funcionalidade | Componentes | Hook/Serviço | Tabela/RPC | Cls. | Evidência | O que falta |
|---|---|---|---|---|---|---|
| Simulador por produto | `pages/tools/PriceSimulatorPage.tsx:54` → `pricing/ProductPriceSimulator.tsx:94` | `useQuery`+`dbInvoke` (`:1,116`), `pricing/simulator/TechniqueSelector.tsx`, `pricing/simulator/MultiEngravingResult.tsx:81` | `product_variants`; `customization_price_tables` via `calculatePrice` | ✅ | rota `routes/tools-routes.tsx:40` | — |
| Busca de produto no simulador | `pricing/simulator/ProductSearch.tsx:21` | `useExternalProductSearch` (`hooks/simulation/useExternalSimulator.ts:119`) | `products` externo | 🟨 | `ProductSearch.tsx:31` grava `category_name: null` hardcoded | ver seção C |
| Calculadora por tiragem | `pages/tools/PriceSimulatorPage.tsx:58` → `pricing/QuantityPriceCalculator.tsx:33` | `useCustomizationPricing`, `pricing/calculator/{TechniqueMultiSelector,TechniqueConfigCard,QuantityComparisonTable}.tsx` | `customization_price_tables` | 🟨 | props `productBasePrice`/`productName`/`onSelectTechnique` declaradas (`:28-30`) mas **não desestruturadas** (`:33` só pega `className`) | ver B-6 |
| Upsell | `pricing/simulator/upsell/UpsellPlusPlus.tsx` + `upsell-engine.ts` | — | — | 🟦 | 2 refs internas; NAO_VERIFICADO o gatilho na UI | — |
| CTA "Criar orçamento" | `pricing/ProductPriceSimulator.tsx:414`, `pricing/QuantityPriceCalculator.tsx:248` | `navigate('/orcamentos', {state})` (`:245`, `:97`) | — | 🟨 | rota e payload divergem do que o builder lê | ver B-5 |

---

## B) Fios quebrados — onde a cadeia UI→persistência se rompe

### B-1 · `category_name` nunca chega no caminho de lista enriquecida

**Onde rompe:** no SELECT. `PRODUCT_SELECT_FIELDS_WITH_SALE` (`src/lib/external-db/product-types.ts:223-232`) **não inclui** a coluna `category_name`, e `enrichProducts` (`src/lib/external-db/products.ts:265-567`) só preenche `supplier_name` (`:563-565`). Consequentemente `mapPromobrindToProduct` (`src/utils/product-mapper.ts:147-148,172-175`) escreve sempre:

```
category_name: null
category: { id: ..., name: 'Sem categoria' }
```

**Impacto medido:**
- `src/components/compare/CompareTableView.tsx:297` — a linha "Categoria" da tabela de comparação sempre exibe `Sem categoria`, e `allEqual(...)` em `:79` classifica a categoria como "igual" para qualquer conjunto (contamina o modo "só diferenças").
- `src/pages/products/FavoritesPage.tsx:304` — a ordenação por categoria compara `null` com `null` → é um no-op.
- `src/components/search/useGlobalSearch.ts:397` — o subtítulo do resultado de produto sempre mostra `Sem categoria`.
- `src/components/search/useGlobalSearch.ts:353-357` — quando a intenção da IA traz `filters.category`, o `.filter()` sobre `p.category_name` remove **100%** dos produtos.
- `src/services/productService.ts:59-66` — o filtro `filters.category` só funciona pela via `String(p.category_id) === category`; a via por nome nunca casa.

**Não afeta:** catálogo `/` e Super Filtro `/filtros`, que usam `leaf_category_name` (`src/hooks/products/useProductsLightweight.ts:71-73`), nem a PDP, que resolve categoria em `src/lib/external-db/products-detail.ts:115-180`.

### B-2 · `tags` nunca chega no caminho de lista

`PRODUCT_SELECT_FIELDS_WITH_SALE` não seleciona `tags` (só `PRODUCT_SELECT_FIELDS_DETAIL` seleciona, `product-types.ts:271`). Logo `normalizeMarketingTags(p.tags)` (`src/utils/product-mapper.ts:180`) recebe `undefined` e devolve cinco arrays vazios; `extractDescriptiveTags` (`:181`) devolve `[]`. No caminho leve, `tags` é literalmente hardcoded vazio (`src/hooks/products/useProductsLightweight.ts:112`).

O código **sabe disso** e mitiga via RPC server-side (`applyProductFilters.ts:45-54,142-152`), então os filtros de metadados funcionam. Mas os blocos client-side de fallback (`applyProductFilters.ts:153-197` e `:301-315`) são **inertes por construção** — só rodariam quando `hasMetadataFilter` é falso, e nesse caso `product.tags.*` está vazio. `descriptiveTags`, usado pelo "Match de Produtos" como sinal primário de similaridade (documentado em `src/types/product-catalog.ts:106-111`), fica sempre vazio no caminho B.

### B-3 · `price = 0` no caminho de lista enriquecida quando `sale_price` é nulo

`getProductPrice` (`src/lib/external-db/product-types.ts:209-211`) é `sale_price ?? base_price ?? 0`. A coluna `base_price` **não aparece em nenhuma das seis constantes de SELECT** (`product-types.ts:223,234,244,255,265,276`) — só existe na declaração de tipo (`:14`) e na regex de fallback (`:289`). `cost_price` é selecionado mas **ignorado** por esse getter.

O caminho leve usa `sale_price ?? cost_price ?? 0` (`src/hooks/products/useProductsLightweight.ts:33,67`). Resultado: o **mesmo produto** pode exibir preço no catálogo e `R$ 0,00` nas telas de Comparar/Favoritos/Coleções/Vistos Recentemente/Match/Revista, que resolvem via `ProductsContext` (`src/contexts/ProductsContext.tsx:97-101`).

Cadeia de consumo afetada: `ComparisonRadarChart.tsx:48,53`, `SimilarProductsRail.tsx:34`, `CompareTableView.tsx`, `FavoritesPage`, `applyProductFilters.ts:233-236`.

### B-4 · Favoritar pela grade do catálogo não persiste no banco

Existem dois caminhos de favoritar, e a grade usa o errado:

| Elo | Arquivo:linha | O que faz |
|---|---|---|
| Handler correto (grava no Supabase) | `src/hooks/products/useCatalogState.ts:902-918` (`handleFavoriteProduct` → `favQuickAdd.addToList`) | `favorite_items` upsert (`src/hooks/favorites/useFavoriteQuickAdd.ts:69-83`) |
| Handler efetivamente ligado à grade | `src/hooks/products/useCatalogState.ts:145-150` (`toggleFavorite` = `baseToggleFavorite`) | `localStorage.setItem` (`src/stores/useFavoritesStore.ts:64`) |
| Onde a troca acontece | `src/components/catalog/CatalogContent.tsx:79` — `handleFavoriteProduct: _handleFavoriteProduct` é recebido e **descartado** (prefixo `_`) | — |
| Prop realmente passada ao grid/tabela | `src/components/catalog/CatalogContent.tsx:183` e `:230` — `onToggleFavorite={toggleFavorite}` | — |
| Onde o card consome | `src/components/products/ProductCard.tsx:456-457` (desfavoritar) e `:400` (`addFavorite` do store, ao confirmar variante) | — |

O handler correto sobrevive apenas no atalho de teclado (`src/hooks/products/useCatalogState.ts:989`). O Super Filtro repete o mesmo padrão: `src/pages/products/FiltersPage.tsx:611,656,685` passam `toggleFavorite` do store.

**Consequência:** depois que `useLegacyFavoritesMigration` roda uma vez (`src/hooks/favorites/useFavoriteLists.ts:566-618`, com flag idempotente em `:572`), todo favorito criado pelo coração do card fica **só no navegador** e nunca aparece nas listas remotas exibidas por `useEnrichedFavoriteItems` em `src/pages/products/FavoritesPage.tsx:150`.

### B-5 · CTA "Criar orçamento" do simulador de preços aterrissa na rota errada com payload errado

| Emissor | Rota | Payload |
|---|---|---|
| `src/components/pricing/ProductPriceSimulator.tsx:244-253` | `/orcamentos` (lista) | `{ fromSimulator, product, engravings, quantity }` |
| `src/components/pricing/QuantityPriceCalculator.tsx:96-105` | `/orcamentos` (lista) | `{ fromSimulator, product, techniques, quantities }` |
| **Consumidor real** `src/hooks/quotes/useQuoteBuilderState.ts:609-622` | montado em `/orcamentos/novo` (`src/routes/quote-routes.tsx:29`) | espera `{ fromSimulator, simulationData: { product, quantity, personalizations } }` |

`/orcamentos` resolve para `QuotesListPage` (`src/routes/quote-routes.tsx:22`), que não lê `location.state`. Mesmo se a rota fosse corrigida, `state.simulationData` seria `undefined` e o guard em `useQuoteBuilderState.ts:622` abortaria. O único emissor correto é `src/components/simulator/wizard/StepComparison.tsx:65` (fora deste escopo).

Resultado: clicar em "Criar orçamento" no `/simulador-precos` (`ProductPriceSimulator.tsx:414`, `QuantityPriceCalculator.tsx:248`) apenas navega para a lista de orçamentos, descartando toda a simulação.

### B-6 · `QuantityPriceCalculator` ignora as próprias props

`src/components/pricing/QuantityPriceCalculator.tsx:28-30` declara `productBasePrice`, `productName` e `onSelectTechnique`; `:33` desestrutura **apenas** `className`. As três props são inertes. O único chamador já passa valores vazios: `src/pages/tools/PriceSimulatorPage.tsx:58` → `productBasePrice={0} onSelectTechnique={() => {}}`.

### B-7 · Gráfico de estoque cai em dados sintéticos sem sinalização de fonte

`src/components/products/useStockChartData.ts:59` define `isDemo = !hasData && !hasError`. Quando a query de `stock_daily_summary` volta vazia (produto sem histórico) — e **não** quando falha — o hook devolve séries geradas por `generateMockStockData` (`:88,91`), `generateMockVelocities` (`:62`), `generateMockIntelligence` (`:63`) e `generateMockSupplierNames` (`:64`). Esses valores alimentam "Demanda de mercado" (`:167-175`), "tendência" (`:164`) e os flags de inteligência (`:152-160`) exibidos em `src/components/products/StockHistoryChart.tsx`. O flag `isDemo` é exportado (`:220`), mas é preciso `NAO_VERIFICADO` se `StockHistoryChart` o renderiza como aviso ao usuário — não li o arquivo integralmente.

### B-8 · `BulkAddToCartModal` passa `onCreated` no-op

`src/components/catalog/BulkAddToCartModal.tsx:143` — `<CartCompanyPicker onCreated={() => {}} .../>`. O callback de "carrinho criado" é descartado; o modal não reage à criação. Impacto exato depende do `CartCompanyPicker` — `NAO_VERIFICADO`.

---

## C) Dado fictício / hardcoded

| Item | Arquivo:linha | Natureza | Situação |
|---|---|---|---|
| Recomendações fake com produtos e preços inventados (`R$ 17,90`, `R$ 32,40`, `R$ 21,50`) e imagens do Unsplash | `src/components/products/SmartRecommendationsMock.tsx:25-...`, render em `:245` | array literal fingindo saída de IA | ⬛ sem consumidor — não chega ao usuário hoje, mas é código de produção comitado |
| Séries sintéticas de estoque/velocidade/inteligência | `src/components/products/useStockChartData.ts:62,63,64,88,91,124,126` (geradores em `src/lib/stock-chart-utils`) | fallback de demo quando não há histórico | 🟨 ativo em produção |
| `category_name: null` fixo no mapeamento do simulador | `src/components/pricing/simulator/ProductSearch.tsx:31` | campo zerado no mapper | 🟨 ativo |
| `category_name: null` fixo no mapeamento da calculadora | `src/components/pricing/QuantityPriceCalculator.tsx:52` (dentro de `handleProductSelect`) | idem | 🟨 ativo |
| `tags` sempre vazio no catálogo leve | `src/hooks/products/useProductsLightweight.ts:112` | objeto literal vazio no lugar de dado de API | 🟨 documentado e mitigado via RPC |
| `colors: []` / `materials: []` / `dimensions: {}` no catálogo leve | `src/hooks/products/useProductsLightweight.ts:94-95,113` | idem | ✅ intencional (enriquecimento posterior), documentado em `applyProductFilters.ts:208-220` |
| `priceFreshnessThresholdDays: null` fixo | `src/hooks/products/useProductsLightweight.ts:115` | threshold não carregado no catálogo | 🟨 |
| `productBasePrice={0}` e `onSelectTechnique={() => {}}` | `src/pages/tools/PriceSimulatorPage.tsx:58` | props no-op | 🟨 |
| `onCreated={() => {}}` | `src/components/catalog/BulkAddToCartModal.tsx:143` | callback no-op | 🟨 |
| `hex` default `#CCCCCC` para variantes sem cor | `src/lib/external-db/products.ts:523`, `src/utils/product-mapper.ts:127` | placeholder visual | ✅ aceitável |
| `supplier: { id: 'unknown', name: 'Fornecedor' }` | `src/utils/product-mapper.ts:176-179`; `useProductsLightweight.ts:111` | fallback | 🟨 no caminho leve, `supplier.name` é sempre `p.brand` — `supplier_name` não é resolvido |

**`Math.random()`:** ocorre **apenas** em efeito visual de partículas da busca por voz (`src/components/search/voice/FloatingParticles.tsx:47,48,50,51,54,55,56,58,105,106`) e no guard de HMR do `ProductsContext` (`src/contexts/ProductsContext.tsx:21-22`). **Nenhum uso em preço, estoque ou métrica de negócio** no escopo.

**"Em breve" / TODO / stub:** varredura por `em breve|coming soon|TODO|FIXME|não implementado|WIP` nos 11 diretórios retornou apenas rótulos legítimos de domínio (`ProductStatusBadge.tsx:235` "Termina em breve" para promoção; `FutureStockModal.tsx:530` "Em breve" para previsão de reposição). Nenhum placeholder de funcionalidade.

---

## D) Componentes sem consumidor (prova por grep)

Método: para cada símbolo exportado, `grep -rn "\b<Símbolo>\b" src --include=*.ts --include=*.tsx`, excluindo o próprio arquivo e `__tests__/*.test.*`. Contagem resultante = 0.

| # | Arquivo:linha do export | Linhas | Nota |
|---|---|---|---|
| 1 | `src/components/products/ProductHoverPreview.tsx:25` | 145 | — |
| 2 | `src/components/products/ProductVariations.tsx:21` | 61 | também exporta um `ProductVariation` concorrente (`:7`) |
| 3 | `src/components/products/PriceHistoryChart.tsx:26` | 83 | — |
| 4 | `src/components/products/ProductIntelligence.tsx:15` | 176 | — |
| 5 | `src/components/products/KitVisualComposition.tsx:23` | 56 | `KitComposition.tsx` (vivo) é outro componente |
| 6 | `src/components/products/quick-view/QuickViewGallery.tsx:29` | 150 | — |
| 7 | `src/components/products/PriceFreshnessThresholdEditor.tsx:31` | 132 | — |
| 8 | `src/components/products/SmartRecommendationsMock.tsx:189` | 259 | contém dados fake (seção C) |
| 9 | `src/components/products/ProductSectionNav.tsx:21` | 118 | — |
| 10 | `src/components/products/ZoomableGallery.tsx:23` | 236 | arrasta consigo `zoomable-gallery/GalleryThumbnails.tsx` (83), `GalleryToolbar.tsx` (105), `useGalleryZoom.ts` (158) — únicos consumidores são ele mesmo |
| 11 | `src/components/products/RecentlyViewedBar.tsx:23` | 147 | `RecentlyViewedPopover.tsx` (vivo) é o substituto |
| 12 | `src/components/products/RelatedProducts.tsx` | 169 | só re-exportado em `src/components/products/index.ts:3` |
| 13 | `src/components/quotes/QuoteBuilderNavigation.tsx:11` | 32 | — |
| 14 | `src/components/quotes/ItemsListEditor.tsx:24` | 91 | — |
| 15 | `src/components/quotes/QuoteFilters.tsx:34` | 60 | — |
| 16 | `src/components/quotes/QuoteSignaturePad.tsx:17` | 146 | não existe fluxo de assinatura no app |
| 17 | `src/components/quotes/ClientPicker.tsx:23` | 58 | substituído por `CompanyContactSelector` |
| 18 | `src/components/quotes/QuoteApprovalCard.tsx:22` | 75 | a lógica (`useDiscountApproval`) está viva; o card não |
| 19 | `src/components/quotes/QuoteValidityBanner.tsx:9` | 48 | — |
| 20 | `src/components/quotes/MarginInsightBadge.tsx:22` | 141 | consulta `quotes` em `:41` sem nunca ser montado |
| 21 | `src/components/cart/CartTabsRich.tsx:30` | 265 | tem teste (`__tests__/CartTabsRich.limit.test.tsx`) sem uso em app |
| 22 | `src/components/cart/BundleSuggestionCard.tsx:24` | 115 | chama RPC `get_bundle_suggestions` (`:29`) sem nunca ser montado |
| 23 | `src/components/search/GlobalSearch.tsx:74` | 480 | duplicata da `GlobalSearchPalette` (viva em `layout/Header.tsx:232`) |
| 24 | `src/components/search/AdvancedSearch.tsx` | 378 | só em `search/index.ts:4`; arrasta `VisualSearchButton.tsx` (284) |
| 25 | `src/components/search/SearchWithSuggestions.tsx` | 210 | só em `search/index.ts:1` |
| 26 | `src/components/search/voice/VoiceOverlaySections.tsx:24,87,163` | 201 | `:155` documenta que o footer foi reimplementado inline |
| 27 | `src/components/filters/SavedFilters.tsx` | 444 | só em `filters/index.ts:5`; sistema paralelo em localStorage (`:53,74`) |
| 28 | `src/components/compare/ComparisonWeightsPopover.tsx:21` | 81 | — |
| 29 | `src/components/compare/ImageZoomCell.tsx:17` | 59 | — |
| 30 | `src/components/compare/ComparisonShortcutsCheatsheet.tsx:37` | 106 | — |
| 31 | `src/components/compare/FocusModeToggle.tsx:10,45` | 53 | ambos os exports órfãos |
| 32 | `src/components/compare/HistoricalPriceOverlay.tsx:17` | 70 | consulta `price_history` (`:35`) sem consumidor |
| 33 | `src/components/compare/SortableColumnWrapper.tsx:61` | 94 | — |
| 34 | `src/components/personalization/TechniqueSLACard.tsx:80` | 305 | só em `personalization/index.ts:1` |
| 35 | `src/components/personalization/ThemeCustomization.tsx:21` | 61 | — |

**Total: 35 arquivos, ≈ 5.400 linhas produtivas sem qualquer chamador.** Isso é ~6,4% do escopo.

**Órfãos fora dos 11 diretórios, mas no fio comercial:**
- `src/hooks/comparison/useComparison.ts:17` (~120 linhas) — só re-exportado em `hooks/comparison/index.ts:2`; a UI usa `stores/useComparisonStore.ts`.
- `src/types/product.ts:4` (143 linhas) — tipo `Product` alternativo sem nenhum importador.

---

## E) Cobertura

### Números

| Categoria | Qtd |
|---|---|
| Arquivos no escopo (`.ts`/`.tsx`) | **388** |
| — de teste (`__tests__/`, `*.test.*`) | 107 (não auditados individualmente) |
| — produtivos | **281** |
| Lidos integralmente | **9** |
| Inspecionados por grep dirigido de conteúdo (imports, `.from()`, `.rpc()`, handlers, campos críticos) | **≈ 96** |
| Alcançados apenas por varredura estrutural (contagem de linhas + prova de consumidor por símbolo) | **176** |
| Não alcançados | **0** |

Todos os 281 arquivos produtivos passaram pela varredura de consumidor (grep por símbolo exportado) e pela contagem de linhas. Nenhum arquivo ficou fora. O que varia é a **profundidade**: 176 arquivos tiveram apenas verificação de existência de chamador, sem leitura de lógica interna — para esses, a classificação de fluxo herda a do módulo, e comportamento interno é `NAO_VERIFICADO`.

### Arquivos lidos integralmente

Dentro do escopo:
1. `src/components/catalog/CatalogContent.tsx` (257)
2. `src/components/products/useStockChartData.ts` (244)
3. `src/components/search/VoiceSearchOverlayConnected.tsx` (68)

Fora do escopo, mas indispensáveis para rastrear os fios (elos de hook/serviço/persistência):
4. `src/types/product.ts` (143)
5. `src/types/product-catalog.ts` (282)
6. `src/hooks/products/useProducts.ts` (92)
7. `src/services/productService.ts` (124)
8. `src/utils/product-mapper.ts` (280)
9. `src/lib/external-db/products.ts` (567)
10. `src/hooks/products/useProductsLightweight.ts` (427)
11. `src/pages/filters/applyProductFilters.ts` (331)
12. `src/contexts/ProductsContext.tsx` (247)
13. `src/hooks/tecnicas/usePrecoCalculation.ts` (286)
14. `src/pages/Index.tsx` (223)
15. `src/pages/tools/PriceSimulatorPage.tsx` (64)

### Anexo — inventário completo (281 arquivos produtivos)

Formato: `caminho | linhas | nº de arquivos que o referenciam (excl. testes) | classificação`.
Classificação `✅/🟨/⬛` conforme apurado; `🟦` onde há consumidor mas o comportamento interno não foi inspecionado.

#### `cart/` (16)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| cart/BundleSuggestionCard.tsx | 115 | 0 | ⬛ |
| cart/CartCompanyPicker.tsx | 326 | 5 | ✅ |
| cart/CartCompanyPickerDialog.tsx | 455 | 5 | ✅ |
| cart/CartEmptyStateSmart.tsx | 140 | 1 | ✅ |
| cart/CartHeaderButton.tsx | 1005 | 6 | ✅ |
| cart/CartItemErrorAlert.tsx | 72 | 1 | ✅ |
| cart/CartItemSkeleton.tsx | 56 | 2 | ✅ |
| cart/CartSelectorDialog.tsx | 115 | 8 | ✅ |
| cart/CartTabsRich.tsx | 265 | 0 | ⬛ |
| cart/CartUtilComponents.tsx | 114 | 9 | ✅ |
| cart/PopoverQtyInput.tsx | 195 | 1 | ✅ |
| cart/SortableCartItem.tsx | 545 | 2 | ✅ |
| cart/cart-utils/CartDialogs.tsx | 266 | 1 | ✅ |
| cart/cart-utils/CartExport.ts | 148 | 1 | ✅ |
| cart/cart-utils/CartMobileSheet.tsx | 93 | 1 | ✅ |
| cart/cartCompanyCnpj.ts | 57 | 1 | ✅ |

#### `catalog/` (8)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| catalog/BulkAddToCartModal.tsx | 201 | 4 | 🟨 (B-8) |
| catalog/BulkVariantWizard.tsx | 409 | 14 | 🟦 |
| catalog/CatalogActiveFilters.tsx | 327 | 1 | ✅ |
| catalog/CatalogBulkModals.tsx | 70 | 2 | ✅ |
| catalog/CatalogContent.tsx | 257 | 3 | 🟨 (B-4) |
| catalog/CatalogHeader.tsx | 215 | 2 | ✅ |
| catalog/CatalogToolbar.tsx | 231 | 3 | ✅ |
| catalog/useCatalogSelection.ts | 248 | 4 | ✅ |

#### `compare/` (25)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| compare/AIComparisonAdvisor.tsx | 211 | 1 | ✅ |
| compare/CompareEmptyStateSmart.tsx | 127 | 1 | ✅ |
| compare/CompareTableView.tsx | 546 | 1 | 🟨 (B-1) |
| compare/ComparisonDuelView.tsx | 193 | 2 | 🟦 |
| compare/ComparisonHighlights.tsx | 27 | 1 | 🟦 |
| compare/ComparisonMobileView.tsx | 141 | 1 | 🟦 |
| compare/ComparisonPresentationLauncher.tsx | 294 | 1 | 🟦 |
| compare/ComparisonRadarChart.tsx | 130 | 1 | 🟨 (B-3) |
| compare/ComparisonScoreCard.tsx | 144 | 1 | ✅ |
| compare/ComparisonShortcutsCheatsheet.tsx | 106 | 0 | ⬛ |
| compare/ComparisonWeightsPopover.tsx | 81 | 0 | ⬛ |
| compare/ExportComparisonButton.tsx | 160 | 1 | 🟦 |
| compare/FloatingCompareBar.tsx | 160 | 3 | ✅ |
| compare/FocusModeToggle.tsx | 53 | 0 | ⬛ |
| compare/HistoricalPriceOverlay.tsx | 70 | 0 | ⬛ |
| compare/ImageZoomCell.tsx | 59 | 0 | ⬛ |
| compare/OtherSuppliersRow.tsx | 80 | 1 | 🟦 |
| compare/PriceSparkline.tsx | 114 | 2 | ✅ |
| compare/RecentComparisonsSidebar.tsx | 105 | 1 | ✅ |
| compare/ShareComparisonDialog.tsx | 164 | 1 | ✅ |
| compare/SimilarProductsRail.tsx | 89 | 1 | 🟨 (B-3) |
| compare/SortableColumnWrapper.tsx | 94 | 0 | ⬛ |
| compare/StockRiskBadge.tsx | 40 | 1 | 🟦 |
| compare/SupplierComparisonModal.tsx | 866 | 1 | 🟨 (B-1/B-3) |
| compare/SyncedZoomGallery.tsx | 305 | 2 | 🟦 |

#### `engraving/` (2)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| engraving/PricingPanel.tsx | 384 | 1 | ✅ |
| engraving/TechniquesPanel.tsx | 307 | 1 | ✅ |

#### `favorites/` (12)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| favorites/CreateListDialog.tsx | 166 | 1 | ✅ |
| favorites/FavoriteListsSidebar.tsx | 230 | 1 | ✅ |
| favorites/FavoritesClientPicker.tsx | 154 | 3 | 🟦 |
| favorites/FavoritesEmptyStateSmart.tsx | 105 | 1 | ✅ |
| favorites/FavoritesHeatmap.tsx | 74 | 1 | ✅ |
| favorites/FavoritesSortBar.tsx | 108 | 3 | 🟨 (B-1: ordenar por categoria é no-op) |
| favorites/FavoritesTrashView.tsx | 137 | 2 | ✅ |
| favorites/FavoritesViewHeader.tsx | 130 | 1 | ✅ |
| favorites/ItemNoteEditor.tsx | 82 | 1 | ✅ |
| favorites/PriceDropBadge.tsx | 72 | 2 | ✅ |
| favorites/QuickListPicker.tsx | 174 | 1 | ✅ |
| favorites/ShareListDialog.tsx | 152 | 1 | ✅ |

#### `filters/` (23)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| filters/ColorGroupFilter.tsx | 470 | 3 | ✅ |
| filters/CommemorativeDateFilter.tsx | 143 | 1 | ✅ |
| filters/DebouncedPriceInput.tsx | 59 | 2 | ✅ |
| filters/ExternalCategoryFilter.tsx | 325 | 3 | ✅ |
| filters/FilterPanel.tsx | 359 | 13 | ✅ |
| filters/FilterPresets.ts | 235 | 2 | ✅ |
| filters/FilterSection.tsx | 45 | 4 | 🟦 |
| filters/InlineColorGroupFilter.tsx | 443 | 2 | ✅ |
| filters/PresetFormParts.tsx | 89 | 1 | ✅ |
| filters/PresetsBar.tsx | 542 | 1 | ✅ |
| filters/SavedFilters.tsx | 444 | 1 (barrel) | ⬛ |
| filters/StickyFilterBar.tsx | 244 | 1 | 🟦 |
| filters/filter-panel/FilterPanelHeader.tsx | 120 | 1 | ✅ |
| filters/filter-panel/FilterSection.tsx | 164 | 4 | ✅ |
| filters/filter-panel/sections/MaterialsFilter.tsx | 256 | 1 | ✅ |
| filters/filter-panel/sections/RamosFilter.tsx | 223 | 1 | ✅ |
| filters/filter-panel/sections/SimpleFilters.tsx | 466 | 1 | ✅ |
| filters/filter-panel/sections/SizeFilter.tsx | 158 | 1 | ✅ |
| filters/filter-panel/sections/SuppliersFilter.tsx | 93 | 1 | ✅ |
| filters/filter-panel/types.ts | 194 | (tipo) | ✅ |
| filters/filter-panel/useFilterPanelState.ts | 337 | 1 | ✅ |
| filters/index.ts | 13 | (barrel) | 🟨 exporta só símbolos mortos |
| filters/preset-utils.ts | 146 | 2 | ✅ |

#### `personalization/` (4)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| personalization/TechniqueSLACard.tsx | 305 | 1 (barrel) | ⬛ |
| personalization/TechniqueSelector.tsx | 405 | 4 | 🟨 (barrel apenas; o usado é o de `pricing/simulator/`) |
| personalization/ThemeCustomization.tsx | 61 | 0 | ⬛ |
| personalization/index.ts | 2 | (barrel) | ⬛ |

#### `pricing/` (20)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| pricing/ProductPriceSimulator.tsx | 426 | 2 | 🟨 (B-5) |
| pricing/QuantityPriceCalculator.tsx | 260 | 3 | 🟨 (B-5, B-6) |
| pricing/calculator/QuantityComparisonTable.tsx | 188 | 2 | 🟦 |
| pricing/calculator/TechniqueConfigCard.tsx | 91 | 1 | 🟦 |
| pricing/calculator/TechniqueMultiSelector.tsx | 160 | 1 | 🟦 |
| pricing/calculator/types.ts | 50 | (tipo) | ✅ |
| pricing/index.ts | 2 | (barrel) | ✅ |
| pricing/simulator/CustomizationOptions.tsx | 169 | 2 | 🟦 |
| pricing/simulator/EngravingList.tsx | 114 | 2 | 🟦 |
| pricing/simulator/MultiEngravingResult.tsx | 370 | 2 | ✅ |
| pricing/simulator/ProductSearch.tsx | 155 | 3 | 🟨 (C: `category_name` fixo) |
| pricing/simulator/ProductVariantSelector.tsx | 213 | 2 | 🟦 |
| pricing/simulator/StepIndicator.tsx | 39 | 1 (barrel) | 🟦 |
| pricing/simulator/TechniqueSelector.tsx | 335 | 4 | ✅ |
| pricing/simulator/index.ts | 18 | (barrel) | ✅ |
| pricing/simulator/types.ts | 118 | (tipo) | ✅ |
| pricing/simulator/upsell/UpsellPlusPlus.tsx | 171 | 2 | 🟦 |
| pricing/simulator/upsell/index.ts | 3 | (barrel) | 🟦 |
| pricing/simulator/upsell/upsell-engine.ts | 192 | 2 | 🟦 |
| pricing/simulator/utils.ts | 12 | muitos | ✅ |

#### `products/` (100)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| products/BaseProductGridCard.tsx | 311 | 1 | ✅ |
| products/BulkActionBar.tsx | 231 | 6 | ✅ |
| products/ColorTooltipContent.tsx | 23 | 3 | ✅ |
| products/ColumnSelector.tsx | 172 | 21 | ✅ |
| products/FutureStockModal.tsx | 621 | 2 | ✅ |
| products/GenderBadge.tsx | 41 | 3 | ✅ |
| products/HoverSetImage.tsx | 85 | 2 | ✅ |
| products/InlinePriceCalculator.tsx | 246 | 1 | ✅ |
| products/KitComposition.tsx | 259 | 2 | ✅ |
| products/KitVisualComposition.tsx | 56 | 0 | ⬛ |
| products/LayoutPopover.tsx | 108 | 9 | ✅ |
| products/NoveltyBadge.tsx | 61 | 3 | ✅ |
| products/PackagingBadge.tsx | 119 | 1 | ✅ |
| products/PackagingModal.tsx | 224 | 1 | ✅ |
| products/PriceFreshnessBadge.tsx | 521 | 10 | 🟨 (threshold nulo no catálogo) |
| products/PriceFreshnessThresholdEditor.tsx | 132 | 0 | ⬛ |
| products/PriceHistoryChart.tsx | 83 | 0 | ⬛ |
| products/ProductCard.tsx | 1128 | 23 | 🟨 (B-4) |
| products/ProductCardActions.tsx | 274 | 2 | ✅ |
| products/ProductCardImage.tsx | 349 | 4 | ✅ |
| products/ProductCategoryBadges.tsx | 252 | 4 | ✅ |
| products/ProductColorSelector.tsx | 291 | 1 | ✅ |
| products/ProductColorSwatches.tsx | 348 | 14 | ✅ |
| products/ProductCustomizationOptions.tsx | 619 | 3 | ✅ |
| products/ProductDimensions.tsx | 175 | 1 | ✅ |
| products/ProductEngravingSection.tsx | 191 | 6 | ✅ |
| products/ProductGallery.tsx | 416 | 1 | ✅ |
| products/ProductGrid.tsx | 373 | 4 | 🟦 |
| products/ProductHoverPreview.tsx | 145 | 0 | ⬛ |
| products/ProductInfoBar.tsx | 105 | 1 | ✅ |
| products/ProductIntelligence.tsx | 176 | 0 | ⬛ |
| products/ProductList.tsx | 304 | 1 | ✅ |
| products/ProductListItem.tsx | 938 | 14 | ✅ |
| products/ProductPersonalizationRules.tsx | 509 | 2 | ✅ |
| products/ProductQuickActions.tsx | 388 | 1 | ✅ |
| products/ProductQuickActionsFAB.tsx | 326 | 2 | ✅ |
| products/ProductQuickView.tsx | 745 | 7 | ✅ |
| products/ProductSales90dButton.tsx | 251 | 1 | ✅ |
| products/ProductSectionNav.tsx | 118 | 0 | ⬛ |
| products/ProductSparkline.tsx | 377 | 1 | 🟦 |
| products/ProductStatusBadge.tsx | 367 | 5 | ✅ |
| products/ProductStickyHeader.tsx | 173 | 2 | ✅ |
| products/ProductTableView.tsx | 626 | 7 | ✅ |
| products/ProductVariations.tsx | 61 | 0 | ⬛ |
| products/QuickAddToQuote.tsx | 395 | 10 | ✅ |
| products/QuickViewThumb.tsx | 133 | 4 | ✅ |
| products/RecentlyViewedBar.tsx | 147 | 0 | ⬛ |
| products/RecentlyViewedPopover.tsx | 140 | 2 | 🟨 (B-1/B-3 via ProductsContext) |
| products/RelatedProducts.tsx | 169 | 1 (barrel) | ⬛ |
| products/ReplenishmentBadge.tsx | 97 | 1 | ✅ |
| products/SalesHistoryChart.tsx | 435 | 3 | 🟦 |
| products/ShareActions.tsx | 208 | 2 | ✅ |
| products/SimilarProducts.tsx | 247 | 1 | ✅ |
| products/SingleVariantPicker.tsx | 168 | 2 | 🟦 |
| products/SmartRecommendations.tsx | 321 | 2 | 🟦 |
| products/SmartRecommendationsMock.tsx | 259 | 0 | ⬛ |
| products/StatsPopover.tsx | 94 | 1 | ✅ |
| products/StockHistoryChart.tsx | 502 | 5 | 🟨 (B-7) |
| products/SupplierChartFilter.tsx | 45 | 2 | ✅ |
| products/SupplierComparisonCards.tsx | 122 | 1 | 🟦 |
| products/VariantGridMatrix.tsx | 474 | 4 | 🟦 |
| products/VariantPickerDialog.tsx | 124 | 12 | ✅ |
| products/VirtualizedProductGrid.tsx | 492 | 4 | 🟨 (B-4) |
| products/ZoomableGallery.tsx | 236 | 0 | ⬛ |
| products/customization/ConfigurationPanel.tsx | 349 | 3 | 🟦 |
| products/customization/ConfigurationPanelV6.tsx | 522 | 3 | ✅ |
| products/customization/LocationCard.tsx | 241 | 1 | ✅ |
| products/customization/LocationPanel.tsx | 622 | 3 | ✅ |
| products/customization/TechniqueCard.tsx | 99 | 4 | ✅ |
| products/customization/TechniqueOption.tsx | 47 | 10 | ✅ |
| products/customization/VariationSelector.tsx | 115 | 1 | ✅ |
| products/customization/index.ts | 9 | (barrel) | ✅ |
| products/gallery/GalleryColorVariations.tsx | 236 | 1 | ✅ |
| products/gallery/GalleryFullscreen.tsx | 222 | 1 | ✅ |
| products/gallery/GalleryVideoPlayer.tsx | 214 | 1 | ✅ |
| products/gallery/PromoFlixPlayer.tsx | 1512 | 2 | ✅ |
| products/gallery/VideoShareWhatsAppDialog.tsx | 318 | 1 | ✅ |
| products/index.ts | 5 | (barrel) | 🟨 (`RelatedProducts` morto) |
| products/inline-price/PriceTiersTable.tsx | 142 | 1 | ✅ |
| products/inline-price/QuantityCalculator.tsx | 151 | 1 | ✅ |
| products/kit-composition/KitComponentCard.tsx | 456 | 1 | ✅ |
| products/list-item/ListItemActions.tsx | 169 | 1 | ✅ |
| products/product-card-styles.ts | 39 | 3 | ✅ |
| products/quick-view/QuickViewGallery.tsx | 150 | 0 | ⬛ |
| products/share/MessageTemplates.ts | 88 | 2 | ✅ |
| products/share/PhotoSelector.tsx | 68 | 1 | ✅ |
| products/share/ShareAllColorsDialog.tsx | 298 | 1 | ✅ |
| products/share/ShareContactSelector.tsx | 325 | 4 | ✅ |
| products/share/ShareKitDialog.tsx | 288 | 1 | ✅ |
| products/share/SharePreviewDialog.tsx | 307 | 7 | ✅ |
| products/share/WhatsAppPreview.tsx | 170 | 3 | ✅ |
| products/share/usePhotoDownload.ts | 73 | 1 | ✅ |
| products/share/whatsapp.ts | 47 | 9 | ✅ |
| products/swatchSizing.ts | 62 | 6 | ✅ |
| products/table-view/ProductTableRow.tsx | 378 | 2 | ✅ |
| products/table-view/TableRowActions.tsx | 260 | 1 | ✅ |
| products/useStockChartData.ts | 244 | 1 | 🟨 (B-7) |
| products/variant-grid/BulkToolbar.tsx | 133 | 1 | ✅ |
| products/variant-grid/VariantGridHelpers.ts | 81 | 1 | ✅ |
| products/zoomable-gallery/GalleryThumbnails.tsx | 83 | 1 | ⬛ (só serve `ZoomableGallery`, morto) |
| products/zoomable-gallery/GalleryToolbar.tsx | 105 | 1 | ⬛ (idem) |
| products/zoomable-gallery/useGalleryZoom.ts | 158 | 1 | ⬛ (idem) |

#### `quotes/` (48)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| quotes/ClientPicker.tsx | 58 | 0 | ⬛ |
| quotes/CompanyContactSelector.tsx | 230 | 4 | ✅ |
| quotes/EngravingBadge.tsx | 77 | 3 | ✅ |
| quotes/ItemsListEditor.tsx | 91 | 0 | ⬛ |
| quotes/MarginInsightBadge.tsx | 141 | 0 | ⬛ |
| quotes/NegotiationMarkupCard.tsx | 267 | 2 | 🟦 |
| quotes/PdfGenerationDialog.tsx | 629 | 1 | ✅ |
| quotes/PdfPrintHelpDialog.tsx | 254 | 1 | ✅ |
| quotes/ProductThumb.tsx | 119 | 4 | ✅ |
| quotes/QuickQuoteFAB.tsx | 228 | 2 | 🟦 |
| quotes/QuoteApprovalCard.tsx | 75 | 0 | ⬛ |
| quotes/QuoteAutoSave.tsx | 391 | 2 | ✅ |
| quotes/QuoteBuilderNavigation.tsx | 32 | 0 | ⬛ |
| quotes/QuoteBuilderProductSearch.tsx | 248 | 2 | ✅ |
| quotes/QuoteBuilderSkeleton.tsx | 65 | 1 | ✅ |
| quotes/QuoteBuilderStepper.tsx | 139 | 3 | ✅ |
| quotes/QuoteBuilderSummaryColumn.tsx | 1710 | 6 | ✅ |
| quotes/QuoteCard.tsx | 76 | 1 | ✅ |
| quotes/QuoteClientInfo.tsx | 94 | 3 | ✅ |
| quotes/QuoteConcurrencyAlert.tsx | 70 | 1 | ✅ |
| quotes/QuoteFilters.tsx | 60 | 0 | ⬛ |
| quotes/QuoteHistoryPanel.tsx | 143 | 2 | ✅ |
| quotes/QuoteItemDetailSheet.tsx | 387 | 2 | 🟦 |
| quotes/QuoteItemEditorSheet.tsx | 178 | 3 | ✅ |
| quotes/QuoteItemsList.tsx | 348 | 2 | 🟦 |
| quotes/QuoteItemsTable.tsx | 578 | 5 | ✅ |
| quotes/QuoteKanbanBoard.tsx | 431 | 1 | ✅ |
| quotes/QuoteListCellRenderer.tsx | 186 | 1 | ✅ |
| quotes/QuoteMobileActionBar.tsx | 69 | 1 | ✅ |
| quotes/QuoteProductColorSelector.tsx | 277 | 1 | ✅ |
| quotes/QuoteProductCustomization.tsx | 133 | 1 | ✅ |
| quotes/QuoteSignaturePad.tsx | 146 | 0 | ⬛ |
| quotes/QuoteStatusTimeline.tsx | 186 | 2 | ✅ |
| quotes/QuoteTotalsSummary.tsx | 85 | 2 | ✅ |
| quotes/QuoteValidityBanner.tsx | 48 | 0 | ⬛ |
| quotes/QuoteVersionCompare.tsx | 353 | 1 | ✅ |
| quotes/QuoteVersionHistory.tsx | 198 | 1 | ✅ |
| quotes/QuotesConfigurableList.tsx | 617 | 4 | ✅ |
| quotes/QuotesStatusChips.tsx | 438 | 3 | ✅ |
| quotes/SectionEyebrow.tsx | 41 | 3 | ✅ |
| quotes/company-contact/CompanySearchDropdown.tsx | 449 | 1 | ✅ |
| quotes/company-contact/ContactSelector.tsx | 148 | 1 | ✅ |
| quotes/company-contact/shared-types.tsx | 60 | 3 | ✅ |
| quotes/quote-view-typography.ts | 89 | 7 | ✅ |
| quotes/quoteAutoSaveStatus.ts | 28 | 1 | ✅ |

#### `search/` (23)

| Arquivo | Ln | Refs | Cls |
|---|---|---|---|
| search/AdvancedSearch.tsx | 378 | 1 (barrel) | ⬛ |
| search/EmptySearchState.tsx | 173 | 2 | ✅ |
| search/GlobalSearch.tsx | 480 | 0 | ⬛ |
| search/GlobalSearchHelpers.tsx | 178 | 2 | ✅ |
| search/GlobalSearchIdleState.tsx | 264 | 2 | ✅ |
| search/GlobalSearchPalette.tsx | 516 | 5 | ✅ |
| search/HighlightMatch.tsx | 88 | 5 | ✅ |
| search/SearchResultGroups.tsx | 240 | 1 | ✅ |
| search/SearchWithSuggestions.tsx | 210 | 1 (barrel) | ⬛ |
| search/SmartSearchInput.tsx | 424 | 5 | ✅ |
| search/VisualSearchButton.tsx | 284 | 2 | ⬛ (só via `AdvancedSearch`, morto) |
| search/VoiceSearchOverlay.tsx | 370 | 3 | ✅ |
| search/VoiceSearchOverlayConnected.tsx | 68 | 2 | ✅ |
| search/index.ts | 7 | (barrel) | 🟨 (3 de 6 exports mortos) |
| search/search-types.ts | 46 | 1 | ✅ |
| search/searchCache.ts | 61 | 1 | ✅ |
| search/useGlobalSearch.ts | 902 | 2 | 🟨 (B-1) |
| search/voice/FloatingParticles.tsx | 186 | 1 | ✅ |
| search/voice/VoiceOrb.tsx | 221 | 1 | ✅ |
| search/voice/VoiceOverlaySections.tsx | 201 | 0 | ⬛ |
| search/voice/VoiceSuggestionsPanel.tsx | 173 | 1 | ✅ |
| search/voice/VoiceTranscriptPanel.tsx | 153 | 1 | ✅ |
| search/voice/VoiceVisualEffects.tsx | 280 | 2 | ✅ |
| search/voice/usePhaseColors.ts | 139 | 3 | ✅ |

---

## Resumo executivo

**Está de pé e completo (UI→lógica→persistência→uso real):** carrinho do vendedor, orçamento (builder, versões, histórico, status, aprovação de desconto, PDF), listas de favoritos remotas, catálogo paginado com ordenação e filtros server-side (cor, categoria, material, tamanho, metadados), cadastro e precificação de gravação, PDP com galeria/vídeo/kit/estoque futuro.

**Os 8 fios quebrados** concentram-se em dois pontos estruturais e alguns descuidos de wiring:
1. O SELECT do caminho de lista enriquecida (`PRODUCT_SELECT_FIELDS_WITH_SALE`) omite `category_name`, `tags` e nunca traz `base_price` — o que deixa **categoria, tags e preço** quebrados em Comparar, Favoritos, Coleções, Vistos Recentemente e no filtro de categoria da busca global.
2. O coração de favoritar na grade está ligado ao store de localStorage em vez do hook que grava em `favorite_items`.
3. CTAs do simulador de preços apontam para rota e payload que o builder de orçamento não lê.

**5.400 linhas (35 arquivos) não têm nenhum chamador** — incluindo duas duplicatas grandes e completas (`search/GlobalSearch.tsx` 480 ln vs. `GlobalSearchPalette`; `filters/SavedFilters.tsx` 444 ln vs. `PresetsBar`) e um componente com dados fake de produto e preço (`SmartRecommendationsMock.tsx`).

**Dados fictícios em produção:** apenas o fallback de demo do gráfico de estoque (`useStockChartData.ts`) chega ao usuário. Nenhum `Math.random()` em preço, estoque ou métrica de negócio.
