# 14 — LACUNAS DE COBERTURA (buracos de costura dos lotes 01–13)

> **Escopo desta auditoria:** fechar apenas os arquivos que o fatiamento em 13 lotes deixou
> sem atribuição. Não revisa, não corrige e não contradiz por edição nenhum documento
> `01..13` — divergências encontradas estão registradas na seção **F**, como linhas de relatório.
>
> **Método:** somente leitura do código. `README.md`, `STATUS.md`, `CLAUDE.md` e `docs/*.md`
> **não** foram usados como fonte de verdade. Toda afirmação abaixo carrega evidência
> `caminho/arquivo:LINHA` verificada nesta sessão. Onde não foi possível verificar,
> está escrito `NAO_VERIFICADO`.
>
> **Nenhum SQL de `qa/migrations-draft/` foi executado.** Nenhuma migration, DDL ou deploy.
>
> Data: 2026-08-16 · Legenda: ✅ IMPLEMENTADO_TOTAL · 🟨 PARCIAL · 🟦 SUGERIDO_OU_INICIADO · ⬛ MORTO_OU_ABANDONADO

---

## A) BLOCO A — `src/components`: 17 subdiretórios + 3 arquivos de raiz

**Contagem medida:** os 17 subdiretórios contêm **43 arquivos**; somados os **3 de raiz**
nomeados no escopo, são **46**. Existe ainda um 47º arquivo na raiz não nomeado no escopo
(`src/components/ThemeInitializer.test.tsx`, 53 linhas) — incluído no fim da tabela para não
reabrir o mesmo buraco.

Comando de contagem:

```
$ for d in a11y access audit clients dev goals materials mobile navigation onboarding \
    presentation providers ramo-atividade reports seo settings word-magic; do \
    find src/components/$d -type f; done | wc -l
43
```

### A.1 — Tabela dos 46 (+1)

