# public.orders

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
| usada por views | public.v_system_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_number` | `text` | não |  |  |  |
| 6 | `status` | `text` | sim | `'pending'::text` |  |  |
| 7 | `total` | `numeric(10,2)` | não | `0` |  | Wave 3.2.A 2026-05-22: renomeado de total_amount. Consolidacao Lovable. |
| 8 | `payment_method` | `text` | sim |  |  |  |
| 9 | `payment_status` | `text` | sim | `'pending'::text` |  |  |
| 10 | `delivery_address` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `quote_id` | `uuid` | sim |  |  |  |
| 16 | `client_id` | `uuid` | sim |  |  |  |
| 17 | `client_name` | `text` | sim |  |  |  |
| 18 | `assigned_to` | `uuid` | sim |  |  |  |
| 19 | `fulfillment_status` | `text` | sim | `'pending'::text` |  |  |
| 20 | `subtotal` | `numeric(10,2)` | sim | `0` |  |  |
| 21 | `discount_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 22 | `shipping_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 23 | `tax_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 24 | `paid_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 25 | `payment_terms` | `text` | sim |  |  |  |
| 26 | `payment_due_date` | `date` | sim |  |  |  |
| 27 | `shipping_address` | `jsonb` | sim |  |  |  |
| 28 | `shipping_method` | `text` | sim |  |  |  |
| 30 | `estimated_delivery_date` | `date` | sim |  |  |  |
| 31 | `delivered_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `internal_notes` | `text` | sim |  |  |  |
| 33 | `organization_id` | `uuid` | sim |  |  |  |
| 34 | `seller_id` | `uuid` | sim |  |  | [Etapa 7] Espelho de created_by. Hook applySellerScope filtra por seller_id por padrão. |
| 36 | `client_company` | `text` | sim |  |  | Nome da empresa cliente. NULL até integração Bitrix CRM popular. Hook useClientOrdersHistory lê via SELECT. |
| 37 | `version` | `integer` | não | `1` |  |  |
| 38 | `client_email` | `text` | sim |  |  |  |
| 39 | `client_phone` | `text` | sim |  |  |  |
| 40 | `tracking_number` | `text` | sim |  |  | Wave 3.2.A 2026-05-22: substitui tracking_code (drop). Padrao Lovable. |
| 41 | `shipping_type` | `text` | sim |  |  |  |
| 42 | `delivery_time` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_orders_total_nonneg | CHECK | `CHECK (total IS NULL OR total >= 0::numeric)` |  |  | sim |
| orders_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| orders_order_number_key | UNIQUE | `UNIQUE (order_number)` |  |  | sim |
| orders_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| orders_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| orders_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| orders_valid_fulfillment_status | CHECK | `CHECK (fulfillment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text]))` |  |  | sim |
| orders_valid_order_status | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]))` |  |  | sim |
| orders_valid_payment_status | CHECK | `CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'refunded'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_items | order_items_order_id_fkey | order_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_orders_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at)` |
| idx_orders_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by)` |
| idx_orders_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_orders_org ON public.orders USING btree (organization_id)` |
| idx_orders_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_orders_seller_id ON public.orders USING btree (seller_id)` |
| orders_order_number_key | btree | order_number | sim | sim |  | `CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number)` |
| orders_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)` |


## Policies (RLS)

### `orders_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `orders_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `user_is_org_member(organization_id)` |

### `orders_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_is_org_member(organization_id)` |
| WITH CHECK |  |

### `orders_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_is_org_member(organization_id)` |
| WITH CHECK | `user_is_org_member(organization_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_audit_orders | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |
| trg_orders_gen_number | BEFORE | INSERT | ROW | enabled | public.generate_order_number_v5 |
| trg_orders_sync_seller | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_orders_sync_seller |
| trg_orders_version | BEFORE | UPDATE | ROW | enabled | public.increment_row_version |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
