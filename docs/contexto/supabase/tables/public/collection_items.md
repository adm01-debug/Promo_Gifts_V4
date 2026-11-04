# public.collection_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `collection_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `color_name` | `text` | sim |  |  |  |
| 5 | `color_hex` | `text` | sim |  |  |  |
| 6 | `thumbnail_url` | `text` | sim |  |  |  |
| 7 | `sort_order` | `integer` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 11 | `added_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collection_items_collection_id_fkey | FOREIGN KEY | `FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| collection_items_collection_id_product_id_color_name_key | UNIQUE | `UNIQUE (collection_id, product_id, color_name)` |  |  | sim |
| collection_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collection_items_collection_id_product_id_color_name_key | btree | collection_id, product_id, color_name | sim | sim |  | `CREATE UNIQUE INDEX collection_items_collection_id_product_id_color_name_key ON public.collection_items USING btree (collection_id, product_id, color_name)` |
| collection_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collection_items_pkey ON public.collection_items USING btree (id)` |
| idx_collection_items_collection_id | btree | collection_id | não | sim |  | `CREATE INDEX idx_collection_items_collection_id ON public.collection_items USING btree (collection_id)` |
| uq_collection_items_no_color | btree | collection_id, product_id | sim | sim | `(color_name IS NULL)` | `CREATE UNIQUE INDEX uq_collection_items_no_color ON public.collection_items USING btree (collection_id, product_id) WHERE (color_name IS NULL)` |


## Policies (RLS)

### `collection_items_own_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK |  |

### `collection_items_own_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |

### `collection_items_own_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |

### `collection_items_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR (EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_move_collection_item_to_trash | BEFORE | DELETE | ROW | enabled | public.move_collection_item_to_trash |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
