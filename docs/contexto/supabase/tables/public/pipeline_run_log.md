# public.pipeline_run_log

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `job` | `text` | não | `'promote_tick'::text` |  |  |
| 3 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 5 | `duration_s` | `numeric` | sim |  |  |  |
| 6 | `status` | `text` | não | `'running'::text` |  |  |
| 7 | `batch_size` | `integer` | sim |  |  |  |
| 8 | `result` | `jsonb` | sim |  |  |  |
| 9 | `error` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pipeline_run_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ix_pipeline_run_log_started | btree | started_at | não | sim |  | `CREATE INDEX ix_pipeline_run_log_started ON public.pipeline_run_log USING btree (started_at DESC)` |
| pipeline_run_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pipeline_run_log_pkey ON public.pipeline_run_log USING btree (id)` |


## Policies (RLS)

### `rls_infra_deny_public`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
