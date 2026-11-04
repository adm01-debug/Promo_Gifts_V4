# public.sm_worker_partitions

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
| 1 | `id` | `integer` | não | `nextval('sm_worker_partitions_id_seq'::regclass)` |  |  |
| 2 | `worker_id` | `integer` | não |  |  |  |
| 3 | `total_skus` | `integer` | sim | `0` |  |  |
| 4 | `total_images` | `integer` | sim | `0` |  |  |
| 5 | `total_uploaded` | `integer` | sim | `0` |  |  |
| 6 | `total_errors` | `integer` | sim | `0` |  |  |
| 7 | `status` | `text` | sim | `'pending'::text` |  |  |
| 8 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `last_invocation_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `invocation_count` | `integer` | sim | `0` |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sm_worker_partitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sm_worker_partitions_worker_id_key | UNIQUE | `UNIQUE (worker_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sm_worker_partitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sm_worker_partitions_pkey ON public.sm_worker_partitions USING btree (id)` |
| sm_worker_partitions_worker_id_key | btree | worker_id | sim | sim |  | `CREATE UNIQUE INDEX sm_worker_partitions_worker_id_key ON public.sm_worker_partitions USING btree (worker_id)` |


## Policies (RLS)

### `smwp_all_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
