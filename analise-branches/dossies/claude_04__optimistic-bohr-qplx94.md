# origin/claude_04/optimistic-bohr-qplx94

- **Veredito:** RESGATAR_PARCIAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** é o único registro escrito da auditoria de 103 pedidos de mudança (PRs #2582–#3023) — o que foi aprovado, o que foi barrado e por quê; a main de hoje não tem nenhum desses registros e, nos poucos casos que tem, o registro está errado.
- **Tip / merge-base / main:** tip `c8e0e1b4d4ba95fb30d249f99cca4019ce052766` · merge-base `4c5fdd72fc301cdcd65851af30204881bab710c4` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Era a branch de entrega de uma sessão de auditoria de PRs (`session_011d8gKLZg8BWivR8aQBwxGF`, revisões rev77 → rev93, 27/10 a 02/11/2026). Pelas mensagens dos commits, o agente queria três coisas:

1. **Registrar um dossiê por PR** para todas as PRs abertas que encontrou, com o "método das 4 perguntas" (ainda é válida? causa regressão? já está na main? a regra de negócio está certa?), teste de merge contra a main e citações arquivo:linha. Chegou a 105 PRs catalogadas (`analise-prs/progresso.json`: `"prs_analisados_total": 105`).
2. **Registrar a linha de base da qualidade** (typecheck, lint, vitest por nome de teste, estado dos portões de CI, reconciliação de contagem de PRs) em `analise-prs/baseline/`, para distinguir falha pré-existente de falha causada por um merge.
3. **Separar o que ela mesma podia mergear do que exigia o dono** — e deixar por escrito o motivo de cada bloqueio (REGRA#8 workflows/migrations, REGRA#10 branch de outro agente, DRAFT, conflito).

Não tocou em nada do produto: 142 dos 143 arquivos estão em `analise-prs/`, e nenhum arquivo em `supabase/`, `.github/` ou `scripts/` (`git diff --name-only 4c5fdd7 origin/claude_04/optimistic-bohr-qplx94 | grep -E '^(supabase|\.github|scripts)/'` → nenhum).

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| 87 dossiês de PR (#2582–#2660 e #2940–#3023) | **NÃO ESTÁ** — a main tem 236 dossiês, mas nenhum desses números | `comm -13` entre `git ls-tree -r origin/main analise-prs/` e o mesmo na branch → 103 arquivos só na branch, 87 deles em `analise-prs/dossies/`. A main tem dossiês de #2572–#2832 e #3127–#3292, saltando exatamente a faixa da branch |
| conteúdo desses 87 dossiês absorvido em algum relatório da main | **NÃO ESTÁ** — zero menção | `git show origin/main:analise-prs/{RELATORIO_DOSSIES,RELATORIO_DEFINITIVO,RELATORIO_PRS}.md` e `{inventario_prs,prs}.json`, `prs.csv`, `auditorias-anteriores.md` → 0 ocorrências de qualquer um dos 59 números de PR da branch |
| 14 arquivos de linha de base (ci-checks-48899b6.json, gate-final-baseline.md, gate-final-post-merge.md, pr-count-reconciliation.md, typecheck-errors.txt, vitest-failing.txt, vitest.txt, test-failures.txt, eslint-count.txt, ci-state.md, recent-commits.txt, failing-tests-by-name.txt, baseline-48899b6.txt, baseline-c86a381.txt) | **NÃO ESTÁ** | mesmo `comm -13`: 14 arquivos só na branch em `analise-prs/baseline/` |
| `analise-prs/clusters.md` (6.9 KB) e `analise-prs/sessao-f0ceb220-ADDENDUM.md` (1.9 KB) | **NÃO ESTÁ** | mesmo `comm -13`; `git cat-file -s` confirma tamanho |
| correção de desfecho em 24 dossiês que existem nas duas pontas | **NÃO ESTÁ** — a main guarda a versão velha e errada | `git show origin/main:analise-prs/dossies/PR-2646.md` diz "**REGRA #8**: … aguardam PO"; a versão da branch diz "MERGEADA pelo PO em 2026-10-28, merge SHA 79c0c670". O GraphQL confirma a branch: PR #2646 `state MERGED, mergedAt 2026-10-28T05:34:22Z`. A main está desatualizada, não a branch |
| correção da linha de base do vitest (rev92: só `date-utils.test.ts` falha; `useRuptureAlerts` e `check-migrations-sync-log-gate` passam) | **NÃO ESTÁ** — `analise-prs/baseline/state.md` da main difere e os arquivos de apoio não existem lá | arquivos acima + `git diff` em `analise-prs/baseline/state.md` entre branch e main |
| a intenção de código que a branch apontou em #3023 (limpar da URL os filtros que estão no valor padrão) | **ESTÁ** — entrou e foi mantida | `git show origin/main:src/hooks/common/useListUrlState.ts` linhas 139–152: comentário "Sync-on-mount: remove da URL qualquer param com valor igual ao default" + `useEffect` correspondente. PR #3023 consta `MERGED` |
| a intenção que a branch apontou em #3015 (espelhar as duas migrations de cron aplicadas fora do fluxo) | **ESTÁ** | `supabase/migrations/20261101223908_cron001_stagger_additional_jobs.sql` e `supabase/migrations/20261101232022_cron001_stagger_schedules_reapply.sql` presentes em `git ls-tree origin/main`. A PR #3015 foi fechada sem merge, mas o conteúdo entrou por outro caminho |
| a intenção que a branch apontou em #3016 (não pular o job de exportação quando o portão de drift cancela) | **ESTÁ** | `git grep -n '!cancelled()' origin/main -- .github/workflows/schema-snapshot-export.yml` → linhas 79 e 257 |
| a intenção que a branch apontou em #2941 (allowlist do sentinel: tirar entrada vencida, pôr `perf002_drop_unused_snapshot_indexes`) | **ESTÁ** | `.security/lint-0029-allowlist.json:411` contém `"fn": "public.perf002_drop_unused_snapshot_indexes()"`; a remoção do `mcp_kv_get` vencido entrou pela PR #3010 (mergeada, citada no commit `1b1e49ffc1`) |
| a intenção que a branch apontou em #3003 (tirar do público o acesso à tabela de sinônimos de cor) | **NÃO ESTÁ** — a main continua liberando | `git grep -n color_synonym_map origin/main -- supabase/migrations/` → `20260717143414_grant_anon_catalog_readpath_v2.sql:25: GRANT SELECT ON public.color_synonym_map TO anon;` e nenhum `REVOKE` posterior. A PR #3003 está `CLOSED, merged false` |
| `progresso.json`, `prs.json`, `prs.csv`, `RELATORIO_PRS.md`, `regras-de-negocio.md` | **SUPERADOS** — a main tem uma geração mais nova, de outra sessão | `git show origin/main:analise-prs/progresso.json` → `"snapshot_at": "2026-11-09T17:00:00Z", "versao": 7`; a branch tem `"revision": "rev93", "date": "2026-11-02"`. A main ainda acrescentou a pasta `analise-prs/2026-11-12/` |
| `src/components/.../NegotiationMarkupCard.visualA11y.test.tsx.snap` | **LIXO — não resgatar** | o merge-base já tinha as 2 chaves certas (`snapshot em desktop`, `snapshot em mobile`); a branch **acrescentou** 2 chaves duplicadas com o nome entre aspas (`snapshot em 'desktop'`, `snapshot em 'mobile'`), restos de um título de teste que não existe mais. `git show …:<arquivo> \| grep '^exports\['` → base 2 chaves, main as mesmas 2, branch 4. O vitest marcaria as 2 extras como obsoletas |

## A resgatar

1. **`analise-prs/dossies/` — 87 dossiês (PR-2582…PR-2660, PR-2940…PR-3023).** Único registro de por que cada um desses 103 pedidos de mudança foi aprovado ou barrado. Sem eles, se alguém reabrir qualquer um desses assuntos, a análise é refeita do zero.
2. **`analise-prs/dossies/` — correção de desfecho em 24 dossiês que a main também tem (PR-2420, 2572, 2579, 2580, 2587, 2588, 2594, 2600, 2605, 2622, 2625, 2627, 2631, 2645, 2646, 2648, 2649, 2650, 2652, 2653, 2654, 2655, 2656, 2658).** A main afirma "aguardando aprovação do dono" sobre pedidos que já foram aprovados e aplicados há três semanas (caso provado: PR-2646). Quem ler a main hoje acha que tem fila parada que não existe.
3. **`analise-prs/baseline/` — 14 arquivos de linha de base.** É a prova de quais testes já falhavam antes. Sem ela, qualquer falha de teste futura vira discussão de "foi você que quebrou".
4. **`analise-prs/clusters.md` e `analise-prs/sessao-f0ceb220-ADDENDUM.md`.** Agrupam os pedidos por assunto e registram as correções de rumo da sessão.
5. **Decisão de negócio ainda em aberto, achada dentro do dossiê PR-3003:** a tabela de sinônimos de cor segue aberta a visitante não logado na produção. O pedido que ia fechar esse acesso foi descartado sem merge. Fechar protege dado de catálogo; pode também derrubar a busca por cor do site público e um teste automático que exige esse acesso. Só o dono decide.

## Risco de fechar esta branch

Apagar esta branch destrói o único registro de por que 103 pedidos de mudança foram aprovados ou recusados entre 25/10 e 02/11/2026, e com ele a prova de quais testes já falhavam antes. O efeito prático não é perder código — o código útil que ela apontava já entrou (confirmado item a item acima) — é perder a memória da decisão: a main fica com um registro de auditoria que salta essa faixa inteira e, nos 24 casos que ela cobre, afirma que o dono ainda precisa aprovar coisas que já estão em produção. Também se perde o aviso de que a tabela de sinônimos de cor continua aberta ao público sem ninguém ter decidido isso.

## Não verificado

- Não li o conteúdo integral dos 38 arquivos que existem nas duas pontas e diferem; para 24 deles (dossiês) comparei tamanho, cabeçalho e veredito, e provei a divergência de desfecho num caso (PR-2646). Os outros 14 (relatórios e dados de acompanhamento) tratei como superados pela evidência de geração mais nova na main, sem ler linha a linha.
- Dos 87 dossiês só-da-branch, li o veredito de todos (87/87) e o texto completo de um (PR-3023). O mérito técnico individual de cada um dos outros 86 não foi reconferido contra o código.
- O pacote de evidência veio TRUNCADO (só os 40 primeiros arquivos com diff). Supri isso comparando as árvores git das duas pontas, o que resolve presença/ausência de todos os 142, mas não o conteúdo dos 102 restantes.
- Não testei em produção se tirar o acesso público à tabela de sinônimos de cor quebra a busca por cor; a existência de `fn_verify_anon_catalog_grants` exigindo esse acesso é indício, não prova.
