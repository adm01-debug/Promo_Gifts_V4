# public.product_customization_prices

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
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `service_code` | `text` | sim |  |  |  |
| 4 | `table_code` | `text` | sim |  |  |  |
| 5 | `component` | `text` | sim |  |  |  |
| 6 | `location` | `text` | sim |  |  |  |
| 7 | `handling_cost` | `numeric` | sim |  |  |  |
| 8 | `table_max_area_cm2` | `numeric` | sim |  |  |  |
| 9 | `max_stitches` | `integer` | sim |  |  |  |
| 10 | `hotspot` | `text` | sim |  |  |  |
| 11 | `min_qty` | `integer[]` | sim |  |  |  |
| 12 | `price` | `numeric[]` | sim |  |  |  |
| 13 | `currency` | `text` | não | `'BRL'::text` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_customization_prices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_customization_prices_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_customization_prices_product_id_service_code_table__key | UNIQUE | `UNIQUE (product_id, service_code, table_code, component, location)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcp_product | btree | product_id | não | sim |  | `CREATE INDEX idx_pcp_product ON public.product_customization_prices USING btree (product_id)` |
| product_customization_prices_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_customization_prices_pkey ON public.product_customization_prices USING btree (id)` |
| product_customization_prices_product_id_service_code_table__key | btree | product_id, service_code, table_code, component, location | sim | sim |  | `CREATE UNIQUE INDEX product_customization_prices_product_id_service_code_table__key ON public.product_customization_prices USING btree (product_id, service_code, table_code, component, location)` |


## Policies (RLS)

### `product_customization_prices_read_all`

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
