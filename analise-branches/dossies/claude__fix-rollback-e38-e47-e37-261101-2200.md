# origin/claude/fix-rollback-e38-e47-e37-261101-2200

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada a fazer — o conteudo desta branch (o "plano B" para desfazer 3 ajustes de tarefas automaticas do banco) ja esta no sistema de producao, e com protecao extra que a branch nao tinha.
- **Tip / merge-base / main:** tip `7eb6255fbdcf6facf080f7843d94a429901e0e2b` · merge-base `de5345dc1b6f13eccd7f75cca7fed7adebd88919` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`7eb6255fbd`, "chore(migrations): adiciona rollback files para e38/e47/e37").
A mensagem explica o problema: as 3 migrations E38 / E47 / E37 (que mexem nos agendamentos
automaticos do banco — os "cron jobs") tinham o comentario `-- Rollback:` no topo, mas o
verificador `scripts/preflight-migration-apply.mjs` exige, alem do comentario, um **arquivo**
`supabase/rollbacks/<versao>_rollback.sql`. Sem esse arquivo, a aplicacao da migration em
producao falha no verificador, antes de tocar o banco.

Ou seja: a branch nao mudou comportamento nenhum do sistema. Ela escreveu os 3 arquivos de
"plano B" (como voltar atras) para destravar a aplicacao dessas migrations:

- `20260917070000_rollback.sql` — devolve os 2 agendamentos removidos pela E38
  (`process-webhook-outbox` e `pipeline-classify-categories`), avisando que o segundo nao
  funcionaria porque a funcao `fn_pipeline_classify_pending_products` nao existe mais.
- `20260917090000_rollback.sql` — devolve o job 245 (`schema-drift-check`) ao comando original.
- `20260917100000_rollback.sql` — devolve 5 jobs (233, 208, 195, 53, 244) aos comandos originais.

A branch mexeu **somente** nesses 3 arquivos, so criando linhas:
`git diff --stat de5345dc1b origin/claude/fix-rollback-e38-e47-e37-261101-2200` →
`3 files changed, 106 insertions(+)`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo `supabase/rollbacks/20260917070000_rollback.sql` (E38: devolve `process-webhook-outbox` e `pipeline-classify-categories`) | ESTA, com 43 linhas (a branch tinha 20) | `git ls-tree -r --name-only origin/main -- supabase/rollbacks/` lista o arquivo; `git show origin/main:supabase/rollbacks/20260917070000_rollback.sql \| wc -l` = 43 |
| Arquivo `supabase/rollbacks/20260917090000_rollback.sql` (E47: devolve o job 245) | ESTA, com 33 linhas (a branch tinha 17) | mesmo `ls-tree`; `wc -l` = 33 |
| Arquivo `supabase/rollbacks/20260917100000_rollback.sql` (E37: devolve os jobs 233/208/195/53/244) | ESTA, com 85 linhas (a branch tinha 69) | mesmo `ls-tree`; `wc -l` = 85 |
| **Cada linha escrita pela branch** (os blocos `cron.schedule` / `cron.alter_job`, os comentarios e o aviso sobre `fn_pipeline_classify_pending_products`) | ESTA, identica. A main so **acrescentou** linhas; nao apagou nem alterou nenhuma | `git diff --numstat origin/claude/fix-rollback-e38-e47-e37-261101-2200 origin/main` nos 3 arquivos = `23 0`, `16 0`, `16 0` — **zero remocoes**. Zero remocoes prova que o texto integral da branch sobrevive na main |
| Intencao da branch (destravar o verificador de aplicacao de migration) | ATENDIDA: o verificador continua exigindo o arquivo e o arquivo existe para as 3 versoes | `git show origin/main:scripts/preflight-migration-apply.mjs` linha 314: "Para migrations novas, crie supabase/rollbacks/${version}_rollback.sql..."; as 3 migrations seguem na main (`supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql`, `..._20260917090000_e47_fix_schema_drift_cron_split.sql`, `..._20260917100000_e37_split_genuine_multistatement_cron.sql`) |
| Quando entrou | PR #3665, commit `b89a44e100` (15/11/2026) | `git log --diff-filter=A origin/main -- supabase/rollbacks/202609170{7,9}0000_rollback.sql supabase/rollbacks/20260917100000_rollback.sql` → `b89a44e100 fix(db): trem de banco ... (#3665)` |
| O que a main tem **a mais** que a branch | Uma trava de seguranca em cada arquivo (bloco `DO $guard$`) que **aborta** o rollback se a migration correspondente nao estiver aplicada no banco; no arquivo da E38, duas linhas extras que deixam os jobs devolvidos desligados (`active := false`) | diffs (B) do pacote de evidencia; endurecimento entrou em PR #3679, commit `956761e556` (`git log -S"20260917100000_rollback" --oneline origin/main`) |

## A resgatar

Nada. Nenhum item da branch ficou de fora.

## Risco de fechar esta branch

Nenhum risco pratico. Fechar/apagar esta branch nao remove nada de producao nem do
repositorio: os 3 arquivos ja estao na main, com conteudo integral e protecao adicional.

Importante para quem decide: **manter** esta branch aberta e que seria o risco. Se alguem
reaplicasse a versao dela por cima da main, perderia a trava que impede rodar o "plano B"
sobre um banco onde a mudanca nunca foi aplicada — e, no caso da E38, religaria dois
agendamentos automaticos que hoje estao deliberadamente desligados, um deles chamando uma
rotina que nao existe mais (erro recorrente no banco de producao a cada 10 minutos).

## Nao verificado

- Nao foi conferido no banco de producao se as 3 migrations constam como aplicadas
  (`supabase_migrations.schema_migrations`). Isso nao muda o veredito: a questao desta
  analise e se o conteudo da branch esta na main, e esta. O comentario das travas na main
  afirma que em 2026-11-15 as 3 versoes **nao** estavam no registro do banco; essa
  afirmacao e da main, nao foi reverificada aqui.
- Nao foi executado nenhum comando que altere o repositorio nem o banco (analise somente
  leitura), portanto o conteudo dos arquivos de rollback nao foi testado em execucao.
