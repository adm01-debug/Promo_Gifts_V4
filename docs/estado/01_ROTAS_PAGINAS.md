# 01 — ROTAS E PÁGINAS (auditoria de estado por medição)

> **Data da medição:** 2026-08-16
> **Escopo:** `src/routes/` (14 arquivos), `src/App.tsx`, `src/pages/` (217 arquivos `.tsx`)
> **Método:** leitura integral dos arquivos de rota + amostragem instrumentada das páginas.
> **Fontes desconsideradas por instrução:** `README.md`, `STATUS.md`, `CLAUDE.md`, `docs/*.md`.
> Somente código foi usado como evidência.

---

## ⚠️ LIMITE DECLARADO ANTES DE TUDO (leia isto antes de confiar em qualquer ✅)

A definição de `✅ IMPLEMENTADO_TOTAL` exige prova de **objeto de banco**.
**Esta auditoria NÃO consultou o banco `doufsxqlfjyuvxuezpln`.** O escopo recebido foi
roteamento e páginas; auditoria de schema tem regra própria (só via `pg_catalog`) e não foi
executada aqui.

Portanto, **neste documento**:

- `✅` significa: **fio verificado no código** — rota declarada → componente existe e é
  alcançável → o componente consome hook/serviço real → esse hook/serviço emite chamada de
  persistência (`supabase.from(...)`, `invokeEdge`, `*Service.*`).
  **O objeto de banco correspondente é `NAO_VERIFICADO`.**
- Onde a cadeia quebra antes da persistência (dado semeado em código, canvas sem persistência,
  harness sem consumidor real), a linha cai para `🟨` ou `🟦` — nunca sobe.

Se a auditoria de dados (outro documento) provar que uma tabela/view não existe, os `✅`
correspondentes devem cair para `🟨`. Este arquivo não pode fazer essa afirmação sozinho.

---

## 0. TOPOLOGIA MEDIDA

```
src/App.tsx:112              → <AppRoutes />
src/routes/AppRoutes.tsx:123 → <Routes>
   ├─ {publicRoutes}                      public-routes.tsx:30   — SEM auth
   ├─ /debug/images                       AppRoutes.tsx:132      — SEM auth (proposital)
   ├─ /__visual/* (8)                     AppRoutes.tsx:136-169  — só existem se import.meta.env.DEV
   ├─ <Route element={<ProtectedRoute />}> AppRoutes.tsx:175
   │     └─ <Route element={<ProtectedAppLayout />}> AppRoutes.tsx:176
   │           ├─ {productRoutes}         product-routes.tsx:22
   │           ├─ {quoteRoutes}           quote-routes.tsx:20
   │           ├─ {adminRoutes}           admin-routes.tsx:62
   │           ├─ {toolsRoutes}           tools-routes.tsx:37
   │           └─ {homeAndClientRoutes}   client-routes.tsx:19
   └─ {notFoundRoute}                     client-routes.tsx:62 (montado em AppRoutes.tsx:185)
```

**Total de rotas declaradas medidas: 131.**

Nenhum `<Route path=` existe fora de `src/routes/` — verificado:
`rg -n "<Route\s+path=" src --glob '!src/routes/**' --glob '!**/*.test.tsx'` → **saída vazia**.
Não há árvores de rota aninhadas dentro de páginas.

---

## A) TABELA DE TODAS AS ROTAS DECLARADAS

Legenda de guarda: `PR` = `ProtectedRoute` (`AppRoutes.tsx:175`) · `PAL` = `ProtectedAppLayout`
(`AppRoutes.tsx:176`) · `AR` = `AdminRoute` (`admin-routes.tsx:65`) · `DR` = `DevRoute`
(`admin-routes.tsx:119`).

