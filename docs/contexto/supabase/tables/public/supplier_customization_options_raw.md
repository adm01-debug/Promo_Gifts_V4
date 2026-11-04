# public.supplier_customization_options_raw

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
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `product_reference` | `text` | não |  |  |  |
| 4 | `service_code` | `text` | sim |  |  |  |
| 5 | `table_code` | `text` | sim |  |  |  |
| 6 | `component` | `text` | sim |  |  |  |
| 7 | `location` | `text` | sim |  |  |  |
| 8 | `handling_cost` | `numeric` | sim |  |  |  |
| 9 | `table_max_area_cm2` | `numeric` | sim |  |  |  |
| 10 | `max_stitches` | `integer` | sim |  |  |  |
| 11 | `hotspot` | `text` | sim |  |  |  |
| 12 | `raw_data` | `jsonb` | não |  |  |  |
| 13 | `imported_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_customization_option_supplier_id_product_reference_key | UNIQUE | `UNIQUE (supplier_id, product_reference, service_code, table_code, component, location)` |  |  | sim |
| supplier_customization_options_raw_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_customization_option_supplier_id_product_reference_key | btree | supplier_id, product_reference, service_code, table_code, component, location | sim | sim |  | `CREATE UNIQUE INDEX supplier_customization_option_supplier_id_product_reference_key ON public.supplier_customization_options_raw USING btree (supplier_id, product_reference, service_code, table_code, component, location)` |
| supplier_customization_options_raw_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_customization_options_raw_pkey ON public.supplier_customization_options_raw USING btree (id)` |


## Policies (RLS)

### `rls_infra_deny_public`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
