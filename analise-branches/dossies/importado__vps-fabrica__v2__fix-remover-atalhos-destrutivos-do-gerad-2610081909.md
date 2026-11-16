# origin/importado/vps-fabrica/v2/fix-remover-atalhos-destrutivos-do-gerad-2610081909

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Impede que o gerador de mockup apague o formulario do vendedor sem aviso quando ele aperta Esc ou Ctrl+R — a correcao ja esta no ar; o que ficou de fora foram dois testes que servem de trava para o problema nao voltar.
- **Tip / merge-base / main:** tip `67a9db671cf82bd955498c223bc460f309c499fc` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, `67a9db671c` — "fix(mockup): remover atalhos destrutivos (Esc, Ctrl+R, Ctrl+D, 1-6), manter so Ctrl+Enter".

No gerador de mockup o teclado disparava acoes perigosas sem confirmacao: **Esc** e **Ctrl+R** limpavam o formulario inteiro, **Ctrl+D** forcava download e **1 a 6** pulavam de passo no meio do preenchimento. Alem de destrutivos, Ctrl+R e Ctrl+D sequestravam atalhos nativos do navegador (recarregar e favoritar).

A branch fez duas coisas:

1. **Codigo** (`src/components/mockup/KeyboardShortcuts.tsx`): deixou apenas `Ctrl/Cmd + Enter` (gerar). Removeu os ramos de Esc, Ctrl+R, Ctrl+D e teclas 1-6, enxugou a lista de dependencias do `useCallback` e tirou do painel de dica visual os atalhos que deixaram de existir. Manteu `onReset`/`onDownload`/`onStepChange`/`canDownload` na interface por compatibilidade com o chamador.
2. **Teste novo** (`src/components/mockup/__tests__/KeyboardShortcuts.test.tsx`, 75 linhas, arquivo criado): trava de regressao com 6 casos, provando no codigo real que cada atalho removido nao age mais e que Ctrl+Enter continua funcionando.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Esc deixa de limpar o formulario | **ESTA** | `origin/main:src/components/mockup/KeyboardShortcuts.tsx` — handler inteiro vai da linha 18 a 38 e so trata `Enter` com Ctrl/Meta (linha 27); nao existe nenhum ramo `Escape` |
| Ctrl/Cmd+R deixa de limpar e devolve o recarregar ao navegador | **ESTA** | mesmo arquivo: nao ha ramo `e.key === 'r'` em nenhuma das 44 linhas |
| Ctrl/Cmd+D deixa de baixar e devolve o atalho ao navegador | **ESTA** | mesmo arquivo: nao ha ramo `e.key === 'd'` |
| Teclas 1-6 deixam de pular de passo | **ESTA** | mesmo arquivo: nao ha comparacao `e.key >= '1'`; `onStepChange` sobrevive so como campo opcional da interface (linha 8), nao e lido pelo hook (linha 17 desestrutura apenas `onGenerate, canGenerate, isLoading`) |
| Ctrl/Cmd+Enter continua gerando | **ESTA** | `KeyboardShortcuts.tsx:27-35` |
| Comentario explicando a decisao | **ESTA, identico byte a byte** | `KeyboardShortcuts.tsx:14-16` repete as 3 linhas escritas nesta branch. Entrou na main por `3ebd35e6d3` "fix: remove return desnecessario no handler de atalhos (PR #2096) (#2110)" (`git log -S"atalhos do navegador). Limpar o formulario e so pelo botao Limpar" origin/main`) |
| Painel de dica `KeyboardShortcutsHint` enxugado | **ESTA — e a main foi adiante**: removeu o componente por inteiro, por nao ter importador | `git log -S"KeyboardShortcutsHint" origin/main` → `d90bec44f7` "chore(mockup): remove o componente morto KeyboardShortcutsHint" |
| Arquivo de teste `__tests__/KeyboardShortcuts.test.tsx` | **NAO ESTA** — nunca existiu na main | `git cat-file -e origin/main:src/components/mockup/__tests__/KeyboardShortcuts.test.tsx` → `fatal: path ... does not exist in 'origin/main'`; `git log --all --follow` nesse caminho retorna **so** `67a9db671c`, isto e, o arquivo so existiu nesta branch (nao foi apagado da main depois) |
| Cobertura equivalente na main: Esc, Ctrl+R, Cmd+R, Ctrl+D, Ctrl+Enter, `canGenerate:false` | **ESTA**, em outro arquivo | `origin/main:src/components/mockup/__tests__/KeyboardShortcuts.dead.test.tsx` — Esc nas linhas 101-106, Ctrl+R/Cmd+R 108-115, Ctrl+D 117-122, Ctrl+Enter 75-79, Cmd+Enter 81-85, `canGenerate:false` 93-97 |
| Caso "teclas 1 a 6 nao trocam de passo" | **NAO ESTA** | `KeyboardShortcuts.dead.test.tsx` nao tem nenhum caso de tecla numerica nem referencia a `onStepChange`; `git grep "não troca de passo\|key: '1'" origin/main -- src tests` so bate em arquivos de outras telas (`GlobalSearchPaletteShortcuts`, `useKitWizardShortcuts`, `ConnectionUI`, `useConnectionsOverviewFilters`). Em `src/tests/MockupDeletion.test.tsx:830-840` o hook esta **mockado** e o teste so chama `keyboardConfig.onStepChange(99)` para checar a fiacao do chamador — nao prova que a tecla `3` e ignorada |
| Caso "Ctrl+Enter nao gera enquanto esta carregando" | **NAO ESTA** | `KeyboardShortcuts.dead.test.tsx` aceita o override `isLoading` no helper (linhas 44 e 54) mas **nenhum** `it(...)` o usa: nao ha `isLoading: true` em nenhum dos 8 casos do arquivo |

