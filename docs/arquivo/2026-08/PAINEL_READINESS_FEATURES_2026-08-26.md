# Painel de readiness de features e inventário de flags — 2026-08-26

> **Escopo:** parte somente leitura das etapas 7 e 66 do plano de 100 etapas.
> **Banco canônico consultado:** `doufsxqlfjyuvxuezpln`, exclusivamente com `SELECT`/`pg_catalog` pelo MCP oficial read-only.
> **Nenhuma flag, configuração, rota, banco, design, workflow ou dado foi alterado.**
> **Baseline de código:** worktree isolada `codex/stabilization-100`, durante a estabilização iniciada em 2026-08-26.

> **Atualização de publicação — 28/08/2026:** `webhook-inbound` 279,
> `bitrix-sync` 243 e `ai-recommendations` 273 foram implantadas no Supabase
> canônico após autorização. Os smokes remotos não mutantes aprovaram carregamento,
> preflight e bloqueios sem autenticação. O painel inbound e o isolamento dos oito
> harnesses `__test/*` estão no PR #1799, mas ainda não foram implantados no
> frontend/Vercel; os estados visuais deste painel não foram promovidos.

## Parecer executivo

O sistema possui funcionalidades amplas e majoritariamente montadas, mas o mecanismo central de feature flags **não governa a maior parte delas**. O registro client-side contém 13 flags; somente 3 nomes têm qualquer chamada executável a `isFeatureEnabled(...)`. As outras 10 não controlam o módulo descrito no registro. Além disso, a tabela `public.feature_flags` **não existe** no banco canônico, apesar do cabeçalho de `src/lib/feature-flags.ts` afirmar que as flags podem ser configuradas via Supabase.

Há um segundo mecanismo, independente e efetivamente remoto: `public.system_kill_switches`. Ele existe no banco, contém 7 switches e é consultado por Edge Functions. Um switch representa a `external-db-bridge`, já descomissionada e substituída por um stub HTTP 410. Desde a versão 273, `ai-recommendations` chama `assertSwitchEnabled('edge_ai_recommendations')` antes de autenticação, rate limit, credenciais ou gateway de IA; o teste handler-real prova 410 quando desabilitado.

Este painel classificou 57 módulos/feature clusters da aplicação atual:

| Estado | Quantidade | Leitura correta |
|---|---:|---|
| **Ativo** | 20 | Montado e interligado no código, com contrato/teste identificável; ainda não equivale a aceite final de produção |
| **Parcial** | 23 | Exposto ou executável, porém com fio partido, mock/fallback, controle ineficaz, dependência ausente ou jornada integral pendente |
| **Demo** | 6 | Dados/execução deliberadamente simulados ou ferramenta de QA; deve ser isolado e explicitamente sinalizado |
| **Desativado** | 5 | Flag default `false`, rota ausente ou componente sem montagem/caller executável |
| **Legado** | 3 | Compatibilidade/depreciação explícita ou endpoint descomissionado |
| **Total** | **57** | Agrupamento por domínio das 132 rotas já inventariadas, acrescido de features sem rota e integrações críticas |

Somente o módulo Magazine possui owner de domínio explicitamente documentado: **Promo Brindes Engineering**. Os outros 56 itens permanecem com owner **TBD — lacuna de governança**. `@adm01-debug` aparece em `.github/CODEOWNERS` como revisor técnico de alguns arquivos/Edge Functions protegidos; isso não foi promovido indevidamente a ownership funcional do domínio.

## Critério de classificação

Os estados deste painel têm significado operacional estrito:

- **Ativo:** há montagem/caller executável, contrato de dados ou execução identificável e evidência de teste no repositório. Não significa que a jornada foi revalidada em staging nesta rodada.
- **Parcial:** existe código vivo, mas pelo menos uma parte necessária é simulada, silenciosamente degradada, não persistida, não controlada pela flag declarada, apoiada em objeto ausente ou ainda sem validação integral.
- **Demo:** o propósito é preview, QA, fixture ou simulação. Demo sem sinalização explícita continua sendo risco, mesmo quando tecnicamente funcional.
- **Desativado:** o estado default é `false` e não há caller, ou não existe rota/montagem executável no app atual.
- **Legado:** o próprio código declara depreciação/descomissionamento ou mantém apenas redirecionamento/compatibilidade.

Um item não foi declarado “ativo” apenas porque possui muitos arquivos, uma rota ou um teste smoke que verifica somente renderização. Também não foi declarado “legado” apenas por ausência de dados.

### Níveis de evidência usados

