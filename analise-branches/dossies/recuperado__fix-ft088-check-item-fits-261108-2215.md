# origin/recuperado/fix-ft088-check-item-fits-261108-2215

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** registra no historico do sistema o calculo que diz se um produto (ou um kit) cabe dentro de uma embalagem — calculo que ja esta no ar e funcionando; a main de hoje ja tem esse registro, feito por outra branch no mesmo dia.
- **Tip / merge-base / main:** tip `c52f600ae5ad6b0b293ca00d13901803166be8c5` · merge-base `34ac6453d1f7a9ced950f2fb579db711219b4495` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`c52f600ae5`, 2026-11-08, "feat: versiona fn_check_item_fits em migration (FT-088)"). A intencao esta na propria mensagem: a funcao de banco `fn_check_item_fits` **ja existia em producao** e nao tinha arquivo de migration no repositorio; a branch so queria criar esse arquivo (versionamento, "espelho"), sem mudar nada do comportamento. Dois arquivos novos:

1. `supabase/migrations/20261108221502_ft088_fn_check_item_fits.sql` — `CREATE OR REPLACE FUNCTION public.fn_check_item_fits(uuid, uuid, numeric)` + `GRANT EXECUTE ... TO authenticated`.
2. `supabase/rollbacks/20261108221502_rollback.sql` — `DROP FUNCTION IF EXISTS public.fn_check_item_fits(uuid, uuid, numeric);`.

Nao ha mudanca de front-end, rota, tela, hook, teste ou policy nesta branch.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Migration que versiona `fn_check_item_fits` | ESTA — `supabase/migrations/20261108030200_ft088_fn_check_item_fits.sql`, entrou pelo commit `e00a33b44f` ("feat: versionar function fn_check_item_fits (FT-088)", 2026-11-08) | `git ls-tree -r --name-only origin/main -- supabase/migrations \| grep ft088` → `supabase/migrations/20261108030200_ft088_fn_check_item_fits.sql`; `git log origin/main -- <esse arquivo>` → `e00a33b44f 2026-11-08 feat: versionar function fn_check_item_fits (FT-088)` |
| O corpo SQL da funcao (assinatura, retorno, calculo de volume por dimensoes, por cilindro e por componentes de kit, `search_path`, arredondamentos) | ESTA — **identico**, so difere a quebra de linha | Comparacao com comentarios e todo o whitespace removidos: md5 do conteudo da branch = md5 do conteudo da main = `8084442da0f1eb66cfe3438249071744`. So a formatacao (onde cai o `THEN`) difere |
| Arquivo de rollback correspondente | ESTA — `supabase/rollbacks/20261108030200_rollback.sql` | `git show origin/main:supabase/rollbacks/20261108030200_rollback.sql` |
| O rollback **destrutivo** da branch (`DROP FUNCTION`) | NAO ESTA — e **de proposito**. A main guardou o `DROP` apenas como comentario e deixou o rollback inerte (`SELECT 1;`), porque a funcao ja existia em producao antes da migration | `supabase/rollbacks/20261108030200_rollback.sql:1-7`: "os objetos já existiam em produção ANTES desta migration ... derrubar esses objetos seria uma regressão em produção" + `SELECT 1;` |
| `GRANT EXECUTE ON FUNCTION fn_check_item_fits TO authenticated` (linha extra da branch) | Efeito ja garantido em producao; nao faz falta na main | Producao (projeto canonico `doufsxqlfjyuvxuezpln`): `has_function_privilege('authenticated', ..., 'EXECUTE')` = **true** para `fn_check_item_fits(uuid,uuid,numeric)`. Snapshot do schema na main: `supabase/migrations-snapshot/SCHEMA_LIVE.sql:111033` → `GRANT ALL ON FUNCTION "public"."fn_check_item_fits"(...) TO "authenticated"`. `CREATE OR REPLACE` preserva grants existentes |
| Registro contabil da migration | ESTA na main — `supabase/MIGRATIONS_SYNC_LOG.md:1272`, versao `20261108030200`, marcada "espelho — fn_check_item_fits já existe em produção (#3265); registrar via repair-only" | `git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md \| grep ft088_fn_check_item_fits` |
| Uso da funcao pelo sistema (quem chama) | ESTA na main, independente desta branch | `src/hooks/kit-builder/useKitFitsValidation.ts:42` → `supabase.rpc('fn_check_item_fits', ...)`; teste em `tests/pages/kit-builder/useKitBuilderQuote.test.ts:138` |

Resumo: a branch e uma **segunda tentativa do mesmo trabalho no mesmo dia** (timestamp 22:15 contra 03:02 da que entrou). O conteudo util dela esta integralmente na main, e a unica coisa exclusiva da branch (o rollback que derruba a funcao) e justamente o que a main rejeitou de forma deliberada e documentada.

## A resgatar

Nada. Nenhum item da branch falta na main.

## Risco de fechar esta branch

Nenhum risco pratico. O calculo de "cabe na embalagem" continua no ar (funcao presente em producao, com permissao de execucao para usuario logado) e continua registrado no repositorio pela migration `20261108030200`. Trazer esta branch de volta seria pior que fechar: criaria uma segunda migration para a mesma funcao e um arquivo de rollback que **apagaria** a funcao de producao — a main anotou explicitamente que isso seria uma regressao.

Observacao separada, que nao e trabalho desta branch e nao muda o veredito: nenhuma das duas versoes (`20261108030200` nem `20261108221502`) aparece hoje na tabela de controle de migrations de producao (`supabase_migrations.schema_migrations` retornou vazio para as duas). O proprio registro da main ja preve isso ("registrar via repair-only"). E uma pendencia de contabilidade de migrations da main, nao trabalho perdido desta branch — fechar esta branch nao piora nem melhora isso.

## Nao verificado

- Nao foi comparado o corpo da funcao em producao (`pg_get_functiondef`, md5 `7f37b316bd74c51b7ef4f341e44465ef`) linha a linha contra o arquivo da main; a comparacao feita foi arquivo-da-branch contra arquivo-da-main (identicos) mais a confirmacao de que a funcao existe em producao com a assinatura `fn_check_item_fits(uuid,uuid,numeric)` e com permissao de execucao para `authenticated`. Isso basta para o veredito desta branch, porque a branch nao propunha mudar comportamento.
- Arquivos sem leitura por truncamento: 0 (o pacote de evidencia trouxe os 2 arquivos completos, sem marca de TRUNCADO).
