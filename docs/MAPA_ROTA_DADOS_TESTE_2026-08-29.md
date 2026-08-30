# Mapa Rota → Dados → Teste — v0.1 RASCUNHO (2026-08-29)

> **Status: RASCUNHO — aguardando `[VALIDAÇÃO PO]`** (owners) e complementação automatizada (etapa 013).
> **Etapa do plano:** 002 (P0).
> **Fontes:** `src/routes/*.tsx` (roteador real), `src/lib/rbac/route-matrix.ts` (SSOT RBAC,
> 47 rotas), `src/routes/lazy-pages.ts` (componente → arquivo), `e2e/` e `tests/` (evidências),
> `MATRIZ_FLUXOS_CRITICOS_2026-08-26.md` (contratos DB/RPC/Edge por fluxo).

Guards: `public` (sem sessão) < `ProtectedRoute` (sessão) < `AdminRoute` (supervisor+, AAL2) <
`DevRoute` (dev, AAL2). Owners: todos **TBD** até a etapa 003 ser aprovada pelo PO.

## 1. Rotas públicas (React)

| Rota | Componente | Dados (DB/RPC/Edge) | Testes |
|---|---|---|---|
| `/auth` e `/login` (alias legado) | `Auth` | `supabase.auth`; Edge `check-login`, `log-login-attempt`, `detect-new-device` | `e2e/routes/public/login.spec.ts`, `e2e/auth/session-recovery.spec.ts` |
| `/reset-password` | `ResetPassword` | `supabase.auth` | `e2e/routes/public/reset-password.spec.ts` |
| `/forgot-password-confirmation` | `ForgotPasswordConfirmation` | — (estática) | coberta por `reset-password.spec.ts` (fluxo) |
| `/auth/callback` | `SSOCallbackPage` | `supabase.auth` (troca de código SSO) | **lacuna:** sem E2E dedicado |
| `/unauthorized` | `Unauthorized` | — (estática) | **lacuna** |
| `/termos`, `/privacidade` | `TermsPage`, `PrivacyPage` | — (estáticas) | **lacuna** |
| `/revista-publica/:token` | `PublicMagazineView` | Edge `magazine-public-view`; DB `magazines`, `magazine_items` | `e2e/magazine/magazine-viewer.spec.ts` |
| `/debug/images` | `OptimizedImageDemo` | — (demo de imagens) | `e2e/visual/` (projeto público) |
| `*` (catch-all) | `NotFound` | — | `e2e/smoke.spec.ts` (3 testes); **lacuna:** sem spec E2E dedicada de 404 público sem sessão |

## 2. Rotas públicas por token descontinuadas (legado no SSOT RBAC e nos testes)

Declaradas no SSOT RBAC (`route-matrix.ts`) e testadas com Edge mockada
(`e2e/routes/public/*` via `buildPublicTokenSuite`), mas **ausentes do roteador React**, sem
rewrite correspondente em `vercel.json` e com as 5 edges citadas abaixo **inexistentes** em
`supabase/functions/` (verificado por listagem local em 30/ago/2026 — ver I-1 abaixo):

| Rota | Edge Function | Testes |
|---|---|---|
| `/approve/:token` | `quote-public-react` | `e2e/routes/public/approve.spec.ts` |
| `/proposta/:token` | `quote-public-react` (a confirmar) | **lacuna:** sem spec |
| `/kit/:token` | `kit-public` | `e2e/routes/public/kit-publico.spec.ts` |
| `/lista-publica/:token` | a inventariar | **lacuna:** sem spec |
| `/colecao-publica/:token` | `collections-public-react` | `e2e/routes/public/colecao-publica.spec.ts` |
| `/comparar-publica/:token` | `comparisons-public-react` | `e2e/routes/public/comparar-publica.spec.ts` |
| `/dossie/:token` | `bi-share-dossier` | `e2e/routes/public/dossie.spec.ts` |

> **Inconsistência registrada (I-1) — contexto histórico localizado:** em 07/mai/2026 o PO decidiu
> **descontinuar todas as rotas públicas com token** (não viável no modelo de negócio B2B); 7 rotas
> frontend + 6 edge functions + código associado foram removidos na época, e a Onda 9 (14/mai/2026)
> concluiu a limpeza de DB (`docs/hardening/ONDA-9-DROP-PUBLIC-TOKEN-TABLES.md`; migration
> `20260514173516`; a migration de 07/mai `20260507161547_drop_public_token_tables.sql` permanece
> no repo como timestamp histórico neutralizado). As 5 edges citadas na tabela acima não existem
> mais — as specs E2E atuais as exercitam apenas via mocks. Hipótese prioritária: SSOT RBAC e
> specs ficaram **defasados** após a descontinuação (não há camada de serving fora do repo).
> **Ação:** confirmar com o PO e alinhar SSOT RBAC e specs em PR próprio (mudança de código —
> segue o protocolo de reserva da etapa 005).

