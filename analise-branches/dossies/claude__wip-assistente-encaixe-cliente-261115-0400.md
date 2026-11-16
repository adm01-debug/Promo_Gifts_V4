# origin/claude/wip-assistente-encaixe-cliente-261115-0400

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** na ficha de cada cliente, o vendedor ve na hora ate 8 brindes escolhidos para aquele cliente (pelo ramo de atividade, pela cor da logo e pelo giro), cada um com uma nota e o motivo escrito em portugues.
- **Tip / merge-base / main:** tip `00b1f75d37ebff4481413f8dd1921cb68745ba4f` · merge-base `20dfb7b30bca9e3636a8c990bec6bbcfbd0581ed` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico (`00b1f75d37`, "feat(assistente): fase 1 do Encaixe do Cliente — candidatos por ramo, cor e giro"):
primeira fase de um assistente de vendas que sugere brindes para um cliente especifico. A escolha nao usa
IA — a pontuacao roda em SQL, numa RPC nova (`rpc_sales_assistant_candidates`), e o card aparece em
`/clientes/:id`. A propria mensagem do commit declara: "NAO VALIDADO: typecheck, testes e revisao cetica
nao rodaram neste consolidado. Branch salva para nao perder o trabalho; a validacao e a PR ficam para a
proxima sessao."

Em numeros, a branch escreveu **19 arquivos / 3.634 linhas** (`git diff --stat 20dfb7b3 00b1f75d`):
a RPC + rollback, a camada de pontuacao em TS (`logoColorToGroups`, `ramoAliases`, `buildReason`), dois
hooks (`useClientBrandSignals`, `useSalesAssistantCandidates`), o card e suas linhas/estados, 5 arquivos de
teste, a ligacao na pagina do cliente e dois ajustes de tipo/export de apoio.

