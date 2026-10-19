# Inventário de rotas e contratos — 2026-08-26

## Escopo e método

Inventário estático da árvore montada por `src/App.tsx` → `src/routes/AppRoutes.tsx`, confirmado nos seis grupos de rotas e em `src/routes/lazy-pages.ts`, na revisão `0660b3ef9` da worktree. O Graphify foi usado somente como pista de navegação; rota, guarda, componente e contrato abaixo foram conferidos no código desta worktree.

- Total: **132 declarações de rota**.
- Classes: **27 públicas** (19 sempre montadas + 8 somente em `import.meta.env.DEV`), **58 autenticadas**, **47 administrativas** (19 `AdminRoute` + 28 `DevRoute`) e **0 desconhecidas**.
- `autenticada` significa que a rota está sob o `ProtectedRoute` externo sem requisito adicional de papel.
- `admin (AdminRoute)` exige `canManage` (gestor/admin) e AAL2/MFA quando configurado. `admin (DevRoute)` é a classe administrativa/técnica deste inventário, mas o código permite **somente o papel `dev`**, também com AAL2/MFA; não equivale a `canManage`.
- `pública (DEV)` não existe no bundle de produção, mas não tem guarda de autenticação quando montada.
- O 404 `*` é deliberadamente público e fica depois da árvore protegida.
- Em “contratos”, `T:` = tabela/view, `R:` = RPC, `E:` = Edge Function e `S:` = bucket Storage. São literais ou chamadas detectáveis estaticamente; isto **não valida existência/permissões no banco vivo**. Auditoria real de schema continua exigindo `pg_catalog`, conforme `AGENTS.md`.
- “Delegado” indica que a página entrega o acesso a dados a componentes/barrels e não expõe, na fronteira examinada, um objeto concreto que pudesse ser atribuído sem inferência.
- Testes são evidência encontrada por nome de rota/componente/fluxo, não uma afirmação de cobertura integral. `G-P`, `G-A` e `G-D` significam, respectivamente, os testes compartilhados de `ProtectedRoute`, `AdminRoute` e `DevRoute`: `src/components/layout/ProtectedRoute.test.tsx` + `tests/components/ProtectedRoute.test.tsx` + `e2e/auth-guard-redirect.spec.ts`; `tests/components/AdminRoute.test.tsx`; `tests/components/DevRoute.test.tsx`.
- Owner só foi preenchido quando documentado. `docs/MAGAZINE_MODULE.md` declara **Promo Brindes Engineering** para o módulo Magazine. `.github/CODEOWNERS` não atribui owner às demais rotas/páginas; portanto elas permanecem `TBD`.

## Topologia

```text
BrowserRouter
└─ AuthProvider
   └─ AppRoutes
      ├─ publicRoutes
      ├─ /debug/images
      ├─ /__visual/* (somente DEV)
      ├─ ProtectedRoute
      │  └─ AppProviders + MainLayout
      │     ├─ productRoutes
      │     ├─ quoteRoutes
      │     ├─ adminRoutes
      │     │  ├─ /tendencias (apenas autenticada)
      │     │  ├─ AdminRoute (canManage + AAL2)
      │     │  └─ DevRoute (papel dev + AAL2)
      │     ├─ toolsRoutes
      │     └─ homeAndClientRoutes
      └─ * (público)
```

