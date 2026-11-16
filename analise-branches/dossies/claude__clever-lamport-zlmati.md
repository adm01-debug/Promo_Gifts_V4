# origin/claude/clever-lamport-zlmati

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda, por escrito e dentro do projeto, o que um agente aprendeu num dia inteiro de trabalho — inclusive como recuperar trabalho que o dono apagou por engano e os numeros que servem de alarme se o sistema piorar.
- **Tip / merge-base / main:** tip `99c7f15eb05a44351f0d46ae4371124e3be5877e` · merge-base `584e1a3a75b63d1b366fe7b039492f2ebdae7dd9` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c` (a main andou 106 commits desde o merge-base — `git rev-list --count 584e1a3a..origin/main` = 106)

## O que a branch quis fazer

Dois commits, os dois de documentacao, nenhuma linha de codigo:

- `098cafb025 docs(passagem): registra o estado da sessao para o proximo agente` — cria
  `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md`. Motivo no corpo do commit: *"O conteudo so existia no conteiner
  da sessao, que e efemero."*
- `99c7f15eb0 docs(passagem): acrescenta resumo de 60s, baselines, limites do ambiente e mapa de
  arquivos` — e corrige uma afirmacao do proprio autor: *"o push das 13 branches recuperadas foi
  redundante para 11 delas, porque uma PR preserva o commit em refs/pull/N/head mesmo depois de a
  branch ser apagada."*

A branch mexeu em **exatamente 1 arquivo**, novo, 483 linhas
(`git diff --stat 584e1a3a 99c7f15e` → `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md | 483 +++`). Nao toca codigo,
banco, migration, edge function, workflow nem segredo.

O documento tem 10 secoes: estado da sessao e as 4 PRs abertas (§1), as 13 branches `recuperado/*`
restauradas (§2), o assistente de vendas "Encaixe do Cliente" (§3), 4 portoes de CI que passam sem
cumprir a funcao (§4), as 7 decisoes do dono (§5), armadilhas operacionais do repo (§6), 10 erros de
metodo do proprio agente (§7), o que mexeu no banco (§8), a medicao de regressao e os baselines
(§9/§9.1), os limites do ambiente (§9.2), o mapa de arquivos (§9.3) e por onde comecar (§10).

## Item por item: esta na main?

| Item | Onde esta na main (ou NAO ESTA) | Evidencia |
|---|---|---|
| O arquivo `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md` em si | **NAO ESTA** | `git cat-file -e origin/main:PASSAGEM-PARA-O-PROXIMO-CLAUDE.md` → `fatal: path ... does not exist in 'origin/main'`. O diff (B) do pacote mostra o arquivo como `deleted file mode` indo da branch para a main |
| §2 — as 13 branches `recuperado/*` e seus SHAs | **SIM**, e com mais detalhe | `analise-branches/auditoria-261115/363-apagadas-sha-para-restaurar.psv` e `linha-a-linha-363-apagadas.psv` na main contem os SHAs `94159f01`, `3495252a`, `03c17737`; `analise-branches/auditoria-261115/VEREDITOS_165_BRANCHES.md` e `veredito_lote01/03/04/05.md` citam `recuperado/`. As 13 branches continuam vivas no GitHub (`git for-each-ref refs/remotes/origin/recuperado/**` → 13 refs, incluindo `recuperado/chore/graphify-sql-map-20261029`) |
| §2 — o metodo de prova byte-a-byte (`git merge-tree --write-tree`) | **SIM** | `docs/faxina-261114/README.md` e `docs/faxina-261114/01-auditoria-branches-excluidas.md` documentam o mesmo teste |
| §2 — "uma PR preserva o commit em `refs/pull/N/head` para sempre" (a correcao que motivou o 2o commit) | **NAO ESTA** | `git grep -niE "refs/pull/[^ ]*head" origin/main -- '*.md'` → nenhuma linha. Pior: `docs/faxina-261114/README.md` ensina a recuperacao **so** via SHA guardado ("pegue o SHA em `03-branches-excluidas-com-sha.tsv` e recrie a branch"), sem a rota de fallback quando o SHA nao foi guardado |
| §3 — o assistente de vendas (19 arquivos, nunca validado) | **SIM, entrou inteiro** | na main: `src/lib/assistant/ramoAliases.ts`, `logoColorToGroups.ts`, `buildReason.ts`, `src/hooks/assistant/useClientBrandSignals.ts`, `useSalesAssistantCandidates.ts`, `src/components/assistant/SalesAssistantCard.tsx`, `SalesAssistantProductRow.tsx`, `SalesAssistantStates.tsx`, `index.ts`, mais os testes `src/lib/assistant/__tests__/*` e `src/hooks/assistant/__tests__/*`, mais `supabase/migrations/20261115034500_rpc_sales_assistant_candidates.sql` e `supabase/rollbacks/20261115034500_rollback.sql` (`git ls-tree -r --name-only origin/main \| grep assistant`) |
| §4 item 1 — rollback que destravou o revoke do estoque | **SIM** | `supabase/rollbacks/20260917061500_rollback.sql` existe na main |
| §4 item 4 — portao de recibos que aceitava version citada de passagem | **SIM, corrigido** | `scripts/check-migration-receipts.mjs:107-110` na main: `const primeiraCelula = (l.split('\|')[1] ?? '').trim()...; return primeiraCelula === String(version);` com fallback legado |
| §4 item 2 / §5 item 3 — job "Recibo" como causa raiz do CI travado | **SIM** | `PENDENCIAS.md` na main, secao 53.5: "essa PR fica aberta para sempre... toda PR do repositorio trava 24 horas depois" |
| §5 — as 7 decisoes do dono | **SIM** | `PENDENCIAS.md:1010` na main: `## 53. Sessao de 2026-11-15 — o que depende do dono`, com 53.1 a 53.7 |
| §6 — armadilha do botao "Update branch" vs. ledger do Gate 1.18/E188 | **SIM (parcial)** | `docs/coordenacao/conflitos-semanticos.md` na main menciona "Update branch"; o ledger e o arquivo citado |
| §9.1 — baselines de regressao (28.165 passando · 1 falhando · 1.133 pulados · 1.503 arquivos) | **NAO ESTA** | `git grep -lF "28.165" origin/main -- '*.md'` → vazio. O unico baseline versionado, `analise-prs/baseline/vitest-baseline-9a97f9a2.md`, e de **2026-10-30** e nao tem numeros: registra `npx vitest run` terminando em "SIGTERM (exit 143) — processo encerrado por timeout do container antes de produzir qualquer saida de teste" |
| §9.2 — limites do ambiente (gh/GraphQL bloqueado, rota REST de auto-merge, eslint paralelo = SIGKILL/8 GB, worktree sem `node_modules`) | **NAO ESTA** | `git grep -lniE "ccr/auto_merge" origin/main -- '*.md'` → vazio; `git grep -lF "SIGKILL" origin/main -- '*.md'` → vazio. `acorn` aparece so em `auditoria-supabase/A5_VALIDATION_REPORT.md`, sem o contorno (`ln -sfn .../node_modules node_modules`) |
| §7 — os 10 erros de metodo do agente (aceitar `true` de portao sem inspecionar, teste que replica a logica em vez de importar a real, duplicar PR de bot, corromper o ledger) | **NAO ESTA** | `git grep -lF "core.hooksPath=/dev/null" origin/main` e `git grep -lF "decideLimpeza" origin/main` retornam so arquivos de `scripts/` sem relacao com a licao; nenhum `.md` da main registra essa lista |
| §9.3 — mapa de arquivos e a nota "o hook `useLogoColorAnalysisByArea.ts` da main foi escrito por outro agente e e melhor que a minha versao" | **NAO ESTA** como registro de coordenacao | o hook existe na main, mas a advertencia de coordenacao (leia a main antes de assumir que seu trabalho e o mais novo) nao esta versionada |

## A resgatar

Vale trazer o arquivo para a main, enxuto nos trechos ja cobertos. Em ordem de importancia:

1. **A rota de recuperacao `refs/pull/<N>/head`** — `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md` §2.
   Por que importa: hoje a main ensina a recuperar branch apagada **so** se alguem tiver guardado o
   SHA (`docs/faxina-261114/README.md`). Se o SHA nao foi guardado — e foi o caso das branches
   `importado/*`, cujos objetos o proprio documento diz nao existirem mais — a unica rota que resta e
   a PR. Sem isso versionado, o proximo agente repete o panico e pode concluir que trabalho do dono
   se perdeu quando ele esta salvo.
2. **Os baselines de regressao de 15/11** — §9.1. Por que importa: e o alarme. Sao os numeros que
   dizem "se cair, alguem quebrou algo". O baseline que esta na main e de 30/10 e nao tem numero
   nenhum (o teste nem rodou). Sem numero gravado, nao ha como provar ao dono que uma mudanca nao
   piorou o sistema — que foi exatamente a pergunta dele.
3. **Os limites do ambiente** — §9.2. Por que importa: cada linha dessa tabela e uma tentativa que
   ja falhou (criar PR por GraphQL, rodar tres lint ao mesmo tempo e o conteiner morrer). Nao esta
   em lugar nenhum da main; sem isso, cada agente novo gasta tempo e sessao redescobrindo.
4. **A lista dos 10 erros de metodo e a nota de coordenacao** — §7 e §9.3. Por que importa: o erro
   mais caro ("aceitei um `true` de portao sem inspecionar por que era `true`") e justamente o tipo
   de falha que faz um portao de CI dar verde sem proteger nada. Registrar isso e barato e evita
   repeticao por outro agente.

Os trechos §2 (tabela das 13), §3, §4 itens 1/2/4, §5 e §6 ja estao cobertos na main pelos arquivos
citados na tabela acima e **nao precisam ser duplicados**.

## Risco de fechar esta branch

Baixo em operacao, real em conhecimento: nada no sistema para de funcionar, nenhum cliente e afetado,
nenhuma tela muda — a branch nao tem uma linha de codigo. O que se perde e memoria. Especificamente,
perde-se a instrucao de como recuperar trabalho apagado quando o SHA nao foi anotado, e perdem-se os
numeros que servem de alarme de regressao. O documento foi escrito justamente porque o lugar onde ele
morava era temporario e ia desaparecer; fechar a branch sem trazer os 4 itens acima repete o problema
que ele tentou resolver. Risco adicional zero no sentido oposto: por ser um unico `.md`, trazer o
arquivo nao roda os portoes de codigo (regra docs-only/E14 do `AGENTS.md`) e nao pode quebrar o
sistema.

## Nao verificado

- **Se o dono quer esse documento versionado na raiz do repo.** O arquivo foi escrito a pedido dele
  ("exporte tudo que fizemos... para o outro claude"), mas quem decide onde ele mora — raiz,
  `docs/agentes/` ou `analise-branches/` — e o dono. Decisao de organizacao, nao tecnica.
- **Se os numeros de §9.1 ainda valem hoje.** Foram medidos em 15/11 na main de entao
  (`20dfb7b30b`); a main de hoje e `e4ab7f85d9` e esta 106 commits adiante do merge-base. Nao rodei a
  suite para reconferir (seria escrita/execucao fora do escopo somente-leitura desta tarefa). Ao
  resgatar, o numero deve entrar rotulado com o SHA em que foi medido.
- **Os itens 1 e 2 da §5** (ingestao de `allows_personalization` quebrada e chave de IA com 401):
  confirmei que a secao 53 existe na main, mas nao li as 7 subsecoes inteiras para checar se esses
  dois constam com o mesmo diagnostico.
