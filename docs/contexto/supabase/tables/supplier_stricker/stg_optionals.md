# supplier_stricker.stg_optionals

> Staging de variantes/opcionais da API Stricker

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
| 2 | `prod_reference` | `character varying(50)` | não |  |  |  |
| 3 | `sku` | `character varying(50)` | não |  |  |  |
| 4 | `web_sku` | `character varying(50)` | sim |  |  |  |
| 5 | `color_code` | `character varying(20)` | sim |  |  |  |
| 6 | `color_name` | `character varying(100)` | sim |  |  |  |
| 7 | `color_hex` | `character varying(7)` | sim |  |  |  |
| 8 | `size` | `character varying(50)` | sim |  |  |  |
| 9 | `capacity` | `character varying(50)` | sim |  |  |  |
| 10 | `min_qt_1` | `integer` | sim |  |  |  |
| 11 | `price_1` | `numeric(10,4)` | sim |  |  |  |
| 12 | `min_qt_2` | `integer` | sim |  |  |  |
| 13 | `price_2` | `numeric(10,4)` | sim |  |  |  |
| 14 | `min_qt_3` | `integer` | sim |  |  |  |
| 15 | `price_3` | `numeric(10,4)` | sim |  |  |  |
| 16 | `min_qt_4` | `integer` | sim |  |  |  |
| 17 | `price_4` | `numeric(10,4)` | sim |  |  |  |
| 18 | `min_qt_5` | `integer` | sim |  |  |  |
| 19 | `price_5` | `numeric(10,4)` | sim |  |  |  |
| 20 | `image_1` | `text` | sim |  |  |  |
| 21 | `image_2` | `text` | sim |  |  |  |
| 22 | `image_3` | `text` | sim |  |  |  |
| 23 | `image_4` | `text` | sim |  |  |  |
| 24 | `image_5` | `text` | sim |  |  |  |
| 25 | `image_6` | `text` | sim |  |  |  |
| 26 | `image_7` | `text` | sim |  |  |  |
| 27 | `raw_json` | `jsonb` | sim |  |  |  |
| 28 | `processed` | `boolean` | sim | `false` |  |  |
| 29 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 30 | `error_message` | `text` | sim |  |  |  |
| 31 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 32 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_optionals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_optionals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_optionals_pkey ON supplier_stricker.stg_optionals USING btree (id)` |
| stg_optionals_processed_idx | btree | processed | não | sim |  | `CREATE INDEX stg_optionals_processed_idx ON supplier_stricker.stg_optionals USING btree (processed)` |
| stg_optionals_prod_reference_idx | btree | prod_reference | não | sim |  | `CREATE INDEX stg_optionals_prod_reference_idx ON supplier_stricker.stg_optionals USING btree (prod_reference)` |
| stg_optionals_unique_idx | btree | prod_reference, sku | sim | sim |  | `CREATE UNIQUE INDEX stg_optionals_unique_idx ON supplier_stricker.stg_optionals USING btree (prod_reference, sku)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