| # | Arquivo | Linhas | O que é | Consumidores (arquivo:linha) | Persistência | Classe |
|---|---|---|---|---|---|---|
| 1 | `src/components/a11y/AccessibilityProvider.tsx` | 249 | Provider de contexto a11y: `useA11y`, `useFocusTrap`, `useKeyboardShortcut`, `SkipToContent` | `src/App.tsx:12` (import), `src/App.tsx:88` (monta), `src/components/a11y/index.ts:3` | nenhuma (sem `.from/.rpc/localStorage`) | ✅ |
| 2 | `src/components/a11y/AriaLive.tsx` | 241 | Regiões ARIA-live: `AriaLiveProvider`, `useAriaLive`, `RouteAnnouncer`, 4 announcers | `src/App.tsx:12`, `src/components/notifications/NotificationDrawer.tsx:38`, `src/hooks/intelligence/useMagicUpState.ts:12`, `src/components/common/ScrollToTopButton.tsx:5` | nenhuma | ✅ |
| 3 | `src/components/a11y/VisuallyHidden.tsx` | 50 | `VisuallyHidden`, `LiveRegion`, `LoadingAnnouncer` (sr-only) | `src/components/products/VariantPickerDialog.tsx:17,90`, `src/components/loading/LoadingOverlay.tsx:3` (via barrel) | nenhuma | ✅ |
| 4 | `src/components/a11y/index.ts` | 17 | Barrel do módulo a11y (3 blocos de re-export) | `src/App.tsx:12`, `src/components/loading/LoadingOverlay.tsx:3`, `src/components/common/ScrollToTopButton.tsx:5`, `src/hooks/intelligence/useMagicUpState.ts:12` | n/a | ✅ |
| 5 | `src/components/access/DevAccessDeniedPage.tsx` | 426 | Página 403 para rotas `dev`, com telemetria e formulário de solicitação de acesso | `src/components/layout/DevRoute.tsx:7,174` | indireta — `recordDevRouteTelemetry` (`:2`); sem `.from()` no arquivo | ✅ |
| 6 | `src/components/access/UnauthorizedPage.tsx` | 108 | Página `/unauthorized` com `securityId` gerado | `src/routes/lazy-pages.ts:15-16` → `src/routes/public-routes.tsx:38` (rota `/unauthorized`) | nenhuma | ✅ |
| 7 | `src/components/audit/AuditHistory.tsx` | 320 | Timeline de histórico de auditoria por entidade | `src/pages/admin/AdminProductFormPage.tsx:38-39` (lazy), `:688` (render); barrel `src/components/audit/index.ts:1` | leitura: `untypedFrom<AuditLogEntry>('audit_log')` em `src/hooks/admin/useAuditLog.ts:209` | ✅ |
| 8 | `src/components/audit/AuditReport.tsx` | 138 | Card que dispara a edge function `audit-suite` e renderiza o resultado | **nenhum** — ver seção D | escrita/execução: `invokeEdge('audit-suite')` em `src/components/audit/AuditReport.tsx:28` | ⬛ |
| 9 | `src/components/audit/__tests__/AuditHistory.a11y.test.tsx` | 101 | Teste de acessibilidade do `AuditHistory` (semântica `<ol>/<li>`, teclado) | runner Vitest (arquivo `*.test.tsx`) | nenhuma | ✅ |
| 10 | `src/components/audit/index.ts` | 1 | Barrel exportando só `AuditHistory` | **nenhum** — `grep "components/audit'"` vazio; consumidores importam o caminho direto | n/a | ⬛ (barrel órfão) |
| 11 | `src/components/clients/ClientCard.tsx` | 87 | Card de listagem de empresa/cliente CRM | `src/pages/clients/ClientsPage.tsx:10,27` | nenhuma (recebe `client` por prop) | ✅ |
| 12 | `src/components/clients/ClientDetailHeader.tsx` | 87 | Cabeçalho da página 360° do cliente | `src/pages/clients/ClientDetailPage.tsx:6,48` | nenhuma | ✅ |
| 13 | `src/components/dev/BridgeMetricsOverlay.tsx` | 36 | Overlay de métricas do bridge (default export) | `src/components/dev/DevOnlyBridgeOverlay.tsx:4,13` (lazy) | nenhuma; dados via `useBridgeMetrics` (`:1`) | ✅ |
| 14 | `src/components/dev/DevOnly.tsx` | 40 | Guard de render por `useDevGate` (modo `strict` opcional) | `src/components/errors/EnhancedErrorBoundary.tsx:18,404,471` | nenhuma (menciona `localStorage` só em comentário, `:5` e `:12`) | ✅ |
| 15 | `src/components/dev/DevOnlyBridgeOverlay.tsx` | 16 | Wrapper que monta o overlay apenas com `isDev` | **apenas testes** (`src/components/dev/__tests__/DevOnlyBridgeOverlay.test.tsx:7`) — ver D | nenhuma | 🟨 |
| 16 | `src/components/dev/DiagnosticProfiler.tsx` | 73 | Wrapper `<Profiler>` do React para medir render | `src/pages/mockups/MockupGenerator.tsx:27,229`, `src/pages/mockups/MockupHistoryPage.tsx:24,109` | nenhuma | ✅ |
| 17 | `src/components/dev/__tests__/BridgeMetricsOverlay.test.tsx` | 80 | Teste do overlay | runner Vitest | nenhuma | ✅ |
| 18 | `src/components/dev/__tests__/DevOnly.test.tsx` | 60 | Teste do guard (4 casos incl. `strict`) | runner Vitest | nenhuma | ✅ |
| 19 | `src/components/dev/__tests__/DevOnlyBridgeOverlay.test.tsx` | 39 | Teste de gate por role dev | runner Vitest | nenhuma | ✅ |
| 20 | `src/components/dev/metrics/BridgeMetricsSummary.tsx` | 42 | Sumário numérico (avg/p95/bytes) do overlay | `src/components/dev/BridgeMetricsOverlay.tsx:2,33` | nenhuma | ✅ |
| 21 | `src/components/dev/metrics/MetricUtils.ts` | 14 | `latencyClass()` e `formatBytes()` | `src/components/dev/metrics/BridgeMetricsSummary.tsx:2,24,30` | nenhuma | ✅ |
| 22 | `src/components/goals/SalesGoalsCard.tsx` | 300 | Card CRUD de metas de vendas (dialog de criação, progresso, badges) | **nenhum** — ver seção D | via `useSalesGoals`: `untypedFrom('sales_goals')` em `src/hooks/intelligence/useSalesGoals.ts:68,90,114,159,178,213` | ⬛ |
| 23 | `src/components/materials/MaterialBadge.tsx` | 53 | Badge de material — wrapper fino de `EntityBadge` | `src/components/admin/products/ProductMaterialsSection.tsx:11,289`, `src/components/filters/filter-panel/sections/MaterialsFilter.tsx:8,67,83` | nenhuma | ✅ |
| 24 | `src/components/mobile/MobileProductActions.tsx` | 151 | Barra de ações fixa mobile no detalhe de produto | `src/pages/products/ProductDetail.tsx:58,463` | nenhuma | ✅ |
| 25 | `src/components/mobile/SmartMobileNav.tsx` | 241 | Navegação inferior mobile com prefetch de rotas | `src/components/layout/GlobalOverlay.tsx:11-12,50` (lazy) → `src/components/layout/MainLayout.tsx:28,96` | nenhuma | ✅ |
| 26 | `src/components/mobile/index.ts` | 1 | Barrel exportando `SmartMobileNav` | **nenhum** — o consumidor usa o caminho direto (`GlobalOverlay.tsx:12`) | n/a | ⬛ (barrel órfão) |
| 27 | `src/components/navigation/Breadcrumbs.tsx` | 161 | Trilha de navegação com filtro de rotas restritas por role | `src/components/layout/PageHeader.tsx:2,25` | nenhuma; usa `canNavigateTo`/`isDevOnlyPath` (`:6`) | ✅ |
| 28 | `src/components/onboarding/OnboardingTour.tsx` | 254 | Tour guiado passo a passo (framer-motion + navegação) | `src/components/layout/GlobalOverlay.tsx:5-6,41` (lazy) → `MainLayout.tsx:96` | estado em `useOnboardingContext` (`:5`) — sem `.from()` neste arquivo | ✅ |
| 29 | `src/components/onboarding/RestartTourButton.tsx` | 36 | Botão para reiniciar o tour | **nenhum** — só o barrel `index.ts:3`, que também não tem consumidor. Ver D | via `useOnboardingContext` (`:5`) | ⬛ |
| 30 | `src/components/onboarding/index.ts` | 3 | Barrel `OnboardingTour` + `RestartTourButton` | **nenhum** — `grep "components/onboarding'"` vazio | n/a | ⬛ (barrel órfão) |
| 31 | `src/components/presentation/PresentationMode.tsx` | 377 | Slideshow fullscreen para orçamentos/coleções (oculta preços/menus) | `src/components/collections/CollectionPresentationLauncher.tsx:7-9,42` → `src/pages/collections/CollectionDetailPage.tsx:38,705` | nenhuma | ✅ |
| 32 | `src/components/providers/AppBootstrap.tsx` | 68 | Shell global: consulta modo de manutenção e troca a árvore por tela de manutenção | `src/App.tsx:10,98` | **sim** — `.from('system_settings')` em `src/components/providers/AppBootstrap.tsx:20` (`.eq('key','maintenance_mode')`, `:22`) | ✅ |
| 33 | `src/components/providers/AppProviders.tsx` | 33 | Composição da árvore de contextos de domínio — detalhe em **A.2** | `src/routes/AppRoutes.tsx:51-52` (lazy), `:60` (monta) | nenhuma | ✅ |
| 34 | `src/components/providers/MotionProvider.tsx` | 25 | `LazyMotion` com features `domMax` carregadas sob demanda | `src/App.tsx:11,99` | nenhuma | ✅ |
| 35 | `src/components/ramo-atividade/RamoAtividadeBadge.tsx` | 63 | Badge de ramo de atividade — wrapper de `EntityBadge` | `src/components/filters/filter-panel/sections/RamosFilter.tsx:5,61,86` | nenhuma | ✅ |
| 36 | `src/components/ramo-atividade/RamoAtividadeGroupAccordion.tsx` | 270 | Acordeão de grupos de ramo com segmentos filhos | `src/components/filters/filter-panel/sections/RamosFilter.tsx:6,156` | nenhuma | ✅ |
| 37 | `src/components/ramo-atividade/SegmentoCheckbox.tsx` | 61 | Checkbox de segmento dentro do acordeão | `src/components/ramo-atividade/RamoAtividadeGroupAccordion.tsx:6,101,245` | nenhuma | ✅ |
| 38 | `src/components/ramo-atividade/index.ts` | 4 | Barrel dos 3 componentes de ramo | **nenhum** — `RamosFilter.tsx:5-6` importa por caminho direto | n/a | ⬛ (barrel órfão) |
| 39 | `src/components/reports/ScheduledReportsManager.tsx` | 281 | CRUD de relatórios agendados — detalhe em **A.3** | `src/pages/CustomizableDashboard.tsx:24,240` → rota `/dashboard` (`src/routes/client-routes.tsx:23`) | **sim, indireta** — `useScheduledReports` grava em `scheduled_reports` (`src/hooks/intelligence/useScheduledReports.ts:58,81,110,124`) | 🟨 |
| 40 | `src/components/seo/PageSEO.tsx` | 72 | `<Helmet>` padronizado (title/description/canonical) | 20+ páginas, ex.: `src/pages/admin/RolePermissionsPage.tsx:13,230`, `src/pages/admin/ObservabilityDashboard.tsx:15,44`, `src/pages/admin/AdminExternalDbPage.tsx:26,161`; contrato testado em `src/tests/AdminStandardRules.test.tsx:109,178` | nenhuma | ✅ |
| 41 | `src/components/settings/theme/BorderRadiusControl.tsx` | 139 | Slider de raio de borda do tema | `src/pages/admin/AdminTemasPage.tsx:18,216` | nenhuma | ✅ |
| 42 | `src/components/settings/theme/PresetCard.tsx` | 131 | Card de preset de tema com preview | `src/pages/admin/AdminTemasPage.tsx:17,171,204` | nenhuma | ✅ |
| 43 | `src/components/settings/theme/ThemeResetDialog.tsx` | 36 | Diálogo de confirmação de reset do tema | `src/pages/admin/AdminTemasPage.tsx:20,146` | nenhuma | ✅ |
| 44 | `src/components/word-magic/WordMagicBadge.tsx` | 34 | Badge "✨ IA" no `ProductCard` | `src/components/products/ProductCard.tsx:87,686` | nenhuma | ✅ |
| 45 | `src/components/ThemeInitializer.tsx` | 56 | Aplica o tema no `<html>` a partir do `ThemeContext` no boot | `src/App.tsx:16,86`; teste estrutural em `src/tests/NavigationStructure.test.tsx:53,78` | nenhuma neste arquivo (delega ao `ThemeContext`, `:2`) | ✅ |
| 46 | `src/components/RoleBadge.tsx` | 32 | Badge canônico de role do usuário | `src/components/layout/Header.tsx:49,505,521`, `src/components/admin/users/UserTable.tsx:13,75`, `src/components/admin/users/RoleAuditLogPanel.tsx:42,273,279` | nenhuma | ✅ |
| 47 | `src/components/LoadingScreen.tsx` | 32 | Tela de carregamento full-screen (default export) | **nenhum consumidor de aplicação** — só `tests/components/LoadingScreen.test.tsx:4`. Ver D | nenhuma | ⬛ |
| +1 | `src/components/ThemeInitializer.test.tsx` | 53 | Teste do `ThemeInitializer` (fora da lista nominal do escopo) | runner Vitest | nenhuma | ✅ |

