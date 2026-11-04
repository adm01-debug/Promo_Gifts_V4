# public.seller_cart_items

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
| 2 | `cart_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `product_sku` | `text` | sim |  |  |  |
| 6 | `product_image_url` | `text` | sim |  |  |  |
| 7 | `product_price` | `numeric(10,2)` | não | `0` |  |  |
| 8 | `quantity` | `integer` | não | `1` |  |  |
| 9 | `color_name` | `text` | sim |  |  |  |
| 10 | `color_hex` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `sort_order` | `integer` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_scis_price_nonneg | CHECK | `CHECK (product_price >= 0::numeric)` |  |  | sim |
| chk_scis_quantity_positive | CHECK | `CHECK (quantity >= 1)` |  |  | sim |
| seller_cart_items_cart_id_fkey | FOREIGN KEY | `FOREIGN KEY (cart_id) REFERENCES seller_carts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seller_cart_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seller_cart_items_quantity_max | CHECK | `CHECK (quantity <= 999999)` |  |  | sim |
| unique_cart_item_variant | UNIQUE | `UNIQUE NULLS NOT DISTINCT (cart_id, product_id, color_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seller_cart_items_cart_id | btree | cart_id | não | sim |  | `CREATE INDEX idx_seller_cart_items_cart_id ON public.seller_cart_items USING btree (cart_id)` |
| idx_seller_cart_items_sort_order | btree | cart_id, sort_order | não | sim |  | `CREATE INDEX idx_seller_cart_items_sort_order ON public.seller_cart_items USING btree (cart_id, sort_order)` |
| seller_cart_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seller_cart_items_pkey ON public.seller_cart_items USING btree (id)` |
| unique_cart_item_variant | btree | cart_id, product_id, color_name | sim | sim |  | `CREATE UNIQUE INDEX unique_cart_item_variant ON public.seller_cart_items USING btree (cart_id, product_id, color_name) NULLS NOT DISTINCT` |


## Policies (RLS)

### `Users can manage own cart items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_assign_cart_item_sort_order | BEFORE | INSERT OR UPDATE | ROW | enabled | public.assign_cart_item_sort_order |
| trg_seller_cart_items_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_touch_seller_cart_on_item_change | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.touch_seller_cart_on_item_change |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
