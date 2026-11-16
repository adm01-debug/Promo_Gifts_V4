# origin/claude/fix-ft-ux-batch4-261101-2215

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Protege o vendedor de perder um kit já montado quando pede uma sugestão de IA, e deixa as mensagens de erro da IA dizerem a causa certa.
- **Tip / merge-base / main:** tip `91599c8555b7caf0572174337c8ceeb5093205ad` · merge-base `4c6541b6f5fab4205600472bc086c2f603a69312` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um commit só (`91599c8555`, 01/11/2026), três correções de experiência de uso:

1. **FT-134** — ao aplicar a sugestão da IA num kit que já tem produtos/caixa, abrir uma
   janela de confirmação ("Substituir conteúdo do kit?") com botões Cancelar / Substituir,
   em vez de trocar o conteúdo direto. Prop nova `hasExistingContent`, passada pelo
   `KitBuilderHeader`.
2. **FT-136** — separar a mensagem de erro de "muitas tentativas" (HTTP 429) da de
   "serviço indisponível" (503/504/timeout), para o usuário saber o que fazer.
3. **FT-173** — mandar o limite de cores da técnica escolhida para o analisador de cores da
   logo (`maxColors`), para o aviso "logo tem mais cores do que a técnica permite" aparecer.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| FT-173: limite de cores da técnica chega ao analisador de logo | **Está, linha idêntica** | `src/components/mockup/MockupConfigPanel.tsx:388` na main: `maxColors={selectedTechnique?.maxColors ?? undefined}`. Entrou pela PR #3660 (`5e59cb9c79` "trem de resgates — 16 correções recuperadas de branches de outros agentes") |
| FT-173: comportamento coberto por teste | **Está** | `src/components/mockup/__tests__/MockupConfigPanel.maxColors.test.tsx:89-110` na main (4 casos: técnica de 2 cores avisa, de 4 cores não avisa, `null` não avisa, sem técnica não avisa) |
| FT-136: 429 com mensagem própria, separada de 503/504 | **Está** | main `src/components/kit-builder/KitAIPromptDialog.tsx:114-119`: `429 || errorKind === 'timeout'` → "Muitas tentativas em pouco tempo…"; `503 \|\| 504` → "Serviço temporariamente indisponível…". Entrou pela PR #2979 (`3bf5820259` "separa mensagem de erro 503/504 de 429/timeout (FT-136)") |
| FT-136: em que bucket fica o `timeout` | **Diferente de propósito, e a main está mais certa** | A main agrupa o timeout do cliente com o 429, e documenta o motivo no teste `tests/components/kit-builder/KitAIPromptDialog.test.tsx:264-275`: o estouro de 20s do gateway de IA chega como HTTP 504 (→ "indisponível"), enquanto `errorKind === 'timeout'` é o corte local de 25s (→ "tente de novo em 1 minuto"). A variante da branch inverteria isso e quebraria esse teste |
| FT-134: avisar que a sugestão da IA vai substituir o kit já montado | **Está, em forma mais fraca (aviso, não confirmação)** | main `KitAIPromptDialog.tsx:514-520`: com `hasExistingItems`, mostra "⚠ Isso substituirá a composição atual do kit." e o botão passa a se chamar "Substituir e usar esta composição". Ligado ponta a ponta: `KitBuilderHeader.tsx:402` passa `hasExistingItems={hasContent}` |
| FT-134: janela de confirmação que **bloqueia** e deixa cancelar | **NAO ESTA** | `git grep -c AlertDialog e4ab7f85d9 -- src/components/kit-builder/KitAIPromptDialog.tsx` → nenhum resultado. A main teve essa janela (PR própria, `29838f1f98` "confirmar substituição ao aplicar composição da IA (FT-134)", 09/11 09:24) e a perdeu 3h depois, por decisão declarada, em `944ff2dd03` (PR #3350): "KitAIPromptDialog: substitui AlertDialog por aviso inline quando há itens existentes (FT-134)" |

## A resgatar

1. **Confirmação que bloqueia antes de substituir um kit já montado**
   (`src/components/kit-builder/KitAIPromptDialog.tsx`). Hoje, na main, o vendedor que já
   montou um kit e pede uma sugestão da IA vê um aviso em texto, mas um clique no botão já
   troca produtos e caixa, sem volta. A versão da branch exigia um segundo clique
   ("Substituir") e oferecia "Cancelar". **É uma decisão sua, não técnica:** trocar o kit
   montado por um clique (mais rápido, com risco de perder o trabalho do vendedor) ou por
   dois cliques (mais chato, sem risco). Se a resposta for "dois cliques", o resgate é
   pequeno e não precisa desta branch: o código pronto está no histórico da main, no commit
   `29838f1f98`.

## Risco de fechar esta branch

Baixo, com uma ressalva. Dois dos três itens (FT-173 e FT-136) já estão na main, com teste,
e a variante de FT-136 desta branch é pior do que a da main — resgatá-la quebraria teste.
O único efeito de fechar sem mais nada é deixar como está o ponto de FT-134: substituir um
kit já montado continua acontecendo com um clique só, com aviso em texto. Nada mais da
branch se perde.

Fora do escopo desta branch, mas visto na mesma leitura: o commit `944ff2dd03` (PR #3350),
além de trocar a confirmação pelo aviso, também apagou o cancelamento da geração de IA em
andamento (`AbortController`) que a PR #3276 (`36f366b9ac`) havia acabado de colocar — veja
o diff de `944ff2dd03` em `src/components/kit-builder/KitAIPromptDialog.tsx`. Isso é um
defeito vivo na main, de outra branch, e merece tarefa própria.

## Nao verificado

- Não rodei `npm test`, `npm run lint` nem o build: a tarefa é somente leitura e nenhuma
  afirmação acima depende de execução. A evidência é toda de código e de histórico do git.
- Não abri o navegador: que o aviso em texto da main de fato apareça na tela do vendedor
  está afirmado pelo código e pela ligação da prop (`KitBuilderHeader.tsx:402`), não por
  observação da tela.
- Nenhum arquivo ficou sem leitura: o pacote está truncado no fim (corta no meio do diff B
  de `MockupConfigPanel.tsx`), mas esse arquivo foi lido direto na main
  (`git show e4ab7f85d9:src/components/mockup/MockupConfigPanel.tsx`).
