# public.pipeline_health_log

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `checked_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `critical_count` | `bigint` | não | `0` |  |  |
| 4 | `warning_count` | `bigint` | não | `0` |  |  |
| 5 | `ok_count` | `bigint` | não | `0` |  |  |
| 6 | `results` | `jsonb` | não | `'[]'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pipeline_health_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| pipeline_health_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pipeline_health_log_pkey ON public.pipeline_health_log USING btree (id)` |


## Policies (RLS)

### `pipeline_health_log_service_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
