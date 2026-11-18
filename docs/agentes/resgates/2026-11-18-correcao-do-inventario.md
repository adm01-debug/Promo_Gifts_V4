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
**Exceção:** os dois citam `follow-up`, que a `main` não tem (seção 4).

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

### 4.2 `FollowUpTimer` — resgate pequeno e especificado

`LegacyCartInsights.tsx:226-256`: selo no carrinho do vendedor com
"X dias — Hora do follow-up!" a partir de 3 dias, "X dias desde a criação" a
partir de 2, "Criado há Xh" abaixo disso; some quando `status ===
'pronto_orcamento'`. Dois testes de outro agente já especificam o comportamento
("hides follow-up when the cart is ready for a quote"; "renders real checklist,
suggestions, action history and follow-up").

O resto do arquivo já foi resgatado para `src/components/cart/CartUtilComponents.tsx`.
Faltam `FollowUpTimer` e o auxiliar `isSuggestionProduct`. **Sem banco, sem
rota: é terminar o que o outro agente começou.**

### 4.3 `follow_up_reminders` — tabela viva, código morto

154 linhas em produção, 1 vendedor, todas `is_sent = true`, última de
**2026-06-20**. **Zero** referências no código fora de
`src/integrations/supabase/types.ts` e do baseline SQL. A tabela tem RLS
(`Users can manage own reminders`) e trigger de dono.

Não é urgente (dado histórico, nada pendente). **Decisão do dono:** manter como
histórico ou derrubar — `DROP TABLE` é DDL e só entra por
`db-apply-migration.yml`.

### 4.4 `internalNotes` fora do construtor

O construtor do legado gravava `internalNotes` no rascunho
(`QuoteBuilderDraftRecovery.tsx`); o da `main` não tem o campo no estado. O tipo
existe (`src/types/quote.ts:57,110`) e os **templates** editam
(`QuoteTemplateForm.tsx:232-236`), mas o construtor não.

Medido em produção: **0 de 7** orçamentos com `internal_notes` preenchido.
Lacuna real, impacto zero hoje.

### 4.5 Ainda não adjudicados (dos 36 com export ausente)

Sem equivalente encontrado na `main` por sondagem de palavra-chave — cada um
precisa de leitura antes de qualquer descarte:

`CatalogQualityDashboard.tsx`, `ColdStartRetriesPanel.tsx`,
`PlatformFailureAlertBanner.tsx`, `PlatformFailureCards.tsx`,
`SupabaseConnectionDebug.tsx`, `ShareCollectionDialog.tsx`,
`ShareComparisonDialog.tsx`, `ShareListDialog.tsx`, `CommandActionGroup.tsx`,
`GlobalCommandBar.tsx`, `commandActions.tsx`, `ComparisonWeightsPopover.tsx`,
`SkeletonShimmer.tsx`, `TemplateSelector.tsx` (mockup),
`DynamicBreadcrumbs.tsx`, `PriceResultV51.tsx`, `QuantityAndResult.tsx`,
`ProductCardSkeleton.tsx` (`ProductCardInlineSkeleton`),
`QuoteRowQuickActions.tsx`, `SmartSuggestions.tsx` (busca),
`useFornecedoresGravacao.ts`, `useVariantesGravacao.ts`,
`useCatalogPrefetch.ts`, `bridge-telemetry-client.ts`,
`cold-start-recorder.ts`, `kit-og-image.ts`, `technique.repository.ts`.

`QuoteRowQuickActions` já tem veredicto anterior: **rejeitado** — a largura da
coluna está travada em 6.8rem por dois e2e dedicados.

---

## 5. Regra que continua valendo

Nenhuma branch, PR ou arquivo é apagado sem linha neste documento ou no recibo,
com veredicto e evidência `arquivo:linha`. Enquanto a seção 4.5 tiver itens,
`origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252` e
`origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336` **não podem ser
apagadas**.
