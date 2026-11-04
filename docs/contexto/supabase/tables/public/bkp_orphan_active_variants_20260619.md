# public._bkp_orphan_active_variants_20260619

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
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `product_id` | `uuid` | sim |  |  |  |
| 3 | `sku` | `text` | sim |  |  |  |
| 4 | `name` | `text` | sim |  |  |  |
| 5 | `attributes` | `jsonb` | sim |  |  |  |
| 6 | `stock_quantity` | `integer` | sim |  |  |  |
| 7 | `images` | `jsonb` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `sku_promo` | `character varying(50)` | sim |  |  |  |
| 12 | `color_id` | `uuid` | sim |  |  |  |
| 13 | `size_id` | `uuid` | sim |  |  |  |
| 14 | `supplier_sku` | `character varying(100)` | sim |  |  |  |
| 15 | `color_code` | `character varying(20)` | sim |  |  |  |
| 16 | `color_name` | `character varying(100)` | sim |  |  |  |
| 17 | `color_hex` | `character varying(10)` | sim |  |  |  |
| 18 | `size_code` | `character varying(10)` | sim |  |  |  |
| 19 | `capacity_ml` | `integer` | sim |  |  |  |
| 20 | `last_sync_at` | `timestamp with time zone` | sim |  |  |  |
| 21 | `last_sync_supplier_id` | `uuid` | sim |  |  |  |
| 22 | `selected_thumbnail` | `character varying(500)` | sim |  |  |  |
| 23 | `bitrix_product_id` | `integer` | sim |  |  |  |
| 24 | `CodigoXbz` | `text` | sim |  |  |  |
| 25 | `size_length_cm` | `numeric(6,2)` | sim |  |  |  |
| 26 | `size_width_cm` | `numeric(6,2)` | sim |  |  |  |
| 27 | `next_quantity_1` | `integer` | sim |  |  |  |
| 28 | `next_date_1` | `date` | sim |  |  |  |
| 29 | `next_quantity_2` | `integer` | sim |  |  |  |
| 30 | `next_date_2` | `date` | sim |  |  |  |
| 31 | `next_quantity_3` | `integer` | sim |  |  |  |
| 32 | `next_date_3` | `date` | sim |  |  |  |
| 33 | `next_quantity_4` | `integer` | sim |  |  |  |
| 34 | `next_date_4` | `date` | sim |  |  |  |
| 35 | `next_quantity_5` | `integer` | sim |  |  |  |
| 36 | `next_date_5` | `date` | sim |  |  |  |
| 37 | `next_quantity_6` | `integer` | sim |  |  |  |
| 38 | `next_date_6` | `date` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bkp_orphan_active_variants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bkp_orphan_active_variants_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bkp_orphan_active_variants_pkey ON public._bkp_orphan_active_variants_20260619 USING btree (id)` |


## Policies (RLS)

### `bkp_orphan_variants_service_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
