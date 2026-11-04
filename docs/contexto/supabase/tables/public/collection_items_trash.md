# public.collection_items_trash

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `original_id` | `uuid` | não |  |  |  |
| 3 | `collection_id` | `uuid` | não |  |  |  |
| 4 | `user_id` | `uuid` | não |  |  |  |
| 5 | `product_id` | `text` | não |  |  |  |
| 6 | `color_name` | `text` | sim |  |  |  |
| 7 | `color_hex` | `text` | sim |  |  |  |
| 8 | `thumbnail_url` | `text` | sim |  |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 11 | `sort_order` | `integer` | sim |  |  |  |
| 12 | `deleted_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `expires_at` | `timestamp with time zone` | não | `(now() + '30 days'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collection_items_trash_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collection_items_trash_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collection_items_trash_pkey ON public.collection_items_trash USING btree (id)` |


## Policies (RLS)

### `Users delete own collection trash`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |

### `Users insert own collection trash`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `Users view own collection trash`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