| ID | Evidência |
|---|---|
| `E-R` | Inventário atual de 132 rotas em `docs/INVENTARIO_ROTAS_CONTRATOS_2026-08-26.md`, cruzado com `src/routes/**` |
| `E-F` | Registro e chamadas de flags em `src/lib/feature-flags.ts` e busca integral de consumidores em `src/**` |
| `E-DB1` | MCP read-only: `public.feature_flags` ausente; `public.system_kill_switches` presente com 7 linhas |
| `E-DB2` | MCP read-only: presença/ausência de 34 relações e 14 RPCs críticas listadas neste documento |
| `E-A` | Achados atuais em `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md` |
| `E-G` | Consulta BFS ao grafo Graphify existente, com 29.262 nós, usando vocabulário real de flags/features; resultados confirmados no código antes de uso |

## 1. Arquitetura real de controle de features

Hoje há quatro famílias distintas de controle, sem um painel único:

1. **Registro client-side estático:** `src/lib/feature-flags.ts`.
2. **Kill switches server-side:** `public.system_kill_switches` + `supabase/functions/_shared/kill_switch.ts`.
3. **Flags implícitas de build/ambiente:** `import.meta.env.DEV`, `VITE_*` e Edge secrets/envs.
4. **Overrides locais:** `localStorage`, query string e `Map` em memória.

### Lacunas estruturais do registro client-side

- `runtimeOverrides` é um `Map` em memória; recarregar a página perde o valor (`src/lib/feature-flags.ts:155-188`).
- O override `ff_<flag>` em `localStorage` só é lido quando `import.meta.env.DEV` é verdadeiro (`src/lib/feature-flags.ts:175-179`).
- Não existe fetch, subscription ou hidratação a partir do Supabase no arquivo.
- `setFeatureFlag`, `getAllFlags` e `getFlagRegistry` não têm consumidor não-teste fora do próprio arquivo.
- A restrição `allowedRoles` só é aplicada quando um `userRole` é fornecido; a única flag com essa restrição não possui caller.
- A migration `supabase/migrations/20251228000003_feature_flags.sql` cria apenas `id`, `created_at` e `updated_at`; migrations históricas descrevem outro shape com `flag_name`, `is_enabled` e rollout. O objeto final não existe no banco vivo.
- Conclusão: o comentário “configurar via Supabase” em `src/lib/feature-flags.ts:4-5` não corresponde ao runtime atual.

## 2. Inventário completo do registro client-side

Contagem mecânica em todo `src/**`, excluindo testes: 13 flags declaradas, 9 arquivos importadores do módulo e somente 3 nomes efetivamente consultados.

| Flag | Default | Consumers efetivos | Estado | Feature observada | Owner | Evidência e lacuna |
|---|---:|---:|---|---|---|---|
| `advanced_analytics` | on | 0 | **Parcial** | BI/analytics existe, mas ignora esta flag | TBD | `src/lib/feature-flags.ts:104-108`; zero `isFeatureEnabled('advanced_analytics')`; role gate sem efeito |
| `ai_recommendations` | on | 0 | **Parcial** | Recomendações estão montadas no detalhe do produto | TBD | `SmartRecommendations` usa `useAIRecommendations`, mas não consulta a flag; o kill switch remoto também não é aplicado no handler |
| `crm_bridge_enabled` | on | 0 | **Parcial** | Clientes/CRM e `crm-db-bridge` existem | TBD | `src/lib/feature-flags.ts:113-119`; zero consumer; controle real é `edge_crm_db_bridge` no banco |
| `custom_kits_v2` | off | 0 | **Desativado** | Não foi encontrada fronteira v2 controlada por ela | TBD | `src/lib/feature-flags.ts:109-112`; o Kit Builder atual monta sem consultar a flag; decidir se é reserva ou flag obsoleta |
| `e2e_tests` | off | 0 | **Desativado** | Harnesses usam outros gates — ou nenhum | TBD | `src/lib/feature-flags.ts:100-103`; `__visual/*` usa `DEV`, enquanto `__test/*` está público sem essa flag |
| `magazineModule` | on | 0 | **Parcial** | Magazine está ativo, mas não é desligado pela flag | Promo Brindes Engineering | `src/lib/feature-flags.ts:145-152`; rotas e serviço Supabase montam independentemente; descrição ainda menciona persistência v1 desatualizada |
| `magic_up` | on | 0 | **Parcial** | Magic Up está ativo, mas não é governado pela flag | TBD | rota `/magic-up`, hooks e tabelas existem; zero consumer do nome da flag |
| `mfa` | off | 0 | **Parcial** | MFA/AAL2 é usado em `AdminRoute` e `DevRoute` apesar do default off | TBD | `AuthContext`, `MfaEnrollmentDialog` e `MfaChallengeDialog` não consultam a flag; “off” no registro não desativa o fluxo |
| `presentation_mode` | on | 0 | **Parcial** | Apresentação de coleção/revista está montada | TBD | `CollectionPresentationLauncher` e `PublicMagazineView` não consultam a flag |
| `supplierReliability` | on | 1 arquivo | **Ativo** | Aba de confiabilidade em `/estoque` | TBD | `StockDashboard.tsx:129` controla a aba; MV/RPC vivas confirmadas em `E-DB2`; existe ainda um segundo toggle local do path server/client |
| `useColorSwatchesV2` | on | 3 arquivos | **Ativo** | Cards/lista/tabela de catálogo | TBD | `ProductCard`, `ProductListItem`, `ProductTableRow`; RPC `fn_get_color_swatches_batch` viva; testes unitários/E2E de swatches presentes |
| `useEmaRupture` | on | 5 arquivos | **Parcial** | Badges/queries EMA vivos; painel completo não é montado | TBD | controla hooks e componentes, mas `RupturePanelEma`/`StockRiskHero` não têm montagem viva; `fn_ema_pipeline_health` está ausente em `E-DB2` |
| `voice_commands` | on | 0 | **Parcial** | Overlay e `useVoiceAgent` estão montados | TBD | `AdvancedSearch` e `GlobalSearchPalette` carregam voz sem consultar a flag |

