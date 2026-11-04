# public.order_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | sim |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `quantity` | `integer` | não | `1` |  |  |
| 5 | `unit_price` | `numeric(10,2)` | não |  |  |  |
| 6 | `subtotal` | `numeric(10,2)` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `quote_item_id` | `uuid` | sim |  |  |  |
| 9 | `product_sku` | `text` | sim |  |  |  |
| 10 | `product_name` | `text` | sim |  |  |  |
| 11 | `product_description` | `text` | sim |  |  |  |
| 12 | `product_image_url` | `text` | sim |  |  |  |
| 13 | `personalization_config` | `jsonb` | sim |  |  |  |
| 14 | `personalization_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 15 | `discount_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 16 | `production_status` | `text` | sim | `'pending'::text` |  |  |
| 17 | `production_notes` | `text` | sim |  |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_items_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_items_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id)` | NO ACTION | NO ACTION | sim |
| order_items_qty_pos | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| order_items_subtotal_match | CHECK | `CHECK (subtotal = round(quantity::numeric * (unit_price - COALESCE(discount_amount, 0::numeric) + COALESCE(personalization_cost, 0::numeric)), 2))` |  |  | sim |
| order_items_unit_price_nonneg | CHECK | `CHECK (unit_price >= 0::numeric)` |  |  | sim |
| order_items_valid_production_status | CHECK | `CHECK (production_status = ANY (ARRAY['pending'::text, 'in_production'::text, 'completed'::text, 'quality_check'::text, 'approved'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_order_items_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id)` |
| idx_order_items_product | btree | product_id | não | sim |  | `CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id)` |
| order_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)` |


## Policies (RLS)

### `order_items_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND is_org_owner_or_admin(o.organization_id))))` |
| WITH CHECK |  |

### `order_items_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |

### `order_items_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |
| WITH CHECK |  |

### `order_items_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| order_items_recalc_total | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.recalc_order_total |
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_order_items_calc_subtotal | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_order_items_calc_subtotal |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