### A.2 — Atenção especial: `src/components/providers/AppProviders.tsx`

**O que monta e em que ordem** (`src/components/providers/AppProviders.tsx:24-31`), de fora para dentro:

```
OrganizationProvider        (:25)  ← src/contexts/OrganizationContext
  └ ProductsProvider        (:26)  ← src/contexts/ProductsContext
      └ CollectionsProvider (:27)  ← src/contexts/CollectionsContext
          └ DevChallengeProvider (:28) ← src/contexts/DevChallengeContext
              └ {children}
```

**Quem o consome:** é carregado sob demanda em `src/routes/AppRoutes.tsx:51-52`
(`lazyWithRetry(() => import('@/components/providers/AppProviders'))`) e envolve as rotas
em `src/routes/AppRoutes.tsx:60-62`. Ou seja, **não** está na raiz de `App.tsx` — é um
segundo anel, interno ao roteador.

**O que fica fora dele, por decisão explícita** (comentário `:19-21`): Auth, Theme,
Accessibility e Query. Verificado no código: `src/App.tsx:86` monta `ThemeInitializer`,
`:88` `AccessibilityProvider`, `:98` `AppBootstrap`, `:99` `MotionProvider` — todos
externos ao `AppProviders`.

**Providers que sumiram:** o cabeçalho (`:5-6`) declara que Comparison, Favorites e
RecentlyViewed migraram para stores Zustand e que os arquivos de contexto exportam
providers no-op por compatibilidade. Isso é afirmação do próprio arquivo — **não** verifiquei
os arquivos de contexto correspondentes (fora do meu escopo): `NAO_VERIFICADO`.

**Classificação:** ✅ IMPLEMENTADO_TOTAL — composição real, carregada por rota, com 4
providers vivos.

### A.3 — Atenção especial: `src/components/reports/ScheduledReportsManager.tsx`

