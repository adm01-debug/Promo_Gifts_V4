# public.collection_products

> Bridge migration F1 (2026-05-15): tabela necessária para compat com hook useExternalCollections.ts. Em fase posterior decidir se mantém ou consolida com b2b_collection_products (que tem 4433 linhas).

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `collection_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | não |  |  |  |
| 4 | `display_order` | `integer` | não | `0` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collection_products_collection_id_fkey | FOREIGN KEY | `FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| collection_products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| collection_products_product_id_fkey1 | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| collection_products_unique_pair | UNIQUE | `UNIQUE (collection_id, product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collection_products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collection_products_pkey ON public.collection_products USING btree (id)` |
| collection_products_unique_pair | btree | collection_id, product_id | sim | sim |  | `CREATE UNIQUE INDEX collection_products_unique_pair ON public.collection_products USING btree (collection_id, product_id)` |
| idx_coll_products_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_coll_products_product_id ON public.collection_products USING btree (product_id)` |
| idx_collection_products_display_order | btree | collection_id, display_order | não | sim |  | `CREATE INDEX idx_collection_products_display_order ON public.collection_products USING btree (collection_id, display_order)` |


## Policies (RLS)

### `anon_read_public_collection_products`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now())))))` |
| WITH CHECK |  |

### `collection_products_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `collection_products_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `collection_products_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND ((c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (c.is_public = true) OR (c.share_token IS NOT NULL))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `collection_products_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
