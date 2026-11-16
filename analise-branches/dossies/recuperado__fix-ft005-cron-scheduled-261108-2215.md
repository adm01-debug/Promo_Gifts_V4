# origin/recuperado/fix-ft005-cron-scheduled-261108-2215

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada de novo — ela so queria deixar registrado no historico do sistema os dois disparos automaticos que mandam os relatorios agendados por e-mail, e esse registro ja esta no sistema por outro caminho.
- **Tip / merge-base / main:** tip `d05254b1ea1ac2ca2a833b7ebc4e229cfd18bb37` · merge-base `34ac6453d1f7a9ced950f2fb579db711219b4495` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`d05254b1ea`, 2026-11-08, "feat: versiona cron jobs de relatorios agendados em migration (FT-005)"). A mensagem diz exatamente a intencao: os dois agendamentos `process-scheduled-reports` (`5 * * * *`) e `send-scheduled-reports` (`10 * * * *`) **ja existiam em producao** e nao tinham arquivo de migration correspondente no repositorio. A branch nao cria funcionalidade: ela so escreve o arquivo que documenta/versiona o que ja roda, mais o arquivo de reversao.

Dois arquivos, ambos novos:
- `supabase/migrations/20261108221500_ft005_cron_scheduled_reports.sql` (37 linhas)
- `supabase/rollbacks/20261108221500_rollback.sql` (5 linhas)

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Migration versionando o cron `process-scheduled-reports` com agenda `5 * * * *` | ESTA — `supabase/migrations/20261108030000_ft005_cron_scheduled_reports.sql:18-27` (mesmo FT-005, timestamp diferente) | `git show origin/main:supabase/migrations/20261108030000_ft005_cron_scheduled_reports.sql` linhas 19-20: `'process-scheduled-reports', '5 * * * *'` |
| Migration versionando o cron `send-scheduled-reports` com agenda `10 * * * *` | ESTA — mesmo arquivo da main, `:29-38` | mesmo `git show`, linhas 30-31: `'send-scheduled-reports', '10 * * * *'` |
| Corpo do disparo: `net.http_post` para a URL da edge no projeto canonico `doufsxqlfjyuvxuezpln`, header `x-cron-secret` via `public.get_edge_function_secret('CRON_SECRET')`, body `{"trigger":"cron"}`, timeout 55000 | ESTA — identico na main (`:21-26` e `:32-37`); muda apenas a etiqueta do bloco de texto SQL (`$cmd$` na main, `$$` na branch), o que nao altera comportamento | comparacao dos dois arquivos; e o comando real em producao confere: `cron.job` jobid 15/16 trazem exatamente `SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/{process,send}-scheduled-reports',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)` (MCP `execute_sql`, somente leitura, 2026-11-16) |
| Idempotencia (nao duplicar o agendamento se ja existir) | ESTA, por tecnica diferente e equivalente — a main usa `DO $$ BEGIN PERFORM cron.unschedule(...); EXCEPTION WHEN OTHERS THEN NULL; END$$;` (`:6-16`); a branch usava `SELECT cron.unschedule(...) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = ...)` | main `:6-16` vs diff (A) da branch, linhas 5-6 e 20-21 |
| Arquivo de reversao (`supabase/rollbacks/`) | ESTA — `supabase/rollbacks/20261108030000_rollback.sql` na main. **A versao da main e deliberadamente diferente e melhor:** ela e um espelho inofensivo (`SELECT 1;`) e comenta por escrito que derrubar esses dois agendamentos seria regressao em producao, porque eles ja existiam antes da migration. A versao da branch executava de verdade os dois `cron.unschedule` | `git show origin/main:supabase/rollbacks/20261108030000_rollback.sql:1-8` — "os objetos ja existiam em producao ANTES desta migration (validado em 2026-11-11 contra o canonico) ... derrubar esses objetos seria uma regressao em producao" |
| O arquivo da branch (timestamp `20261108221500`) chegou a existir na main? | NAO ESTA e nunca esteve — o unico commit que toca esse caminho em qualquer ref e o proprio `d05254b1ea` da branch | `git log --all -- supabase/migrations/20261108221500_ft005_cron_scheduled_reports.sql` devolve so `d05254b1ea` |

Contexto que fecha a conta: a main recebeu o **mesmo trabalho no mesmo dia, por outra mao** — `d3c137568b 2026-11-08 "feat: versionar cron jobs process/send-scheduled-reports (FT-005)"` (`git log origin/main -- supabase/migrations/20261108030000_*`). Duas branches atacaram o FT-005 em paralelo; a de timestamp `0300` entrou, a de `2215` (esta) ficou para tras. Nao e defasagem nem refatoracao: e duplicata.

O registro interno do repositorio tambem ja trata o assunto como resolvido pela versao da main: `supabase/MIGRATIONS_SYNC_LOG.md:1271` lista `20261108030000 | ft005_cron_scheduled_reports` com a observacao "espelho — os crons process/send-scheduled-reports ja existem em producao com o mesmo agendamento (#3263); registrar via repair-only".

## A resgatar

Vazio. Nenhum item desta branch ficou de fora da main.

Observacao explicita para nao se perder: o unico trecho em que a branch difere de verdade da main e o arquivo de reversao, e nele a branch e **pior**. Resgatar o rollback da branch tiraria do ar os dois disparos de relatorio em producao. Nao resgatar.

## Risco de fechar esta branch

Praticamente nulo, e menor do que o risco de aproveita-la. Os dois agendamentos continuam de pe e ativos em producao (`cron.job` jobid 15 `5 * * * *` e jobid 16 `10 * * * *`, ambos `active = true`, conferido em 2026-11-16), com o mesmo comando que a branch descrevia, e o arquivo que documenta isso ja esta no repositorio pela main. Fechar nao desliga nada, nao apaga nada e nao perde texto que nao exista em outro lugar.

O risco real seria o contrario: aplicar esta branch criaria uma **segunda** migration para o mesmo FT-005 (dois arquivos, dois timestamps, mesmo efeito) e, com ela, um arquivo de reversao que de fato derruba os relatorios agendados — justamente o que a main documentou como regressao a evitar.

## Nao verificado

Nada que mude o veredito. Dois registros, para o proximo que olhar:

1. **Pendencia que e da main, nao desta branch:** nenhuma das duas versoes esta registrada no historico de migrations do banco de producao — `SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('20261108030000','20261108221500')` devolveu lista vazia (MCP `execute_sql`, 2026-11-16). Ou seja: os agendamentos rodam, o arquivo esta no repositorio, mas o "repair-only" previsto em `supabase/MIGRATIONS_SYNC_LOG.md:1271` ainda nao foi feito. Fechar esta branch nao piora isso em nada, e aproveita-la tambem nao resolveria — o arquivo dela ficaria igualmente nao registrado. Item para a lista de drift de banco, com o dono, porque mexer no historico de migrations de producao e decisao dele.
2. Nao abri a PR original desta branch no GitHub para ver discussao/review; o veredito nao depende disso, porque foi decidido pelo comportamento (agendamento, URL, header, body, timeout) conferido contra a main e contra o banco de producao.

Arquivos lidos sem truncamento: 2 de 2. Nenhum arquivo ficou sem leitura.
