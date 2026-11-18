# Correção do inventário: o filtro anterior contava a quarentena como "existe na main"

**Gerado em 2026-11-18.** Corrige `2026-11-18-inventario-trabalho-nao-ligado.md`,
que listou **22** arquivos sem cópia na `main`. O número real é **102**.

---

## 1. O erro de método

O filtro anterior perguntava "existe arquivo com este nome na `main`?" e
respondia **sim** quando o único arquivo com aquele nome estava em
`recovery/src-legacy/` — a pasta de **quarentena**, que a `main` carrega mas
nenhuma rota, teste ou build consome.

Resultado: todo arquivo do legado que já tinha uma cópia quarentenada era dado
como "presente na main" e saía da fila de resgate.

O caso que expôs a falha: `src/components/search/SmartSuggestions.tsx` (busca
com fuzzy, sugestões inline e filtros sugeridos, com teste irmão de 6 casos).
A `main` só tem esse arquivo em `recovery/src-legacy/src/components/search/`.
Ele não aparecia em lista nenhuma.

**Filtro correto:** comparar contra a árvore da `main` **sem** `recovery/`.

| filtro | arquivos |
|---|---|
| diferença bruta de caminhos | 364 (inclui renomeações de pasta, ex. `src/hooks/useX.ts` → `src/hooks/<domínio>/useX.ts`) |
| sem homônimo na `main`, contando a quarentena | 43 |
| **sem homônimo na `main` viva (sem `recovery/`)** | **102** |

