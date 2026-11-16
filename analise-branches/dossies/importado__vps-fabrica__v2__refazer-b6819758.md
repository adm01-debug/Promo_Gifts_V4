# origin/importado/vps-fabrica/v2/refazer-b6819758

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Teste automatico que garante que o cliente consegue posicionar o logo no mockup usando so o teclado (setas), sem precisar arrastar com o mouse.
- **Tip / merge-base / main:** tip `ef2a4eeb6fd8bd8eeb13d5d90a115b227f47d711` · merge-base `1b59d0f5775850b20a8929a9db8c38d6183ab05a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`ef2a4eeb6f`, "test(e2e): cobre posicionamento do logo por teclado no editor de mockup",
cherry-pick de `a96dbe6da2`), um unico arquivo novo e nada mais:

```
git diff --stat 1b59d0f577 ef2a4eeb6f
 e2e/flows/mockup-keyboard.spec.ts | 189 ++++++++++++++++++++++++++++++++++++++
 1 file changed, 189 insertions(+)
```

O objetivo, lido do proprio cabecalho do arquivo (`e2e/flows/mockup-keyboard.spec.ts:1-25`), era criar um
teste de ponta a ponta (Playwright) que prova no navegador que, no editor de logo da tela
`/mockup-generator`:

1. a area de posicionamento do logo recebe o foco do teclado;
2. as setas movem o logo 0,5% por toque e Shift+seta move 5%;
3. o movimento aparece tanto no texto visivel "Pos: X% x Y%" quanto na posicao real da imagem;
4. uma tecla que nao e seta (ex.: `a`) nao move o logo e nao rouba o foco.

A branch nao mexe em codigo de produto, banco, migration, policy nem edge function: so acrescenta o
arquivo de teste.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O arquivo de teste `e2e/flows/mockup-keyboard.spec.ts` | Esta na main, com 192 linhas (a branch tem 189) | `git log --oneline origin/main -- e2e/flows/mockup-keyboard.spec.ts` -> `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)`, de 2026-10-29 |
| Todo o conteudo do teste (189 linhas: helpers, selecao de produto, upload do logo, reducao da area, passos 1 a 9) | Esta na main, identico | `git diff --stat origin/importado/vps-fabrica/v2/refazer-b6819758 origin/main -- e2e/flows/mockup-keyboard.spec.ts` -> `1 file changed, 4 insertions(+), 1 deletion(-)` — a unica diferenca e um trecho que a **main acrescentou**, nada que a branch tenha perdido |
| Passo 9 (tecla que nao e seta nao move o logo) | Esta na main, em versao melhor: a espera fixa de 200 ms da branch foi trocada por dois quadros de animacao | `git show origin/main:e2e/flows/mockup-keyboard.spec.ts` linhas 183-188: `// Dois quadros de animacao: tempo para um movimento indevido aparecer.` + `requestAnimationFrame(...)`; na branch, `await page.waitForTimeout(200);` |
| O comportamento que o teste cobra (passo fino 0,5% e passo grande 5%) | Existe na main, no codigo de produto | `src/components/mockup/logo-editor/useLogoDrag.ts:4-5`: `export const KEYBOARD_STEP = 0.5;` e `export const KEYBOARD_STEP_LARGE = 5;` |
| A area focavel que o teste procura ("Area de posicionamento do logo") | Existe na main | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:319`: `aria-label="Area de posicionamento do logo"` |

## A resgatar

Nada. O unico arquivo da branch esta na main integralmente; a unica diferenca de hoje e uma melhoria feita
depois, na main, dentro do mesmo teste.

## Risco de fechar esta branch

Nenhum. O teste que ela criou ja roda na main desde 29/10/2026 (PR #2736) e a versao da main e superior a da
branch no unico ponto em que as duas divergem. Fechar a branch nao remove teste, nao mexe em produto e nao
toca banco nem edge function.

## Nao verificado

- Se o teste passa hoje na execucao real do Playwright: nao foi executado (a tarefa e somente leitura e nao
  roda suite). A verificacao foi de presenca e de conteudo, nao de execucao.
- Em que pipeline de CI esse spec e executado: `grep -rn "mockup-keyboard" .github/workflows/ playwright.config.ts`
  nao retornou nada, ou seja, o arquivo e pego por padrao de diretorio e nao por nome; qual job o executa nao
  foi confirmado. Isso nao altera o veredito, porque o arquivo esta na main de qualquer forma.