**Resumo do registro:** 2 controles efetivos e classificados ativos; 9 parciais; 2 defaults off sem consumer. `supplierReliability`, `useColorSwatchesV2` e `useEmaRupture` são os únicos nomes consultados; `useEmaRupture` continua parcial por escopo incompleto.

## 3. Kill switches server-side — estado vivo

Leitura feita em 2026-08-26 no banco canônico. Neste mecanismo, `enabled=false` significa que a Edge Function deve responder 410 ou já está descomissionada.

| Switch vivo | Estado no banco | Adoção no código | Classificação | Owner | Evidência/lacuna |
|---|---|---|---|---|---|
| `edge_ai_recommendations` | `enabled=true`, rollout 100 | Nenhuma | **Parcial** | TBD | Linha existe, mas `supabase/functions/ai-recommendations/index.ts` não importa nem chama `assertSwitchEnabled` |
| `edge_bi_copilot` | `enabled=true`, rollout 100 | Handler consulta | **Ativo** | TBD | `supabase/functions/bi-copilot/index.ts:43` |
| `edge_crm_db_bridge` | `enabled=true`, rollout 100 | Handler consulta | **Ativo** | TBD | `supabase/functions/crm-db-bridge/index.ts:616`; isso não substitui validação das credenciais externas |
| `edge_expert_chat` | `enabled=true`, rollout 100 | Handler consulta | **Ativo** | TBD | `supabase/functions/expert-chat/index.ts:598` |
| `edge_external_db_bridge` | `enabled=false`, rollout 100 | Stub sempre 410 | **Legado** | TBD | `supabase/functions/external-db-bridge/index.ts:1-30`; REST nativo é o caminho atual |
| `edge_generate_mockup` | `enabled=true`, rollout 100 | Handler consulta | **Ativo** | TBD; review técnico `@adm01-debug` | `supabase/functions/generate-mockup/index.ts:347`; path protegido em `.github/CODEOWNERS` |
| `edge_webhook_dispatcher` | `enabled=true`, rollout 100 | Handler consulta | **Ativo** no controle; feature parcial | TBD | `supabase/functions/webhook-dispatcher/index.ts:48`; o pipeline de outbox possui job desativado por configuração ausente segundo `E-A` |

**Cobertura do mecanismo:** 5 switches honrados por `assertSwitchEnabled`, 1 endpoint legado hard-stubbed e 1 switch sem enforcement. O helper é fail-open em erro/timeout (`supabase/functions/_shared/kill_switch.ts`), decisão já documentada no código e que precisa ser considerada nos testes de incidente.

## 4. Flags implícitas e toggles fora do registro