**O componente grava na tabela? Sim, indiretamente.** Ele não chama `.from()`; delega tudo a
`useScheduledReports` (`src/components/reports/ScheduledReportsManager.tsx:36-50`):

| Operação | Onde | Linha |
|---|---|---|
| SELECT | `.from('scheduled_reports').select('*')` | `src/hooks/intelligence/useScheduledReports.ts:58-59` |
| INSERT | `.from('scheduled_reports').insert({...})` — inclui `next_run_at` calculado no cliente | `src/hooks/intelligence/useScheduledReports.ts:81`, `:89` |
| UPDATE | `.from('scheduled_reports').update({ is_active, updated_at })` | `src/hooks/intelligence/useScheduledReports.ts:110-111` |
| DELETE | `.from('scheduled_reports').delete().eq('id', reportId)` | `src/hooks/intelligence/useScheduledReports.ts:124` |

A UI está completa: cria (`:59-70`), alterna ativo (`Switch`), exclui (`AlertDialog`) e exibe
`last_sent_at` (`:219-222`) e `next_run_at` (`:227`).

**Existe consumidor que leia e envie? Sim — mas nada o aciona.** Corrigindo em parte o que a
auditoria anterior apurou: **existem dois consumidores de leitura/envio**, ambos edge functions:

| Edge function | Lê a tabela | Escreve de volta |
|---|---|---|
| `supabase/functions/process-scheduled-reports/index.ts` | `.from("scheduled_reports")` — `:26` | `.from("scheduled_reports")` — `:117` |
| `supabase/functions/send-scheduled-reports/index.ts` | `.from("scheduled_reports")` — `:31` | `.from("scheduled_reports")` — `:65` |

O que **não** existe é o gatilho. Provas de ausência na seção D.4: nenhum `cron.schedule`
para essas funções em `supabase/cron/cron-config.sql` nem nas migrations; nenhum
`functions.invoke('send-scheduled-reports'|'process-scheduled-reports')` no repositório.
As únicas referências fora do código das próprias funções são declarativas ou de teste:
`supabase/config.toml:63,75`, `supabase/functions/_shared/edge-authz-manifest.ts:74-75`,
`tests/edge-functions/live/send-scheduled-reports.test.ts:9`,
`tests/edge-functions/live/process-scheduled-reports.test.ts:9`.

Nota adicional medida: `send-scheduled-reports/index.ts:55` registra
`"Email provider not configured; report send skipped"` — o envio tem um caminho de desistência
por configuração ausente, independente do gatilho.

**Classificação:** 🟨 IMPLEMENTADO_PARCIAL.
**Falta:** o agendador. A cadeia UI → lógica → persistência está fechada e o consumidor de
envio existe, mas nada invoca `process-scheduled-reports`/`send-scheduled-reports`; logo
`next_run_at` nunca é consumido em produção e `last_sent_at` nunca é preenchido por um fluxo
automático. O usuário agenda um relatório que não é disparado.

---

## B) BLOCO B — `qa/` (87 arquivos), foco em `qa/migrations-draft/`

### B.1 — Os 13 arquivos `.sql`

São 9 na raiz de `qa/migrations-draft/` + 4 em `_archived/`. Nenhum foi executado.

