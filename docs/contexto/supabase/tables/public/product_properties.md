# public.product_properties

> Relacionamento entre produtos e suas propriedades

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_product_properties_public, public.vw_products_by_property_category, public.vw_products_with_properties, public.vw_property_statistics, public.vw_thermal_products |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `property_definition_id` | `uuid` | sim |  |  |  |
| 4 | `property_code` | `text` | não |  |  | Código da propriedade (redundância para performance) |
| 5 | `property_value` | `text` | sim |  |  | Valor quando aplicável (ex: tempo em horas) |
| 6 | `source` | `text` | sim | `'api_spot'::text` |  | Origem: api_spot, manual, inferred |
| 7 | `raw_value` | `text` | sim |  |  | Valor original da API |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_properties_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_properties_product_definition_unique | UNIQUE | `UNIQUE (product_id, property_definition_id)` |  |  | sim |
| product_properties_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_properties_product_id_property_code_key | UNIQUE | `UNIQUE (product_id, property_code)` |  |  | sim |
| product_properties_property_definition_id_fkey | FOREIGN KEY | `FOREIGN KEY (property_definition_id) REFERENCES property_definitions(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_properties_property_definition_id | btree | property_definition_id | não | sim |  | `CREATE INDEX idx_product_properties_property_definition_id ON public.product_properties USING btree (property_definition_id)` |
| idx_product_properties_source | btree | source | não | sim |  | `CREATE INDEX idx_product_properties_source ON public.product_properties USING btree (source)` |
| product_properties_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_properties_pkey ON public.product_properties USING btree (id)` |
| product_properties_product_definition_unique | btree | product_id, property_definition_id | sim | sim |  | `CREATE UNIQUE INDEX product_properties_product_definition_unique ON public.product_properties USING btree (product_id, property_definition_id)` |
| product_properties_product_id_property_code_key | btree | product_id, property_code | sim | sim |  | `CREATE UNIQUE INDEX product_properties_product_id_property_code_key ON public.product_properties USING btree (product_id, property_code)` |


## Policies (RLS)

### `auth_read_product_properties`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_properties_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `fn_product_active_for_rls(product_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