| Controle | Default/canal | Estado | Owner | Evidência e observação |
|---|---|---|---|---|
| `supplierReliabilityServerSide` | `localStorage`, default server-side | **Ativo** | TBD | `useSupplierReliability.ts`: MV server-side por default; `false` mantém caminho client-side legado por uma release |
| `?demo=1` em Trends | query string explícita | **Demo** | TBD | `trends-mock.ts:217-229`; default usa dados reais e a UI exibe badge de demo |
| Mock de ProductMatch | somente `import.meta.env.DEV` e catálogo vazio | **Demo** | TBD | `ProductMatchPage.tsx:49-52`; impossível no build produtivo normal pelo código atual |
| `__visual/*` | `import.meta.env.DEV` | **Demo** | TBD | oito rotas só são montadas em DEV em `AppRoutes.tsx:17-43,134-170` |
| `__test/*` | sem gate; público em todos os ambientes | **Demo** com exposição indevida | TBD | oito harnesses em `public-routes.tsx:14-22,42-49`; lacuna de isolamento, não autorização para removê-los |
| `/debug/images` | sem gate; público em todos os ambientes | **Demo** com exposição deliberada | TBD | `AppRoutes.tsx:126-132`; comentário afirma necessidade de E2E público |
| `VITE_ENABLE_NAV_METRICS` | prod on por default; local override off | **Ativo** | TBD | `navigationMetrics.ts:52-68`; possui sampling independente |
| `VITE_SHOW_DEV_INFRA_MESSAGES` | `auto`, env + localStorage | **Ativo** | TBD | `src/lib/system/dev-gate/providers.ts`; é gate de mensagens, não de rotas técnicas |
| `VITE_USE_CANVAS_STARFIELD` | on por default | **Ativo** | TBD | `AuthBranding.tsx:79-82`; fallback DOM é legado visual |
| `VITE_AUTH_DEBUG` | off em prod por default | **Desativado** | TBD | `auth-flow-tracer.ts:22`; DEV sempre habilita diagnóstico |

## 5. Painel de readiness por módulo/feature

### 5.1 Núcleo comercial e experiência autenticada

| # | Módulo/feature | Estado | Owner | Evidência objetiva | Lacuna para o próximo estado |
|---:|---|---|---|---|---|
| 1 | Login, sessão e reset de senha | **Ativo** | TBD | Rotas `/auth`, `/login`, `/reset-password`; `AuthContext`, `authService`; testes de auth e login em `E-R` | Revalidar jornada real após CI voltar; owner de domínio |
| 2 | Google SSO/callback | **Parcial** | TBD | `/auth/callback`, `SSOCallbackPage`, smoke versionado | Ativação/provider externo continua não verificável só pelo repo; owner e smoke autorizado |
| 3 | MFA/TOTP e AAL2 | **Parcial** | TBD | `useAuthMFA`, dialogs montados em `AdminRoute`/`DevRoute`, E2E de challenge | Flag `mfa=false` é ignorada; alinhar rollout real, policy e owner |
| 4 | Dashboard inicial/customizável | **Ativo** | TBD | `/` e `/dashboard`; widgets com queries; testes e rota em `E-R` | E2E integral/visual e owner |
| 5 | Catálogo, busca, filtros e detalhe | **Ativo** | TBD | `/produtos`, `/filtros`, `/produto/:id`; relations/RPCs vivas em `E-DB2`; testes de rota/guard | E2E crítico pós-CI e owner |
| 6 | Color swatches V2 | **Ativo** | TBD | Flag efetiva em 3 renderers; RPC viva; testes unitários/visuais | Confirmar rollout/observabilidade e owner |
| 7 | Badge de confiança do fornecedor no produto | **Parcial** | TBD | `useSupplierTrust.ts:93-105` mistura lead time real com rating determinístico e usa fallback total em erro | Provenance por campo + autorização visual da etapa 59 |
| 8 | Novidades | **Parcial** | TBD | Query real e rota; `NoveltyProductGrid.tsx:137-145` inventa percentual de carregamento | Remover/sinalizar progresso fictício sem regressão visual; owner |
| 9 | Reposição | **Parcial** | TBD | Três RPCs dedicadas vivas/roteadas; progresso usa `Math.random()` | Mesmo gate visual de progresso; jornada/owner |
| 10 | Favoritos | **Ativo** | TBD | `favorite_lists`, `favorite_items` e RPC `ensure_default_favorite_list` vivas; testes de persistência | Jornada multiusuário da etapa 65; owner |
| 11 | Carrinhos do vendedor | **Ativo** | TBD | `seller_carts`, `seller_cart_items` e `restore_seller_cart` vivos; módulo/E2E identificados | Concorrência/jornada real e owner |
| 12 | Coleções | **Ativo** | TBD | Lista/detalhe, lixeira, share/export; relações vivas; testes de rota | Jornada multiusuário e owner |
| 13 | Comparações | **Ativo** | TBD | `/comparar`, store/sync, `user_comparisons` e `user_preferences` vivas | Jornada multiusuário e owner |
| 14 | Orçamentos — lista, dashboard, kanban, criação e edição | **Ativo** | TBD | `quotes`, `quote_items`, RPCs transacionais vivas; guards e E2E por rota | Jornada completa de staging da etapa 61; owner |
| 15 | Shares públicos de quote/kit/coleção/comparação/dossiê do catálogo E2E antigo | **Desativado** | TBD | Ainda constam em `e2e/routes/_catalog.ts`, mas não aparecem nas 132 rotas React atuais nem em `src/routes/**` | Decidir se foram removidos intencionalmente ou se há perda real; não restaurar por suposição |
| 16 | PDF/proposta e modo apresentação | **Parcial** | TBD | Gerador React/PDF e `PresentationMode` têm consumers; template HTML legado coexistente; flag `presentation_mode` não governa o recurso | Consolidar contrato, tornar flag efetiva ou removê-la por decisão; E2E/visual |
| 17 | Simulador wizard de personalização | **Ativo** | TBD | `/simulador`, drafts persistidos em relação viva, hooks/testes | Paridade end-to-end e owner |
| 18 | Simulador de preços | **Parcial** | TBD | Aba real + `QuantityPriceCalculator`; `PriceSimulatorPage.tsx:58` passa preço 0 e callback vazio | Corrigir contrato vestigial e testar preços reais |
| 19 | Estoque/dashboard de variações | **Ativo** | TBD | `/estoque`, dados Gold e `mv_stock_rupture_alert` viva; E2E de estoque | Contratos órfãos abaixo não podem contaminar o core; owner |
| 20 | Risco preditivo EMA completo | **Parcial** | TBD | Badges/hooks vivos; `RupturePanelEma` e `StockRiskHero` sem montagem; `fn_ema_pipeline_health` ausente | Separar flag do painel e badges; definir RPC/contrato sob autorização BD |
| 21 | Confiabilidade de fornecedores (aba de estoque) | **Ativo** | TBD | Flag efetiva; `mv_supplier_reliability` e `get_supplier_reliability_history` vivas; caminho server-side default | E2E de dados/empty/error e owner; aposentar fallback legado só depois de evidência |
| 22 | Kit Builder | **Parcial** | TBD | Persistência/tabelas vivas; `useKitBuilderQueries.ts:136-182` retorna `MOCK_BOXES/MOCK_ITEMS` em vazio ou erro | Feature flag efetiva + falha explícita até a jornada 64 passar |
| 23 | Biblioteca/Meus Kits | **Ativo** | TBD | `/meus-kits`, `custom_kits`, `kit_templates` e RPC de uso vivas | Jornada multiusuário e owner |
| 24 | “Montar kit com IA” | **Parcial** | TBD | Edge é chamada, mas `KitBuilderPage.tsx:54` entrega `onAIApply={() => {}}` | Aplicar resultado de forma verificável e remover falso sucesso |
| 25 | Sugestão de identidade do kit | **Desativado** | TBD | Hook/componente/Edge existem, mas `IdentitySuggestionButton` não possui montagem viva | Decidir se entra no produto; só então montar sob flag/teste |

