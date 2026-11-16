# origin/importado/vps-fabrica/v2/s63-2610081947

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** conserta o historico de mockups quando alguem apaga um item (a tela nao fica mais em branco e o apagado para de contar na comparacao) — isso ja esta no ar; sobra uma unica escolha de negocio: quantos mockups podem ser comparados lado a lado, 3 (branch) ou 4 (main de hoje).
- **Tip / merge-base / main:** tip `e9ebc2f421ed4a680f925cb6cb825913fd51ac1d` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`e9ebc2f421`, "fix(mockup): reconcilia pagina e selecao de comparacao no historico"),
com quatro mudancas:

1. **Painel do historico** — depois de excluir um mockup, a lista encolhe e a pagina atual podia
   ficar acima do novo total: a grade renderizava vazia. Passou a voltar para a ultima pagina valida.
2. **Painel do historico** — um mockup ja excluido continuava contando como "selecionado" na
   comparacao. Passou a sair da selecao automaticamente.
3. **Pagina do historico** (`/mockups/historico`, tabela paginada no servidor) — excluir o ultimo
   item da ultima pagina deixava a tabela vazia com o paginador escondido. Passou a recalcular o
   total e voltar a ultima pagina valida.
4. **Regra de comparacao** — baixou o limite de itens comparados de 4 para 3, via a constante nova
   `COMPARE_LIMIT`, mantendo o checkbox visivel mesmo no limite (nao desabilita, nao esconde).

Mais os testes de regressao para cada um dos quatro pontos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| 1. Painel volta para a ultima pagina valida quando a lista encolhe | Esta — mesma logica, condensada em uma linha | `src/components/mockup/MockupHistoryPanel.tsx:164` → `useEffect(() => setCurrentPage((p) => Math.min(p, Math.max(1, totalPages))), [totalPages]);`. Entrou pelo commit `e5afe82459` (PR #3647): `git log -S"Math.min(p, Math.max(1, totalPages))" --oneline origin/main -- src/components/mockup/MockupHistoryPanel.tsx` → `e5afe82459` |
| 2. Mockup excluido sai da selecao de comparacao | Esta — reescrito com `filter`, mesmo efeito | `src/components/mockup/MockupHistoryPanel.tsx:166-169` → `const ids = new Set(mockupHistory.map((m) => m.id)); ... setSelectedForCompare((prev) => ([...prev].every((id) => ids.has(id)) ? prev : keep(prev)))` |
| 3. Pagina do historico recalcula o total apos excluir | Esta — o bloco da branch foi preservado palavra por palavra dentro do novo fluxo com dialogo de confirmacao | `src/pages/mockups/MockupHistoryPage.tsx:130-135` (`nextTotalPages` / `nextPage`); `git log -S"nextTotalPages" --oneline origin/main -- src/pages/mockups/MockupHistoryPage.tsx` → `e5afe82459` |
| 4. Checkbox de comparacao visivel e usavel mesmo no limite (sem hover) | Esta — e mais forte que na branch: a main tirou o `opacity-0 group-hover:opacity-100` e deu alvo de 44px | `src/components/mockup/MockupHistoryPanel.tsx:509-515` → comentario `// A-5: visivel sem hover; alvo de 44px via ::after` e classe sem `opacity-0` |
| 5. Teste "excluir o ultimo item da ultima pagina volta para uma pagina valida" (painel) | Esta | `tests/components/mockup/MockupHistoryPanel.pagination.test.tsx` — mesmo nome de teste, assercoes reforcadas (agora checa "Produto 1"/"Produto 12" na grade em vez do rodape) |
| 6. Teste "item removido sai da selecao de comparacao" | Esta | `tests/components/mockup/MockupHistoryPanel.pagination.test.tsx:~110` (mesmo nome de teste), mais um teste novo que a branch nao tinha: "esvaziar a selecao ao excluir o unico item selecionado sai do modo comparacao" |
| 7. Teste de pagina "excluir o ultimo item da ultima pagina volta para uma pagina valida" | Esta — **mudou de arquivo**. A main devolveu `tests/pages/MockupHistoryPage.test.tsx` ao conteudo antigo (`git rev-parse origin/main:tests/pages/MockupHistoryPage.test.tsx` = `ba007edfcd` = o mesmo blob do merge-base) e recriou o teste co-locado | `src/pages/mockups/__tests__/MockupHistoryPage.test.tsx:103` — teste com nome identico, 21 linhas / pagina de 20, e assercao final `expect(screen.queryByText('Página 2 de 2')).toBeNull()` |
| 8. Limite de comparacao = 3 (`COMPARE_LIMIT`) | **NAO ESTA** — a main mantem 4, de proposito | `src/components/mockup/MockupHistoryPanel.tsx:105` → `if (prev.size >= 4) return prev;`. A constante nunca existiu na main: `git log -S"COMPARE_LIMIT" --oneline origin/main -- src/components/mockup/MockupHistoryPanel.tsx` → saida vazia. E a main escreveu um teste que fixa o 4: `tests/components/mockup/MockupHistoryPanel.pagination.test.tsx:161` → `it('a comparação continua aceitando até 4 itens (regra de negócio do main)')` com `expect(screen.getByText('4 selecionados'))` |

Resumo: **os tres defeitos que a branch consertou estao no ar** (entraram pelo commit `e5afe82459`,
PR #3647, que foi justamente um trem de resgates). O unico ponto que ficou fora e o **numero maximo
de mockups na comparacao** — e ficou fora por escolha explicita de quem fez o resgate, que ate
escreveu um teste dizendo "regra de negocio do main".

## A resgatar

| arquivo | o que | por que importa |
| --- | --- | --- |
| `src/components/mockup/MockupHistoryPanel.tsx:105` | Limite de itens na comparacao: a branch queria 3 (`COMPARE_LIMIT = 3`), a main tem 4 | E uma decisao de negocio/usabilidade, nao um bug: quantos mockups o vendedor pode por lado a lado para mostrar ao cliente. Nao e codigo perdido — e uma pergunta aberta. Com 4 lado a lado em celular (375px) cada imagem fica muito pequena; com 3 cabe melhor, mas perde uma opcao de comparacao. A main ja escolheu 4 e travou com teste; so o dono muda isso. |

## Risco de fechar esta branch

Praticamente nulo do ponto de vista de defeito: as tres correcoes de comportamento (tela em branco
depois de excluir, no painel e na pagina; item apagado contando na comparacao) estao na main de hoje,
com teste de regressao em dois arquivos. Fechar a branch nao devolve nenhum desses bugs.

O unico efeito de fechar sem olhar e perder o registro da pergunta "3 ou 4 mockups na comparacao?".
Se o dono acha que 4 lado a lado fica ilegivel no celular, essa e a hora de dizer — depois disso a
branch nao guarda mais nada que a main nao tenha.

## Nao verificado

- Nao executei `npm test`, lint ou typecheck: a tarefa e somente leitura e nao escrevo no git. Logo,
  nao afirmo que os testes da main passam hoje — afirmo apenas que os testes equivalentes aos da
  branch existem na main, nos arquivos e linhas citados acima.
- Nao avaliei qual limite (3 ou 4) rende melhor na tela real; nao abri o app. A comparacao de
  legibilidade em 375px acima e leitura de codigo (A-33 fez os controles quebrarem em varias linhas),
  nao medicao.
- Os 4 arquivos do pacote foram lidos com os dois diffs; o pacote nao diz TRUNCADO. Nenhum arquivo
  ficou sem leitura.
