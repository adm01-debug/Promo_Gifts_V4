# origin/claude/fix-pptx-mock-badges-261101-2315

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** escreve o aviso "Dados simulados" nos slides da apresentacao de BI do cliente quando o numero mostrado nao e real, para ninguem negociar achando que e dado verdadeiro.
- **Tip / merge-base / main:** tip `139077c66f2f4b989cb5b716a25fa4e238c4ae16` / merge-base `bcdefb4e59204e0c916d785c62e78fcde2ad9fe0` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit de conteudo, `3783a2f3dd` — "fix(bi): adiciona badge 'Dados simulados' nos slides 2-5 do PPTX quando isMock (FT-004)". O segundo commit (`139077c66f`) e so um merge da `main` para dentro da branch, sem conteudo proprio.

A branch toda sao 18 linhas adicionadas em 1 arquivo (`git diff --stat bcdefb4e59..139077c66f` → `src/lib/bi/pptxGenerator.ts | 18 ++++`). Duas coisas:

1. Criou a funcao `addMockBadge(slide)`, que escreve o texto "Dados simulados" no canto superior direito do slide (x 10.5, y 0.7, fonte 9, cor `C.warn`, italico, alinhado a direita).
2. Chamou essa funcao em 4 slides, cada um com a sua propria condicao de "esse slide tem dado simulado": slide 2 (KPIs), slide 3 (Afinidade/Tendencias), slide 4 (Sazonalidade) e slide 5 (Proxima Acao). O slide 6 ja tinha o aviso antes da branch, conforme o proprio corpo do commit.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Funcao `addMockBadge` com o texto "Dados simulados" | ESTA — movida para `src/lib/bi/pptxTheme.ts`, exportada | `git show origin/main:src/lib/bi/pptxTheme.ts` linhas 26-38: `/** FT-004: marca o slide quando a secao veio de dados simulados (isMock). */ export function addMockBadge(slide: SlideLike)` com `addText('Dados simulados', { x: 10.5, y: 0.7, w: 2.5, h: 0.3, fontSize: 9, color: C.warn, italic: true, align: 'right' })` — mesmo texto e mesmas coordenadas da branch |
| Badge no slide 2 (KPIs) quando `bi.isMock` ou `vs.isMock` | ESTA, identico | `git show origin/main:src/lib/bi/pptxGenerator.ts` linha 181: `if (bi.isMock \|\| vs.isMock) addMockBadge(s2);` |
| Badge no slide 3 (Afinidade/Tendencias) quando `affinity?.isMock` ou `trends?.isMock` | ESTA, identico | mesmo arquivo, linha 343: `if (affinity?.isMock \|\| trends?.isMock) addMockBadge(s3);` |
| Badge no slide 4 (Sazonalidade) quando `seasonality.isMock` | ESTA, identico | mesmo arquivo, linha 500: `if (seasonality.isMock) addMockBadge(s4);` |
| Badge no slide 5 (Proxima Acao) quando `bi.isMock`, `vs.isMock` ou `seasonality.isMock` | ESTA, identico | mesmo arquivo, linha 660: `if (bi.isMock \|\| vs.isMock \|\| seasonality.isMock) addMockBadge(s5);` |
| Paleta `C` usada pelo badge | ESTA — tambem movida para `pptxTheme.ts` e importada de volta | `pptxGenerator.ts` linha 13: `import { C, addMockBadge } from '@/lib/bi/pptxTheme';`; `pptxTheme.ts` linhas 14-24 definem `C` com os mesmos 9 valores hex |

Confirmacao de quando e como entrou: `git log -S"addMockBadge(s2)" origin/main -- src/lib/bi/pptxGenerator.ts` retorna um unico commit, `5e59cb9c79` (2026-11-15) — "fix: trem de resgates — 16 correcoes recuperadas de branches de outros agentes (#3660)". O mesmo commit criou `src/lib/bi/pptxTheme.ts` (`git log origin/main -- src/lib/bi/pptxTheme.ts` → so `5e59cb9c79`). Ou seja: o trabalho desta branch foi deliberadamente resgatado para a main nessa PR e, no caminho, extraido para o arquivo de tema.

Diferenca unica entre branch e main, e ela e a favor da main: a branch tipava o slide como `any` com `// eslint-disable-next-line @typescript-eslint/no-explicit-any`; a main tipa com `type SlideLike = { addText: (...) => unknown }` (`pptxTheme.ts` linhas 9-11) e dispensa o `eslint-disable`. Comportamento igual, codigo melhor.

## A resgatar

Vazio. Nenhum item desta branch ficou de fora da main.

## Risco de fechar esta branch

Nenhum risco pratico. O aviso "Dados simulados" ja aparece hoje nos slides 2, 3, 4 e 5 da apresentacao de BI em producao, com o mesmo texto e na mesma posicao que a branch queria. Fechar a branch nao tira nada do sistema. A branch e apenas uma copia antiga e menos acabada do que a main ja faz.

## Nao verificado

- Nao executei o gerador de PPTX nem abri um arquivo gerado: a verificacao foi por leitura do codigo da main (chamadas presentes nos 4 slides e funcao exportada com o texto correto), nao por inspecao do .pptx final.
- Nao procurei teste automatizado que cubra o badge; a conclusao nao depende disso, ja que as chamadas e a funcao estao presentes e ligadas por import real.
