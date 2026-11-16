# origin/claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** fecha a porta para que um visitante nao logado chame diretamente 106 rotinas internas do banco (gatilhos de preco, estoque, auditoria e classificacao de produto) — e esse fechamento ja esta no codigo oficial, so nao foi ligado no banco de producao ainda.
- **Tip / merge-base / main:** tip `39ec2b456baf74da00958cba750b780d2d1687dc` · merge-base `de5345dc1b6f13eccd7f75cca7fed7adebd88919` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, dois objetivos:

1. `39ec2b456b` — "fix(security): REVOKE EXECUTE FROM PUBLIC em 106 funções trigger/internas (SEC-001)".
   Criou a migration `supabase/migrations/20261101210000_sec001_revoke_anon_execute_trigger_functions.sql`
   com 106 linhas `REVOKE EXECUTE ... FROM PUBLIC`, mais o arquivo de rollback correspondente
   (`supabase/rollbacks/20261101210000_rollback.sql`) com os 106 `GRANT` inversos. Criterio declarado no
   cabecalho: funcao com `has_function_privilege('anon', oid, 'EXECUTE') = true`, zero referencias em
   `src/**/*.{ts,tsx}` e `supabase/functions/**/*.ts`, e nao citada em expressao de RLS.

2. `7eb6255fbd` — "chore(migrations): adiciona rollback files para e38/e47/e37".
   Criou os 3 arquivos de rollback que o preflight (`scripts/preflight-migration-apply.mjs`) exige para as
   migrations de cron de 17/set: `supabase/rollbacks/20260917070000_rollback.sql`,
   `20260917090000_rollback.sql` e `20260917100000_rollback.sql`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Migration SEC-001 com os 106 `REVOKE EXECUTE` | Esta, renumerada para `supabase/migrations/20261115130200_sec001_revoke_anon_execute_trigger_functions.sql` | `git show origin/main:supabase/migrations/20261115130200_sec001_revoke_anon_execute_trigger_functions.sql \| grep -c "^REVOKE EXECUTE"` → `106`. Entrou pelo commit `b89a44e100` ("fix(db): trem de banco — ... revoke de 106 funções ...", PR #3665) |
| A lista exata das 106 funcoes | Esta, conjunto identico (1 assinatura corrigida — ver abaixo) | `diff` entre as 106 linhas da branch e as 106 da main: unica divergencia e `public.fn_hex_to_rgb(text)` (branch) vs `public.fn_hex_to_rgb()` (main) |
| Assinatura `fn_hex_to_rgb` | A main esta **correta** e a branch estava errada | Producao (`doufsxqlfjyuvxuezpln`, somente leitura): `select oid::regprocedure from pg_proc ...` → `fn_hex_to_rgb()` (sem argumento). Mesma coisa no baseline: `origin/main:supabase/baseline/20261015140000_baseline_schema.sql:27986` `CREATE OR REPLACE FUNCTION "public"."fn_hex_to_rgb"() RETURNS "trigger"`. A versao da branch falharia e reverteria a transacao inteira |
| Abrangencia do revoke | A main vai **mais longe**: revoga tambem de `anon`, nao so de `PUBLIC` | `origin/main:...20261115130200...sql:22` `REVOKE EXECUTE ON FUNCTION public.fn_auto_classify_kit_product() FROM PUBLIC, anon;` e a justificativa nas linhas 13-14 do mesmo arquivo (o `ALTER DEFAULT PRIVILEGES` do Supabase da grant explicito a `anon`, entao revogar so `PUBLIC` deixaria o buraco aberto) |
| Rollback do SEC-001 (106 `GRANT`) | Esta, como `supabase/rollbacks/20261115130200_rollback.sql` | `git show origin/main:supabase/rollbacks/20261115130200_rollback.sql \| grep -c "^GRANT EXECUTE"` → `106`; linha 28: `GRANT EXECUTE ON FUNCTION public.fn_hex_to_rgb() TO PUBLIC, anon;` |
| Numero de versao `20261101210000` | Reutilizado por outra migration na main — por isso a renumeracao | `git ls-tree -r --name-only origin/main -- supabase/migrations \| grep 20261101210000` → `20261101210000_sb0007_drop_noop_restrictive_policies.sql`. O cabecalho da versao da main (linhas 15-16) cita esta branch pelo nome como origem |
| Rollback E38 (`20260917070000_rollback.sql`) | Esta, com o conteudo da branch preservado + guarda nova | `git diff <tip> origin/main -- supabase/rollbacks/20260917070000_rollback.sql`: so insercoes (bloco `DO $guard$` que aborta se a migration nao estiver aplicada, + dois `cron.alter_job(..., active := false)`); nenhuma linha da branch removida |
| Rollback E47 (`20260917090000_rollback.sql`) | Esta, conteudo da branch preservado + guarda nova | mesmo `git diff`: `1 file changed, 16 insertions(+)`, o `cron.alter_job(245, ...)` da branch intacto |
| Rollback E37 (`20260917100000_rollback.sql`) | Esta, conteudo da branch preservado + guarda nova | `git diff --stat <tip> origin/main -- supabase/rollbacks/20260917100000_rollback.sql` → `16 ++++++++++++++++`, `1 file changed, 16 insertions(+)`, zero delecoes |

Resumo: dos 5 arquivos que "diferem da main", 3 (os rollbacks de cron) estao na main com o conteudo da
branch intacto e so ganharam guardas; e 2 (a migration SEC-001 e seu rollback) estao na main com outro
numero de versao, lista identica de 106 funcoes, uma assinatura corrigida e abrangencia maior. Nada ficou
de fora.

## A resgatar

Nada. Nenhum item desta branch esta ausente da main.

## Risco de fechar esta branch

Fechar a branch nao perde nada: todo o conteudo esta na main, e em versao melhor (`FROM PUBLIC, anon` em
vez de so `PUBLIC`, e a assinatura de `fn_hex_to_rgb` corrigida — a da branch quebraria a migration inteira
na hora de aplicar).

O que fica pendente **nao e da branch, e da main**: a migration ja esta versionada, mas ainda **nao foi
aplicada no banco de producao**. Consulta somente leitura no banco oficial `doufsxqlfjyuvxuezpln`:
`select version from supabase_migrations.schema_migrations where version in ('20261115130200',
'20261101210000','20260917070000','20260917090000','20260917100000')` → `[]` (nenhuma aplicada), e
`has_function_privilege('anon', oid, 'EXECUTE')` segue `true` para as funcoes verificadas
(`fn_audit_role_changes`, `fn_auto_classify_kit_product`, `fn_hex_to_rgb`). Em termos de negocio: a porta
que esta correcao fecha **ainda esta aberta em producao**; o passo que falta e rodar o workflow
`db-apply-migration.yml` com a versao `20261115130200`, o que e decisao de janela/DDL em producao, nao
desta branch.

## Nao verificado

- Se as 106 funcoes realmente nao tem nenhuma referencia em `src/**` e `supabase/functions/**` (criterio que
  a branch declara no cabecalho). Nao refiz esse levantamento: a versao da main repete o mesmo criterio e
  declara revalidacao em 2026-11-15, mas eu nao auditei funcao por funcao.
- Efeito pratico de aplicar o revoke em producao (se algum fluxo chama alguma dessas funcoes por RPC sem
  estar no codigo do repo, por exemplo via n8n, Lovable ou script externo). Nao ha evidencia de que haja,
  mas tambem nao ha evidencia de que nao haja.
- Arquivos sem leitura por truncamento do pacote: 0 (os 5 arquivos vieram com os dois diffs completos).
