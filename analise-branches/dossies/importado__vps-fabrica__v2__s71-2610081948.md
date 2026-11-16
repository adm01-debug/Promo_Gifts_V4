# origin/importado/vps-fabrica/v2/s71-2610081948

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** No resultado do mockup, "a imagem saiu", "o projeto foi salvo" e "a ficha de aprovacao esta pronta" passam a ser tres avisos separados, para o vendedor nunca achar que esta tudo certo quando uma das tres coisas falhou.
- **Tip / merge-base / main:** tip `c01b82704574e3c884cba8a420b487069d07a5d5` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `c01b827045 feat(mockup): tres estados de conclusao separados no resultado do mockup`.

O proprio arquivo criado pela branch declara a intencao
(`src/components/mockup/MockupCompletionStates.tsx`, cabecalho da versao da branch):
"Imagem gerada, projeto salvo e ficha disponivel sao condicoes DISTINTAS: cada uma tem o
proprio estado, o proprio erro e a propria repeticao. A falha de uma nunca esconde nem
resolve nenhuma outra."

Em concreto, a branch entregou quatro coisas:

1. Um componente novo com **tres indicadores independentes** no cartao de resultado
   (`completion-image`, `completion-project-save`, `completion-sheet`), cada um com
   `data-status` proprio (`idle`/`running`/`done`/`error`) e mensagem propria.
2. **"Salvo" so com gravacao confirmada** — a existencia da imagem nao conta como salvo.
3. **Preservar o resultado anterior quando uma nova geracao falha**: a imagem que o
   vendedor ja tinha continua na tela, rotulada, em vez de desaparecer
   (`lastGeneratedMockup` + `showsPreviousResult` em `MockupResultCard.tsx`).
4. **Repeticao por condicao**: botoes separados para repetir so a geracao, so o
   salvamento (`retry-save`) e so a ficha (`retry-sheet`) — repetir o salvamento nunca
   dispara outra geracao paga.

