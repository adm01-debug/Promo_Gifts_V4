# public.cron_watchdog_log

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
| 1 | `id` | `bigint` | não | `nextval('cron_watchdog_log_id_seq'::regclass)` |  |  |
| 2 | `killed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `pid` | `integer` | sim |  |  |  |
| 4 | `jobname` | `text` | sim |  |  |  |
| 5 | `query_start` | `timestamp with time zone` | sim |  |  |  |
| 6 | `duration_ms` | `bigint` | sim |  |  |  |
| 7 | `query_preview` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_watchdog_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_watchdog_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cron_watchdog_log_pkey ON public.cron_watchdog_log USING btree (id)` |
| idx_cron_watchdog_killed | btree | killed_at | não | sim |  | `CREATE INDEX idx_cron_watchdog_killed ON public.cron_watchdog_log USING btree (killed_at DESC)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
