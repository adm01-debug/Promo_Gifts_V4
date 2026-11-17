# Prova byte a byte das 32 branches `salvo/*` — recibo por branch

Data da medição: 2026-11-17 18:20 UTC · `main` em `4250cdea`

Este documento existe para que **fechar uma branch deixe de ser um ato de confiança**. Cada uma das
32 branches de preservação tem aqui um veredito próprio, com o número que o sustenta. A regra do
dono: só se apaga o que está provado incorporado ou provado obsoleto.

## Método, e por que ele é mais forte que comparar arquivos

O universo "já incorporado" é o conjunto de **todo objeto alcançável na história da `main`**
(`git rev-list --objects origin/main`, 125.122 objetos, clone completo — 17.865 commits até o import
inicial, sem `.git/shallow`) **mais** os objetos exclusivos das 11 branches com PR aberta nesta
sessão.

Para cada branch de preservação, listei `git ls-tree -r` inteiro (path + sha do blob) e perguntei
uma coisa só: **este conteúdo exato já existe no universo incorporado?**

Isso é mais forte que comparar caminhos porque pega conteúdo que a `main` recebeu em **outro**
caminho — exatamente o caso desta base, que moveu hooks para subpastas e páginas para
`src/pages/quotes/`. Um arquivo renomeado aparece como incorporado, porque o blob é o mesmo.

## Veredito 1 — 19 branches provadas, zero resíduo

Nestas, **todo** arquivo tem o conteúdo presente na história da `main`. Não há o que perder.

- `261116-apagadas-70` — 10.591 arquivos, 0 fora
- `261116-container` — 10.419, 0
- `261116-dependabot-obsoleta` — 10.885, 0
- `261116-fechadas-provadas` — 10.883, 0
- `261116-orfaos-container` — 10.419, 0
- `261116-pc-tips` — 10.419, 0
- `261116-recibos-e15-fechados` — 10.883, 0
- `261116-workflows-snapshot-fechada` — 10.883, 0
- `261117-adjudicadas-10` — 10.898, 0
- `261117-adjudicadas-18` — 10.901, 0
- `261117-audit-gaps-e-3390` — 10.907, 0
- `261117-backup-local` — 10.905, 0
- `261117-decisoes-finais-7` — 10.908, 0
- `261117-docs-fabrica-vps-9` — 10.897, 0
- `261117-e2e-ci-pressure` — 10.915, 0
- `261117-n28-handler` — 10.899, 0
- `261117-regras-negocio-2` — 10.898, 0
- `261117-residuos-medidos-2` — 10.908, 0
- `261117-vps-fabrica-mockup-12` — 10.890, 0

## Veredito 2 — 10 branches com resíduo resolvido

| branch | resíduo | veredito |
|---|---|---|
| `claude-fix-mockup-geometria-wysiwyg-261115-0045` | 3 arquivos de `generate-mockup` | **a `main` está à frente**: ela tem `limits.ts` (117 linhas) e `index.size.test.ts` (162) que a branch **não** tem. Rascunho anterior, superado |
| `claude-fix-mockup-logo-tamanho-real-261114-2200` | os mesmos 3 | idem, mesmo diff |
| `claude-fix-resgate-p06-p15-security-261116-2215` | migration do P06 largo + rollback + ledger | **decisão publicada na `main`**: a seção de 17/11 do ledger de migrations registra que o P06 largo **não entra** (faria 7 das 8 views responderem `permission denied`), e a versão estreita `20261117073000_p06_security_invoker_v_product_properties_public.sql` está na `main` |
| `claude-perf-cron005-refresh-all-mvs-diario-261114-1002` | ledger | revisão anterior de arquivo vivo |
| `e15-receipt-20261114120100-43959381044-261116` | ledger | revisão anterior |
| `261117-schema-snapshot-cancelled-skip` | 1 workflow | revisão anterior de arquivo vivo |
| `claude-feat-crm-vendedor-sem-dono-261115-1622` | `package.json` | revisão anterior |
| `261116-clever-lamport-zlmati` | 1 nota de passagem de sessão | **só existe aí** — ver Veredito 4 |
| `261115-preservacao` | 1 nota de preservação | **só existe aí** — ver Veredito 4 |
| `importado-vps-fabrica-v2-refazer-dc12be92-261116` | `e2e-cleanup/index.ts` | revisão anterior de arquivo vivo |

`261117-laughing-cori-o9w35e` tem 13 arquivos fora, **todos** de caminho que existe na `main`
(baselines, 6 workflows, ledger, `PENDENCIAS.md`, `RELATORIO_CI.md`, catálogo temporário de auditoria
e um teste de alertas de ruptura): revisões anteriores de arquivo vivo.

## Veredito 3 — o que ainda NÃO está resolvido: 27 arquivos, 2.172 linhas