### 5.2 IA, conteúdo e ferramentas

| # | Módulo/feature | Estado | Owner | Evidência objetiva | Lacuna para o próximo estado |
|---:|---|---|---|---|---|
| 26 | Gerador e histórico de mockups | **Ativo** | TBD; review técnico parcial `@adm01-debug` | Rotas, `generated_mockups`, `mockup_drafts`, Storage e Edge `generate-mockup`; kill switch efetivo | Jornada completa/idempotência da etapa 63; owner de domínio |
| 27 | Assistente IA dentro do mockup | **Demo** | TBD | `AIMockupAssistant` usa timer + respostas fixas aleatórias e está montado em `MockupGenerator` | Sinalizar inequivocamente como demo ou ligar a IA real; hoje pode parecer funcional |
| 28 | Magic Up | **Ativo** | TBD | Rota, hooks, três famílias de tabelas vivas e testes; geração/score por Edge | Jornada de geração/cobrança/share e owner; flag central hoje ineficaz |
| 29 | Inteligência comercial | **Parcial** | TBD | Queries reais, mas `MarketIntelligenceChart.tsx:57-68` gera série com `Math.random()` | Provenance por campo e bloqueio de downstream decisório |
| 30 | BI Cliente 360 e comparador | **Parcial** | TBD | Fluxo real, porém `useClientBI.ts:117-125` retorna `isMock:false` com `topCategories` mock | Corrigir provenance antes de notificações, IA e exportações |
| 31 | Trends — modo real default | **Ativo** | TBD | `isDemoMode()` é false por default; dados fictícios exigem `?demo=1` e badge | Teste de produção sem query demo + owner |
| 32 | Recomendações IA de produtos | **Parcial** | TBD | `SmartRecommendations` está no detalhe; Edge/testes existem | Flag client-side não é lida e kill switch server-side não é aplicado no handler |
| 33 | Comandos de voz | **Parcial** | TBD | Overlay e `useVoiceAgent` montados em buscas; testes de voz | Flag `voice_commands` ineficaz; validar STT/TTS/fallback com credenciais de teste |
| 34 | Expert Chat/Flow | **Parcial** | TBD | FAB global, streaming Edge e kill switch efetivo | `setIsFromVoice={() => {}}` mantém integração por voz desligada; smoke externo/owner |
| 35 | Notificações e preferências | **Ativo** | TBD | Drawer/badges, `workspace_notifications` viva e testes | Jornada com dois usuários da etapa 65; owner |
| 36 | Magazine | **Ativo** | **Promo Brindes Engineering** | Cinco rotas privadas + pública; serviço Supabase tipado; três relações vivas; documento de módulo e extensa suíte | Reexecutar jornada integral da etapa 62 após CI; flag `magazineModule` ainda não governa rollout |
| 37 | Product Match | **Ativo** | TBD | Usa catálogo real; mock só aparece em DEV se catálogo vazio | Teste explícito de build produtivo sem mock; owner |
| 38 | Dropbox browser | **Parcial** | TBD; review técnico parcial `@adm01-debug` | Rota + `dropbox-list` e E2E existem | Credencial/smoke externo ainda exigem autorização; owner de domínio |
| 39 | Busca visual/Raio-X | **Parcial** | TBD | Rota e fluxo principal existem; `visual_search_feedback` viva | Telemetria de erro aponta para contrato ausente segundo `E-A`; validar observabilidade |
| 40 | Simulation orchestrator | **Parcial** | TBD | `/simulacao` chama `simulation-orchestrator` | `simulation_runs`/`simulation_logs` ausentes e falso verde documentado; gate antes de exposição |
| 41 | Dashboard de cobertura importável | **Demo** | TBD | `CoverageInsightsDashboardPage.tsx:15-43` inicia com nove snapshots hardcoded; real só por upload JSON | Integrar artefato real de CI ou manter como demo explicitamente isolada |
| 42 | Workflows IA | **Demo** | TBD | `WorkflowCanvas.tsx:53-175` usa só `useState`; ativar/pausar não persiste nem executa | Persistência + executor + flag; hoje é maquete técnica em `DevRoute` |
| 43 | PromoFlix Playground | **Demo** | TBD | Badge “QA Mode” e stream Mux de teste hardcoded | Restringir como ferramenta QA ou integrar catálogo real; owner |

