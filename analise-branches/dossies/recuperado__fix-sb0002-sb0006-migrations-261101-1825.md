# origin/recuperado/fix-sb0002-sb0006-migrations-261101-1825

- **Veredito:** FECHAR_SEM_VALOR  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada hoje — a melhoria que esta branch perseguia (busca mais rapida dos pedidos de orcamento e de salvar kit por usuario) ja esta valendo em producao desde 01/11/2026, e o resto da branch apagaria duas mudancas de banco que hoje estao ativas.
- **Tip / merge-base / main:** tip `756f8f61b068b514255d22c7bdbc8551ced4f796` · merge-base `658a5b85fc6a98ff96846b6fdfd23c9febbe8f01` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelas tres mensagens de commit (todas de 2026-11-01, sessao `session_01Gd4dBiiRDt6KfePwg6Lkbh`), o agente
tentava destravar duas migrations da auditoria Supabase que, **naquele momento**, ele considerava "nunca
aplicadas":

1. `3e59c39be7` — apagar `supabase/migrations/20261101140002_sb0003_replica_identity_full_realtime.sql`
   (REPLICA IDENTITY FULL em `login_attempts`, `workspace_notifications`,
   `device_login_notifications`), com a justificativa "nunca aplicada, sem consumidor de payload.old".
2. `9f8341e9e2` — apagar `supabase/migrations/20261101140003_sb0006_index_kit_fk_user_id.sql`, porque
   `CREATE INDEX CONCURRENTLY` sem o opt-out de transacao reprova no preflight.
3. `756f8f61b0` — criar a substituta
   `supabase/migrations/20261101190001_sb0006_index_kit_fk_user_id_concurrent.sql`, igual na pratica, mas
   com o cabecalho `-- transaction: none` + `-- approved-by:` que o gate exige.

Ou seja: o objetivo de negocio da branch era **so um** — colocar os indices de `user_id` em
`kit_quote_requests` e `kit_save_requests` em producao. As duas delecoes eram meio, nao fim.

O que aconteceu depois: **~40 minutos apos o tip desta branch** (slug `1825` = 18:25), as duas migrations
foram aplicadas em producao por outro caminho (MCP `apply_migration`, fluxo E056), conforme
`supabase/MIGRATIONS_SYNC_LOG.md:1033-1034` na main de hoje:

```
| `20261101190544` | `20261101140002` | sb0003_replica_identity_full_realtime | ✅ aplicado |
| `20261101190548` | `20261101140003` | sb0006_index_kit_fk_user_id          | ✅ aplicado |
```

A premissa da branch ("nunca aplicada") expirou no mesmo dia. Esta e exatamente a armadilha (c): o diff
contra a main e **defasagem**, nao trabalho perdido.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Objetivo SB-0006: indices de `user_id` nas duas tabelas de kit | **Em producao, validos** — nao pela branch, pela aplicacao de `20261101140003` | `pg_indexes` em `doufsxqlfjyuvxuezpln`: `idx_kit_quote_requests_user_id` e `idx_kit_save_requests_user_id` existem; `pg_index.indisvalid = true` para ambos (consulta de leitura, 2026-11-16) |
| `20261101140003` aplicada (o que a branch dizia nunca ter sido) | **Aplicada e registrada** | `supabase_migrations.schema_migrations` contem `20261101140003`; `supabase/MIGRATIONS_SYNC_LOG.md:1034` marca "✅ aplicado" |
| Delecao de `20261101140003` | **NAO ESTA na main — e nao deve estar** | arquivo presente em `origin/main:supabase/migrations/20261101140003_sb0006_index_kit_fk_user_id.sql` (20 linhas, sem opt-out); a main o referencia por nome em `scripts/drift-baseline.mjs:351` e em `tests/scripts/drift-baseline.test.mjs:87,108,137,155` |
| Migration substituta `20261101190001` (com `-- transaction: none`) | **NAO ESTA na main** — e seria no-op | `git ls-tree origin/main -- supabase/migrations` nao lista o arquivo; os dois indices que ela criaria ja existem (`CREATE INDEX ... IF NOT EXISTS` nao faria nada), e a versao nao esta no ledger |
| SB-0003: REPLICA IDENTITY FULL nas 3 tabelas de realtime | **Ativa em producao** — a branch queria apagar justamente isso | `pg_class.relreplident = 'f'` para `login_attempts`, `workspace_notifications`, `device_login_notifications` (consulta de leitura, 2026-11-16); `20261101140002` no ledger e em `MIGRATIONS_SYNC_LOG.md:1033` |
| Delecao de `20261101140002` | **NAO ESTA na main — e nao deve estar** | arquivo presente em `origin/main:supabase/migrations/20261101140002_sb0003_replica_identity_full_realtime.sql`, 21 linhas, identico ao do merge-base (blob `c26a7a8b2a` nos dois lados) |
| Padrao do opt-out que a branch inventou (`-- transaction: none` + `-- approved-by:`) | **Adotado na main, por outras migrations** | `origin/main:supabase/migrations/20261114014100_idx_fk_stock_and_missing_perf_indexes.sql:1-2` usa as duas linhas; a regra esta em `scripts/preflight-migration-apply.mjs:121-134,153-159` |

## A resgatar

Nada. Os tres itens da branch sao, hoje: (1) objetivo ja cumprido em producao, (2) delecao que causaria
dano, (3) migration que nao faria nada.

Observacao de risco, para registro: o arquivo `20261101140003` segue na main **sem** o cabecalho
`-- transaction: none`. Isso **nao** e um defeito vivo — o preflight analisa um arquivo por dispatch
(`scripts/preflight-migration-apply.mjs:331`, `--version=<version>`) e, como a versao ja consta no ledger,
um novo dispatch e barrado antes de chegar nessa checagem (regra 2 do cabecalho do script,
`scripts/preflight-migration-apply.mjs:12-14`). Nao existe gate que varra o diretorio inteiro: as unicas
referencias a `transaction: none` na main sao `.github/workflows/db-apply-migration.yml` e o proprio
preflight.

## Risco de fechar esta branch

Nenhum risco de perder trabalho. O ganho que ela buscava — consulta de pedidos de orcamento e de kit
salvos por usuario sem varrer a tabela inteira — ja esta valendo em producao e verificado.

O risco esta no **oposto**: aproveitar esta branch hoje tiraria do repositorio duas mudancas de banco que
estao ativas em producao, deixando banco e repositorio fora de sincronia (as duas versoes continuariam no
ledger sem arquivo correspondente) e quebrando um script de CI e seus testes, que citam o arquivo
`20261101140003` pelo nome (`scripts/drift-baseline.mjs:351`,
`tests/scripts/drift-baseline.test.mjs:87`). Por isso o veredito nao e "resgatar": aqui resgatar nao
custaria tempo, custaria uma regressao.

## Nao verificado

- **Por que o preflight reprovou em 01/11 e a aplicacao por MCP passou**: nao reconstitui o run que falhou
  (nao consultei logs de workflow desta data). Irrelevante para o veredito — o resultado final em producao
  esta verificado por consulta direta.
- **Se a aplicacao de `20261101140002/140003` por MCP seguiu a POLITICA_DDL**: o `MIGRATIONS_SYNC_LOG.md`
  afirma que sim (ticket de auditoria + migration versionada + repair), mas eu nao auditei essa decisao;
  nao faz parte do destino desta branch.
- Nenhum arquivo ficou sem leitura: o pacote de evidencia nao esta truncado e os 3 arquivos foram lidos
  integralmente, nas duas direcoes de diff.
