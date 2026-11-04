# public.property_definitions

> Catálogo de propriedades de produtos (baseado na API SPOT)

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
| usada por views | public.vw_products_by_property_category, public.vw_products_with_properties, public.vw_property_statistics, public.vw_supplier_mapping_statistics, public.vw_thermal_products |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `code` | `text` | não |  |  | Código único normalizado da propriedade |
| 3 | `name_pt` | `text` | não |  |  | Nome em português (igual ao valor da API SPOT) |
| 4 | `name_en` | `text` | sim |  |  |  |
| 5 | `category` | `text` | não |  |  | Categoria: thermal, material, certification, feature, packaging, sustainability, writing, notebook, electronics |
| 6 | `icon_code` | `text` | sim |  |  | Código do ícone (Lucide icons) |
| 7 | `is_thermal_indicator` | `boolean` | sim | `false` |  | Se TRUE, indica que o produto é térmico |
| 8 | `is_premium_indicator` | `boolean` | sim | `false` |  |  |
| 9 | `display_order` | `integer` | sim | `0` |  |  |
| 10 | `active` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| property_definitions_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| property_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_properties | product_properties_property_definition_id_fkey | property_definition_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| property_definitions_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX property_definitions_code_key ON public.property_definitions USING btree (code)` |
| property_definitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX property_definitions_pkey ON public.property_definitions USING btree (id)` |


## Policies (RLS)

### `auth_read_property_definitions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