| # | Arquivo (data no nome) | Objeto que cria/altera | Existe em `supabase/migrations/`? | Situação |
|---|---|---|---|---|
| 1 | `2026-06-18_security_definer_acl.sql` (2026-06-18) | 4× `REVOKE EXECUTE ON FUNCTION`: `check_seller_cart_limit()` `:24`, `handle_password_reset_request()` `:25`, `check_auth_config_status()` `:28`, `refresh_product_popularity()` `:29` | **Sim** — os 4 REVOKEs idênticos em `supabase/migrations/20260619150603_24a6abed-3f0e-4f15-90da-940480a73758.sql:5-8` | **Promovido** (rascunho redundante) |
| 2 | `2026-06-19_kit_dimensions_backfill.sql` (2026-06-19) | Nenhum DDL — bloco `DO $$` que itera `products WHERE is_kit` e chama `fn_calculate_kit_dimensions(uuid)` (`:41`) | Função-alvo existe (`supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql`); **o backfill em si não** | **Pendente** (dado, não schema) |
| 3 | `2026-06-19_reposicao_variants_summary.sql` (2026-06-19) | `CREATE OR REPLACE FUNCTION public.fn_get_reposicao_variants_summary(uuid[])` `:29`; `REVOKE ALL` `:116`; `GRANT EXECUTE ... authenticated, service_role` `:117`; `COMMENT` `:119` | **Não** — `grep -rl fn_get_reposicao_variants_summary supabase/migrations/` → vazio | **Pendente** |
| 4 | `2026-06-20_revoke_secdef_from_authenticated.sql` (2026-06-20) | 68 `REVOKE EXECUTE` sobre funções SECURITY DEFINER (`audit_rls_coverage` `:39`, `fn_deploy_readiness_check` `:72`, famílias `cleanup_*` `:102-140`, …) | **Parcialmente** — `audit_rls_coverage` revogada em `supabase/migrations/20260512230000_t28_pilot_revoke_sd_batch1.sql`, `20260513000005_t37d_revoke_authenticated_cron_backend.sql`, `20260619155129_...sql`; já `fn_deploy_readiness_check` → `grep -rl` vazio | **Pendente parcial** |
| 5 | `2026-06-27_quotes_status_allow_cancelled.sql` (2026-06-27) | `ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS valid_quote_status` `:32-33` + recriação incluindo `cancelled` `:35` | Constraint existe, **sem** `cancelled`: `supabase/migrations/20250103120000_schema_no_gamification.sql:334` lista `draft, pending, sent, approved, rejected, expired, converted` | **Pendente** |
| 6 | `2026-07-06_crm_callback_events.sql` (2026-07-06) | `CREATE TABLE public.crm_callback_events` `:14`; `COMMENT` `:33`; `GRANT` `:37-38`; RLS `:41`; `CREATE POLICY "Admins can view crm callback events"` `:44`; 2 índices `:51,:54` | **Sim** — `supabase/migrations/20260706223316_3cc4c8a9-76b3-4c02-922a-bbcde6031622.sql:1` cria a tabela; também em `20260707101522_...`, `20260707113531_...`, `20260716000036_drop_unused_indexes.sql` | **Promovido** |
| 7 | `2026-07-13_secdef_revoke_webhook_locks.sql` (2026-07-13) | `REVOKE`+`GRANT service_role` para `claim_webhook_delivery(uuid,text)` `:42-43`, `release_webhook_delivery_lock(uuid,text)` `:46-47`, `cleanup_stale_webhook_locks()` `:50-51` | **Sim** — idêntico em `supabase/migrations/20260713163543_040fac6f-a3dc-4b49-8814-c7911c20d176.sql:5-12` | **Promovido** |
| 8 | `2026-07-13_secdef_revoke_webhook_locks_ROLLBACK.sql` (2026-07-13) | Reversão: `GRANT EXECUTE ... TO PUBLIC / anon, authenticated` para as 3 mesmas funções `:53-62` | **Não** (e não deve estar — é rollback) | **N/A — rollback do item 7** |
| 9 | `2026-07-23_get_edge_invoke_summary.sql` (2026-07-23) | `CREATE OR REPLACE FUNCTION public.get_edge_invoke_summary(int)` `:19`; `REVOKE ALL` de PUBLIC/anon/authenticated `:56-58`; `GRANT service_role` `:59`; `COMMENT` `:61` | **Não** — `grep -rl get_edge_invoke_summary supabase/migrations/` → vazio | **Pendente** |
| 10 | `_archived/2026-07-12_magazine_items_unique_product.sql` (2026-07-12) | `CREATE UNIQUE INDEX CONCURRENTLY` `:34` + `ALTER TABLE public.magazine_items` `:41` | **Não** (`grep` por índice único de `magazine_items` → vazio) | **Arquivado / não promovido** |
| 11 | `_archived/2026-07-12_magazine_reader_state.sql` (2026-07-12) | `CREATE TABLE public.magazine_reader_state` `:23`; 2 índices `:35,:37`; GRANTs `:41-43`; RLS `:46`; 3 policies `:54,:60,:72`; função `tg_magazine_reader_state_touch()` `:84`; trigger `:97` | **Não há `CREATE TABLE`** em migrations; a tabela é *referenciada* depois: `supabase/migrations/20260716000037_restore_fk_indexes_after_036.sql:209-210` | **Arquivado — tabela existe fora do repo de migrations** |
| 12 | `_archived/2026-07-12_magazines.sql` (2026-07-12) | `CREATE TABLE magazines` `:23`, `magazine_items` `:45`, `magazine_templates` `:59`; 6 índices `:73-78`; `update_updated_at_column()` `:84`; 3 triggers `:94-98`; GRANTs `:102-107`; RLS `:111-113` | **Não há `CREATE TABLE`** em migrations; referenciadas depois em `supabase/migrations/20260716000036_drop_unused_indexes.sql:234-235` e `20260716000035_fix_multiple_permissive_policies.sql:20,263` | **Arquivado — mesmo caso** |
| 13 | `_archived/2026-07-15_magazine_public_token_trigger.sql` (2026-07-15) | `CREATE EXTENSION pgcrypto` `:26`; `fn_magazine_public_token()` `:29`; REVOKEs `:78-80`; `trg_magazine_public_token` `:83-85`; `UPDATE public.magazines` de backfill `:93` | **Não** — `grep` por `fn_magazine_public_token`/`trg_magazine_public_token` em migrations → vazio | **Arquivado / não promovido** |

**Resumo:** 3 promovidos (1, 6, 7) · 1 rollback (8) · 4 pendentes na raiz (2, 3, 4-parcial, 5, 9 → contando 4/parcial e 9, são 5 pendentes) · 4 arquivados de magazine (10–13).

**Achado estrutural (B.1.a):** o schema `magazine_*` **não é criado por nenhum arquivo em
`supabase/migrations/`**. Migrations posteriores (julho/2026) já pressupõem as tabelas
existindo e apenas mexem em índices e policies. Os únicos DDLs de criação que o repositório
possui estão em `qa/migrations-draft/_archived/`, isto é, **fora** do diretório canônico de
migrations. Consequência mensurável no app: `src/integrations/supabase/types.ts` não contém
nenhuma ocorrência de `magazine` (`grep -c magazine` → **0**), e o serviço usa um contrato
manual paralelo, `src/integrations/supabase/magazine-schema.ts`, importado em
`src/services/magazineService.ts:28` (`magazineDb`).

### B.2 — Existe tooling que consome `qa/migrations-draft/` (o diretório não é inerte)

| Script | Consome | Registrado em |
|---|---|---|
| `scripts/list-migration-drafts.mjs` | lê os `.sql` e reescreve o índice do `README.md` | `package.json:218` (`drafts:list`), `:219` (`drafts:check`) |
| `scripts/map-drafts-to-migrations.mjs` | mapeia draft → migration → BD, gera `DRAFTS_STATUS.md` | `package.json:221` (`drafts:status`), `:222` (`drafts:status:check`) |
| `scripts/dry-run-migration-draft.mjs` | executa um rascunho **dentro de transação** para validação | `package.json:137` (`draft:dry-run`) |
| `.github/workflows/drafts-index-check.yml` | gate de PR: falha se o índice sair de sincronia | `paths: qa/migrations-draft/**` (`:24`, `:33`) |

