# origin/codex/fix-gate1-kit-pdf-types-261109-2252

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** quase tudo que esta branch fez a main ja tem (ou descartou de proposito), mas tres coisas uteis ficaram de fora: o vendedor poder recuperar um orcamento interrompido sem a tela quebrar, o gerente poder aprovar um orcamento direto da lista, e o filtro de tecnicas do historico de mockups mostrar todas as tecnicas do catalogo.
- **Tip / merge-base / main:** tip `da57cd671d7e20128dbb6a927f8c0098ae6f33ec` · merge-base `1dcb3b6b0ec1bd2c11fe51391d2de9f80f75f50a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

A branch tem 6 commits acima da main. Um deles nao e dela: `e77827893c` ("fix(app): restaurar contratos e
preservar implementacoes", autor adm01-debug) e a mesma restauracao de arquivos antigos que a main fez e
depois desfez — ver "Por que 318 arquivos diferem" abaixo. Os outros 5 commits sao o trabalho proprio do
agente (45 arquivos, `git diff --name-only e77827893c da57cd671d | wc -l` = 45):

1. `212ec08a06` — tirar as migrations legadas 001–005 da pasta canonica `supabase/migrations/` (as originais
   ja estavam em `supabase/sql-legacy/`), mover 2 arquivos fora do contrato de nomes, e atualizar o catalogo
   de referencias do Supabase (confirmando `user_allowed_ips` e `record_platform_failure` via pg_catalog e
   registrando `quote_comments` como excecao).
2. `fad7c6386f` — subir as baselines das catracas do Gate 1 para "congelar" a divida dos ~611 arquivos
   reintroduzidos pela #3361, e alinhar `.github/workflows/ci.yml` aos contratos de workflow.
3. `c49315c2ad` — zerar `noUnusedLocals` (remover 6 pedacos de codigo morto) e corrigir um falso positivo do
   `scripts/check-select-columns.mjs`.
4. `6d51f65954` — trazer 4 testes de hooks Bridge/DevGate alinhados a API atual.
5. `da57cd671d` — 13 arquivos de teste (141 testes) para cobrir a busca global no gate de CI.

### Por que 318 arquivos diferem da main (a armadilha desta branch)

A main **tambem** recebeu a restauracao da #3361 (commit `167f5f8de8` "chore: registra 611 arquivos nao
rastreados de sessoes anteriores (#3361)") e depois **desfez de proposito**: commit `5dd9b949d3`
"chore(repo): move 316 arquivos obsoletos da #3361 de src/ para recovery/src-legacy" (Nov 11 2026). Ou seja:
a main decidiu que aqueles arquivos sao duplicatas obsoletas e os tirou do build, mantendo as versoes vivas
em outros caminhos (`src/pages/auth/Auth.tsx`, `src/pages/quotes/QuotesListPage.tsx`,
`src/hooks/quotes/useQuoteFunnel.ts`, `src/hooks/kit-builder/useKitAutoSave.ts`, etc.).

Classificacao mecanica dos 368 arquivos que a branch tocou vs merge-base:

| situacao na main de hoje | quantos |
|---|---|
| identico ao da branch | 50 |
| existe na main e difere | 43 |
| arquivado em `recovery/src-legacy/` (decisao explicita da main) | 195 |
| nao existe em lugar nenhum da main | 80 |

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Falso positivo do `check-select-columns` | **IDENTICO na main** | `git diff --quiet da57cd671d origin/main -- scripts/check-select-columns.mjs` → sem diferenca |
| 11 dos 13 testes de busca global (AdvancedSearch, EmptySearchState, FloatingParticles, GlobalSearch, GlobalSearchIdleStateInteractions, SearchWithSuggestions, SmartSearchInput, VisualSearchButton, VoiceOverlaySections, VoiceSearchOverlay, VoiceSearchOverlayConnected) | **IDENTICOS na main** | mesma comparacao por arquivo: 0 diferencas em `src/components/search/__tests__/` |
| `useGlobalSearch.test.ts` (23 testes) | **INCORPORADO E AMPLIADO**: a main tem os 23 e mais 1 | comparacao dos nomes dos `it(...)`: nenhum nome so na branch; so na main: "cliente sem ramo_atividade cai no rotulo generico, e com ramo preenchido NUNCA cai" (branch 557 linhas/23 testes, main 704/24) |
| 4 testes de hooks Bridge/DevGate (`useBridgeMetricsCleanup`, `useBridgeMetricsPerformance`, `useBridgeStatusBanner`, `useDevGate.ssr-contract`) | **IDENTICOS na main** | sem diferenca nos 4 arquivos em `tests/hooks/` |
| `useDevGate.ssr-contract` no script `test:cloud-status-coverage` | **NA MAIN** | `origin/main:package.json` → `test:cloud-status-coverage` inclui `tests/hooks/useDevGate.ssr-contract.test.tsx` |
| Tirar 001–005 de `supabase/migrations/` e mover 2 arquivos para `sql-legacy` | **IDENTICO na main** (os 5 arquivos nao existem mais em `supabase/migrations/`; os 2 movidos estao em `supabase/sql-legacy/` com o mesmo conteudo) | sem diferenca em `supabase/sql-legacy/20250103_placeholder.sql`, `supabase/sql-legacy/20260515120000_fix_audit_ownership_orphans_uuid_only.sql`, `supabase/sql-legacy/README.md` |
| Blindagem do `ci.yml` (permissions, ubuntu-24.04, actions por SHA, timeouts, `persist-credentials: false`) | **NA MAIN, e a main foi mais longe** | contagens iguais em branch e main: `persist-credentials: false` ×11, `ubuntu-24.04` ×11, actions por SHA ×31, `timeout-minutes` ×12. A main consolidou mais depois (comentario "wf-consolida 2026-11-13" em `.github/workflows/ci.yml`) |
| Remocao de codigo morto (`_initialTemplate`, `_draft`, `_allQuoteIds`, `_GRAY_200`, `_GREEN`, `import React`) | **RESOLVIDO na main de outro jeito**: os 5 simbolos nao existem em lugar nenhum da main, e os 5 arquivos tocados (`SaveAsTemplateButton.tsx`, `useQuoteFunnel.ts`, `Auth.tsx`, `QuotesListPage.tsx`, `kitPdfGenerator.ts`) foram arquivados em `recovery/src-legacy/` | `git grep -n "_initialTemplate\|_allQuoteIds\|_GRAY_200" origin/main -- src/` → vazio; `git ls-tree -r --name-only origin/main \| grep Auth.tsx` → `recovery/src-legacy/src/pages/Auth.tsx` e `src/pages/auth/Auth.tsx` |
| Migration `20261110024530_restore_device_trust_contract.sql` (coluna `user_known_devices.is_trusted`) | **RESOLVIDO na main por outro arquivo, e JA EM PRODUCAO** | main tem `supabase/migrations/20261114031000_fix_user_known_devices_is_trusted.sql` (+ rollback). Producao (`doufsxqlfjyuvxuezpln`, leitura em pg_attribute): `is_trusted` = boolean, NOT NULL, default `false` — exatamente o contrato que a migration da branch exige; ela seria um no-op |
| Baselines das catracas do Gate 1 (12 arquivos `.?*-baseline.json`) | **NAO ESTA — e nem deve entrar.** A main esta mais apertada que a branch | `.indexed-access-baseline.json`: main 872 erros / branch 992. `.product-interface-baseline.json`: main 10 / branch 12. `.todo-baseline.json`: main 6 TODOs / branch 52. `.toast-leaks-baseline.json`: main total 0 / branch 76 |
| Catalogo `audit/supabase-reference-catalog.temporary.json` (entradas `user_allowed_ips`, `record_platform_failure`, excecao `quote_comments`) | **NAO ESTA — e nao faz falta**: na main nao ha consumidor vivo desses objetos | `git grep -n "user_allowed_ips\|record_platform_failure" origin/main -- src/` → so `src/integrations/supabase/types.ts` (auto-gerado) |
| 195 arquivos de `src/` alterados pelo commit `e77827893c` | **NAO ESTA no build da main de proposito**: a main arquivou as versoes anteriores em `recovery/src-legacy/` | commit `5dd9b949d3` move 316 arquivos de `src/` para `recovery/src-legacy/src/` |
| ~60 testes `legacy-*` / `*.legacy.test.*` e ~15 arquivos `*.types.ts` extraidos | **NAO ESTA, e nao roda**: cada um importa modulos que a main arquivou (`@/hooks/useKitAutoSave`, `@/pages/KitBuilderPage`, `@/hooks/useQuoteTemplates`, `@/components/quotes/SaveAsTemplateButton`...) | resolucao de cada `import from '@/...'` contra a arvore da main: alvos ausentes listados por arquivo (ex.: `tests/pages/legacy-KitBuilder.partial-preservation.test.tsx` → faltam `@/hooks/useKitBuilderPageState`, `@/pages/KitBuilderPage`, `@/utils/kitPdfGenerator`) |
| Guarda antes de sincronizar orcamento com o Bitrix24 (`QuoteActionHandlers`) | **NA MAIN, mais rigorosa** | `origin/main:src/pages/quotes/quote-view/QuoteActionHandlers.ts:88` → `toast.error('Rascunho nao pode ser sincronizado', { description: 'Promova o orcamento a proposta antes de sincronizar com o CRM.' })` |
| **Recuperacao validada de rascunho de orcamento** (`isRecoverableDraft` + `quoteDraftRecoverySchema` em Zod + `QuoteBuilderDraftRecovery.tsx` + botao de restaurar) | **NAO ESTA** | `git grep -n "isRecoverableDraft\|quoteDraftRecovery" origin/main -- src/` → vazio. Na main, `origin/main:src/components/quotes/QuoteAutoSave.tsx:375-385` faz `const draft: QuoteDraft = JSON.parse(stored); return draft.data;` sem nenhuma validacao de formato |
| **Acao "Aprovar" na lista de orcamentos** | **NAO ESTA** | `git show origin/main:src/components/quotes/QuotesConfigurableList.tsx \| grep -i approv` → vazio. Na branch, mesmo arquivo linhas 422–536: `canMarkApproved` (gate `canManage \|\| (isSeller && quote.seller_id === user.id)` + `isValidQuoteTransition(quote.status, 'approved')`) e item de menu `data-testid="quote-row-menu-approve-${quote.id}"` |
| **Filtro de tecnicas do historico de mockups somando catalogo + historico** | **NAO ESTA** | `origin/main:src/components/mockup/MockupHistoryPanel.tsx:115-121` monta `historyTechniques` so a partir de `mockupHistory`; a branch adiciona a prop opcional `techniques` e funde com dedupe (diff `src/components/mockup/MockupHistoryPanel.tsx`) |
| **Migration `20261110022404_restore_quote_comments_scoped_threads.sql`** (tabela `quote_comments` + RLS + 4 policies + trigger) e harness SQL | **NAO ESTA — e a main proibe de proposito** | tabela ausente em producao (`select to_regclass('public.quote_comments')` → `null`); funcao `enforce_quote_comment_mutation` ausente (0 linhas em pg_proc); a main tem o gate `scripts/check-no-quote-comments.mjs` que **falha o CI** se `QuoteCommentsSection`, `useQuoteComments` ou `from('quote_comments')` reaparecerem, e as migrations `20260627175355` / `20260627200000` que dao DROP na tabela orfa |

## A resgatar

1. **Recuperacao de rascunho de orcamento com validacao** — `src/lib/quotes/quoteDraftRecovery.ts` (schema
   Zod completo do rascunho: cliente, contato, itens, personalizacoes, descontos, frete, prazos),
   `src/components/quotes/QuoteAutoSave.types.ts`, a guarda `isRecoverableDraft` e o botao de restaurar em
   `src/components/quotes/QuoteAutoSave.tsx`, o componente
   `src/components/quotes/QuoteBuilderDraftRecovery.tsx` e o teste
   `tests/components/QuoteAutoSave.recovery.test.tsx`.
   **Por que importa:** hoje a main le o rascunho salvo no navegador sem conferir nada
   (`QuoteAutoSave.tsx:379`). Se o dado estiver truncado, antigo ou corrompido, o vendedor recupera um
   orcamento quebrado em vez de um aviso. Casa com a pendencia ja aberta "Terminar restauracao de rascunho de
   orcamento".
   **Observacao:** os arquivos da branch importam `@/hooks/useQuoteBuilderState`, que na main vive em
   `src/hooks/quotes/useQuoteBuilderState.ts`. O resgate precisa reapontar os imports; nao da cherry-pick
   direto.

2. **Acao "Aprovar" na lista de orcamentos** — `src/components/quotes/QuotesConfigurableList.tsx` (prop
   `onMarkApproved`, gate de papel, validacao de transicao de status) +
   `tests/components/QuotesConfigurableList.approval.test.tsx` +
   `src/components/quotes/quoteList.types.ts`.
   **Por que importa:** permite aprovar um orcamento direto da lista, sem abrir a tela do orcamento. Casa com
   a pendencia ja aberta "aprovar na lista". **Decisao de negocio pendente:** a branch permite que um vendedor
   aprove o proprio orcamento (`isSeller && quote.seller_id === user.id`). Quem pode aprovar e decisao do
   dono, nao do agente.

3. **Filtro de tecnicas no historico de mockups** — prop opcional `techniques` em
   `src/components/mockup/MockupHistoryPanel.tsx` + `MockupHistoryPanel.types.ts` +
   `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx`.
   **Por que importa:** hoje o filtro so oferece tecnicas que ja apareceram em algum mockup antigo; tecnica
   nova do catalogo nao aparece na lista. Impacto pequeno, correcao pequena.

4. **DECISAO DO DONO — comentarios em orcamento** — `supabase/migrations/20261110022404_restore_quote_comments_scoped_threads.sql`,
   `supabase/rollbacks/20261110022404_rollback.sql`, `tests/sql/quote-comments/` (fixture + runner Python) e
   os consumidores `QuoteCommentsSection` / `useQuoteComments`.
   **Por que importa:** e a unica coisa nesta branch que mexe em banco de producao e que a main contradiz
   frontalmente. A main hoje **proibe** o recurso por gate de CI (`scripts/check-no-quote-comments.mjs`) e
   derrubou a tabela. A branch traz uma migration pronta, revisada, com RLS e rollback, que nunca foi
   aplicada (confirmado em producao). **Pergunta de negocio: vendedor e gerente devem poder comentar e
   responder dentro de um orcamento, ou esse recurso fica mesmo cancelado?** Enquanto nao houver resposta, a
   migration nao pode ser aplicada e os arquivos da branch nao podem voltar (quebrariam o CI).

## Risco de fechar esta branch

Se a branch for fechada sem resgatar os itens 1 a 3, perde-se trabalho pronto e testado em tres pontos:
o vendedor continua podendo recuperar um rascunho de orcamento corrompido sem aviso, ninguem aprova orcamento
pela lista, e o filtro de tecnicas do historico de mockups continua incompleto. Nenhum dos tres e urgente,
nenhum derruba o sistema.

Fechar a branch tambem apaga a unica copia da migration de comentarios de orcamento (item 4). Se o dono
quiser esse recurso algum dia, sera preciso reescrever a tabela, as 4 permissoes de acesso e os testes de
banco do zero — e esse e o item com mais trabalho perdido.

**O que NAO se deve fazer:** mergear a branch como esta. Ela reintroduz 195 arquivos duplicados que a main
tirou do sistema de proposito, afrouxa 4 catracas de qualidade que hoje estao mais apertadas na main
(TODOs 6→52, avisos de erro sem tratamento 0→76, tipagem 872→992, contrato de produto 10→12), e volta
`ci.yml` para uma versao anterior a consolidacao de 13/11.

## Nao verificado

- **195 arquivos** de `src/` que o commit `e77827893c` alterou e que a main arquivou em
  `recovery/src-legacy/`: nao abri o diff de cada um. Resolvi pela prova estrutural de que a main os tirou do
  build por decisao explicita (commit `5dd9b949d3`) e que o codigo vivo equivalente esta em outro caminho.
  Amostrei 4 (`useProducts.ts`, `useQuoteTemplates.ts`, `QuoteActionHandlers.ts`, `MockupHistoryPanel.tsx`) e
  as alteracoes eram cosmeticas (reordenar chaves de tipo), extracao de `*.types.ts` para caber na catraca de
  tamanho de arquivo, ou reapontar o hook legado para o canonico — exatamente o que a main conseguiu
  apagando a duplicata. **Risco residual:** pode haver, dentro desses 195, alguma correcao de comportamento
  que eu nao vi.
- O pacote de evidencia veio truncado (40 de 318 arquivos com diff). Os 278 restantes foram classificados por
  mim via `git` (existencia na main, comparacao de blob, resolucao de imports), nao pela leitura do diff.
- Nao rodei `npm test`, `lint` nem `typecheck` em nada desta branch; nao havia como, sem alterar a arvore de
  trabalho (proibido nesta tarefa). Os numeros de teste citados sao contagem de `it(...)` nos arquivos, nao
  execucao.
