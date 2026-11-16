# origin/importado/vps-fabrica/v2/refazer-2c328ea8

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada a resgatar — os testes automaticos que protegem a ferramenta de "nota da imagem do anuncio" (Magic Up) ja estao valendo no sistema; esta branch e uma copia antiga da mesma coisa.
- **Tip / merge-base / main:** tip `a024ebdda09e2856dfde9cf269adb7d312fc8327` · merge-base `0a64ef316e4fed7a44c0b8791b8058fae2bb43bd` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos so de teste, nenhum de codigo de produto:

- `d70bef2314` — "test(edge-functions): magic-up-score testa o contrato real do handler". Trocou um teste
  que inventava uma resposta (`score`, `factors`, `tier`, `eligible_for_magic_up`) por um teste que carrega
  o handler real de `supabase/functions/magic-up-score/index.ts` e cobra dele o formato que ele de fato
  devolve (`total`, `label`, `summary`, `criteria`, `strengths`, `risks`, `recommendations`, `source:'ai'`),
  mais os erros 400 / 401 / 402 / 429 / 500 e o preflight OPTIONS.
- `a024ebdda0` — "magic-up-score intercepta o console.error do handler". Ajuste para os 3 testes de erro 500
  nao reprovarem no modo rigoroso do CI (`STRICT_TEST_SIDE_EFFECTS=1`): o teste passa a interceptar o log
  do handler com `vi.spyOn` e a conferir a mensagem real.

A branch mexeu em **1 arquivo no total**, e e um arquivo de teste
(`git diff --stat 0a64ef31 a024ebdda0` → `tests/edge-functions/integration/magic-up-score.test.ts | 1 file changed`).
Nao toca banco, migration, policy nem `supabase/functions/`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Teste carrega o handler real via captura de `Deno.serve` | ESTA | `tests/edge-functions/integration/magic-up-score.test.ts:130-135` na main (`const serve = vi.fn...; await import('../../../supabase/functions/magic-up-score/index.ts')`) |
| Contrato real cobrado (`total/label/summary/criteria/strengths/risks/recommendations/source:'ai'`) e negacao do contrato imaginado (`product_id`, `factors`, `tier`, `eligible_for_magic_up`) | ESTA | diff (B) do pacote mostra esses mesmos `expect(body).not.toHaveProperty(...)` presentes na main, mudando so `"` → `'` |
| Interceptacao do `console.error` do handler (`a024ebdda0`, o commit mais novo da branch) | ESTA | `git grep` em `e4ab7f85`: `:116` comentario `sob STRICT_TEST_SIDE_EFFECTS=1`, `:118 async function callExpectingServerError`, `:119 vi.spyOn(console, 'error')`, usada em `:253`, `:262`, `:270` |
| Os 12 casos de teste da branch | ESTAO, todos, na mesma ordem e com os mesmos titulos | `grep -o "it(['\"]..."` nas duas versoes: 12 em cada, lista identica (401, 400 ausente, 400 min 10, 200 envelope real, modelo gemini-2.5-pro, 3x 500, 402, 429, anti-bot, OPTIONS) |
| Conteudo integral do arquivo | ESTA | comparacao mecanica: removendo espacos/quebras e normalizando `'`↔`"`, a versao da main difere da branch **apenas** por 8 virgulas finais e 1 ponto-e-virgula que o Prettier acrescentou ao reformatar. Nenhuma linha de logica, nenhum `expect`, nenhum mock a mais ou a menos |
| Quando entrou na main | squash `7307f53346` ("feat(mockup): ... (#3664)") | `git log -S"callExpectingServerError" --oneline origin/main -- tests/edge-functions/integration/magic-up-score.test.ts` → so `7307f53346` |

Por que o arquivo "difere da main" sem nada estar faltando: a main passou o Prettier do projeto nesse arquivo
(aspas simples, quebra de objetos longos em varias linhas). O arquivo na main tem 314 linhas e o da branch 268;
a diferenca e so formatacao.

## A resgatar

Nada. Nenhum item da branch ficou fora da main.

## Risco de fechar esta branch

Nenhum risco para o sistema. A protecao automatica da ferramenta Magic Up continua de pe na main, com os
mesmos 12 casos de teste e o mesmo ajuste para o CI rigoroso. Fechar a branch nao apaga nenhum teste nem
muda qualquer comportamento visto pelo cliente (a branch nunca teve codigo de produto). O unico efeito e
deixar de carregar uma copia desatualizada e mal formatada do mesmo arquivo.

## Nao verificado

- Nao foi executado `npm test` nesta sessao: a tarefa e somente leitura, e nenhuma afirmacao acima depende
  de o teste passar — a evidencia e que o conteudo da branch esta integralmente na main.
- Nao foi verificado se existe PR aberta apontando para esta branch (fora do escopo desta analise, que
  comparou branch × main por conteudo).