## Rotas públicas e harnesses

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/auth` | pública | `Auth` | `useAuth`, `useDevGate`, `useIPValidation` | T: `profiles`, `user_roles`; E: `get-visitor-info`, `validate-access`, `log-login-attempt` | `e2e/auth.spec.ts`; `src/pages/auth/__tests__/Auth.test.tsx` | TBD |
| `/login` | pública; alias | `Auth` | Mesmos de `/auth` | Mesmos de `/auth` | `e2e/routes/public/login.spec.ts`; `e2e/flows/login-success.spec.ts` | TBD |
| `/reset-password` | pública | `ResetPassword` | `authService` | T: `profiles`, `user_roles`; R: `log_user_logout` (serviço de auth) | `e2e/routes/public/reset-password.spec.ts`; `src/pages/auth/__tests__/ResetPassword.test.tsx` | TBD |
| `/forgot-password-confirmation` | pública | `ForgotPasswordConfirmation` | UI/navigation | Nenhum literal de BD/RPC | `e2e/flows/forgot-password-flow.spec.ts` | TBD |
| `/auth/callback` | pública | `SSOCallbackPage` | `useAuth` / contexto de auth | T: `profiles`, `user_roles`; E: `log-login-attempt` por auth | `src/pages/__tests__/SSOCallbackPage.test.tsx`; `e2e/flows/22-google-oauth-smoke.spec.ts` | TBD |
| `/unauthorized` | pública | `Unauthorized` | UI/navigation | Nenhum literal de BD/RPC | `e2e/deep-linking.spec.ts` | TBD |
| `/termos` | pública | `TermsPage` | Conteúdo estático | Nenhum | `e2e/auth-legal-pages.spec.ts` | TBD |
| `/privacidade` | pública | `PrivacyPage` | Conteúdo estático | Nenhum | `e2e/auth-legal-pages.spec.ts` | TBD |
| `/revista-publica/:token` | pública | `PublicMagazineView` | `magazineService`, `useMagazineBookmarks`, `usePageZoom`, `usePresentationMode` | T: `magazines`, `magazine_items` | `e2e/magazine/magazine-viewer.spec.ts`; `e2e/flows/magazine-smoke.spec.ts` | Promo Brindes Engineering |
| `/__test/color-swatches` | pública; harness | `ColorSwatchesHarness` | UI local | Nenhum literal de BD/RPC | — | TBD |
| `/__test/confirm-dialog` | pública; harness | `ConfirmDialogHarness` | UI local | Nenhum | `e2e/ui/confirm-dialog-visual.spec.ts` | TBD |
| `/__test/alert-dialog` | pública; harness | `AlertDialogHarness` | UI local | Nenhum | `e2e/ui/alert-dialog-visual.spec.ts` | TBD |
| `/__test/dialog` | pública; harness | `DialogHarness` | UI local | Nenhum | `e2e/ui/dialog-visual.spec.ts` | TBD |
| `/__test/undo-toast` | pública; harness | `UndoToastHarness` | UI local | Nenhum | `e2e/ui/undo-toast-visual.spec.ts` | TBD |
| `/__test/cnpj-form` | pública; harness | `CnpjFormHarness` | Formulário local | Nenhum literal de BD/RPC | `e2e/ui/cnpj-create-product.spec.ts` | TBD |
| `/__test/magazine-ring` | pública; harness | `MagazineRingHarness` | UI local | Nenhum | `e2e/ui/magazine-ring-visual.spec.ts` | TBD |
| `/__test/tab-skip` | pública; harness | `TabSkipHarness` | UI local | Nenhum | `e2e/ui/tab-skip-dom-mutation.spec.ts` | TBD |
| `/debug/images` | pública; debug sempre montado | `OptimizedImageDemo` | `OptimizedImage`, utilitários de imagem | Nenhum literal de BD/RPC | `e2e/optimized-image-detection.spec.ts`; `e2e/optimized-image-visual.spec.ts` | TBD |
| `/__visual/preview-button` | pública (DEV); harness | `PreviewButtonHarness` | UI local | Nenhum | `e2e/visual/preview-button.spec.ts` | TBD |
| `/__visual/quote-view-order` | pública (DEV); harness | `QuoteViewOrderHarness` | Componentes de orçamento | Dados de fixture; nenhum literal de BD/RPC | `e2e/quotes/quote-item-detail-sheet-a11y.spec.ts` | TBD |
| `/__visual/quote-items-list-mobile` | pública (DEV); harness | `QuoteItemsListMobileHarness` | Componentes de orçamento | Dados de fixture | `e2e/quotes/quote-items-list-mobile-layout.spec.ts` | TBD |
| `/__visual/quote-item-editor-sheet` | pública (DEV); harness | `QuoteItemEditorSheetHarness` | Componentes de orçamento | Dados de fixture | `e2e/quotes/quote-item-editor-sheet-header.spec.ts` | TBD |
| `/__visual/quote-add-product-button` | pública (DEV); harness | `QuoteAddProductButtonHarness` | Componentes de orçamento | Dados de fixture | `e2e/quotes/quote-add-product-button.spec.ts` | TBD |
| `/__visual/calendar` | pública (DEV); harness | `CalendarHarness` | UI local | Nenhum | `e2e/ui/calendar-tap-targets.spec.ts`; `e2e/ui/calendar-visual.spec.ts` | TBD |
| `/__visual/date-picker-field` | pública (DEV); harness | `DatePickerFieldHarness` | UI local | Nenhum | `e2e/ui/date-picker-field-visual.spec.ts` | TBD |
| `/__visual/negotiation-markup-card` | pública (DEV); harness | `NegotiationMarkupCardHarness` | UI local | Dados de fixture | `e2e/quotes/negotiation-markup-card-trio.spec.ts` | TBD |
| `*` | pública; catch-all final | `NotFound` | UI/navigation | Nenhum | `tests/pages/NotFound.test.tsx` | TBD |

## Catálogo, produtos e coleções

Todas as rotas desta seção herdam `ProtectedRoute` (`G-P`).

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/produtos` | autenticada | `FiltersPage` | `useFiltersPageState`, `useFiltersSelectionMode`; hooks de catálogo | Catálogo via bridge/hooks; T detectáveis no ramo: `product_variants`, `category_icons`, `product_price_freshness_overrides`; R: `fn_super_filtro_product_ids`, `get_catalog_bestseller_page` | `e2e/routes/app/produtos.spec.ts`; G-P | TBD |
| `/produto` | autenticada; redirect | `Navigate` → `/produtos` | Router | Nenhum | G-P; sem teste dedicado do alias | TBD |
| `/produto/:id` | autenticada + `ValidProductIdRoute` | `ProductDetail` | `useProduct`, `useProductAnalytics`, `useSimilarProducts`, `useSupplierTrust` | T: `products`, `product_views`, `search_analytics`, `catalog_analytics`; R: `fn_get_similar_products` | `e2e/routes/app/produto-detail.spec.ts`; `src/routes/guards/ValidProductIdRoute.test.tsx`; G-P | TBD |
| `/filtros` | autenticada | `FiltersPage` | Mesmos de `/produtos` | Mesmos contratos de catálogo de `/produtos` | `src/pages/filters/__tests__/FiltersPage.logic.test.tsx`; `e2e/routes/app/super-filtro-estoque-section.spec.ts`; G-P | TBD |
| `/novidades` | autenticada | `NoveltiesPage` | Delegado a grid/hooks de novidades | Catálogo/estoque via componentes; nenhum objeto adicional seguro na página | `e2e/routes/app/novidades.spec.ts`; G-P | TBD |
| `/reposicao` | autenticada | `ReplenishmentsPage` | Hooks/componentes de reposição | R: `fn_get_reposicao_listing`, `fn_get_replenishment_stats`, `fn_get_reposicao_variants_summary` | `e2e/routes/app/replenishments.spec.ts`; G-P | TBD |
| `/favoritos` | autenticada | `FavoritesPage` | `useFavoriteLists`, `useFavoriteTrash` | T: `favorite_lists`, `favorite_items`, `favorite_items_trash`; R: `ensure_default_favorite_list` | `e2e/routes/app/favoritos.spec.ts`; `e2e/flows/14-favorites-remove-persistence.spec.ts`; G-P | TBD |
| `/carrinhos` | autenticada | `CartsListPage` | `useSellerCarts`, `SellerCartContext` | T: `seller_carts`, `seller_cart_items`, `cart_templates`, `products`, `frontend_telemetry`; R: `restore_seller_cart` | `e2e/routes/app/carrinhos.spec.ts`; G-P | TBD |
| `/carrinhos/:cartId` | autenticada | `SellerCartsPage` | `useSellerCarts`, `SellerCartContext` | Mesmos de `/carrinhos` | `e2e/carts-module.spec.ts`; G-P | TBD |
| `/comparar` | autenticada | `ComparePage` | `useComparisonSync`, comparison store | T: `user_comparisons`, `user_preferences` | `e2e/routes/app/comparar.spec.ts`; G-P | TBD |
| `/colecoes` | autenticada | `CollectionsPage` | `useCollections` | T: `collections`, `collection_items`, `collection_items_trash` | `e2e/routes/app/colecoes.spec.ts`; G-P | TBD |
| `/colecoes/:id` | autenticada | `CollectionDetailPage` | `useCollections` | T: `collections`, `collection_items`, `collection_items_trash` | `e2e/routes/app/colecao-detail.spec.ts`; G-P | TBD |

