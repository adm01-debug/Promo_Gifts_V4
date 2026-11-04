# supplier_stricker.customization_tables

> Tabelas de preços de personalização por técnica e área

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `table_code` | `character varying(30)` | não |  |  |  |
| 3 | `technique_code` | `character varying(10)` | sim |  |  |  |
| 4 | `technique_name` | `character varying(100)` | sim |  |  |  |
| 5 | `area_min_cm2` | `numeric(8,2)` | sim |  |  |  |
| 6 | `area_max_cm2` | `numeric(8,2)` | sim |  |  |  |
| 7 | `colors` | `integer` | sim |  |  |  |
| 8 | `min_qty_1` | `integer` | sim | `1` |  |  |
| 9 | `price_1` | `numeric(10,2)` | sim |  |  |  |
| 10 | `min_qty_2` | `integer` | sim |  |  |  |
| 11 | `price_2` | `numeric(10,2)` | sim |  |  |  |
| 12 | `min_qty_3` | `integer` | sim |  |  |  |
| 13 | `price_3` | `numeric(10,2)` | sim |  |  |  |
| 14 | `min_qty_4` | `integer` | sim |  |  |  |
| 15 | `price_4` | `numeric(10,2)` | sim |  |  |  |
| 16 | `min_qty_5` | `integer` | sim |  |  |  |
| 17 | `price_5` | `numeric(10,2)` | sim |  |  |  |
| 18 | `setup_price` | `numeric(10,2)` | sim |  |  | Custo de setup/clichê para a técnica |
| 19 | `handling_price` | `numeric(10,2)` | sim |  |  | Custo de manuseio por unidade |
| 20 | `is_active` | `boolean` | sim | `true` |  |  |
| 21 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 23 | `min_qty_6` | `integer` | sim |  |  |  |
| 24 | `price_6` | `numeric(10,2)` | sim |  |  |  |
| 25 | `min_qty_7` | `integer` | sim |  |  |  |
| 26 | `price_7` | `numeric(10,2)` | sim |  |  |  |
| 27 | `min_qty_8` | `integer` | sim |  |  |  |
| 28 | `price_8` | `numeric(10,2)` | sim |  |  |  |
| 29 | `min_qty_9` | `integer` | sim |  |  |  |
| 30 | `price_9` | `numeric(10,2)` | sim |  |  |  |
| 31 | `min_qty_10` | `integer` | sim |  |  |  |
| 32 | `price_10` | `numeric(10,2)` | sim |  |  |  |
| 33 | `min_qty_11` | `integer` | sim |  |  |  |
| 34 | `price_11` | `numeric(10,2)` | sim |  |  |  |
| 35 | `min_qty_12` | `integer` | sim |  |  |  |
| 36 | `price_12` | `numeric(10,2)` | sim |  |  |  |
| 37 | `min_qty_13` | `integer` | sim |  |  |  |
| 38 | `price_13` | `numeric(10,2)` | sim |  |  |  |
| 39 | `min_qty_14` | `integer` | sim |  |  |  |
| 40 | `price_14` | `numeric(10,2)` | sim |  |  |  |
| 41 | `min_qty_15` | `integer` | sim |  |  |  |
| 42 | `price_15` | `numeric(10,2)` | sim |  |  |  |
| 43 | `sla_1` | `integer` | sim |  |  |  |
| 44 | `sla_2` | `integer` | sim |  |  |  |
| 45 | `sla_3` | `integer` | sim |  |  |  |
| 46 | `sla_4` | `integer` | sim |  |  |  |
| 47 | `sla_5` | `integer` | sim |  |  |  |
| 48 | `sla_6` | `integer` | sim |  |  |  |
| 49 | `sla_7` | `integer` | sim |  |  |  |
| 50 | `sla_8` | `integer` | sim |  |  |  |
| 51 | `sla_9` | `integer` | sim |  |  |  |
| 52 | `sla_10` | `integer` | sim |  |  |  |
| 53 | `sla_11` | `integer` | sim |  |  |  |
| 54 | `sla_12` | `integer` | sim |  |  |  |
| 55 | `sla_13` | `integer` | sim |  |  |  |
| 56 | `sla_14` | `integer` | sim |  |  |  |
| 57 | `sla_15` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customization_tables_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| customization_tables_table_code_key | UNIQUE | `UNIQUE (table_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customization_tables_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX customization_tables_pkey ON supplier_stricker.customization_tables USING btree (id)` |
| customization_tables_table_code_key | btree | table_code | sim | sim |  | `CREATE UNIQUE INDEX customization_tables_table_code_key ON supplier_stricker.customization_tables USING btree (table_code)` |
| idx_stricker_tables_active | btree | is_active | não | sim |  | `CREATE INDEX idx_stricker_tables_active ON supplier_stricker.customization_tables USING btree (is_active)` |
| idx_stricker_tables_tech | btree | technique_code | não | sim |  | `CREATE INDEX idx_stricker_tables_tech ON supplier_stricker.customization_tables USING btree (technique_code)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_customization_tables_updated | BEFORE | UPDATE | ROW | enabled | supplier_stricker.update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