### A.1 — Rotas PÚBLICAS (sem autenticação) — `src/routes/public-routes.tsx`

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/auth` | `Auth` | `public-routes.tsx:32` | **nenhuma** | ✅ | `src/pages/auth/Auth.tsx` 898 linhas, 22 hooks, 6 refs a `supabase`; `lazy-pages.ts:14` |
| `/login` | `Auth` (alias) | `public-routes.tsx:34` | **nenhuma** | ✅ | mesmo módulo da linha acima |
| `/reset-password` | `ResetPassword` | `public-routes.tsx:35` | **nenhuma** | ✅ | `src/pages/auth/ResetPassword.tsx` 309 linhas, 9 hooks, 3 refs `supabase`; `lazy-pages.ts:18` |
| `/forgot-password-confirmation` | `ForgotPasswordConfirmation` | `public-routes.tsx:36` | **nenhuma** | ✅ | `src/pages/auth/ForgotPasswordConfirmation.tsx` 111 linhas — tela de confirmação, sem persistência **por design**; `lazy-pages.ts:19` |
| `/auth/callback` | `SSOCallbackPage` | `public-routes.tsx:37` | **nenhuma** | ✅ | `src/pages/auth/SSOCallbackPage.tsx` 380 linhas, 7 refs `supabase`, 8 imports de `@/lib`/`@/hooks`; `lazy-pages.ts:22` |
| `/unauthorized` | `UnauthorizedPage` | `public-routes.tsx:38` | **nenhuma** | ✅ | `src/components/access/UnauthorizedPage.tsx:10` (108 linhas, navegação real); `lazy-pages.ts:15` |
| `/termos` | `TermsPage` | `public-routes.tsx:39` | **nenhuma** | ✅ | `src/pages/auth/TermsPage.tsx` 88 linhas — conteúdo estático por design; `lazy-pages.ts:23` |
| `/privacidade` | `PrivacyPage` | `public-routes.tsx:40` | **nenhuma** | ✅ | `src/pages/auth/PrivacyPage.tsx` 86 linhas — estático por design; `lazy-pages.ts:24` |
| `/revista-publica/:token` | `PublicMagazineView` | `public-routes.tsx:41` | **nenhuma** (token na URL é o único gate) | ✅ | `src/pages/magazine/PublicMagazineView.tsx` 620 linhas, 22 hooks; consome `magazineService.getPublicByToken` (ver `MagazinePrintPage.tsx:30`) |
| `/__test/color-swatches` | `ColorSwatchesHarness` | `public-routes.tsx:42` | **nenhuma** | 🟨 | `public-routes.tsx:15` usa `lazy()` **sem** guarda `import.meta.env.DEV` → a rota **existe em produção**. Página real (`src/pages/dev/ColorSwatchesHarness.tsx` 111 linhas) mas é harness de QA exposto publicamente |
| `/__test/confirm-dialog` | `ConfirmDialogHarness` | `public-routes.tsx:43` | **nenhuma** | 🟨 | idem; `public-routes.tsx:16`; `src/pages/dev/ConfirmDialogHarness.tsx` 82 linhas |
| `/__test/alert-dialog` | `AlertDialogHarness` | `public-routes.tsx:44` | **nenhuma** | 🟨 | idem; `public-routes.tsx:17`; 56 linhas |
| `/__test/dialog` | `DialogHarness` | `public-routes.tsx:45` | **nenhuma** | 🟨 | idem; `public-routes.tsx:18`; 54 linhas |
| `/__test/undo-toast` | `UndoToastHarness` | `public-routes.tsx:46` | **nenhuma** | 🟨 | idem; `public-routes.tsx:19`; 70 linhas |
| `/__test/cnpj-form` | `CnpjFormHarness` | `public-routes.tsx:47` | **nenhuma** | 🟨 | idem; `public-routes.tsx:20`; 136 linhas |
| `/__test/magazine-ring` | `MagazineRingHarness` | `public-routes.tsx:48` | **nenhuma** | 🟨 | idem; `public-routes.tsx:21`; 106 linhas |
| `/__test/tab-skip` | `TabSkipHarness` | `public-routes.tsx:49` | **nenhuma** | 🟨 | idem; `public-routes.tsx:22`; 220 linhas |

### A.2 — Rotas declaradas direto em `AppRoutes.tsx`

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/debug/images` | `OptimizedImageDemo` | `AppRoutes.tsx:132` | **nenhuma — intencional** | ✅ | Comentário justificando em `AppRoutes.tsx:126-131`; `src/pages/tools/OptimizedImageDemo.tsx` 333 linhas, 10 hooks, 2 refs `supabase`; `lazy-pages.ts:229` |
| `/__visual/preview-button` | `PreviewButtonHarness` | `AppRoutes.tsx:136` | gate de build `import.meta.env.DEV` (`AppRoutes.tsx:20-22`) | 🟨 | Página existe (69 linhas) mas **a rota não é montada em produção** — o `Route` inteiro é condicional. Em prod cai no catch-all 404 |
| `/__visual/quote-view-order` | `QuoteViewOrderHarness` | `AppRoutes.tsx:139` | DEV (`AppRoutes.tsx:23-25`) | 🟨 | 354 linhas, contém stubs declarados (grep `Stub`) |
| `/__visual/quote-items-list-mobile` | `QuoteItemsListMobileHarness` | `AppRoutes.tsx:143` | DEV (`AppRoutes.tsx:26-28`) | 🟨 | 69 linhas, 0 hooks |
| `/__visual/quote-item-editor-sheet` | `QuoteItemEditorSheetHarness` | `AppRoutes.tsx:149` | DEV (`AppRoutes.tsx:29-31`) | 🟨 | 92 linhas, stubs |
| `/__visual/quote-add-product-button` | `QuoteAddProductButtonHarness` | `AppRoutes.tsx:155` | DEV (`AppRoutes.tsx:32-34`) | 🟨 | 112 linhas, stubs |
| `/__visual/calendar` | `CalendarHarness` | `AppRoutes.tsx:160` | DEV (`AppRoutes.tsx:35-37`) | 🟨 | 73 linhas |
| `/__visual/date-picker-field` | `DatePickerFieldHarness` | `AppRoutes.tsx:163` | DEV (`AppRoutes.tsx:38-40`) | 🟨 | 79 linhas |
| `/__visual/negotiation-markup-card` | `NegotiationMarkupCardHarness` | `AppRoutes.tsx:167` | DEV (`AppRoutes.tsx:41-43`) | 🟨 | 34 linhas |
| `*` (catch-all 404) | `NotFound` | `client-routes.tsx:62`, montado em `AppRoutes.tsx:185` | **nenhuma — proposital** | ✅ | Comentário e justificativa (issue #167) em `client-routes.tsx:52-60`; `src/pages/NotFound.tsx` 126 linhas |

### A.3 — Produtos — `src/routes/product-routes.tsx` (sob `PR` + `PAL`)

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/produtos` | `FiltersPage` | `product-routes.tsx:24` | `PR`+`PAL` | ✅ | `src/pages/products/FiltersPage.tsx` 819 linhas, 14 hooks, 3 imports de serviço; `lazy-pages.ts:37` |
| `/produto` | → `Navigate` `/produtos` | `product-routes.tsx:25` | `PR`+`PAL` | ✅ | redirect literal na linha |
| `/produto/:id` | `ProductDetail` | `product-routes.tsx:27` | `PR`+`PAL` + **`ValidProductIdRoute`** (`product-routes.tsx:29`) | ✅ | Guard: `src/routes/guards/ValidProductIdRoute.tsx:11-15` valida UUID e redireciona p/ `/produtos`. Página: 490 linhas, 22 hooks, 2 refs `supabase`, 2 `useQuery` |
| `/filtros` | `FiltersPage` (mesmo de `/produtos`) | `product-routes.tsx:34` | `PR`+`PAL` | ✅ | duplicação intencional do mesmo módulo |
| `/novidades` | `NoveltiesPage` | `product-routes.tsx:35` | `PR`+`PAL` | ✅ | `src/pages/products/NoveltiesPage.tsx` 97 linhas — casca fina que delega a `NoveltyStatsCards`/`NoveltyProductGrid`/`ExpiringNoveltiesWidget` (`NoveltiesPage.tsx:4-6`) |
| `/reposicao` | `ReplenishmentsPage` | `product-routes.tsx:36` | `PR`+`PAL` | ✅ | 81 linhas, delega a `ReplenishmentStatsCards`/`ReplenishmentProductGrid`/`RecentReplenishmentsWidget` (`ReplenishmentsPage.tsx:4-6`) |
| `/favoritos` | `FavoritesPage` | `product-routes.tsx:37` | `PR`+`PAL` | ✅ | 894 linhas, 37 hooks, 3 imports de serviço |
| `/carrinhos` | `CartsListPage` | `product-routes.tsx:38` | `PR`+`PAL` | ✅ | 1030 linhas, 23 hooks, 6 imports de serviço |
| `/carrinhos/:cartId` | `SellerCartsPage` | `product-routes.tsx:39` | `PR`+`PAL` — **sem guard de UUID** | 🟨 | Página real (1193 linhas, 25 hooks). O que falta: diferente de `/produto/:id` e `/orcamentos/:id`, `:cartId` não passa por guard de UUID — `product-routes.tsx:39` não envolve o elemento |
| `/comparar` | `ComparePage` | `product-routes.tsx:40` | `PR`+`PAL` | ✅ | 436 linhas, 19 hooks, 5 imports de serviço |
| `/colecoes` | `CollectionsPage` | `product-routes.tsx:41` | `PR`+`PAL` | ✅ | 489 linhas; `lazy-pages.ts:46` |
| `/colecoes/:id` | `CollectionDetailPage` | `product-routes.tsx:42` | `PR`+`PAL` — **sem guard de UUID** | 🟨 | Página real (725 linhas, 40 hooks). Falta: mesma lacuna de guard de `:id` descrita acima |

### A.4 — Orçamentos — `src/routes/quote-routes.tsx` (sob `PR` + `PAL`)

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/orcamentos` | `QuotesListPage` | `quote-routes.tsx:22` | `PR`+`PAL` | ✅ | 502 linhas; lógica extraída em `src/pages/quotes/useQuotesListPage.ts` (14 testes em `src/pages/quotes/__tests__/`) |
| `/orcamentos/dashboard` | `QuotesDashboardPage` | `quote-routes.tsx:23` | `PR`+`PAL` | ✅ | 411 linhas; consome `useQuotesDashboard` (`QuotesDashboardPage.tsx:44-49`, hook em `src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts`) |
| `/orcamentos/lista` | `QuotesListPage` (alias) | `quote-routes.tsx:24` | `PR`+`PAL` | ✅ | mesmo módulo de `/orcamentos` |
| `/orcamentos/kanban` | `QuotesKanbanPage` | `quote-routes.tsx:25` | `PR`+`PAL` | ✅ | 213 linhas, 6 hooks, 2 imports de serviço |
| `/orcamentos/templates` | → `Navigate` `/orcamentos` | `quote-routes.tsx:26` | `PR`+`PAL` | ✅ | redirect documentado em `quote-routes.tsx:17-18` |
| `/orcamentos/novo` | `QuoteBuilderPage` | `quote-routes.tsx:29` | `PR`+`PAL` | ✅ | 825 linhas, 5 imports de serviço; `lazy-pages.ts:59` |
| `/orcamentos/:id/editar` | `QuoteBuilderPage` | `quote-routes.tsx:31` | `PR`+`PAL` + **`ValidQuoteIdRoute`** (`quote-routes.tsx:33`) | ✅ | Guard: `src/routes/guards/ValidQuoteIdRoute.tsx:11-15` |
| `/orcamentos/:id` | `QuoteViewPage` | `quote-routes.tsx:39` | `PR`+`PAL` + **`ValidQuoteIdRoute`** (`quote-routes.tsx:41`) | ✅ | 577 linhas, 2 refs `supabase`, 3 imports de serviço |

### A.5 — Admin — `src/routes/admin-routes.tsx`

#### A.5.1 — Fora de qualquer guarda de papel

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/tendencias` | `TrendsPage` | `admin-routes.tsx:64` | **apenas `PR`+`PAL`** — declarada **antes** do bloco `<AdminRoute>` que começa em `admin-routes.tsx:65` | 🟨 | Página real (583 linhas, 10 hooks, 5 `useQuery`). O que falta / desvio: está no arquivo `admin-routes.tsx` mas **fora** do wrapper `AdminRoute`; qualquer usuário autenticado acessa. Além disso possui modo demo com dados fictícios opt-in via `?demo=1` (`TrendsPage.tsx:97` + `src/pages/trends/trends-mock.ts:226-229`) |

#### A.5.2 — Sob `<AdminRoute>` (`admin-routes.tsx:65`) — exige `canManage` **+ MFA em AAL2**

Guarda medida em `src/components/layout/AdminRoute.tsx`: `:57` redireciona sem sessão; `:61-72`
bloqueia sem `canManage`; `:75-86` força enrollment de MFA; `:92-120` força challenge se `currentAAL !== 'aal2'`.

| path | componente/página | declaração | class. | evidência |
|---|---|---|---|---|
| `/admin` | → `Navigate` `/admin/usuarios` | `admin-routes.tsx:66` | ✅ | redirect literal |
| `/admin/usuarios` | `AdminUsuariosPage` | `admin-routes.tsx:67` | ✅ | 320 linhas, 12 hooks, 2 refs `supabase`, 2 `useQuery` |
| `/admin/usuarios/promover` | `AdminPromoverUsuarioPage` | `admin-routes.tsx:68` | ✅ | 240 linhas; consome `useUserManagement` (`AdminPromoverUsuarioPage.tsx:28`) e `PromotionDialog` (`:29`); `fetchUsers()` em `:46,51,212` |
| `/admin/limites-desconto` | `SellerDiscountLimitsAdminPage` | `admin-routes.tsx:69` | ✅ | 557 linhas, 8 hooks, 7 refs `supabase`, 6 `useQuery` |
| `/admin/rls-denials` | `RlsDenialsAdminPage` | `admin-routes.tsx:70` | ✅ | 413 linhas, 2 refs `supabase`, 2 `useQuery` |
| `/admin/auditoria-propriedade` | `OwnershipAuditAdminPage` | `admin-routes.tsx:71` | ✅ | 447 linhas, 3 refs `supabase`, 3 `useQuery` |
| `/admin/cadastros` | `AdminCadastrosPage` | `admin-routes.tsx:72` | ✅ | 120 linhas — casca com abas que lazy-carrega `ProductsManager`, `SuppliersManager`, `EngravingRegistrationContent`, `BadgesManager` (`AdminCadastrosPage.tsx:9-23`); estado de aba via `useSearchParams` (`:37-45`) |
| `/admin/cadastros/produto/:id` | `AdminProductFormPage` | `admin-routes.tsx:73` | ✅ | 700 linhas, 8 hooks, 6 imports de serviço. Sem guard de UUID em `:id` (mesma lacuna de A.3) |
| `/admin/permissoes` | `PermissionsPage` | `admin-routes.tsx:74` | ✅ | 321 linhas, 7 hooks, 5 refs `supabase` |
| `/admin/roles` | `RolesPage` | `admin-routes.tsx:75` | ✅ | 253 linhas, 6 hooks, 3 refs `supabase` |
| `/admin/role-permissoes` | `RolePermissionsPage` | `admin-routes.tsx:76` | ✅ | 474 linhas, 6 hooks, 6 refs `supabase` |
| `/admin/video-variantes` | `AdminVideoVariantsPage` | `admin-routes.tsx:77` | ✅ | 290 linhas, 5 hooks |
| `/admin/kit-templates` | `KitTemplatesAdminPage` | `admin-routes.tsx:78` | ✅ | 409 linhas, 4 imports de serviço |
| `/admin/kit-templates/metricas` | `KitTemplatesMetricsPage` | `admin-routes.tsx:79` | ✅ | 259 linhas, 3 refs `supabase`, 3 `useQuery` |
| `/admin/aprovacoes-desconto` | → `Navigate` `/admin/usuarios?tab=discounts` | `admin-routes.tsx:81` | ✅ | redirect literal |
| `/admin/aprovacoes-desconto/:id` | `DiscountRequestDetailPage` | `admin-routes.tsx:85` | ✅ | 255 linhas, 5 refs `supabase`, 4 `useQuery` |
| `/admin/performance` | `DeprecatedRoute` → `/ferramentas/bi` | `admin-routes.tsx:90-97` | ⬛ | **Descontinuada por decisão**: `DeprecatedRoute` (`src/components/layout/DeprecatedRoute.tsx:17-25`) só emite toast e redireciona. Não existe página por trás |
| `/admin/performance-comercial` | `DeprecatedRoute` → `/ferramentas/bi` | `admin-routes.tsx:99-106` | ⬛ | idem |
| `/admin/comissoes` | `DeprecatedRoute` → `/admin/usuarios` | `admin-routes.tsx:108-115` | ⬛ | idem |

#### A.5.3 — Sob `<DevRoute>` (`admin-routes.tsx:119`) — exige papel `dev` **+ MFA AAL2**

Guarda medida em `src/components/layout/DevRoute.tsx:53-120` (bloqueio, toast coalescido,
`logAccessDenied`, enrollment/challenge de MFA).

| path | componente/página | declaração | class. | evidência |
|---|---|---|---|---|
| `/admin/seguranca` | `AdminSegurancaPage` | `admin-routes.tsx:120` | ✅ | 64 linhas — casca de abas que delega a `SecurityDashboard`, `AccessSecurityManager`, `SecureUploadManager` (`AdminSegurancaPage.tsx:2-6, 49-59`) |
| `/admin/seguranca-acesso` | `AdminSegurancaAcessoPage` | `admin-routes.tsx:121` | ✅ | 742 linhas, 8 hooks, 7 refs `supabase` |
| `/admin/seguranca/chaves` | `AdminSegurancaChavesPage` | `admin-routes.tsx:122` | ✅ | 78 linhas — casca de 6 abas delegando a `McpKeysList`, `McpAuditFeed`, `StepUpAttemptsPanel`, `AutoRevocationsPanel`, `FullOpDiagnosticsPanel`, `RlsAuditPanel` (`AdminSegurancaChavesPage.tsx:6-11, 56-73`) |
| `/admin/seguranca/exemplos-challenge` | `DevChallengeExamplesPage` | `admin-routes.tsx:123` | ✅ | 463 linhas, 1 ref `supabase`, 3 imports de serviço |
| `/admin/seguranca/migracao-papeis` | `AdminMigracaoPapeisPage` | `admin-routes.tsx:124` | ✅ | 45 linhas — casca que delega a `RoleMigrationPanel` (`AdminMigracaoPapeisPage.tsx:5, 41`; painel tem 537 linhas) |
| `/admin/prompts-ia` | `AdminPromptsIAPage` | `admin-routes.tsx:125` | ✅ | 36 linhas — casca que delega a `MockupPromptManager` (`AdminPromptsIAPage.tsx:1, 32`), que persiste em `mockup_prompt_configs` / `mockup_prompt_history` (`MockupPromptManager.tsx:82,112,123,158,193`) |
| `/admin/validade-precos` | `PriceFreshnessSettingsPage` | `admin-routes.tsx:126` | ✅ | `src/pages/admin/PriceFreshnessSettings.tsx` 214 linhas, 5 hooks; `lazy-pages.ts:108-110` |
| `/admin/badges-inteligencia` | `IntelligenceBadgeSettingsPage` | `admin-routes.tsx:127` | ✅ | 146 linhas, 2 hooks |
| `/admin/telemetria` | `AdminTelemetriaPage` | `admin-routes.tsx:128` | ✅ | 616 linhas |
| `/admin/ema-health` | `EmaHealthPage` | `admin-routes.tsx:129` | ✅ | 157 linhas, 2 `useQuery` |
| `/admin/v4-callbacks` | `AdminV4CallbacksPage` | `admin-routes.tsx:130` | ✅ | 484 linhas, 7 hooks |
| `/admin/design-tokens` | `AdminDesignTokensPage` | `admin-routes.tsx:132` | 🟨 | 359 linhas mas **0 `useState`/`useEffect`/`fetch`/`supabase`** (grep vazio) e imports só de UI (`AdminDesignTokensPage.tsx:1-4`). É uma vitrine estática de tokens. Falta: não lê tokens do tema em runtime — os valores são literais no JSX |
| `/admin/client-performance` | `AdminClientPerformancePage` | `admin-routes.tsx:133` | ✅ | 412 linhas, 7 hooks |
| `/admin/rate-limit` | `RateLimitDashboard` | `admin-routes.tsx:134` | ✅ | `src/pages/system/RateLimitDashboardPage.tsx` 199 linhas, 2 refs `supabase`; `lazy-pages.ts:209-211` |
| `/admin/workflows` | `AdminWorkflowsPage` | `admin-routes.tsx:135` | 🟨 | Casca de 36 linhas delegando a `WorkflowCanvas` (`AdminWorkflowsPage.tsx:1, 32`). **O que falta: persistência.** `rg "supabase\|useQuery\|useMutation\|localStorage" src/components/workflows/WorkflowCanvas.tsx` → **saída vazia**; o workflow vive só em `useState` (`WorkflowCanvas.tsx:54,62,63`). Nada é salvo |
| `/admin/login-attempts` | `AdminLoginAttemptsPage` | `admin-routes.tsx:136` | ✅ | 230 linhas, 4 hooks |
| `/admin/external-db` | `AdminExternalDbPage` | `admin-routes.tsx:137` | ✅ | 500 linhas, 6 imports de serviço |
| `/admin/consumo-ia` | `AdminAiUsagePage` | `admin-routes.tsx:138` | ✅ | 110 linhas — casca que consome `useAiUsageStats`/`useAiUsageLogs` e monta 5 painéis (`AdminAiUsagePage.tsx:9-14`) |
| `/admin/conexoes` | `AdminConexoesPage` | `admin-routes.tsx:139` | ✅ | 393 linhas, 13 hooks |
| `/admin/conexoes/status` | `AdminConexoesStatusPage` | `admin-routes.tsx:140` | ✅ | 280 linhas, 4 refs `supabase` |
| `/admin/status` | `SystemStatusPage` | `admin-routes.tsx:141` | ✅ | 644 linhas, 11 hooks, 11 refs `supabase` |
| `/external-db-test` | `ExternalDatabaseTest` | `admin-routes.tsx:142` | ✅ | `src/pages/system/ExternalDatabaseTest.tsx` 252 linhas. Nota: path **não** começa com `/admin` mas está sob `DevRoute` |
| `/admin/rbac-rotas` | `AdminRbacRoutesPage` | `admin-routes.tsx:143` | ✅ | 356 linhas |
| `/admin/storage-test` | `StorageTestPage` | `admin-routes.tsx:144` | ✅ | 373 linhas, 5 refs `supabase` |
| `/admin/qa` | `QAPage` | `admin-routes.tsx:145` | ✅ | `src/pages/QAPage.tsx` 295 linhas, 6 hooks |
| `/admin/qa/sidebar` | `SidebarQAPage` | `admin-routes.tsx:146` | 🟨 | `src/pages/SidebarQAPage.tsx` 213 linhas, **1 hook, 0 serviço** — página de inspeção visual de sidebar. Falta: sem camada de dados; utilidade só de QA |
| `/admin/observabilidade` | `ObservabilityDashboardPage` | `admin-routes.tsx:147` | ✅ | `src/pages/admin/ObservabilityDashboard.tsx` 359 linhas; `lazy-pages.ts:130-132` |
| `/admin/cloudflare-images` | `AdminCloudflareImagesPage` | `admin-routes.tsx:148` | ✅ | 467 linhas, 1 ref `supabase`, 2 `useQuery` |

### A.6 — Ferramentas — `src/routes/tools-routes.tsx` (sob `PR` + `PAL`)

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/simulador` | `SimuladorWizard` | `tools-routes.tsx:39` | `PR`+`PAL` | ✅ | 357 linhas, 8 hooks, 3 imports de serviço |
| `/simulador-precos` | `PriceSimulatorPage` | `tools-routes.tsx:40` | `PR`+`PAL` | 🟨 | Casca de 64 linhas (`PriceSimulatorPage.tsx`). Aba "Por Produto" delega a `ProductPriceSimulator` (real). **Falta:** aba "Por Tiragem" é montada com props inertes — `<QuantityPriceCalculator productBasePrice={0} onSelectTechnique={() => {}} />` (`PriceSimulatorPage.tsx:58`): preço-base fixo em 0 e callback vazio |
| `/estoque` | `StockDashboardPage` | `tools-routes.tsx:41` | `PR`+`PAL` | ✅ | 35 linhas — casca com cache-busting real (`StockDashboardPage.tsx:17-20`) delegando a `StockDashboard` (785 linhas, consome `useVariantStock` e `useRuptureAlerts` — `StockDashboard.tsx:27,30`) |
| `/busca-preco` | `AdvancedPriceSearchPage` | `tools-routes.tsx:42` | `PR`+`PAL` | ✅ | 445 linhas; lógica em `useAdvancedPriceSearch` (`AdvancedPriceSearchPage.tsx:39`) |
| `/montar-kit` | `KitBuilderPage` | `tools-routes.tsx:43` | `PR`+`PAL` | ✅ | 135 linhas — casca que consome `useKitBuilderPageState` (`KitBuilderPage.tsx:3`) e monta wizard real (`:5-7`) |
| `/kit-builder` | → `Navigate` `/montar-kit` | `tools-routes.tsx:44` | `PR`+`PAL` | ✅ | redirect literal |
| `/meus-kits` | `MeusKitsPage` → `KitLibraryPage` | `tools-routes.tsx:45` | `PR`+`PAL` | ✅ | `src/pages/kit-builder/KitLibraryPage.tsx` 526 linhas, 17 hooks, 5 refs `supabase`, 6 `useQuery`; alias em `lazy-pages.ts:158` |
| `/mockup` | → `Navigate` `/mockup-generator` | `tools-routes.tsx:46` | `PR`+`PAL` | ✅ | redirect literal |
| `/gerador-mockup` | → `Navigate` `/mockup-generator` | `tools-routes.tsx:47` | `PR`+`PAL` | ✅ | redirect literal |
| `/mockup-generator` | `MockupGenerator` | `tools-routes.tsx:48` | `PR`+`PAL` | ✅ | 630 linhas, 3 imports de serviço, 4 subpainéis em `src/pages/mockups/mockup-generator/` |
| `/mockups/historico` | `MockupHistoryPage` | `tools-routes.tsx:49` | `PR`+`PAL` | ✅ | 298 linhas, 3 refs `supabase`, 2 `useQuery` |
| `/magic-up` | `MagicUp` | `tools-routes.tsx:50` | `PR`+`PAL` | ✅ | 158 linhas — casca que consome `useMagicUpState` e monta `MagicUpConfigPanel`/`MagicUpResultPanel` (`MagicUp.tsx:11-13`) |
| `/inteligencia-comercial` | `CommercialIntelligencePage` | `tools-routes.tsx:51` | `PR`+`PAL` | ✅ | 323 linhas, 4 imports de serviço |
| `/ferramentas/bi` | `BusinessIntelligencePage` | `tools-routes.tsx:52` | `PR`+`PAL` | ✅ | 390 linhas, 12 hooks, 4 imports de serviço |
| `/ferramentas/bi/comparar` | `ClientComparatorPage` | `tools-routes.tsx:53` | `PR`+`PAL` | ✅ | 116 linhas — estado real sincronizado com URL (`ClientComparatorPage.tsx:17-28`), delega a `ClientSelector`/`ClientComparator` (`:10-11`) |
| `/match` | `ProductMatchPage` | `tools-routes.tsx:54` | `PR`+`PAL` | ✅ | 204 linhas, 13 hooks; usa `useProducts`/`useCategories`/`useProductMatch` (`ProductMatchPage.tsx:5-11`). Mock existe mas é **fallback só em DEV** — `import.meta.env.DEV ? MOCK_MATCH_PRODUCTS : []` (`:51`) |
| `/dropbox` | `DropboxBrowserPage` | `tools-routes.tsx:55` | `PR`+`PAL` | ✅ | 190 linhas; consome `useDropboxFiles` (`DropboxBrowserPage.tsx:2`) com `EdgeFallback` (`:9`) |
| `/simulacao` | `SimulationPage` → `src/pages/Simulation.tsx` | `tools-routes.tsx:56` | `PR`+`PAL` | ✅ | 384 linhas; chama edge function via `invokeEdge` (`Simulation.tsx:22`); alias em `lazy-pages.ts:171` |
| `/ferramentas/cobertura` | `CoverageInsightsDashboardPage` | `tools-routes.tsx:57` | `PR`+`PAL` | 🟨 | 176 linhas com lógica real de agrupamento/tendência (`CoverageInsightsDashboardPage.tsx:36-60`). **O que falta: fonte de dados.** O estado inicial é `seedData` — 9 registros hardcoded de 2026-05-18/20 (`:15-25, 43`). Só sai do fictício se o usuário fizer upload manual de JSON (`parseDataset`, `:27-34`). Nenhuma chamada a backend |
| `/raio-x` | `VisualSearchPage` | `tools-routes.tsx:58` | `PR`+`PAL` | ✅ | 1270 linhas, 12 hooks, 2 refs `supabase`, 5 imports de serviço |
| `/magazine` | `MagazineListPage` | `tools-routes.tsx:59` | `PR`+`PAL` | ✅ | 368 linhas, 6 hooks |
| `/magazine/templates` | `MagazineTemplatesGalleryPage` | `tools-routes.tsx:60` | `PR`+`PAL` | ✅ | 198 linhas, 8 hooks; galeria dos 12 templates registrados em `src/pages/magazine/components/templates/TemplateRegistry.ts` |
| `/magazine/:id` | `MagazineEditorPage` | `tools-routes.tsx:61` | `PR`+`PAL` — **sem guard de UUID** | 🟨 | Página real (449 linhas, 12 hooks). Falta: `:id` não é validado; ver A.3. Módulo tem histórico de React #310 (teste dedicado em `src/pages/magazine/__tests__/MagazineEditorPage.hooksOrder.test.tsx`) |
| `/magazine/:id/print` | `MagazinePrintPage` | `tools-routes.tsx:62` | `PR`+`PAL` | ✅ | 82 linhas; `magazineService.get(id)` (`MagazinePrintPage.tsx:28`) |
| `/magazine/print` | `MagazinePrintPage` (sem `:id`) | `tools-routes.tsx:63` | `PR`+`PAL` | ✅ | Mesma página; caminho alternativo por `?token=` — `magazineService.getPublicByToken(token)` (`MagazinePrintPage.tsx:29`). Declarada **depois** de `/magazine/:id` (linha 61), mas react-router v6 ranqueia segmento estático acima de dinâmico, então resolve corretamente |
| `/promoflix-playground` | `PromoFlixPlayground` | `tools-routes.tsx:64` | `PR`+`PAL` | 🟨 | 134 linhas. **O que falta: dado real.** É playground de QA com stream público hardcoded (`PromoFlixPlayground.tsx:28` → `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`) e badge "QA Mode" (`:20`). Nenhuma integração com o catálogo |

### A.7 — Home / Clientes / Redirects — `src/routes/client-routes.tsx` (sob `PR` + `PAL`)

| path | componente/página | declaração | guarda | class. | evidência |
|---|---|---|---|---|---|
| `/` | `Index` | `client-routes.tsx:22` | `PR`+`PAL` | ✅ | `src/pages/Index.tsx` 223 linhas, 5 hooks, 2 imports de serviço |
| `/dashboard` | `CustomizableDashboard` | `client-routes.tsx:23` | `PR`+`PAL` | ✅ | 365 linhas, 11 hooks, 3 refs `supabase` |
| `/admin/temas` | `AdminTemasPage` | `client-routes.tsx:26` | **apenas `PR`+`PAL`** — path parece admin mas **não passa por `AdminRoute`** | 🟨 | Decisão declarada em comentário (`client-routes.tsx:25`: "disponível para todos os usuários autenticados"). Página real (224 linhas, 3 hooks). Registro-se como desvio de nomenclatura: prefixo `/admin/` sem guarda de admin |
| `/configuracoes` | → `Navigate` `/admin/usuarios` | `client-routes.tsx:29` | `PR`+`PAL` | ✅ | redirect literal — destino exige admin, então cai no bloqueio do `AdminRoute` |
| `/admin/personalizacao` | → `Navigate` `/admin/cadastros` | `client-routes.tsx:30` | `PR`+`PAL` | ✅ | redirect literal |
| `/cadastro-produtos` | → `Navigate` `/admin/cadastros` | `client-routes.tsx:31` | `PR`+`PAL` | ✅ | redirect literal |
| `/cadastro-gravacao` | → `Navigate` `/admin/cadastros` | `client-routes.tsx:32` | `PR`+`PAL` | ✅ | redirect literal |
| `/comissoes` | `DeprecatedRoute` → `/` | `client-routes.tsx:34-41` | `PR`+`PAL` | ⬛ | módulo descontinuado; só toast + redirect |
| `/clientes` | `ClientsPage` | `client-routes.tsx:44` | `PR`+`PAL` | ✅ | 245 linhas, 9 hooks, 3 imports de serviço |
| `/clientes/:id` | `ClientDetailPage` | `client-routes.tsx:45` | `PR`+`PAL` — sem guard de UUID | ✅ | 97 linhas; consome `useCrmCompany` e `useClientTopProducts` (`ClientDetailPage.tsx:5, 12-13`), com estados de loading e "não encontrado" (`:15-34`) |
| `/perfil` | → `Navigate` `/admin/usuarios` | `client-routes.tsx:48` | `PR`+`PAL` | ✅ | redirect literal |

---

## B) PÁGINAS ÓRFÃS

**Método de prova.** Para cada um dos 169 arquivos `.tsx` não-teste em `src/pages/`, busquei
qualquer importador em `src/`, `e2e/` e `scripts/`, excluindo testes, tanto pelo alias
(`@/pages/...`) quanto por import relativo pelo nome do módulo. Script executado:

```bash
while read -r f; do
  base="${f%.tsx}"; alias="@/${base#src/}"; name=$(basename "$base")
  rg -l --glob '!**/__tests__/**' --glob '!**/*.test.*' --glob '!**/*.spec.*' \
     -F "$alias'" src e2e scripts | grep -v "^$f$"
  rg -l --glob '!**/__tests__/**' --glob '!**/*.test.*' --glob '!**/*.spec.*' \
     -F "$alias\"" src e2e scripts | grep -v "^$f$"
  rg -l --glob '!**/__tests__/**' --glob '!**/*.test.*' \
     "from '(\.{1,2}/)+([A-Za-z0-9_/-]+/)?$name'" src | grep -v "^$f$"
done < pages_nontest.txt
```

**Resultado: 167 dos 169 arquivos têm ao menos um importador de produção. Apenas 2 não têm.**

Nenhum deles é uma *página de rota* — ambos são componentes internos que perderam o consumidor.

### B.1 — `src/pages/magazine/components/MagazineErrorBoundary.tsx` — ⬛ MORTO_OU_ABANDONADO

Prova de ausência de chamador:

```
$ rg -n "MagazineErrorBoundary" src e2e scripts
src/pages/magazine/components/MagazineErrorBoundary.tsx:2   (comentário do próprio arquivo)
src/pages/magazine/components/MagazineErrorBoundary.tsx:15  (exemplo em JSDoc)
src/pages/magazine/components/MagazineErrorBoundary.tsx:17  (exemplo em JSDoc)
src/pages/magazine/components/MagazineErrorBoundary.tsx:39  export class MagazineErrorBoundary
src/lib/telemetry/magazineMetrics.ts:115                    (apenas comentário: "Called from MagazineErrorBoundary.")
```

Nenhuma linha de `import`. Nenhum `<MagazineErrorBoundary>` em JSX fora do próprio JSDoc.
A única menção externa (`src/lib/telemetry/magazineMetrics.ts:115`) é um **comentário**, não uma
chamada. O boundary declarado em `MagazineErrorBoundary.tsx:39` nunca é montado — nenhum caminho de
execução chega nele. O módulo `/magazine/*` roda hoje apenas sob o `EnhancedErrorBoundary` global
(`AppRoutes.tsx` via `App.tsx:100`).

### B.2 — `src/pages/products/seller-carts/CartHeaderActions.tsx` — ⬛ MORTO_OU_ABANDONADO

Prova de ausência de chamador (todas as ocorrências fora do próprio arquivo são **testes** ou
**comentários**):

```
$ rg -n "CartHeaderActions" src e2e scripts
src/pages/products/seller-carts/CartHeaderActions.tsx:2,24,46,60   (o próprio arquivo)
src/pages/products/seller-carts/__tests__/CartHeaderActions.render.test.tsx:12  import { CartHeaderActions } from '../CartHeaderActions';   ← TESTE
src/pages/products/seller-carts/__tests__/CartSidebar.render.test.tsx:7,8,93,98,223,224          ← comentários em TESTE
src/pages/products/seller-carts/__tests__/CartSidebar.loading-isolation.test.tsx:15,16           ← comentários em TESTE
src/pages/products/seller-carts/CartSidebar.tsx:4                  ← COMENTÁRIO, não import
```

`src/pages/products/SellerCartsPage.tsx` (a única página que monta essa área — `product-routes.tsx:39`)
importa `CartActionsMenu` e `CartSidebar`, mas **não** `CartHeaderActions`.
O comentário em `CartSidebar.tsx:4` afirma que o CTA "Gerar Orçamento" *foi movido* para
`CartHeaderActions`, mas o destino nunca foi religado à árvore de render. Existe um teste vivo
(`CartHeaderActions.render.test.tsx`) validando um componente que **nenhuma rota alcança** — o teste
passa e não protege nada em produção.

### B.3 — Falso-positivo checado e descartado

`src/pages/tools/EngravingRegistrationPage.tsx` **não** é órfã, apesar do nome sugerir uma página não
roteada. O `export default` foi removido de propósito (`EngravingRegistrationPage.tsx:79`:
`"Default export removed — only EngravingRegistrationContent is used (via AdminCadastrosPage)"`) e o
named export é consumido em `src/pages/admin/AdminCadastrosPage.tsx:15-19,107`. Classificação: 🟨
apenas quanto à **localização** — vive em `pages/tools/` mas é conteúdo de aba de `/admin/cadastros`;
funcionalmente está plugado.

---

## C) PÁGINAS ESQUELETO / PLACEHOLDER (roteadas, mas sem lógica real completa)

Ordenado por gravidade. As "cascas finas" que apenas delegam a componentes reais **não** entram aqui
— foram verificadas uma a uma e o delegado tem lógica (ver A.5.3 e A.6).

| # | página | rota | class. | o que exatamente falta (evidência) |
|---|---|---|---|---|
| 1 | `src/pages/admin/AdminWorkflowsPage.tsx` | `/admin/workflows` | 🟨 | **Zero persistência.** A página (36 linhas) só monta `WorkflowCanvas` (`AdminWorkflowsPage.tsx:32`). O canvas mantém o workflow em `useState` (`src/components/workflows/WorkflowCanvas.tsx:54,62,63`) e o grep `rg "supabase\|useQuery\|useMutation\|localStorage" src/components/workflows/WorkflowCanvas.tsx` retorna **vazio**. Sair da página perde tudo |
| 2 | `src/pages/tools/CoverageInsightsDashboardPage.tsx` | `/ferramentas/cobertura` | 🟨 | **Dado fictício embutido.** `seedData` com 9 snapshots hardcoded de maio/2026 (`:15-25`) é o estado inicial (`:43`). Zero chamadas a backend no arquivo. Único caminho para dado real é upload manual de JSON (`parseDataset`, `:27-34`). A lógica de agregação (`:45-60`) é real, o insumo não |
| 3 | `src/pages/tools/PriceSimulatorPage.tsx` | `/simulador-precos` | 🟨 | **Metade da tela é inerte.** A aba "Por Tiragem" recebe `productBasePrice={0}` e `onSelectTechnique={() => {}}` (`:58`) — preço-base fixo em zero e callback vazio. A aba "Por Produto" (`:54`, `ProductPriceSimulator`) é real |
| 4 | `src/pages/PromoFlixPlayground.tsx` | `/promoflix-playground` | 🟨 | **Playground de QA em rota de produção.** Stream de teste externo hardcoded (`:28`), badge "QA Mode" no próprio JSX (`:19-21`). Nenhum vínculo com produto/catálogo. 1 hook (`useNavigate`), 0 serviços |
| 5 | `src/pages/admin/AdminDesignTokensPage.tsx` | `/admin/design-tokens` | 🟨 | **Vitrine estática.** 359 linhas mas `rg "useState\|useEffect\|fetch\|supabase"` → **vazio**; imports apenas de UI (`:1-4`). Os tokens exibidos são literais no JSX, não lidos do tema em runtime — pode divergir silenciosamente do tema real |
| 6 | `src/pages/SidebarQAPage.tsx` | `/admin/qa/sidebar` | 🟨 | Página de inspeção visual: 213 linhas, **1 hook, 0 serviço, 0 `supabase`**. Sem camada de dados; utilidade restrita a QA manual. Marcador `todo` presente no arquivo |
| 7 | `src/pages/bi/TrendsPage.tsx` | `/tendencias` | 🟨 | **Modo demo com dados fictícios embarcado na página de produção.** `isDemoMode()` (`src/pages/trends/trends-mock.ts:226-229`) liga com `?demo=1` e substitui KPIs, ranking, buscas e série diária por `MOCK_*` (`TrendsPage.tsx:359-383`). O default é dado real (corrigido em 2026-06-12, `trends-mock.ts:218-225`), então o risco é de leitura equivocada, não de dado falso por padrão. A rota também está desprotegida — ver D |
| 8 | `src/pages/__visual/*` (8 arquivos) | `/__visual/*` | 🟨 | Harnesses com stubs declarados (grep `Stub` em `QuoteViewOrderHarness.tsx`, `QuoteItemEditorSheetHarness.tsx`, `QuoteAddProductButtonHarness.tsx`). **As rotas nem existem em produção** — são condicionais a `import.meta.env.DEV` (`AppRoutes.tsx:20-43`), logo em prod caem no catch-all 404 |
| 9 | `src/pages/dev/*` (8 arquivos) | `/__test/*` | 🟨 | Harnesses de componentes. Diferente dos `__visual/*`, `public-routes.tsx:15-22` usa `lazy()` **sem** gate de DEV → rotas montadas em produção, sem autenticação. Ver D |

**Páginas verificadas e NÃO classificadas como esqueleto** (cascas finas com delegado real, checadas
individualmente): `AdminPromptsIAPage` (→ `MockupPromptManager`, persiste em `mockup_prompt_configs`),
`AdminSegurancaPage` (→ 3 painéis), `AdminSegurancaChavesPage` (→ 6 painéis),
`AdminMigracaoPapeisPage` (→ `RoleMigrationPanel`, 537 linhas), `StockDashboardPage`
(→ `StockDashboard`, 785 linhas + cache-busting próprio), `AdminCadastrosPage` (→ 4 managers),
`NoveltiesPage`, `ReplenishmentsPage`, `KitBuilderPage`, `MagicUp`, `AdminAiUsagePage`,
`ClientComparatorPage`, `ClientDetailPage`, `MagazinePrintPage`.

---

## D) GUARDAS E PROTEÇÃO DE ROTA

### D.1 — Guardas existentes e o que cada uma exige (medido)

| guarda | arquivo:linha | exige |
|---|---|---|
| `ProtectedRoute` | `src/components/layout/ProtectedRoute.tsx:18` | Sessão. Sem `user` → salva destino e `Navigate` `/auth` (`:41-49`). Suporta `requiredRole`/`requireMfa`/`requireDev` via `checkAccess` (`:51-72`) — **mas em `AppRoutes.tsx:175` é usado sem props**, ou seja, só valida "está logado" |
| `AdminRoute` | `src/components/layout/AdminRoute.tsx:40` | `canManage` (`:61-72`) **+ MFA cadastrado** (`:75-86`) **+ sessão AAL2** (`:92-120`). Tem quebra-loop por `isDismissed` (`:100-112`) |
| `DevRoute` | `src/components/layout/DevRoute.tsx:53` | Papel `dev` + MFA AAL2 (paridade com `AdminRoute`, doc em `:40-42`). Registra negativa via `logAccessDenied` (`:105-110`) e emite toast coalescido em janela de 60s (`:82-103`) |
| `ValidProductIdRoute` | `src/routes/guards/ValidProductIdRoute.tsx:11` | `:id` presente, diferente de `"undefined"`/`"null"` e UUID válido; senão `Navigate` `/produtos` (`:13-14`) |
| `ValidQuoteIdRoute` | `src/routes/guards/ValidQuoteIdRoute.tsx:11` | Idem, redirecionando a `/orcamentos` (`:13-14`) |
| `DeprecatedRoute` | `src/components/layout/DeprecatedRoute.tsx:17` | Não é guarda de acesso: toast + `Navigate` (`:19-25`) |

### D.2 — Rotas com guarda de papel/permissão

- **`AdminRoute`** (`canManage` + AAL2): as 19 rotas listadas em **A.5.2** (`admin-routes.tsx:65-116`).
- **`DevRoute`** (papel `dev` + AAL2): as 28 rotas listadas em **A.5.3** (`admin-routes.tsx:119-149`).
- **Guarda de parâmetro (UUID)**: apenas 3 rotas — `/produto/:id` (`product-routes.tsx:29`),
  `/orcamentos/:id/editar` (`quote-routes.tsx:33`), `/orcamentos/:id` (`quote-routes.tsx:41`).

### D.3 — Rotas SEM guarda de papel (apenas sessão) — 60 rotas

Todas as rotas de **A.3 (produtos, 12)**, **A.4 (orçamentos, 8)**, **A.6 (ferramentas, 26)**,
**A.7 (home/clientes, 11)** e mais `/tendencias` (`admin-routes.tsx:64`) estão sob `ProtectedRoute`
**sem `requiredRole`** (`AppRoutes.tsx:175` — nenhuma prop passada). Qualquer usuário autenticado,
inclusive papel `agente`, acessa todas elas.

### D.4 — Achados de proteção que merecem decisão do PO

| # | achado | evidência | por que importa |
|---|---|---|---|
| D-1 | **`/tendencias` está dentro de `admin-routes.tsx` mas FORA do `<AdminRoute>`** | Declarada em `admin-routes.tsx:64`; o wrapper `<Route element={<AdminRoute />}>` só abre em `admin-routes.tsx:65` | Rota de BI num arquivo chamado "admin" leva a supor proteção que não existe. É acessível a qualquer autenticado |
| D-2 | **`/admin/temas` tem prefixo `/admin/` sem `AdminRoute`** | `client-routes.tsx:26`, dentro de `homeAndClientRoutes` (só `PR`+`PAL`) | Intencional e comentado (`client-routes.tsx:25`), mas o prefixo `/admin/` cria expectativa falsa de gate — inclusive para quem for auditar RBAC por padrão de path |
| D-3 | **8 rotas `/__test/*` são montadas em PRODUÇÃO, sem autenticação** | `public-routes.tsx:15-22` usa `lazy()` puro (compare com `AppRoutes.tsx:20-43`, que usa `import.meta.env.DEV ? ... : null` para `/__visual/*`) | Assimetria: os harnesses `__visual` somem no build de produção; os `__test` não. São páginas de QA acessíveis publicamente na produção |
| D-4 | **`/external-db-test` não segue o padrão de path** | `admin-routes.tsx:142` — está sob `DevRoute` (correto), mas o path não tem prefixo `/admin` | Uma auditoria de RBAC que filtre por `path.startsWith('/admin')` classificaria essa rota como desprotegida por engano |
| D-5 | **`:id`/`:cartId` sem validação em 5 rotas** | `/carrinhos/:cartId` (`product-routes.tsx:39`), `/colecoes/:id` (`:42`), `/magazine/:id` (`tools-routes.tsx:61`), `/magazine/:id/print` (`:62`), `/admin/cadastros/produto/:id` (`admin-routes.tsx:73`), `/clientes/:id` (`client-routes.tsx:45`) | Os guards `ValidProductIdRoute`/`ValidQuoteIdRoute` existem justamente porque UUID inválido gera 400 na edge function (JSDoc em `ValidProductIdRoute.tsx:6-10`). As rotas acima não têm essa proteção |
| D-6 | **`ProtectedRoute` suporta RBAC mas é usado sem props** | Capacidade em `ProtectedRoute.tsx:51-72` (`checkAccess` com `requiredRole`/`requireMfa`/`requireDev`); uso em `AppRoutes.tsx:175` é `<ProtectedRoute />` puro | Existe um mecanismo de papel por rota implementado e não utilizado no ponto de montagem principal — todo o RBAC de rota depende exclusivamente de `AdminRoute`/`DevRoute` |

### D.5 — Ordem de precedência (verificada)

`notFoundRoute` é o último `Route` do `<Routes>` (`AppRoutes.tsx:185`), como exige o comentário em
`client-routes.tsx:60`. O catch-all está **fora** do `ProtectedRoute` (`client-routes.tsx:52-58`,
issue #167), então rota inexistente sem sessão mostra 404 em vez de redirecionar para `/login`.
Colisões estático-vs-dinâmico (`/magazine/print` × `/magazine/:id`; `/orcamentos/novo` ×
`/orcamentos/:id`) resolvem pelo ranking de especificidade do react-router v6 — não pela ordem
textual, que nesses casos está invertida (`tools-routes.tsx:61` antes de `:63`).

---

## E) COBERTURA

**Arquivos no escopo: 232.**
(14 em `src/routes/` + 1 `src/App.tsx` + 217 `.tsx` em `src/pages/`)

**Arquivos efetivamente inspecionados (leitura integral do conteúdo): 27.**

- `src/App.tsx` — integral
- `src/routes/AppRoutes.tsx` — integral
- `src/routes/lazy-pages.ts` — integral
- `src/routes/admin-routes.tsx` — integral
- `src/routes/client-routes.tsx` — integral
- `src/routes/product-routes.tsx` — integral
- `src/routes/public-routes.tsx` — integral
- `src/routes/quote-routes.tsx` — integral
- `src/routes/tools-routes.tsx` — integral
- `src/routes/RoutePrefetcher.tsx` — integral
- `src/routes/guards/ValidProductIdRoute.tsx` — integral
- `src/routes/guards/ValidQuoteIdRoute.tsx` — integral
- Guardas fora do escopo estrito, lidas para provar a seção D: `ProtectedRoute.tsx` (integral),
  `DeprecatedRoute.tsx` (integral), `UnauthorizedPage.tsx` (integral), `AdminRoute.tsx` (linhas 1-120),
  `DevRoute.tsx` (linhas 1-120)
- Páginas lidas integralmente (7): `admin/AdminPromptsIAPage.tsx`, `admin/AdminWorkflowsPage.tsx`,
  `admin/AdminMigracaoPapeisPage.tsx`, `admin/AdminSegurancaPage.tsx`,
  `admin/AdminSegurancaChavesPage.tsx`, `admin/StockDashboardPage.tsx`, `tools/PriceSimulatorPage.tsx`
- Páginas lidas parcialmente (9, primeiras ~60 linhas + greps dirigidos):
  `tools/CoverageInsightsDashboardPage.tsx`, `products/ProductMatchPage.tsx`,
  `clients/ClientComparatorPage.tsx`, `products/NoveltiesPage.tsx`,
  `products/ReplenishmentsPage.tsx`, `clients/ClientDetailPage.tsx`, `admin/AdminCadastrosPage.tsx`,
  `PromoFlixPlayground.tsx`, `magazine/MagazinePrintPage.tsx`
- Fora de `src/pages`, lidos para fechar cadeia: `components/workflows/WorkflowCanvas.tsx` (greps),
  `components/admin/MockupPromptManager.tsx` (greps), `components/inventory/StockDashboard.tsx` (greps),
  `pages/trends/trends-mock.ts:215-235`

**Método para os não lidos integralmente (190 arquivos):**

1. **Alcançabilidade (determinística, não amostrada).** Para os 169 arquivos não-teste, executei a
   busca de importadores descrita na seção B em `src/`, `e2e/` e `scripts/`, com testes excluídos.
   Isso é uma medição completa, não amostra: cobre 100% dos arquivos.
2. **Mapa rota→arquivo (determinístico).** Extraí todos os módulos `@/pages/...` referenciados por
   `src/routes/` (`rg -o "@/pages/[A-Za-z0-9_/-]+" src/routes/`) → 110 módulos roteados. Diferença
   contra a lista de arquivos não-teste → 57 subcomponentes + 2 órfãos. Confirmei que **os 110
   possuem `export default`** (loop `rg -q "export default"` → nenhuma falha) e que **os 110 existem
   em disco** (nenhum "ARQUIVO NAO EXISTE" no loop de métricas).
3. **Sonda quantitativa por arquivo (amostragem instrumentada).** Para cada um dos 110 roteados medi:
   linhas (`wc -l`), nº de chamadas de hook (`use[A-Z]\w*\(`), referências a `supabase`, imports de
   `@/services|@/hooks|@/lib/`, e ocorrências de `useQuery|useMutation|useInfiniteQuery`.
4. **Grep de marcadores de esqueleto** em todo `src/pages` (não-teste): `em breve`, `coming soon`,
   `em construção`, `placeholder`, `TODO`, `FIXME`, `mock`, `MOCK_`, `mockData`, `isMock`, `stub`,
   `FAKE`, `dummy`, `não implementado`.
5. **Leitura dirigida** de todo arquivo que a sonda apontou como suspeito (poucas linhas, zero hooks,
   zero serviço, ou marcador positivo) — foi assim que os 9 itens da seção C foram confirmados e que
   `TrendsPage`, `ProductMatchPage`, `MagazineTemplatesGalleryPage` e `MockupGenerator` foram
   **descartados** como falsos positivos de "mock".

**O que NÃO foi feito (declarado):**

- `NAO_VERIFICADO` — **objetos de banco**. Nenhuma consulta a `pg_catalog` do projeto
  `doufsxqlfjyuvxuezpln`. Todo `✅` deste documento prova o fio até a chamada de persistência no
  código, não a existência da tabela/view/RPC. Ver o aviso no topo.
- `NAO_VERIFICADO` — **execução em runtime**. Nada foi renderizado; não rodei `vite`, `vitest` nem
  Playwright. "A rota está declarada e o componente é alcançável" ≠ "a tela abre sem erro".
- `NAO_VERIFICADO` — **conteúdo interno dos 190 arquivos não lidos integralmente**. Uma página com
  800 linhas e 20 hooks pode conter um bloco morto ou um botão inerte que a sonda não captura. As
  classificações `✅` desse grupo são "sem sinal de esqueleto", não "auditado linha a linha".
- `NAO_VERIFICADO` — **`src/components/`**. Muitas páginas são cascas de 30-130 linhas que delegam a
  componentes fora do meu escopo. Verifiquei o delegado apenas nos 4 casos em que a decisão de
  classificação dependia disso (`WorkflowCanvas`, `MockupPromptManager`, `StockDashboard`,
  `RoleMigrationPanel`).
- `NAO_VERIFICADO` — **cobertura E2E real por rota**. Não cruzei `e2e/` com a tabela de rotas.

### E.1 — Classificação de TODOS os 217 arquivos de `src/pages/`

Marcação: **[I]** = lido integralmente · **[P]** = lido parcialmente · **[A]** = classificado por
amostragem instrumentada (sonda quantitativa + grep, sem leitura integral) · **[R]** = classificado
apenas por alcançabilidade (arquivos de teste).

#### Grupo 1 — 110 páginas ROTEADAS

Classificação individual e evidência: ver seção A. Resumo por arquivo:

| # | arquivo | class. | leitura |
|---|---|---|---|
| 1 | `CustomizableDashboard.tsx` | ✅ | [A] |
| 2 | `Index.tsx` | ✅ | [A] |
| 3 | `NotFound.tsx` | ✅ | [A] |
| 4 | `PromoFlixPlayground.tsx` | 🟨 | [P] |
| 5 | `QAPage.tsx` | ✅ | [A] |
| 6 | `SidebarQAPage.tsx` | 🟨 | [A] |
| 7 | `Simulation.tsx` | ✅ | [A] |
| 8 | `__visual/CalendarHarness.tsx` | 🟨 | [A] |
| 9 | `__visual/DatePickerFieldHarness.tsx` | 🟨 | [A] |
| 10 | `__visual/NegotiationMarkupCardHarness.tsx` | 🟨 | [A] |
| 11 | `__visual/PreviewButtonHarness.tsx` | 🟨 | [A] |
| 12 | `__visual/QuoteAddProductButtonHarness.tsx` | 🟨 | [A] |
| 13 | `__visual/QuoteItemEditorSheetHarness.tsx` | 🟨 | [A] |
| 14 | `__visual/QuoteItemsListMobileHarness.tsx` | 🟨 | [A] |
| 15 | `__visual/QuoteViewOrderHarness.tsx` | 🟨 | [A] |
| 16 | `admin/AdminAiUsagePage.tsx` | ✅ | [P] |
| 17 | `admin/AdminCadastrosPage.tsx` | ✅ | [P] |
| 18 | `admin/AdminClientPerformancePage.tsx` | ✅ | [A] |
| 19 | `admin/AdminCloudflareImagesPage.tsx` | ✅ | [A] |
| 20 | `admin/AdminConexoesPage.tsx` | ✅ | [A] |
| 21 | `admin/AdminConexoesStatusPage.tsx` | ✅ | [A] |
| 22 | `admin/AdminDesignTokensPage.tsx` | 🟨 | [A] |
| 23 | `admin/AdminExternalDbPage.tsx` | ✅ | [A] |
| 24 | `admin/AdminLoginAttemptsPage.tsx` | ✅ | [A] |
| 25 | `admin/AdminMigracaoPapeisPage.tsx` | ✅ | [I] |
| 26 | `admin/AdminProductFormPage.tsx` | ✅ | [A] |
| 27 | `admin/AdminPromoverUsuarioPage.tsx` | ✅ | [P] |
| 28 | `admin/AdminPromptsIAPage.tsx` | ✅ | [I] |
| 29 | `admin/AdminRbacRoutesPage.tsx` | ✅ | [A] |
| 30 | `admin/AdminSegurancaAcessoPage.tsx` | ✅ | [A] |
| 31 | `admin/AdminSegurancaChavesPage.tsx` | ✅ | [I] |
| 32 | `admin/AdminSegurancaPage.tsx` | ✅ | [I] |
| 33 | `admin/AdminTelemetriaPage.tsx` | ✅ | [A] |
| 34 | `admin/AdminTemasPage.tsx` | 🟨 (guarda) | [A] |
| 35 | `admin/AdminUsuariosPage.tsx` | ✅ | [A] |
| 36 | `admin/AdminV4CallbacksPage.tsx` | ✅ | [A] |
| 37 | `admin/AdminVideoVariantsPage.tsx` | ✅ | [A] |
| 38 | `admin/AdminWorkflowsPage.tsx` | 🟨 | [I] |
| 39 | `admin/DevChallengeExamplesPage.tsx` | ✅ | [A] |
| 40 | `admin/DiscountRequestDetailPage.tsx` | ✅ | [A] |
| 41 | `admin/EmaHealthPage.tsx` | ✅ | [A] |
| 42 | `admin/IntelligenceBadgeSettingsPage.tsx` | ✅ | [A] |
| 43 | `admin/KitTemplatesAdminPage.tsx` | ✅ | [A] |
| 44 | `admin/KitTemplatesMetricsPage.tsx` | ✅ | [A] |
| 45 | `admin/ObservabilityDashboard.tsx` | ✅ | [A] |
| 46 | `admin/OwnershipAuditAdminPage.tsx` | ✅ | [A] |
| 47 | `admin/PermissionsPage.tsx` | ✅ | [A] |
| 48 | `admin/PriceFreshnessSettings.tsx` | ✅ | [A] |
| 49 | `admin/RlsDenialsAdminPage.tsx` | ✅ | [A] |
| 50 | `admin/RolePermissionsPage.tsx` | ✅ | [A] |
| 51 | `admin/RolesPage.tsx` | ✅ | [A] |
| 52 | `admin/SellerDiscountLimitsAdminPage.tsx` | ✅ | [A] |
| 53 | `admin/StockDashboardPage.tsx` | ✅ | [I] |
| 54 | `admin/StorageTestPage.tsx` | ✅ | [A] |
| 55 | `auth/Auth.tsx` | ✅ | [A] |
| 56 | `auth/ForgotPasswordConfirmation.tsx` | ✅ | [A] |
| 57 | `auth/PrivacyPage.tsx` | ✅ | [A] |
| 58 | `auth/ResetPassword.tsx` | ✅ | [A] |
| 59 | `auth/SSOCallbackPage.tsx` | ✅ | [A] |
| 60 | `auth/TermsPage.tsx` | ✅ | [A] |
| 61 | `bi/BusinessIntelligencePage.tsx` | ✅ | [A] |
| 62 | `bi/CommercialIntelligencePage.tsx` | ✅ | [A] |
| 63 | `bi/TrendsPage.tsx` | 🟨 | [P] |
| 64 | `clients/ClientComparatorPage.tsx` | ✅ | [P] |
| 65 | `clients/ClientDetailPage.tsx` | ✅ | [P] |
| 66 | `clients/ClientsPage.tsx` | ✅ | [A] |
| 67 | `collections/CollectionDetailPage.tsx` | 🟨 (guarda `:id`) | [A] |
| 68 | `collections/CollectionsPage.tsx` | ✅ | [A] |
| 69 | `dev/AlertDialogHarness.tsx` | 🟨 | [A] |
| 70 | `dev/CnpjFormHarness.tsx` | 🟨 | [A] |
| 71 | `dev/ColorSwatchesHarness.tsx` | 🟨 | [A] |
| 72 | `dev/ConfirmDialogHarness.tsx` | 🟨 | [A] |
| 73 | `dev/DialogHarness.tsx` | 🟨 | [A] |
| 74 | `dev/MagazineRingHarness.tsx` | 🟨 | [A] |
| 75 | `dev/TabSkipHarness.tsx` | 🟨 | [A] |
| 76 | `dev/UndoToastHarness.tsx` | 🟨 | [A] |
| 77 | `kit-builder/KitBuilderPage.tsx` | ✅ | [P] |
| 78 | `kit-builder/KitLibraryPage.tsx` | ✅ | [A] |
| 79 | `magazine/MagazineEditorPage.tsx` | 🟨 (guarda `:id`) | [A] |
| 80 | `magazine/MagazineListPage.tsx` | ✅ | [A] |
| 81 | `magazine/MagazinePrintPage.tsx` | ✅ | [P] |
| 82 | `magazine/PublicMagazineView.tsx` | ✅ | [A] |
| 83 | `magazine/templates-gallery/MagazineTemplatesGalleryPage.tsx` | ✅ | [A] |
| 84 | `mockups/MockupGenerator.tsx` | ✅ | [A] |
| 85 | `mockups/MockupHistoryPage.tsx` | ✅ | [A] |
| 86 | `products/CartsListPage.tsx` | ✅ | [A] |
| 87 | `products/ComparePage.tsx` | ✅ | [A] |
| 88 | `products/FavoritesPage.tsx` | ✅ | [A] |
| 89 | `products/FiltersPage.tsx` | ✅ | [A] |
| 90 | `products/NoveltiesPage.tsx` | ✅ | [P] |
| 91 | `products/ProductDetail.tsx` | ✅ | [A] |
| 92 | `products/ProductMatchPage.tsx` | ✅ | [P] |
| 93 | `products/ReplenishmentsPage.tsx` | ✅ | [P] |
| 94 | `products/SellerCartsPage.tsx` | 🟨 (guarda `:cartId`) | [A] |
| 95 | `quotes/QuoteBuilderPage.tsx` | ✅ | [A] |
| 96 | `quotes/QuoteViewPage.tsx` | ✅ | [A] |
| 97 | `quotes/QuotesDashboardPage.tsx` | ✅ | [P] |
| 98 | `quotes/QuotesKanbanPage.tsx` | ✅ | [A] |
| 99 | `quotes/QuotesListPage.tsx` | ✅ | [A] |
| 100 | `system/ExternalDatabaseTest.tsx` | ✅ | [A] |
| 101 | `system/RateLimitDashboardPage.tsx` | ✅ | [A] |
| 102 | `system/SystemStatusPage.tsx` | ✅ | [A] |
| 103 | `tools/AdvancedPriceSearchPage.tsx` | ✅ | [P] |
| 104 | `tools/CoverageInsightsDashboardPage.tsx` | 🟨 | [P] |
| 105 | `tools/DropboxBrowserPage.tsx` | ✅ | [P] |
| 106 | `tools/MagicUp.tsx` | ✅ | [P] |
| 107 | `tools/OptimizedImageDemo.tsx` | ✅ | [A] |
| 108 | `tools/PriceSimulatorPage.tsx` | 🟨 | [I] |
| 109 | `tools/SimuladorWizard.tsx` | ✅ | [A] |
| 110 | `tools/VisualSearchPage.tsx` | ✅ | [A] |

#### Grupo 2 — 57 subcomponentes de página (não roteados, COM importador verificado) — ✅ alcançáveis

Todos classificados **✅ quanto a alcançabilidade** (existe caminho de execução a partir de uma rota),
por **[A]** (importador provado pelo script da seção B; conteúdo não auditado — ver "O que NÃO foi
feito"). Importador de cada um listado abaixo.

`admin/ai-usage/AiCharts.tsx`, `admin/ai-usage/AiQuotaManager.tsx`, `admin/ai-usage/AiSummaryCard.tsx`,
`admin/ai-usage/AiTables.tsx`, `admin/ai-usage/MarketIntelInsightsUsagePanel.tsx`
← `admin/AdminAiUsagePage.tsx` (rota `/admin/consumo-ia`)

`admin/telemetry/TelemetrySkeletons.tsx` ← `admin/AdminTelemetriaPage.tsx` (`/admin/telemetria`)

`advanced-price-search/ResultViews.tsx` ← `tools/AdvancedPriceSearchPage.tsx` (`/busca-preco`)

`auth/AuthBranding.tsx` ← 6 páginas de auth · `auth/StarfieldCanvas.tsx` ← `auth/AuthBranding.tsx`

`magazine/components/BrandColorPicker.tsx`, `magazine/components/MagazineClientPicker.tsx`
← `magazine/components/steps/IdentityStep.tsx`
`magazine/components/EditorHero.tsx`, `magazine/components/PreviewSidebar.tsx`
← `magazine/MagazineEditorPage.tsx`
`magazine/components/KeyboardHelpOverlay.tsx`, `magazine/components/MagazineMiniMap.tsx`,
`magazine/components/PublicMagazineToc.tsx` ← `magazine/PublicMagazineView.tsx`
`magazine/components/MagazineCardThumbnail.tsx` ← `magazine/MagazineListPage.tsx`
`magazine/components/MagazinePageRenderer.tsx` ← 5 consumidores
`magazine/components/VariantColorSelect.tsx` ← `magazine/components/steps/ProductsStep.tsx`
`magazine/components/steps/ContentStep.tsx`, `.../DesignStep.tsx`, `.../IdentityStep.tsx`,
`.../LayoutStep.tsx`, `.../ProductsStep.tsx` ← `magazine/MagazineEditorPage.tsx`
`magazine/components/templates/chrome.tsx` ← 14 consumidores
`magazine/components/templates/catalog/{GiftSetShowcase,Grid2x3,Grid3x3,List}Template.tsx`,
`.../corporate/{CorporateExecutive,CorporateHero,CorporateSplit}Template.tsx`,
`.../editorial/{EditorialManifesto,HeroGrid,Magazine,Mono,Vogue}Template.tsx`
← `magazine/components/templates/TemplateRegistry.ts` (12 templates)
`magazine/templates-gallery/TemplateCard.tsx`, `.../TemplatePreviewDialog.tsx`
← `MagazineTemplatesGalleryPage.tsx` + `templates-gallery/index.ts`
`magazine/templates-gallery/TemplatePreviewBoundary.tsx` ← `TemplatePreviewDialog.tsx`, `TemplateCard.tsx`
`magazine/utils/categoryIcons.tsx` ← `magazine/components/MagazinePageRenderer.tsx`

`magic-up/MagicUpConfigPanel.tsx`, `magic-up/MagicUpResultPanel.tsx` ← `tools/MagicUp.tsx` (`/magic-up`)

`mockups/mockup-generator/{MockupDialogs,MockupEmptyState,MockupTechniqueHandlers,MockupToolbar}.tsx`
← `mockups/MockupGenerator.tsx` (`/mockup-generator`)

`products/product-detail/ProductDetailHero.tsx` ← `products/ProductDetail.tsx` (`/produto/:id`)
`products/product-match/{MatchCards,MatchFiltersPanel,ProductSearchPanel}.tsx`
← `products/ProductMatchPage.tsx` (`/match`)
`products/seller-carts/CartActionsMenu.tsx`, `products/seller-carts/CartSidebar.tsx`
← `products/SellerCartsPage.tsx` (`/carrinhos/:cartId`)

`quotes/components/DeliveryModeToggle.tsx` ← `quotes/QuoteBuilderPage.tsx`

`tools/EngravingRegistrationPage.tsx` ← `admin/AdminCadastrosPage.tsx:15-19` (named export
`EngravingRegistrationContent`; ver B.3) — 🟨 quanto a **localização**, ✅ quanto a alcançabilidade

`trends/TrendsCharts.tsx`, `trends/TrendsKpiCards.tsx` ← `bi/TrendsPage.tsx` (`/tendencias`)

#### Grupo 3 — 2 arquivos ÓRFÃOS — ⬛ MORTO_OU_ABANDONADO

| arquivo | class. | leitura |
|---|---|---|
| `magazine/components/MagazineErrorBoundary.tsx` | ⬛ | [A] — prova em B.1 |
| `products/seller-carts/CartHeaderActions.tsx` | ⬛ | [A] — prova em B.2 |

#### Grupo 4 — 48 arquivos de TESTE em `src/pages/` — não classificáveis como página

`__tests__/FiltersPage.no-duplicate-sidebar.test.tsx` · `__tests__/QuoteBuilderDeliveryTooltip.test.tsx` ·
`__tests__/SSOCallbackPage.test.tsx` · `auth/AuthBranding.test.tsx` · `auth/AuthBranding.visual.test.tsx` ·
`auth/__tests__/Auth.test.tsx` · `auth/__tests__/ResetPassword.test.tsx` ·
`auth/__tests__/ResetPassword.updatePassword.test.tsx` · `auth/__tests__/auth-render.test.tsx` ·
`filters/__tests__/FiltersPage.logic.test.tsx` · `filters/__tests__/FiltersPage.minStock.test.tsx` ·
`filters/__tests__/FiltersPage.sorting.test.tsx` ·
`magazine/__tests__/MagazineEditorPage.hooksOrder.test.tsx` ·
`magazine/components/__tests__/EditorHero.test.tsx` ·
`magazine/components/__tests__/PreviewSidebar.empty.test.tsx` ·
`magazine/components/steps/__tests__/DesignStep.test.tsx` ·
`magazine/templates-gallery/__tests__/gallery.test.tsx` ·
`products/__tests__/CartNotesLeakGuards.test.tsx` ·
`products/seller-carts/__tests__/CartActionsMenu.test.tsx` ·
**`products/seller-carts/__tests__/CartHeaderActions.render.test.tsx`** ← 🟦 testa o órfão B.2 ·
`products/seller-carts/__tests__/CartSidebar.loading-isolation.test.tsx` ·
`products/seller-carts/__tests__/CartSidebar.render.test.tsx` ·
`products/seller-carts/__tests__/CartStatusSelect.contract.test.tsx` ·
`products/seller-carts/__tests__/CartStatusSelect.emptyCart.test.tsx` ·
`products/seller-carts/__tests__/CartStatusSelect.fuzz.test.tsx` ·
`products/seller-carts/__tests__/CartStatusSelect.test.tsx` ·
`products/seller-carts/__tests__/CartStatusSelect.timeout.test.tsx` ·
`products/seller-carts/__tests__/useMidnightReset.test.tsx` · `quotes/QuoteBuilder.e2e.test.tsx` ·
`quotes/__tests__/QuoteConditions.delivery-freight-left-align.test.tsx` ·
`quotes/__tests__/QuoteConditions.stable-testids.test.tsx` ·
`quotes/__tests__/QuoteConditions.viewports.test.tsx` ·
`quotes/__tests__/QuoteViewPage.preview-breath.test.tsx` ·
`quotes/__tests__/QuoteViewPage.preview-keyboard.test.tsx` ·
`quotes/__tests__/QuotesListPage.deleteDisabled.test.tsx` ·
`quotes/__tests__/QuotesListPage.fab.focus.test.tsx` · `quotes/__tests__/QuotesListPage.fab.test.tsx` ·
`quotes/__tests__/QuotesListPage.layout.test.tsx` · `quotes/__tests__/QuotesListPage.render.test.tsx` ·
`quotes/__tests__/quote-builder-freight-block-fuzz.test.tsx` ·
`quotes/__tests__/quote-builder-freight-block-hierarchy.rtl.test.tsx` ·
`quotes/__tests__/quote-builder-freight-block.rtl.test.tsx` ·
`quotes/__tests__/useQuotesListPage.bulkDelete.test.tsx` ·
`quotes/__tests__/useQuotesListPage.duplicateUndo.test.tsx` ·
`quotes/__tests__/useQuotesListPage.singleDelete.test.tsx` ·
`quotes/__tests__/useQuotesListPage.urlState.test.tsx` ·
`quotes/components/__tests__/DeliveryLabelWithToggle.contract.test.tsx` ·
`quotes/components/__tests__/DeliveryModeToggle.test.tsx`

Todos **[R]** (classificados apenas por natureza de arquivo). Contagem: 110 + 57 + 2 + 48 = **217** ✓

### E.2 — Arquivos de `src/routes/` (14) — classificação

| arquivo | class. | evidência |
|---|---|---|
| `AppRoutes.tsx` | ✅ | montado em `src/App.tsx:112`; 131 rotas resolvidas |
| `lazy-pages.ts` | ✅ | 110 exports consumidos pelos 6 arquivos de grupo de rota |
| `admin-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:9,179` |
| `client-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:10,181,185` |
| `product-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:11,177` |
| `public-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:12,124` |
| `quote-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:13,178` |
| `tools-routes.tsx` | ✅ | consumido em `AppRoutes.tsx:14,180` |
| `guards/ValidProductIdRoute.tsx` | ✅ | usado em `product-routes.tsx:14,29` |
| `guards/ValidQuoteIdRoute.tsx` | ✅ | usado em `quote-routes.tsx:9,33,41` |
| `RoutePrefetcher.tsx` | ✅ | montado em `src/App.tsx:19,109`; prefetch condicional real (`RoutePrefetcher.tsx:60-118`), respeita `saveData`/2G (`:21-26`) e limita anônimo ao chunk de Auth (`:64-69`) |
| `AppRoutes.transition.test.tsx` | — | teste |
| `RoutePrefetcher.test.tsx` | — | teste |
| `guards/ValidProductIdRoute.test.tsx` | — | teste |

`src/App.tsx` — ✅ (127 linhas; encadeamento de providers verificado linhas 83-124; `AppRoutes` em `:112`).

---

## RESUMO EXECUTIVO

| indicador | valor |
|---|---|
| Rotas declaradas | **131** |
| Rotas com guarda de papel (`AdminRoute`/`DevRoute`) | **47** (19 admin + 28 dev) |
| Rotas com apenas sessão (`ProtectedRoute` sem props) | **60** |
| Rotas sem nenhuma autenticação | **19** (10 auth/públicas legítimas + 8 `/__test/*` + `/debug/images`) + o catch-all `*` |
| Rotas condicionais a build DEV | **8** (`/__visual/*`) |
| Rotas que são só redirect/deprecação | **15** (11 `Navigate` + 4 `DeprecatedRoute`) |
| Rotas com validação de parâmetro `:id` | **3** de 9 rotas com parâmetro |
| Páginas roteadas ✅ | **89** |
| Páginas roteadas 🟨 | **21** |
| Arquivos órfãos ⬛ | **2** |
| Rotas ⬛ (descontinuadas) | **4** |

**Três coisas para decidir primeiro:**

1. **`/__test/*` em produção sem auth** (D-3). Assimetria clara contra o padrão já adotado em
   `/__visual/*`. É a única constatação com superfície de exposição pública real.
2. **`/admin/workflows` não salva nada** (C-1). A tela sugere que configura automações; o estado morre
   no unmount. Ou liga persistência, ou some da navegação.
3. **`/tendencias` fora do `AdminRoute` apesar de morar em `admin-routes.tsx`** (D-1). Não é bug de
   execução, é armadilha de leitura — a próxima pessoa que auditar RBAC por arquivo vai errar.

---
*Documento gerado por auditoria somente-leitura. Nenhum arquivo do projeto foi modificado além deste.*