Branch de referência: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`.

---

## 2. Varredura de símbolos sobre os 102

Para cada arquivo, cada `export` foi procurado em `src/`, `tests/`, `e2e/`,
`scripts/` e `.github/` da `main`:

| resultado | arquivos |
|---|---|
| todos os exports existem na `main` | 28 |
| sem export (barril, config, asset) | 28 |
| binário / dado (`.png`, `.sql`, `.json`, `.xml`, `.md`, `.py`) | 10 |
| **algum export ausente** | **36** |

**Ressalva do método:** a varredura procura o nome em texto, então um símbolo
citado apenas num **comentário** conta como presente. Medido: `SmartSuggestions`
e `ActionHistoryPanel` deram "presente" por causa do bloco de decisão em
`CartUtilComponents.tsx:11-18`, que justamente explica por que eles **não**
voltaram. Os 28 "todos presentes" são, portanto, um teto; cada descarte exige
leitura, e todo veredicto abaixo foi lido, não inferido da varredura.

Nome ausente **não** é função perdida: a `main` renomeia muito. Exemplo medido:
`QuoteTemplatePicker` aparece como ausente, mas a função está em
`src/components/quotes/QuoteTemplateSelector.tsx:91`, montada em
`src/pages/quotes/components/QuoteBuilderNotesCard.tsx:83`. **Superado.**

---

## 3. Veredictos já fechados com evidência

### Superados (a `main` faz o mesmo com outro nome)

| legado | onde a `main` faz | evidência |
|---|---|---|
| `QuoteTemplatePicker.tsx` | `QuoteTemplateSelector.tsx` | `:91` (`data-testid="quote-use-template"`), montado em `QuoteBuilderNotesCard.tsx:83` |
| `CartEmptyStateWithTemplates.tsx` | aplicação de template no carrinho | `SellerCartsPage.tsx:1059-1078` (`onLoadTemplate`), `:563-565` (`handleLoadTemplate`) — a `main` mostra os templates sempre que existem, não só no estado vazio |
| `LegacyFavoritesAdapters.tsx` | `FavoritesViewHeader.tsx:137` ("Apresentar lista"); `ConfirmDialog` em `FavoriteListsSidebar.tsx` e `FavoritesTrashView.tsx` | ambos os exports cobertos |
| `QuoteBuilderPaymentMethodField.tsx` | campo no próprio construtor | `QuoteBuilderPage.tsx:396` |
| `DetailedProductDetailSkeleton.tsx` | `ModernSkeletons.tsx:505` (`ProductDetailSkeleton`), reexportado em `SkeletonLoaders.tsx:141` | |
| `library-list-utils.ts` | `getItemsCount` e `applySort` em `KitLibraryPage.tsx` | |
| `EdgeFunctionLogsPanel.tsx`, `BridgeCallItem.tsx` | painéis ao vivo | `BridgesLiveCard.tsx:243-253`, `SecretsManagerHealthPanel.tsx:48,98-132`; remoção deliberada pelo PR #557 (commit `10d607a47`) |

### Extrações de tipo (11 arquivos) — todas superadas

Eram refatoração pura para caber no limite de 500 linhas. Varredura símbolo a
símbolo: **todos** os tipos existem na `main`, a maioria inline no próprio
consumidor. As três exceções aparentes também estão resolvidas:

- `MockupAnnotation` → `mockupGenerationService.ts:188` tem a forma idêntica
  (`{ id: string; x: number; y: number; text: string }[]`);
- `BatchMockup` (`{areaName, url}`) → `src/types/gravacao.ts:153-156`;
- `SimulatorPrefill` → `SimulatorPrefillData` em
  `useQuoteBuilderState.helpers.ts:334`, ligada em `useQuoteBuilderState.ts:45`.

**Nenhuma perda funcional nos 11.** Podem ser descartados.

### Os 4 testes do legado — superados por cobertura equivalente

`QuoteTemplatePreservation` → `src/hooks/quotes/__tests__/useQuoteTemplates.test.ts`.
`LegacyCartInsights.test` e `legacy-CartSidebar.preservation` →
`src/contexts/__tests__/SellerCartContext.test.tsx` e
`src/pages/products/seller-carts/__tests__/CartSidebar.render.test.tsx`.
**Exceção aparente:** os dois citam `follow-up`, que a `main` não tem no
front — de propósito (seção 4.2). Essas asserções estão **obsoletas**, não
pendentes.

---

## 4. O que continua em aberto, com dono

### 4.1 Link público gerado e sem destino — defeito de produção

A `main` **gera** token de compartilhamento e **não tem para onde apontá-lo**.

- `useFavoriteLists.ts:219` grava `shared_token` + `shared_expires_at`;
  `:236` revoga.
- `FavoritesViewHeader.tsx:93` mostra o selo "compartilhada".
- `useCollections.ts:73-75,118` lê `share_token`, `share_expires_at`,
  `is_public` e expõe como `shareToken`.
- `useComparisonSync.ts:37,93,123` filtra por `share_token is null` e grava
  `is_public: false`.

Produção **já tem as colunas**: `collections(is_public, share_token,
share_expires_at)`, `user_comparisons(is_public, share_token,
share_expires_at)`, `favorite_lists(shared_token, shared_expires_at)`.

Mas `src/routes/public-routes.tsx:56` só tem **uma** rota pública:
`/revista-publica/:token`. Nenhum lugar do app transforma esses tokens em URL.
O vendedor marca a lista como compartilhada e **não recebe link nenhum**.

O que existe fechado em branch (`origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`):
`ShareCollectionDialog.tsx` (monta `/colecao-publica/<token>`),
`ShareComparisonDialog.tsx`, `ShareListDialog.tsx`, mais os e2e
`e2e/routes/public/colecao-publica.spec.ts` e `comparar-publica.spec.ts`, que
esperam a edge function `collections-public-react`.

**Nem a branch tem a rota, a página ou a edge function** — só os diálogos e as
specs. É feature pela metade dos dois lados.

**Decisão do dono (Git 7 — arquitetura e custo):** fechar o ciclo exige rota
pública nova, página nova e leitura anônima por token (edge function ou política
RLS para `anon`). Endpoint público é decisão de segurança, não de execução.
Alternativa barata: esconder a afordância de compartilhar até a decisão — mas
isso descarta trabalho, contra a regra desta fila.

### 4.2 `FollowUpTimer` — NÃO resgatar: o dono expurgou o termo do frontend

`LegacyCartInsights.tsx:226-256` traz um selo com "X dias — Hora do
follow-up!". **Não entra**, e a evidência é um guarda explícito:

`scripts/check-no-followup-frontend.mjs` bloqueia a regex
`/follow[-_ ]?up|needsFollowUp/i` em **todo** `src/`, incluindo comentários.
O cabeçalho dele diz o porquê: *"A feature `quote-followup-reminders` continua
viva no backend (edge function + tabela `follow_up_reminders`), mas o frontend
foi expurgado dos termos ... Qualquer nova ocorrência aqui deve passar por
revisão."* Script registrado em `package.json:215` e em
`scripts/automation.config.json:805-806`.

O mesmo motivo já está escrito em `CartUtilComponents.tsx:15-18`, de quando o
painel "Inteligência de vendas" foi recusado.

Renomear o componente para fugir do termo seria contornar o guarda: o que o
dono tirou foi a **superfície** de cobrança no front, não só a palavra. Fica
como decisão de produto, não de execução.

**Correção de rota:** cheguei a criar `src/components/cart/CartFollowUpTimer.tsx`
nesta sessão e apaguei antes de qualquer commit, ao ler o guarda.

### 4.3 `follow_up_reminders` — viva ponta a ponta, não é código morto

Correção de uma leitura errada minha. A tabela tem 154 linhas, 1 vendedor,
todas `is_sent = true`, última de 2026-06-20 — e **não** é órfã:

- `supabase/functions/quote-followup-reminders/index.ts:61,93` lê e grava nela;
- a função cria **notificação** para o vendedor cujo orçamento enviado há 2+
  dias não foi visto pelo cliente (é idempotente por dia);
- o cron está **ativo** em produção: `cron.job` `quote-followup-reminders`,
  `17 9 * * *`, apontando para o projeto canônico;
- a superfície no front é o painel de notificações, não um selo no carrinho —
  por isso o guarda de 4.2 existe e não conflita com nada.

A ausência de linhas novas desde junho é consequência do volume: são 7
orçamentos em produção e nenhum satisfaz o critério. **Nada a fazer, nada a
apagar.**

### 4.4 `internalNotes` fora do construtor

O construtor do legado gravava `internalNotes` no rascunho
(`QuoteBuilderDraftRecovery.tsx`); o da `main` não tem o campo no estado. O tipo
existe (`src/types/quote.ts:57,110`) e os **templates** editam
(`QuoteTemplateForm.tsx:232-236`), mas o construtor não.

Medido em produção: **0 de 7** orçamentos com `internal_notes` preenchido.
Lacuna real, impacto zero hoje.

### 4.5 Adjudicados nesta rodada

**Resgatados** (PR da sessão):

| arquivo | por que entrou |
|---|---|
| `PlatformFailureCards.tsx` | `usePlatformFailureMetrics` (`usePlatformFailureMetrics.ts:32`) já existia na `main` e **nenhuma tela o consumia** |
| `PlatformFailureAlertBanner.tsx` | idem para `usePlatformFailureAlert` (`usePlatformFailureAlert.ts:81`), com threshold, throttle e persistência — **zero consumidores** |

**Superados** (a `main` faz o mesmo, com evidência):

| legado | onde a `main` faz |
|---|---|
| `GlobalCommandBar.tsx`, `commandActions.tsx`, `CommandActionGroup.tsx` | `EnhancedSpotlight`, montado em `GlobalOverlay.tsx:38`, com 26 entradas em `SpotlightItems.ts`. Os únicos destinos extras do legado (`/ajuda`, `/datas-comemorativas`, `/relatorios`, `/tecnicas`) **não existem como rota na `main`** — portá-los criaria link morto. Os conceitos vivem dentro de outras telas (ex.: datas comemorativas em `CustomizableDashboard.tsx`) |
| `ComparisonWeightsPopover.tsx` | `ComparisonScoreCard.tsx:39,101` — sliders de peso inline, sobre o mesmo `useComparisonWeights` |
| `SkeletonShimmer.tsx` (`TextSkeleton`, `FormSkeleton`, `AvatarSkeleton`, `ListItemSkeleton`, `PageSkeleton`) | todos em `ModernSkeletons.tsx`, exportados por `components/loading/index.ts` |
| `ProductCardSkeleton.tsx` (`ProductCardInlineSkeleton`) | `ReplenishmentCardSkeleton.tsx` e o skeleton do `CatalogContent.tsx` |
| `DynamicBreadcrumbs.tsx` / `CompactBreadcrumbs` | breadcrumbs já presentes em `CatalogContent.tsx`, `ConnectionsPulseBar.tsx`, `CategorySelect.tsx` |
| `PriceResultV51.tsx` | a regra v5.1 (setup como **piso**, não soma) está em `personalization.ts:174-176`, calculada em `useWizardPricing.ts:79` e exibida em `MultiEngravingResult.tsx:316` |
| `ColdStartRetriesPanel.tsx` | cold start já visível por dois caminhos: `ColdVsWarmCrmCard.tsx` (poll de `?op=diag`) e os cards resgatados agora (`rateColdStartPct`, `lastColdStartAt`) |
| `SupabaseConnectionDebug.tsx` | `SupabaseConnectionsTab.tsx` + `ConnectionDetailsDialog.tsx` em `/admin/conexoes` |
| `TemplateSelector.tsx` / `SaveTemplateDialog.tsx` (mockup) | `QuoteTemplateSelector.tsx` e os diálogos em `cart-utils/CartDialogs.tsx` |

**Obsoletos, com motivo técnico:**

| legado | por que não volta |
|---|---|
| `technique.repository.ts` | chama `https://api.promobrindes.com.br/gravacao` **direto do browser** com `VITE_GRAVACAO_API_KEY`. A variável não existe na `main`, e tudo que é externo passa por `external-db-bridge`. Ressuscitar isso colocaria chave de API no bundle — não entra |
| `useFornecedoresGravacao.ts`, `useVariantesGravacao.ts` | miram `fornecedores_gravacao` e `tecnicas_gravacao_variantes`, que **não estão na allowlist** do bridge (`src/lib/external-db/tables.ts:77-105`). O modelo consolidou em `tabela_preco_gravacao_oficial` (54 variantes) e `tabela_preco_fornecedores_gravacao`. Falhariam em runtime |
| `QuoteCodeBadge` (dentro de `PriceResultV51.tsx`) | só **exibe** um código que recebe por prop; nada na `main` gera `quoteCode`, que existe apenas como campo de tipo em `personalization.ts:185`. Trazer o selo sem o gerador não mostra nada |
| `QuoteRowQuickActions.tsx` | veredicto anterior mantido: a largura da coluna está travada em 6.8rem por dois e2e dedicados |

### 4.6 O que continua sem leitura

`CatalogQualityDashboard.tsx` (122 l — painel de métricas de qualidade do
catálogo; **nada equivalente na `main`**), `ShareCollectionDialog.tsx`,
`ShareComparisonDialog.tsx`, `ShareListDialog.tsx` (presos à decisão de 4.1),
`SmartSuggestions.tsx` da **busca** com `InlineSuggestions` e `SmartFilters` (o
arquivo que expôs a falha do filtro; tem teste irmão de 6 casos),
`bridge-telemetry-client.ts`, `cold-start-recorder.ts` (exigem instrumentar o
bridge — custo de runtime, decisão de arquitetura), `kit-og-image.ts`,
`useCatalogPrefetch.ts`, `QuantityAndResult.tsx`.

## 5. Regra que continua valendo

Nenhuma branch, PR ou arquivo é apagado sem linha neste documento ou no recibo,
com veredicto e evidência `arquivo:linha`. Enquanto a seção 4.5 tiver itens,
`origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252` e
`origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336` **não podem ser
apagadas**.
