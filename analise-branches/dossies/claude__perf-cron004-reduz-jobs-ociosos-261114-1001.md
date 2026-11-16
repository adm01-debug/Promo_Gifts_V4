# origin/claude/perf-cron004-reduz-jobs-ociosos-261114-1001

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** deixa o banco de dados mais barato e mais estavel, cortando 7 rotinas automaticas que rodavam de hora em hora sem ter nada para fazer (de 648 para 97 execucoes por dia).
- **Tip / merge-base / main:** tip `ffb0c103681066d12318d48787f8960b38918815` · merge-base `06c262e143ef546a3b31e3bd924b0e55c3296c3c` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`ffb0c10368`, 2026-11-14): `perf(db): CRON-004 reduz a frequência de 7 jobs ociosos ou redundantes (648 → 97 execuções/dia)`.

A medicao que motivou o trabalho esta no proprio cabecalho da migration
(`supabase/migrations/20261114120000_cron004_reduz_frequencia_jobs_ociosos.sql:4-12`): em 6 h de
`cron.job_run_details` (runid > 1399672) houve 881 execucoes e 244 "job startup timeout", e 7 rotinas
rodavam de 1x/h a 6x/h sem trabalho — filas de `product_images` zeradas, `external_connections` vazia,
`mv_supplier_reliability` com 3 linhas e o reload horario do PostgREST redundante com os event triggers
`pgrst_ddl_watch`/`pgrst_drop_watch`.

A branch entregou 3 arquivos (nenhum codigo de aplicacao, nenhuma edge function):

1. `supabase/migrations/20261114120000_cron004_reduz_frequencia_jobs_ociosos.sql` — reagenda os 7 jobs via
   `cron.alter_job`, resolvendo `jobid` por `jobname` (idempotente, linha 39-52).
2. `supabase/rollbacks/20261114120000_rollback.sql` — devolve o agendamento exato observado.
3. `supabase/MIGRATIONS_SYNC_LOG.md` — secao `## 2026-11-14 — CRON-004 ...` + linha de ledger com o sha256
   `e1371c31840255c9a9bc071cea76efc543ec02637dba7961f622c10a314c6a18`, status "pendente".

Decisao deliberada registrada no commit: `medallion-promote-tick` **ficou fora** (`6,36 * * * *`), porque em
30 dias de `pipeline_run_log` ha rajadas no teto do lote e 1x/h cortaria pela metade a vazao de promocao ao
catalogo.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| migration `20261114120000_cron004_reduz_frequencia_jobs_ociosos.sql` | `supabase/migrations/` da main, **byte a byte igual** a branch | `git diff ffb0c10368 e4ab7f85d9 -- supabase/migrations/20261114120000_cron004_reduz_frequencia_jobs_ociosos.sql` → saida vazia |
| rollback `20261114120000_rollback.sql` | `supabase/rollbacks/` da main, **byte a byte igual** a branch | mesmo `git diff` acima (saida vazia para os dois caminhos) |
| secao CRON-004 no `MIGRATIONS_SYNC_LOG.md` | main, linha 1627 (`## 2026-11-14 — CRON-004: reduz a frequência de 7 jobs ociosos ou redundantes (648 → 97 execuções/dia)`) | `git show e4ab7f85d9:supabase/MIGRATIONS_SYNC_LOG.md \| grep -n CRON-004` → `1627:` |
| linha de ledger com o sha256 da migration | main, linha 1643, mesmo sha `e1371c31840255...` e mesmo status "pendente" | `grep -n 20261114120000` no arquivo da main; bloco extraido das duas revisoes e comparado com `diff` → identico |
| commit inteiro da branch | entrou na main pelo squash da PR **#3665** (`b89a44e100`, "trem de banco", 2026-11-15 12:14 UTC), que carrega o corpo integral da mensagem da branch | `git log -1 b89a44e100` mostra `* perf(db): CRON-004 reduz a frequência de 7 jobs ociosos ou redundantes (648 → 97 execuções/dia)` com o `Claude-Session: .../session_01VXkRxXLTPrNUgWhbASkaJg` original |

O unico arquivo que "difere da main" (`supabase/MIGRATIONS_SYNC_LOG.md`) difere **so por defasagem**: a main
ganhou depois outras secoes no mesmo arquivo (CRON-005, correcoes de 2026-11-15, recibos E15). O bloco
escrito por esta branch esta na main sem uma letra de diferenca.

## A resgatar

Nada. Os 3 arquivos da branch estao na main com conteudo identico.

## Risco de fechar esta branch

Nenhum risco de perda de trabalho: tudo que a branch escreveu ja esta na main.

Fica um ponto em aberto que **nao e da branch** e nao se resolve mantendo-a viva: a migration esta
versionada na main mas **ainda nao foi aplicada em producao**. Enquanto nao for autorizada, as 7 rotinas
continuam rodando na frequencia antiga e a economia prometida (648 → 97 execucoes/dia) nao acontece.
Consulta somente-leitura no banco oficial `doufsxqlfjyuvxuezpln` nesta sessao:

- `supabase_migrations.schema_migrations` com `version='20261114120000'` → **0 linhas** (nao aplicada);
- `cron.job` ainda com o agendamento antigo: `generate-blurhashes = */10 * * * *`,
  `hash-product-images = 11,26,41,56 * * * *`, `backfill-image-dimensions = 7,22,37,52 * * * *`,
  `connections-auto-test = 9,24,39,54 * * * *`, `connections-health-check = 4,19,34,49 * * * *`,
  `refresh-mv-supplier-reliability = 8,23,38,53 * * * *`, `pgrst-schema-reload = 7 * * * *`.

Isso confere com o que a propria main declara na linha 1643 do `MIGRATIONS_SYNC_LOG.md`: "pendente —
aguarda `[AUTORIZAÇÃO BD]` do dono e `db-apply-migration.yml`". Ou seja: o que falta e **uma autorizacao do
dono para rodar o workflow de aplicacao**, nao codigo. Apagar a branch nao atrasa nem impede isso.

## Nao verificado

- Se a economia medida (648 → 97 execucoes/dia) se confirma em producao: impossivel verificar porque a
  migration nao foi aplicada. O numero vem da medicao de 2026-11-14 citada no cabecalho da migration e do
  teste do autor em banco local (`promo-replay:main`, PG 17.4), nao de producao pos-apply.
- Se os `244 "job startup timeout"` desaparecem depois do apply: mesma razao.
- Nao reexecutei lint, typecheck nem os gates do repo — a branch nao tem arquivo de codigo de aplicacao e
  seu conteudo e identico ao que a main ja carrega aprovado pela CI da PR #3665.
