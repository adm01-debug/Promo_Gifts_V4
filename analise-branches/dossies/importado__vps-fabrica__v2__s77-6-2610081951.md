# origin/importado/vps-fabrica/v2/s77-6-2610081951

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Rede de seguranca automatica do gerador de mockup — garante que a tela funcione em celular e desktop e que, quando a geracao ou a gravacao falha, o vendedor receba o aviso certo em vez de perder o trabalho em silencio.
- **Tip / merge-base / main:** tip `7460d4c8c1875166b6e4dd005c39bfdd5802afc0` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, `7460d4c8c1` — "test(mockup): matriz de aceite grupo 6 (responsividade e falhas A14-A17)".

A branch criou **dois arquivos novos** (nada mais; `git diff --numstat c194982c5f 7460d4c8c1`):

| arquivo | linhas |
|---|---|
| `tests/components/mockup/acceptance/grupo6.acceptance.test.tsx` | +281 |
| `tests/components/mockup/acceptance/grupo6.fixtures.ts` | +86 |

A intencao, lida do cabecalho do proprio arquivo e dos nomes dos cenarios, e fechar o **grupo 6 da matriz de aceite do Mockup (A14–A17)**: provar por teste automatico quatro comportamentos de borda da tela de mockup —

- **A14** — a tela se adapta a 375 / 768 / 1024 / 1440 px e as duas versoes do indicador de passos nunca aparecem juntas (nada se sobrepoe no celular).
- **A15** — quando a leitura de cores do logotipo falha, o resultado antigo deixa de ser exibido e o erro aparece na tela.
- **A16** — se a gravacao do mockup no banco falha por vinculo de produto invalido (FK 23503), o sistema repete a gravacao sem o produto e o mockup fica salvo; numa falha dura, avisa o erro, mantem o mockup na tela e permite salvar de novo.
- **A17** — num lote de areas (frente/costas), se uma area falha, mostra a que deu certo e avisa falha parcial; se todas falham, nao exibe mockup nenhum e deixa o erro visivel.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `grupo6.fixtures.ts` (86 linhas, os dados fixos dos cenarios) | Na main, **byte a byte igual** a branch | `git diff --stat 7460d4c8c1 e4ab7f85d9 -- tests/components/mockup/acceptance/grupo6.fixtures.ts` → saida vazia. Por isso o pacote lista so 1 arquivo divergente, nao 2. |
| A14 — responsividade 375/768/1024/1440 sem sobreposicao | Na main, mesmo `describe` e mesmo `it` | `git show e4ab7f85d9:tests/components/mockup/acceptance/grupo6.acceptance.test.tsx` linhas 198–199: `describe('A14 — responsividade 375/768/1024/1440 sem sobreposição'` / `it('o stepper troca de variante por breakpoint e nunca deixa duas visíveis juntas'` |
| A15 — erro de analise descarta a resposta antiga | Na main, mesmo `describe`; o `it` foi **renomeado** (mesmas assercoes, titulo mais preciso) | main linhas 222 e 244: `describe('A15 — erro de análise e resposta antiga'` / `it('erro da análise vira estado de erro e o resultado da análise anterior deixa de ser exibido'`. Era `...e uma nova análise descarta a resposta antiga` na branch. As cinco assercoes do corpo (`colors` vazio, `error`, `toast.error`, `getByRole('alert')`) seguem iguais. |
| A16 — falha de salvar (FK 23503) e repetir | Na main, os **dois** `it` do grupo, com assercao extra | main linhas 266, 267 e 286. A main acrescentou a prova do que foi realmente gravado: `expect(payloads[0].product_id).toBe(PRODUTO_FIXTURE.id)` / `expect(payloads[1].product_id).toBeNull()`. Nenhuma assercao da branch foi removida. |
| A17 — falha parcial de lote | Na main, os **dois** `it` do grupo, inalterados | main linhas 308, 309 e 329: `describe('A17 — falha parcial de lote'`, `it('com uma área falhando, mostra só a que deu certo e avisa a falha parcial (sem erro fatal)'`, `it('com todas as áreas falhando, nenhum mockup é exibido e o erro fica visível'` |
| Infra de teste da branch (mocks de borda, `insertQueues`, `makeBuilder`, `montarGerador`, `selecionarNoGerador`) | Na main, preservada e **ampliada** | `git diff 7460d4c8c1 e4ab7f85d9 -- <arquivo>` remove apenas **2 linhas** no total, e as duas sao substituidas por versao mais forte: o `builder[method]` virou uma versao que tambem registra os payloads do INSERT, e o titulo do `it` do A15 foi reescrito. Nada mais da branch saiu. |
| Quando entrou | PR **#2736**, 2026-10-29 | `git log origin/main -- tests/components/mockup/acceptance/grupo6.acceptance.test.tsx` → `31ebc2d35c 2026-10-29 test+docs(mockup/magic-up): entregas de teste e doc da fábrica VPS (lote A) (#2736)`. E exatamente o lote de importacao da fabrica VPS a que esta branch pertence. |
| O que a main fez depois | Reforcou o arquivo em PR **#3672** | `dbe11812e9 2026-11-15 test(mockup): resgata 39 testes do gerador de mockup que estavam desligados por mock incompleto (#3672)` — acrescentou o estrato `useLogoColorAnalysisByArea` e trocou o aviso de PENDENTE do A15 pela referencia da guarda real (`src/hooks/simulation/useLogoColorAnalysis.ts:86,105`). |

**Por que o arquivo "difere da main" mesmo estando incorporado:** a diferenca de 64 linhas e inteiramente de **acrescimo da main** (`git diff --stat 7460d4c8c1 e4ab7f85d9` → `64 ++, 2 --`), e as 2 remocoes sao as duas linhas substituidas por versoes mais fortes, listadas acima. E o caso (a) da armadilha: o trabalho entrou e depois foi reforcado.

## A resgatar

Nada. Os dois arquivos da branch estao na main — um identico, o outro como subconjunto estrito do que a main tem hoje.

## Risco de fechar esta branch

Nenhum risco identificado. Nao se perde nenhum teste nem nenhuma protecao: os 4 cenarios de aceite (A14–A17) e os 5 testes da branch rodam hoje na main, em versao igual ou mais rigorosa, e os dados fixos dos cenarios estao identicos. A branch nao toca banco, migration, policy, edge function, workflow nem codigo de producao — so arquivos de teste.

## Nao verificado

- **Nao foi executada** a suite (`npm test`) para confirmar que os testes passam verdes na main de hoje. A verificacao feita foi de presenca e integridade do conteudo (diff e historico do arquivo), nao de execucao. Isso nao muda o veredito: o que se decide aqui e se o trabalho da branch ficou de fora, e ele nao ficou.
- Arquivos sem leitura por truncamento: **0**. O pacote nao reportou TRUNCADO e os 2 arquivos tocados pela branch foram inspecionados.
