# public.product_packaging

> [ARQ 2026-06-26] Fonte SILVER de embalagem. LIDA por fn_promote_packaging_to_gold para popular products (has_optional_packaging, packing_classification, etc). Satélite vivo — MANTER.

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
| 1 | `product_id` | `uuid` | não |  |  |  |
| 2 | `box_length_mm` | `integer` | sim |  |  |  |
| 3 | `box_width_mm` | `integer` | sim |  |  |  |
| 4 | `box_height_mm` | `integer` | sim |  |  |  |
| 5 | `box_weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 6 | `box_length_cm` | `numeric(8,2)` | sim |  |  |  |
| 7 | `box_width_cm` | `numeric(8,2)` | sim |  |  |  |
| 8 | `box_height_cm` | `numeric(8,2)` | sim |  |  |  |
| 9 | `box_volume_cm3` | `numeric(12,2)` | sim |  |  |  |
| 10 | `box_quantity` | `integer` | sim |  |  |  |
| 11 | `box_inner_quantity` | `integer` | sim |  |  |  |
| 12 | `packing_type` | `character varying(100)` | sim |  |  |  |
| 13 | `repacking_type` | `character varying(100)` | sim |  |  |  |
| 14 | `packaging_material` | `character varying(100)` | sim |  |  |  |
| 15 | `packaging_color` | `character varying(50)` | sim |  |  |  |
| 16 | `packaging_finish` | `character varying(50)` | sim |  |  |  |
| 17 | `packaging_context` | `text` | sim |  |  |  |
| 18 | `has_inner_cradle` | `boolean` | sim |  |  |  |
| 19 | `cradle_material` | `character varying(50)` | sim |  |  |  |
| 20 | `packing_classification` | `character varying(20)` | sim |  |  |  |
| 21 | `repacking_classification` | `text` | sim |  |  |  |
| 22 | `has_commercial_packaging` | `boolean` | sim |  |  |  |
| 23 | `has_optional_packaging` | `boolean` | sim |  |  |  |
| 24 | `optional_packaging_ref` | `character varying(20)` | sim |  |  |  |
| 25 | `description_packaging_info` | `jsonb` | sim |  |  |  |
| 26 | `box_image` | `text` | sim |  |  |  |
| 27 | `has_gift_box` | `boolean` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_packaging_fk | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_packaging_pkey | PRIMARY KEY | `PRIMARY KEY (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_packaging_pkey | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_packaging_pkey ON public.product_packaging USING btree (product_id)` |


## Policies (RLS)

### `product_packaging_read_all`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