### 5.3 Integrações, administração e compatibilidade

| # | Módulo/feature | Estado | Owner | Evidência objetiva | Lacuna para o próximo estado |
|---:|---|---|---|---|---|
| 44 | Clientes/CRM externo | **Parcial** | TBD | `/clientes`, `/clientes/:id`, `crm-db-bridge` com kill switch efetivo | Flag `crm_bridge_enabled` é ineficaz; disponibilidade/credenciais externas não validadas nesta fase |
| 45 | Bitrix sync | **Parcial** | TBD; review técnico parcial `@adm01-debug` | Ações diretas existem | `bitrix_clients`/`bitrix_deals` ausentes; `sync_full` e leituras armazenadas podem dar falso verde (`E-A`) |
| 46 | Webhook outbound/dispatcher | **Parcial** | TBD | Edge e kill switch efetivo; estruturas de outbox/delivery no banco | Job de processamento desativado por ausência de URL segundo `E-A`; validar drenagem real |
| 47 | Webhook inbound | **Parcial** | TBD; review técnico parcial `@adm01-debug` | Handler/schema/testes existem | Contratos divergentes e persistência precisam das etapas 36-38; não liberar V2 por suposição |
| 48 | Administração de usuários, catálogo e RBAC | **Ativo** | TBD | Rotas `AdminRoute`, hooks/tabelas e testes nominais em `E-R` | Jornada por papéis, branch gates e owner |
| 49 | Status, telemetria e observabilidade técnica | **Parcial** | TBD | Rotas técnicas, dashboards e `system_kill_switches` vivos | `fn_ema_pipeline_health` ausente; telemetria visual/search parcial; CI externo sem capacidade |
| 50 | Harnesses públicos `__test/*` e `/debug/images` | **Demo** | TBD | Nove rotas públicas de QA/debug no app atual | Definir isolamento intencional; hoje oito `__test/*` não têm gate de ambiente |
| 51 | Harnesses `__visual/*` | **Demo** | TBD | Oito rotas condicionais a `import.meta.env.DEV` | Manter fora de produção e cobertas por teste de roteamento |
| 52 | `external-db-bridge` | **Legado** | TBD | Endpoint é stub 410; switch vivo está off/100%; REST nativo substituiu o caminho | Remoção física somente após confirmar zero callers e autorização explícita |
| 53 | Comissões | **Legado** | TBD | `/comissoes` e `/admin/comissoes` usam `DeprecatedRoute` com redirecionamento | Preservar compatibilidade até decisão de remoção |
| 54 | Performance/Performance Comercial antigas | **Legado** | TBD | Rotas admin redirecionam para BI com mensagem de descontinuação | Preservar aliases até decisão de remoção |
| 55 | Comparação de cenários do simulador | **Desativado** | TBD | `ScenarioComparison` não é montado; somente seu tipo é importado | Decidir entre integração real e limpeza autorizada |
| 56 | Notas de estoque | **Desativado** | TBD | `useStockNotes` não tem consumer; `stock_notes` não existe no banco | Decisão PO nas etapas 51-52 antes de criar ou remover qualquer coisa |
| 57 | Auditoria de configuração de auth | **Desativado** | TBD | `runAuthAudit` sem caller; RPC `check_auth_config_status` ausente deliberadamente | Decidir ligar ou aposentar; não criar RPC para código dormente |

