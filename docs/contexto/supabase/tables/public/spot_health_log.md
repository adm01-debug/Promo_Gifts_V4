# public.spot_health_log

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
| 2 | `check_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `health_score_pct` | `integer` | sim |  |  |  |
| 4 | `active_products` | `integer` | sim |  |  |  |
| 5 | `products_with_main` | `integer` | sim |  |  |  |
| 6 | `total_images` | `integer` | sim |  |  |  |
| 7 | `missing_cf_id` | `integer` | sim |  |  |  |
| 8 | `cf_ready_videos` | `integer` | sim |  |  |  |
| 9 | `pending_videos` | `integer` | sim |  |  |  |
| 10 | `error_videos` | `integer` | sim |  |  |  |
| 11 | `downloading_stuck` | `integer` | sim |  |  |  |
| 12 | `notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_health_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| spot_health_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_health_log_pkey ON public.spot_health_log USING btree (id)` |


## Policies (RLS)

### `spot_health_log_auth_read`

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
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
