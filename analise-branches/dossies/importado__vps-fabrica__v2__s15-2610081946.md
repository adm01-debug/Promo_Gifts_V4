# origin/importado/vps-fabrica/v2/s15-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que o gerador de mockup apague a logo, a posicao e o tamanho que o vendedor ja tinha ajustado quando a tela acaba de carregar os locais de gravacao do mesmo produto.
- **Tip / merge-base / main:** tip `01e3c93b566e631767515a72ca9f1a51a56abaf0` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`01e3c93b56`, "Fabrica Hermes 2026-10-08"), com a mensagem
`fix(mockup): nao recriar as areas ao recarregar locais do mesmo produto (B F-02)`.

O defeito, descrito pelo proprio autor no cabecalho do teste: o efeito que transforma a lista de
locais de gravacao do produto (`productLocations`) em areas de personalizacao **recriava as areas
toda vez** que essa lista chegava ou era recalculada. Na pratica, quando o vendedor restaurava um
rascunho ou um item do historico e os locais do produto chegavam do servidor um instante depois, as
areas eram jogadas fora e recriadas vazias — perdendo logo, posicao (x/y) e tamanho que ja estavam
preenchidos.

A correcao e um marcador de "de qual produto sao as areas que estao na tela agora"
(`areasProductIdRef`), gravado em quatro momentos (locais aplicados, rascunho restaurado, item do
historico carregado, reset do formulario) e consultado como guarda dentro do efeito. Regra: mesmo
produto nao recria; outro produto recria.

A branch mexeu em exatamente 2 arquivos (`git diff --stat` merge-base→tip: 308 insercoes, 1 remocao):
o hook `useMockupGenerator.ts` (20 linhas) e um teste novo de 289 linhas que prova as tres situacoes
pelo comportamento visivel do hook.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Marcador `areasProductIdRef` (declaracao + comentario "B F-02 FIX") | `src/hooks/mockup/useMockupGenerator.ts:118-122` | `git show origin/main:src/hooks/mockup/useMockupGenerator.ts \| grep -n areasProductIdRef` → linhas 118, 122 |
| Guarda que impede recriar as areas do mesmo produto | `src/hooks/mockup/useMockupGenerator.ts:198-200` — `if (productId && areasProductIdRef.current === productId) return;` | mesmo grep, linhas 198 e 200; trecho lido com `sed -n '193,225p'` |
| Gravar o produto ao aplicar os locais | `src/hooks/mockup/useMockupGenerator.ts:221` — `areasProductIdRef.current = productId;` | mesmo grep, linha 221 |
| `selectedProduct` adicionado as dependencias do efeito | `src/hooks/mockup/useMockupGenerator.ts:223` — `}, [productLocations, hasDraftRestored, selectedProduct]);` | `sed -n '193,225p'` do arquivo na main |
| Gravar o produto ao restaurar rascunho | `src/hooks/mockup/useMockupGenerator.ts:291-293` — `areasProductIdRef.current = draft.productId ?? null;` | mesmo grep, linhas 291 e 293 |
| Zerar o marcador no reset do formulario | `src/hooks/mockup/useMockupGenerator.ts:658-659` — `areasProductIdRef.current = null;` | mesmo grep, linhas 658 e 659 |
| Gravar o produto ao carregar item do historico | `src/hooks/mockup/useMockupGenerator.ts:724-726` — `areasProductIdRef.current = product?.id ?? null;` | mesmo grep, linhas 724 e 726 |
| Arquivo de teste `mockupAreas.preserve.test.ts` | existe na main, mesmo nome e mesmo bloco `describe('B F-02 — locations nao recriam areas ja preenchidas')` | `git show origin/main:src/hooks/mockup/__tests__/mockupAreas.preserve.test.ts \| grep -n "describe(\|  it("` → linha 205 |
| Teste 1: "preserva logo/posicao/tamanho quando a lista de locations chega tarde (mesmo produto)" | main, linha 216 | mesmo grep |
| Teste 2: "recria as areas ao trocar para OUTRO produto" | main, linha 246 | mesmo grep |
| Teste 3: "nao recria as areas ao re-renderizar o MESMO produto" | main, linha 274 | mesmo grep |
| As 14 verificacoes (`expect`) do teste | todas na main, na mesma ordem e com os mesmos valores (`draft-area-1`, `positionX: 37`, `logoWidth: 8`, `positionX: 50`, `logoWidth: 5`, `logoPreview` nulo, id preservado) | `grep -n "expect("` nas duas versoes devolve 14 linhas identicas em conteudo (branch 212-287 / main 223-298) |

Por que os 2 arquivos ainda "diferem da main": o repo usa squash-merge e a main andou muito depois.
No hook, a diferenca de hoje e refatoracao posterior **em volta** do fix (carga de tecnicas movida
para `useMockupTechniquesLoad`, historico para `mockupHistoryAdapter`, analise de cor por area,
geracao cancelavel, deep link em `useMockupEntryParams`) — nenhuma dessas linhas remove o fix. No
teste, a diferenca e so endurecimento do ambiente de teste (envolver em `MemoryRouter`, mocks
parciais em vez de totais, `act` sincrono): nenhuma verificacao foi retirada.

Caminho de entrada: o fix chegou a main no commit `294cee8389` (2026-11-01, PR #2739
"fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS)"),
confirmado por `git log -S"areasProductIdRef" --oneline origin/main -- src/hooks/mockup/useMockupGenerator.ts`.
Depois disso o teste foi reparado em `e5afe82459` (PR #3647) e `dbe11812e9` (PR #3672 — "resgata 39
testes do gerador de mockup que estavam desligados por mock incompleto").

## A resgatar

Nada. Os 7 pontos de codigo e os 3 testes (com as 14 verificacoes) estao na main.

## Risco de fechar esta branch

Nenhum risco identificado para o negocio. Tudo o que a branch entregou — a protecao do ajuste de
logo e o teste que prova as tres situacoes — esta rodando na main de hoje, com evidencia linha por
linha. A branch nao toca banco, policy, funcao de borda, workflow nem segredo.

## Nao verificado

- Nao foi executado `npm test` para confirmar que os 3 testes passam hoje na main (a tarefa e de
  leitura; nada foi executado que alterasse o working tree). A evidencia de que o teste esta ativo e
  indireta: a PR #3672 da main se descreve justamente como o resgate dos testes do gerador de mockup
  que estavam desligados por mock incompleto, e e ela que troca os mocks totais por parciais neste
  arquivo.
- Nao foi verificado o comportamento na tela em producao (o vendedor restaurar um rascunho e o logo
  continuar no lugar). A verificacao foi feita no codigo e no teste, nao no navegador.
