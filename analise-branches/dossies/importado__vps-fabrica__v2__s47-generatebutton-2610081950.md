# origin/importado/vps-fabrica/v2/s47-generatebutton-2610081950

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda para quem usa o sistema — a branch so apagava um botao de tela
  que ja nao era usado em lugar nenhum, e a main de hoje ja esta sem esse botao.
- **Tip / merge-base / main:** tip `0dd4a2336ad22675e471b0249cb254812cf638e4` · merge-base
  `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, so com remocao, sem nenhuma linha nova:

`0dd4a2336a — chore(mockup): remove GenerateButton morto e seus testes exclusivos`

`git diff --stat c194982c 0dd4a2336a` → `2 files changed, 110 deletions(-)`:

1. apagar o componente `src/components/mockup/GenerateButton.tsx` (70 linhas), que era um botao
   "Gerar Mockup com IA" que ninguem mais chamava;
2. apagar do arquivo de testes `src/hooks/mockup/__tests__/mockup-audit.test.ts` (40 linhas) os dois blocos
   de teste que existiam **somente** para vigiar aquele componente — um de `prefers-reduced-motion` e um de
   `aria-hidden` nos icones.

Confirmacao de que o componente estava de fato morto no ponto de partida: no merge-base, as unicas
referencias a ele em `src/` eram as proprias linhas de teste que a branch apagou
(`git grep -n "components/mockup/GenerateButton" c194982c -- src` → so
`mockup-audit.test.ts:1407` e `:1790`). O `<GenerateButton m={m} />` que aparece em
`src/pages/magic-up/MagicUpConfigPanel.tsx:75` e outra coisa: e uma funcao local declarada no proprio
arquivo (`MagicUpConfigPanel.tsx:510`), sem relacao com o componente apagado.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Componente `src/components/mockup/GenerateButton.tsx` fora do codigo vivo | ESTA (feito de outra forma: arquivado, nao apagado) | `git cat-file -e e4ab7f85:src/components/mockup/GenerateButton.tsx` → `fatal: path ... does not exist`. O arquivo foi movido para `recovery/src-legacy/src/components/mockup/GenerateButton.tsx` pelo commit `5dd9b949d3 chore(repo): move 316 arquivos obsoletos da #3361 de src/ para recovery/src-legacy` (`git log --diff-filter=D --follow e4ab7f85 -- src/components/mockup/GenerateButton.tsx`) |
| Nada no app vivo importa esse componente arquivado | ESTA | `git grep -n "recovery/src-legacy" e4ab7f85 -- src` retorna apenas 2 linhas de **comentario** (`src/components/admin/products/productMarketingData.ts:15` e `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx:3`) — nenhum `import` |
| Bloco de teste `Analise estatica — GenerateButton.tsx (reduced-motion)` removido | ESTA | `git show e4ab7f85:src/hooks/mockup/__tests__/mockup-audit.test.ts \| grep -n "GenerateButton"` → **zero** ocorrencias |
| Bloco de teste `Analise estatica — GenerateButton.tsx (aria-hidden em icones decorativos)` removido | ESTA | mesma saida: zero ocorrencias de `GenerateButton` no arquivo de teste da main |
| Conteudo proprio da branch alem desses dois itens | NAO EXISTE (a branch nao tem mais nada) | `git diff --stat c194982c 0dd4a2336a` → exatamente 2 arquivos, 110 remocoes, 0 insercoes; 1 commit so |

Observacao sobre o "arquivo difere da main": o arquivo de testes difere porque a **main** removeu e adaptou
muito mais que a branch (o arquivo caiu de 2255 linhas na branch para 1949 na main — blocos T7
`getTechniquePrompt`, `mockupGenerationService.ts`, `SaveTemplateDialog.tsx` sairam, e varios testes passaram
a ler `mockupGeneratorModel.ts` e `useMockupEntryParams.ts` por causa da quebra do hook em modulos). Essa
diferenca e trabalho da main, nao trabalho da branch que ficou de fora: as 40 linhas que **a branch** queria
tirar ja nao estao lá.

## A resgatar

Nada. A branch nao tem uma linha de codigo nova — e 100% remocao, e as duas remocoes ja valem na main.

## Risco de fechar esta branch

Praticamente nulo, e e o caso mais seguro possivel de fechamento: uma branch que so apaga coisa nao pode
levar trabalho de ninguem embora. O efeito que ela pedia (o botao morto fora do codigo vivo e os testes
orfaos fora da suite) ja esta valendo na main hoje, por outro caminho — a main arquivou o componente em
`recovery/src-legacy/` em vez de apagar de vez, o que e mais conservador, nao menos. Se um dia alguem quiser
o botao de volta, o codigo continua guardado nesse diretorio de arquivo morto.

Nao toca banco, nao toca policy, nao toca edge function, nao toca workflow nem segredo.

## Nao verificado

- Nao rodei a suite de testes (`npm test`) para ver a main verde: a tarefa e somente de leitura e nao autoriza
  execucao de build/teste. A verificacao foi por conteudo dos arquivos no commit da main, nao por execucao.
- O pacote de evidencia veio TRUNCADO no fim (o diff B do arquivo de testes corta no meio do bloco
  `SaveTemplateDialog.tsx`). Isso nao afeta o veredito: reli os dois arquivos direto do git
  (`git show` / `git grep` nos SHAs) e eles sao os unicos 2 arquivos da branch. Arquivos sem leitura: 0.
