# origin/claude/resgate-3390-261113

- **Veredito:** COMPLETAR  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** o grosso desta branch (kits salvos que voltam a abrir, preco "Nao informado" em vez de R$ 0, filtro de produto no grafico de vendas) ja esta no ar; sobraram duas melhorias de orcamento meio-construidas — recuperar um orcamento perdido quando o navegador fecha, e aprovar um orcamento direto da lista — que estao no codigo mas sem botao ligado em nenhuma tela.
- **Tip / merge-base / main:** tip `c5297cfefaf0c0ce1ab152663029d30f1ae133c6` · merge-base `be2fb404348a77b81cbe028cc0afb09ead75dd88` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits (`85c9194777` e `fcb1e91ffb`, Joaquim Ataides, 13/11). A intencao declarada no corpo das
mensagens:

1. **Resgatar da PR #3390 o que ainda faltava na main**, arquivo por arquivo: disponibilidade de preco no
   kit-builder, `validate-composition`, leitura validada do rascunho de kit (`snapshot/read-draft`),
   estados de hidratacao/confirmacao de quantidade no `KitBuilderPage`, serializacao JSON tipada
   (`json-value`), checagem de linhas afetadas em `useQuoteTemplates`/`useDeviceDetection`, restauracao de
   rascunho no `QuoteAutoSave`, aprovar orcamento na lista, filtro por produto no grafico de vendas,
   tecnicas no historico de mockups, cor da empresa no carrinho, extracao de tipos (`*.types.ts`) e os
   testes correspondentes.
2. **Arquivar em `recovery/src-legacy`** as correcoes da #3390 nos 195 arquivos que a main ja tinha movido
   para lá, mais 48 auxiliares/testes.
3. **Nao trazer** o que reverteria correcoes da main, o que depende do legado fora de `src/`, e as
   migrations/tipos de `quote_comments` e `is_trusted` ("pedem decisao do dono").
4. No segundo commit: rascunho de kit com `personalization_data = {}` (15 dos 21 kits de producao) volta a
   abrir; sair de `?kit=X` para `/montar-kit` limpa erro de hidratacao; copia de template de orcamento
   nasce com `usage_count 0`.