## Orçamentos

Todas as rotas desta seção herdam `ProtectedRoute` (`G-P`). O núcleo `quoteService` acessa `quotes`, `quote_items`, `quote_item_personalizations`, `products`, `product_variants` e `quote_history`; o fluxo também usa `quote-sync`.

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/orcamentos` | autenticada | `QuotesListPage` | `useQuotes`, `useQuoteItemCounts`, `quoteService` | T: `quotes`, `quote_items`; E: `quote-sync` | `e2e/routes/quotes/lista.spec.ts`; `src/pages/quotes/__tests__/QuotesListPage.render.test.tsx`; G-P | TBD |
| `/orcamentos/dashboard` | autenticada | `QuotesDashboardPage` | `useQuotes`, agregações do dashboard | T: `quotes`, `quote_items` | `e2e/routes/quotes/dashboard.spec.ts`; G-P | TBD |
| `/orcamentos/lista` | autenticada | `QuotesListPage` | Mesmos de `/orcamentos` | Mesmos de `/orcamentos` | `e2e/routes/quotes/lista.spec.ts`; G-P | TBD |
| `/orcamentos/kanban` | autenticada | `QuotesKanbanPage` | `useQuotes`, `quoteService` | T: `quotes`, `quote_items`; E: `quote-sync` | `e2e/routes/quotes/kanban.spec.ts`; G-P | TBD |
| `/orcamentos/templates` | autenticada; redirect | `Navigate` → `/orcamentos` | Router | Nenhum | G-P; sem teste dedicado do alias | TBD |
| `/orcamentos/novo` | autenticada | `QuoteBuilderPage` | `useQuoteBuilderState`, `quoteService` | T: núcleo de orçamento; R: `create_quote_transactional`, `update_quote_transactional` | `e2e/routes/quotes/novo.spec.ts`; G-P | TBD |
| `/orcamentos/:id/editar` | autenticada + `ValidQuoteIdRoute` | `QuoteBuilderPage` | `useQuoteBuilderState`, `quoteService` | T: núcleo de orçamento; R: `create_quote_transactional`, `update_quote_transactional` | `e2e/routes/quotes/editar.spec.ts`; G-P | TBD |
| `/orcamentos/:id` | autenticada + `ValidQuoteIdRoute` | `QuoteViewPage` | `useQuoteHistory`, `useDiscountApproval`, `quoteService` | T: `quotes`, `quote_items`, `quote_history`, `discount_approval_requests`, `seller_discount_limits`, `admin_audit_log`, `workspace_notifications`, `profiles`, `user_roles`; E: `quote-sync` | `e2e/routes/quotes/detail.spec.ts`; `e2e/routes/quotes/view.spec.ts`; G-P | TBD |

## Ferramentas e Magazine

Todas as rotas desta seção herdam `ProtectedRoute` (`G-P`).

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/simulador` | autenticada | `SimuladorWizard` | `useSimulatorWizard`, `useWizardDrafts`; pricing hooks | T: `simulator_wizard_drafts`; regras de preço internas | `e2e/routes/app/simulador.spec.ts`; G-P | TBD |
| `/simulador-precos` | autenticada | `PriceSimulatorPage` | Estado/cálculos locais | Nenhum literal de BD/RPC na página | `e2e/routes/app/simulador-precos.spec.ts`; G-P | TBD |
| `/estoque` | autenticada | `StockDashboardPage` | `useVariantStock`, hooks EMA/ruptura/notes/views | T/view: `mv_stock_rupture_alert`, `stock_notes`, views salvas; R: `fn_ema_risk_summary`, `fn_ema_pipeline_health` | `e2e/routes/app/stock-dashboard.spec.ts`; G-P | TBD |
| `/busca-preco` | autenticada | `AdvancedPriceSearchPage` | `useAdvancedPriceSearch` | Bridge de catálogo externo; objeto concreto delegado | `e2e/routes/app/advanced-price-search.spec.ts`; G-P | TBD |
| `/montar-kit` | autenticada | `KitBuilderPage` | `useKitBuilderPageState`; hooks de kit | T: `custom_kits`, `kit_templates`, `kit_variants`, `kit_collaborators`, `kit_comments`; R: `increment_kit_template_usage`; E: `kit-identity-suggest` | `e2e/routes/app/kit-builder.spec.ts`; G-P | TBD |
| `/kit-builder` | autenticada; redirect | `Navigate` → `/montar-kit` | Router | Nenhum | G-P; sem teste dedicado do alias | TBD |
| `/meus-kits` | autenticada | `KitLibraryPage` (`MeusKitsPage`) | `useCustomKitPersistence`, `useKitTemplates` | T: `custom_kits`, `kit_templates`; R: `increment_kit_template_usage` | `e2e/routes/app/kit-library.spec.ts`; G-P | TBD |
| `/mockup` | autenticada; redirect | `Navigate` → `/mockup-generator` | Router | Nenhum | G-P; sem teste dedicado do alias | TBD |
| `/gerador-mockup` | autenticada; redirect | `Navigate` → `/mockup-generator` | Router | Nenhum | G-P; sem teste dedicado do alias | TBD |
| `/mockup-generator` | autenticada | `MockupGenerator` | `useMockupGenerator` | T: `generated_mockups`, `mockup_drafts`; S: `mockup-assets`; E: `generate-mockup` | `e2e/routes/app/mockup-generator.spec.ts`; G-P | TBD |
| `/mockups/historico` | autenticada | `MockupHistoryPage` | Query de histórico | T: `generated_mockups` | `e2e/routes/app/mockup-history.spec.ts`; G-P | TBD |
| `/magic-up` | autenticada | `MagicUp` | `useMagicUpState` | T: `magic_up_generations`, `magic_up_campaigns`, `magic_up_brand_kits`; geração por Edge delegada ao hook | `tests/components/pages/MagicUp.test.tsx`; G-P | TBD |
| `/inteligencia-comercial` | autenticada | `CommercialIntelligencePage` | `useCommercialKPIs` | T: `quotes`, `quote_items`, `orders`, `order_items` | `e2e/routes/app/comercial-intelligence.spec.ts`; G-P | TBD |
| `/ferramentas/bi` | autenticada | `BusinessIntelligencePage` | `useClientSeasonality`, hooks BI/CRM | T: `workspace_notifications`; R: `get_client_seasonality`, `get_industry_seasonality` | `e2e/routes/app/business-intelligence.spec.ts`; G-P | TBD |
| `/ferramentas/bi/comparar` | autenticada | `ClientComparatorPage` | `ClientSelector`, hooks comparativos BI | Ramo BI delegado; nenhum objeto adicional seguro na página | `e2e/routes/app/cliente-comparator.spec.ts`; G-P | TBD |
| `/match` | autenticada | `ProductMatchPage` | `useProducts`, `useCategories`, `useProductMatch` | Catálogo via hooks/bridge; objeto concreto delegado | `e2e/routes/app/product-match.spec.ts`; G-P | TBD |
| `/dropbox` | autenticada | `DropboxBrowserPage` | `useDropboxFiles` | E: `dropbox-list` | `e2e/routes/app/dropbox.spec.ts`; G-P | TBD |
| `/simulacao` | autenticada | `SimulationPage` | `invokeEdge` | E: `audit-suite`, `simulation-orchestrator` | `e2e/tools-module.spec.ts`; G-P | TBD |
| `/ferramentas/cobertura` | autenticada | `CoverageInsightsDashboardPage` | Seed local / importação JSON | Nenhum literal de BD/RPC | `e2e/tools-module.spec.ts`; G-P | TBD |
| `/raio-x` | autenticada | `VisualSearchPage` | `useColorSystem`, `useExternalCategoriesQuery` | T: `visual_search_feedback`; E: `visual-search` | `e2e/raio-x.spec.ts`; G-P | TBD |
| `/magazine` | autenticada | `MagazineListPage` | `magazineService` | T: `magazines`, `magazine_items` | `e2e/flows/magazine-publish-smoke.spec.ts`; G-P | Promo Brindes Engineering |
| `/magazine/templates` | autenticada | `MagazineTemplatesGalleryPage` | `useFavoriteTemplate` | Preferências locais; nenhum literal de BD/RPC na página | `e2e/magazine/magazine-templates-gallery.spec.ts`; G-P | Promo Brindes Engineering |
| `/magazine/:id` | autenticada | `MagazineEditorPage` | `useMagazineEditor`, `magazineService` | T: `magazines`, `magazine_items` | `src/pages/magazine/__tests__/MagazineEditorPage.hooksOrder.test.tsx`; G-P | Promo Brindes Engineering |
| `/magazine/:id/print` | autenticada | `MagazinePrintPage` | `magazineService`, geração PDF | T: `magazines`, `magazine_items` | `tests/magazine/pdf-export.test.tsx`; G-P | Promo Brindes Engineering |
| `/magazine/print` | autenticada | `MagazinePrintPage` | Mesmos de `/magazine/:id/print` | Mesmos de `/magazine/:id/print` | `tests/magazine/pdf-export.test.tsx`; G-P | Promo Brindes Engineering |
| `/promoflix-playground` | autenticada | `PromoFlixPlayground` | Player/stream de demonstração | Recurso externo de teste; nenhum literal de BD/RPC | `e2e/promoflix-player.spec.ts`; G-P | TBD |

