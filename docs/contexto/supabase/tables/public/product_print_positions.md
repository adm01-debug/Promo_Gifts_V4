# public.product_print_positions

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
| 3 | `position_index` | `smallint` | não |  |  |  |
| 4 | `component` | `text` | sim |  |  |  |
| 5 | `location` | `text` | sim |  |  |  |
| 6 | `composed_location` | `text` | sim |  |  |  |
| 7 | `area_label` | `text` | sim |  |  |  |
| 8 | `technique_list` | `jsonb` | sim |  |  |  |
| 9 | `table_full_code` | `text` | sim |  |  |  |
| 10 | `table_codes` | `text` | sim |  |  |  |
| 11 | `table_codes_options` | `jsonb` | sim |  |  |  |
| 12 | `max_colors` | `jsonb` | sim |  |  |  |
| 13 | `handling_costs` | `jsonb` | sim |  |  |  |
| 14 | `area_image` | `text` | sim |  |  |  |
| 15 | `component_image` | `text` | sim |  |  |  |
| 16 | `location_image` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_print_positions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_print_positions_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_print_positions_product_id_position_index_key | UNIQUE | `UNIQUE (product_id, position_index)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ppp_product | btree | product_id | não | sim |  | `CREATE INDEX idx_ppp_product ON public.product_print_positions USING btree (product_id)` |
| product_print_positions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_print_positions_pkey ON public.product_print_positions USING btree (id)` |
| product_print_positions_product_id_position_index_key | btree | product_id, position_index | sim | sim |  | `CREATE UNIQUE INDEX product_print_positions_product_id_position_index_key ON public.product_print_positions USING btree (product_id, position_index)` |


## Policies (RLS)

### `product_print_positions_read_all`

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