## 3. Catálogo e produto (ProtectedRoute)

| Rota | Componente | Dados (DB/RPC/Edge) | Testes |
|---|---|---|---|
| `/produtos`, `/filtros` | `FiltersPage` | views `v_products_public`, `categories_tree_visual`; RPC `fn_super_filtro_product_ids`, `fn_get_color_swatches_batch`, `get_catalog_bestseller_page` | `e2e/catalog*.spec.ts`, `products-postgrest-load.spec.ts`, `flows/40-catalog-persistence` |
| `/produto/:id` | `ProductDetail` (guard `ValidProductIdRoute`) | `products`, `product_variants`, `product_images`; RPC `fn_get_similar_products` | `e2e/routes/app/produto-detail.spec.ts`, `ValidProductIdRoute.test.tsx` |
| `/produto` → redirect | — | — | coberto por guard/transition tests |
| `/novidades` | `NoveltiesPage` | catálogo Gold (novelties); Edge `cleanup-novelties` (job) | **lacuna parcial** — inventariar spec dedicada |
| `/reposicao` | `ReplenishmentsPage` | catálogo + estoque Gold | **lacuna parcial** |
| `/favoritos` | `FavoritesPage` | `favorite_lists`, `favorite_items`, `favorite_items_trash`; RPC `ensure_default_favorite_list`; Edge `favorites-watcher` | `e2e/flows/14-favorites-remove-persistence.spec.ts` |
| `/comparar` | `ComparePage` | catálogo; Edge `comparison-ai-advisor`, `comparison-price-watcher` | `product-sorting.test.ts`; **lacuna** E2E autenticado |
| `/colecoes`, `/colecoes/:id` | `CollectionsPage`, `CollectionDetailPage` | `collections`, `collection_items`, `collection_items_trash`; Edge `collections-watcher` | **lacuna parcial** |
| `/carrinhos` | `CartsListPage` | `seller_carts`, `seller_cart_items`, `cart_templates`; RPC `restore_seller_cart` | `e2e/routes/app/carrinhos.spec.ts`, `carts-module.spec.ts` |
| `/carrinhos/:cartId` | `SellerCartsPage` | idem + RPC `get_bundle_suggestions`; CRM via `crm-db-bridge` | `flows/12-cart-checkout`, `13-carts-delete-undo`, `13b-carts-undo-rpc-atomic`, `tests/security/restore-seller-cart-rpc.test.ts` |

## 4. Orçamentos (ProtectedRoute)

| Rota | Componente | Dados (DB/RPC/Edge) | Testes |
|---|---|---|---|
| `/orcamentos`, `/orcamentos/lista` | `QuotesListPage` | `quotes`, `quote_items`; RPCs transacionais (`create_quote_transactional` família) | `tests/sql/wave1_forward_only_migrations_test.sql` (cenários atômicos `create_quote_transactional`), `e2e/flows/04b-quote-create-end-to-end.spec.ts` |
| `/orcamentos/dashboard` | `QuotesDashboardPage` | `quotes` agregados | inventário na v0.1 §5 |
| `/orcamentos/kanban` | `QuotesKanbanPage` | `quotes` (status) | v0.1 §5 |
| `/orcamentos/novo`, `/orcamentos/:id/editar` | `QuoteBuilderPage` (guard `ValidQuoteIdRoute` no editar) | RPCs transacionais; `discount_approval_requests`; Edge `sync-quote-bitrix` | `tests/sql/wave1_forward_only_migrations_test.sql` (cenários atômicos), `src/hooks/quotes/__tests__/useQuoteConcurrencyGuard.test.ts`, `tests/integration/discountApprovalFlow.test.ts` |
| `/orcamentos/:id` | `QuoteViewPage` (guard) | `quotes` + itens; PDF/share | `QuoteActionHandlers.test.ts` |
| `/orcamentos/templates` → redirect | — | — | coberto por transition tests |

## 5. Home, dashboard e clientes (ProtectedRoute)