## Home, cliente, aliases e 404

As onze primeiras rotas desta tabela herdam `ProtectedRoute` (`G-P`); o catch-all já foi inventariado na seção pública.

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/` | autenticada | `Index` | `useCatalogState`; hooks de catálogo | Catálogo via bridge/hooks; objeto concreto delegado | `tests/components/pages/Index.test.tsx`; G-P | TBD |
| `/dashboard` | autenticada | `CustomizableDashboard` | Auth/organização/escopo comercial | T: `quotes` e módulos delegados do dashboard | `e2e/routes/app/dashboard.spec.ts`; G-P | TBD |
| `/admin/temas` | autenticada; **sem** `AdminRoute` | `AdminTemasPage` | `useTheme` | Preferência/armazenamento local; nenhum literal de BD/RPC | `tests/lib/theme-presets.test.ts`; G-P | TBD |
| `/configuracoes` | autenticada; redirect | `Navigate` → `/admin/usuarios` | Router | Nenhum; destino exige guarda própria | G-P; sem teste dedicado do alias | TBD |
| `/admin/personalizacao` | autenticada; redirect | `Navigate` → `/admin/cadastros` | Router | Nenhum; destino exige guarda própria | G-P; sem teste dedicado do alias | TBD |
| `/cadastro-produtos` | autenticada; redirect | `Navigate` → `/admin/cadastros` | Router | Nenhum; destino exige guarda própria | G-P; sem teste dedicado do alias | TBD |
| `/cadastro-gravacao` | autenticada; redirect | `Navigate` → `/admin/cadastros` | Router | Nenhum; destino exige guarda própria | G-P; sem teste dedicado do alias | TBD |
| `/comissoes` | autenticada; deprecated | `DeprecatedRoute` → `/` | Router | Nenhum | G-P; sem teste dedicado | TBD |
| `/clientes` | autenticada | `ClientsPage` | `useCrmCompanies` | Bridge CRM externo; objeto concreto delegado | `e2e/flows/05-clients-crud.spec.ts`; G-P | TBD |
| `/clientes/:id` | autenticada | `ClientDetailPage` | `useCrmCompany`, `useClientTopProducts` | T: `orders`, `order_items`; R: `get_client_top_products` | `e2e/flows/05-clients-crud.spec.ts`; G-P | TBD |
| `/perfil` | autenticada; redirect | `Navigate` → `/admin/usuarios` | Router | Nenhum; destino exige guarda própria | G-P; sem teste dedicado do alias | TBD |

## Tendências e rotas `AdminRoute`

`/tendencias` fica no arquivo administrativo, mas está fora de `AdminRoute`: requer apenas sessão. As demais desta seção passam pelo `ProtectedRoute` externo e por `AdminRoute` (`G-A`), portanto exigem `canManage` e AAL2/MFA quando configurado.

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/tendencias` | autenticada; sem `AdminRoute` | `TrendsPage` | Hooks de tendências/BI, auth e URL | Dados de inteligência/catálogo delegados; nenhum literal seguro na página | `e2e/routes/app/tendencias.spec.ts`; G-P | TBD |
| `/admin` | admin (`AdminRoute`); redirect | `Navigate` → `/admin/usuarios` | Router | Nenhum | G-A | TBD |
| `/admin/usuarios` | admin (`AdminRoute`) | `AdminUsuariosPage` | `useUserManagement`, `usePasswordResetRequests` | T: `avatars`, `discount_approval_requests`, `profiles`, `user_roles`; E: `manage-users` | `e2e/routes/admin/usuarios.spec.ts`; G-A | TBD |
| `/admin/usuarios/promover` | admin (`AdminRoute`) | `AdminPromoverUsuarioPage` | `useUserManagement` | T: `avatars`, `profiles`, `user_roles`; E: `manage-users` | G-A; sem teste nominal encontrado | TBD |
| `/admin/limites-desconto` | admin (`AdminRoute`) | `SellerDiscountLimitsAdminPage` | `useSellerDiscountLimits` | T: `discount_approval_requests`, `profiles`, `seller_discount_limits` | `e2e/routes/admin/limites-desconto.spec.ts`; G-A | TBD |
| `/admin/rls-denials` | admin (`AdminRoute`) | `RlsDenialsAdminPage` | Query administrativa | T: `rls_denial_log` | `e2e/routes/admin/rls-denials.spec.ts`; G-A | TBD |
| `/admin/auditoria-propriedade` | admin (`AdminRoute`) | `OwnershipAuditAdminPage` | React Query, `invokeEdge` | T: `ownership_audit_reports`; E: `ownership-audit` | `e2e/dashboard-modules.spec.ts`; G-A | TBD |
| `/admin/cadastros` | admin (`AdminRoute`) | `AdminCadastrosPage` | Delega a managers de produtos, fornecedores, gravação e badges | Contratos dos managers; sem objeto único na página | `e2e/routes/admin/cadastros.spec.ts`; G-A | TBD |
| `/admin/cadastros/produto/:id` | admin (`AdminRoute`) | `AdminProductFormPage` | Serviços de produto, `useAuditLog` | Contratos de catálogo/produto delegados | `tests/product-form-improvements.test.ts`; G-A | TBD |
| `/admin/permissoes` | admin (`AdminRoute`) | `PermissionsPage` | Hook de permissões | T: `permissions` | `e2e/routes/admin/permissions.spec.ts`; G-A | TBD |
| `/admin/roles` | admin (`AdminRoute`) | `RolesPage` | Hook de papéis | T: `roles` | `e2e/routes/admin/roles.spec.ts`; G-A | TBD |
| `/admin/role-permissoes` | admin (`AdminRoute`) | `RolePermissionsPage` | Hooks de papéis/permissões | T: `permissions`, `role_permissions` | `e2e/routes/admin/role-permissions.spec.ts`; G-A | TBD |
| `/admin/video-variantes` | admin (`AdminRoute`) | `AdminVideoVariantsPage` | `useVideoVariantLinks` | T: `video_variant_links` | `e2e/routes/admin/video-variants.spec.ts`; G-A | TBD |
| `/admin/kit-templates` | admin (`AdminRoute`) | `KitTemplatesAdminPage` | `useAdminKitTemplates`, `useKitTemplates` | T: `kit_templates` | G-A; sem teste nominal encontrado | TBD |
| `/admin/kit-templates/metricas` | admin (`AdminRoute`) | `KitTemplatesMetricsPage` | Query de métricas de kits | T: `custom_kits`, `kit_templates` | G-A; sem teste nominal encontrado | TBD |
| `/admin/aprovacoes-desconto` | admin (`AdminRoute`); redirect | `Navigate` → `/admin/usuarios?tab=discounts` | Router | Nenhum | `e2e/discount-approval.spec.ts`; G-A | TBD |
| `/admin/aprovacoes-desconto/:id` | admin (`AdminRoute`) | `DiscountRequestDetailPage` | Hooks de aprovação/desconto | T: `discount_approval_requests`, `quotes` | `e2e/flows/04c3-discount-approval-detail-page.spec.ts`; G-A | TBD |
| `/admin/performance` | admin (`AdminRoute`); deprecated | `DeprecatedRoute` → `/ferramentas/bi` | Router | Nenhum | G-A; sem teste dedicado | TBD |
| `/admin/performance-comercial` | admin (`AdminRoute`); deprecated | `DeprecatedRoute` → `/ferramentas/bi` | Router | Nenhum | G-A; sem teste dedicado | TBD |
| `/admin/comissoes` | admin (`AdminRoute`); deprecated | `DeprecatedRoute` → `/admin/usuarios` | Router | Nenhum | G-A; sem teste dedicado | TBD |

