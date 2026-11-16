# origin/importado/vps-fabrica/v2/s76-2610081949

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Põe no topo do gerador de mockups o nome do cliente para quem está trabalhando, o botão "Trocar cliente" que pergunta o que fazer com a marca já aplicada em vez de trocar em silêncio, o acesso a "Meus mockups" e um "Voltar" entre etapas que não apaga o que já foi escolhido.
- **Tip / merge-base / main:** tip `f6713286ddcf7edd9e589fd72bbb894fa418a15e` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um único commit (`f6713286dd` — "feat(mockup): cabecalho de trabalho do gerador (cliente, trocar cliente, Meus mockups)") com três entregas:

1. **Cabeçalho de trabalho** em `src/pages/mockups/mockup-generator/MockupToolbar.tsx`: numa linha, o cliente selecionado (ou "Sem cliente"), o nome do projeto quando informado, desfazer/refazer e o estado de salvamento do rascunho.
2. **"Trocar cliente" com reconciliação da marca**: se há logo do cliente aplicada na área ativa, abre um diálogo e só troca depois que o usuário escolhe "Manter marca" ou "Remover marca" (tipo `ClientBrandDisposition = 'limpar-marca' | 'manter-marca'`). Sem marca aplicada, troca direto.
3. **"Meus mockups"** no cabeçalho, levando ao histórico (`/mockups/historico`), e um **"Voltar"** no assistente de etapas (`src/components/mockup/MockupWizard.tsx`) que recua uma etapa **sem resetar** as escolhas já feitas. Mais o teste `__tests__/MockupToolbar.header.test.tsx` cobrindo tudo isso.

O trabalho entrou na main pela PR **#3664**, squash-merged em **2026-11-15** como `7307f53346` — "feat(mockup): cabeçalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraída (#3664)". Evidência: `git log -S"ClientBrandDisposition" --oneline origin/main -- src/pages/mockups/mockup-generator/MockupToolbar.tsx` devolve só esse commit. A main de hoje tem o mesmo texto de comentário, os mesmos `data-testid` e os mesmos nomes de teste escritos nesta branch — e por cima disso andou mais um passo (ver coluna de evidência).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Docblock "Cabeçalho de trabalho do gerador de mockups" | `src/pages/mockups/mockup-generator/MockupToolbar.tsx:2` | linha idêntica à da branch |
| Tipo `ClientBrandDisposition` ('limpar-marca' \| 'manter-marca') | `MockupToolbar.tsx:20` | `export type ClientBrandDisposition = 'limpar-marca' \| 'manter-marca';` |
| Props `client` / `projectName` / `hasAppliedBrand` / `onChangeClient` / `historyHref` | `MockupToolbar.tsx:42,47,49,62,63,64` | mesmas assinaturas; `historyHref = '/mockups/historico'` como default |
| Bloco do cliente com `data-testid="mockup-toolbar-client"`, ícone `Building2` e fallback "Sem cliente" | `MockupToolbar.tsx:84,88` | `{client ? client.name : 'Sem cliente'}` |
| Nome do projeto só quando informado (`data-testid="mockup-toolbar-project"`) | `MockupToolbar.tsx:93` | mesmo testid, renderização condicional |
| Botão "Trocar cliente" (`aria-label="Trocar cliente"`, desabilitado sem handler) | `MockupToolbar.tsx:103,105,108` | `disabled={!onChangeClient}` |
| Reconciliação: pergunta antes de trocar quando há marca aplicada | `MockupToolbar.tsx:70-79` (`handleChangeClient` / `resolveDisposition`) + `ConfirmDialog` `testId="change-client-dialog"` em `:189-199` | main ainda acrescentou `variant="warning"` ao diálogo |
| "Meus mockups" com ícone `History` apontando para o histórico | **Existe, refatorado**: virou o componente `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx` — botão "Meus mockups" (`:170-171`) que abre um painel com os mockups do cliente e rodapé `<Link to={historyHref}>Ver histórico completo</Link>` (`:153`); montado em `MockupToolbar.tsx:183-187` | o destino `/mockups/historico` segue existindo como rota real: `src/routes/tools-routes.tsx:83` |
| Botão "Voltar" no assistente, sem resetar escolhas | `src/components/mockup/MockupWizard.tsx:128-139` | mesmo comentário, `aria-label="Voltar para a etapa anterior"`, `disabled={currentStep <= 1}`, `onClick={() => onStepClick(currentStep - 1)}` |
| Import de `ChevronLeft` no wizard | `MockupWizard.tsx:11` | — |
| Teste "mostra o cliente selecionado e o estado de salvamento" | `__tests__/MockupToolbar.header.test.tsx:61` | — |
| Teste "mostra o nome do projeto somente quando informado" | mesmo arquivo `:71` | — |
| Teste do acesso ao histórico | **Existe, reescrito mais forte** `:80` — `'"Meus mockups" abre o painel do cliente com o link para o histórico completo'`, que ainda assim afirma `href = '/mockups/historico'` | o teste da branch checava um `<Link>`; o da main checa o painel e o mesmo destino |
| Teste "trocar cliente com marca aplicada PERGUNTA o que fazer" | mesmo arquivo `:100` | nome idêntico ao escrito na branch |
| Teste "permite remover a marca aplicada ao trocar de cliente" | `:117` | — |
| Teste "sem marca aplicada, trocar cliente não pergunta nada" | `:129` | — |
| Testes do Voltar (recua sem apagar / desabilitado na etapa 1) | `:175` e `:191` | — |

Além de absorver tudo, a main avançou: `reachableStep` no wizard (`MockupWizard.tsx:32,47,158`) para o Voltar não tirar o clique da etapa que já estava liberada; prioridade "erro de salvamento acima de salvo" na badge; `role="list"/"listitem"` nas pílulas de etapa; correção de `rgba(var(--primary))` para `hsl(var(--primary)/0.4)`; e um teste novo de Esc no diálogo (`:140`). O cabeçalho também está ligado ponta a ponta na página: `src/pages/mockups/MockupGenerator.tsx:214,296,297` passa `reachableStep`, `hasAppliedBrand` e `onChangeClient`.

## A resgatar

Nada. Os três arquivos da branch têm correspondente na main com o mesmo comportamento ou melhor, item por item, conforme a tabela acima.

## Risco de fechar esta branch

Nenhum risco de perda. Todo o comportamento que a branch criou está em produção na main (PR #3664, mergeada em 15/11/2026) e coberto pelos mesmos testes, agora mais completos. A branch é anterior a esse merge e só representa a versão antiga do mesmo trabalho. Manter a branch aberta tem o risco oposto: alguém tentar reaplicá-la por cima e reintroduzir a versão antiga, que não tem o `reachableStep` (voltar uma etapa tirava o clique da etapa já liberada), não prioriza o aviso de erro de salvamento e troca o painel "Meus mockups" do cliente por um link simples — ou seja, reaplicar pioraria o que já está no ar.

## Nao verificado

- Não rodei `npm test` nem lint: a decisão aqui é de destino da branch e a verificação foi por leitura da main (arquivo:linha) e por `git log -S`; a suíte da main é responsabilidade do merge que já ocorreu.
- Não verifiquei o estado da PR #3664 no GitHub (aberta/fechada/branch apagada) — a evidência do merge veio do histórico de `origin/main`, não da API.
- Nenhum arquivo ficou sem leitura: o pacote trouxe os 3 arquivos com os dois diffs, sem marca de TRUNCADO.