## 6. Contratos vivos confirmados e ausências relevantes

A consulta `E-DB2` confirmou a presença dos principais contratos de catálogo, favoritos, carrinhos, coleções, orçamento, drafts de simulador, kits, mockups, Magic Up, Magazine, notificações, comparações, estoque e confiabilidade.

### Presentes no canônico

- Relações: `products`, `product_variants`, `favorite_lists`, `favorite_items`, `seller_carts`, `seller_cart_items`, `collections`, `collection_items`, `quotes`, `quote_items`, `simulator_wizard_drafts`, `custom_kits`, `kit_templates`, `kit_variants`, `kit_collaborators`, `kit_comments`, `generated_mockups`, `mockup_drafts`, `magic_up_generations`, `magic_up_campaigns`, `magic_up_brand_kits`, `magazines`, `magazine_items`, `magazine_templates`, `workspace_notifications`, `user_comparisons`, `user_preferences`, `mv_stock_rupture_alert` e `mv_supplier_reliability`.
- Funções: `fn_super_filtro_product_ids`, `ensure_default_favorite_list`, `restore_seller_cart`, `create_quote_transactional`, `update_quote_transactional`, `increment_kit_template_usage`, `get_client_seasonality`, `get_industry_seasonality`, `get_supplier_reliability_history`, `fn_get_color_swatches_batch`, `fn_get_reposicao_listing`, `fn_get_replenishment_stats` e `fn_get_reposicao_variants_summary`.

### Ausentes no canônico

- Relações: `feature_flags`, `stock_notes`, `simulation_runs`, `simulation_logs`, `bitrix_clients` e `bitrix_deals`.
- Função: `fn_ema_pipeline_health`.

Ausência não autoriza criação nem exclusão. Ela apenas impede classificar como concluído o fio que depende do objeto.

## 7. Proposta de flags/gates — somente desenho, sem implementação

Estas são fronteiras candidatas para a etapa 7. Os nomes ainda precisam de decisão do PO e não devem ser adicionados silenciosamente ao registro atual.

| Prioridade | Fronteira proposta | Default seguro enquanto parcial | Motivo | Gate para ativar |
|---|---|---|---|---|
| P0 | Catálogo real do Kit Builder | off/falha explícita | Evitar `MOCK_BOXES/MOCK_ITEMS` em venda real | Jornada 64, empty/error test, provenance e owner |
| P0 | `simulation-orchestrator` | off | Tabelas ausentes e falso verde em HTTP | Contrato das etapas 39-40, persistência aprovada e testes de quatro estados |
| P0 | Ações persistidas do Bitrix (`sync_full`, stored reads/logs) | off | Objetos ausentes e falso verde | Contrato por ação, storage aprovado ou remoção autorizada |
| P0 | `webhook-inbound` V2 | off/canary server-side | Handler/schema/testes divergem | HMAC, idempotência, destino e retenção das etapas 36-38 |
| P0 | `edge_ai_recommendations` | manter no kill switch existente, mas torná-lo efetivo | A linha remota existe e hoje não controla o handler | Chamada a `assertSwitchEnabled` + teste 410/healthy; sem criar duplicata client-side |
| P1 | Saídas decisórias de BI com dados mistos | off quando qualquer campo decisório for mock | Mock pode alimentar IA, exportação e notificações como fato | Provenance estrutural e autorização de design da etapa 57 |
| P1 | Rating de confiança de fornecedor | off ou explicitamente simulado | Rating é mock, lead time é real | Separação visual aprovada e contrato de fonte real |
| P1 | Painel EMA completo | off separado dos badges EMA | Flag atual promete painel não montado e depende de RPC ausente | Montagem, RPC/equivalente, empty/error e E2E |
| P1 | Harnesses públicos de teste | off em build produtivo, salvo exceção deliberada | Oito `__test/*` estão públicos sem gate | Decisão PO/QA, teste de rotas por ambiente e atualização do catálogo E2E |
| P2 | `stock_notes` | off | Hook dormente e tabela ausente | Decisão PO + contrato BD autorizado ou limpeza autorizada |
| P2 | `runAuthAudit` | off | Código dormente e RPC deliberadamente ausente | Decisão de produto + contrato e caller real |

