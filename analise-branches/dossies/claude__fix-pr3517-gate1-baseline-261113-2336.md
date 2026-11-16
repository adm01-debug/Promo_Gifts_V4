# origin/claude/fix-pr3517-gate1-baseline-261113-2336

- **Veredito:** COMPLETAR  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** o conserto grande dos rascunhos de kit (15 de 21 kits que nao abriam) ja esta no ar; o que sobrou aqui sao quatro conveniencias de orcamento/carrinho/mockup que foram construidas pela metade e hoje nenhum vendedor consegue ver na tela.
- **Tip / merge-base / main:** tip `f4e68117728b703c549fa296b9eb10a8837a80e9` · merge-base `835fee0c1e1487218397a754e952764c6e045eb7` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`
- **PR:** #3548 — **aberta, nunca mergeada** (`gh api repos/adm01-debug/Promo_Gifts_V4/pulls/3548` → `"merged": false, "state": "open"`). A antecessora #3517 esta `closed` sem merge.

## O que a branch quis fazer

Pelos 4 commits (nenhum deles na main):

1. `85c9194777` — resgatar da PR #3390, arquivo a arquivo, o que ainda faltava na main: disponibilidade de
   preco no kit-builder ("Nao informado" em vez de R$ 0), validacao de composicao, leitura validada do
   rascunho, estados de hidratacao/confirmacao de quantidade, serializacao JSON tipada, aprovar orcamento
   na lista, restaurar rascunho de orcamento, filtro por produto no grafico de vendas, tecnicas no
   historico de mockups, cor da empresa no carrinho, tipos extraidos em `*.types.ts`; e **arquivar** em
   `recovery/src-legacy` as correcoes da PR nos arquivos que a main ja tinha movido para la.
2. `fcb1e91ffb` — fazer o rascunho de kit com `personalization_data = {}` voltar a abrir (15 de 21 kits
   em producao, de 17 pessoas diferentes) e limpar o erro de hidratacao ao sair de `?kit=X`.
3. `480e5bc721` — consertar o Gate 1 que a #3517 tinha quebrado: restaurar `.file-size-baseline.json`
   byte a byte do main, compactar `mockupGenerationService.ts` para caber no limite e remover o codigo
   morto que a #3517 havia trazido.
4. `f4e6811772` — registrar no ledger `docs/coordenacao/conflitos-semanticos.md` o merge herdado (Gate 1.18).

Medida mecanica do estado: dos **309** arquivos que a branch mexeu, **41 estao byte-identicos a main hoje**
e 268 diferem; dos 268 que diferem, **243 sao `recovery/src-legacy/**`** e so **25** sao codigo vivo
(`src/`, `tests/`, baselines e o ledger).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Rascunho de kit com `personalization_data = {}` volta a abrir | **ESTA** — resgate cirurgico pelo PR #3631 | `main:src/lib/kit-builder/snapshot/read-draft.ts:187-189` (`row.personalization_data ?? { box: { enabled: false }, items: {} }`), citado em `main:docs/coordenacao/conflitos-semanticos.md:31`; `git diff main branch -- src/lib/kit-builder/snapshot/read-draft.ts` = vazio |
| Disponibilidade de preco no kit-builder ("Nao informado") | **ESTA**, byte-identico | `git diff main branch -- src/lib/kit-builder/pricing-availability.ts` = vazio; idem `tests/components/kit-builder/financial-availability.test.tsx` |
| Validacao de composicao do kit | **ESTA**, byte-identico | `git diff main branch -- src/lib/kit-builder/validate-composition.ts` = vazio |
| Estados de hidratacao / confirmacao de quantidade no kit-builder | **ESTA**, byte-identico | `git diff main branch -- src/hooks/kit-builder/useKitBuilderPageState.ts src/hooks/kit-builder/useKitAutoSave.ts tests/hooks/useKitBuilderPageState.snapshot.test.tsx` = vazio |
| Serializacao JSON tipada (`json-value`) | **ESTA**, byte-identico | `git diff main branch -- src/lib/json-value.ts src/lib/__tests__/json-value.test.ts` = vazio |
| Filtro por produto no grafico de vendas | **ESTA**, byte-identico | `git diff main branch -- src/components/intelligence/SalesOverviewChart.tsx src/hooks/intelligence/useSalesHistoryMacro.ts tests/components/SalesOverviewChart.product-filter.test.tsx` = vazio |
| Checagem de linhas afetadas (`useQuoteTemplates`, `useDeviceDetection`) | **ESTA**, byte-identico | `git diff main branch -- src/hooks/quotes/useQuoteTemplates.ts src/hooks/admin/useDeviceDetection.ts` = vazio |
| `voiceFilterPatch` (filtros por voz) | **ESTA**, melhor, com outro nome | `main:src/pages/products/applyVoiceFilters.ts` cobre o mesmo mapeamento e ainda trava preco negativo, trata o sentinela 9999 e `endomarketing`; a versao da branch (`src/lib/filters/voiceFilterPatch.ts`) nao tem nada disso |
| **Botao "Restaurar rascunho" no orcamento** | **NAO ESTA** — e na branch nenhuma tela liga | `git grep "quote-autosave-restore\|Restaurar rascunho" main -- src tests` = **0 resultados**; na branch, `src/components/quotes/QuoteAutoSave.tsx:403` renderiza o botao, mas nenhum `<QuoteAutoSave ... onRestore=` existe em `src/pages` |
| **Validacao do rascunho de orcamento (`quoteDraftRecovery`, zod, 117 linhas)** | **NAO ESTA** | arquivo novo; `git grep -l quoteDraftRecovery main` so acha dossies em `.md`. Na main o rascunho e aplicado sem validar forma: `main:src/hooks/quotes/useAutoSaveQuote.ts` `migratePayload` faz `return payload as AutoSavePayload<T>` |
| Restauracao automatica de rascunho de orcamento NOVO | **ESTA** (automatica, sem botao) | `main:src/hooks/quotes/useQuoteBuilderState.ts:255-258` (`restoreEnabled: !isEditMode && !hasIncomingHandoff`) e `onRestore` em `:275`. Em orcamento **em edicao** nao restaura — e exatamente o caso que o botao da branch cobriria |
| **"Aprovar" no menu da linha da lista de orcamentos** | **NAO ESTA** — e na branch nenhuma tela liga | `git grep "onMarkApproved\|quote-row-menu-approve" main -- src tests` = **0 resultados**; na branch, `src/components/quotes/QuotesConfigurableList.tsx:529-536` tem o item de menu com trava de papel e de transicao, mas nenhuma pagina passa `onMarkApproved` |
| Aprovar orcamento (a capacidade em si) | **ESTA**, por outro caminho | `main:src/components/quotes/QuoteKanbanBoard.tsx:359,379` aprova arrastando no kanban |
| **Cor da empresa na borda do item do carrinho** | **NAO ESTA** — e na branch nenhuma tela liga | `git grep companyAccentColor main -- src` = 0; na branch so aparecem o proprio componente (`src/components/cart/SortableCartItem.tsx:114-119`) e o teste dele |
| **Tecnicas cadastradas no filtro do historico de mockups** | **NAO ESTA** — e na branch nenhuma tela liga | branch `src/components/mockup/MockupHistoryPanel.tsx:113-119` soma `techniques` as opcoes; `src/pages/mockups/MockupGenerator.tsx:586-594` **nao** passa `techniques` |
| Tipos extraidos (`*.types.ts` de cart/skeletons/mockup/quotes) | **NAO ESTA**, por decisao registrada | sao movimentacao de tipo para baixar o baseline de tamanho; excluido no item (11) de `main:docs/coordenacao/conflitos-semanticos.md:31` ("ampliacao de baseline e proibida") |
| Compactacao de `mockupGenerationService.ts` | **NAO ESTA**, e a main esta melhor | a branch tira o parametro `limit` de `fetchMockupHistory` e volta a `.limit(200)` fixo, e troca tipagem por `as string`; excluido no item (9) do mesmo ledger |
| Troca de item no kit-builder (`replaceTarget` / `useKitItemReplaceTarget`) | **ESTA na main e a branch NAO tem** | `git diff main branch -- src/components/kit-builder/ItemSelector.tsx src/pages/kit-builder/KitBuilderPage.tsx` mostra a branch **removendo** `replaceTarget`, `onReplaceItem`, o banner "Substituindo: ..." e o `data-testid="wizard-next"` |
| Historico de mockups: pagina valida apos excluir + layout de 375px (A-33) | **ESTA na main e a branch NAO tem** | o mesmo diff mostra a branch removendo os dois `useEffect` de correcao de pagina/comparacao e os `flex-wrap` do A-33 |
| 3 baselines (`.as-assertions`, `.as-unknown`, `.indexed-access`) | **NAO ESTA**, e e artefato gerado | main `productionAsCount: 2146` (`generatedAt` 2026-11-09) vs branch `1773` (2026-11-13): numeros medidos na arvore da branch, nao na main; regeneraveis por script e proibidos de alterar em resgate (item 11 do ledger) |
| Entrada E188 no ledger de conflitos | **NAO ESTA** | `git show main:docs/coordenacao/conflitos-semanticos.md \| grep 3548` = vazio. E registro do proprio merge da branch; so vale se a branch for mergeada. O diff tambem mostra a branch **apagando** 25 linhas de registros que a main acrescentou depois |
| `recovery/src-legacy/**` (243 arquivos: 195 alterados, 48 novos, 1 apagado) | **FORA por decisao registrada** | item (4) do ledger: "codigo morto, fora de `tsconfig.app.json` e do `vitest.config.ts`". Amostra dos diffs: `<th className="p-2"></th>` → `<th className="p-2" />`, uniao `'ok'\|'warn'\|'crit'` reordenada alfabeticamente — zero comportamento |

## A resgatar

1. **`src/components/quotes/QuoteAutoSave.tsx` + `src/components/quotes/QuoteAutoSave.types.ts` + `src/lib/quotes/quoteDraftRecovery.ts` + `tests/components/QuoteAutoSave.recovery.test.tsx` (268 linhas de teste)** — botao "Restaurar rascunho" e a validacao da forma do rascunho. Importa porque hoje, ao **editar** um orcamento existente, a main nao oferece recuperar o rascunho local (`restoreEnabled: !isEditMode`): quem perde o navegador no meio da edicao refaz na mao. Falta ligar: nenhuma pagina passa `onRestore` ao componente, e nada em producao usa o schema zod (so o teste dele).
2. **`src/components/quotes/QuotesConfigurableList.tsx` + `src/components/quotes/quoteList.types.ts` + `tests/components/QuotesConfigurableList.approval.test.tsx` (130 linhas)** — "Aprovar" no menu da linha, com trava de papel (`canManage` ou vendedor dono) e de transicao valida. Importa porque hoje aprovar exige abrir o kanban e arrastar. Falta ligar: nenhuma pagina passa `onMarkApproved`.
3. **`src/components/mockup/MockupHistoryPanel.tsx` (prop `techniques`) + `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx`** — o filtro de tecnica do historico passa a listar todas as tecnicas cadastradas, nao so as que ja apareceram em algum mockup. Falta ligar: `MockupGenerator.tsx` nao passa `techniques`. **Atencao:** pegar so esse trecho; o arquivo da branch e mais antigo que o da main e traria de volta dois defeitos (pagina invalida apos excluir e o layout quebrado em 375px).
4. **`src/components/cart/SortableCartItem.tsx` (prop `companyAccentColor`) + `.types.ts` + teste** — borda do item do carrinho na cor da marca do cliente. Falta ligar: nenhuma pagina passa a cor. Valor baixo, decidir se vale.

Nada disso deve entrar por merge da branch: o merge apagaria a troca de item no kit-builder, o parametro `limit` do historico de mockups, as correcoes A-33 e de paginacao do historico, 25 linhas do ledger de conflitos e sobrescreveria 3 baselines com numeros medidos em outra arvore.

## Risco de fechar esta branch

Fechar sem resgatar **nao quebra nada no ar**: todo o conserto que afetava cliente (os rascunhos de kit) ja esta em producao desde o PR #3631, e esta branch nunca foi mergeada. O que se perde e trabalho pronto e testado de outro agente que hoje nao chega ao usuario: a recuperacao de rascunho de orcamento em edicao (o vendedor que perde a aba refaz o orcamento na mao), o atalho de aprovar na lista, e duas conveniencias menores (filtro de tecnicas, cor da marca no carrinho) — somando cerca de 480 linhas de teste que seriam reescritas do zero mais tarde. Ja existe pendencia aberta para exatamente isso ("Terminar restauracao de rascunho de orcamento + aprovar na lista (familia #3548)"), o que confirma que o item nao esta resolvido.

## Nao verificado

- **207 dos 243 arquivos de `recovery/src-legacy/**` nao foram lidos um por um** (36 vieram com diff no pacote; o resto esta so listado por nome). A conclusao de que nao tem valor vem de tres coisas verificaveis e nao de leitura integral: a pasta esta fora de `tsconfig.app.json` e de `vitest.config.ts` (nao entra em build, lint nem teste), o ledger da main ja a excluiu por escrito (item 4 de `docs/coordenacao/conflitos-semanticos.md:31`) e os 36 diffs lidos sao todos cosmeticos. Se o dono quiser reativar algum desses arquivos legados, a leitura dos 207 precisa ser feita.
- **Nenhum comando de build, lint ou teste foi executado** nesta analise (a tarefa e somente leitura). As afirmacoes de "verde" nos corpos dos commits sao do agente que fez a branch, nao conferidas aqui.
- **Nao conferido em producao** se a cor da marca da empresa existe como dado disponivel na tela do carrinho (o item 4 pode nao ter de onde tirar a cor).


## Segunda passada — arquivos que faltavam

A 1a passada leu so os 40 primeiros arquivos. Esta passada fechou os 11 de codigo criados pela branch e
ausentes da main (lista A), os 10 que existem na main com conteudo diferente (lista C) e decidiu o bloco de
registro em conjunto. **21 arquivos de codigo lidos.** Esta branch compartilha o commit `85c9194777` com
`claude/resgate-3390-261113`; conferi que, nos arquivos destas listas, as duas branches sao praticamente
iguais (`git diff --numstat c5297cf f4e6811 -- <lista C>` difere so em `ModernSkeletons.tsx` 0/1 e
`mockupGenerationService.ts` 2/4), entao as conclusoes valem para as duas.

### Achado que muda o metodo

Para 5 dos 10 arquivos da lista (C), **a main esta byte-identica ao ponto de partida desta branch** — nada do
que a branch fez neles chegou a main, e nao houve "a main andou por outro caminho":

```
git diff --numstat 835fee0 e4ab7f8 -- src/components/cart/SortableCartItem.tsx \
  src/components/cart/__tests__/SortableCartItemVariant.test.tsx \
  src/components/loading/ModernSkeletons.tsx src/components/quotes/QuoteAutoSave.tsx \
  src/components/quotes/QuotesConfigurableList.tsx
→ (saida vazia)
```

### Correcao de rumo (vale tambem para o dossie irmao)

A 1a passada desta branch ja tinha registrado certo: a main **restaura o rascunho de orcamento NOVO
automaticamente** (`main:src/hooks/quotes/useQuoteBuilderState.ts:257` `restoreEnabled: !isEditMode && !hasIncomingHandoff`,
`onRestore` em `:276`), e **nao restaura em modo edicao**. Confirmado nesta passada. O dossie de
`claude/resgate-3390-261113` dizia "NAO ESTA" sem essa ressalva e foi corrigido lá.

### Tabela — lista (A): criados pela branch, ausentes da main

| arquivo | esta na main? onde | evidencia |
| --- | --- | --- |
| `src/lib/filters/voiceFilterPatch.ts` | **ESTA, com outro nome e melhor** — `main:src/pages/products/applyVoiceFilters.ts` | mesmo mapeamento campo a campo; a main ainda trava preco negativo, ignora `NaN`, respeita o sentinela 9999 e trata `endomarketing`. `main:src/pages/products/__tests__/applyVoiceFilters.test.ts` tem **37** `it(` |
| `tests/pages/legacy-filter-voice.test.ts` | coberto pelo teste da main | o da branch so confere limites de preco e que dois caminhos apontam para a mesma funcao |
| `src/components/loading/ModernSkeletons.types.ts` | **ESTA** — as mesmas interfaces, dentro do componente | `main:src/components/loading/ModernSkeletons.tsx:4` e `:554`, campo a campo iguais; o arquivo da branch so muda de lugar (`git diff 835fee0 f4e6811 -- src/components/loading/ModernSkeletons.tsx` = so recorta/reimporta tipos) |
| `src/components/cart/SortableCartItem.types.ts` | **NAO ESTA** (novidade: `companyAccentColor`) | `git grep companyAccentColor e4ab7f8 -- src` → 0 resultados |
| `src/components/mockup/MockupHistoryPanel.types.ts` | **NAO ESTA** (novidade: `techniques?`) | `git grep techniques e4ab7f8 -- src/components/mockup/MockupHistoryPanel.tsx` → 0 resultados |
| `src/components/quotes/QuoteAutoSave.types.ts` | **PARCIAL** — a main tem as mesmas props menos `onRestore` | `main:src/components/quotes/QuoteAutoSave.tsx:38` tem `serverSavedAt`; `onRestore` nao aparece no arquivo |
| `src/components/quotes/quoteList.types.ts` | **PARCIAL** — `ColumnDef`/`PrefetchRowProps` ja existem na main; so `onMarkApproved` e novo | `git grep onMarkApproved e4ab7f8 -- src tests` → 0 resultados |
| `src/lib/quotes/quoteDraftRecovery.ts` | **NAO ESTA** | `git grep quoteDraftRecoverySchema e4ab7f8 -- src tests` → 0 resultados |
| `tests/components/QuoteAutoSave.recovery.test.tsx` | **NAO ESTA** | nada na main cita `quote-autosave-restore` |
| `tests/components/QuotesConfigurableList.approval.test.tsx` | **NAO ESTA** | nada na main cita `quote-row-menu-approve` |
| `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx` | **NAO ESTA** | idem `techniques` |

### Tabela — lista (C): existem na main com conteudo diferente

| arquivo | a intencao da branch esta na main? | evidencia |
| --- | --- | --- |
| `src/components/kit-builder/ItemSelector.types.ts` | **ESTA, e a main e superconjunto** | `git diff f4e6811 e4ab7f8 -- <arq>` = a main **soma** `replaceTarget` e `onReplaceItem` |
| `src/components/kit-builder/ItemSelector.tsx` | **ESTA, e a main e superconjunto** | mesmo diff: a main so acrescenta o modo "substituir item" (banner "Substituindo: …" e desvio em `handleAddItem`) |
| `src/pages/kit-builder/KitBuilderPage.tsx` | **ESTA, e a main e superconjunto** | `git diff f4e6811 e4ab7f8 -- <arq>` tem **so linhas `+`** (`useKitItemReplaceTarget`, fiacao do `onReplaceItem`, `data-testid="wizard-next"`) |
| `src/hooks/mockup/mockupGenerationService.ts` | **ESTA, byte-identico no trecho que importa** | o bloco `downloadMockupAsPdf` que a branch escreveu (`product?`/`technique?` opcionais, fallback `'personalizacao'`) e **exatamente** o que esta em `main`; a main ainda tornou o `limit` do historico parametrizavel. Confirma o item (9) do ledger: o merge da branch pioraria o arquivo |
| `src/components/mockup/MockupHistoryPanel.tsx` | **NAO** — a main foi por outro caminho | branch: extrai tipos e **soma `techniques`** ao filtro. Main: dois `useEffect` que corrigem pagina e comparacao apos excluir, layout A-33 em 375px, alvos de toque de 44px — sem `techniques`. Reaplicar exige remontar o trecho sobre a versao de hoje |
| `src/components/cart/SortableCartItem.tsx` | **NAO** — main identica ao ponto de partida | branch soma `companyAccentColor` validado por `CSS.supports` e `style={{ borderColor }}` no `Card` |
| `src/components/cart/__tests__/SortableCartItemVariant.test.tsx` | **NAO** — main identica ao ponto de partida | 27 linhas de teste da cor da marca, ausentes |
| `src/components/loading/ModernSkeletons.tsx` | **NAO** — e sem efeito | a mudanca e so recortar duas interfaces e reimporta-las; zero comportamento |
| `src/components/quotes/QuoteAutoSave.tsx` | **NAO** — main identica ao ponto de partida | 111 linhas somadas pela branch (botao "Restaurar rascunho", leitura do `localStorage`, `isRecoverableDraft`) nao existem na main |
| `src/components/quotes/QuotesConfigurableList.tsx` | **NAO** — main identica ao ponto de partida | a branch soma "Aprovar" no menu da linha com trava de papel (`canManage \|\| (isSeller && quote.seller_id === user.id)`) e de transicao (`isValidQuoteTransition(quote.status, 'approved')`); o menu da main tem so ver/editar/duplicar/excluir (`main:…QuotesConfigurableList.tsx:521-548`) |

### O que falta resgatar (confirmado nesta passada)

Igual ao que a 1a passada ja listou, agora com a prova de que a main nunca tocou esses arquivos. Veredito
segue **COMPLETAR** — e **nao por merge da branch**, que apagaria a troca de item no kit-builder, o `limit`
do historico de mockups, as correcoes A-33/paginacao e 25 linhas do ledger.

1. **Recuperar o rascunho ao EDITAR um orcamento** (`QuoteAutoSave` + `onRestore` + `quoteDraftRecovery` +
   268 linhas de teste). Em orcamento novo a main ja devolve sozinha; na edicao, nao.
2. **Aprovar o orcamento direto na lista** (`QuotesConfigurableList` + `quoteList.types.ts` + 130 linhas de
   teste). Hoje exige abrir o kanban e arrastar.
3. **Filtro do historico de mockups listar as tecnicas cadastradas** — so o trecho `techniques`, remontado
   sobre o arquivo de hoje.
4. **Cor da marca do cliente na borda do item do carrinho** — valor baixo; ninguem passa a cor nem na branch.

### Bloco de registro — `recovery/src-legacy/` (decisao da pasta inteira)

48 arquivos novos (24 `.ts` + 24 `.tsx`) alem dos 195 alterados: 14 extracoes de tipo e componentes antigos
(carrinho, favoritos, orcamento), 34 testes legados (kit, orcamento, mockup, favoritos, lint).
**Recomendacao: nao incorporar, e nao usar isso como motivo para manter a branch viva.** Confirmado que a
pasta nao entra no compilador (`main:tsconfig.app.json:30-32` → `"include": ["src"]`) nem no Vitest
(`main:vitest.config.ts:45-77` coleta so `tests/`, `src/`, `e2e/scripts/__tests__`, `supabase/functions/...`,
`scripts/__tests__`). E os testes legados apontam para o layout antigo: `recovery/src-legacy/tests/hooks/useKitAutoSave.financial.test.tsx:15`
importa `@/hooks/useKitAutoSave`, caminho que **nao existe na main** (o hook vive em
`main:src/hooks/kit-builder/useKitAutoSave.ts`, com teste proprio em
`main:tests/hooks/useKitAutoSave.validation-recovery.test.tsx`). Como estao, nao rodam e nao protegem nada.

### Nao verificado nesta passada

- **O conteudo das assercoes dos 48 arquivos novos de `recovery/src-legacy/`**: li os nomes, os imports de um
  deles e a exclusao da pasta no `tsconfig`/`vitest`; nao conferi um a um se alguma assercao cobre regra de
  negocio que a main hoje nao cobre.
- **Os 195 arquivos alterados em `recovery/src-legacy/`** seguem sem leitura integral (a 1a passada leu 36).
- **Nenhum comando de build, lint ou teste foi executado** (tarefa somente leitura).
- **Nada conferido em producao**: tudo acima e leitura de codigo e de historico do git.