Vêm das duas branches de trabalho do Codex (`codex-fix-gate1-kit-pdf-types-261109-2252`, 294
arquivos fora; `claude-fix-pr3517-gate1-baseline-261113-2336`, 256). Depois de descontar o que a
`main` tem em outro caminho, o que a adjudicação de 219 ausentes já julgou e o que entrou nas PRs
desta sessão, **sobram 27 nomes sem veredito algum**: nunca incorporados e nunca adjudicados.

**Esta é a fila aberta do mandato.** Nenhuma destas duas branches pode ser fechada antes dela.

### 3.1 — Componentes e libs que podem ser funcionalidade que nunca subiu (8 arquivos, 702 linhas)

| linhas | arquivo | diretório |
|---:|---|---|
| 258 | `LegacyCartInsights.tsx` | `src/components/cart/` |
| 126 | `DetailedProductDetailSkeleton.tsx` | `src/components/loading/` |
| 75 | `QuoteBuilderDraftRecovery.tsx` | `src/components/quotes/` |
| 65 | `library-list-utils.ts` | `src/lib/kit-library/` |
| 63 | `LegacyFavoritesAdapters.tsx` | `src/components/favorites/` |
| 44 | `CartEmptyStateWithTemplates.tsx` | `src/components/cart/` |
| 42 | `QuoteBuilderPaymentMethodField.tsx` | `src/components/quotes/` |
| 29 | `voiceFilterPatch.ts` | `src/lib/filters/` |

**Prioridade: `QuoteBuilderDraftRecovery.tsx`.** É a integração que liga o `onRestore` do
`QuoteAutoSave` ao `useQuoteBuilderState` — 75 linhas com guarda por campo, inferência de modo de
entrega a partir do prefixo `date:` legado e toast de sucesso. É exatamente o passo que a PR da
restauração de rascunho desta sessão listou como pendente: outro agente já havia escrito, e a
descoberta só apareceu nesta medição. **Com ele, a restauração de rascunho fica integrada ponta a
ponta; sem ele, a prop existe e ninguém a usa.**

### 3.2 — Cobertura de teste perdida (7 arquivos, 954 linhas)

Mesma classe dos 19 gaps resgatados nesta sessão, e **não estavam naquela lista**.

| linhas | arquivo | diretório |
|---:|---|---|
| 242 | `QuoteTemplatePreservation.test.tsx` | `tests/components/` |
| 220 | `LegacyCartInsights.test.tsx` | `src/components/cart/__tests__/` |
| 130 | `QuotesConfigurableList.approval.test.tsx` | `tests/components/` |
| 115 | `FavoritePresentationLauncher.legacy-compat.test.tsx` | `tests/components/` |
| 97 | `legacy-CartSidebar.preservation.test.tsx` | `tests/pages/` |
| 76 | `legacy-filter-voice.test.ts` | `tests/pages/` |
| 74 | `SmartSuggestions.test.tsx` | `src/components/search/__tests__/` |

### 3.3 — Extrações de tipo e config (11 arquivos, 478 linhas)

`collection-types.ts` (`src/hooks/collections/`), `magic-up-state-types.ts`
(`src/hooks/intelligence/`), `quote-builder-state-types.ts` (`src/hooks/quotes/`),
`TrendsPage.types.ts` (`src/pages/trends/`), `quoteList.types.ts` e `QuoteAutoSave.types.ts`
(`src/components/quotes/`), `SortableCartItem.types.ts` (`src/components/cart/`), `state-types.ts`
(`src/hooks/mockup/`), `MockupHistoryPanel.types.ts` (`src/components/mockup/`),
`ModernSkeletons.types.ts` (`src/components/loading/`), `quote-view-status-config.ts`
(`src/components/quotes/`).

Classe provável: refactor de extração de tipos que a `main` resolveu de outro jeito (tipos inline).
**Provável não é veredito** — precisa de leitura caso a caso antes de qualquer branch fechar.

### 3.4 — Um rollback órfão

`20261110024530_rollback.sql` (`supabase/rollbacks/`). A migration correspondente
(`20261110024530_restore_device_trust_contract.sql`) já tem veredito na adjudicação de 219; o
rollback dela não. Par incompleto.

## Veredito 4 — duas notas de sessão que só existem nas branches

`PRESERVACAO-261115.md` (em `261115-preservacao`) e `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md` (em
`261116-clever-lamport-zlmati`) não existem em nenhum caminho da `main`. São notas de passagem entre
sessões. **Decisão do dono**: copiar para `docs/agentes/` ou declarar consumidas. Até lá, as duas
branches não fecham.

## Consequência prática

| grupo | branches | pode fechar? |
|---|---:|---|
| Veredito 1 — zero resíduo | 19 | **sim**, provado |
| Veredito 2 — resíduo resolvido | 11 | **sim**, menos as 2 do Veredito 4 |
| Veredito 4 — nota única | 2 | **não**, aguarda decisão de 1 linha |
| Veredito 3 — fila aberta | 2 | **não**, 27 arquivos sem veredito |

