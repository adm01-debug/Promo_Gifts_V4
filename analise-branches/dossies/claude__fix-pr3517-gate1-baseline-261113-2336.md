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