| Rota | Componente | Dados (DB/RPC/Edge) | Testes |
|---|---|---|---|
| `/` | `Index` | catálogo (home comercial) | smoke E2E |
| `/dashboard` | `CustomizableDashboard` | `quotes` (agregados pessoais) | **lacuna parcial** |
| `/clientes`, `/clientes/:id` | `ClientsPage`, `ClientDetailPage` | CRM via Edge `crm-db-bridge` (sem `.from()` direto nas pages) | v0.1 §11; **lacuna:** kill switch não consumido |
| `/admin/temas` | `AdminTemasPage` | preferência local (sem DB) | **lacuna** |
| `/comissoes` | `DeprecatedRoute` (descontinuado) | — | coberto por smoke de redirect |
| `/configuracoes`, `/perfil`, `/admin/personalizacao`, `/cadastro-produtos`, `/cadastro-gravacao` | redirects legados | — | transition tests |

## 6. Ferramentas (ProtectedRoute; `/simulacao` sob DevRoute)

| Rota | Componente | Dados (DB/RPC/Edge) | Testes |
|---|---|---|---|
| `/simulador` | `SimuladorWizard` | catálogo Gold | **lacuna parcial** |
| `/simulador-precos` | `PriceSimulatorPage` | catálogo Gold | **lacuna parcial** |
| `/estoque` | `StockDashboardPage` | `products`, `product_variants`, `variant_supplier_sources`, `stock_snapshots`, `stock_notes`, `saved_stock_views`; MVs `mv_stock_velocity`, `mv_stock_rupture_alert`; RPC `fn_ema_risk_summary`, `fn_ema_pipeline_health`, `get_supplier_reliability_history` | `stockFetcher.test.ts`, `useRuptureAlerts.test.tsx`, `e2e/stock-module.spec.ts`, `estoque-exaustivo` |
| `/busca-preco` | `AdvancedPriceSearchPage` | catálogo Gold | v0.1 §4 |
| `/match` | `ProductMatchPage` | catálogo Gold | v0.1 §4 |
| `/raio-x` | `VisualSearchPage` | catálogo + IA via Edge | v0.1 §4 |
| `/montar-kit` (`/kit-builder` → redirect) | `KitBuilderPage` | `custom_kits`, `kit_templates`, `kit_variants`, `kit_collaborators`, `kit_comments`; RPC `increment_kit_template_usage`; Edge `kit-ai-builder`, `kit-identity-suggest` | `e2e/routes/app/kit-builder.spec.ts`, `flows/06-kit-builder`, `useKitBuilderQuote.test.ts`; **lacuna confirmada:** save manual vazio |
| `/meus-kits` | `MeusKitsPage` (`KitLibraryPage`) | `custom_kits` | `e2e/routes/app/kit-library.spec.ts` |
| `/mockup-generator` (`/mockup`, `/gerador-mockup` → redirects) | `MockupGenerator` | Edge `generate-mockup`, `analyze-logo-colors`; Storage buckets de mockup | v0.1 §8 |
| `/mockups/historico` | `MockupHistoryPage` | DB histórico + Storage | v0.1 §8 |
| `/magic-up` | `MagicUp` | Edge de IA | v0.1 §8 |
| `/inteligencia-comercial` | `CommercialIntelligencePage` | BI Gold | **lacuna parcial** |
| `/ferramentas/bi`, `/ferramentas/bi/comparar` | `BusinessIntelligencePage`, `ClientComparatorPage` | BI Gold; Edge `bi-copilot` | **lacuna parcial** |
| `/ferramentas/cobertura` | `CoverageInsightsDashboardPage` | BI Gold | **lacuna parcial** |
| `/dropbox` | `DropboxBrowserPage` | Edge `dropbox-list` (externo) | **lacuna** |
| `/magazine`, `/magazine/templates`, `/magazine/:id`, `/magazine/:id/print`, `/magazine/print` | `MagazineListPage`, `MagazineTemplatesGalleryPage`, `MagazineEditorPage`, `MagazinePrintPage` | `magazines`, `magazine_items`, `magazine_reader_state`; Edge `magazine-public-view`, `magazine-reader-state-read/write`, `magazine-import-local` | `e2e/magazine/*`, `MagazineEditorPage.hooksOrder.test.tsx`, `useMagazinePublish.test.ts`, `useMagazineGoldImport.test.ts` |
| `/promoflix-playground` | `PromoFlixPlayground` | a inventariar | **lacuna** |
| `/simulacao` (DevRoute) | `SimulationPage` | orquestrador de simulação (fail-closed pendente — etapa 020) | a inventariar |

## 7. Admin (AdminRoute) e Dev (DevRoute)

