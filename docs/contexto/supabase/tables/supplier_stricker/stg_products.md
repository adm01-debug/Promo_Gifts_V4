# supplier_stricker.stg_products

> Staging de produtos da API Stricker

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
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `brand` | `character varying(50)` | sim |  |  |  |
| 6 | `type_code` | `character varying(10)` | sim |  |  |  |
| 7 | `sub_type_code` | `character varying(10)` | sim |  |  |  |
| 8 | `box_length_mm` | `integer` | sim |  |  |  |
| 9 | `box_width_mm` | `integer` | sim |  |  |  |
| 10 | `box_height_mm` | `integer` | sim |  |  |  |
| 11 | `box_weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 12 | `product_weight_g` | `integer` | sim |  |  |  |
| 13 | `has_colors` | `boolean` | sim | `false` |  |  |
| 14 | `has_sizes` | `boolean` | sim | `false` |  |  |
| 15 | `has_capacity` | `boolean` | sim | `false` |  |  |
| 16 | `is_textil` | `boolean` | sim | `false` |  |  |
| 17 | `is_stockout` | `boolean` | sim | `false` |  |  |
| 18 | `main_image` | `text` | sim |  |  |  |
| 19 | `box_image` | `text` | sim |  |  |  |
| 20 | `pouch_image` | `text` | sim |  |  |  |
| 21 | `all_image_list` | `text` | sim |  |  |  |
| 22 | `video_link` | `text` | sim |  |  |  |
| 23 | `video_link_vimeo` | `text` | sim |  |  |  |
| 24 | `video_360` | `text` | sim |  |  |  |
| 25 | `combined_sizes` | `text` | sim |  |  |  |
| 26 | `gender` | `character varying(20)` | sim |  |  |  |
| 27 | `raw_json` | `jsonb` | sim |  |  |  |
| 28 | `processed` | `boolean` | sim | `false` |  |  |
| 29 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 30 | `error_message` | `text` | sim |  |  |  |
| 31 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 32 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_products_pkey ON supplier_stricker.stg_products USING btree (id)` |
| stg_products_processed_idx | btree | processed | não | sim |  | `CREATE INDEX stg_products_processed_idx ON supplier_stricker.stg_products USING btree (processed)` |
| stg_products_prod_reference_uidx | btree | prod_reference | sim | sim |  | `CREATE UNIQUE INDEX stg_products_prod_reference_uidx ON supplier_stricker.stg_products USING btree (prod_reference)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
