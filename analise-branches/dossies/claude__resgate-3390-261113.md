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