Mais um arquivo de teste novo cobrindo os quatro pontos
(`src/components/mockup/__tests__/MockupResultCard.states.test.tsx`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Componente `MockupCompletionStates` com indicadores independentes | ESTA, e descende deste arquivo | `src/components/mockup/MockupCompletionStates.tsx` existe na main; entrou em `ecface83bd feat(mockup): preserva o resultado quando a geração falha... (#3674)` (`git log -S"MockupCompletionStates" origin/main -- <arquivo>`). `git diff --stat c01b827045:<arquivo> ecface83bd:<arquivo>` = **12 insercoes / 37 delecoes** — a versao da main e o arquivo da branch, podado |
| Indicador da imagem (`completion-image`, `data-status`, erro proprio, `retry-generate`) | ESTA, identico | `MockupCompletionStates.tsx:` `testId="completion-image"` + `retryTestId="retry-generate"`; teste `MockupResultCard.states.test.tsx` cobre `data-status` `done`/`error` |
| Indicador do projeto salvo (`completion-project-save`) e "salvo" so com gravacao confirmada | ESTA, e reforcado | `MockupCompletionStates.tsx` mantem `PROJECT_SAVE_LABELS` e `testId="completion-project-save"`; a confirmacao virou regra explicita em `src/pages/mockups/mockup-generator/useMockupCompletionStatus.ts:95-96` (`projectSaveStatus = displayedMockup && savedMockupUrl === displayedMockup ? 'done' : 'idle'`) |
| Falha de salvar nao esconde a imagem gerada / nao contamina os outros | ESTA; o teste da branch sobreviveu | `MockupResultCard.states.test.tsx`, teste "falha de salvar nao esconde a imagem gerada nem contamina os outros indicadores" continua na main |
| Preservar o resultado anterior numa geracao que falha | ESTA, refatorado para hook e **mais forte** que na branch | `src/components/mockup/usePreservedMockupResult.ts` (entrou no mesmo `ecface83bd`); na main o cartao ainda rotula `previous-result-notice` ("Imagem anterior — a nova tentativa falhou. Nao envie como se fosse a nova."), desabilita Baixar e esconde Compartilhar — protecoes que a branch nao tinha |
| Terceiro indicador "Ficha" no cartao de resultado (`completion-sheet`, `SHEET_LABELS`, "Preparando a ficha..." / "Ficha disponivel") | **NAO ESTA** no cartao | `grep -rn "completion-sheet\|SHEET_LABELS" src/ tests/` → nenhum resultado. Ja entrou podado: `git show ecface83bd:src/components/mockup/MockupCompletionStates.tsx \| grep -i sheet` → vazio |
| Aviso ao vendedor quando a ficha FALHA | ESTA, por outro caminho (aviso na tela, nao indicador) | `useMockupCompletionStatus.ts:81-83`: `toast.error('Não foi possível preparar a ficha de aprovação deste mockup. O mockup está salvo — gere a ficha de novo.')`, ligado em `MockupGenerator.tsx:194` (`onFailed={completion.handleLayoutFailed}`) |
| Sinal de que a ficha esta pronta | ESTA, por outro caminho (no historico, nao no cartao) | `src/components/mockup/MockupHistoryPanel.tsx:554-563`: `{mockup.layout_url && (<Badge ...>Layout</Badge>)}` |
| `onRetrySave` / `retry-save` (repetir so o salvamento) | NAO ESTA — **descartado de proposito, com motivo escrito** | Cabecalho de `MockupCompletionStates.tsx` na main: "Repetição: só a imagem tem repetição aqui, porque só ela tem produtor de erro hoje (useMockupGenerator.ts:625). A gravação ainda não expõe erro próprio, então não recebe botão que nunca apareceria." Confirmado em `useMockupCompletionStatus.ts:95-96`, que so emite `done` ou `idle` — nunca `error`, logo o botao nunca apareceria |
| `onRetrySheet` / `retry-sheet` (repetir so a ficha) | NAO ESTA; o caminho atual e o aviso pedindo "gere a ficha de novo" | mesmo `toast.error` em `useMockupCompletionStatus.ts:81-83`; `grep "retry-sheet" src/` → vazio |
| Estados `running`/`idle` da imagem | sem efeito pratico nos dois lados | na branch, `imageStatus='running'` so ocorre sem imagem e sem erro — e nesse caso o cartao nem renderiza (`if (displayedMockup)`); na main o calculo e `generatedMockup ? 'done' : 'error'` (`MockupResultCard.tsx:143`) |

## A resgatar

**1. O indicador "Ficha de aprovacao" dentro do cartao de resultado** —
`src/components/mockup/MockupCompletionStates.tsx` (voltar `SHEET_LABELS` + o terceiro
`CompletionIndicator`, alimentado pelo estado da captura em
`src/pages/mockups/mockup-generator/useMockupCompletionStatus.ts`).

Por que importa para o negocio: hoje, olhando o resultado do mockup, o vendedor ve se a
imagem saiu e se o projeto foi salvo, mas nao ve nada sobre a ficha de aprovacao que vai
para o cliente. Se a ficha falha, ele recebe um aviso que passa e desaparece
(`toast`, `useMockupCompletionStatus.ts:81-83`); se da certo, a unica pista fica no
historico (selo "Layout", `MockupHistoryPanel.tsx:554`). Nao existe em lugar nenhum o
estado "preparando a ficha". Resultado pratico: o vendedor pode mandar o mockup ao
cliente achando que a ficha foi junto.

Tamanho do resgate: pequeno e sem risco (UI, um indicador a mais, sem banco e sem
edge). Nao e urgente, porque o vendedor **e** avisado na falha — o que falta e o aviso
ficar na tela em vez de passar.

**Nao vale resgatar** (e a decisao da main esta certa, com motivo escrito): os botoes
"Salvar de novo" e "Tentar de novo" por condicao. Quem produz o estado do salvamento so
emite "salvo" ou "ainda nao salvo", nunca "erro"
(`useMockupCompletionStatus.ts:95-96`), portanto esses botoes nunca apareceriam na tela.

## Risco de fechar esta branch

Baixo. O trabalho central desta branch ja esta em producao e foi melhorado depois dela: o
componente dos indicadores na main e literalmente este arquivo (12 linhas somadas, 37
retiradas), e a preservacao do resultado anterior virou hook proprio com protecoes que a
branch nao tinha (nao deixa baixar nem compartilhar a imagem velha como se fosse a nova).

O unico prejuizo de fechar sem resgatar: continua sem existir, no cartao de resultado, um
aviso fixo sobre a ficha de aprovacao do cliente. Isso nao quebra nada, mas deixa de pe o
risco de o vendedor enviar um mockup supondo que a ficha saiu junto quando ela falhou (ele
e avisado, mas por um aviso que desaparece da tela).

Nenhum risco de banco, permissao, preco ou infraestrutura: a branch toca 3 arquivos, todos
de interface (`src/components/mockup/`).

## Nao verificado

- Nao executei `npm test` nem o typecheck: a tarefa e somente leitura e nao escrevo no
  working tree. A afirmacao de que os testes da branch sobreviveram na main vem da leitura
  do arquivo `src/components/mockup/__tests__/MockupResultCard.states.test.tsx` na main, nao
  de execucao.
- Nao verifiquei no navegador o comportamento real do aviso de falha da ficha (so o codigo
  que o dispara: `useMockupCompletionStatus.ts:81-83` ligado em `MockupGenerator.tsx:194`).
- Arquivos sem leitura por truncamento: nenhum. O pacote trouxe os 3 arquivos com os dois
  diffs completos e sem marca de TRUNCADO.
