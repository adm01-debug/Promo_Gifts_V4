# origin/integra/vps-testes-docs

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada a mais hoje — todo o conteudo desta branch (testes automaticos do gerador de mockup/Magic Up e tres documentos de decisao do dono) ja esta em producao desde 29/10/2026; a branch e so uma copia antiga.
- **Tip / merge-base / main:** tip `7c410836bede250fc17febf1c245181828071a5d` · merge-base `8bc08b12f50872e2d9b9a93d3f7dbae388fec204` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Vinte commits de 29/10/2026, todos com a nota "Origem: entrega da fabrica VPS v2/..., revisada e
reaplicada sobre a main". A branch era o **ponto de consolidacao (lote A)** de varias entregas de
sub-branches da "fabrica VPS": nenhuma linha de codigo de produto, so

1. **Matriz de aceite do Mockup** (grupos 1, 4, 5, 6 e 7 — cenarios A01–A02, A11–A13, A15–A16, A18–A20),
   cada cenario um teste nomeado pelo ID, com fixtures proprias.
2. **Testes de unidade do gerador** (dialogos, estado vazio, tratadores de tecnica: area, cores e recusa).
3. **Testes ponta a ponta (Playwright)** do fluxo de mockup, do upload de logo, do posicionamento do logo
   por teclado e da rota do Magic Up (incluindo tirar o `waitForTimeout` para obedecer o lint de specs).
4. **Teste "live" do `magic-up-score`** exercitando a funcao de verdade com imagem sintetica.
5. **Tres documentos**: `docs/MOCKUP_DECISOES_2026-10-08.md` (as 29 decisoes do dono Q1–Q29, D3/D4 e o
   desenho de pastas por vendedor), `docs/MOCKUP_ESTADOS.md` e `docs/MOCKUP_RETENCAO.md` (roteiro de
   retencao/exclusao com `caminho:linha` conferidos).

