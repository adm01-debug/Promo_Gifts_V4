# public.favorite_items_trash

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
| 2 | `original_id` | `uuid` | sim |  |  |  |
| 3 | `list_id` | `uuid` | não |  |  |  |
| 4 | `user_id` | `uuid` | não |  |  |  |
| 5 | `product_id` | `uuid` | não |  |  |  |
| 6 | `variant_id` | `uuid` | sim |  |  |  |
| 7 | `variant_info` | `jsonb` | sim |  |  |  |
| 8 | `note` | `text` | sim |  |  |  |
| 9 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 10 | `position` | `integer` | sim |  |  |  |
| 11 | `added_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `deleted_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `expires_at` | `timestamp with time zone` | sim | `(now() + '30 days'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_items_trash_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| favorite_items_trash_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_items_trash_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_items_trash_pkey ON public.favorite_items_trash USING btree (id)` |
| idx_fit_expires_at | btree | expires_at | não | sim | `(expires_at IS NOT NULL)` | `CREATE INDEX idx_fit_expires_at ON public.favorite_items_trash USING btree (expires_at) WHERE (expires_at IS NOT NULL)` |
| idx_fit_user_deleted | btree | user_id, deleted_at | não | sim |  | `CREATE INDEX idx_fit_user_deleted ON public.favorite_items_trash USING btree (user_id, deleted_at DESC)` |


## Policies (RLS)

### `fit_delete_own`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `fit_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `fit_select_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