## A resgatar

Dois casos de teste — o resto da branch ja esta em producao. Nao e para reabrir a branch: e para acrescentar 2 casos ao arquivo que a main ja tem (`src/components/mockup/__tests__/KeyboardShortcuts.dead.test.tsx`), copiando do arquivo da branch (`git show 67a9db671c:src/components/mockup/__tests__/KeyboardShortcuts.test.tsx`).

1. **Teclas 1 a 6 nao trocam de passo** (branch, linhas 56-60 do arquivo de teste: `it.each(['1','2','3','4','5','6'])`).
   Por que importa: `onStepChange` continua na interface do hook e o gerador **continua passando essa funcao** (`origin/main:src/pages/mockups/MockupGenerator.tsx:136`). Ou seja, a fiacao para pular de passo ainda esta la, so o ramo de teclado foi tirado. Sem este caso, basta alguem religar 4 linhas no handler para o vendedor voltar a ser jogado de passo ao digitar um numero fora de um campo — e nenhum teste fica vermelho.

2. **Ctrl/Cmd+Enter nao gera enquanto ja esta gerando** (branch, linhas 69-76: `setup({ isLoading: true })`).
   Por que importa: cada geracao de mockup e uma chamada paga de IA. Sem esta trava verificada, uma regressao que ignore o `isLoading` permite o vendedor disparar duas ou tres geracoes do mesmo mockup segurando Ctrl+Enter — custo duplicado e historico sujo. O helper de teste da main ja esta preparado para o caso (aceita o override), so falta o `it(...)`.

## Risco de fechar esta branch

Baixo e limitado a teste. Nada que o vendedor ve muda: a correcao de comportamento ja esta no ar na main desde `3ebd35e6d3`, e a main ate limpou mais do que a branch pedia. Fechar a branch sem resgatar os 2 casos nao quebra nada hoje; o risco e futuro — fica sem trava automatica para (a) a volta da navegacao por numero no teclado e (b) geracoes duplicadas pagas por Ctrl+Enter repetido. Como os 2 casos sao ~10 linhas no arquivo de teste que a main ja tem, o resgate e barato e dispensa manter a branch viva.

## Nao verificado

- Nao executei a suite de testes (`npm test`): a tarefa e somente leitura, sem alterar working tree. A afirmacao de que os 2 casos faltam esta sustentada por leitura do arquivo da main e por `git grep`, nao por execucao.
- Nao verifiquei se a PR #2096 (origem do commit que levou o codigo a main) era exatamente esta branch ou um reenvio equivalente; para o veredito isso nao muda nada, porque o conteudo da main foi comparado linha a linha com o da branch.
- Nao houve truncamento no pacote: os 2 arquivos vieram com diff completo (`arquivos_nao_lidos = 0`).