O desfecho: a "proxima sessao" aconteceu. A main de hoje tem a fase 1 **validada e mergeada** em
`4344666f2d` — "feat(assistente): Encaixe do Cliente — fase 1 validada e com os 2 portoes destravados
(#3663)" — e refinada em `6da08832ec` — "fix(assistente): card nao acusa falha enquanto a RPC nao foi
aplicada (#3678)" (`git log --oneline origin/main -- src/hooks/assistant/useSalesAssistantCandidates.ts`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| RPC de pontuacao `rpc_sales_assistant_candidates` (+ rollback) | na main, **arquivo byte-identico** ao da branch | `supabase/migrations/20261115034500_rpc_sales_assistant_candidates.sql:62` (`CREATE OR REPLACE FUNCTION`), `:201` (REVOKE); `git diff 00b1f75d origin/main -- <esse caminho>` nao devolve nada |
| Card "Encaixe do Cliente" | na main, com um estado novo a mais | `src/components/assistant/SalesAssistantCard.tsx:57` (`TITULO_DO_CARD = 'Encaixe do Cliente'`) |
| Card ligado na ficha do cliente (rota `/clientes/:id`) | na main | `src/pages/clients/ClientDetailPage.tsx:7` (import) e `:57` (`<SalesAssistantCard clientId={id} />`) — arquivo byte-identico ao da branch |
| Linha de produto do card (`SalesAssistantProductRow`, `SCORE_MAXIMO`, `SEM_PRECO`) | na main, byte-identico | `git diff 00b1f75d origin/main -- src/components/assistant/SalesAssistantProductRow.tsx` vazio |
| Estados do card (esqueleto, erro, sem sinal, sem candidatos, `motivosDaFaltaDeSinal`) | na main, mais o estado novo `SalesAssistantEmPreparacao` | `src/components/assistant/SalesAssistantStates.tsx:85` e `:109`; estado novo nas linhas 153+ |
| Hook dos sinais do cliente (`useClientBrandSignals`) + teste | na main, byte-identico | `git diff 00b1f75d origin/main -- src/hooks/assistant/useClientBrandSignals.ts src/hooks/assistant/__tests__/useClientBrandSignals.test.ts` vazio |
| Hook dos candidatos (`useSalesAssistantCandidates`, `RPC_DE_CANDIDATOS`, `contextoDoCliente`, `mapearCandidato`, `SCORE_MINIMO`, `LIMITE_DE_CANDIDATOS`, `MAXIMO_POR_CATEGORIA`) | na main, com 3 correcoes a mais (abaixo) | `src/hooks/assistant/useSalesAssistantCandidates.ts:43` (`RPC_DE_CANDIDATOS`) |
| Motivo em portugues (`buildReason`, `buildHonestNote`, `ORDEM_DOS_SINAIS`) | na main; uma frase do rodape foi reescrita de proposito | `src/lib/assistant/buildReason.ts:56` (`ORDEM_DOS_SINAIS`), `:274` (`buildHonestNote`) |
| Cor da logo -> grupo de cor do catalogo (`logoColorToGroups`, Delta-E, confianca) | na main, com uma regra a mais | `src/lib/assistant/logoColorToGroups.ts:200` |
| Ramo do CRM -> ramo do catalogo (`ramoAliases`) + teste | na main, byte-identico | `src/lib/assistant/ramoAliases.ts:58` (`RAMOS_CANONICOS`), `:91` (`APELIDOS_POR_RAMO`) |
| Colunas de cor da marca no tipo do cliente (`brand_colors`, `cores_marca`) | na main, byte-identico | `git diff 00b1f75d origin/main -- src/types/crm.ts` vazio |
| Exports de apoio de cor (`rgbToLab`, `hexToRgb`, `deltaE`) | na main, byte-identico | `git diff 00b1f75d origin/main -- src/utils/color-matching.ts` vazio |
| 5 arquivos de teste da branch | na main, todos; os 3 que mudaram ganharam casos novos ou acompanharam as correcoes | diffs (B) do pacote de evidencia |

**Os 9 arquivos que "diferem da main" diferem porque a main andou PARA FRENTE, nao porque perdeu algo.**
Cada diferenca, com a direcao:

1. `useSalesAssistantCandidates.ts` — a main **acrescenta** a classe `ErroDeRpcNaoAplicada` e trata o codigo
   `PGRST202`: enquanto a RPC nao for aplicada no banco, o card diz "em preparacao" em vez de "a busca de
   brindes falhou". Acrescenta tambem `nomeDoGrupoDeCorUnico` (`:252`) e troca a confianca de cor do
   "primeiro encaixe" para "o mais fraco", para o card nao prometer "cor igual a logo" num produto que casou
   so pela cor aproximada. O unico trecho da branch que saiu (`CAMPO_POR_SINAL`, um mapa interno) foi
   substituido por um objeto literal equivalente, e `ORDEM_DOS_SINAIS` continua vivo e em uso
   (`src/lib/assistant/buildReason.ts:56`, `src/components/assistant/SalesAssistantProductRow.tsx:93`).
2. `SalesAssistantCard.tsx`, `SalesAssistantStates.tsx`, `index.ts` — **so adicoes**: o estado
   `SalesAssistantEmPreparacao` e seu export.
3. `buildReason.ts` — uma frase do rodape foi corrigida: a branch dizia "a cor da logo nao bateu com nenhum
   grupo de cor do catalogo", o que era um diagnostico falso (a cor pode ter batido e ainda assim nenhum dos
   8 exibidos pontuar por cor). A main afirma so o fato medido.
4. `logoColorToGroups.ts` — a main **acrescenta** `GRUPOS_SEM_COR_PROPRIA` (`:139`): "Colorido" e
   "Transparente" saem do casamento de cor, porque o hex deles e cinza ilustrativo e qualquer logo
   acinzentada casava com eles, fazendo o card afirmar "tem versao na cor da logo" para uma variante
   transparente ou multicolorida.
5. Os 3 testes que diferem acompanham exatamente esses 4 itens (casos novos para `PGRST202`, para dois grupos
   de cor casados, e expectativas ajustadas as duas correcoes).

Nenhum dos 19 arquivos da branch esta ausente da main, e nenhum comportamento proprio da branch foi
descartado sem substituto declarado.

## A resgatar

Nada. Todo o conteudo desta branch esta na main, por item, com a evidencia da tabela acima.

## Risco de fechar esta branch

Praticamente nulo para o negocio: nao se perde nenhuma funcionalidade, porque a main tem a mesma coisa em
versao mais nova e ja corrigida em dois pontos que, na versao da branch, faziam o card afirmar coisa errada
ao vendedor (cor da logo e diagnostico do rodape). Fechar a branch e, na pratica, apagar um rascunho do que
ja foi entregue.

Fica um alerta que **nao e motivo para manter a branch**, porque e um pendente da main, nao dela: a funcao de
banco `rpc_sales_assistant_candidates` **ainda nao esta aplicada em producao** — a consulta
`select proname from pg_proc where proname = 'rpc_sales_assistant_candidates'` no banco oficial
`doufsxqlfjyuvxuezpln` devolveu zero linhas (16/11/2026). O arquivo de migration ja esta na main; falta
rodar o workflow `db-apply-migration.yml`. Enquanto isso, o card mostra "Encaixe do Cliente em preparacao"
a todos os vendedores — ou seja, o recurso esta no ar mas ainda nao sugere nada. Manter a branch aberta nao
muda esse quadro em nada.

## Nao verificado

- **Se o card funciona de verdade na tela**: nao foi aberta a pagina `/clientes/:id` nem rodado teste nesta
  analise (a tarefa e somente leitura do git). A verificacao aqui e de presenca e de conteudo do codigo, nao
  de comportamento em execucao.
- **Lint/typecheck/testes**: nao rodados nesta analise. A main registra que a fase 1 entrou "validada e com
  os 2 portoes destravados" (`4344666f2d`, PR #3663), mas essa validacao e afirmacao da PR, nao medicao
  feita aqui.
- **Numero exato da PR que squashou esta branch**: a vinculacao foi feita pela mensagem e pela data dos
  commits da main (`4344666f2d`/#3663 e `6da08832ec`/#3678, ambos de 15/11/2026) e pelo conteudo identico
  dos arquivos; o GitHub nao foi consultado para confirmar que a PR #3663 aponta nominalmente para este
  nome de branch.
- Os diffs (A) do pacote vem cortados em ~300 linhas por arquivo, mas isso nao afetou a decisao: a conclusao
  se apoia nos diffs (B) completos (branch -> main) e em comparacoes diretas `git diff 00b1f75d origin/main`
  por caminho, que cobriram os 19 arquivos.