## Rotas técnicas `DevRoute`

Estas 28 rotas passam pelo `ProtectedRoute` externo e por `DevRoute` (`G-D`): papel `dev` exclusivo e AAL2/MFA quando configurado.

| Rota | Classe / guarda | Componente | Hooks / serviços detectáveis | Contratos detectáveis | Testes encontrados | Owner |
|---|---|---|---|---|---|---|
| `/admin/seguranca` | admin técnica (`DevRoute`) | `AdminSegurancaPage` | Delega a `SecurityDashboard`, `AccessSecurityManager`, `SecureUploadManager` | Contratos de segurança/upload delegados; sem objeto único na página | `e2e/routes/admin/seguranca.spec.ts`; G-D | TBD |
| `/admin/seguranca-acesso` | admin técnica (`DevRoute`) | `AdminSegurancaAcessoPage` | Hooks/queries de acesso | T: `bot_detection_log`, `ip_access_control`, `request_rate_limits` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/seguranca/chaves` | admin técnica (`DevRoute`) | `AdminSegurancaChavesPage` | Delega a painéis MCP, auditoria, step-up e RLS | Contratos MCP/segurança delegados; sem objeto único na página | `e2e/routes/admin/seguranca-chaves.spec.ts`; G-D | TBD |
| `/admin/seguranca/exemplos-challenge` | admin técnica (`DevRoute`) | `DevChallengeExamplesPage` | `useDevChallenge` | E: `mcp-keys-issue`, `mcp-keys-update` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/seguranca/migracao-papeis` | admin técnica (`DevRoute`) | `AdminMigracaoPapeisPage` | `useRoleMigration` | T: `role_migration_batches`, `role_migration_items`; R: `execute_role_migration_batch` | `e2e/routes/admin/migracao-papeis.spec.ts`; G-D | TBD |
| `/admin/prompts-ia` | admin técnica (`DevRoute`) | `AdminPromptsIAPage` | Delega a `MockupPromptManager` | T: `mockup_prompt_configs`, `mockup_prompt_history` | `e2e/routes/admin/prompts-ia.spec.ts`; G-D | TBD |
| `/admin/validade-precos` | admin técnica (`DevRoute`) | `PriceFreshnessSettingsPage` | `useAllFreshnessOverrides`, `useSystemSettings` | T: `product_price_freshness_overrides`, `system_settings` | `e2e/routes/admin/price-freshness.spec.ts`; G-D | TBD |
| `/admin/badges-inteligencia` | admin técnica (`DevRoute`) | `IntelligenceBadgeSettingsPage` | `useIntelligenceBadgeSettings` | T: `admin_settings` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/telemetria` | admin técnica (`DevRoute`) | `AdminTelemetriaPage` | `useTelemetryData`, `useErrorCounters` | T: `query_telemetry` | `e2e/routes/admin/telemetry.spec.ts`; G-D | TBD |
| `/admin/ema-health` | admin técnica (`DevRoute`) | `EmaHealthPage` | `useEmaPipelineHealth` | R: `fn_ema_pipeline_health` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/v4-callbacks` | admin técnica (`DevRoute`) | `AdminV4CallbacksPage` | `useV4Callbacks` | T: `crm_callback_events`; E: `crm-callback-reprocess` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/design-tokens` | admin técnica (`DevRoute`) | `AdminDesignTokensPage` | UI/tokens locais | Nenhum literal de BD/RPC | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/client-performance` | admin técnica (`DevRoute`) | `AdminClientPerformancePage` | Hooks de performance do cliente | Telemetria delegada; nenhum literal seguro na página | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/rate-limit` | admin técnica (`DevRoute`) | `RateLimitDashboard` | Query de tentativas/limites | T: `login_attempts` | `e2e/routes/admin/rate-limit.spec.ts`; G-D | TBD |
| `/admin/workflows` | admin técnica (`DevRoute`) | `AdminWorkflowsPage` | `WorkflowCanvas`; estado local | Nenhum contrato persistente detectado | `e2e/routes/admin/workflows.spec.ts`; G-D | TBD |
| `/admin/login-attempts` | admin técnica (`DevRoute`) | `AdminLoginAttemptsPage` | `useLoginAttempts`, `useLoginAttemptStats` | T: `login_attempts` | `e2e/routes/admin/login-attempts.spec.ts`; G-D | TBD |
| `/admin/external-db` | admin técnica (`DevRoute`) | `AdminExternalDbPage` | `useExternalDbInspect` | E: `external-db-inspect` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/consumo-ia` | admin técnica (`DevRoute`) | `AdminAiUsagePage` | `useAiUsageLogs`, `useAiUsageStats` | T: `ai_usage_logs`, `ai_usage_quotas`; R: `check_ai_quota` | `e2e/routes/admin/ai-usage.spec.ts`; G-D | TBD |
| `/admin/conexoes` | admin técnica (`DevRoute`) | `AdminConexoesPage` | `useSecretsManager` e componentes de integrações/health | E: `secrets-manager`; demais contratos delegados aos painéis de conexões | `e2e/routes/admin/conexoes.spec.ts`; G-D | TBD |
| `/admin/conexoes/status` | admin técnica (`DevRoute`) | `AdminConexoesStatusPage` | Queries de conexões/credenciais | T: `external_connections`, `integration_credentials` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/status` | admin técnica (`DevRoute`) | `SystemStatusPage` | Queries de status | T: `login_attempts`, `profiles` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/external-db-test` | admin técnica (`DevRoute`) | `ExternalDatabaseTest` | `useExternalCompanies`, `useExternalProducts` | Bridge do banco externo; objetos concretos delegados | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/rbac-rotas` | admin técnica (`DevRoute`) | `AdminRbacRoutesPage` | `useAuth`, `RBAC_ROUTES` | Matriz local `src/lib/rbac/route-matrix.ts`; sem chamada de dados própria | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/storage-test` | admin técnica (`DevRoute`) | `StorageTestPage` | Chamada de sincronização/teste | E: `sync-external-db` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/qa` | admin técnica (`DevRoute`) | `QAPage` | `useDevGate` | Estado de QA/dev; nenhum literal de BD/RPC na página | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/qa/sidebar` | admin técnica (`DevRoute`) | `SidebarQAPage` | UI/sidebar local | Nenhum | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |
| `/admin/observabilidade` | admin técnica (`DevRoute`) | `ObservabilityDashboardPage` | `useKillSwitchObservability`, `useSmokeTests` | R: `fn_run_and_persist_smoke_tests`; telemetria delegada | `e2e/dashboard-modules.spec.ts`; G-D | TBD |
| `/admin/cloudflare-images` | admin técnica (`DevRoute`) | `AdminCloudflareImagesPage` | React Query, `untypedFrom`, utilitários CDN/proxy | T: `product_images` | `e2e/admin-conexoes-module.spec.ts`; G-D | TBD |

