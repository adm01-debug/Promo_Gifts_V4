# origin/claude/perf-idx-sds-restock-counts-261114-1006

- **Veredito:** INCORPORADA_TOTAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** deixa o sininho de alertas de estoque (topo da tela) responder mais rápido e consumir menos servidor, criando um atalho de busca no banco só para os produtos que voltaram a ter estoque.
- **Tip / merge-base / main:** tip `7e4784c401396b4308d502df69c637bbbb860fa0` · merge-base `74e26506410beb97490d760ab1c1f618c30368f7` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit único `7e4784c401` — "perf(db): índice parcial para a contagem de restocks de
`fn_get_stock_notification_counts`". A função que alimenta o sino de estoque (`StockAlertsIndicator.tsx`) estava
lenta no bloco `restocks`: usava o índice `idx_sds_cenario_a` e jogava fora ~7,8 mil linhas pelo filtro
`COALESCE(stock_open,0)=0 AND COALESCE(stock_close,0)>0` numa tabela de 2,96 M linhas / 610 MB. A branch entregou
quatro coisas, todas de banco:

1. migration `supabase/migrations/20261114160000_perf_idx_sds_restock_counts.sql` criando o índice parcial
   `idx_sds_restock_zero_to_pos_date ON stock_daily_summary (summary_date) INCLUDE (product_id)` com o mesmo
   predicado da função, em `CREATE INDEX CONCURRENTLY` (`transaction: none`);
2. rollback `supabase/rollbacks/20261114160000_rollback.sql`;
3. registro do arquivo em `REPLAY_PIPELINE_REWRITES` de `scripts/drift-baseline.mjs` (1 índice `CONCURRENTLY`),
   para o replay do drift não quebrar;
4. recibo sha256 + justificativa em `supabase/MIGRATIONS_SYNC_LOG.md`, com a migration marcada como
   **pendente de `[AUTORIZAÇÃO BD]`** e aplicação só via `db-apply-migration.yml`.

Ela não tocou front-end, edge function, policy nem grant.

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| migration `20261114160000_perf_idx_sds_restock_counts.sql` | na main, **byte-idêntica** à da branch | `git ls-tree -r --name-only origin/main -- supabase/migrations` lista o arquivo; `git diff --stat 7e4784c4 origin/main -- supabase/migrations/20261114160000_perf_idx_sds_restock_counts.sql` → saída vazia (zero diferença) |
| rollback `20261114160000_rollback.sql` | na main, **byte-idêntico** | `git diff --stat 7e4784c4 origin/main -- supabase/rollbacks/20261114160000_rollback.sql` → saída vazia |
| entrada em `REPLAY_PIPELINE_REWRITES` | na main, linha exata | `git show origin/main:scripts/drift-baseline.mjs \| grep -n 20261114160000` → `354:  ['20261114160000_perf_idx_sds_restock_counts.sql', { concurrentlyIndexes: 1 }],` |
| seção e recibo sha256 no `MIGRATIONS_SYNC_LOG.md` | na main, com o **mesmo sha256** e o mesmo status "pendente" | `git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md` linhas 1664–1679: título `## 2026-11-14 — Estoque: índice parcial…` e linha de tabela `\| 20261114160000 \| perf_idx_sds_restock_counts \| d538e03130d8151ccde29c56a72c1004a74b76e3789aed0095b64d8c19bcc03a \| pendente…` |
| caminho de entrada na main | squash-merge da PR **#3665** | `git log --oneline -1 --diff-filter=A origin/main -- supabase/migrations/20261114160000_perf_idx_sds_restock_counts.sql` → `b89a44e100 fix(db): trem de banco … (#3665)` |

Os 2 arquivos que "diferem da main" diferem porque **a main andou para frente por cima do trabalho da branch**, não
porque ele ficou de fora:

- `scripts/drift-baseline.mjs`: a main tem a linha da branch **mais** duas outras migrations
  (`20261114014100`, `20261115130000`) e um tratamento novo de BOM UTF-8 em `sanitizeReplayMigration` (diff (B) do
  pacote de evidência). Nada da branch foi removido.
- `supabase/MIGRATIONS_SYNC_LOG.md`: a main tem a seção da branch **mais** um bloco
  "**CORREÇÃO 2026-11-15**" dentro dela, dizendo que os números citados pela branch (14.871 chamadas, média 522 ms)
  vinham de uma janela de `pg_stat_statements` resetada em 2026-11-14 16:26 UTC, e substituindo-os por medição
  própria de 2026-11-15 (4.732 chamadas, média 170,0 ms, máx. 12.163,8 ms, 805 s de CPU) — ou seja, a main já
  **corrigiu** a justificativa da branch, que estava cerca de 5× exagerada.

## A resgatar

Nada. Não há item da branch ausente da main.

## Risco de fechar esta branch

Nenhum risco de perda de trabalho: os quatro arquivos da branch estão na main (dois idênticos, dois contendo as
linhas dela). Fechar/apagar a branch não altera banco, tela nem deploy.

Fica um pendente que é **da main, não da branch**: o índice ainda **não existe em produção**. Consulta read-only em
`doufsxqlfjyuvxuezpln` (`pg_indexes` de `stock_daily_summary`) retornou apenas `idx_sds_cenario_a` —
`idx_sds_restock_zero_to_pos_date` não aparece. Em linguagem de negócio: a melhoria do sino de estoque está escrita
e aprovada no código, mas o ganho de velocidade só acontece quando o dono autorizar a aplicação em produção pelo
workflow `db-apply-migration.yml`. Esse item continua rastreado no `MIGRATIONS_SYNC_LOG.md` da main como
"pendente — aguarda `[AUTORIZAÇÃO BD]`", então ele não se perde ao fechar a branch.

## Não verificado

- Ganho real de desempenho do índice: não medido. Não se pode medir porque o índice não existe em produção; a
  estimativa (EXPLAIN com 9.301 buffers e 7.802 linhas descartadas) é a da mensagem do commit da branch, e a
  própria main registra que os números de chamadas/latência daquele commit eram de uma janela resetada.
- Estado da PR #3665 no GitHub (título, corpo, CI) não foi consultado; a atribuição do merge vem do log do git
  (`b89a44e100`), não da API.
