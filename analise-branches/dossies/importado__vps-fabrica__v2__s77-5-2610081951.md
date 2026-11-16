# origin/importado/vps-fabrica/v2/s77-5-2610081951

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Rede de protecao automatica do editor de mockup — garante que remover um logo nao estrague as outras areas, que fechar a janela ampliada nao apague o rascunho do vendedor e que buscar produto, enviar logo e centralizar funcionem sem arrastar o mouse.
- **Tip / merge-base / main:** tip `2486ccfde209642c749a61531fdf0fab988f4345` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Unico commit da branch: `2486ccfde2` — *"test(mockup): matriz de aceite grupo 5 (A11-A13) de comportamento atual"*, autor "Fabrica Hermes", 09/10/2026.

A branch nao mexe em codigo de produto: ela **so adiciona testes automatizados** que travam o comportamento
que o editor de mockup ja tinha naquele momento, para que uma alteracao futura nao o quebre em silencio.
Dois arquivos novos, 393 linhas, nenhuma linha removida
(`git diff --stat c194982c 2486ccfde2`):

- `tests/components/mockup/acceptance/grupo5.acceptance.test.tsx` (276 linhas)
- `tests/components/mockup/acceptance/grupo5.fixtures.ts` (117 linhas)

Os tres cenarios cobertos, conforme o cabecalho do proprio arquivo (linhas 5–9 da versao da branch):

- **A11** — remover o logo de uma area **nao ativa** altera so aquela area (`MultiAreaManager`).
- **A12** — a tecla Esc fecha a camada ampliada (`MockupLightbox`) e "recarregar" **reabre** o rascunho
  salvo em vez de apaga-lo (`useMockupDraft`).
- **A13** — busca de produto por digitacao (`ProductSearchCombobox`), envio de logo pelo seletor de arquivo
  (`AreaCard`) e posicionamento do logo pelos botoes, sem arrastar (`LogoQuickActions`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo de teste `grupo5.acceptance.test.tsx` | Esta na main | `git ls-tree -r origin/main --name-only tests/components/mockup/acceptance/` lista `grupo5.acceptance.test.tsx` |
| Arquivo de fixtures `grupo5.fixtures.ts` | Esta na main, **byte a byte identico** a versao da branch | `git diff 2486ccfde2 origin/main -- tests/components/mockup/acceptance/grupo5.fixtures.ts` nao retorna nenhuma linha |
| Como entrou (squash-merge) | Squash da PR **#2736** | `git log --oneline --follow origin/main -- tests/.../grupo5.acceptance.test.tsx` → unico commit `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)`, autor `adm01-debug`, 29/10/2026. O stat desse commit traz `grupo5.acceptance.test.tsx \| 277 +++` e `grupo5.fixtures.ts \| 117 +++` |
| **A11** — remocao em area nao ativa | Esta na main | `git grep -n "A11 —" origin/main -- tests/.../grupo5.acceptance.test.tsx` → linhas 6, 82, 84 e o teste em 85: `it('A11 — remover o logo da area inativa zera apenas aquela area; a ativa e a selecao seguem intactas', ...)` |
| **A12** — Esc fecha o lightbox | Esta na main | mesmo grep → linha 127: `it('A12 — a tecla Esc fecha a camada ampliada (lightbox)', async () => {` |
| **A12** — recarregar reabre o rascunho | Esta na main | mesmo grep → linha 157: `it('A12 — "recarregar" reabre o rascunho salvo (produto, cliente, tecnica e areas) em vez de apaga-lo', ...)` |
| **A13** — busca de produto por digitacao | Esta na main | mesmo grep → linha 192: `it('A13 — a busca por digitacao consulta o servidor e seleciona o produto sem arrastar', ...)` |
| **A13** — upload de logo pelo seletor de arquivo | Esta na main | mesmo grep → linha 229: `it('A13 — enviar o logo pelo seletor de arquivo aplica na area certa sem arrastar', ...)` |
| **A13** — centralizar pelos botoes (Centro / Centro V / Centro H) | Esta na main | mesmo grep → linha 250: `it('A13 — centralizar o logo pelos botoes nao depende de arrastar', ...)` |
| A unica diferenca entre branch e main hoje | Ajuste de digitacao TypeScript feito **em cima** do trabalho da branch, nao perda de trabalho | diff branch→main tem um unico trecho, nas linhas 165–175: a variavel `let reaberto` virou `const caixa: { reaberto: MockupDraftData \| null } = { reaberto: null }` + `const { reaberto } = caixa`. Na main, `sed -n '160,180p'` mostra exatamente isso. Todas as 10 asseveracoes do cenario (`expect(reaberto?.productId)...`) continuam iguais — a verificacao nao foi afrouxada; so se contornou o estreitamento de tipo do TS dentro do `act()` |
| Os testes realmente rodam (nao ficaram fora do portao) | Rodam em `npm test` | `vitest.config.ts:64-65` → `include: ['tests/**/*.{test,spec}.{...,tsx}', ...]` cobre o caminho do arquivo |

Diferenca de contagem de linhas confirma a leitura: a branch criou 276 linhas, a main tem 277 — exatamente
`+3 / -2` do ajuste de tipo acima. Nenhum cenario, nenhuma asseveracao e nenhuma fixture foram descartados.

## A resgatar

Nada. Os dois arquivos da branch estao na main: as fixtures identicas e o teste com uma correcao de tipo
aplicada em cima, preservando todos os cenarios e todas as verificacoes.

## Risco de fechar esta branch

Nenhum risco pratico. Todo o conteudo proprio da branch (os tres cenarios de aceite A11–A13 e suas
fixtures) ja esta na main desde a PR #2736 e e executado pelos testes automaticos do projeto. Fechar/apagar
a branch nao remove nada de producao e nao reduz a cobertura de testes do editor de mockup.

Observacao, nao risco: a main contem a versao **melhor** (compila sob as regras de tipo do projeto). Se
alguem reaplicasse a branch por cima da main, estaria regredindo o ajuste de tipo. Portanto a branch nao
deve ser mergeada — deve ser fechada.

## Nao verificado

- Nao executei a suite (`npm test -- grupo5`) nesta analise: a tarefa proibe alterar o working tree e a
  evidencia de inclusao foi obtida por leitura de git. Que o arquivo seja **coletado** esta verificado
  (`vitest.config.ts:64-65`); que ele **passe verde hoje** na main nao esta verificado aqui.
- Nao inspecionei os demais grupos do lote (`grupo1`, `grupo3`, `grupo4`, `grupo6`, `grupo7`), que a main
  tem e que estao fora do escopo desta branch. O lote #2736 nao trouxe `grupo2`; se existe um grupo 2 em
  outra branch importada, isso e assunto de outro dossie.