Total: 23 arquivos, +4.212/-212 linhas (`git diff --stat 8bc08b12f5 7c410836be`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| A branch inteira (todos os 23 arquivos) | main, via squash-merge da **PR #2736** em 29/10/2026 | `git log --format='%h %ad %s' origin/main -- docs/MOCKUP_RETENCAO.md` → `31ebc2d35c 2026-10-29 test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)`; `git show --stat 31ebc2d35c` lista exatamente os mesmos 23 arquivos, `23 files changed, 4212 insertions(+), 212 deletions(-)` — os mesmos numeros do diff da branch |
| 19 dos 23 arquivos | main, **byte a byte identicos** a branch | `git diff --name-status 7c410836be origin/main -- <os 23 caminhos>` nao retorna nenhum dos 19 (so os 4 abaixo, mais arquivos que a main ganhou depois) |
| Matriz grupo 1 (A01, A02) | `tests/components/mockup/acceptance/grupo1.acceptance.test.tsx:174` e `:201` na main | `git show origin/main:tests/.../grupo1.acceptance.test.tsx \| grep -n "it("` → 2 testes, os mesmos 2 da branch (`it(` = 2 na branch e 2 na main) |
| Matriz grupo 6 (A15, A16) | mesmo arquivo na main, 7 testes | contagem `it(`: 7 na branch, 7 na main |
| Matriz grupo 7 (A18–A20) | `grupo7.acceptance.test.tsx:130` (A18) e `:207` (A20) na main | `git show origin/main:...grupo7...` → `describe('A18 — baixar imagem e ficha...')`, `describe('A20 — raster 10 MB e arte original 25 MB')`; contagem `it(`: 3 na branch, 3 na main |
| Grupo 7 abre a ficha pelo rotulo atual "Gerar documento" (commit 6edd8e705c) | `grupo7.acceptance.test.tsx:146` na main | `fireEvent.click(await screen.findByRole('button', { name: /Gerar documento/ }))` |
| Matrizes grupo 4 e grupo 5 + fixtures | main, identicos | nao aparecem na lista de divergentes; `git ls-tree origin/main` lista `grupo4.acceptance.test.tsx`, `grupo4.fixtures.ts`, `grupo5.acceptance.test.tsx`, `grupo5.fixtures.ts` |
| Testes do gerador (dialogos, estado vazio, tratadores de tecnica) | main, identicos | `git ls-tree origin/main -- src/pages/mockups/mockup-generator/__tests__/` lista `MockupDialogs.test.tsx`, `MockupEmptyState.test.tsx`, `MockupTechniqueHandlers.test.tsx` |
| E2E do teclado, sem `waitForTimeout` | `e2e/flows/mockup-keyboard.spec.ts` na main | arquivo existe na main; `grep -c waitForTimeout` = **0**; `test('setas e Shift+setas movem o logo sem arrastar o mouse'...)` na linha 131 |
| E2E do fluxo completo, do upload de logo e da rota magic-up | main, identicos | `e2e/flows/mockup-comprehensive.spec.ts`, `e2e/flows/mockup-upload-flow.spec.ts`, `e2e/routes/app/magic-up.spec.ts` no `--stat` de `31ebc2d35c` e sem divergencia hoje |
| Teste live do `magic-up-score` | main, identico | `tests/edge-functions/live/magic-up-score.test.ts` no `--stat` de `31ebc2d35c`, +93 linhas |
| Smoke do Magic Up em modo estrito (E-26) | `tests/components/pages/MagicUp.test.tsx` na main | os 3 testes da branch estao na main; a main tem **4** (`it(` = 3 na branch, 4 na main) — ganhou o caso "'Trocar logo' reabre o seletor de arquivo" depois |
| Correcao de import do `VariationItem` (Onda 5) | `tests/a11y/onda5-a11y.test.tsx` na main, identico | `--stat` de `31ebc2d35c`: `tests/a11y/onda5-a11y.test.tsx \| 2 +-` |
| Doc das decisoes do dono (Q1–Q29, D3/D4, pastas por vendedor) | `docs/MOCKUP_DECISOES_2026-10-08.md` na main | linha 13 "A entrevista teve **29 decisoes numeradas (Q1 a Q29)**"; linha 60 `Q29 \| Teto de areas`; linhas 68–74 `D3`, `D4`, `Q-A`...`Q-E`; secao "Desenho das pastas (etapas 85–92)" |
| Roteiro de retencao com `caminho:linha` reconferido na base `a9c8bd9c4` (commit 679b4d6a7c) | `docs/MOCKUP_RETENCAO.md` na main | linha 12: "conferida no codigo desta branch (base `main` em `a9c8bd9c4`"; citacoes vivas como `src/hooks/mockup/mockupGenerationService.ts:483-526` (linha 34) |
| Correcao da citacao de linha de `quote_items` (commit 11659de61e) | `docs/MOCKUP_RETENCAO.md:168` na main | "A coluna existe: `quote_items.mockup_urls` (`src/integrations/supabase/types.ts:34791`)" |
| `docs/MOCKUP_ESTADOS.md` | main, identico | `--stat` de `31ebc2d35c`: 203 linhas novas |

### Os 4 arquivos que divergem hoje: a main esta **na frente**, nao na falta

Em nenhum dos quatro a main apagou teste da branch. `git diff 7c410836be origin/main` nesses arquivos
mostra, no lado removido, **apenas** uma linha de declaracao de mock reescrita e um comentario obsoleto:

| arquivo | o que a main fez depois | evidencia |
| --- | --- | --- |
| `grupo1.acceptance.test.tsx` | trocou o mock inteiro de `@/hooks/simulation` por mock parcial que mantem o modulo real `useLogoColorAnalysisByArea` | unica linha removida: `-vi.mock('@/hooks/simulation', () => ({`; testes: 2 → 2 |
| `grupo6.acceptance.test.tsx` | apagou o aviso "PENDENTE (A15, resposta antiga)" porque a guarda passou a existir, e acrescentou o duble do estrato por area | removidas so as 5 linhas do comentario PENDENTE; a main escreve no lugar: "A15 ... NAO e pendencia: a guarda vive em `src/hooks/simulation/useLogoColorAnalysis.ts:86,105` ... desde 50880c967"; testes: 7 → 7 |
| `grupo7.acceptance.test.tsx` | acrescentou duas esperas `aria-busy` (trava de "um envio por vez" do `ArtFileUpload`) | diff so com linhas `+`; nenhuma linha removida; testes: 3 → 3 |
| `MagicUp.test.tsx` | acrescentou o teste "'Trocar logo' reabre o seletor de arquivo" | diff so com linhas `+`; testes: 3 → 4 |

Autoria dessas mudancas posteriores: `git log 31ebc2d35c..origin/main -- <os 4 arquivos>` →
`dbe11812e9 2026-11-15 test(mockup): resgata 39 testes do gerador... (#3672)`,
`0e442766f8 2026-11-13 fix(ux): corrige link, botao inerte e remove componente morto`,
`b243f02ffd 2026-10-29 test(mockup): testes do lote alinhados a main atual`.

## A resgatar

Nada. Nenhum arquivo, teste, cenario de aceite, spec de e2e ou paragrafo de documento desta branch esta
ausente da main de hoje.

## Risco de fechar esta branch

Nenhum risco pratico. A branch nao tem conteudo que nao esteja em producao: a PR #2736 levou os 23
arquivos para a main em 29/10/2026, 19 deles permanecem identicos e os outros 4 so receberam melhorias
depois (mais um teste no Magic Up, esperas de upload no grupo 7, mock parcial no grupo 1 e a baixa da
pendencia A15 no grupo 6). O unico efeito de apagar a branch e perder o historico de 20 commits
granulares que descreve de qual sub-branch da fabrica VPS veio cada entrega — rastreabilidade, nao
funcionalidade; o squash `31ebc2d35c` e a propria PR #2736 guardam o conteudo.

Risco de **manter** a branch: ela esta 18 dias defasada nos 4 arquivos e, reaplicada por engano,
reintroduziria o comentario "PENDENTE A15" (ja falso), tiraria o teste "Trocar logo" e tiraria as esperas
`aria-busy` do grupo 7 — ou seja, faria a suite voltar atras.

## Nao verificado

- **Nao executei a suite de testes.** O veredito vem de comparacao de conteudo (`git diff`, `git show`,
  `git log`) entre o tip da branch e `origin/main`; nao rodei `npm test`, `npm run test:e2e` nem
  typecheck, portanto nao afirmo que os testes passam hoje — afirmo que o texto deles na main contem o
  da branch.
- **Nao confirmei pela API do GitHub** que a PR #2736 corresponde nominalmente a esta branch; a ligacao
  esta provada pelo conteudo (mesmos 23 arquivos, mesma data, mesmo `+4212/-212`) e pelo assunto do
  commit de squash ("entregas de teste e doc da fabrica VPS (lote A)"), nao por consulta a PR.
- **Banco/edge:** a branch nao toca `supabase/migrations/`, `supabase/functions/`, policy, grant nem
  funcao do banco. `tests/edge-functions/live/magic-up-score.test.ts` apenas **chama** a edge function
  existente; `docs/MOCKUP_RETENCAO.md` apenas **descreve** tabelas e buckets. Nao inspecionei o banco de
  producao, porque nada na branch o altera.
