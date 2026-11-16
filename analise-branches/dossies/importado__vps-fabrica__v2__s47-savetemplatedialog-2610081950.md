# origin/importado/vps-fabrica/v2/s47-savetemplatedialog-2610081950

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda para o usuario — a branch so joga fora uma tela de "salvar template" do gerador de mockup que nunca aparecia para ninguem, e a main de hoje ja fez exatamente isso.
- **Tip / merge-base / main:** tip `8396cb47f7b28f12f53766e984be3326c11dbec7` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, `8396cb47f7 chore(mockup): remove codigo morto SaveTemplateDialog`, cuja mensagem diz
textualmente: "Sem importador (git grep -n 'mockup/SaveTemplateDialog' em src/tests so encontra o
componente homonimo vivo em src/components/cart/cart-utils/CartDialogs.tsx). Remove o arquivo e os dois
blocos de analise estatica exclusivos dele no mockup-audit.test.ts."

A branch **nao adiciona uma unica linha de codigo**. Ela e puramente remocao:

```
$ git diff --numstat c194982c5f1f 8396cb47f7
0	76	src/components/mockup/SaveTemplateDialog.tsx
0	31	src/hooks/mockup/__tests__/mockup-audit.test.ts
```

Ou seja: 107 linhas apagadas, 0 criadas. Nao existe "trabalho proprio" aqui que possa ser perdido — existe
apenas uma faxina proposta.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Tirar `src/components/mockup/SaveTemplateDialog.tsx` de dentro do app | FEITO na main — o arquivo nao existe mais em `src/`; foi arquivado em `recovery/src-legacy/src/components/mockup/SaveTemplateDialog.tsx` | `git cat-file -e origin/main:src/components/mockup/SaveTemplateDialog.tsx` → `fatal: path ... does not exist in 'origin/main'`; `git ls-tree -r --name-only origin/main \| grep SaveTemplateDialog` → `recovery/src-legacy/src/components/mockup/SaveTemplateDialog.tsx`; commit da main `5dd9b949d3 chore(repo): move 316 arquivos obsoletos da #3361 de src/ para recovery/src-legacy` |
| Remover os dois blocos de analise estatica de `SaveTemplateDialog` em `src/hooks/mockup/__tests__/mockup-audit.test.ts` (o de a11y label/id e o de `aria-hidden` no icone Save) | FEITO na main — o arquivo de teste existe, e nao tem nenhuma mencao a `SaveTemplateDialog` | `git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts \| grep -n SaveTemplateDialog` → sem resultado (exit 1), enquanto `git cat-file -e origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts` confirma que o arquivo continua existindo |
| Premissa da branch: "o `SaveTemplateDialog` que importa de verdade e o do carrinho, esse fica" | PRESERVADO na main — o homonimo vivo continua la e continua em uso na tela do carrinho | `src/components/cart/cart-utils/CartDialogs.tsx:125` (`export function SaveTemplateDialog({`) e `src/pages/products/seller-carts/CartSidebar.tsx:11` / `:94` (importa e renderiza `<SaveTemplateDialog .../>`) |
| Intencao registrada na main (prova de que a main decidiu o mesmo, por escrito) | A main deixou o comentario explicando a aposentadoria | `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx:2-3`: "O bloco do SaveTemplateDialog da fatia original saiu: o componente foi aposentado de `src/` (hoje so existe em `recovery/src-legacy/...`)" |

Diferenca de forma, nao de resultado: a branch **apagava** o arquivo; a main **moveu** para
`recovery/src-legacy/`. Nos dois casos o componente sai do app e para de ser compilado/testado. O efeito
pedido pela branch esta entregue; a main escolheu guardar uma copia arquivada, o que e mais conservador.

Sobre o diff (B) do pacote de evidencia: ele mostra a main removendo muita coisa de `mockup-audit.test.ts`
(blocos `T7 getTechniquePrompt`, `mockupGenerationService.ts`, `T1/T2`, `TemplateSelector.tsx`, etc.) e
trocando por leituras de `mockupGeneratorModel.ts` e `useMockupEntryParams.ts`. Isso e evolucao propria da
main (refatoracao do gerador de mockup em modulos + troca de teste estatico por teste de comportamento),
**nao** trabalho desta branch — a branch so tocou os dois blocos do `SaveTemplateDialog`, como mostra o
diff (A).

## A resgatar

Nada. A branch nao tem conteudo proprio a resgatar: 0 linhas adicionadas, e as duas remocoes que ela propoe
ja estao em vigor na main.

## Risco de fechar esta branch

Nenhum risco pratico. Fechar/apagar esta branch nao muda o sistema: ela nao cria funcionalidade, nao corrige
bug e nao toca banco, integracao ou tela. A unica coisa que ela pedia — que aquela tela morta de "salvar
template" do gerador de mockup saisse do app — ja aconteceu na main (o arquivo foi para a pasta de arquivo
morto `recovery/src-legacy/`) e os testes que cobravam esse arquivo tambem ja foram retirados. A tela de
"salvar template" que o vendedor realmente usa, a do carrinho, e outra e segue intacta e em uso.

Observacao para quem decide: se um dia alguem quiser de fato **deletar** a copia arquivada em
`recovery/src-legacy/`, isso e uma decisao separada de limpeza de repositorio — nao depende desta branch.

## Nao verificado

- Nao executei `npm test` nem `npm run qa:typecheck` nesta analise (a tarefa e somente leitura; nao alterei
  o working tree). A afirmacao "a main nao quebra por causa disso" se sustenta por inspecao estatica: nao ha
  nenhum import de `mockup/SaveTemplateDialog` em `src`, `tests` ou `scripts` na main (`git grep -n
  "mockup/SaveTemplateDialog" origin/main -- src tests scripts` retorna apenas uma linha de **comentario**
  em `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx:3`), e nenhum teste da main le aquele
  caminho via `readSrc`.
- Nao investiguei se a cobertura de a11y que aqueles dois blocos faziam (label/id e `aria-hidden` no icone)
  foi reproduzida para os componentes que **permanecem** vivos no mockup; isso e escopo de outra branch, nao
  desta.