### Não reutilizar sem decisão

- `custom_kits_v2` não deve ser reaproveitada automaticamente para “catálogo real do Kit Builder”: ninguém provou que “v2” representa essa fronteira.
- `e2e_tests` não deve ser tratada como proteção dos harnesses: hoje não é lida por eles.
- `crm_bridge_enabled` não deve competir com `edge_crm_db_bridge`; definir claramente rollout client-side versus desligamento de emergência server-side.
- `advanced_analytics`, `magic_up`, `magazineModule`, `presentation_mode`, `voice_commands`, `mfa` e `ai_recommendations` não devem permanecer com aparência de controle se o runtime continuar ignorando-as.

## 8. Gate mínimo para qualquer transição para “ativo”

- [ ] Owner de domínio atribuído e registrado.
- [ ] Caller/montagem executável identificada.
- [ ] Flag efetivamente lida na fronteira correta, com teste on/off.
- [ ] Default e fail mode definidos: fail-open ou fail-closed, com justificativa.
- [ ] Contratos de tabela/RPC/Edge existentes no canônico, ou feature independente deles.
- [ ] Nenhum fallback silencioso capaz de virar dado comercial real.
- [ ] Testes unitários/contrato para sucesso, vazio, erro e retry/idempotência quando aplicável.
- [ ] E2E da jornada crítica executado em ambiente autorizado.
- [ ] Baseline visual aprovada quando houver alteração perceptível.
- [ ] Telemetria e rollback/kill switch validados.
- [ ] CI bloqueante executado; existência de YAML não conta como evidência verde.
- [ ] Aceite do PO para exposição do módulo.

## 9. Decisões humanas pendentes

1. Atribuir owner aos 56 módulos sem responsável de domínio documentado.
2. Escolher se o rollout client-side será estritamente estático por deploy ou se haverá SSOT remoto. Hoje não há `feature_flags` no banco.
3. Definir uma taxonomia única: feature flag, kill switch, env flag, demo flag e dev gate não devem ser sinônimos.
4. Decidir quais módulos parciais devem permanecer visíveis, falhar explicitamente ou ficar ocultos até o gate correspondente.
5. Decidir o destino das 10 flags client-side sem consumer: implementar, renomear com contrato claro ou remover em lote autorizado.
6. Reconciliar o catálogo E2E antigo com as rotas atuais antes de usá-lo como fonte de readiness.
7. Restaurar a capacidade do GitHub Actions e reexecutar os gates; até lá, “ativo” significa readiness estrutural medida, não aprovação final 10/10.

## 10. Checklist da parte read-only das etapas 7 e 66

- [x] Registro client-side inventariado integralmente.
- [x] Consumers reais contados por nome de flag.
- [x] Kill switches vivos consultados no banco canônico em modo read-only.
- [x] Enforcement de cada kill switch cruzado com o código.
- [x] Flags implícitas de ambiente/localStorage/query string mapeadas.
- [x] Módulos principais agrupados e classificados nos cinco estados exigidos.
- [x] Owner preenchido quando documentado; desconhecidos marcados `TBD` sem inferência.
- [x] Contratos críticos presentes/ausentes cruzados com `pg_catalog`.
- [x] Candidatas a novas fronteiras de rollout propostas sem alteração de código/config/banco.
- [ ] Owners aprovados pelo PO.
- [ ] Política de SSOT de flags aprovada.
- [ ] Flags/gates implementados e testados — fora do escopo read-only desta entrega.
- [ ] Readiness revalidada em staging/CI após liberações externas.

## Referências principais

- `src/lib/feature-flags.ts`
- `src/lib/external-db/kill-switch-client.ts`
- `supabase/functions/_shared/kill_switch.ts`
- `src/routes/AppRoutes.tsx`
- `src/routes/public-routes.tsx`
- `docs/INVENTARIO_ROTAS_CONTRATOS_2026-08-26.md`
- `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md`
- `docs/MAGAZINE_MODULE.md`
- `.github/CODEOWNERS`