## Lacunas e divergências acionáveis

1. **Owners:** fora do módulo Magazine, nenhuma ownership real de rota/página foi encontrada em `.github/CODEOWNERS` ou nos documentos diretamente aplicáveis. São **126 rotas com owner `TBD`**; atribuí-las exige decisão humana, não inferência.
2. **Catálogo E2E divergente:** `e2e/routes/_catalog.ts` mantém caminhos públicos que não existem na árvore atual (`/approve`, `/proposta`, `/kit`, `/colecao-publica`, `/comparar-publica`, `/dossie`) e não representa várias rotas atuais. Não deve ser usado como SSOT sem reconciliação.
3. **Matriz RBAC divergente:** `src/lib/rbac/route-matrix.ts` contém caminhos legados e registra `/status`, enquanto a rota montada é `/admin/status`. A árvore React, e não essa matriz, determinou a classe deste inventário.
4. **Contagem histórica divergente:** `docs/estado/01_ROTAS_PAGINAS.md` registra 131 rotas; a extração AST da árvore atual encontra 132. O falso total 133 obtido por busca textual inclui um exemplo `path="*"` em comentário JSDoc de `client-routes.tsx`.
5. **Superfície pública de teste:** os oito `/__test/*` e `/debug/images` são montados sem autenticação também em produção; só os oito `/__visual/*` têm gate `import.meta.env.DEV`. Isso é inventário de exposição, não autorização para remover ou proteger as rotas.
6. **Contratos de banco:** este documento registra dependências estáticas do frontend; não autoriza DDL, migration, deploy nem aposentadoria. Qualquer verificação de existência, RLS, trigger, policy ou GRANT deve ocorrer por `pg_catalog` e com as autorizações previstas em `AGENTS.md`.