O gate `drafts:status:check` exige uma entrada em `qa/migrations-draft/REVIEWS.json` para
cada rascunho não promovido. O `REVIEWS.json` lista 4 acks: `2026-06-18_security_definer_acl.sql`,
`2026-06-19_kit_dimensions_backfill.sql`, `2026-06-19_reposicao_variants_summary.sql`,
`2026-06-27_quotes_status_allow_cancelled.sql`. **Divergência medida:** o item 1 dessa lista
já está promovido (evidência na tabela B.1, linha 1) — o ack está obsoleto. Já
`2026-06-20_revoke_secdef_from_authenticated.sql` e `2026-07-23_get_edge_invoke_summary.sql`
estão pendentes e **não** aparecem no `REVIEWS.json`.

**Classificação do diretório:** 🟨 IMPLEMENTADO_PARCIAL — DDL fora de `supabase/migrations/`,
porém com processo de rastreio, gate de CI e dry-run em transação; o que falta é o
fechamento (promover ou descartar) dos 5 rascunhos pendentes e a limpeza dos acks obsoletos.

### B.3 — Panorama do resto de `qa/` (altitude)

Extensões medidas (`find qa -type f`, 87 arquivos): **57 `.md`**, **13 `.sql`**, **5 `.json`**,
**5 `.png`**, **3 `.html`**, **3 `.pdf`**, **1 `.jsonl`**.

| Subárea | Conteúdo | Há código executável? |
|---|---|---|
| `qa/` (raiz, 24 arq.) | Relatórios de auditoria manuais: `AUDIT_2026-06-18-FULL.md`, `CLICKABLE_EXHAUSTIVE_AUDIT.md`, `CNPJ_EXHAUSTIVE_VALIDATION.md`, `TEST_FAILURES.md`, `RELATORIO_FINAL.md` etc. + `pdf-color-allowlist.json` | Não — só documentação. `pdf-color-allowlist.json` é dado de configuração |
| `qa/bugs/` (11 arq.) | `BUG-001.md` … `BUG-011.md` | Não |
| `qa/exports/` (6 + 5 baseline) | Amostras de proposta: `.html`, `.pdf`, e PNGs de baseline visual | Não — são **fixtures**, consumidas por `scripts/qa/generate-proposal-pdf.mjs:20` e comparadas por `scripts/qa/diff-proposal-pdfs.mjs:32,87` |
| `qa/quality-rounds/` (4 arq.) | `history.jsonl`, `latest.json`, `latest.md`, `round-<ts>.json` | Não — são **saída** gerada por `scripts/round-quality-report.mjs:33,247-248` |
| `qa/reports/` (19 arq.) | Relatórios de fuzz/simulação, em `.md` e `.json` | Não — parcialmente **saída** gerada: `scripts/simulate-daily-flows.mjs:20`, `scripts/qa/cart-header-fuzz-report.mjs:24`, `scripts/recalibrate-watermark-thresholds.mjs:72` |
| `qa/migrations-draft/` (13 arq.) | Ver B.1 e B.2 | **Sim, SQL** — mas nenhum é executado por pipeline; só por `npm run draft:dry-run` sob demanda |

**Veredito de altitude:** fora de `migrations-draft/`, `qa/` **não contém código executável**.
É metade documentação humana (`.md`), metade artefato de entrada/saída de scripts que vivem
em `scripts/` e `scripts/qa/`. Classificação: 🟨 — os fixtures e as saídas têm consumidor
real (scripts nomeados acima); os relatórios `.md` são registro histórico sem consumidor
de código.

---

## C) BLOCO C — arquivos de configuração sem cobertura

| Arquivo | Linhas | O que faz | Quem executa/consome | Classe |
|---|---|---|---|---|
| `tailwind.config.ts` | 350 | Config Tailwind: `darkMode: ["class"]` (`:4`), `content` cobrindo `./src/**/*.{ts,tsx}` (`:5`), `theme.extend` de `:20` a `:348`, `plugins: [require("tailwindcss-animate")]` (`:349`) | **Sim, no build.** Cadeia: `postcss.config.js` → plugin `tailwindcss` → Vite. Declarado também em `components.json:7` (`"config": "tailwind.config.ts"`, usado pelo shadcn CLI) e é gatilho de CI em `.github/workflows/e2e-quote-freight-block.yml:17,31` e `.github/workflows/e2e-visual-preview-button.yml:18,29` | ✅ |
| `test-hooks-safety.mjs` | 409 | Script Node autônomo com mini-framework próprio (`test()`/`assert()`, `:6-16`) que **simula** regras dos React Hooks sobre trechos transcritos em comentário (`:23-30`). `process.exit(1)` em falha (`:409`) | **Ninguém.** Ver D.5 | ⬛ |
| `test-magazine-fix.mjs` | 330 | Mesma estrutura: simula cenários do fix do React Error #310 no editor de revistas (deps circulares, sincronia de `magazineRef`) | **Ninguém.** Ver D.5 | ⬛ |

**Detalhe determinante para os dois `.mjs`:** nenhum dos dois importa código do projeto —
`grep -n "^import\|require(" test-hooks-safety.mjs test-magazine-fix.mjs` retorna **vazio**.
Eles reimplementam a lógica que pretendem testar dentro de si mesmos, com o código real
transcrito em comentários. Portanto, ainda que fossem executados, **não** exercitariam
`MagazineEditorPage` nem hook algum do `src/`; passariam mesmo com o código de produção
regredido. São simulações congeladas, não testes.

---

## D) SEM CONSUMIDOR — provas de ausência

Todos os comandos abaixo foram executados a partir de `/home/user/promo-gifts-v4`.

### D.1 — `src/components/audit/AuditReport.tsx` ⬛

```
$ grep -rn "AuditReport" --include=*.ts --include=*.tsx . | grep -v node_modules
./src/components/audit/AuditReport.tsx:17:export function AuditReport() {
./supabase/functions/connections-hub-audit/index.ts:20:interface AuditReport {
./supabase/functions/connections-hub-audit/index.ts:194:    const report: AuditReport = {
```

A única definição no front é a própria; as duas outras ocorrências são uma `interface`
homônima e sem relação, dentro de uma edge function. Não há import, não está em barrel
(`src/components/audit/index.ts:1` exporta só `AuditHistory`), não há rota. **Morto**, apesar
de o componente disparar a edge `audit-suite` (`AuditReport.tsx:28`).

