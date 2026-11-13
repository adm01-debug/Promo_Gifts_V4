# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `0f00ba1670810c8cd6cdd05ce28e6cbe198af094` (2026-11-13T02:29:19Z).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (4738), SQL (3333), Markdown (1010), JavaScript (312), JSON (118), YAML (108), Shell (25), HTML (20)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: npm
- node: 22.22.1
- python: n/d
- deploy: vercel
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 9895 |
| arquivos_codigo | 5054 |
| linhas_codigo | 965726 |
| rotas | 138 |
| rotas_http_backend | 13 |
| vistas_por_id | 0 |
| itens_menu | 69 |
| modulos | 158 |
| componentes | 1225 |
| hooks | 615 |
| edge_functions | 111 |
| tabelas | 545 |
| migrations | 3051 |
| cron_jobs | 120 |
| testes | 2303 |
| workflows | 95 |
| scripts | 259 |
| docs_md | 1010 |

## Onde ficam as coisas
- telas: src/pages (111), src/components (3), api/health.ts (1)
- componentes: src/components (932), src/pages (175), recovery/src-legacy (100)
- hooks: src/hooks (292), recovery/src-legacy (196), src/components (75)
- servicos_logica: src/lib (224), src/utils (30), src/services (9)
- testes: tests/ (866), co-localizado (__tests__) (625), e2e/ (625)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/graphify (4), scripts/inventario (4), scripts/lib (3)
- docs: docs (144), (raiz) (14), .github (4)
- nomenclatura: {"componentes":"PascalCase (95%)","hooks":"use + PascalCase","servicos":"kebab-case (52%)","edge_functions":"kebab-case (99%)","tabelas":"snake_case (86%)"}
- instruções para agentes no repo: .claude/CLAUDE.md, AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| api | 0 | 3 | 3 | 0 | 0 | 0 |
| components/access | 0 | 1 | 2 | 0 | 0 | 1 |
| components/admin | 0 | 0 | 292 | 360 | 10 | 81 |
| components/audit | 1 | 1 | 3 | 19 | 0 | 7 |
| components/auth | 0 | 0 | 8 | 16 | 0 | 5 |
| components/bi | 0 | 0 | 22 | 280 | 4 | 41 |
| components/cart | 0 | 0 | 16 | 271 | 4 | 41 |
| components/catalog | 0 | 0 | 8 | 308 | 5 | 50 |
| components/collections | 0 | 0 | 14 | 273 | 5 | 44 |
| components/common | 0 | 0 | 27 | 287 | 4 | 43 |
| components/compare | 0 | 0 | 23 | 275 | 5 | 44 |
| components/dashboard | 0 | 0 | 10 | 280 | 4 | 51 |
| components/dev | 0 | 0 | 6 | 20 | 0 | 7 |
| components/effects | 0 | 0 | 5 | 27 | 0 | 7 |
| components/expert | 0 | 0 | 14 | 270 | 5 | 41 |
| components/favorites | 0 | 0 | 11 | 267 | 4 | 41 |
| components/filters | 0 | 0 | 23 | 268 | 4 | 42 |
| components/intelligence | 0 | 0 | 27 | 288 | 4 | 44 |
| components/inventory | 0 | 0 | 40 | 317 | 5 | 47 |
| components/kit-builder | 0 | 0 | 47 | 293 | 4 | 52 |
| components/kit-library | 0 | 0 | 7 | 26 | 0 | 9 |
| components/layout | 0 | 4 | 18 | 436 | 8 | 83 |
| components/magic-up | 0 | 0 | 18 | 267 | 4 | 41 |
| components/mockup | 0 | 0 | 39 | 270 | 4 | 41 |
| components/notifications | 0 | 0 | 7 | 31 | 0 | 8 |
| components/novelties | 0 | 0 | 7 | 299 | 5 | 46 |
| components/pdf | 0 | 0 | 13 | 0 | 0 | 0 |
| components/pricing | 0 | 0 | 20 | 267 | 4 | 41 |
| components/products | 0 | 0 | 103 | 309 | 5 | 49 |
| components/quotes | 0 | 0 | 50 | 294 | 5 | 50 |
| components/replenishments | 0 | 0 | 9 | 300 | 5 | 46 |
| components/search | 0 | 0 | 25 | 293 | 5 | 47 |
| components/security | 0 | 0 | 10 | 51 | 0 | 17 |
| components/shared | 0 | 0 | 5 | 19 | 0 | 7 |
| components/simulator | 0 | 0 | 24 | 53 | 0 | 7 |
| components/ui | 0 | 0 | 61 | 33 | 1 | 7 |
| contexts | 0 | 0 | 10 | 303 | 4 | 49 |
| hooks | 0 | 0 | 8 | 15 | 0 | 4 |
| hooks/admin | 0 | 0 | 19 | 29 | 1 | 9 |
| hooks/auth | 0 | 0 | 11 | 13 | 0 | 5 |
| hooks/bi | 0 | 0 | 14 | 41 | 0 | 6 |
| hooks/common | 0 | 0 | 23 | 270 | 4 | 41 |
| hooks/comparison | 0 | 0 | 6 | 272 | 4 | 43 |
| hooks/crm | 0 | 0 | 7 | 24 | 0 | 3 |
| hooks/favorites | 0 | 0 | 8 | 267 | 4 | 41 |
| hooks/intelligence | 0 | 0 | 39 | 270 | 4 | 41 |
| hooks/kit-builder | 0 | 0 | 22 | 24 | 0 | 9 |
| hooks/mockup | 0 | 0 | 9 | 267 | 4 | 41 |
| hooks/products | 0 | 0 | 71 | 277 | 4 | 41 |
| hooks/quotes | 0 | 0 | 21 | 301 | 4 | 52 |
| hooks/simulation | 0 | 0 | 16 | 44 | 0 | 5 |
| hooks/simulator | 0 | 0 | 8 | 50 | 0 | 6 |
| hooks/stock | 0 | 0 | 12 | 37 | 0 | 8 |
| hooks/tecnicas | 0 | 0 | 6 | 44 | 0 | 5 |
| hooks/ui | 0 | 0 | 18 | 31 | 0 | 8 |
| hooks/voice | 0 | 0 | 10 | 1 | 2 | 1 |
| integrations/supabase | 0 | 0 | 7 | 3 | 0 | 2 |
| lib | 0 | 0 | 57 | 425 | 8 | 82 |
| lib/access | 0 | 0 | 6 | 3 | 0 | 3 |
| lib/auth | 0 | 0 | 19 | 12 | 0 | 5 |
| lib/bi | 0 | 0 | 7 | 9 | 0 | 2 |
| lib/external-db | 0 | 0 | 21 | 44 | 0 | 6 |
| lib/inventory | 0 | 0 | 10 | 0 | 0 | 0 |
| lib/kit-builder | 0 | 0 | 11 | 0 | 0 | 0 |
| lib/personalization | 0 | 0 | 20 | 44 | 0 | 5 |
| lib/quotes | 0 | 0 | 6 | 0 | 0 | 0 |
| lib/security | 0 | 0 | 10 | 3 | 0 | 2 |
| lib/telemetry | 0 | 0 | 14 | 0 | 0 | 1 |
| lib/validations | 0 | 0 | 5 | 0 | 0 | 0 |
| pages | 3 | 7 | 7 | 335 | 5 | 61 |
| pages/__visual | 0 | 9 | 9 | 281 | 4 | 50 |
| pages/admin | 17 | 40 | 59 | 412 | 13 | 101 |
| pages/auth | 0 | 7 | 11 | 12 | 0 | 3 |
| pages/bi | 3 | 3 | 3 | 302 | 4 | 44 |
| pages/clients | 0 | 3 | 3 | 277 | 5 | 41 |
| pages/collections | 2 | 2 | 3 | 301 | 5 | 46 |
| pages/dev | 0 | 8 | 8 | 2 | 0 | 0 |
| pages/kit-builder | 0 | 1 | 3 | 293 | 4 | 52 |
| pages/magazine | 1 | 6 | 64 | 81 | 2 | 10 |
| pages/mockups | 3 | 2 | 6 | 271 | 5 | 41 |
| pages/products | 9 | 10 | 24 | 330 | 5 | 56 |
| pages/quotes | 3 | 7 | 13 | 294 | 4 | 50 |
| pages/system | 1 | 3 | 3 | 286 | 4 | 44 |
| pages/tools | 6 | 8 | 9 | 290 | 5 | 50 |
| routes | 0 | 0 | 9 | 501 | 16 | 112 |
| services | 0 | 0 | 9 | 44 | 2 | 15 |
| stores | 0 | 0 | 8 | 0 | 0 | 1 |
| types | 0 | 0 | 19 | 0 | 0 | 1 |
| utils | 0 | 0 | 31 | 267 | 5 | 41 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/Index.tsx
- `/__test/alert-dialog` [tela] → src/pages/dev/AlertDialogHarness.tsx
- `/__test/cnpj-form` [tela] → src/pages/dev/CnpjFormHarness.tsx
- `/__test/color-swatches` [tela] → src/pages/dev/ColorSwatchesHarness.tsx
- `/__test/confirm-dialog` [tela] → src/pages/dev/ConfirmDialogHarness.tsx
- `/__test/dialog` [tela] → src/pages/dev/DialogHarness.tsx
- `/__test/magazine-ring` [tela] → src/pages/dev/MagazineRingHarness.tsx
- `/__test/tab-skip` [tela] → src/pages/dev/TabSkipHarness.tsx
- `/__test/undo-toast` [tela] → src/pages/dev/UndoToastHarness.tsx
- `/__visual/calendar` [tela] → src/pages/__visual/CalendarHarness.tsx
- `/__visual/date-picker-field` [tela] → src/pages/__visual/DatePickerFieldHarness.tsx
- `/__visual/negotiation-markup-card` [tela] → src/pages/__visual/NegotiationMarkupCardHarness.tsx
- `/__visual/preview-button` [tela] → src/pages/__visual/PreviewButtonHarness.tsx
- `/__visual/quote-add-product-button` [tela] → src/pages/__visual/QuoteAddProductButtonHarness.tsx
- `/__visual/quote-freight-block` [tela] → src/pages/__visual/QuoteFreightBlockHarness.tsx
- `/__visual/quote-item-editor-sheet` [tela] → src/pages/__visual/QuoteItemEditorSheetHarness.tsx
- `/__visual/quote-items-list-mobile` [tela] → src/pages/__visual/QuoteItemsListMobileHarness.tsx
- `/__visual/quote-view-order` [tela] → src/pages/__visual/QuoteViewOrderHarness.tsx
- `/*` [tela] → src/pages/NotFound.tsx
- `/admin` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/admin/aprovacoes-desconto` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/admin/aprovacoes-desconto/:id` [tela] → src/pages/admin/DiscountRequestDetailPage.tsx
- `/admin/audit-suite` [tela] → src/components/audit/AuditReport.tsx
- `/admin/auditoria-propriedade` [tela] → src/pages/admin/OwnershipAuditAdminPage.tsx (protegida)
- `/admin/badges-inteligencia` [tela] → src/pages/admin/IntelligenceBadgeSettingsPage.tsx
- `/admin/cadastros` [tela] → src/pages/admin/AdminCadastrosPage.tsx (protegida)
- `/admin/cadastros/produto/:id` [tela] → src/pages/admin/AdminProductFormPage.tsx (protegida)
- `/admin/client-performance` [tela] → src/pages/admin/AdminClientPerformancePage.tsx (protegida)
- `/admin/cloudflare-images` [tela] → src/pages/admin/AdminCloudflareImagesPage.tsx (protegida)
- `/admin/comissoes` [tela] → src/components/layout/DeprecatedRoute.tsx
- `/admin/conexoes` [tela] → src/pages/admin/AdminConexoesPage.tsx (protegida)
- `/admin/conexoes/status` [tela] → src/pages/admin/AdminConexoesStatusPage.tsx (protegida)
- `/admin/consumo-ia` [tela] → src/pages/admin/AdminAiUsagePage.tsx (protegida)
- `/admin/design-tokens` [tela] → src/pages/admin/AdminDesignTokensPage.tsx (protegida)
- `/admin/ema-health` [tela] → src/pages/admin/EmaHealthPage.tsx
- `/admin/external-db` [tela] → src/pages/admin/AdminExternalDbPage.tsx (protegida)
- `/admin/kit-templates` [tela] → src/pages/admin/KitTemplatesAdminPage.tsx (protegida)
- `/admin/kit-templates/metricas` [tela] → src/pages/admin/KitTemplatesMetricsPage.tsx
- `/admin/limites-desconto` [tela] → src/pages/admin/SellerDiscountLimitsAdminPage.tsx (protegida)
- `/admin/login-attempts` [tela] → src/pages/admin/AdminLoginAttemptsPage.tsx (protegida)
- `/admin/observabilidade` [tela] → src/pages/admin/ObservabilityDashboard.tsx
- `/admin/performance` [tela] → src/components/layout/DeprecatedRoute.tsx
- `/admin/performance-comercial` [tela] → src/components/layout/DeprecatedRoute.tsx
- `/admin/permissoes` [tela] → src/pages/admin/PermissionsPage.tsx
- `/admin/personalizacao` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/admin/prompts-ia` [tela] → src/pages/admin/AdminPromptsIAPage.tsx (protegida)
- `/admin/qa` [tela] → src/pages/QAPage.tsx
- `/admin/qa/sidebar` [tela] → src/pages/SidebarQAPage.tsx
- `/admin/rate-limit` [tela] → src/pages/system/RateLimitDashboardPage.tsx
- `/admin/rbac-rotas` [tela] → src/pages/admin/AdminRbacRoutesPage.tsx (protegida)
- `/admin/rls-denials` [tela] → src/pages/admin/RlsDenialsAdminPage.tsx (protegida)
- `/admin/role-permissoes` [tela] → src/pages/admin/RolePermissionsPage.tsx
- `/admin/roles` [tela] → src/pages/admin/RolesPage.tsx
- `/admin/seguranca` [tela] → src/pages/admin/AdminSegurancaPage.tsx (protegida)
- `/admin/seguranca-acesso` [tela] → src/pages/admin/AdminSegurancaAcessoPage.tsx (protegida)
- `/admin/seguranca/chaves` [tela] → src/pages/admin/AdminSegurancaChavesPage.tsx (protegida)
- `/admin/seguranca/exemplos-challenge` [tela] → src/pages/admin/DevChallengeExamplesPage.tsx
- `/admin/seguranca/migracao-papeis` [tela] → src/pages/admin/AdminMigracaoPapeisPage.tsx (protegida)
- `/admin/sessoes` [tela] → src/pages/admin/AdminSessionsPage.tsx (protegida)
- `/admin/status` [tela] → src/pages/system/SystemStatusPage.tsx
- `/admin/storage-test` [tela] → src/pages/admin/StorageTestPage.tsx
- `/admin/telemetria` [tela] → src/pages/admin/AdminTelemetriaPage.tsx (protegida)
- `/admin/temas` [tela] → src/pages/admin/AdminTemasPage.tsx (protegida)
- `/admin/usuarios` [tela] → src/pages/admin/AdminUsuariosPage.tsx (protegida)
- `/admin/usuarios/promover` [tela] → src/pages/admin/AdminPromoverUsuarioPage.tsx (protegida)
- `/admin/v4-callbacks` [tela] → src/pages/admin/AdminV4CallbacksPage.tsx (protegida)
- `/admin/validade-precos` [tela] → src/pages/admin/PriceFreshnessSettings.tsx
- `/admin/video-variantes` [tela] → src/pages/admin/AdminVideoVariantsPage.tsx (protegida)
- `/admin/workflows` [tela] → src/pages/admin/AdminWorkflowsPage.tsx (protegida)
- `/api/health` [api] → api/health.ts
- `/api/ready` [api] → api/ready.ts
- `/api/sitemap` [api] → api/sitemap.ts
- `/auth` [tela] → src/pages/auth/Auth.tsx (protegida)
- `/auth/callback` [tela] → src/pages/auth/SSOCallbackPage.tsx
- `/busca-preco` [tela] → src/pages/tools/AdvancedPriceSearchPage.tsx
- `/cadastro-gravacao` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/cadastro-produtos` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/carrinhos` [tela] → src/pages/products/CartsListPage.tsx
- `/carrinhos/:cartId` [tela] → src/pages/products/SellerCartsPage.tsx
- `/clientes` [tela] → src/pages/clients/ClientsPage.tsx
- `/clientes/:id` [tela] → src/pages/clients/ClientDetailPage.tsx
- `/colecoes` [tela] → src/pages/collections/CollectionsPage.tsx
- `/colecoes/:id` [tela] → src/pages/collections/CollectionDetailPage.tsx
- `/comissoes` [tela] → src/components/layout/DeprecatedRoute.tsx
- `/comparar` [tela] → src/pages/products/ComparePage.tsx
- `/configuracoes` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/dashboard` [tela] → src/pages/CustomizableDashboard.tsx
- `/debug/images` [tela] → src/pages/tools/OptimizedImageDemo.tsx
- `/dropbox` [tela] → src/pages/tools/DropboxBrowserPage.tsx
- `/estoque` [tela] → src/pages/admin/StockDashboardPage.tsx
- `/external-db-test` [tela] → src/pages/system/ExternalDatabaseTest.tsx
- `/favoritos` [tela] → src/pages/products/FavoritesPage.tsx
- `/ferramentas/bi` [tela] → src/pages/bi/BusinessIntelligencePage.tsx
- `/ferramentas/bi/comparar` [tela] → src/pages/clients/ClientComparatorPage.tsx
- `/ferramentas/cobertura` [tela] → src/pages/tools/CoverageInsightsDashboardPage.tsx
- `/filtros` [tela] → src/pages/products/FiltersPage.tsx
- `/forgot-password-confirmation` [tela] → src/pages/auth/ForgotPasswordConfirmation.tsx
- `/gerador-mockup` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/inteligencia-comercial` [tela] → src/pages/bi/CommercialIntelligencePage.tsx
- `/kit-builder` [tela] → **ARQUIVO NÃO RESOLVIDO**
- `/login` [tela] → src/pages/auth/Auth.tsx (protegida)
- `/magazine` [tela] → src/pages/magazine/MagazineListPage.tsx
- `/magazine/:id` [tela] → src/pages/magazine/MagazineEditorPage.tsx
- `/magazine/:id/print` [tela] → src/pages/magazine/MagazinePrintPage.tsx
- `/magazine/print` [tela] → src/pages/magazine/MagazinePrintPage.tsx
- `/magazine/templates` [tela] → src/pages/magazine/templates-gallery/MagazineTemplatesGalleryPage.tsx
- `/magic-up` [tela] → src/pages/tools/MagicUp.tsx
- `/match` [tela] → src/pages/products/ProductMatchPage.tsx
- `/meus-kits` [tela] → src/pages/kit-builder/KitLibraryPage.tsx
- `/mockup` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/mockup-generator` [tela] → src/pages/mockups/MockupGenerator.tsx
- `/mockups/historico` [tela] → src/pages/mockups/MockupHistoryPage.tsx
- `/montar-kit` [tela] → **ARQUIVO NÃO RESOLVIDO**
- `/novidades` [tela] → src/pages/products/NoveltiesPage.tsx
- `/orcamentos` [tela] → src/pages/quotes/QuotesListPage.tsx
- `/orcamentos/:id` [tela] → src/pages/quotes/QuoteViewPage.tsx
- `/orcamentos/:id/editar` [tela] → src/pages/quotes/QuoteBuilderPage.tsx
- `/orcamentos/dashboard` [tela] → src/pages/quotes/QuotesDashboardPage.tsx
- `/orcamentos/kanban` [tela] → src/pages/quotes/QuotesKanbanPage.tsx
- `/orcamentos/lista` [tela] → src/pages/quotes/QuotesListPage.tsx
- `/orcamentos/novo` [tela] → src/pages/quotes/QuoteBuilderPage.tsx
- `/orcamentos/templates` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/perfil` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/privacidade` [tela] → src/pages/auth/PrivacyPage.tsx
- `/produto` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/produto/:id` [tela] → src/pages/products/ProductDetail.tsx
- `/produtos` [tela] → src/pages/products/FiltersPage.tsx
- `/promoflix-playground` [tela] → src/pages/PromoFlixPlayground.tsx
- `/raio-x` [tela] → src/pages/tools/VisualSearchPage.tsx
- `/reposicao` [tela] → src/pages/products/ReplenishmentsPage.tsx
- `/reset-password` [tela] → src/pages/auth/ResetPassword.tsx
- `/revista-publica/:token` [tela] → src/pages/magazine/PublicMagazineView.tsx
- `/simulacao` [tela] → src/pages/Simulation.tsx
- `/simulador` [tela] → src/pages/tools/SimuladorWizard.tsx
- `/simulador-precos` [tela] → src/pages/tools/PriceSimulatorPage.tsx
- `/tendencias` [tela] → src/pages/bi/TrendsPage.tsx
- `/termos` [tela] → src/pages/auth/TermsPage.tsx
- `/unauthorized` [tela] → src/components/access/UnauthorizedPage.tsx (protegida)

## Rotas HTTP de backend
- `OPTIONS  }
    return new Response(
      JSON.stringify({
        error: ERR.KEY_AUTO_REVOKED_DEV,
        message: ` → supabase/functions/mcp-server/index.ts
- `GET /{t}` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `DELETE /c` → scripts/ai-context/cenarios.mjs
- `PUT /d` → scripts/ai-context/cenarios.mjs
- `GET /items` → scripts/ai-context/gerar.unit.mjs
- `GET /u` → scripts/ai-context/cenarios.mjs
- `GET /users` → scripts/ai-context/cenarios.mjs
- `POST /users/:id` → scripts/ai-context/cenarios.mjs
- `GET /x` → scripts/ai-context/cenarios.mjs

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `ai-recommendations` (verify_jwt=false) — tabelas: -; chamada por 2 arquivo(s) do front
- `analyze-logo-colors` — tabelas: -; chamada por 1 arquivo(s) do front
- `anonymize-user` — tabelas: login_attempts, profiles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `asia-ingestion` (verify_jwt=false) — tabelas: supplier_products_raw; chamada por 0 arquivo(s) do front
- `audit-suite` — tabelas: seller_cart_items, seller_carts, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `backfill-image-dimensions` (verify_jwt=false) — tabelas: product_images; chamada por 0 arquivo(s) do front, por SQL/cron
- `bi-copilot` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `bitrix-sync` — tabelas: bitrix_clients, bitrix_deals, sync_logs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `block-ip-temporarily` — tabelas: admin_audit_log, ip_access_control; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `bulk-random-passwords` — tabelas: admin_audit_log; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `categories-api` — tabelas: categories, categories_tree_visual, product_category_assignments, products; chamada por 1 arquivo(s) do front
- `check-login` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front, por SQL/cron
- `cleanup-notifications` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `cleanup-novelties` (verify_jwt=false) — tabelas: product_novelties, products; chamada por 0 arquivo(s) do front
- `cnpj-lookup` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `collections-watcher` (verify_jwt=false) — tabelas: collection_items, collections, products, workspace_notifications; chamada por 0 arquivo(s) do front, por SQL/cron
- `commemorative-dates` — tabelas: v_commemorative_dates_with_colors; chamada por 1 arquivo(s) do front
- `comparison-ai-advisor` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `comparison-price-watcher` (verify_jwt=false) — tabelas: price_history, product_variants, user_comparisons, workspace_notifications; chamada por 0 arquivo(s) do front
- `connection-tester` — tabelas: connection_test_history, external_connections, user_roles; chamada por 4 arquivo(s) do front
- `connections-auto-test` (verify_jwt=false) — tabelas: external_connections; chamada por 0 arquivo(s) do front, por SQL/cron
- `connections-health-check` (verify_jwt=false) — tabelas: connection_test_history, external_connections, outbound_webhooks, secret_rotation_log, user_roles, workspace_notifications; chamada por 0 arquivo(s) do front, por SQL/cron
- `connections-hub-audit` — tabelas: webhook_deliveries; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `cors-audit` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `crm-callback-alerts` (verify_jwt=false) — tabelas: crm_callback_events, system_settings; chamada por 0 arquivo(s) do front
- `crm-callback-reprocess` (verify_jwt=false) — tabelas: crm_callback_events, quotes, user_roles; chamada por 1 arquivo(s) do front
- `crm-db-bridge` (verify_jwt=false) — tabelas: companies, quotes, user_roles; chamada por 2 arquivo(s) do front
- `detect-new-device` — tabelas: device_login_notifications, user_known_devices, workspace_notifications; chamada por 1 arquivo(s) do front
- `dropbox-list` — tabelas: -; chamada por 1 arquivo(s) do front
- `e2e-cleanup` (verify_jwt=false) — tabelas: e2e_cleanup_audit, quote_items, quotes; chamada por 0 arquivo(s) do front
- `elevenlabs-scribe-token` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `elevenlabs-tts` — tabelas: -; chamada por 1 arquivo(s) do front
- `ema-pipeline-health` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `expert-chat` — tabelas: categories, companies, contacts, customers, orders, product_category_assignments, products, profiles, quotes, suppliers; chamada por 2 arquivo(s) do front
- `external-db-bridge` — tabelas: -; chamada por 9 arquivo(s) do front, por SQL/cron
- `external-db-inspect` (verify_jwt=false) — tabelas: user_roles; chamada por 1 arquivo(s) do front
- `favorites-watcher` (verify_jwt=false) — tabelas: favorite_items, products, workspace_notifications; chamada por 0 arquivo(s) do front
- `force-global-logout` — tabelas: admin_audit_log, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `full-op-diagnostics` — tabelas: step_up_tokens; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-ad-image` — tabelas: -; chamada por 1 arquivo(s) do front
- `generate-ad-prompt` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-blurhashes` — tabelas: product_images; chamada por 0 arquivo(s) do front, por SQL/cron
- `generate-mockup` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-product-seo` — tabelas: -; chamada por 1 arquivo(s) do front
- `get-visitor-info` (verify_jwt=false) — tabelas: -; chamada por 2 arquivo(s) do front
- `github-credentials-test` — tabelas: admin_audit_log, integration_credentials, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `hash-product-images` — tabelas: product_images; chamada por 0 arquivo(s) do front, por SQL/cron
- `health-check` — tabelas: products, profiles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `image-proxy` (verify_jwt=false) — tabelas: -; chamada por 1 arquivo(s) do front
- `intelligence-substitute-applied` — tabelas: ai_usage_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `kit-ai-builder` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `kit-identity-suggest` — tabelas: -; chamada por 1 arquivo(s) do front
- `load-test` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `log-login-attempt` (verify_jwt=false) — tabelas: login_attempts; chamada por 1 arquivo(s) do front
- `magazine-import-local` (verify_jwt=false) — tabelas: -; chamada por 1 arquivo(s) do front
- `magazine-public-react` (verify_jwt=false) — tabelas: magazine_public_reactions, magazines; chamada por 0 arquivo(s) do front
- `magazine-public-view` (verify_jwt=false) — tabelas: magazine_public_view_events, magazines; chamada por 1 arquivo(s) do front
- `magazine-reader-state-read` (verify_jwt=false) — tabelas: magazine_reader_state, magazines; chamada por 0 arquivo(s) do front
- `magazine-reader-state-write` (verify_jwt=false) — tabelas: magazine_reader_state, magazines; chamada por 0 arquivo(s) do front
- `magic-up-score` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `manage-users` — tabelas: admin_audit_log, profiles, user_roles; chamada por 1 arquivo(s) do front
- `market-intelligence-insights` — tabelas: ai_insights_cache, ai_usage_events, order_items, orders, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `materials-api` — tabelas: material_groups, material_types, mv_material_group_stats, product_materials; chamada por 1 arquivo(s) do front
- `mcp-keys-issue` — tabelas: mcp_api_keys, step_up_audit_log; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-revoke` — tabelas: mcp_api_keys; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-rotate` — tabelas: mcp_api_keys, step_up_audit_log; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-update` — tabelas: mcp_api_keys, step_up_audit_log; chamada por 1 arquivo(s) do front
- `mcp-query` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-server` (verify_jwt=false) — tabelas: admin_audit_log, orders, quotes; chamada por 1 arquivo(s) do front
- `migrate-helper` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `ownership-audit` (verify_jwt=false) — tabelas: ownership_audit_reports; chamada por 0 arquivo(s) do front
- `ownership-repair` — tabelas: ownership_repair_logs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `process-queue` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front, por SQL/cron
- `process-scheduled-reports` (verify_jwt=false) — tabelas: orders, quotes, scheduled_reports; chamada por 0 arquivo(s) do front
- `product-visual-search` — tabelas: categories, product_images, products; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `product-webhook` — tabelas: categories, product_sync_logs, products, webhook_request_nonces; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `quote-followup-reminders` (verify_jwt=false) — tabelas: follow_up_reminders, quotes; chamada por 0 arquivo(s) do front, por SQL/cron
- `quote-sync` — tabelas: profiles, quote_items, quotes; chamada por 1 arquivo(s) do front
- `quote-sync-promo-champions` — tabelas: quotes, request_rate_limits; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rate-limit-check` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `receive-crm-callback` (verify_jwt=false) — tabelas: crm_callback_events; chamada por 0 arquivo(s) do front
- `rls-audit` — tabelas: discount_approval_requests, orders, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rls-integration-tests` — tabelas: user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rls-matrix-export` — tabelas: -; chamada por 1 arquivo(s) do front
- `secrets-manager` — tabelas: admin_audit_log, integration_credentials, secret_rotation_log, user_roles; chamada por 2 arquivo(s) do front
- `secure-upload` — tabelas: file_scan_logs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `semantic-search` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `send-digest` (verify_jwt=false) — tabelas: workspace_notifications; chamada por 0 arquivo(s) do front
- `send-notification` (verify_jwt=false) — tabelas: workspace_notifications; chamada por 0 arquivo(s) do front
- `send-scheduled-reports` (verify_jwt=false) — tabelas: orders, quotes, scheduled_reports; chamada por 0 arquivo(s) do front
- `send-transactional-email` — tabelas: workspace_notifications; chamada por 1 arquivo(s) do front
- `simulation-orchestrator` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `step-up-verify` — tabelas: step_up_audit_log; chamada por 1 arquivo(s) do front
- `sync-external-db` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `sync-quote-bitrix` — tabelas: profiles; chamada por 2 arquivo(s) do front
- `test-cart-concurrency` — tabelas: seller_cart_items, seller_carts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `test-cart-limit` — tabelas: seller_carts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `test-cart-rls` — tabelas: seller_carts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `test-contract-orchestrator` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `test-inventory-orchestrator` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `tests` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `trends-insights` — tabelas: product_views, search_analytics; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `validate-access` — tabelas: access_blocked_log, access_security_settings, city_whitelist, ip_whitelist, login_attempts; chamada por 1 arquivo(s) do front
- `verify-2fa-token` — tabelas: admin_audit_log, user_2fa_settings, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `verify-email` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `visual-search` — tabelas: categories, edge_function_invocations, products; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `voice-agent` — tabelas: -; chamada por 1 arquivo(s) do front
- `webhook-dispatcher` (verify_jwt=false) — tabelas: outbound_webhooks, webhook_deliveries; chamada por 0 arquivo(s) do front, por SQL/cron
- `webhook-inbound` (verify_jwt=false) — tabelas: inbound_webhook_endpoints, inbound_webhook_events, integration_credentials; chamada por 1 arquivo(s) do front
- `word-magic` — tabelas: ai_enrichment_queue, products; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `xbz-image-uploader` — tabelas: xbz_image_import_staging; chamada por 0 arquivo(s) do front, por SQL/cron

## Cron jobs (pg_cron / vercel)
- `ai-enqueue-daily` 17 4 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `ai-queue-stuck-cleanup` 34 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `analyze-dictionaries-daily` 0 2 * * * (20260627111905_r8_fix_monitoring_analyze_dictionaries_cron_20260627.sql)
- `analyze-weekly-supplement` 0 3 * * 6 (20260623101524_add_analyze_cron_supplemental_tables.sql)
- `anon-catalog-grant-audit-6h` 0 */6 * * * (20260717144811_schedule_anon_catalog_grant_audit_v1.sql)
- `anon-insert-rate-purge` */10 * * * * (20260905033718_audit_r3_anon_insert_rate_guard.sql)
- `asia-enqueue-new-products` 19,49 * * * * (20260623171843_fix05_redistribuir_cron_30min_20min_jobs.sql)
- `asia-image-uploader` 9,29,49 * * * * (20260623184122_fix_final_guard_remaining_high_freq_jobs.sql)
- `auto-block-extreme-offenders` */15 * * * * (20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql)
- `auto-block-offenders` 1,6,11,16,21,26,31,36,41,46,51,56 * * * * (20260623171736_fix02_redistribuir_cron_5min_sql_jobs.sql)
- `auto-revoke-orphan-mcp-full-keys` */15 * * * * (20260426122751_c0bc82e4-dc78-47da-8da4-74691b181d3d.sql)
- `backfill-image-dimensions` 2,7,12,17,22,27,32,37,42,47,52,57 * * * * → edge backfill-image-dimensions (20260623171825_fix04_redistribuir_cron_10min_jobs.sql)
- `backfill-queue-reap-stuck` */15 * * * * (20261013171417_incidente_2026_10_13_backfill_queue_reaper_idempotente.sql)
- `cf-recon-collect` * * * * * (20260616172002_product_images_cf_reconciliation_cron.sql)
- `cf-recon-dispatch` * * * * * (20260616172002_product_images_cf_reconciliation_cron.sql)
- `check-dead-letters-daily` 0 8 * * * (20260707113531_205c38da-b21e-455b-bf0a-fe762e894e57.sql)
- `cleanup-edge-rate-limits` 37 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `cleanup-expired-auth-sessions` 0 4 * * * (20261101192817_auth001_cleanup_sessions_cron.sql)
- `cleanup-expired-token-revocations` 43 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `cleanup-log-tables-weekly` 7 3 * * 0 (20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql)
- `cleanup-product-webhook-nonces-hourly` 17 * * * * (20260524202319_add_product_webhook_nonces.sql)
- `cleanup-stale-ai-pending-logs` 3,13,23,33,43,53 * * * * → edge backfill-image-dimensions (20260623171825_fix04_redistribuir_cron_10min_jobs.sql)
- `collections-watcher` 23 6 * * * → edge collections-watcher (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `color-health-daily` 19 6 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `connections-auto-test` 9,24,39,54 * * * * → edge connections-auto-test (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `connections-health-check` 3,18,33,48 * * * * → edge connections-health-check (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `cron_job_run_details_purge_weekly` 0 4 * * 0 (20260524204210_colapso_p0_rotacionar_cron_job_run_details_20260524.sql)
- `daily-expire-quotes` 30 3 * * * (20260623000000_fix_audit_novo_orcamento_batch2.sql)
- `dashboard-insights-cache-cleanup` 48 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `dispatcher-failure-alert` 3,13,23,33,43,53 * * * * → edge hash-product-images (20261022100020_fix_cron_dispatcher_failure_alert.sql)
- `expire-product-novelties` 7 3 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `expire-stale-password-reset-requests` 7 6 * * * → edge collections-watcher (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `expire-supplier-promises` 11 4 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `external-db-bridge-keepalive` */4 * * * * → edge external-db-bridge (20260525170000_harden_cron_runtime_secrets_and_acl.sql)
- `fantasmas-deactivate-guard` 4,9,14,19,24,29,34,39,44,49,54,59 * * * * (20260623171736_fix02_redistribuir_cron_5min_sql_jobs.sql)
- `fix_price_verified_drift_daily` 15 3 * * * (20260627191603_fix_price_last_verified_drift_and_harden_trigger_20260627.sql)
- `generate-blurhashes` 1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59 * * * * → edge generate-blurhashes (20260623171946_fix08_redistribuir_2min_http_jobs_odd_even.sql)
- `hardening-regression-check-daily` 0 4 * * * (20260419121414_3259f186-81ef-478e-80da-0d5950fc86fe.sql)
- `hash-product-images` 4,14,24,34,44,54 * * * * → edge hash-product-images (20261022100021_fix_cron_hash_product_images.sql)
- `image-dimensions-backfill` 31 */3 * * * → edge run-script (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `kill_switch_hits_purge_weekly` 0 4 * * 0 (20260524213813_colapso_fase3_kill_switch_telemetry.sql)
- `kit-component-auto-approve` 26,56 * * * * (20260623171843_fix05_redistribuir_cron_30min_20min_jobs.sql)
- `kit-component-auto-promote` 46 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `kit-sync-personalization-notes` 31 6,18 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `medallion-coverage-daily` 37 3 * * * (20260611014254_m18_medallion_coverage_monitoring_2026.sql)
- `medallion-promote-tick` 6,16,26,36,46,56 * * * * (20260623184122_fix_final_guard_remaining_high_freq_jobs.sql)
- `monitor-connections` * * * * * (20260623172206_fix11_monitoring_connection_guard_table.sql)
- `notebook-specs-daily` 7 5 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `ops-grants-self-heal` 0 6 * * 1 (20260703214322_grants_self_healing_weekly.sql)
- `pgrst-schema-reload` */15 * * * * (20260623185850_pgrst_auto_schema_reload_cron.sql)
- `pgss-history-weekly` 41 3 * * 1 (20260917150000_e40_ops_pgss_history.sql)
- `pipeline-health-check-4h` 0 */4 * * * (20260710111227_create_pipeline_health_cron_2026_07.sql)
- `pipeline-print-profiles` 14,29,44,59 * * * * → edge process-queue (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `pre-generate-market-insights` 44 1,7,13,19 * * * (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `process-pending-products` 2,7,12,17,22,27,32,37,42,47,52,57 * * * * (20260623184122_fix_final_guard_remaining_high_freq_jobs.sql)
- `process-queue` 4,14,24,34,44,54 * * * * → edge process-queue (20260623171825_fix04_redistribuir_cron_10min_jobs.sql)
- `purge-audit-logs-daily` 0 3 * * * (20260503134916_03743408-92b5-4ba0-aa2b-5ec84beb7894.sql)
- `purge-expired-restock-dates` 13 6 * * * → edge collections-watcher (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `purge-expired-security` 6,21,36,51 * * * * → edge connections-auto-test (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `purge-kit-quote-requests` 23 3 * * 0 (20261018170100_e070_purge_idempotency_ledgers.sql)
- `purge-kit-save-requests` 17 3 * * 0 (20261018170100_e070_purge_idempotency_ledgers.sql)
- `purge-magazine-duplicate-requests` 31 3 * * 0 (20261018170100_e070_purge_idempotency_ledgers.sql)
- `purge-spr-history-daily` 30 3 * * * (20260604233004_spr_maintenance_and_history_retention.sql)
- `qa-image-coverage-hourly` 51 * * * * (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `qa-imageless-products` 29,59 * * * * (20260623171843_fix05_redistribuir_cron_30min_20min_jobs.sql)
- `quote-followup-reminders` 17 9 * * * → edge quote-followup-reminders (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `reconcile-category-products-count` 3,18,33,48 * * * * (20260623183156_categories_products_count_reconcile_fn_and_cron.sql)
- `reconcile-stock-gold-daily` 10 5 * * * (20260610122504_p0_estoque_01_fn_reconcile_stock_gold.sql)
- `refresh-all-materialized-views` 38 * * * * → edge run-script (20260623171906_fix06_redistribuir_cron_horarios_saindo_00.sql)
- `refresh-analytics-mv-product-intelligence` 30 2 * * * (20260618172743_feat_pgcron_mv_refresh_schedule.sql)
- `refresh-analytics-mv-stock-velocity` 13 23 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `refresh-backfill-queue-expiry` 33 */4 * * * (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `refresh-category-ancestors` 7 1 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `refresh-mv-ema-kpi-by-level` 16 * * * * (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `refresh-mv-product-images-audit` 42 */6 * * * (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `refresh-mv-product-leaf-category` 37 */4 * * * (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `refresh-mv-stock-rupture-alert` 15 * * * * → edge generate-blurhashes (20260623171928_fix07_redistribuir_cron_multi_hora_saindo_00.sql)
- `refresh-mv-supplier-reliability` 8,23,38,53 * * * * (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `resync-product-physical-weekly` 0 3 * * 0 (20260627114025_add_resync_product_physical_cron_20260627.sql)
- `schema-drift-check` 11 2 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `seo-populate-new-products` 13 5 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `seo-recalculate-stale-scores` 30 5 * * * (20260611131150_seo_create_pgcron_jobs.sql)
- `sm-category-collect` 12,27,42,57 * * * * (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `sm-category-enqueue` 11,26,41,56 * * * * (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `sm-session-check` 7 8 * * * → edge quote-followup-reminders (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `sm-site-scrape` 4,14,24,34,44,54 * * * * (20260623184122_fix_final_guard_remaining_high_freq_jobs.sql)
- `sm-site-scrape-auth` 19,39,59 * * * * (20260623172515_fix15_eliminar_colisoes_07_37.sql)
- `sm-stock-guard` 3,8,13,18,23,28,33,38,43,48,53,58 * * * * (20260623171736_fix02_redistribuir_cron_5min_sql_jobs.sql)
- `sm-url-discover-collect` 8,18,28,38,48,58 * * * * (20260623172515_fix15_eliminar_colisoes_07_37.sql)
- `sm-url-discover-search` 5,15,25,35,45,55 * * * * (20260623171825_fix04_redistribuir_cron_10min_jobs.sql)
- `sm-variant-coherence-guard` 2,7,12,17,22,27,32,37,42,47,52,57 * * * * (20260623171736_fix02_redistribuir_cron_5min_sql_jobs.sql)
- `smoke_tests_monthly` 0 3 1 * * (20260525005350_colapso_fase5_smoke_tests_mensal_history_v2.sql)
- `smoke_tests_runs_purge` 0 4 1 * * (20260525005350_colapso_fase5_smoke_tests_mensal_history_v2.sql)
- `snapshot-hardening-daily` 5 4 * * * (20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql)
- `spot-health-check-daily` 11 9 * * * → edge quote-followup-reminders (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `spot-relink-family-images` 22,52 * * * * (20260623171843_fix05_redistribuir_cron_30min_20min_jobs.sql)
- `spot-stock-fast-sync` 10,40 * * * * (20260623172515_fix15_eliminar_colisoes_07_37.sql)
- `spr-requeue-failed-hourly` 25 * * * * (20260610121713_p0_quarentena_01_promote_failures_marcam_bronze.sql)
- `stock_snapshots_weekly_purge` 11 3 * * 0 (20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql)
- `supplier-history-default-partition-alert` 15 4 * * * (20260916193000_e25_supplier_history_partition_automation.sql)
- `supplier-history-partition-maintenance` 0 4 * * * (20260916193000_e25_supplier_history_partition_automation.sql)
- `sync-derived-product-flags` 23 2 * * * (20260623172143_fix10_stagger_daily_jobs_3am_storm_v2.sql)
- `sync-is-stockout-universal` 0,10,20,30,40,50 * * * * (20261022100022_fix_cron_sync_is_stockout_universal.sql)
- `table-size-history-daily` 17 3 * * * (20260916211500_e30_ops_table_size_history.sql)
- `vacuum-analyze-weekly` 0 2 * * 6 (20260605014600_fix_vacuum_analyze_weekly_cron_no_vacuum_in_txn.sql)
- `vacuum-daily-summary-now` * * * * * (20261101193530_perf002_vacuum_fix_separate_jobs.sql)
- `vacuum-product-novelties` 3 3 * * 0 (20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql)
- `vacuum-product-variants-weekly` 8 3 * * 0 (20260623184852_fix_vacuum_product_novelties_cron_20260623.sql)
- `vacuum-products-post-refactor-20260623` * * * * * (20260623131753_products_7_vacuum_analyze_20260623.sql)
- `vacuum-products-weekly` 3 3 * * 0 (20260623184852_fix_vacuum_product_novelties_cron_20260623.sql)
- `vacuum-snapshots-now` * * * * * (20261101193530_perf002_vacuum_fix_separate_jobs.sql)
- `vacuum-stock-snapshots` 0 3 * * 0 (20261101170001_perf003_vacuum_stock_snapshots_cron.sql)
- `video-recover-stuck` 13,28,43,58 * * * * (20260623171803_fix03_redistribuir_cron_15min_jobs.sql)
- `webhook-logs-cleanup-daily` 30 3 * * * (20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql)
- `webhook-retry-failed` */10 * * * * (20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql)
- `wraparound-toast-sequence-monitor` 0 6 * * * (20260917160000_e33_ops_wraparound_monitor.sql)
- `xbz-enrich-gold-extractors` 6,16,26,36,46,56 * * * * (20260623172515_fix15_eliminar_colisoes_07_37.sql)
- `xbz-image-uploader` 3,13,23,33,43,53 * * * * → edge xbz-image-uploader (20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql)
- `xbz-site-scrape` 1,11,21,31,41,51 * * * * (20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql)
- `xbz-stock-sync` 8,23,38,53 * * * * (20260623184122_fix_final_guard_remaining_high_freq_jobs.sql)

## Integrações externas
- SDKs: ElevenLabs, Sentry, Supabase, react-query, zod
- hosts mais citados: doufsxqlfjyuvxuezpln.supabase.co, wa.me, www.promogifts.com.br, fixture.invalid, api.supabase.com, imagedelivery.net, test.supabase.co, ai.gateway.lovable.dev, api.ipify.org, cdn.test, edge-contract.invalid, fonts.googleapis.com, images.unsplash.com, www.spotgifts.com.br, api.resend.com
- webhooks recebidos: ai-recommendations, asia-ingestion, backfill-image-dimensions, check-login, cleanup-notifications, cleanup-novelties, collections-watcher, comparison-price-watcher, connections-auto-test, connections-health-check, crm-callback-alerts, crm-callback-reprocess, crm-db-bridge, e2e-cleanup, external-db-inspect, favorites-watcher, get-visitor-info, image-proxy, log-login-attempt, magazine-import-local, magazine-public-react, magazine-public-view, magazine-reader-state-read, magazine-reader-state-write, mcp-server, ownership-audit, process-queue, process-scheduled-reports, quote-followup-reminders, receive-crm-callback, send-digest, send-notification, send-scheduled-reports, sync-external-db, webhook-dispatcher, webhook-inbound
- env de integração (só nomes): CF_ORIGIN_SECRET, CONNECTIONS_AUTO_TEST_SECRET, CRM_CALLBACK_API_KEY, CSRF_SECRET, E2E_CLEANUP_TOKEN, LOVABLE_API_KEY, PRODUCT_WEBHOOK_ALLOWED_ORIGINS, PRODUCT_WEBHOOK_BATCH_SIZE, PROMO_CHAMPIONS_WEBHOOK_SECRET, TURNSTILE_SECRET_KEY, VITE_GRAVACAO_API_KEY, VITE_SENTRY_DSN, VITE_SENTRY_ENVIRONMENT, WEBHOOK_DISPATCHER_SECRET

## Permissões / papéis
- papéis no código: status (78), alert (53), dev (45), button (40), user (33), group (31), admin (30), listitem (26), agente (25), vendedor (24), supervisor (23), dialog (22), radio (21), radiogroup (18), list (17), system (17), tooltip (17), combobox (13), option (12), authenticated (11), progressbar (10), region (10), anon (9), seller (9), tab (9), tablist (9), assistant (8), img (8), switch (8), main (7), checkbox (6), listbox (6), manager (6), menu (6), navigation (6), document (5), public (5), slider (5), columnheader (4), alertdialog (3), link (3), presentation (3), separator (3), toolbar (3), OFFSET (2), agent (2), cell (2), editor (2), grid (2), gridcell (2), log (2), menuitem (2), publico (2), table (2), Paperclip (1), Textos (1), banner (1), complementary (1), contentinfo (1), heading (1), none (1), note (1), searchbox (1), service_role (1), spinbutton (1), string (1), sup (1), superadmin_bypass (1)
- enums de papel: app_role: admin|manager|vendedor|supervisor|dev|supervisor|dev|agente|coordenador; org_role: owner|admin|member; role_migration_status: pending|running|completed|failed|partial|dry_run; role_migration_item_status: pending|success|failed|skipped|dry_run
- guards: src/components/admin/telemetry/RegressionGuardrailBanner.tsx, src/components/layout/ProtectedRoute.tsx, src/components/system/RootInteractivityGuard.tsx · rotas protegidas: 31 · públicas: /, /__test/alert-dialog, /__test/cnpj-form, /__test/color-swatches, /__test/confirm-dialog, /__test/dialog, /__test/magazine-ring, /__test/tab-skip, /__test/undo-toast, /__visual/calendar, /__visual/date-picker-field, /__visual/negotiation-markup-card, /__visual/preview-button, /__visual/quote-add-product-button, /__visual/quote-freight-block, /__visual/quote-item-editor-sheet, /__visual/quote-items-list-mobile, /__visual/quote-view-order, /*, /admin/aprovacoes-desconto/:id, /admin/audit-suite, /admin/badges-inteligencia, /admin/comissoes, /admin/ema-health, /admin/kit-templates/metricas, /admin/observabilidade, /admin/performance, /admin/performance-comercial, /admin/permissoes, /admin/qa, /admin/qa/sidebar, /admin/rate-limit, /admin/role-permissoes, /admin/roles, /admin/seguranca/exemplos-challenge, /admin/status, /admin/storage-test, /admin/validade-precos, /auth/callback, /busca-preco, /carrinhos, /carrinhos/:cartId, /clientes, /clientes/:id, /colecoes, /colecoes/:id, /comissoes, /comparar, /dashboard, /debug/images, /dropbox, /estoque, /external-db-test, /favoritos, /ferramentas/bi, /ferramentas/bi/comparar, /ferramentas/cobertura, /filtros, /forgot-password-confirmation, /inteligencia-comercial, /kit-builder, /magazine, /magazine/:id, /magazine/:id/print, /magazine/print, /magazine/templates, /magic-up, /match, /meus-kits, /mockup-generator, /mockups/historico, /montar-kit, /novidades, /orcamentos, /orcamentos/:id, /orcamentos/:id/editar, /orcamentos/dashboard, /orcamentos/kanban, /orcamentos/lista, /orcamentos/novo, /privacidade, /produto/:id, /produtos, /promoflix-playground, /raio-x, /reposicao, /reset-password, /revista-publica/:token, /simulacao, /simulador, /simulador-precos, /tendencias, /termos
- feature flags: useEmaRupture, useColorSwatchesV2, ENABLE_NAV_METRICS, FEATURE_GROUPS, FEATURE_ITEMS, FEATURE_X, magic_up, nova-tela, novo-inbox, supplierReliability

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 2 — ex.: /kit-builder, /montar-kit
- componentes_ambiguos: 0
- menu_sem_destino: 18 — ex.: Ação -> #fab, AI Router -> ai-router, Bem-vindo ao Promo Brindes! -> welcome
- edges_orfas: 49 — ex.: anonymize-user, audit-suite, bi-copilot
- edges_chamadas_sem_pasta: 1 — ex.: receive-quote-sync
- tabelas_sem_rls: 36 — ex.: _backup_quotes_orgid_null_20260614, _bkp_asia_raw_pre_fix_referencia, binding_colors
- tabelas_usadas_sem_definicao: 11 — ex.: ai_models, avatars, categories_tree_visual
- tabelas_com_drift_migration_vs_types: 0
- rpcs_sem_definicao: 5 — ex.: fn_get_color_swatches_batch, fn_get_reposicao_variants_summary, fn_rupture_health_check
- componentes_orfaos: 162 — ex.: recovery/RealtimeMessagesExample.tsx, recovery/src-legacy/src/components/admin/CatalogQualityDashboard.tsx, recovery/src-legacy/src/components/admin/telemetry/BridgeAlertsCard.tsx
- componentes_com_nome_duplicado: 105 — ex.: AdvancedPriceSearchPage, Auth, BreadcrumbItem
- scripts_orfaos: 3 — ex.: scripts/generate-theme-report.ts, scripts/test-magazine-sql-contracts.sh, scripts/test-wave1-forward-only-migrations.sh
- env_usadas_nao_declaradas: 24 — ex.: CI, DEV, E2E_USER_EMAIL
- ciclos_de_import: 20
- possiveis_segredos_no_codigo: 7 — ex.: scripts/ai-context/cenarios.mjs:102, src/components/admin/connections/__tests__/ConnectionSecurity.unit.test.tsx:9, src/integrations/supabase/client.ts:27

## Grafo de código (graphify)
- 41917 nós · 71656 arestas · 2407 comunidades · grafo do commit `0f00ba16`
- comunidades maiores: ref_integrations (616), ref_lib (603), ref_components (537), lucide-react (517), @tanstack/react-query (491), ref_hooks (434), ref_types (312), sonner (309), react (308), scripts (289), ref_utils (285), gotoAndSettle (281)
- símbolos mais chamados: gotoAndSettle() (e2e/helpers/nav.ts), re (?), q() (scripts/supabase_snapshot/snapshot.py), useExternalDatabase() (recovery/src-legacy/src/hooks/useExternalDatabase.ts), concludeCheck() (scripts/check-result-contract.mjs), querySupabaseReadOnly() (scripts/supabase-read-only-query.mjs), json (?), loginAs() (e2e/helpers/auth.ts), excluded_sql() (scripts/supabase_snapshot/snapshot.py), maskUrl() (scripts/check-result-contract.mjs), .collect() (scripts/supabase_snapshot/test_snapshot.py), resolveItemImage() (src/pages/magazine/components/templates/shared.ts)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- RELATORIO_CI.md (54)
- PENDENCIAS.md (46)
- supabase/MIGRATIONS_SYNC_LOG.md (20)
- analise-prs/progresso.json (14)
- package.json (14)
- auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md (11)
- .github/workflows/deploy-gates.yml (9)
- analise-branches/RELATORIO_BRANCHES.md (9)
- e2e/flows/magazine-publish-smoke.spec.ts (9)
- package-lock.json (9)
- supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md (9)
- e2e/flows/magazine-preview-sticky-smoke.spec.ts (8)
- CHANGELOG.md (7)
- analise-prs/RELATORIO_PRS.md (7)
- analise-prs/prs.json (7)

## Workflows
- `_e2e-relevance.yml` — Reusable — E2E Runtime Relevance (workflow_call)
- `_secrets-check.yml` — _secrets-check (reusable) (workflow_call)
- `auth-fuzz-weekly.yml` — Auth surface fuzz (weekly) (schedule, workflow_dispatch; cron 12 5 * * 1)
- `branch-protection-sentinel.yml` — Branch Protection Sentinel (push, workflow_dispatch)
- `bundle-size-report.yml` — Bundle size report (pull_request)
- `cache-prune.yml` — Cache Prune (schedule, workflow_dispatch; cron 11 7 * * 1)
- `capacity-growth-report.yml` — capacity-growth-report (schedule, workflow_dispatch; cron 12 11 * * 1)
- `check-no-prod-leak.yml` — No Prod Leak in Dev/Test Config (pull_request, push)
- `check-select-columns.yml` — Select Columns vs Types (pull_request, push)
- `ci-metrics-weekly.yml` — CI Metrics Weekly (E66/E87) (schedule, workflow_dispatch; cron 15 7 * * 1)
- `ci-security-drift.yml` — CI Security & Drift Checks (push, schedule, workflow_dispatch; cron 55 5 * * 1)
- `ci.yml` — CI (pull_request, push, workflow_dispatch)
- `codeql.yml` — CodeQL (pull_request, push, schedule; cron 33 9 * * 1)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 3,13,23,33,43,53 * * * *)
- `contract-tests.yml` — Contract Tests (pull_request, workflow_dispatch)
- `cross-reference-issues.yml` — Cross-reference PR ↔ Issue (issues, pull_request)
- `daily-flows-simulation.yml` — Daily flows simulation (schedule, workflow_dispatch; cron 12 6 * * *)
- `db-apply-migration.yml` — DB — Aplicação controlada de migration única (E15) (workflow_dispatch)
- `db-schema-drift-check.yml` — db-schema-drift-check (pull_request, schedule, workflow_call, workflow_dispatch; cron 29 9 * * *)
- `ddl-out-of-band-detector.yml` — ddl-out-of-band-detector (schedule, workflow_dispatch; cron 8 8 * * 1)
- `delete-orphan-edges.yml` — Delete Orphan Edge Functions (workflow_dispatch)
- `delivery-quality.yml` — Quote Builder Delivery Quality (pull_request, push)
- `deploy-edge-functions.yml` — Deploy Edge Functions (workflow_call, workflow_dispatch)
- `deploy-gates.yml` — Deploy Gates (pull_request, push, workflow_dispatch)
- `deploy-vercel.yml` — Deploy to Vercel (Manual Fallback) (workflow_dispatch)
- `deployment-failure-alert.yml` — Deployment Failure Alert (deployment_status)
- `dr-drill-reminder.yml` — DR Drill Reminder (schedule, workflow_dispatch; cron 0 9 1-7 1,4,7,10 1)
- `drafts-index-check.yml` — drafts-index-check (pull_request, push, workflow_dispatch)
- `e2e-cart.yml` — E2E Cart — Matrix (E79) (pull_request, push, workflow_dispatch)
- `e2e-check-calendar-snapshots.yml` — E2E · Check Calendar snapshots (pull_request)
- `e2e-color-swatch-grid.yml` — E2E • ColorSwatch 2 linhas (Grid) (pull_request, push)
- `e2e-crm-callback-approved.yml` — E2E — CRM Callback (approved → V4 → CRM) (pull_request, push, schedule, workflow_dispatch; cron 20 6 * * *)
- `e2e-customization-collapse.yml` — E2E — Customization Collapse (LocationPanel) (pull_request, push, workflow_dispatch)
- `e2e-dialogs-pr-check.yml` — E2E · Dialogs visual PR check (pull_request, workflow_dispatch)
- `e2e-discount-approval.yml` — E2E Discount Approval (04c*) (pull_request, push, workflow_dispatch)
- `e2e-flows.yml` — E2E — Critical Flows & Error Boundaries (pull_request, push, workflow_dispatch)
- `e2e-focused.yml` — E2E Focused UI — Matrix (E78) (pull_request, schedule, workflow_dispatch; cron 0 2 * * 1)
- `e2e-freight.yml` — E2E Freight — Matrix (E80) (pull_request, push, workflow_dispatch)
- `e2e-magazine-header.yml` — E2E — Magazine Header Layout (pull_request, push, workflow_dispatch)
- `e2e-pdf-dialog.yml` — E2E — PDF Dialog (watermark pixel-diff, authed) (pull_request, push, workflow_dispatch)
- `e2e-personalization.yml` — E2E — Personalization Flow (pull_request, push, workflow_dispatch)
- `e2e-quotes.yml` — E2E Quotes — Matrix (E77) (pull_request, workflow_dispatch)
- `e2e-stock.yml` — E2E Stock — Matrix (E80) (pull_request, push, workflow_dispatch)
- `e2e-swatch-quickview.yml` — E2E • Swatch QuickView (Lista + Tabela) (pull_request, push)
- `e2e-visual-preview-button.yml` — E2E — Visual Regression (Preview button) (pull_request, push, workflow_dispatch)
- `e2e.yml` — E2E (Playwright) (pull_request, push, workflow_dispatch)
- `edge-functions-drift-check.yml` — edge-functions-drift-check (pull_request, schedule, workflow_dispatch, workflow_run; cron 6 9 * * *)
- `edge-integration-all.yml` — Edge Integration Tests — All Functions (pull_request, push, workflow_dispatch)
- `gitleaks-history-audit.yml` — Gitleaks — Full History Audit (push, schedule, workflow_dispatch; cron 44 6 * * *)
- `global-search-gate.yml` — Global Search Quality Gate (pull_request, push)
- `kit-coverage-integration.yml` — Kit Coverage — Integration (schedule, workflow_dispatch; cron 41 3 * * *)
- `labels-sync.yml` — Sync labels (push, workflow_dispatch)
- `lint-untyped-from.yml` — Lint untypedFrom (pull_request, push, workflow_dispatch)
- `log-login-fuzz-weekly.yml` — log-login-attempt — Fuzz Stress Weekly (schedule, workflow_dispatch; cron 17 6 * * 1)
- `lovable-autoheal.yml` — Lovable Autoheal (push, workflow_dispatch)
- `lovable-edit-tracker.yml` — Lovable Edit Tracker (push, workflow_dispatch)
- `lovable-protected-audit.yml` — Lovable Protected-File Audit (E196) (push)
- `magazine-flakiness.yml` — Magazine Flakiness Guard (schedule, workflow_dispatch; cron 18 6 * * 1)
- `magazine-mutation.yml` — Magazine Mutation Testing (pull_request, schedule, workflow_dispatch; cron 27 6 * * 1)
- `magazine-unit-tests.yml` — Magazine Unit Tests (pull_request, push)
- `migration-dry-run.yml` — migration-dry-run (workflow_dispatch)
- `migrations-sync-log-gate.yml` — migrations-sync-log-gate (pull_request)
- `nightly-full.yml` — Nightly Full CI (schedule, workflow_dispatch; cron 43 2 * * *)
- `optimized-image-e2e.yml` — OptimizedImage E2E CI (pull_request, push)
- `pdf-quality.yml` — PDF Quality Gate (pull_request, push, workflow_dispatch)
- `pdf-visual-regression.yml` — PDF Visual Regression (pull_request, workflow_dispatch)
- `pgss-slo-report.yml` — pgss-slo-report (schedule, workflow_dispatch; cron 52 10 * * 1)
- `policies-baseline.yml` — Policies Baseline (pull_request, push, schedule, workflow_dispatch; cron 30 10 * * 1)
- `pr-size-guard.yml` — PR Size Guard (E185) (pull_request)
- `prod-health.yml` — Static Health Checks (push, workflow_dispatch)
- `quote-number-hardening-verify.yml` — Quote Number Hardening — Verify (canonical DB) (push, schedule, workflow_dispatch; cron 15 */6 * * *)
- `ratchet-weekly.yml` — Ratchet Weekly — Baixar baselines (schedule, workflow_dispatch; cron 54 8 * * 1)
- `regenerate-supabase-types.yml` — Regenerate Supabase Types (workflow_dispatch)
- `release-please.yml` — Release Please (push)
- `replenishment-quality.yml` — CI - Replenishment Module Quality Gate (pull_request, push)
- `required-checks-guard.yml` — Required Checks Guard (pull_request, push, schedule, workflow_dispatch; cron 45 8 * * *)
- `restore-seller-cart-rpc.yml` — E2E · restore_seller_cart RPC (multi-env) (push, schedule, workflow_dispatch; cron 49 9 * * *)
- `schema-snapshot-export.yml` — schema-snapshot-export (pull_request, push, schedule, workflow_dispatch; cron 36 6 * * 1)
- `security-definer-acl-multi-env.yml` — SECURITY DEFINER ACL — Multi-Env (push, schedule, workflow_dispatch; cron 9 10 * * *)
- `security.yml` — Security Scan (pull_request, push, schedule; cron 25 6 * * 1)
- `sentinel-self-test.yml` — Sentinel Self-Test (pull_request, workflow_dispatch)
- `ssot-supabase.yml` — SSOT Supabase Guard (pull_request, push)
- `stale.yml` — Mark stale issues and pull requests (schedule; cron 16 11 * * *)
- `stock-rupture-fuzz.yml` — stock-rupture-fuzz (schedule, workflow_dispatch; cron 11 4 * * *)
- `supabase-linter-gate.yml` — Supabase Linter Gate (pull_request, push, schedule, workflow_dispatch; cron 57 6 * * *)
- `supabase-security-gate.yml` — Gate 5 — Supabase Security Audit (pull_request, push)
- `supplier-comparison.yml` — Supplier Comparison CI (pull_request)
- `ts-unused-ratchet.yml` — TS Unused Locals Ratchet (pull_request, push, schedule; cron 47 6 * * 1)
- `ui-visual-a11y.yml` — UI · Visual & A11y (pull_request, push)
- `update-snapshots.yml` — E2E · Atualizar snapshots visuais (E155) (push, workflow_dispatch)
- `uptime-monitor.yml` — Uptime Monitor (schedule, workflow_dispatch; cron */30 * * * *)
- `url-state-unit.yml` — URL State — Unit & Fuzz (pull_request, push, schedule; cron 41 6 * * 1)
- `visual-tests.yml` — Visual Baseline Tests — Nightly (pull_request, push)
- `workflow-lint.yml` — Workflow Lint (pull_request, push)
- `wraparound-monitor-report.yml` — wraparound-monitor-report (schedule, workflow_dispatch; cron 30 5 * * *)

## Scripts npm
- `e2e:generate-fixtures`: `tsx e2e/scripts/generate-fixtures.ts`
- `e2e:watch-fixtures`: `npx chokidar-cli "e2e/fixtures/permissions-matrix.ts" -c "npm run e2e:generate-fixtures"`
- `e2e:install`: `playwright install --with-deps chromium`
- `e2e:confirm-dialog`: `playwright test e2e/ui/confirm-dialog-visual.spec.ts --project=chromium-public`
- `e2e:confirm-dialog:update`: `playwright test e2e/ui/confirm-dialog-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:alert-dialog`: `playwright test e2e/ui/alert-dialog-visual.spec.ts --project=chromium-public`
- `e2e:alert-dialog:update`: `playwright test e2e/ui/alert-dialog-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:dialog`: `playwright test e2e/ui/dialog-visual.spec.ts --project=chromium-public`
- `e2e:dialog:update`: `playwright test e2e/ui/dialog-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:magazine-ring`: `playwright test e2e/ui/magazine-ring-visual.spec.ts --project=chromium-public`
- `e2e:magazine-ring:update`: `playwright test e2e/ui/magazine-ring-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:undo-toast`: `playwright test e2e/ui/undo-toast-visual.spec.ts --project=chromium-public`
- `e2e:undo-toast:update`: `playwright test e2e/ui/undo-toast-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:cnpj`: `playwright test e2e/ui/cnpj-normalize.spec.ts --project=chromium-public`
- `e2e:dialogs`: `playwright test e2e/ui/confirm-dialog-visual.spec.ts e2e/ui/alert-dialog-visual.spec.ts e2e/ui/dialog-visual.spec.ts e2e/ui/undo-toast-visual.spec.ts --project=chromium-public`
- `e2e:dialogs:update`: `playwright test e2e/ui/confirm-dialog-visual.spec.ts e2e/ui/alert-dialog-visual.spec.ts e2e/ui/dialog-visual.spec.ts e2e/ui/undo-toast-visual.spec.ts --project=chromium-public --update-snapshots`
- `e2e:quote-conditions`: `bash scripts/e2e/quote-conditions-local.sh`
- `e2e:quote-conditions:update`: `bash scripts/e2e/quote-conditions-local.sh --update`
- `e2e:quote-freight`: `playwright test e2e/visual/quote-freight-block.spec.ts --project=chromium-public`
- `e2e:quote-freight:update`: `playwright test e2e/visual/quote-freight-block.spec.ts --project=chromium-public --update-snapshots`
- `e2e:quote-freight:local`: `bash scripts/e2e/quote-freight-local.sh`
- `e2e:quote-freight:local:update`: `bash scripts/e2e/quote-freight-local.sh --update`
- `e2e:calendar`: `bash scripts/e2e/calendar-local.sh`
- `e2e:calendar:update`: `bash scripts/e2e/calendar-local.sh --update`
- `e2e:calendar:conditions`: `playwright test e2e/ui/calendar-visual.spec.ts --project=chromium-public --grep "Condições"`
- `e2e:calendar:conditions:update`: `playwright test e2e/ui/calendar-visual.spec.ts --project=chromium-public --grep "Condições" --update-snapshots`
- `e2e:collapse`: `playwright test e2e/flows/04d-customization-collapse.spec.ts e2e/customization/collapse-reflow.spec.ts --project=chromium-authed`
- `e2e:collapse:update`: `playwright test e2e/customization/collapse-reflow.spec.ts --project=chromium-authed --update-snapshots`
- `e2e:collapse:update:mobile`: `playwright test e2e/customization/collapse-reflow.spec.ts --project=chromium-authed --grep "\\[mobile\\]" --update-snapshots`
- `e2e:collapse:update:tablet`: `playwright test e2e/customization/collapse-reflow.spec.ts --project=chromium-authed --grep "\\[tablet\\]" --update-snapshots`
- `e2e:collapse:update:desktop`: `playwright test e2e/customization/collapse-reflow.spec.ts --project=chromium-authed --grep "\\[desktop\\]" --update-snapshots`
- `e2e:collapse:update:all`: `playwright test e2e/customization/collapse-reflow.spec.ts --project=chromium-authed --update-snapshots --reporter=list`
- `e2e:collapse:seed`: `npx playwright test --project=setup && npm run e2e:collapse:update:all`
- `e2e:collapse:calibrate`: `node scripts/qa/calibrate-collapse-thresholds.mjs`
- `e2e:collapse:calibrate:dry-run`: `node scripts/qa/calibrate-collapse-thresholds.mjs --dry-run`
- `e2e:collapse:check-baselines`: `node scripts/qa/check-collapse-baselines.mjs`
- `e2e:visual-diff-report`: `node scripts/build-visual-diff-report.mjs --results test-results --out visual-diff-report/index.html --title 'Visual diffs'`
- `e2e:bootstrap`: `npm ci && npm run e2e:install`
- `dev`: `npm run e2e:generate-fixtures && vite`
- `build`: `node scripts/guard-canonical-project.mjs && node scripts/validate-supabase-config.mjs && node scripts/check-pptx-image-parser-exposure.mjs && vite build && node scripts/check-chunk-cycles.mjs && node scripts/check-production-harnesses.mjs`
- `build:dev`: `vite build --mode development`
- `preview`: `vite preview`
- `check:no-prod-leak`: `node scripts/check-no-prod-leak.mjs`
- `check:select-columns`: `node scripts/check-select-columns.mjs`
- `check:bundle-size`: `node scripts/check-bundle-size.mjs`
- `check:chunk-cycles`: `node scripts/check-chunk-cycles.mjs`
- `check:production-harnesses`: `node scripts/check-production-harnesses.mjs`
- `check:dependency-audit`: `node scripts/check-dependency-audit.mjs`
- `check:pptx-image-parser-exposure`: `node scripts/check-pptx-image-parser-exposure.mjs`
- `check:bundle-size:update`: `node scripts/check-bundle-size.mjs --update-baseline`
- `check:bundle-size:ratchet`: `node scripts/check-bundle-size.mjs --check-ratchet`
- `check:doc-refs`: `node scripts/check-doc-refs.mjs docs/PERF_OPTIMIZATIONS.md`
- `check:schema-reference-drift`: `node scripts/check-schema-reference-drift.mjs`
- `check:types-inventory`: `node scripts/extract-types-inventory.mjs`
- `check:types-inventory-drift`: `node scripts/check-types-inventory-drift.mjs`
- `graphify:enrich-types`: `node scripts/graphify/enrich-typescript-references.mjs`
- `graphify:postprocess-report`: `node scripts/graphify/postprocess-report.mjs`
- `graphify:sql`: `python3 scripts/graphify/build-sql-graph.py`
- `graphify:refresh`: `uv tool run --from graphifyy==0.9.91 graphify update . --force && npm run graphify:enrich-types && uv tool run --from graphifyy==0.9.91 graphify cluster-only . --graph graphify-out/graph.json --no-viz && npm run graphify:postprocess-report`
- `check:todo-baseline`: `node scripts/check-todo-baseline.mjs`
- `check:todo-baseline:update`: `node scripts/check-todo-baseline.mjs --update`
- `check:as-assertions-baseline`: `node scripts/check-as-assertions-baseline.mjs`
- `check:as-assertions-baseline:update`: `node scripts/check-as-assertions-baseline.mjs --update`
- `check:as-unknown-baseline`: `node scripts/check-as-unknown-baseline.mjs`
- `check:as-unknown-baseline:update`: `node scripts/check-as-unknown-baseline.mjs --update`
- `check:eslint-disable-baseline`: `node scripts/check-eslint-disable-baseline.mjs`
- `check:eslint-disable-baseline:update`: `node scripts/check-eslint-disable-baseline.mjs --update`
- `check:file-size-baseline`: `node scripts/check-file-size-baseline.mjs`
- `check:file-size-baseline:update`: `node scripts/check-file-size-baseline.mjs --update`
- `check:timer-cleanup`: `node scripts/check-timer-cleanup.mjs`
- `check:indexed-access-ratchet`: `node scripts/check-indexed-access-ratchet.mjs`
- `check:indexed-access-ratchet:update`: `node scripts/check-indexed-access-ratchet.mjs --update`
- `check:contract-coverage`: `node scripts/check-contract-coverage.mjs`
- `check:soft-delete-policy`: `node scripts/check-soft-delete-policy.mjs`
- `check:soft-delete-policy:update`: `node scripts/check-soft-delete-policy.mjs --update`
- `check:policies-baseline`: `node scripts/check-policies-baseline.mjs`
- `check:policies-baseline:update`: `node scripts/check-policies-baseline.mjs --update-baseline`
- `check:rls-no-policy`: `node scripts/check-rls-no-policy-drift.mjs --gate`
- `check:rls-no-policy:update`: `node scripts/check-rls-no-policy-drift.mjs --update-allowlist`
- `check:anon-rate-guard`: `node scripts/check-anon-insert-rate-guard.mjs --gate`
- `check:migration-receipts`: `node scripts/check-migration-receipts.mjs --gate`
- `check:edge-zod-ratchet`: `node scripts/check-edge-zod-ratchet.mjs`
- `check:edge-zod-ratchet:update`: `node scripts/check-edge-zod-ratchet.mjs --update-baseline`
- `test`: `TZ=America/Sao_Paulo vitest run`
- `test:quote-rpc:postgres`: `node scripts/simulate-quote-rpc-proposals.mjs`
- `check:quote-rpc:canonical`: `node scripts/check-quote-rpc-canonical-readiness.mjs`
- `test:quality`: `TZ=America/Sao_Paulo vitest run --exclude 'tests/hooks/**'`
- `test:ci-core`: `TZ=America/Sao_Paulo STRICT_TEST_SIDE_EFFECTS=1 vitest run tests/contracts/migrated-endpoints.contract.test.ts src/lib/theme-presets.test.ts tests/components/products/ProductSparkline.labels.test.tsx src/pages/filters/__tests__/FiltersPage.sorting.test.tsx src/components/products/__tests__/ProductSortAccessibility.test.tsx tests/unit/supabase-schema-contract.test.ts tests/unit/favorites-migration.test.ts tests/unit/trending-score.test.ts tests/unit/variant-matching.test.ts tests/unit/text-utils.test.ts tests/unit/print-area-grouping.test.ts tests/unit/format.test.ts tests/unit/to-error-message.test.ts tests/unit/catalog-stock-status.test.ts tests/unit/masked-suffix.test.ts tests/unit/forecast.test.ts tests/unit/stock-chart-utils.test.ts tests/unit/novelty-dates.test.ts tests/unit/sensitive-masking.test.ts tests/unit/error-kind-inference.test.ts tests/unit/connection-error-copy.test.ts tests/unit/roles.test.ts tests/unit/supplier-colors.test.ts tests/unit/date-utils.test.ts tests/unit/format-utils.test.ts tests/unit/quote-status-config.test.ts tests/config/vitest-config-smoke.test.ts tests/config/e2e-http-status.test.ts tests/scripts/check-supabase-reference-catalog.test.mjs tests/scripts/check-migration-filename-contract.test.mjs tests/scripts/check-schema-reference-drift.test.mjs tests/scripts/check-result-contract.test.mjs tests/scripts/check-production-harnesses.test.mjs tests/scripts/check-dependency-audit.test.mjs tests/scripts/check-types-inventory-drift.test.mjs tests/scripts/check-pptx-image-parser-exposure.test.mjs tests/scripts/contexto-produtores.test.mjs tests/scripts/rpc-live-evidence-contract.test.mjs tests/scripts/strict-test-side-effects-contract.test.mjs tests/security/lint-0011-drift.test.ts tests/security/lint-0029-drift.test.ts tests/security/secdef-anon-drift.test.ts tests/security/security-definer-acl-gate.test.ts`
- `test:ci-core:coverage`: `TZ=America/Sao_Paulo vitest run tests/contracts/migrated-endpoints.contract.test.ts src/lib/theme-presets.test.ts tests/components/products/ProductSparkline.labels.test.tsx --coverage --coverage.include=src/lib/theme-presets.ts --coverage.include=src/components/products/ProductSparkline.tsx --coverage.reporter=text --coverage.reporter=json --coverage.reporter=json-summary --coverage.thresholds.lines=50 --coverage.thresholds.functions=50 --coverage.thresholds.branches=30 --coverage.thresholds.statements=50`
- `test:deploy-gate`: `TZ=America/Sao_Paulo vitest run tests/contracts/migrated-endpoints.contract.test.ts src/lib/theme-presets.test.ts tests/components/products/ProductSparkline.labels.test.tsx --reporter=dot`
- `test:watch`: `TZ=America/Sao_Paulo vitest`
- `test:run`: `TZ=America/Sao_Paulo vitest run`
- `test:coverage`: `TZ=America/Sao_Paulo vitest run --coverage`
- `coverage`: `TZ=America/Sao_Paulo vitest run --coverage`
- `test:price-freshness`: `TZ=America/Sao_Paulo bash -c 'set -euo pipefail; files=( tests/utils/price-freshness*.test.ts tests/components/PriceFreshnessBadge*.test.tsx ); vitest run "${files[@]}" --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.reporter=html --coverage.include=src/utils/price-freshness.ts --coverage.include=src/components/products/PriceFreshnessBadge.tsx --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 --coverage.thresholds.functions=0 --coverage.thresholds.lines=0 && node scripts/check-price-freshness-coverage.mjs'`
- `test:kit-coverage:integration`: `RUN_INTEGRATION_TESTS=1 TZ=America/Sao_Paulo vitest run src/lib/external-db/kit-coverage.integration.test.ts`
- `test:cloud-status`: `TZ=America/Sao_Paulo vitest run tests/components/CloudStatusBanner.test.tsx tests/hooks/useDevGate.test.ts`
- `test:cloud-status-coverage`: `TZ=America/Sao_Paulo vitest run tests/components/CloudStatusBanner.test.tsx tests/hooks/useDevGate.test.ts tests/hooks/useDevGate.ssr-contract.test.tsx --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.include=src/components/system/CloudStatusBanner.tsx --coverage.include=src/hooks/admin/useDevGate.ts && node scripts/check-cloud-status-coverage.mjs`
- `test:magazine`: `TZ=America/Sao_Paulo vitest run tests/magazine/ tests/utils/tailwindRings.interaction.test.tsx src/pages/magazine/ src/services/__tests__/magazine*.test.ts src/lib/external-db/__tests__/productsCompleteness.test.ts tests/integration/magazine-service-fuzz.test.ts`
- `test:magazine:coverage`: `TZ=America/Sao_Paulo vitest run tests/magazine/ tests/utils/tailwindRings.interaction.test.tsx src/pages/magazine/ src/services/__tests__/magazine*.test.ts src/lib/external-db/__tests__/productsCompleteness.test.ts tests/integration/magazine-service-fuzz.test.ts --coverage --coverage.include='src/pages/magazine/**/*.{ts,tsx}' --coverage.include='src/services/magazineService.ts' --coverage.reporter=text --coverage.reporter=json-summary --coverage.reportsDirectory=coverage/magazine --coverage.thresholds.lines=58 --coverage.thresholds.functions=51 --coverage.thresholds.branches=48 --coverage.thresholds.statements=56 && node scripts/test-magazine-coverage.mjs`
- `test:magazine:sql`: `bash scripts/test-magazine-hardening-v2.sh`
- `test:magazine:flakiness`: `node scripts/magazine-flakiness-report.mjs --runs=10 --pattern=tests/magazine/,tests/utils/tailwindRings.interaction.test.tsx,src/pages/magazine/,src/services/__tests__/magazine,tests/integration/magazine-service-fuzz.test.ts`
- `test:magazine:flakiness:strict`: `node scripts/magazine-flakiness-report.mjs --runs=10 --strict --pattern=tests/magazine/,tests/utils/tailwindRings.interaction.test.tsx,src/pages/magazine/,src/services/__tests__/magazine,tests/integration/magazine-service-fuzz.test.ts`
- `test:magazine:mutation`: `node scripts/mutation-test-magazine.mjs`
- `lint`: `npm run lint:baseline`
- `lint:check`: `npm run lint:config && eslint src --max-warnings=0`
- `lint:baseline`: `npm run lint:config && node scripts/check-eslint-baseline.mjs`
- `lint:baseline:incremental`: `npm run lint:config && node scripts/check-eslint-baseline.mjs --incremental`
- `lint:baseline:scope`: `node scripts/eslint-baseline-scope-add.mjs`
- `lint:baseline:update`: `node scripts/eslint-baseline-generate.mjs`
- `ssot:validate`: `node scripts/validate-supabase-config.mjs`
- `ssot:guard`: `node scripts/guard-canonical-project.mjs`
- `ssot:hosts`: `node scripts/check-docs-supabase-hosts.mjs`
- `ssot:all`: `npm run ssot:validate && npm run ssot:guard && npm run ssot:hosts`
- `ssot:report`: `node scripts/ssot-report.mjs`
- `ssot:report:json`: `node scripts/ssot-report.mjs --json`
- `ssot:report:validate`: `node scripts/validate-ssot-report.mjs`
- `ssot:report:bump`: `node scripts/ssot-report-bump.mjs`
- `ssot:report:markdown`: `node scripts/ssot-report-markdown.mjs`
- `ssot:schema:publish`: `node scripts/publish-ssot-schema.mjs`
- `ssot:schema:check`: `node scripts/publish-ssot-schema.mjs --check`
- `typecheck`: `npm run typecheck:full`
- `qa:lint`: `npm run lint:config && eslint src --max-warnings=0`
- `qa:typecheck`: `tsc -p tsconfig.app.json --noEmit`
- `qa:full`: `npm run check:runtime && npm run check:package-duplicate-scripts && npm run check:supabase-reference-catalog && npm run check:migration-filename-contract && npm run lint:baseline && npm run qa:typecheck && npm run qa:lint`
- `qa:round`: `node scripts/round-quality-report.mjs`
- `qa:round:fast`: `node scripts/round-quality-report.mjs --no-eslint`
- `format`: `prettier --write "src/**/*.{ts,tsx,css}"`
- `format:check`: `prettier --check "src/**/*.{ts,tsx,css}"`
- `prepare`: `husky`
- `test:e2e`: `npx playwright test --grep-invert @smoke && npx playwright test e2e/product-card-click.spec.ts --project=chromium-public --project=mobile-chrome`
- `test:e2e:auth-baseline`: `npx playwright test e2e/flows/99-auth-ui-baseline.spec.ts`
- `visual:preview`: `bash scripts/visual-preview-local.sh`
- `visual:preview:update`: `bash scripts/visual-preview-local.sh --update`
- `visual:preview:all`: `bash scripts/visual-preview-local.sh --update && bash scripts/visual-preview-local.sh`
- `check:visual-preview-suite`: `node scripts/check-visual-preview-suite.mjs`
- `test:e2e:auth-baseline:update`: `npx playwright test e2e/flows/99-auth-ui-baseline.spec.ts --update-snapshots`
- `test:e2e:ui`: `npx playwright test --grep-invert @smoke --ui`
- `test:e2e:headed`: `npx playwright test --grep-invert @smoke --headed`
- `test:e2e:debug`: `npx playwright test --grep-invert @smoke --debug`
- `test:e2e:report`: `npx playwright show-report`
- `test:e2e:install`: `npx playwright install --with-deps chromium`
- `test:theme-validation`: `npx playwright test e2e/theme-validation.spec.ts && node scripts/generate-theme-report.mjs`
- `test:e2e:tooltips`: `npx playwright test e2e/tooltips-a11y.spec.ts`
- `check:removed-phrases`: `node scripts/check-removed-phrases.mjs`
- `check:no-salvar-alteracoes-draft`: `node scripts/check-no-salvar-alteracoes-draft.mjs`
- `recalibrate:watermark`: `node scripts/recalibrate-watermark-thresholds.mjs`
- `check:seller-scope`: `node scripts/check-seller-scope.mjs`
- `check:route-error-element`: `node scripts/check-route-error-element.mjs`
- `check:aschild-nesting`: `node scripts/check-aschild-nesting.mjs`
- `check:route-ref-usage`: `node scripts/check-route-ref-usage.mjs`
- `test:strict-ref`: `TZ=America/Sao_Paulo STRICT_REF_WARNINGS=1 vitest run && node scripts/consolidate-console-snapshot.mjs`
- `smoke`: `node scripts/smoke-tests.mjs && npm run test:ci-core`
- `test:e2e:smoke`: `node scripts/run-smoke-filtered.mjs`
- `test:e2e:smoke:headed`: `npx playwright test --project=chromium-smoke --workers=1 --headed`
- `test:e2e:smoke:ui`: `npx playwright test --project=chromium-smoke --workers=1 --ui`
- `test:e2e:smoke:debug`: `npx playwright test --project=chromium-smoke --workers=1 --debug`
- `test:e2e:smoke:report`: `npm run test:e2e:smoke; node scripts/e2e-smoke-summary.mjs; node scripts/e2e-feature-summary.mjs`
- `test:e2e:regression`: `npx playwright test --project=chromium-public --project=chromium-authed`
- `test:e2e:regression:headed`: `npx playwright test --project=chromium-public --project=chromium-authed --headed`
- `test:e2e:regression:ui`: `npx playwright test --project=chromium-public --project=chromium-authed --ui`
- `test:e2e:regression:report`: `npm run test:e2e:regression; node scripts/e2e-feature-summary.mjs`
- `test:e2e:mobile`: `npx playwright test --project=mobile-chrome`
- `test:e2e:header-sticky`: `npx playwright test e2e/flows/22-header-sticky.spec.ts --project=chromium-authed --max-failures=1 --reporter=github,list`
- `test:e2e:all`: `npm run test:e2e:smoke && npm run test:e2e:regression`
- `e2e:summary`: `node scripts/e2e-feature-summary.mjs`
- `e2e:smoke-summary`: `node scripts/e2e-smoke-summary.mjs`
- `e2e:smoke-tags-check`: `node scripts/check-smoke-tags.mjs`
- `e2e:smoke-coverage-doc`: `node scripts/e2e-smoke-coverage-doc.mjs`
- `e2e:smoke-coverage-check`: `node scripts/e2e-smoke-coverage-doc.mjs --check`
- `check:security-definer-acl`: `node scripts/check-security-definer-acl.mjs --baseline .security-definer-acl-baseline.json`
- `draft:dry-run`: `node scripts/dry-run-migration-draft.mjs`
- `test:security-definer-acl`: `TZ=America/Sao_Paulo vitest run tests/security/security-definer-acl.test.ts`
- `test:restore-seller-cart-rpc`: `TZ=America/Sao_Paulo vitest run tests/security/restore-seller-cart-rpc.test.ts`
- `check:restore-seller-cart-rpc`: `node scripts/check-restore-seller-cart-rpc.mjs`
- `check:client-structured-logging`: `node scripts/check-client-structured-logging.mjs`
- `check:edge-cors`: `node scripts/check-edge-cors-headers.mjs`
- `check:fab-a11y`: `node scripts/check-fab-accessibility.mjs`
- `check:outline-none`: `node scripts/check-outline-none.mjs`
- `check:outline-none:update-baseline`: `UPDATE_BASELINE=1 node scripts/check-outline-none.mjs`
- `audit:db-frontend`: `node scripts/audit-db-frontend-coverage.mjs`
- `audit:credentials`: `node scripts/audit-credentials.mjs --baseline .audit-credentials-baseline.json`
- `audit:credentials:all`: `node scripts/audit-credentials.mjs`
- `audit:credentials:update-baseline`: `node scripts/audit-credentials.mjs --update-baseline .audit-credentials-baseline.json`
- `check:no-inline-cors`: `node scripts/check-no-inline-cors.mjs`
- `check:ai-key-contract`: `node scripts/simulate-ai-key-scenarios.mjs`
- `check:iframe-sandbox`: `node scripts/check-iframe-sandbox.mjs`
- `check:lint-0029`: `node scripts/check-lint-0029-drift.mjs`
- `check:lint-0011`: `node scripts/check-lint-0011-drift.mjs`
- `check:headers-mirror`: `node scripts/check-headers-mirror.mjs`
- `check:secdef-anon`: `node scripts/check-secdef-anon-drift.mjs`
- `check:ddl-out-of-band`: `node scripts/check-ddl-out-of-band.mjs`
- `check:ledger-manifest-drift`: `node scripts/check-ledger-manifest-drift.mjs`
- `ledger:verify-statements`: `node scripts/check-ledger-statements-gate.mjs`
- `check:allowlist-memory`: `node scripts/check-allowlist-memory-crosscheck.mjs`
- `check:clickable`: `node scripts/check-clickable-drift.mjs`
- `check:no-followup-frontend`: `node scripts/check-no-followup-frontend.mjs`
- `check:summary-color-tokens`: `node scripts/check-summary-color-tokens.mjs`
- `check:no-template-thumbnail`: `node scripts/check-no-template-thumbnail.mjs`
- `build:cors-snapshot`: `node scripts/build-cors-snapshot.mjs`
- `test:e2e:critical`: `npx playwright test --project=chromium-public e2e/catalog.spec.ts e2e/kit-builder.spec.ts e2e/login.spec.ts e2e/mockup-generate.spec.ts`
- `test:edge:integration`: `npx supabase test db --file supabase/functions/tests/edge_integration.test.ts`
- `test:edge:integration:all`: `TZ=America/Sao_Paulo vitest run tests/edge-functions/integration/ --reporter=verbose`
- `test:edge:live`: `TZ=America/Sao_Paulo vitest run tests/edge-functions/live/ --reporter=verbose`
- `test:edge:live:coverage`: `TZ=America/Sao_Paulo vitest run tests/edge-functions/live/ --reporter=verbose --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 --coverage.thresholds.branches=0 --coverage.thresholds.statements=0`
- `check:edge-live-coverage`: `node scripts/check-edge-live-coverage.mjs`
- `check:log-login-contract`: `node scripts/check-log-login-attempt-contract.mjs`
- `check:secrets-inventory`: `node scripts/check-secrets-inventory.mjs --gate`
- `test:edge:integration:coverage`: `TZ=America/Sao_Paulo vitest run tests/edge-functions/integration/ --reporter=verbose --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 --coverage.thresholds.branches=0 --coverage.thresholds.statements=0`
- `test:fuzz`: `node scripts/fuzz-testing.mjs`
- `test:fuzz:uploads`: `node scripts/fuzz-edge-uploads.mjs`
- `test:fuzz:all`: `node scripts/fuzz-testing.mjs && node scripts/fuzz-edge-uploads.mjs`
- `test:e2e:flows`: `npx playwright test e2e/flows/25-quote-full-flow.spec.ts e2e/flows/26-catalog-to-kit-flow.spec.ts e2e/flows/27-admin-critical-routes.spec.ts e2e/flows/28-error-boundaries.spec.ts e2e/flows/30-quote-wizard-validations.spec.ts`
- `test:e2e:mobile:flows`: `npx playwright test e2e/flows/29-mobile-critical-routes.spec.ts --project=mobile-chrome`
- `test:e2e:error-boundaries`: `npx playwright test e2e/flows/28-error-boundaries.spec.ts`
- `check:critical-coverage`: `node scripts/test-critical-coverage.mjs`
- `check:runtime`: `node scripts/check-runtime-contract.mjs`
- `typecheck:full`: `tsc -p tsconfig.app.json --noEmit`
- `typecheck:tests`: `node scripts/check-tsc-tests-baseline.mjs`
- `typecheck:tests:baseline:update`: `node scripts/check-tsc-tests-baseline.mjs --update`
- `check:product-type-duplicates`: `node scripts/check-product-type-duplicates.mjs`
- `check:product-type-duplicates:update`: `node scripts/check-product-type-duplicates.mjs --update`
- `ci:verify`: `node scripts/verify-build-integrity.mjs`
- `ci:build`: `npm run ci:verify && node scripts/check-build-warnings.mjs`
- `ci:build:warnings`: `node scripts/check-build-log.mjs`
- `typecheck:baseline:update`: `node scripts/tsc-baseline-generate.mjs`
- `check:observability`: `node scripts/observability-check.mjs`
- `check:toast-leaks`: `node scripts/check-toast-leaks.mjs`
- `check:package-duplicate-scripts`: `node scripts/check-package-duplicate-scripts.mjs`
- `test:stress`: `node scripts/massive-load-test.mjs`
- `test:fuzz:full`: `node scripts/fuzz-testing.mjs`
- `test:contract`: `node scripts/contract-testing.mjs`
- `check:proposed-configs`: `node scripts/check-eslint-config-current.mjs --strict`
- `coverage:report`: `node scripts/generate-coverage-report.mjs`
- `coverage:report:check`: `node scripts/generate-coverage-report.mjs --check`
- `test:fuzz:dry`: `node scripts/fuzz-testing.mjs`
- `types:generate:supabase`: `supabase gen types typescript --project-id doufsxqlfjyuvxuezpln --schema public,graphql_public > src/integrations/supabase/types.ts.new && mv src/integrations/supabase/types.ts.new src/integrations/supabase/types.ts`
- `coverage:ci:collect`: `node scripts/collect-coverage-ci.mjs`
- `coverage:ci:report`: `node scripts/collect-coverage-ci.mjs --skip-run`
- `test:supplier-comparison`: `TZ=America/Sao_Paulo vitest run src/hooks/products/useSupplierComparison.ts tests/hooks/useSupplierComparison.property.test.ts tests/hooks/useSupplierComparison.test.ts --coverage --coverage.include=src/hooks/products/useSupplierComparison.ts --coverage.thresholds.lines=90 --coverage.thresholds.functions=90 --coverage.thresholds.branches=85 --coverage.thresholds.statements=90`
- `test:freight`: `TZ=America/Sao_Paulo vitest run tests/unit/freight-quest/ tests/integration/freight-quest/ tests/fuzz/freight-quest-fuzzer.test.ts tests/edge-functions/integration/freight-quest-webhook-simulation.test.ts --reporter=verbose`
- `test:freight:unit`: `TZ=America/Sao_Paulo vitest run tests/unit/freight-quest/ --reporter=verbose`
- `test:freight:integration`: `TZ=America/Sao_Paulo vitest run tests/integration/freight-quest/ tests/edge-functions/integration/freight-quest-webhook-simulation.test.ts --reporter=verbose`
- `test:freight:fuzz`: `TZ=America/Sao_Paulo vitest run tests/fuzz/freight-quest-fuzzer.test.ts --reporter=verbose`
- `test:freight:coverage`: `TZ=America/Sao_Paulo vitest run tests/unit/freight-quest/ tests/integration/freight-quest/ --coverage --coverage.include=src/components/kit-builder/FreightEstimator.tsx --coverage.include=src/components/quotes/ --coverage.reporter=text --coverage.reporter=json-summary`
- `test:freight:load`: `node scripts/freight-quest-load-test.mjs`
- `test:e2e:freight`: `npx playwright test e2e/flows/freight-quest-complete-flow.spec.ts --project=chromium-public`
- `test:replenishment:full`: `npm run test:replenishment:unit && npm run test:replenishment:e2e && npm run test:replenishment:dashboard`
- `test:replenishment:unit`: `TZ=America/Sao_Paulo vitest run tests/replenishment/`
- `test:replenishment:e2e`: `npx playwright test e2e/replenishment/`
- `test:replenishment:dashboard`: `node scripts/replenishment-ci/metrics-dashboard.mjs`
- `test:auth:stability`: `npx playwright test e2e/auth-stability.spec.ts`
- `build:verify`: `npm run typecheck && npm run lint:baseline && npm run build`
- `test:e2e:novelties:snapshots`: `playwright test e2e/catalog/novelties-visual-snapshot.spec.ts --project=chromium --update-snapshots`
- `test:e2e:card-parity`: `npx playwright test e2e/catalog/novidades-reposicao-card-parity.spec.ts --project=chromium-authed`
- `test:e2e:carrinhos`: `npx playwright test e2e/carrinhos --project=chromium-authed`
- `test:e2e:carrinhos:update`: `npx playwright test e2e/carrinhos --project=chromium-authed --update-snapshots`
- `test:e2e:quotes-undo`: `node scripts/run-e2e-quotes-undo.mjs`
- `test:e2e:quotes-undo:mock`: `node scripts/run-e2e-quotes-undo.mjs --mock`
- `test:e2e:quotes-undo:headed`: `node scripts/run-e2e-quotes-undo.mjs --headed`
- `test:e2e:quotes-undo:ui`: `node scripts/run-e2e-quotes-undo.mjs --ui`
- `e2e:mock-auth-setup`: `node scripts/e2e-mock-auth-setup.mjs`
- `schema:snapshot`: `node scripts/export-schema-snapshot.mjs`
- `drafts:list`: `node scripts/list-migration-drafts.mjs`
- `drafts:check`: `node scripts/list-migration-drafts.mjs --check`
- `check:migration-refs`: `node scripts/check-migration-path-references.mjs`
- `check:migration-filename-contract`: `node scripts/check-migration-filename-contract.mjs`
- `check:supabase-reference-catalog`: `node scripts/check-supabase-reference-catalog.mjs`
- `drafts:status`: `node scripts/map-drafts-to-migrations.mjs`
- `drafts:status:check`: `node scripts/map-drafts-to-migrations.mjs --check`
- `draft:promote`: `node scripts/promote-draft-migration.mjs`
- `drafts:target:check`: `node scripts/check-draft-canonical-target.mjs`
- `drafts:pr-comment`: `node scripts/build-drafts-pr-comment.mjs`
- `check:cnpj-render`: `node scripts/check-cnpj-render.mjs`
- `test:cnpj`: `TZ=America/Sao_Paulo vitest run src/utils/masks.test.ts src/utils/cnpj-schema.test.ts "src/utils/__tests__/cnpj-" src/components/__tests__/cnpj-render.test.tsx`
- `test:cart-header`: `TZ=America/Sao_Paulo vitest run src/pages/products/__tests__/CartShippingDeadlineLayout.test.ts src/pages/products/__tests__/CartHeaderExhaustiveFuzz.test.ts src/pages/products/__tests__/CartHeaderEdgeCases.test.ts`
- `test:cart-header:report`: `node scripts/qa/cart-header-fuzz-report.mjs`
- `e2e:cart-header`: `playwright test e2e/visual/cart-header-actions.spec.ts --project=chromium-authed`
- `e2e:cart-header:update`: `playwright test e2e/visual/cart-header-actions.spec.ts --project=chromium-authed --update-snapshots`
- `lint:config`: `node scripts/check-eslint-config-parses.mjs`
- `lint:lockfile`: `node scripts/check-lockfile-sync.mjs`
- `simulate:bi-degradation`: `node scripts/simulate-bi-partial-degradation.mjs`
- `check:public-views-drift`: `node scripts/check-public-views-drift.mjs`
- `check:migrations-sync-log-gate`: `node scripts/check-migrations-sync-log-gate.mjs`
- `plan:status`: `node scripts/plan-status.mjs`
- `e2e:install:all-browsers`: `playwright install --with-deps chromium firefox webkit`
- `e2e:editor-sheet`: `playwright test e2e/quotes/quote-item-editor-sheet-header.spec.ts --project=chromium-public --project=firefox-public --project=webkit-public`
- `e2e:editor-sheet:update`: `playwright test e2e/quotes/quote-item-editor-sheet-header.spec.ts --project=chromium-public --project=firefox-public --project=webkit-public --update-snapshots`

## Documentos (raiz e docs/)
- `.github/BRANCH_PROTECTION_QUOTE_SUMMARY.md` — Branch Protection — Quote Summary (sticky header + action buttons) (49 linhas)
- `.github/BRANCH_PROTECTION_SETUP.md` — Como ligar Branch Protection em `main` (5 minutos) (138 linhas)
- `.github/PULL_REQUEST_TEMPLATE.md` (112 linhas)
- `.github/SENTINEL_CHANGELOG.md` — Sentinel Changelog (188 linhas)
- `AGENTS.md` — AGENTS.md — Promo Gifts V4 (111 linhas)
- `CHANGELOG.md` — Changelog (1530 linhas)
- `CI_PROVA_P33.md` — CI_PROVA_P33.md — Prova Final de Conclusão CI (Sessão P33, 2026-10-30) (97 linhas)
- `CLAUDE.md` (2 linhas)
- `CONTRIBUTING.md` — Guia de Contribuição (299 linhas)
- `PENDENCIAS.md` — PENDENCIAS.md — Workflows com falha não corrigível nesta sessão (1007 linhas)
- `PERFORMANCE-ANALYSIS.md` — 🔍 Relatório de Análise de Performance - MainLayout (195 linhas)
- `README.md` — 🎁 Promo Brindes — Plataforma de Vendas de Brindes Promocionais (842 linhas)
- `RECOVERY_PLAN.md` — 🛠️ RECOVERY PLAN — Restauração de 65 tabelas faltantes (235 linhas)
- `RELATORIO_CI.md` — RELATORIO_CI.md — Baseline × Final CI (1194 linhas)
- `RELATORIO_CI_P34.md` — RELATORIO_CI_P34.md — Prova Final Sessão P34 (2026-10-30) (64 linhas)
- `SECURITY.md` — Política de Segurança — Promo Gifts (89 linhas)
- `STATUS.md` — 📡 Status do Projeto (19 linhas)
- `SUPABASE_CONNECTION.md` — Conexão Supabase — SSOT (Single Source of Truth) (64 linhas)
- `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md` — 🏢 Como Criar sua Primeira Organization (440 linhas)
- `docs/02_INTEGRACAO_FRONTEND_REACT.md` — 💻 Integração Frontend (React) (845 linhas)
- `docs/03_ARQUITETURA_DO_SISTEMA.md` — 🏗️ Arquitetura do Sistema (587 linhas)
- `docs/04_EXPLICACAO_DAS_POLICIES.md` — 🔐 Explicação das Policies (RLS) (947 linhas)
- `docs/05_ROADMAP_PROXIMOS_PASSOS.md` — 🚀 Roadmap - Próximos Passos (731 linhas)
- `docs/ACCESSIBILITY.md` — ♿ Guia de Acessibilidade (a11y) (145 linhas)
- `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md` — ADR — fronteira entre os módulos Mockup e Magic Up (157 linhas)
- `docs/ANALISE_109_TABELAS_BANCO_EXTERNO.md` — 📊 Análise Exaustiva das 109 Tabelas do Banco de Dados Externo (432 linhas)
- `docs/API.md` — 📡 Documentação de APIs - Gifts Store (260 linhas)
- `docs/ARQUITETURA_BRIDGE_REST_NATIVE.md` — 🌉➡️🗄️ A Mudança da "Bridge": de Edge Function para PostgREST Nativo (265 linhas)
- `docs/AUDITORIA-BACKEND-2026-05-25.md` — Auditoria de Arquitetura Back-End — promo-gifts-v4 (381 linhas)
- `docs/AUDITORIA-EXAUSTIVA-2026-05-23.md` — Auditoria exaustiva de bugs e falhas — `promo-gifts-v4` (355 linhas)
- `docs/AUDITORIA_2026-05-07.md` — 📋 Auditoria PromoGifts — Plano de Faxina e Migração (962 linhas)
- `docs/AUDITORIA_BUGS_2026-05-23.md` — Auditoria de Bugs e Falhas — 2026-05-23 (490 linhas)
- `docs/AUDITORIA_DB_FRONTEND_2026-05-31.md` — Auditoria Exaustiva: Banco de Dados ↔ Front-end — Promo Gifts v4 (223 linhas)
- `docs/AUDITORIA_E2E_2026-05-22.md` — AUDITORIA E2E — Bateria de Testes (PROMPT-3) (352 linhas)
- `docs/AUDITORIA_INDEPENDENTE_PRE_PRODUCAO_2026-05-13.md` — Auditoria Independente Pré-Produção — Promo_Gifts (213 linhas)
- `docs/AUDITORIA_PLANEJADO_NAO_EXECUTADO_2026-10-11.md` — Auditoria exaustiva — Funcionalidades planejadas e não executadas (342 linhas)
- `docs/AUDITORIA_SISTEMA.md` — AUDITORIA COMPLETA DO SISTEMA — PromoGifts (ADM01) (830 linhas)
- `docs/AUDITORIA_SUPER_FILTRO_2026-05-26.md` — Auditoria Exaustiva — Super Filtro (282 linhas)
- `docs/AUDITORIA_fn_process_raw_v2_vs_process_spot_products.md` — Auditoria de Migração: `process_spot_products` → `fn_process_raw_v2` (250 linhas)
- `docs/AUDIT_FRONTEND_DATABASE.md` — Auditoria Técnica: Front-end ↔ Banco de Dados (526 linhas)
- `docs/AUDIT_FRONTEND_DATABASE_summary.md` — Sumário Executivo — Auditoria Front-end ↔ DB (Promo_Gifts) (30 linhas)
- `docs/AUDIT_INDEPENDENTE.md` — AUDITORIA INDEPENDENTE — PROMO_GIFTS (1186 linhas)
- `docs/AUDIT_REPORT.md` — Auditoria Técnica — Relatório de Triagem (210 linhas)
- `docs/AUDIT_REPORT_20260602.md` — Auditoria Exaustiva Supabase — 20 Etapas (91 linhas)
- `docs/AUDIT_REPORT_20260604_FULL.md` — Relatório de Auditoria Exaustiva — Promo Gifts v4 (448 linhas)
- `docs/AUTH-GOOGLE-PROD-CHECKLIST.md` — Checklist — Validação do Login com Google em Produção (161 linhas)
- `docs/AUTH-GOOGLE-SETUP.md` — Login com Google — Ativação (52 linhas)
- `docs/AUTH-SSO-ACTIVATION.md` — 🔐 Ativação SSO em Produção — Guia Pré-Deploy (237 linhas)
- `docs/BRANCH_PROTECTION.md` — 🔒 Branch Protection — `main` (94 linhas)
- `docs/BUG_REPORT_20260526.md` — 🔍 Relatório de Auditoria Exaustiva de Integrações (177 linhas)
- `docs/CATEGORY_ICONS_GUIDE.md` — Sistema de Ícones de Categorias (302 linhas)
- `docs/COMPANY_LIST_AVATAR.md` — CompanyListAvatar — SSOT do avatar de empresa em listas (89 linhas)
- `docs/CONFIGURACAO_LOCALE_PT_BR.md` — 🇧🇷 REMOÇÃO DE i18n E CONFIGURAÇÃO PT-BR - GIFTS-STORE (514 linhas)
- `docs/CONTRADIÇÕES_DOCUMENTADAS.md` — Contradições documentadas — promo-gifts-v4 (15 linhas)
- `docs/DARK_MODE.md` — 🌙 Guia de Dark Mode - Gifts Store (80 linhas)
- `docs/DATA_DICTIONARY.md` — Data Dictionary — Promo Gifts (Local Supabase) (101 linhas)
- `docs/DB_CONNECTION_POOL.md` — DB Connection Pool — Promo Gifts (136 linhas)
- `docs/DB_FRONTEND_COVERAGE.md` — DB ↔ Frontend Coverage Report (363 linhas)
- `docs/DECISION-LOG-2026-05-21-v2.md` — DECISION-LOG v2 — Onda "CI Green" (we-dream-big / PromoGifts) (109 linhas)
- `docs/DEPLOYMENT.md` — Deployment Guide — Promo_Gifts (149 linhas)
- `docs/DESIGN_TOKENS.md` — Design Tokens — Orange Premium SSOT (271 linhas)
- `docs/DIAGNOSTICO_BANCO.md` — 🔍 Diagnóstico de Comunicação com Banco de Dados (106 linhas)
- `docs/DISASTER_RECOVERY.md` — Plano de Recuperação de Desastre (DR) — Promo Gifts V4 (80 linhas)
- `docs/DIVIDA_CRONICA.md` — Dívida Crônica — Promo Gifts V4 (80 linhas)
- `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md` — E12 — Detector de DDL fora do fluxo (out-of-band) (2026-09-16) (185 linhas)
- `docs/E2E_SMOKE_COVERAGE.md` — Auditoria de cobertura — Smoke E2E (69 linhas)
- `docs/E41_DIFF_ESTRUTURAL_TYPES_2026-09-16.md` — E41 — Diff estrutural de `types.ts` (substitui o proxy `grep -c "export type"`) (216 linhas)
- `docs/EDGE_FUNCTIONS.md` — Edge Functions — Catálogo Completo (112 linhas)
- `docs/ENVIRONMENTS_PARITY.md` — Ambientes e Paridade Mínima (local / CI / staging) (136 linhas)
- `docs/EXCEL_INTEGRATION_GUIDE.md` — 📊 Guia de Integração - Botão Export Excel (140 linhas)
- `docs/FABRICA_VPS.md` — 🏭 Fábrica de Correções (VPS Hostinger) (61 linhas)
- `docs/FLAG_faxina_archive_false_positives_20260621.md` — 🚩 FLAG — Faxina arquivando tabelas com `.from()` vivo (falsos-positivos) + código morto a limpar (49 linhas)
- `docs/FORM_VALIDATION.md` (5 linhas)
- `docs/FOTOGRAFIA_PG_CATALOG_2026-08-26.md` — Fotografia pg_catalog — 2026-08-26 (25 linhas)
- `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` — 📋 Inventário Completo de Funcionalidades e Ferramentas (1284 linhas)
- `docs/HANDOFF-2026-05-07-SESSAO-NOITE.md` — 🤝 HANDOFF SUPLEMENTAR — Sessão de noite 07/05/2026 (192 linhas)
- `docs/HANDOFF-2026-05-07.md` — 🤝 HANDOFF — Continuidade do projeto PromoGifts (587 linhas)
- `docs/HOOKS_AUDIT.md` — Auditoria Exaustiva de Hooks — promo-gifts-v4 (216 linhas)
- `docs/HOOKS_USAGE_GUIDE.md` — 📚 Guia de Uso dos Hooks (253 linhas)
- `docs/IDEMPOTENCY_MANIFESTO.md` — Manifesto de Idempotência — Edges de Escrita (31 linhas)
- `docs/INCIDENTE_2026-10-13_BASELINE.md` — Incidente 2026-10-13 — Baseline para comparação em 30 dias (109 linhas)
- `docs/INDEX.md` — Índice de Documentação — Promo Gifts V4 (76 linhas)
- `docs/INTEGRACAO_FRONTEND_MEDALLION.md` — Integração Frontend ↔ Arquitetura Medallion (Bronze → Prata → Ouro) (170 linhas)
- `docs/INTEGRACAO_MEDALLION_FRONT.md` — Integração Front-end ↔ Arquitetura Medallion (Bronze / Prata / Ouro) (312 linhas)
- `docs/JORNADAS_PERSONAS_ROTAS_CRITICAS.md` — Jornadas fim-a-fim por persona (com rastreabilidade de rotas críticas) (221 linhas)
- `docs/LGPD.md` — LGPD — Política de Dados Pessoais (Promo_Gifts_V4) (29 linhas)
- `docs/MAGAZINE_MODULE.md` — Magazine Module — Architecture & Engineering Reference (199 linhas)
- `docs/MAGIC_UP_ONDA5_A11Y.md` — ♿ Magic Up — Onda 5 a11y guideline (81 linhas)
- `docs/MOBILE.md` — 📱 Guia de Responsividade Mobile (100 linhas)
- `docs/MOCKUP_DECISOES_2026-10-08.md` — Decisões do dono sobre o módulo Mockup — 08/10/2026 (111 linhas)
- `docs/MOCKUP_ESTADOS.md` — Estados do Mockup — glossário (204 linhas)
- `docs/MOCKUP_RETENCAO.md` — Mockup — Retenção e Lixeira (roteiro) (219 linhas)
- `docs/NOTIFICATION_SYSTEM.md` — 🔔 SISTEMA UNIFICADO DE NOTIFICAÇÕES (309 linhas)
- `docs/OBSERVABILITY.md` — Observabilidade — Promo Gifts (189 linhas)
- `docs/OBSERVABILITY_SLOS.md` — SLOs e Burn-Rate — Observabilidade (31 linhas)
- `docs/ONBOARDING.md` — Onboarding — Promo Gifts (Setup < 4h) (94 linhas)
- `docs/ONCALL.md` — Guia de Oncall — Promo Gifts V4 (195 linhas)
- `docs/PAGE_STRUCTURE_STANDARD.md` — Padrão de Estrutura de Páginas (89 linhas)
- `docs/PATCH_external_db_bridge_kill_switch.md` — Patch manual: `external-db-bridge/index.ts` — kill-switch integration (139 linhas)
- `docs/PERFORMANCE.md` — Performance Optimization (69 linhas)
- `docs/PERFORMANCE_AUDIT.md` — Performance Audit — N+1 & Hot Queries (65 linhas)
- `docs/PERF_OPTIMIZATIONS.md` — Otimizações de Performance — Guia Técnico (652 linhas)
- `docs/PLANO-20-ETAPAS-2026-05-23.md` — Plano de correção exaustiva — 20 etapas (57 linhas)
- `docs/PLANO_AB_DESLIGAMENTO_SWITCH.md` — Plano A/B — Desligamento do `external-db-bridge` (150 linhas)
- `docs/PLANO_MELHORIAS_200_ETAPAS.md` — PLANO DE MELHORIAS E CORREÇÕES — 200 ETAPAS (904 linhas)
- `docs/PLANO_MELHORIAS_200_ETAPAS_261104.md` — PLANO DE MELHORIAS E CORREÇÕES — Promo Gifts V4 (858 linhas)
- `docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` — Plano Mockup — 50 etapas (correções e melhorias) (81 linhas)
- `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` — Adendo ao Plano Mockup — análise do documento do Codex (etapas 51–68) (126 linhas)
- `docs/POLITICA_IDIOMA_PT_BR.md` — 🚫 POLÍTICA DE IDIOMA - GIFTS-STORE (232 linhas)
- `docs/POSTMORTEM_2026-08-31_MERGE_CROSS_AGENTE.md` — Postmortem — Merge cross-agente sem PR (2026-08-31) (51 linhas)
- `docs/POSTMORTEM_2026-10-13_DDL_MCP_SEM_MIGRATION.md` — Postmortem — DDL via MCP sem migration (2026-10-13) (52 linhas)
- `docs/POSTMORTEM_TEMPLATE.md` — Post-Mortem — [Título do Incidente] (47 linhas)
- `docs/QA_ADMIN_LAYOUT.md` — Checklist de QA Visual - Módulo Admin (32 linhas)
- `docs/QA_REPORT_2026-05-22.md` — Relatório QA — 2026-05-22 (140 linhas)
- `docs/QUOTES_STATUS_TOOLTIPS.md` — Tooltips de status de orçamentos — SSOT (116 linhas)
- `docs/QUOTE_NUMBERING.md` — Numeração de Orçamentos (`quote_number`) — Arquitetura (90 linhas)
- `docs/RBAC_HELPERS.md` — Helpers semânticos de RBAC (RLS) (46 linhas)
- `docs/RBAC_MATRIX.md` — Matriz RBAC — Edge Functions (152 linhas)
- `docs/README.md` — 📚 Documentação do Gifts Store (143 linhas)
- `docs/RELATORIO_COLAPSO_2026-05-24.md` — 📋 Relatório Forense — Colapso Promo Gifts v4 (238 linhas)
- `docs/RELATORIO_COLAPSO_FASE2_2026-05-24.md` — Relatório Pós-Fase 2 — Colapso 2026-05-24 (98 linhas)
- `docs/RELATORIO_COLAPSO_FASE3_FINAL_2026-05-24.md` — Relatório Final Consolidado — Colapso 2026-05-24 | FASES 1+2+3 (211 linhas)
- `docs/RELATORIO_INTEGRACAO_BACK_FRONT_FINAL.md` — Missão Zero Bug 10/10 — Integração Back-End ↔ Front-End (234 linhas)
- `docs/RELEASE.md` — Checklist de Release — Promo Gifts V4 (139 linhas)
- `docs/REST_NATIVE_MIGRATION.md` — REST Native Migration (123 linhas)
- `docs/RLS_REWRITE_PLAN.md` — RLS Rewrite Plan — `user_roles` / `order_items` / `admin_audit_log` (93 linhas)
- `docs/ROBOFLOW_SETUP.md` — Roboflow Integration Setup Guide (185 linhas)
- `docs/RUNBOOK.md` — 📘 Runbook Operacional — Promo Brindes (243 linhas)
- `docs/RUNBOOK_COLAPSO_2026-05-24.md` — 🚨 Runbook — Colapso Promo Gifts v4 (2026-05-24) (154 linhas)
- `docs/RUNBOOK_CONNECTIONS.md` — 🔌 Runbook — Módulo `/admin/conexoes` (261 linhas)
- `docs/RUNBOOK_QUOTE_NUMBER_HARDENING.md` — Runbook — Hardening do `generate_quote_number` (143 linhas)
- `docs/SCHEMA_REFERENCE.md` — SCHEMA_REFERENCE.md — Banco Canônico PromoGifts (Gold/Medallion) (482 linhas)
- `docs/SECURITY-DEFINER-PATTERN.md` — Padrão SECURITY DEFINER + RLS no PromoGifts (164 linhas)
- `docs/SECURITY.md` — Security Best Practices (23 linhas)
- `docs/SECURITY_ALERTS.md` — 🛡️ Security Alerts — Configuração Completa (95 linhas)
- `docs/SECURITY_HEADERS.md` — Security Headers — Promo Gifts (100 linhas)
- `docs/SECURITY_RUNBOOK.md` — Security Runbook — Promo Gifts (66 linhas)
- `docs/SPOT_API_MCP_ANALISE_EXAUSTIVA.md` — Análise Exaustiva — API/MCP Spot (Stricker) (1205 linhas)
- `docs/STAGING_GATES_DESTRUTIVOS.md` — Staging para gates destrutivos (78 linhas)
- `docs/STATUS_POS_COLAPSO_2026-05-25.md` — 📊 Status Pós-Colapso — Follow-up de 25/05/2026 (486 linhas)
- `docs/STOCK_FILTER_COVERAGE_REPORT.md` — Stock Filter — Relatório de Cobertura & Fuzz (10/10) (74 linhas)
- `docs/SUPABASE_AUDIT_REPORT_20260602.md` — 🔬 RELATÓRIO DE AUDITORIA SUPABASE — `doufsxqlfjyuvxuezpln` (286 linhas)
- `docs/SUPABASE_PANEL_CONFIG.md` — Configuração de painel do Supabase canônico (IaC-lite) (85 linhas)
- `docs/SUPER_FILTRO_BUG_AUDIT_2026-05-26.md` — Auditoria Exaustiva — Super Filtro (217 linhas)
- `docs/TESTING.md` — Testing Guide (32 linhas)
- `docs/TEST_STABILITY_POLICY.md` — Política de estabilidade de testes (Smoke, Regressão e Integração) (72 linhas)
- `docs/UNUSED_INDEXES_AUDIT_2026-05-24.md` — Auditoria de índices não utilizados — Maio/2026 (103 linhas)
- `docs/_encoding_probe.md` (3 linhas)
- `docs/api-audit-2026-05-26.md` — Auditoria de APIs Externas — Promo Gifts v4 (225 linhas)
- `docs/bronze-table-analysis.md` — 📊 Análise Exaustiva — Tabela Bronze (131 linhas)
- `docs/bugs-super-filtro-audit-2026-05.md` — Auditoria Super Filtro — 26/05/2026 (247 linhas)
- `docs/deploy-flow.md` — Fluxo de Deploy — Promo Brindes (92 linhas)
- `docs/design-system-audit-2026-05-25.md` — 🔍 Design System Audit — Promo Gifts v4 (150 linhas)
- `docs/hooks-audit-2026-05.md` — Hooks Audit -- promo-gifts-v4 (2026-05) (141 linhas)
- `docs/hooks-audit-round3-2026-05.md` — Auditoria de Hooks — Round 3 — Maio 2026 (201 linhas)
- `docs/hooks-audit-round4-2026-05.md` — Auditoria de Hooks — Round 4 — Maio 2026 (102 linhas)
- `docs/hooks-audit-round5-2026-05.md` — Hooks Audit — Round 5 (2026-05-27) (381 linhas)
- `docs/incident-response.md` — Resposta a incidentes — Promo Gifts V4 (59 linhas)
- `docs/issues-pendentes-2026-05-22.md` — Issues a abrir manualmente — Pós-incidente 2026-05-22 (170 linhas)
- `docs/magazine-ring-testing-audit.md` — Auditoria dos testes de ring do Magazine PreviewSidebar (225 linhas)
- `docs/motor-v2-test-report.md` — 🧪 Relatório Exaustivo de Testes — Motor V2 (Bronze Layer) (401 linhas)
- `docs/notifications-module-audit.md` — Auditoria — Módulo "Notificações de Estoque" (sino do header) (110 linhas)
- subpastas de docs/: docs/arquivo (90), docs/redeploy (27), docs/estado (26), docs/plans (24), docs/db (14), docs/audits (12), docs/adr (11), docs/auditoria-planejado-nao-executado-2026-10-11 (11), docs/ci (11), docs/hardening (11), docs/validation (11), docs/architecture (9), docs/runbooks (8), docs/bugs (6), docs/security (5), docs/sessoes (5), docs/suppliers (5), docs/agentes (4), docs/arquitetura (4), docs/audit (4), docs/testing (4), docs/RUNBOOKS (3), docs/contexto (3), docs/design (3), docs/fabrica-vps (3), docs/observability (3), docs/qa (3), docs/reports (3), docs/INCIDENTS (2), docs/contracts (2), docs/coordenacao (2), docs/edge-functions (2), docs/historico (2), docs/incidente-2026-10-13 (2), docs/operations (2), docs/prompts (2), docs/e2e (1), docs/graphify (1), docs/incidents (1), docs/migrations (1), docs/pipelines (1), docs/postmortems (1), docs/promo-champions (1), docs/storage (1), docs/workflows (1)
- CHANGELOG topo: [1.8.1](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.8.0...v1.8.1) (2026-11-08)

## Últimos commits
- 2026-11-13 `0f00ba1` fix(calculadora): tela mostra o preço oficial da RPC, o mesmo que vai para o orçamento (#3465)
- 2026-11-13 `18e4576` test(simulador): cobre o CTA Criar Orçamento do ProductPriceSimulator (#3462)
- 2026-11-13 `9d84acb` fix(admin): salvar papéis não trava quando a permissão já foi adicionada por outro admin (#3461)
- 2026-11-12 `fee3d09` fix(sitemap): devolve EXECUTE de anon em get_sitemap_public e remove sitemap estático (#3430)
- 2026-11-12 `c8ae97c` fix: corrige 42 bugs da rodada 2 em orçamentos, admin, preços, limites e datas (#3428)
- 2026-11-12 `e9a4a1a` fix: E2E busca global — modifier+K webkit, Ctrl+Shift+V webkit, snapshots
- 2026-11-12 `5f956d2` fix: corrige 62 bugs confirmados em telas, hooks e edge functions (#3424)
- 2026-11-12 `4bda903` fix(tests): corrige erros de TypeScript em testes, mede baseline real (855) e corrige caminho em PENDENCIAS (#3419)
- 2026-11-12 `f240819` fix(ci): corrige testes, tipos de edge e cobertura que deixam a main vermelha (#3407)
- 2026-11-12 `1da62ab` docs(ci): RELATORIO §33 + PENDENCIAS #45-#52 — baseline + inventário final de workflows
- 2026-11-12 `52d6c21` fix: fn_get_rupture_alerts com SECURITY DEFINER e search_path correto
- 2026-11-11 `caeb61b` fix(scripts): heap explícito no tsc dos gates para evitar OOM (#3406)
- 2026-11-11 `15c2a4c` chore(repo): quarentena dos 316 arquivos obsoletos da #3361 (#3398)
- 2026-11-11 `ceea4cc` fix: restaura useDevGate original (stableRoles tipado como AppRole[])
- 2026-11-11 `fdc79d9` test: cobertura da busca global e testes de hooks Bridge/DevGate alinhados à API atual

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
