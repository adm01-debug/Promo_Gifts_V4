# origin/fix/gate-e40-cron-seed-261028

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** conserta o alarme automatico que avisa quando o banco de producao sai do desenho previsto; a main ja conserta isso de outra forma e o alarme esta funcionando, sobrando apenas um detalhe adormecido a registrar.
- **Tip / merge-base / main:** tip `5e04ff04a6998ed4c85807941212d42d5b7446e6` / merge-base `5d12084e3ee18a5c94e41b5cf29bfb43206de710` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`5e04ff04a6`, 2026-10-28). O alarme de desvio de banco (Gate E40, workflow
`.github/workflows/db-schema-drift-check.yml`) reconstroi o banco num ambiente descartavel a partir de
uma foto de 2026-10-15 e reaplica todas as migrations posteriores. Cinco migrations do dia 2026-10-27
mexem em tarefas agendadas (`cron.job`) e, na epoca, abortavam com erro quando a tarefa nao existia
nesse ambiente descartavel — a foto de schema nao carrega essas linhas. Resultado: o alarme quebrava
e deixava de vigiar producao.

A branch resolveu pelo lado do alarme: criou as 8 tarefas que faltavam dentro da semente
`REPLAY_CRON_SEED_SQL` de `scripts/drift-baseline.mjs`, por nome (`connections-auto-test`,
`anon-insert-rate-purge`, `backfill-queue-reap-stuck`, `connections-health-check`,
`reconcile-category-products-count`, `sm-stock-guard`, `generate-blurhashes` inativa,
`xbz-image-uploader` ativa).

Evidencia da raiz, no ponto de partida da branch:
`git show 5d12084e:supabase/migrations/20261027120000_fix_connections_auto_test_cron_secret.sql`
→ `RAISE EXCEPTION 'Pré-condição falhou: cron.job connections-auto-test não encontrado';`

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| `connections-auto-test` (exigido por 20261027120000) | Resolvido por outro caminho: a propria migration virou "replay-safe" e se ignora quando a tarefa nao existe | `supabase/migrations/20261027120000_fix_connections_auto_test_cron_secret.sql:9-20` na main: `-- REPLAY-SAFE` e `RAISE NOTICE '...skip (ambiente de replay ou job ainda não criado)'; RETURN;`. Entrou por `8c81483859` (2026-10-28) `fix(migrations): torna 20261027120000 e 20261027140000 replay-safe — Gate E40` |
| `anon-insert-rate-purge`, `backfill-queue-reap-stuck`, `connections-health-check`, `reconcile-category-products-count`, `sm-stock-guard` (exigidos por 20261027140000) | Resolvido por outro caminho: mesma migration tambem virou "replay-safe" | `supabase/migrations/20261027140000_stagger_cron_burst_schedules.sql:21-36` na main: `IF to_regclass('cron.job') IS NULL OR NOT EXISTS (... jobname IN (...)) THEN RAISE NOTICE '... skip ...'; RETURN;`. Mesmo commit `8c81483859` |
| `generate-blurhashes` inativa (exigida por 20261027180000) | ESTA na main, na mesma semente, com a mesma intencao (criar e deixar inativa) | `git grep -c generate-blurhashes origin/main -- scripts/drift-baseline.mjs` → 2; na main a semente faz `v_id := cron.schedule('generate-blurhashes', '1,3,5,...', 'SELECT 1'); PERFORM cron.alter_job(job_id := v_id, active := false);` |
| `xbz-image-uploader` ativa (exigida por 20261027220000 / 20261027234500) | NAO ESTA na main — e hoje nao e necessaria, porque essas duas migrations nunca foram aplicadas em producao e por isso nao entram no teste | `git grep -c xbz-image-uploader origin/main -- scripts/drift-baseline.mjs` → 0. Ledger de producao (`doufsxqlfjyuvxuezpln`, MCP `list_migrations`): `20261027220000` NAO APLICADA, `20261027234500` NAO APLICADA. O filtro `selectReplayMigrations` em `scripts/drift-baseline.mjs:329-337` so reaplica versao que esta no ledger (`applied.has(m[1])`) |
| Objetivo final da branch (alarme de desvio voltar a funcionar) | ALCANCADO na main | workflow `db-schema-drift-check.yml` na main: execucoes `43402325601` (2026-11-13), `43581142603` (2026-11-14) e `43699827072` (2026-11-15) todas com conclusao `success` |

## A resgatar

1. **`scripts/drift-baseline.mjs` — semente da tarefa `xbz-image-uploader` ausente.** Hoje nao falta
   nada: as migrations `20261027220000` e `20261027234500` nao estao aplicadas em producao, logo nao
   entram no teste. Mas elas estao no repositorio e, no dia em que alguem as aplicar pelo workflow
   oficial, o alarme de desvio vai quebrar — ambas abortam com
   `RAISE EXCEPTION 'Pré-condição falhou: xbz-image-uploader não encontrado ou já está inativo'`
   (`supabase/migrations/20261027220000_deactivate_xbz_image_uploader_cron.sql:16-26`) e nenhuma delas
   tem a protecao "replay-safe" que as outras ganharam. Esta branch e o unico lugar do repositorio que
   registra esse buraco. Nao e para aplicar agora: e para nao perder a informacao.

Observacao importante para quem for mexer: **nao aproveite o arquivo da branch inteiro.** O mesmo
commit tambem alterou 5 trechos que nada tem a ver com o pedido e que quebram o leitor de SQL do
script — por exemplo `git show 5e04ff04a6:scripts/drift-baseline.mjs` linha 670
`const DOLLAR_TAG = /\$(?:[A-Za-z_][A-Za-z_0-9]*)?\.\$/y;` contra a main
(`scripts/drift-baseline.mjs:763`) `const DOLLAR_TAG = /\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/y;`. A versao
da branch exige um ponto literal que nunca aparece no SQL real, entao deixa de reconhecer blocos
`$$`/`$seed$`. Se um dia esse item for resgatado, copie so as linhas da semente, nunca o arquivo.

## Risco de fechar esta branch

Baixo e condicional. Fechar nao apaga nada em uso: o alarme de desvio esta verde na main
(execucoes de 13, 14 e 15 de novembro) e 7 dos 8 itens da branch estao resolvidos — 6 porque a main
consertou o problema na origem (as migrations passaram a se ignorar sozinhas no ambiente de teste) e 1
porque continua na semente da main. O unico risco e perder o registro do buraco do
`xbz-image-uploader`: se alguem aplicar aquelas duas migrations em producao sem antes proteger o
teste, o alarme de desvio para de rodar e o banco fica sem vigilancia ate alguem notar. Esse risco
fica coberto pelo item 1 acima.

Nao ha risco de regressao ao fechar, e ha risco em NAO fechar: a versao do arquivo nessa branch
contem as 5 alteracoes quebradas descritas acima, e um merge ou cherry-pick do arquivo inteiro
derrubaria o alarme de desvio na main.

## Nao verificado

- O pacote de evidencia esta marcado como cortado no fim: o trecho final do diff
  branch→main em `scripts/drift-baseline.mjs` (a partir de `sanitizeBaselineForReplay`, sobre views
  materializadas) nao foi lido por inteiro. Nao muda o veredito: e area da main que a branch nao
  tocou — o diff (A), que e o que a branch efetivamente mudou, foi lido na integra.
- Nao foi executado o Gate E40 localmente com o conteudo desta branch (o teste exige credenciais de
  producao e banco descartavel). A conclusao sobre o estado atual vem do comportamento registrado nas
  execucoes do workflow na main, nao de execucao propria.
