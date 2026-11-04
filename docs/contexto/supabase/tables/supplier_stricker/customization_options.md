# supplier_stricker.customization_options

> Opções de personalização/gravação por produto

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | não |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | supplier_stricker.v_customization_by_technique |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `serv_code` | `character varying(50)` | não |  |  | Código de serviço único (ex: 92568.1.1.TRS1-01-01) |
| 3 | `prod_reference` | `character varying(20)` | não |  |  |  |
| 4 | `component_code` | `character varying(10)` | sim |  |  |  |
| 5 | `component_name` | `character varying(100)` | sim |  |  |  |
| 6 | `location_code` | `character varying(10)` | sim |  |  |  |
| 7 | `location_name` | `character varying(100)` | sim |  |  |  |
| 8 | `technique_code` | `character varying(10)` | sim |  |  | Código técnica: TRS1, SER1, LAS1, BOR1, PDP1, UV1, SUB1, DTF1 |
| 9 | `technique_name` | `character varying(100)` | sim |  |  |  |
| 10 | `area_code` | `character varying(10)` | sim |  |  |  |
| 11 | `area_width_cm` | `numeric(6,2)` | sim |  |  |  |
| 12 | `area_height_cm` | `numeric(6,2)` | sim |  |  |  |
| 13 | `max_colors` | `integer` | sim |  |  |  |
| 14 | `price` | `numeric(10,2)` | sim |  |  |  |
| 15 | `printing_lines_image` | `text` | sim |  |  |  |
| 16 | `component_image` | `text` | sim |  |  |  |
| 17 | `location_image` | `text` | sim |  |  |  |
| 18 | `area_image` | `text` | sim |  |  |  |
| 19 | `composed_location_image` | `text` | sim |  |  |  |
| 20 | `is_active` | `boolean` | sim | `true` |  |  |
| 21 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customization_options_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| customization_options_serv_code_key | UNIQUE | `UNIQUE (serv_code)` |  |  | sim |
| fk_customization_product | FOREIGN KEY | `FOREIGN KEY (prod_reference) REFERENCES supplier_stricker.products(prod_reference) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customization_options_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX customization_options_pkey ON supplier_stricker.customization_options USING btree (id)` |
| customization_options_serv_code_key | btree | serv_code | sim | sim |  | `CREATE UNIQUE INDEX customization_options_serv_code_key ON supplier_stricker.customization_options USING btree (serv_code)` |
| idx_stricker_custom_active | btree | is_active | não | sim |  | `CREATE INDEX idx_stricker_custom_active ON supplier_stricker.customization_options USING btree (is_active)` |
| idx_stricker_custom_ref | btree | prod_reference | não | sim |  | `CREATE INDEX idx_stricker_custom_ref ON supplier_stricker.customization_options USING btree (prod_reference)` |
| idx_stricker_custom_tech | btree | technique_code | não | sim |  | `CREATE INDEX idx_stricker_custom_tech ON supplier_stricker.customization_options USING btree (technique_code)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_customization_options_updated | BEFORE | UPDATE | ROW | enabled | supplier_stricker.update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