### D.2 — `src/components/goals/SalesGoalsCard.tsx` ⬛

```
$ grep -rn "\bSalesGoalsCard\b" --include=*.ts --include=*.tsx src
src/components/goals/SalesGoalsCard.tsx:35:export function SalesGoalsCard() {
```

Resultado: só a definição. Não existe `src/components/goals/index.ts`. O hook por trás,
`useSalesGoals`, também só tem esse consumidor:

```
$ grep -rn "useSalesGoals" --include=*.ts --include=*.tsx src
src/components/goals/SalesGoalsCard.tsx:24, :37
src/hooks/intelligence/index.ts:20        (re-export do barrel)
src/hooks/intelligence/useSalesGoals.ts:41 (definição)
```

Isto é: **a tabela `sales_goals` tem CRUD completo no cliente
(`useSalesGoals.ts:68,90,114,159,178,213`) e nenhuma UI montada.** É o mesmo padrão do
`scheduled_reports`, um nível pior — lá a UI está montada e falta o disparador; aqui a UI
existe no repositório e não é renderizada em lugar nenhum.

### D.3 — `RestartTourButton.tsx` e os 4 barrels órfãos ⬛

```
$ grep -rn "RestartTourButton" --include=*.ts --include=*.tsx . | grep -v node_modules
./src/components/onboarding/index.ts:3:export { RestartTourButton } from './RestartTourButton';
./src/components/onboarding/RestartTourButton.tsx:7:export const RestartTourButton = forwardRef<...
./src/components/onboarding/RestartTourButton.tsx:36:RestartTourButton.displayName = 'RestartTourButton';
```

O único citador é o barrel — e o barrel também não tem consumidor:

```
$ grep -rn "components/onboarding'" --include=*.ts --include=*.tsx src
(vazio)
$ grep -rn "components/audit'"      --include=*.ts --include=*.tsx src
(vazio)
$ grep -rn "@/components/mobile\b"  --include=*.ts --include=*.tsx src
src/components/layout/GlobalOverlay.tsx:12:  import('@/components/mobile/SmartMobileNav')...
src/pages/products/ProductDetail.tsx:58: ... '@/components/mobile/MobileProductActions'
$ grep -rn "@/components/ramo-atividade\b" --include=*.ts --include=*.tsx src
src/components/filters/filter-panel/sections/RamosFilter.tsx:5,6  (caminhos diretos)
```

Nos casos de `mobile/` e `ramo-atividade/` os hits são **caminhos diretos**, não o barrel:
nenhum import termina em `@/components/mobile` ou `@/components/ramo-atividade`. Barrels
mortos: `audit/index.ts`, `mobile/index.ts`, `onboarding/index.ts`, `ramo-atividade/index.ts`.
O único barrel vivo do bloco é `a11y/index.ts` (4 consumidores, linha 4 da tabela A.1).

### D.4 — Nada dispara `scheduled_reports` 🟨

```
$ grep -rn "cron.schedule" --include=*.sql . | grep -v node_modules | grep -i report
(vazio)

$ grep -rn "invoke('send-scheduled\|invoke(\"send-scheduled\|invoke('process-scheduled\|invoke(\"process-scheduled" . | grep -v node_modules
(vazio)
```

Existem 30+ `cron.schedule` no repositório (`supabase/cron/cron-config.sql:12,31,50,72` e
dezenas de migrations) — nenhum menciona relatório. O agendamento existe como dado
(`next_run_at`, gravado em `useScheduledReports.ts:89`) e como consumidor
(`process-scheduled-reports/index.ts:26`), mas sem nada que feche o ciclo.

### D.5 — `test-hooks-safety.mjs` e `test-magazine-fix.mjs` ⬛

```
$ grep -rn "test-hooks-safety\|test-magazine-fix" . | grep -v node_modules \
    | grep -v "^./test-hooks-safety.mjs\|^./test-magazine-fix.mjs"
./graphify-out/GRAPH_REPORT.md:2316:- test-hooks-safety.mjs
./graphify-out/GRAPH_REPORT.md:2317:- test-magazine-fix.mjs
./graphify-out/manifest.json:26357:  "test-hooks-safety.mjs": {
./graphify-out/manifest.json:26362:  "test-magazine-fix.mjs": {
./docs/estado/ESTADO_ATUAL.md:322: (o texto da autoauditoria que originou este lote)
```

Zero ocorrências em `package.json` (verificado: `grep -n "test-hooks-safety\|test-magazine-fix" package.json` → vazio),
zero em `.github/`, zero em `scripts/`. Os únicos citadores são um dump de grafo estático
(`graphify-out/`) e o próprio texto que pediu esta auditoria. Nenhum pipeline os chama.

### D.6 — `src/components/LoadingScreen.tsx` ⬛

```
$ grep -rn "LoadingScreen" --include=*.ts --include=*.tsx --include=*.mjs --include=*.html . | grep -v node_modules
./src/components/LoadingScreen.tsx:12:export default function LoadingScreen() {
./tests/components/LoadingScreen.test.tsx:4,10,12,17,23
```

Consumidor único: o próprio teste. Nenhuma página, layout ou `Suspense fallback` do app o
importa. É código mantido vivo apenas pela sua suíte de testes.

### D.7 — `src/components/dev/DevOnlyBridgeOverlay.tsx` 🟨

```
$ grep -rn "DevOnlyBridgeOverlay" --include=*.ts --include=*.tsx src
src/components/dev/__tests__/DevOnlyBridgeOverlay.test.tsx:2,7,19,24,30,36
src/components/dev/DevOnlyBridgeOverlay.tsx  (definição)
```

