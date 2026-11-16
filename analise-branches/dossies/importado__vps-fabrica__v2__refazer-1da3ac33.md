# origin/importado/vps-fabrica/v2/refazer-1da3ac33

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** mostra no topo do gerador de mockups de qual cliente e o trabalho, deixa trocar de cliente sem perder a logo por acidente, da acesso aos mockups ja feitos e permite voltar uma etapa sem apagar o que o vendedor ja preencheu — tudo isso **ja esta no ar**.
- **Tip / merge-base / main:** tip `dcc50f02be26ab8170d0fb4ed43d2d6802eb962b` · merge-base `4cf61adaee399733236be7a418b54ae5a154cf9f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de "Fabrica Hermes" em 2026-10-13:

1. `d1c26fecca feat(mockup): cabecalho de trabalho do gerador (cliente, trocar cliente, Meus mockups)` — transformar a barrinha de desfazer/refazer (`MockupToolbar`) num cabecalho de trabalho: nome do cliente, nome do projeto (quando houver), botao "Trocar cliente" que **pergunta antes** o que fazer com a logo ja aplicada (manter ou remover), estado de salvamento do rascunho e um acesso a "Meus mockups". Junto, um botao "Voltar" no assistente (`MockupWizard`) que recua uma etapa **sem resetar** as escolhas, e um arquivo de teste novo cobrindo tudo isso.
2. `dcc50f02be fix(mockup): evita regressao do ratchet de as-assertions no comentario do Voltar` — mudanca de **uma palavra num comentario** (`as escolhas` -> `escolhas`) para nao disparar um guarda-chuva de lint/ratchet do repo. Evidencia: `git show dcc50f02be --stat` = 1 arquivo, 1 insercao, 1 delecao, so comentario.

Ponto importante de contexto: o repo usa squash-merge, entao a branch nunca aparece como ancestral da main. O trabalho dela entrou na main pela PR **#3664** — `7307f53346 feat(mockup): cabecalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraida (#3664)`, titulo praticamente igual ao commit da branch.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Cabecalho de trabalho do gerador (docstring e estrutura) | `src/pages/mockups/mockup-generator/MockupToolbar.tsx:1-8` | o diff (B) branch->main do pacote mostra essas linhas como **contexto inalterado**; `git show origin/main:...MockupToolbar.tsx \| grep -n "Trocar cliente"` -> linha 108 |
| Nome do cliente no cabecalho (`client`, `data-testid="mockup-toolbar-client"`) | `MockupToolbar.tsx:84` na main | grep em `origin/main`: `84: <div ... data-testid="mockup-toolbar-client">` |
| Nome do projeto so quando informado (`projectName`) | `MockupToolbar.tsx:40,61,90-95` na main | grep em `origin/main`: `40: projectName?: string \| null;` / `90: {projectName ? (` |
| Tipo `ClientBrandDisposition` ('limpar-marca' / 'manter-marca') | `MockupToolbar.tsx:20` na main | grep em `origin/main`: `20:export type ClientBrandDisposition = ...` |
| "Trocar cliente" pergunta antes quando ha marca aplicada (`hasAppliedBrand`, `ConfirmDialog`, `testId="change-client-dialog"`) | `MockupToolbar.tsx:42,62,70-80,103-108,199` na main | grep em `origin/main`: `70: if (hasAppliedBrand) {`, `199: testId="change-client-dialog"` |
| Callback `onChangeClient(disposition)` ligado de ponta a ponta (nao ficou prop solta) | consumido em `src/pages/mockups/MockupGenerator.tsx:296-297` na main | `git grep -n "onChangeClient\|hasAppliedBrand" origin/main -- src` -> `MockupGenerator.tsx:296 hasAppliedBrand={mg.hasLogo}` / `:297 onChangeClient={handleChangeClient}` |
| Acesso a "Meus mockups" com destino `/mockups/historico` | existe na main, **em forma melhor**: botao "Meus mockups" que abre um painel com os mockups do cliente e o link "Ver historico completo" -> `historyHref`. `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx:148,153,171,174` | grep em `origin/main`: `171: Meus mockups`, `153: <Link to={historyHref}>Ver historico completo</Link>`, `174: data-testid="client-mockups-panel"`. O link cru da branch foi substituido de proposito por esse painel, que veio com teste proprio (`__tests__/ClientMockupsMenu.test.tsx`) e hook (`src/hooks/mockup/useClientMockups.ts`) |
| Botao "Voltar" no assistente, recuando uma etapa sem resetar nada | `src/components/mockup/MockupWizard.tsx:126-142` na main, **identico** ao da branch, inclusive `aria-label="Voltar para a etapa anterior"` e `disabled={currentStep <= 1}` | `git show origin/main:src/components/mockup/MockupWizard.tsx \| sed -n '124,142p'` reproduz o bloco linha por linha |
| O `fix` do comentario (1 palavra: `as escolhas` -> `escolhas`) | na main com o texto **ja corrigido**: `MockupWizard.tsx:128` = `Voltar navega para a etapa anterior SEM resetar nada: escolhas` | main nao tem o `as`; e exatamente o estado pos-`dcc50f02be` |
| Arquivo de teste novo `__tests__/MockupToolbar.header.test.tsx` (8 testes) | na main com os 8 testes; 7 iguais e 1 reescrito para o painel novo | `git show origin/main:...MockupToolbar.header.test.tsx \| grep -n "  it("` -> 8 testes, entre eles "trocar cliente com marca aplicada PERGUNTA...", "permite remover a marca aplicada...", "fechar a reconciliacao (Esc) nao decide nada...", "volta para a etapa anterior sem apagar as escolhas ja feitas", "na primeira etapa o Voltar fica desabilitado" |
| 4o arquivo tocado pela branch: `__tests__/MockupToolbar.test.tsx` | na main **byte a byte igual** ao da branch | `git diff --stat origin/main dcc50f02be -- src/pages/mockups/mockup-generator/__tests__/MockupToolbar.test.tsx` -> saida vazia |
| Quando entrou | PR #3664 | `git log -S"ClientBrandDisposition" --oneline origin/main -- ...MockupToolbar.tsx` e `git log -S"Voltar para a etapa anterior" --oneline origin/main -- ...MockupWizard.tsx` apontam ambos para o **mesmo** commit `7307f53346 ... (#3664)` |

### Por que os 3 arquivos "diferem" da main sem nada ter ficado de fora

Os unicos pontos em que a main difere da branch sao melhorias **feitas depois**, por cima do trabalho dela:

- `MockupToolbar.tsx`: o link simples "Meus mockups" virou o painel `ClientMockupsMenu` (mesmo destino `/mockups/historico`, agora com previa dos mockups do cliente) e o cliente ganhou `id` para alimentar essa listagem.
- `MockupWizard.tsx`: nova prop `reachableStep` (corrige um efeito colateral do proprio "Voltar": sem ela, voltar uma etapa tirava o clique da etapa pendente), correcao de cor (`rgba(var(--primary))` -> `hsl(var(--primary)/0.4)`) e `role="list"/"listitem"` nas pills.
- arquivo de teste: um dos 8 testes foi reescrito para cobrir o painel em vez do link; os outros 7 seguem iguais.

Nenhuma dessas diferencas remove comportamento que a branch trouxe.

## A resgatar

Nada. Todos os itens da branch foram localizados na main de hoje com evidencia direta (tabela acima), e os dois commits dela entraram pela PR #3664.

## Risco de fechar esta branch

Praticamente nulo. O cabecalho do gerador, a pergunta antes de trocar de cliente, o acesso aos mockups do cliente e o "Voltar" sem perder preenchimento estao todos na main e ligados a tela (`MockupGenerator.tsx:296-297`), com testes rodando na main. Fechar esta branch nao tira nada do ar e nao perde nenhuma decisao. O unico detalhe cosmetico: a main pede um clique a mais para chegar ao historico completo ("Meus mockups" abre um painel e o historico fica no rodape dele) — foi escolha deliberada de quem continuou o trabalho, nao perda.

## Nao verificado

- Nao foi executado nenhum teste nesta analise (a tarefa e somente leitura); a afirmacao "os testes estao na main" se refere a **presenca** dos casos no arquivo em `origin/main`, nao a uma execucao verde observada aqui.
- Nao foi verificado o comportamento no navegador (deploy), apenas o codigo da main.
- Arquivos sem leitura por truncamento: 0 (o pacote nao reportou TRUNCADO; os 4 arquivos tocados pela branch foram inspecionados).
