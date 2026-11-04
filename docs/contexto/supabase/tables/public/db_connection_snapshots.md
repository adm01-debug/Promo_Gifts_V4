# public.db_connection_snapshots

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
| usada por views | public.v_connection_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('db_connection_snapshots_id_seq'::regclass)` |  |  |
| 2 | `captured_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `total_conns` | `integer` | sim |  |  |  |
| 4 | `active_conns` | `integer` | sim |  |  |  |
| 5 | `idle_in_tx_conns` | `integer` | sim |  |  |  |
| 6 | `max_conns` | `integer` | sim |  |  |  |
| 7 | `usage_pct` | `numeric(5,2)` | sim |  |  |  |
| 8 | `top_users` | `jsonb` | sim |  |  |  |
| 9 | `alert_sent` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| db_connection_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| db_connection_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX db_connection_snapshots_pkey ON public.db_connection_snapshots USING btree (id)` |
| idx_db_conn_snapshots_captured | btree | captured_at | não | sim |  | `CREATE INDEX idx_db_conn_snapshots_captured ON public.db_connection_snapshots USING btree (captured_at DESC)` |


## Policies (RLS)

### `dcs_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
