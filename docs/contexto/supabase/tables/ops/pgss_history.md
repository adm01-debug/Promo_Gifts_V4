# ops.pgss_history

> PLANO_DBA E40 — snapshot semanal de extensions.pg_stat_statements (filtrado a query ILIKE '%pgrst_call%', só chamadas roteadas por PostgREST) por RPC, alimentada pelo cron pgss-history-weekly (fn_cron_safe_run p_key=169). RLS deny-all intencional (ver .security/rls-no-policy-allowlist.json) — só service_role/postgres lê/escreve; zero policies, sem GRANT a anon/authenticated. Consumida pelo workflow semanal pgss-slo-report.yml (scripts/pgss-slo-check.mjs).

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
| 2 | `queryid` | `bigint` | não |  |  |  |
| 3 | `fn_name` | `text` | sim |  |  |  |
| 4 | `calls` | `bigint` | não |  |  |  |
| 5 | `total_exec_time` | `double precision` | não |  |  |  |
| 6 | `mean_exec_time` | `double precision` | não |  |  |  |
| 7 | `stddev_exec_time` | `double precision` | não |  |  |  |
| 8 | `max_exec_time` | `double precision` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pgss_history_pkey | PRIMARY KEY | `PRIMARY KEY (captured_at, queryid)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pgss_history_fn_captured | btree | fn_name, captured_at | não | sim |  | `CREATE INDEX idx_pgss_history_fn_captured ON ops.pgss_history USING btree (fn_name, captured_at DESC)` |
| pgss_history_pkey | btree | captured_at, queryid | sim | sim |  | `CREATE UNIQUE INDEX pgss_history_pkey ON ops.pgss_history USING btree (captured_at, queryid)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
