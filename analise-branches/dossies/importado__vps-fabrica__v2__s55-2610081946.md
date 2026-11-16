# origin/importado/vps-fabrica/v2/s55-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que, ao reabrir um rascunho ou um mockup antigo, o vendedor veja de volta exatamente a cor (variante) e a foto do produto que ele havia escolhido — e nao a primeira foto do catalogo.
- **Tip / merge-base / main:** tip `c73482f1a644454d9aa3296552cc78ba29a6f6ac` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, de 2026-10-09: `fix(mockup): reabrir rascunho ou historico restaura variante e foto exatas`
(defeito "M07/etapa 55").

O problema que ela atacou, descrito no proprio cabecalho do arquivo novo
(`src/hooks/mockup/mockupSelectionSnapshot.ts:5-7` na branch): ao reabrir o gerador de mockup, o sistema
remontava a selecao do produto com `variant: null` e `product.images[0]` — ou seja, devolvia **a primeira
foto do produto** no lugar da foto e da cor que o vendedor havia escolhido.

Como as tabelas `mockup_drafts` e `generated_mockups` nao tem coluna para essa informacao e o schema estava
congelado, a branch resolveu sem tocar no banco: criou um "snapshot" da selecao que viaja no rascunho local
(localStorage) e num registro local por mockup salvo no historico.

Ela entregou quatro coisas:
1. modulo novo `mockupSelectionSnapshot.ts` com a fachada `mockupSelection` (`snapshot`, `restore`,
   `saveForHistory`, `readForHistory`, `clearForHistory`);
2. campo `selection` no rascunho (`MockupDraftData`) e re-hidratacao dele a partir da copia local quando o
   rascunho do servidor e mais recente;
3. uso da fachada nos cinco pontos do gerador (restaurar rascunho, autosave, salvar no historico, abrir do
   historico, excluir mockup);
4. teste novo `src/hooks/mockup/__tests__/mockupRestore.selection.test.ts` com 3 casos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Modulo `mockupSelectionSnapshot.ts` com a fachada `mockupSelection` | Esta, no mesmo caminho e com a mesma API | `git ls-tree -r --name-only origin/main -- src/hooks/mockup/` lista `src/hooks/mockup/mockupSelectionSnapshot.ts` |
| Restaurar a selecao ao reabrir o **rascunho** | Esta | `origin/main:src/hooks/mockup/useMockupGenerator.ts:281` — `if (product) setProductSelection(mockupSelection.restore(product, draft.selection));` (linha identica a da branch) |
| Gravar o snapshot no **autosave** do rascunho | Esta | `origin/main:src/hooks/mockup/useMockupGenerator.ts:334` — `selection: mockupSelection.snapshot(productSelection),` |
| Guardar a selecao junto do mockup **salvo no historico** | Esta | `origin/main:src/hooks/mockup/useMockupGenerator.ts:481` — `mockupSelection.saveForHistory(user.id, recordId, mockupSelection.snapshot(productSelection));` |
| Restaurar a selecao ao **abrir do historico** | Esta | `origin/main:src/hooks/mockup/useMockupGenerator.ts:693-694` — `const snapshot = mockupSelection.readForHistory(user?.id, mockup.id); setProductSelection(mockupSelection.restore(product, snapshot));` |
| Limpar a selecao ao **excluir** o mockup | Esta | `origin/main:src/hooks/mockup/useMockupGenerator.ts:639` — `mockupSelection.clearForHistory(user?.id, mockupToDelete);` |
| Campo `selection` no rascunho (`MockupDraftData`) | Esta | `origin/main:src/hooks/mockup/useMockupDraft.ts:70` — `selection?: MockupSelectionSnapshot \| null;` |
| Re-hidratar `selection` da copia local quando o rascunho do servidor vence a recencia | Esta — e com uma trava a mais: so cola se for o **mesmo produto** | `origin/main:src/hooks/mockup/useMockupDraft.ts:379-388` — comentario "Mesma razao das logos acima: `selection` nao existe em mockup_drafts" + `return local.selection && sameProduct ? { ...backendData, selection: local.selection } : ...` |
| Teste "rascunho restaura a variante B e a foto 3 (nao a primeira foto)" | Esta | `origin/main:src/hooks/mockup/__tests__/mockupRestore.selection.test.ts:210` |
| Teste "rascunho do backend mais recente nao apaga a selecao guardada localmente" | Esta | mesmo arquivo, linha 229 |
| Teste "historico restaura a mesma variante B e a mesma foto 3" | Esta | mesmo arquivo, linha 328 |
| Momento em que entrou | PR #3647 (2026-11-14), endurecida pela PR #3676 (2026-11-15) | `git log --oneline origin/main -- src/hooks/mockup/mockupSelectionSnapshot.ts` → `e5afe82459 2026-11-14 ... gerador de mockup ...(#3647)` e `54826844aa 2026-11-15 ... aviso de falha na selecao do mockup ...(#3676)` |

Alem de ter tudo, a main **endureceu** o que a branch comecou (tudo isso a branch nao tem):

- grava e confere o `productId` dono do snapshot, para nao colar a foto/cor de um produto em outro — risco
  real, porque essa `imageUrl` e enviada para a geracao do mockup
  (`origin/main:src/hooks/mockup/mockupSelectionSnapshot.ts`, funcao `belongsToProduct` + campo `productId`);
- teto de 20 snapshots por usuario com descarte dos mais antigos, para o historico nao estourar a cota do
  navegador e derrubar em silencio o salvamento do rascunho (`MAX_HISTORY_SNAPSHOTS`, `evictHistory`);
- avisa o vendedor na tela (`toast.error`) quando nao da para guardar ou restaurar a variante/foto;
- 5 casos de teste a mais no mesmo arquivo (linhas 220, 259, 282, 304, 362) e um arquivo de teste dedicado
  `src/hooks/mockup/__tests__/mockupSelectionSnapshot.test.ts`.

Conferi tambem o que a main **retirou** em relacao a branch nesses 4 arquivos, para nao confundir reforma
com perda: a unica remocao relevante no gerador e o bloco de parametros de URL (`?product_id`/`?technique`),
que **ja existia antes** da branch (esta no merge-base) e na main virou o hook `useMockupEntryParams` — nao
e trabalho desta branch. No teste, a main removeu o `vi.stubGlobal('localStorage', ...)` em memoria porque
passou a usar o `localStorage` do proprio ambiente de teste.

## A resgatar

Nada. Todos os itens da branch estao na main, com evidencia linha a linha na tabela acima.

## Risco de fechar esta branch

Nenhum risco pratico. O beneficio para o vendedor — reabrir e ver a cor e a foto certas — ja esta no ar na
main desde 14/11, com protecoes a mais que a branch nao tinha (nao misturar foto de um produto com outro,
e nao encher o armazenamento do navegador). Manter a branch aberta so cria a chance de alguem reaplicar a
versao **antiga e menos segura** por cima da atual, o que reintroduziria o risco de gerar mockup com a foto
do produto errado.

## Nao verificado

- Nao executei a suite de testes da main para este arquivo. A verificacao foi estatica (presenca do modulo,
  dos 5 pontos de chamada, do campo do rascunho e dos 3 casos de teste em `origin/main`). A arvore de
  trabalho desta sessao esta em outra branch (`claude/feat-resgate-mockup-assistant-261115-1420`,
  `347e67a4ed`), nao na main, portanto rodar o teste aqui nao comprovaria nada sobre a main.
- Nao abri a interface para confirmar o comportamento com um vendedor real; a conferencia foi por codigo e
  por nome de teste.