A branch nao toca banco, edge function, workflow nem script:
`git diff --name-only be2fb40 c5297cf -- supabase scripts .github` devolve 0 arquivos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Rascunho de kit com personalizacao vazia volta a abrir (`snapshot/read-draft.ts`) | **ESTA** — arquivo identico | `git log --oneline origin/main -- src/lib/kit-builder/snapshot/read-draft.ts` → `e998b09560 fix(kit): rascunhos de kit salvos sem personalização voltam a abrir (resgate cirúrgico da #3390) (#3631)`; o arquivo nem aparece em `git diff --numstat c5297cf e4ab7f8 -- src` |
| Preco desconhecido nao vira R$ 0 (`pricing-availability.ts`, `validate-composition.ts`) | **ESTA** — identicos | mesmo commit `e998b09560` (lista de arquivos da PR #3631 inclui `pricing-availability.ts` 33 linhas e `validate-composition.ts` 91 linhas) |
| Serializacao JSON tipada (`src/lib/json-value.ts` + teste) | **ESTA** — identico | `e998b09560` traz `src/lib/json-value.ts` (17) e `src/lib/__tests__/json-value.test.ts` (104) |
| Estados de hidratacao, erro de rascunho e confirmacao de quantidade no `KitBuilderPage` | **ESTA, e a main andou mais** | `git diff c5297cf e4ab7f8 -- src/pages/kit-builder/KitBuilderPage.tsx`: a main **soma** `useKitItemReplaceTarget`, `replaceTarget`/`onReplaceItem` e `data-testid="wizard-next"`; nada do que a branch pos foi removido |
| Filtro por produto no grafico de Vendas Internas | **ESTA** | `e998b09560` traz `SalesOverviewChart.tsx`, `useSalesHistoryMacro.ts`, `CommercialIntelligencePage.tsx` e os testes `SalesOverviewChart.product-filter.test.tsx` / `useSalesHistoryMacro.product-filter.test.ts` |
| Extracao de tipos do kit-builder (`BoxSelector.types.ts`, `ItemSelector.types.ts`) | **ESTA, e a main andou mais** | `git cat-file -e e4ab7f8:src/components/kit-builder/ItemSelector.types.ts` existe; `git diff c5297cf e4ab7f8` mostra a main **acrescentando** `replaceTarget`/`onReplaceItem` ao mesmo arquivo |
| `downloadMockupAsPdf` aceita produto/tecnica ausentes | **ESTA** (refatorado) | `git diff c5297cf e4ab7f8 -- src/hooks/mockup/mockupGenerationService.ts`: a main mantem a assinatura opcional e so extrai `const label = technique?.code \|\| technique?.name \|\| 'personalizacao'` |
| `useQuoteTemplates` / `useDeviceDetection` (linhas afetadas, copia com `usage_count 0`) | **ESTA** — identicos | nao aparecem em `git diff --numstat c5297cf e4ab7f8 -- src` |
| **Restaurar rascunho de orcamento do navegador** (`QuoteAutoSave` com `onRestore`, botao "Restaurar rascunho", `isRecoverableDraft`) | **NAO ESTA** | `git grep 'quote-autosave-restore\|Restaurar rascunho\|isRecoverableDraft' e4ab7f8 -- src tests` → zero linhas. A main grava o rascunho (`QuoteAutoSave.tsx:41 STORAGE_KEY_PREFIX='quote_draft_'`) e nunca oferece ler de volta |
| Validador do rascunho (`src/lib/quotes/quoteDraftRecovery.ts`, schema zod) | **NAO ESTA** | `git grep 'quoteDraftRecovery' e4ab7f8 -- src tests` → zero linhas |
| **Aprovar orcamento direto da lista** (`onMarkApproved`, item "Aprovar" no menu da linha, permissao por vendedor/gestor) | **NAO ESTA** | `git grep 'onMarkApproved\|quote-row-menu-approve' e4ab7f8 -- src tests` → zero linhas; o menu da linha na main tem so ver/editar/duplicar/excluir (`QuotesConfigurableList.tsx:521-548`) |
| Tecnicas cadastradas no filtro do historico de mockups (prop `techniques`) | **NAO ESTA** | `git show e4ab7f8:src/components/mockup/MockupHistoryPanel.tsx` — `MockupHistoryPanelProps` (L63-70) nao tem `techniques`; `historyTechniques` (L115) continua derivado so do historico |
| Cor da empresa na borda do item do carrinho (`companyAccentColor`) | **NAO ESTA** | `git grep 'companyAccentColor' e4ab7f8 -- src` → zero linhas |
| Voz aplicando filtros reais do catalogo (`applyVoiceFilterPatch`) | **NAO ESTA** — e a main escolheu outro caminho | `git grep 'voiceFilterPatch' e4ab7f8` → zero; na main `src/components/search/useGlobalSearch.ts:186-196` transforma os filtros de voz em **texto de busca** (so categoria/cor/material) |
| Paineis "Inteligencia de vendas"/historico de acoes do carrinho (`LegacyCartInsights.tsx`) | **NAO ESTA — e a main proibiu de voltar** | `src/components/cart/CartUtilComponents.tsx:6-11` (main): "`SmartSuggestions` e `ActionHistoryPanel` foram removidos... helpers `recordAction`/`getActionHistory`/`clearActionHistory` tambem foram excluidos por serem dead code"; o teste `src/contexts/__tests__/SellerCartContext.test.tsx:6-12` quebra de proposito se voltarem |
| `bridgeBadge` em `src/components/dev/metrics/MetricUtils.ts` | **NAO ESTA** — e sem consumidor vivo | `git grep 'bridgeBadge' e4ab7f8` acha so em `recovery/src-legacy/.../BridgeCallItem.tsx` (pasta arquivada) |
| `DetailedProductDetailSkeleton` + tipos extraidos de `ModernSkeletons` | **NAO ESTA** — e sem consumidor | na branch o unico import e o reexport dentro do proprio `ModernSkeletons.tsx:744`; `git grep 'DetailedProductDetailSkeleton' e4ab7f8` → zero |
| Correcoes da #3390 nos 243 arquivos de `recovery/src-legacy/` | **NAO ESTA** — a main manteve a versao antiga do arquivo arquivado | o (B) do pacote e o inverso exato do (A) em todos os casos lidos (ex.: `BridgesLiveCard.tsx` L258, `<th className="p-2"></th>` ↔ `<th className="p-2" />`). Codigo fora do compilador: `tsconfig.app.json` tem `"include": ["src"]` |
| 4 baselines (`.file-size`, `.as-assertions`, `.as-unknown`, `.indexed-access`) | divergentes, irrelevante | sao arquivos gerados por script; a main tem os seus, regenerados depois |

## A resgatar

Nada aqui funciona ponta a ponta nem na branch — sao capacidades sem quem as chame. Por isso o veredito e
COMPLETAR, nao RESGATAR_PARCIAL puro.

1. **Recuperar orcamento perdido quando o navegador fecha** — `src/components/quotes/QuoteAutoSave.tsx`
   (+ `QuoteAutoSave.types.ts`, `src/lib/quotes/quoteDraftRecovery.ts`, teste
   `tests/components/QuoteAutoSave.recovery.test.tsx`, 272 linhas).
   Por que importa: hoje o sistema **grava** o rascunho no navegador e nao sabe devolver. Se o vendedor
   fecha a aba no meio de um orcamento grande, o trabalho esta salvo e inacessivel.
   O que falta: ninguem passa `onRestore` — nem na branch. `git show c5297cf:src/pages/quotes/QuoteBuilderPage.tsx`
   (L177-196) monta `<QuoteAutoSave>` sem `onRestore`, e `restoreEnabled = Boolean(onRestore)` deixa o
   botao invisivel. Terminar = ligar o `QuoteBuilderPage` ao schema de validacao e confirmar com o dono o
   que acontece com os itens ja digitados na tela.
2. **Aprovar orcamento direto da lista** — `src/components/quotes/QuotesConfigurableList.tsx`
   (+ `quoteList.types.ts`, teste `tests/components/QuotesConfigurableList.approval.test.tsx`, 130 linhas).
   Por que importa: tira cliques do dia do vendedor/gestor (hoje precisa abrir o orcamento para aprovar) e
   a regra de quem pode aprovar ja esta escrita (gestor, ou vendedor dono do orcamento, e so em transicao
   valida de status via `isValidQuoteTransition`).
   O que falta: `onMarkApproved` nao e passado por nenhuma pagina — `git grep 'onMarkApproved' c5297cf`
   acha so o proprio componente, o tipo e o teste. Terminar = ligar na pagina da lista de orcamentos a
   mesma mutacao de status que o builder usa.
3. **Filtro do historico de mockups mostrar tecnicas cadastradas** — `src/components/mockup/MockupHistoryPanel.tsx`
   (+ `.types.ts`, teste `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx`).
   Por que importa: ganho pequeno — hoje o filtro so lista tecnicas que **ja aparecem** no historico.
   Atencao: a main reescreveu bastante esse painel depois (`git diff --numstat c5297cf e4ab7f8` → 49 linhas
   a mais, 43 a menos, e tres testes novos de paginacao/alvos/acoes). Reaplicar exige remontar sobre a
   versao de hoje, nao copiar o arquivo da branch.

Nao resgatar (decisao da main, com guarda no CI): `LegacyCartInsights.tsx` e seu teste — a main removeu
esses paineis de proposito e tem teste que quebra se voltarem. Tambem sem valor: `bridgeBadge`,
`DetailedProductDetailSkeleton` e os tipos extraidos de `ModernSkeletons` (nenhum consumidor),
`companyAccentColor` no carrinho (cosmetico, sem quem passe a cor) e `applyVoiceFilterPatch` (a main
escolheu transformar voz em texto de busca; mudar isso e decisao de produto, nao resgate).

## Risco de fechar esta branch

Baixo-medio, e concentrado em um lugar. O conteudo central ja esta em producao pela PR #3631 — fechar nao
perde nada disso. O que se perde se a branch for apagada sem mais:

- as duas melhorias de orcamento acima (restaurar rascunho e aprovar na lista), com **402 linhas de teste
  ja escritas** que nao existem na main; refazer isso do zero custa horas e o risco e repetir o defeito que
  os testes ja cobrem (rascunho corrompido, permissao de quem aprova);
- as correcoes da #3390 nos 243 arquivos de `recovery/src-legacy/` — codigo fora do compilador, hoje sem
  efeito nenhum, mas que inclui ganhos reais de comportamento caso algum arquivo volte a `src/` (ex.:
  `QuoteCommentsSection.tsx` com travamento de duplo envio, limite de tamanho do comentario, confirmacao
  antes de excluir e botao de tentar de novo). A tabela `quote_comments` existe em producao
  (`supabase/migrations/20251227180004_quote_comments.sql`) e a tela nao esta mais em `src/` — ligar ou nao
  comentarios em orcamento e decisao do dono, nao desta analise.

Recomendacao: nao apagar a branch antes de a familia "restauracao de rascunho + aprovar na lista" entrar
por PR. Depois disso, o que sobra e so o arquivo arquivado, e a branch pode ser fechada.

## Nao verificado

- **207 dos 243 arquivos de `recovery/src-legacy/`**: li o diff de 36 (os que o pacote trouxe) e amostrei
  dois maiores; os outros 207 ficaram sem leitura de diff. Base da afirmacao de que sao inertes:
  `tsconfig.app.json` com `"include": ["src"]` e o proprio `recovery/src-legacy/README.md` da branch
  ("Nada daqui entra no `tsc`, no ESLint nem no Vitest"). Nao verifiquei se algum deles contem correcao de
  negocio relevante como a de `QuoteCommentsSection.tsx`.
- Nao rodei `tsc`, lint nem testes (tarefa somente leitura); as verificacoes citadas nas mensagens de
  commit da branch sao declaracoes do autor, nao foram reproduzidas aqui.
- Nao verifiquei comportamento em producao de nenhum dos itens; tudo acima e leitura de codigo e historico.


## Segunda passada — arquivos que faltavam

A 1a passada leu so os 40 primeiros arquivos. Esta passada fechou os 16 de codigo criados pela branch e
ausentes da main (lista A), os 11 que existem na main com conteudo diferente (lista C) e decidiu o bloco de
registro (`recovery/src-legacy/`) em conjunto. **27 arquivos de codigo lidos.**

### Achado que muda o metodo

Para 6 dos 11 arquivos da lista (C), **a main esta byte-identica ao ponto de partida da branch** — ou seja,
nada do que a branch fez neles chegou a main, e nao houve "a main andou por outro caminho":

```
git diff --numstat be2fb40 e4ab7f8 -- src/components/cart/SortableCartItem.tsx \
  src/components/cart/__tests__/SortableCartItemVariant.test.tsx \
  src/components/dev/metrics/MetricUtils.ts src/components/loading/ModernSkeletons.tsx \
  src/components/quotes/QuoteAutoSave.tsx src/components/quotes/QuotesConfigurableList.tsx
→ (saida vazia)
```

Os outros 5 a main mexeu, e em 4 deles a main e **superconjunto** do que a branch fez.

### Correcao de rumo da 1a passada

A 1a passada registrou "restaurar rascunho de orcamento: **NAO ESTA** na main". Isso e forte demais. A main
**ja devolve o rascunho automaticamente em orcamento NOVO**: `main:src/hooks/quotes/useQuoteBuilderState.ts:257`
(`restoreEnabled: !isEditMode && !hasIncomingHandoff`) e o `onRestore` em `:276`. O que falta mesmo e o caso
de **orcamento em edicao** (excluido pelo `!isEditMode`), mais a validacao da forma do rascunho e o botao
explicito. O risco para o negocio e menor do que a 1a passada sugeriu: quem perde a aba montando um orcamento
novo nao perde o trabalho; quem perde a aba **editando** um orcamento existente, perde.

### Tabela — lista (A): criados pela branch, ausentes da main

| arquivo | esta na main? onde | evidencia |
| --- | --- | --- |
| `src/lib/filters/voiceFilterPatch.ts` | **ESTA, com outro nome e melhor** — `main:src/pages/products/applyVoiceFilters.ts` | mesma assinatura (`FilterState`, `VoiceFilters`) e o mesmo mapeamento campo a campo; a main ainda trava preco negativo, ignora `NaN`, respeita o sentinela 9999 e trata `endomarketing`. Testes: `main:src/pages/products/__tests__/applyVoiceFilters.test.ts` tem **37** `it(` contra ~6 do teste da branch |
| `src/pages/filters/voiceFilterPatch.ts` | idem (e e so um reexport de 1 linha) | `git show c5297cf:src/pages/filters/voiceFilterPatch.ts` → `export { applyVoiceFilterPatch } from '@/lib/filters/voiceFilterPatch';` |
| `tests/pages/legacy-filter-voice.test.ts` | coberto pelo teste da main | o teste da branch so verifica que os dois caminhos apontam para a mesma funcao e os limites de preco — tudo coberto pelos 37 casos da main |
| `src/components/loading/ModernSkeletons.types.ts` | **ESTA** — as mesmas interfaces, dentro do proprio componente | `main:src/components/loading/ModernSkeletons.tsx:4` (`ProductCardSkeletonProps`) e `:554` (`MockupSkeletonProps`), campo a campo iguais. O arquivo da branch so muda de lugar |
| `src/components/loading/DetailedProductDetailSkeleton.tsx` | **NAO ESTA**, mas a main ja tem equivalente ligado | `main:src/components/loading/ModernSkeletons.tsx:505` `ProductDetailSkeleton()`, usada em `main:src/pages/products/ProductDetail.tsx:278`. O arquivo da branch e um segundo esqueleto, mais fiel ao layout 5fr/7fr, que **nenhuma tela chamava nem na branch**: `git grep DetailedProductDetailSkeleton c5297cf -- src tests` acha so o proprio arquivo e um reexport em `ModernSkeletons.tsx:744` |
| `src/components/cart/LegacyCartInsights.tsx` | **NAO ESTA — e a main proibiu de voltar** | `main:src/components/cart/CartUtilComponents.tsx:7-11` registra a exclusao de `SmartSuggestions`/`ActionHistoryPanel`/`recordAction`/`getActionHistory`; `main:src/contexts/__tests__/SellerCartContext.test.tsx:68-69` e `main:src/pages/products/seller-carts/__tests__/CartSidebar.render.test.tsx:133` quebram se voltarem. O `FollowUpTimer` do mesmo arquivo ja tinha saido de `src/` **antes** do ponto de partida (`git log -S FollowUpTimer --oneline e4ab7f8 -- src` → `5dd9b949d3 chore(repo): move 316 arquivos obsoletos da #3361 de src/ para recovery/src-legacy`) |
| `src/components/cart/__tests__/LegacyCartInsights.test.tsx` | idem — e o teste do que a main proibiu | mesma evidencia |
| `src/components/cart/SortableCartItem.types.ts` | **NAO ESTA** (so a cor da marca e novidade; o resto e mudanca de lugar) | `git grep companyAccentColor e4ab7f8 -- src` → 0 resultados |
| `src/components/mockup/MockupHistoryPanel.types.ts` | **NAO ESTA** (novidade: o campo `techniques?`) | `git grep techniques e4ab7f8 -- src/components/mockup/MockupHistoryPanel.tsx` → 0 resultados |
| `src/components/quotes/QuoteAutoSave.types.ts` | **PARCIAL** — a main tem as mesmas props menos `onRestore` | `main:src/components/quotes/QuoteAutoSave.tsx:38` tem `serverSavedAt`; `git grep onRestore e4ab7f8 -- src/components/quotes/QuoteAutoSave.tsx` → 0 |
| `src/components/quotes/quoteList.types.ts` | **PARCIAL** — `ColumnDef`/`PrefetchRowProps` existem na main; so `onMarkApproved` e novo | `git grep onMarkApproved e4ab7f8 -- src tests` → 0 resultados |
| `src/lib/quotes/quoteDraftRecovery.ts` | **NAO ESTA** | `git grep quoteDraftRecoverySchema e4ab7f8 -- src tests` → 0 resultados |
| `src/pages/quoteDraftRecovery.ts` | idem (reexport de 1 linha) | `git show c5297cf:src/pages/quoteDraftRecovery.ts` → `export { quoteDraftRecoverySchema } from '@/lib/quotes/quoteDraftRecovery';` |
| `tests/components/QuoteAutoSave.recovery.test.tsx` | **NAO ESTA** | nenhum teste da main cita `quote-autosave-restore` |
| `tests/components/QuotesConfigurableList.approval.test.tsx` | **NAO ESTA** | nenhum teste da main cita `quote-row-menu-approve` |
| `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx` | **NAO ESTA** | idem `techniques` |

### Tabela — lista (C): existem na main com conteudo diferente

| arquivo | a intencao da branch esta na main? | evidencia |
| --- | --- | --- |
| `src/components/kit-builder/ItemSelector.types.ts` | **ESTA, e a main e superconjunto** | `git diff c5297cf e4ab7f8 -- <arq>` = a main **soma** `replaceTarget` e `onReplaceItem`; nada da branch foi removido |
| `src/components/kit-builder/ItemSelector.tsx` | **ESTA, e a main e superconjunto** | mesmo diff: a main so acrescenta o modo "substituir item" (banner "Substituindo: …", `handleAddItem` desviando para `onReplaceItem`) |
| `src/pages/kit-builder/KitBuilderPage.tsx` | **ESTA, e a main e superconjunto** | `git diff c5297cf e4ab7f8 -- <arq>` tem **so linhas `+`** (`useKitItemReplaceTarget`, fiacao do `onReplaceItem`, `data-testid="wizard-next"`); nenhuma linha da branch foi tirada |
| `src/hooks/mockup/mockupGenerationService.ts` | **ESTA, e a main e superconjunto** | o bloco `downloadMockupAsPdf` da main (`product?`/`technique?` opcionais + `'personalizacao'` de fallback) e equivalente linha a linha ao da branch; a main ainda tornou o `limit` do historico parametrizavel |
| `src/components/mockup/MockupHistoryPanel.tsx` | **NAO** — a main foi por outro caminho | branch (mb→tip): extrai os tipos e **soma `techniques`** as opcoes do filtro. Main (mb→main): dois `useEffect` que corrigem pagina e comparacao apos excluir, layout A-33 em 375px, alvos de toque de 44px — e **nenhum `techniques`**. Reaplicar exige remontar o trecho sobre a versao de hoje |
| `src/components/cart/SortableCartItem.tsx` | **NAO** — main identica ao ponto de partida | branch soma `companyAccentColor` com validacao da cor (`CSS.supports`) e `style={{ borderColor }}` no `Card`; `git diff --numstat be2fb40 e4ab7f8 -- <arq>` vazio |
| `src/components/cart/__tests__/SortableCartItemVariant.test.tsx` | **NAO** — main identica ao ponto de partida | 27 linhas de teste da cor da marca, ausentes |
| `src/components/dev/metrics/MetricUtils.ts` | **NAO** — e sem valor | branch soma 8 linhas: `bridgeBadge()`, so cores de etiqueta de painel interno; `git grep bridgeBadge e4ab7f8` acha apenas em `recovery/src-legacy/` (pasta arquivada) |
| `src/components/loading/ModernSkeletons.tsx` | **NAO** — e sem efeito | a mudanca da branch e so tirar duas interfaces do arquivo e reimporta-las; zero comportamento |
| `src/components/quotes/QuoteAutoSave.tsx` | **NAO** — main identica ao ponto de partida | 111 linhas somadas pela branch (botao "Restaurar rascunho", leitura do `localStorage`, `isRecoverableDraft`) nao existem na main |
| `src/components/quotes/QuotesConfigurableList.tsx` | **NAO** — main identica ao ponto de partida | a branch soma o item "Aprovar" no menu da linha com trava de papel (`canManage \|\| (isSeller && quote.seller_id === user.id)`) e de transicao (`isValidQuoteTransition(quote.status, 'approved')`); o menu da main tem so ver/editar/duplicar/excluir (`main:src/components/quotes/QuotesConfigurableList.tsx:521-548`) |

### O que falta resgatar (confirmado nesta passada)

Ordem por impacto no negocio. Nenhum funciona ponta a ponta nem na branch — todos sao capacidades sem tela
que as chame. Por isso o veredito segue **COMPLETAR**.

1. **Recuperar o rascunho ao EDITAR um orcamento** — `QuoteAutoSave.tsx` + `QuoteAutoSave.types.ts`
   (`onRestore`) + `src/lib/quotes/quoteDraftRecovery.ts` + teste (272 linhas).
   Efeito: hoje o vendedor que fecha a aba no meio da **edicao** de um orcamento ja existente refaz na mao.
   Em orcamento novo a main ja devolve sozinha.
2. **Aprovar o orcamento direto na lista** — `QuotesConfigurableList.tsx` + `quoteList.types.ts` + teste
   (130 linhas). Efeito: tira cliques do dia do vendedor/gestor; hoje aprovar exige abrir o kanban e
   arrastar (`main:src/components/quotes/QuoteKanbanBoard.tsx:379`). A regra de quem pode aprovar ja esta
   escrita e testada.
3. **Filtro do historico de mockups listar as tecnicas cadastradas** — so o trecho `techniques` do
   `MockupHistoryPanel` + teste. Ganho pequeno. **Nao copiar o arquivo da branch**: ele e anterior as
   correcoes da main (pagina invalida apos excluir e layout de 375px) e traria esses defeitos de volta.
4. **Cor da marca do cliente na borda do item do carrinho** — valor baixo, decidir se vale; ninguem passa a
   cor, nem na branch.

Nao resgatar, confirmado: `LegacyCartInsights.tsx` e seu teste (a main removeu de proposito e tem teste que
quebra se voltarem), `bridgeBadge`, `DetailedProductDetailSkeleton` (a main ja mostra esqueleto na pagina de
produto), os tres arquivos de filtro por voz (a main tem a versao melhor e mais testada) e as extracoes de
`*.types.ts` que nao trazem campo novo.

### Bloco de registro — `recovery/src-legacy/` (decisao da pasta inteira)

48 arquivos novos (24 `.ts` + 24 `.tsx`), alem dos 195 alterados: 14 sao extracoes de tipo e componentes
antigos (carrinho, favoritos, orcamento), 34 sao testes legados (kit, orcamento, mockup, favoritos, lint).
**Recomendacao: nao incorporar ao repositorio, e nao apagar a branch so por isso.** A pasta esta fora do
compilador (`main:tsconfig.app.json:30-32` → `"include": ["src"]`) e fora do Vitest (`main:vitest.config.ts:45-77`
coleta so `tests/`, `src/`, `e2e/scripts/__tests__`, `supabase/functions/...` e `scripts/__tests__`), entao
nada dali roda hoje. Pior: os testes legados apontam para o layout antigo de arquivos — por exemplo
`recovery/src-legacy/tests/hooks/useKitAutoSave.financial.test.tsx:15` importa `@/hooks/useKitAutoSave`, que
**nao existe na main** (o hook vive em `main:src/hooks/kit-builder/useKitAutoSave.ts`, e a main ja tem o seu
proprio teste em `tests/hooks/useKitAutoSave.validation-recovery.test.tsx`). Incorporar como esta nao roda e
nao protege nada; o valor eventual esta nas regras escritas dentro das assercoes, e isso so vale a pena olhar
se o dono decidir reativar alguma dessas telas.

### Nao verificado nesta passada

- **O conteudo das assercoes dos 48 testes/arquivos novos de `recovery/src-legacy/`**: li os nomes, conferi
  os imports de um (`useKitAutoSave.financial.test.tsx`) e a exclusao da pasta no `tsconfig`/`vitest`. Nao
  conferi, um a um, se alguma assercao cobre regra de negocio que a main hoje nao cobre.
- **Os 195 arquivos alterados em `recovery/src-legacy/`** seguem sem leitura integral (a 1a passada leu 36).
- **Nenhum comando de build, lint ou teste foi executado** (tarefa somente leitura). As afirmacoes de "verde"
  nos commits sao do autor da branch.
- **Nada conferido em producao**: tudo acima e leitura de codigo e de historico do git.
