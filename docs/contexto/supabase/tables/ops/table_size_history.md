# ops.table_size_history

> PLANO_DBA E30 — série histórica diária de pg_total_relation_size()/reltuples por tabela do schema public, alimentada pelo cron table-size-history-daily (fn_cron_safe_run p_key=168). RLS deny-all intencional (ver .security/rls-no-policy-allowlist.json) — só service_role/postgres lê/escreve; zero policies, sem GRANT a anon/authenticated. Consumida pelo workflow semanal capacity-growth-report.yml (scripts/capacity-growth-projection.mjs).

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 2 | `schema_name` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `total_bytes` | `bigint` | não |  |  |  |
| 5 | `live_tup` | `bigint` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| table_size_history_pkey | PRIMARY KEY | `PRIMARY KEY (captured_at, schema_name, table_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_table_size_history_table_captured | btree | schema_name, table_name, captured_at | não | sim |  | `CREATE INDEX idx_table_size_history_table_captured ON ops.table_size_history USING btree (schema_name, table_name, captured_at DESC)` |
| table_size_history_pkey | btree | captured_at, schema_name, table_name | sim | sim |  | `CREATE UNIQUE INDEX table_size_history_pkey ON ops.table_size_history USING btree (captured_at, schema_name, table_name)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