Nenhuma branch foi apagada nesta medição. O comando que gerou cada número está no método acima e é
reproduzível em qualquer clone completo.

---

# Adendo da mesma sessão — adjudicação da fila aberta: 14 dos 27 resolvidos

Medição feita depois de publicar o corpo acima. Nenhum dos vereditos abaixo depende de decisão do
dono: são medidas no código da `main`.

## Resolvidos — 14

### 11 extrações de tipo: obsoletas, zero perda

A regra foi: extrair os nomes exportados do arquivo e procurar cada um na `main`. Em 9 dos 11,
**todos** os nomes já existem — a extração não foi adotada e os tipos vivem inline. Nos outros 2,
os 3 nomes órfãos têm equivalente nomeado, e em dois casos a `main` é **mais rica**:

| nome órfão | equivalente vivo na `main` |
|---|---|
| `SimulatorPrefill` | `SimulatorPrefillData` + a função `buildSimulatorQuoteItem`, em `useQuoteBuilderState.helpers.ts:334,345` |
| `BatchMockup { areaName, url }` | o mesmo objeto inline em `mockupGenerationService.ts:310,440`, **com `areaId` a mais** |
| `MockupAnnotation` | `interface Annotation` em `MockupAnnotations.tsx:13` |

### 1 rollback órfão: obsoleto

`20261110024530_rollback.sql`. A adjudicação dos 219 ausentes já registra que a migration
correspondente foi **substituída pela `20261114031000`**, que está na `main`. Rollback de migration
superada.

### 1 teste resgatado

`QuotesConfigurableList.approval.test.tsx` — 12 casos, PR própria. Era o **único** dos 7 arquivos de
teste que roda sobre código que existe.

Achado no caminho: 4 casos do arquivo original estavam **verdes pelo motivo errado**. Eles afirmavam
que o item Aprovar não aparece para comprador, outro vendedor, papéis carregando e anônimo — e
passavam porque, sem o handler, o item nunca renderizava. Com o handler correto eles reprovam:
`QuoteRowApproveItem.tsx:23-25` não checa permissão, por escolha declarada no próprio componente
("a permissão efetiva continua sendo a do banco"). **Hoje o botão Aprovar aparece para qualquer
papel e a RLS recusa no clique.** Decisão de produto, registrada em comentário no arquivo.

### 1 teste obsoleto

`QuoteTemplatePreservation.test.tsx` — exercita `QuoteTemplatesList`, `QuoteTemplateForm`,
`AdminTemplatesManager` e o `useQuoteTemplates` raiz, todos quarentenados e já adjudicados.

## Pendentes de decisão do dono — 13

Os 7 arquivos de teste **não** eram da mesma classe dos 19 gaps: 5 deles testam componente que
também nunca subiu. São par, não cobertura perdida. Somados aos 8 componentes soltos, sobram 13
itens que são **funcionalidade nova**, e decidir se o negócio quer é seu, não meu.

Para a decisão ficar barata, o candidato a equivalente que já existe na `main` — **nomeado, não
verificado linha a linha**:

| item (branch do Codex) | candidato a equivalente na `main` |
|---|---|
| `CartEmptyStateWithTemplates.tsx` | `CartEmptyStateSmart.tsx` (`src/components/cart/`) |
| `DetailedProductDetailSkeleton.tsx` | `ModernSkeletons.tsx` (`src/components/loading/`) |
| `LegacyFavoritesAdapters.tsx` + teste de compat | a família moderna em `src/components/favorites/` |
| `LegacyCartInsights.tsx` + teste (220 linhas) | `BundleSuggestionCard.tsx` e vizinhos (`src/components/cart/`) |
| `QuoteBuilderPaymentMethodField.tsx` | campo de pagamento dentro do builder (`src/components/quotes/`) |
| `library-list-utils.ts` | `src/lib/kit-library/` tem só `buildCustomKitInsert.ts` — **sem candidato óbvio** |
| `voiceFilterPatch.ts` + teste | `src/lib/filters/` **não existe** na `main`; há `src/components/filters/FilterPanel` |
| `SmartSuggestions.tsx` + teste | **sem candidato** encontrado |
| `QuoteBuilderDraftRecovery.tsx` | depende da decisão de dono do rascunho (abaixo) |

**`QuoteBuilderDraftRecovery.tsx` tem bloqueio próprio, e ele é de arquitetura.** Existem duas
restaurações em dois storages: a automática em `useAutoSaveQuote.ts:92` (chave
`quote_builder_autosave`, que **apaga** o rascunho corrompido na linha 122) e o botão explícito da PR
de restauração (chave `quote_draft_<id>`, que preserva). Integrar o componente sem escolher o dono
daria duas restaurações disputando, de fontes diferentes — pior que hoje.

## Consequência para o fechamento das branches

As 2 branches do Codex passam de "27 arquivos sem veredito" para **13 itens de decisão de produto**.
Elas continuam sem poder fechar, mas o que falta deixou de ser investigação e passou a ser escolha.
