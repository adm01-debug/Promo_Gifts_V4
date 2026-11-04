# public.external_connections_sync_log

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
| 2 | `connection_id` | `uuid` | sim |  |  |  |
| 3 | `connection_name` | `text` | não |  |  |  |
| 4 | `sync_type` | `text` | não | `'incremental'::text` |  |  |
| 5 | `status` | `text` | não | `'running'::text` |  |  |
| 6 | `records_processed` | `integer` | sim | `0` |  |  |
| 7 | `records_failed` | `integer` | sim | `0` |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| external_connections_sync_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| external_connections_sync_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX external_connections_sync_log_pkey ON public.external_connections_sync_log USING btree (id)` |


## Policies (RLS)

### `Admins read external_connections_sync_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