AdminRoute (supervisor+): `/admin` → redirect; `/admin/usuarios`, `/admin/usuarios/promover`;
`/admin/limites-desconto` (`seller_discount_limits`, `discount_approval_requests`);
`/admin/aprovacoes-desconto` → redirect para `/admin/usuarios?tab=discounts`;
`/admin/aprovacoes-desconto/:id` (`discount_approval_requests`);
`/admin/rls-denials` (`rls_denial_log`); `/admin/auditoria-propriedade`; `/admin/cadastros`,
`/admin/cadastros/produto/:id`; `/admin/permissoes` (`permissions`); `/admin/roles` (`roles`);
`/admin/role-permissoes` (`role_permissions`); `/admin/video-variantes`; `/admin/kit-templates`,
`/admin/kit-templates/metricas`; `/admin/performance*`, `/admin/comissoes` (DeprecatedRoute);
`/tendencias` (`TrendsPage`, fora do AdminRoute — verificar intenção).

DevRoute (AAL2): `/admin/seguranca`, `/admin/seguranca-acesso`, `/admin/seguranca/chaves`,
`/admin/seguranca/exemplos-challenge`, `/admin/seguranca/migracao-papeis`, `/admin/prompts-ia`,
`/admin/validade-precos`, `/admin/badges-inteligencia`, `/admin/telemetria` (`query_telemetry`,
RPC `check_telemetry_regression`), `/admin/ema-health`, `/admin/v4-callbacks`,
`/admin/design-tokens`, `/admin/client-performance`, `/admin/rate-limit` (`request_rate_limits`),
`/admin/workflows`, `/admin/login-attempts`, `/admin/external-db`, `/admin/consumo-ia`,
`/admin/conexoes`, `/admin/conexoes/status`, `/admin/status`, `/external-db-test`,
`/admin/rbac-rotas` (consome `route-matrix.ts`), `/admin/storage-test`, `/admin/qa`,
`/admin/qa/sidebar`, `/admin/observabilidade` (RPC `get_app_health_summary`,
`get_platform_failure_metrics`, `lookup_request_id`), `/admin/cloudflare-images`.

Testes admin/dev: cobertura concentrada em telemetria/observabilidade; **lacuna** ampla de E2E
para páginas DevRoute (dependem de AAL2 em staging — etapas 031+).

## 8. Harnesses dev-only (não montam em build de produção)

Públicos (`/__test/*`): color-swatches, confirm-dialog, alert-dialog, dialog, undo-toast,
cnpj-form, magazine-ring, tab-skip — gated por `import.meta.env.DEV` em `public-routes.tsx`.
Protegidos (`/__visual/*`): preview-button, quote-view-order, quote-items-list-mobile,
quote-item-editor-sheet, quote-add-product-button, calendar, date-picker-field,
negotiation-markup-card — gated em `AppRoutes.tsx`, protegidos por `scripts/check-visual-preview-suite.mjs`.

## 9. Reconciliação RBAC × roteador (drift registrado)

Fontes: `src/lib/rbac/route-matrix.ts` (47 rotas) × `src/routes/*.tsx`.

| # | Drift | Evidência | Ação proposta |
|---|---|---|---|
| D-1 | 7 rotas públicas por token descontinuadas ainda existem no RBAC, mas não no roteador (ver §2) | `route-matrix.ts` vs `public-routes.tsx` | Confirmar a descontinuação com o PO; depois remover as entradas e alinhar as specs em PR próprio |
| D-2 | RBAC declara `/status`; roteador monta `/admin/status` | `route-matrix.ts` linha `/status` vs `admin-routes.tsx` | Corrigir o SSOT RBAC (PR docs/code) |
| D-3 | RBAC não lista rotas de negócio (`/produto/:id`, `/orcamentos/*`, `/magazine*`, `/montar-kit`, `/clientes*`, `/estoque` está listada etc.) | comparação direta | Decidir escopo do SSOT RBAC: só rotas técnicas ou 100% das rotas (etapa 002 pede 100%) |
| D-4 | `/tendencias` montada fora de `AdminRoute` apesar de estar na seção admin | `admin-routes.tsx` linha 64 | Confirmar guard intencional com PO |

## 10. Lacunas de cobertura e próximos passos

1. **Lacunas de teste** marcadas nas tabelas (sem spec ou só parcial) entram no backlog das
   etapas 011–015 (sinal de engenharia) e 031+ (E2E em staging).
2. **Colunas a completar automaticamente** na etapa 013 (scanners anti-drift): `.from()`/`.rpc()`
   por diretório de página, `functions.invoke` por fluxo e Storage por bucket — hoje preenchidas
   pela matriz v0.1 + greps manuais.
3. **Owners:** todos TBD até aprovação da etapa 003; este mapa referencia
   `OWNERSHIP_DOMINIOS_2026-08-29.md`.
4. **Critério de conclusão da etapa 002:** 100% das rotas com owner nomeado e cadeia
   rota → componente → hooks/serviços → dados → teste rastreável, com drifts D-1..D-4 resolvidos.
