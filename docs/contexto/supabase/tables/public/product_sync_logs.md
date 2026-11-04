# public.product_sync_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `source` | `text` | não |  |  |  |
| 3 | `status` | `text` | não | `'pending'::text` |  |  |
| 4 | `records_processed` | `integer` | não | `0` |  |  |
| 5 | `records_inserted` | `integer` | não | `0` |  |  |
| 6 | `records_updated` | `integer` | não | `0` |  |  |
| 7 | `records_failed` | `integer` | não | `0` |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `payload` | `jsonb` | sim |  |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `triggered_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `products_received` | `integer` | sim | `0` |  | Alinhado ao Lovable 2026-05-22 (Wave 3.1.B). Total recebido do fornecedor. |
| 14 | `products_created` | `integer` | sim | `0` |  |  |
| 15 | `products_updated` | `integer` | sim | `0` |  |  |
| 16 | `products_failed` | `integer` | sim | `0` |  |  |
| 17 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_sync_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_sync_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_sync_logs_pkey ON public.product_sync_logs USING btree (id)` |


## Policies (RLS)

### `Admins insert product sync logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |

### `Admins view product sync logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
