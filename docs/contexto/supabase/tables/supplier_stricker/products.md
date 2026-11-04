# supplier_stricker.products

> Produtos principais da Stricker (8k+ produtos)

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
| usada por views | supplier_stricker.v_images_by_product, supplier_stricker.v_products_complete, supplier_stricker.v_stock_by_product |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `prod_reference` | `character varying(20)` | não |  |  | Referência única do produto Stricker (ex: 92568) |
| 3 | `name` | `character varying(500)` | sim |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `short_description` | `character varying(500)` | sim |  |  |  |
| 6 | `has_colors` | `boolean` | sim | `false` |  |  |
| 7 | `has_sizes` | `boolean` | sim | `false` |  |  |
| 8 | `has_capacity` | `boolean` | sim | `false` |  |  |
| 9 | `is_textil` | `boolean` | sim | `false` |  |  |
| 10 | `combined_sizes` | `character varying(100)` | sim |  |  |  |
| 11 | `gender` | `character varying(20)` | sim |  |  |  |
| 12 | `box_length_mm` | `integer` | sim |  |  |  |
| 13 | `box_width_mm` | `integer` | sim |  |  |  |
| 14 | `box_height_mm` | `integer` | sim |  |  |  |
| 15 | `box_weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 16 | `product_weight_g` | `integer` | sim |  |  |  |
| 17 | `type_code` | `character varying(10)` | sim |  |  |  |
| 18 | `type_name` | `character varying(100)` | sim |  |  |  |
| 19 | `subtype_code` | `character varying(10)` | sim |  |  |  |
| 20 | `subtype_name` | `character varying(100)` | sim |  |  |  |
| 21 | `brand` | `character varying(50)` | sim |  |  | Marca: BRANVE, EKSTON, SUCO ou NULL |
| 22 | `is_stockout` | `boolean` | sim | `false` |  | Produto do catálogo Stockout (descontinuado) |
| 23 | `is_online_exclusive` | `boolean` | sim | `false` |  |  |
| 24 | `catalog_page` | `integer` | sim |  |  |  |
| 25 | `main_image` | `text` | sim |  |  |  |
| 26 | `optional_image_1` | `text` | sim |  |  |  |
| 27 | `optional_image_2` | `text` | sim |  |  |  |
| 28 | `is_active` | `boolean` | sim | `true` |  |  |
| 29 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 30 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 31 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 32 | `video_link` | `text` | sim |  |  |  |
| 33 | `video_link_vimeo` | `text` | sim |  |  |  |
| 34 | `video_360` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| products_prod_reference_key | UNIQUE | `UNIQUE (prod_reference)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| supplier_stricker.customization_options | fk_customization_product | prod_reference | CASCADE |
| supplier_stricker.optionals | fk_optionals_product | prod_reference | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX products_pkey ON supplier_stricker.products USING btree (id)` |
| products_prod_reference_key | btree | prod_reference | sim | sim |  | `CREATE UNIQUE INDEX products_prod_reference_key ON supplier_stricker.products USING btree (prod_reference)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_products_updated | BEFORE | UPDATE | ROW | enabled | supplier_stricker.update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
