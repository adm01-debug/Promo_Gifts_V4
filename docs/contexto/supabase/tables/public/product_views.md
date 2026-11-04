# public.product_views

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
| 2 | `product_id` | `uuid` | sim |  |  | UUID do produto visualizado. FK para products.id. Migrado de TEXT→UUID em 2026-06-12. |
| 3 | `product_sku` | `text` | sim |  |  |  |
| 4 | `product_name` | `text` | sim |  |  |  |
| 5 | `seller_id` | `uuid` | sim |  |  |  |
| 6 | `view_type` | `text` | sim | `'detail'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fk_product_views_products | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_views_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_views_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_product_views_created_at ON public.product_views USING btree (created_at DESC)` |
| idx_product_views_pid_created | btree | product_id, created_at | não | sim |  | `CREATE INDEX idx_product_views_pid_created ON public.product_views USING btree (product_id, created_at DESC)` |
| idx_product_views_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id)` |
| product_views_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_views_pkey ON public.product_views USING btree (id)` |


## Policies (RLS)

### `Users can insert own views`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `anon_can_insert_product_views`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `(seller_id IS NULL)` |

### `product_views_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |
| trg_product_views_delete | AFTER | DELETE | ROW | enabled | public.fn_sync_product_view_count |
| trg_product_views_insert | AFTER | INSERT | ROW | enabled | public.fn_sync_product_view_count |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
