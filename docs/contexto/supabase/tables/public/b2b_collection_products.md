# public.b2b_collection_products

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
| 2 | `b2b_collection_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | não |  |  |  |
| 4 | `display_order` | `integer` | sim | `0` |  |  |
| 5 | `added_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| b2b_collection_products_b2b_collection_id_fkey | FOREIGN KEY | `FOREIGN KEY (b2b_collection_id) REFERENCES b2b_collections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| b2b_collection_products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| collection_products_collection_id_product_id_key | UNIQUE | `UNIQUE (b2b_collection_id, product_id)` |  |  | sim |
| collection_products_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| b2b_collection_products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX b2b_collection_products_pkey ON public.b2b_collection_products USING btree (id)` |
| collection_products_collection_id_product_id_key | btree | b2b_collection_id, product_id | sim | sim |  | `CREATE UNIQUE INDEX collection_products_collection_id_product_id_key ON public.b2b_collection_products USING btree (b2b_collection_id, product_id)` |
| idx_collection_products_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_collection_products_product_id ON public.b2b_collection_products USING btree (product_id)` |


## Policies (RLS)

### `collection_products_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |
| WITH CHECK |  |

### `collection_products_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |

### `collection_products_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND user_is_org_member(c.organization_id))))` |
| WITH CHECK |  |

### `collection_products_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