Só testes. Diferente do `LoadingScreen`, classifiquei 🟨 e não ⬛ porque ele é a única porta
de entrada de uma cadeia inteira que **está viva e testada**
(`DevOnlyBridgeOverlay` → `BridgeMetricsOverlay:4` → `BridgeMetricsSummary:2` → `MetricUtils:2`):
o subsistema está pronto, falta apenas ser montado em algum layout.

---

## E) COBERTURA

**Arquivos no escopo: 62. Classificados: 62.**

| Bloco | No escopo | Classificados |
|---|---|---|
| A — `src/components` (17 subdirs + 3 raiz) | 46 | 46 |
| B — `qa/migrations-draft/*.sql` | 13 | 13 |
| C — configuração | 3 | 3 |
| **Total nominal** | **62** | **62** |

**Fora da contagem nominal, mas coberto mesmo assim (+1):**
`src/components/ThemeInitializer.test.tsx` (53 linhas) — está na raiz de `src/components/`,
não foi nomeado no escopo nem, pelo que apurei, atribuído a lote anterior. Classificado ✅ na
última linha da tabela A.1 para não deixar o mesmo tipo de buraco reaberto.

**Coberto em nível de altitude, não arquivo a arquivo (por instrução do escopo):**
os **74 arquivos restantes de `qa/`** (87 totais − 13 `.sql`). Caracterizados em B.3 por
subdiretório, com identificação do script gerador ou consumidor de cada família. Não há
tabela linha-a-linha desses 74 porque o escopo pediu explicitamente "nível de altitude" e
porque a medição mostrou que 57 são `.md` sem consumidor de código.

**O que não foi verificado (declarado, não inferido):**

- `NAO_VERIFICADO` — se os arquivos de contexto `ComparisonContext`, `FavoritesContext` e
  `RecentlyViewedContext` de fato exportam providers no-op, como afirma o comentário
  `src/components/providers/AppProviders.tsx:5-6`. Fora do meu escopo (`src/contexts/`).
- `NAO_VERIFICADO` — o estado real dos objetos no banco `doufsxqlfjyuvxuezpln`. Toda a
  coluna "existe em `supabase/migrations/`?" da tabela B.1 é uma comparação **repositório
  contra repositório**. Um objeto ausente das migrations pode existir no banco (é
  exatamente o que os dados sugerem para `magazine_*`). Confirmar isso exigiria consulta a
  `pg_catalog`, que não fiz — auditoria somente leitura de código, e alteração/consulta de
  produção está fora do que me foi pedido.
- `NAO_VERIFICADO` — se `process-scheduled-reports`/`send-scheduled-reports` são acionadas
  por algum agendador **externo ao repositório** (cron de infra, Supabase Scheduled
  Functions configurado pelo painel). Só posso afirmar que **nada no repositório** as chama.

---

## F) DIVERGÊNCIAS COM OUTROS LOTES — registradas, não editadas

Conforme a regra, nenhum documento `01..13` foi alterado. Registro aqui o que medi:

1. **`scheduled_reports` — "nada dispara o envio".** Confirmado quanto ao *gatilho*, mas a
   formulação "nenhum caller" merece precisão: **existem dois consumidores de leitura e
   envio**, `supabase/functions/process-scheduled-reports/index.ts:26,117` e
   `supabase/functions/send-scheduled-reports/index.ts:31,65`. O que não existe é o
   agendador (D.4). O gap é "função órfã sem trigger", não "tabela sem consumidor".

2. **`sales_goals` é um caso idêntico e, ao que apurei, não relatado.** CRUD completo em
   `src/hooks/intelligence/useSalesGoals.ts:68,90,114,159,178,213`, UI pronta em
   `src/components/goals/SalesGoalsCard.tsx` (300 linhas) e **zero consumidores** (D.2).
   Se o lote de dados/schema classificou `sales_goals` como tabela em uso, a evidência de
   código diz o contrário.

3. **`magazine_*` não tem DDL de criação em `supabase/migrations/`.** Os únicos `CREATE TABLE`
   de `magazines`, `magazine_items`, `magazine_templates` e `magazine_reader_state` no
   repositório estão em `qa/migrations-draft/_archived/` (itens 11–13 da tabela B.1).
   Migrations de julho/2026 já pressupõem as tabelas
   (`20260716000036_drop_unused_indexes.sql:234-235`, `20260716000037_...:209-210`,
   `20260716000035_...:20,263`). Complementarmente, `src/integrations/supabase/types.ts`
   tem **0** ocorrências de `magazine` — o app compila via contrato manual
   `src/integrations/supabase/magazine-schema.ts`, importado em
   `src/services/magazineService.ts:28`. Se algum lote afirmou que `types.ts` contém as
   tabelas `magazine_*`, isso não se sustenta no código atual.

4. **`qa/migrations-draft/REVIEWS.json` está dessincronizado do estado real.** O ack de
   `2026-06-18_security_definer_acl.sql` diz "aguardando lista final antes de promover", mas
   os 4 REVOKEs já estão em `supabase/migrations/20260619150603_...sql:5-8` — rascunho
   promovido com ack obsoleto (dupla verdade, exatamente o que o README do diretório proíbe).
   Em sentido inverso, `2026-06-20_revoke_secdef_from_authenticated.sql` e
   `2026-07-23_get_edge_invoke_summary.sql` estão pendentes e **sem** ack.

5. **Quatro barrels mortos** (`audit/`, `mobile/`, `onboarding/`, `ramo-atividade/`): todos os
   consumidores importam por caminho direto (D.3). Não é bug, é ruído de manutenção — mas
   `onboarding/index.ts` é o que mantém `RestartTourButton` aparentando estar em uso.

6. **`test-hooks-safety.mjs` e `test-magazine-fix.mjs` não são testes.** Não importam nada do
   `src/` (`grep "^import\|require(" → vazio`) e reimplementam internamente a lógica que
   dizem validar. Passariam com o código de produção regredido. Se algum lote os contou como
   cobertura de teste do editor de revistas ou de segurança de hooks, a contagem está inflada.
