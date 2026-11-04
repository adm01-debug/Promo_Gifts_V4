# supplier_stricker.optionals

> Variantes de produtos Stricker (40k+ SKUs)

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
| 2 | `sku` | `character varying(30)` | não |  |  | SKU único da variante (ex: 92568-128) |
| 3 | `web_sku` | `character varying(30)` | sim |  |  |  |
| 4 | `prod_reference` | `character varying(20)` | não |  |  |  |
| 5 | `color_code` | `character varying(10)` | sim |  |  |  |
| 6 | `color_name` | `character varying(100)` | sim |  |  |  |
| 7 | `color_hex` | `character varying(10)` | sim |  |  |  |
| 8 | `size` | `character varying(20)` | sim |  |  |  |
| 9 | `capacity` | `character varying(50)` | sim |  |  |  |
| 10 | `min_qty_1` | `integer` | sim | `1` |  |  |
| 11 | `price_1` | `numeric(10,2)` | sim |  |  | Preço em BRL para quantidade mínima 1 |
| 12 | `min_qty_2` | `integer` | sim |  |  |  |
| 13 | `price_2` | `numeric(10,2)` | sim |  |  |  |
| 14 | `min_qty_3` | `integer` | sim |  |  |  |
| 15 | `price_3` | `numeric(10,2)` | sim |  |  |  |
| 16 | `min_qty_4` | `integer` | sim |  |  |  |
| 17 | `price_4` | `numeric(10,2)` | sim |  |  |  |
| 18 | `min_qty_5` | `integer` | sim |  |  |  |
| 19 | `price_5` | `numeric(10,2)` | sim |  |  |  |
| 20 | `image_1` | `text` | sim |  |  |  |
| 21 | `image_2` | `text` | sim |  |  |  |
| 22 | `image_3` | `text` | sim |  |  |  |
| 23 | `image_4` | `text` | sim |  |  |  |
| 24 | `image_5` | `text` | sim |  |  |  |
| 25 | `image_6` | `text` | sim |  |  |  |
| 26 | `image_7` | `text` | sim |  |  |  |
| 27 | `is_active` | `boolean` | sim | `true` |  |  |
| 28 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 29 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 30 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 31 | `location_image_1` | `text` | sim |  |  |  |
| 32 | `location_image_2` | `text` | sim |  |  |  |
| 33 | `location_image_3` | `text` | sim |  |  |  |
| 34 | `location_image_4` | `text` | sim |  |  |  |
| 35 | `location_image_5` | `text` | sim |  |  |  |
| 36 | `location_image_6` | `text` | sim |  |  |  |
| 37 | `location_image_7` | `text` | sim |  |  |  |
| 38 | `location_image_8` | `text` | sim |  |  |  |
| 39 | `area_image_1` | `text` | sim |  |  |  |
| 40 | `area_image_2` | `text` | sim |  |  |  |
| 41 | `area_image_3` | `text` | sim |  |  |  |
| 42 | `area_image_4` | `text` | sim |  |  |  |
| 43 | `area_image_5` | `text` | sim |  |  |  |
| 44 | `area_image_6` | `text` | sim |  |  |  |
| 45 | `area_image_7` | `text` | sim |  |  |  |
| 46 | `area_image_8` | `text` | sim |  |  |  |
| 47 | `component_image_1` | `text` | sim |  |  |  |
| 48 | `component_image_2` | `text` | sim |  |  |  |
| 49 | `component_image_3` | `text` | sim |  |  |  |
| 50 | `component_image_4` | `text` | sim |  |  |  |
| 51 | `component_image_5` | `text` | sim |  |  |  |
| 52 | `component_image_6` | `text` | sim |  |  |  |
| 53 | `component_image_7` | `text` | sim |  |  |  |
| 54 | `component_image_8` | `text` | sim |  |  |  |
| 55 | `box_image` | `text` | sim |  |  |  |
| 56 | `bag_image` | `text` | sim |  |  |  |
| 57 | `pouch_image` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fk_optionals_product | FOREIGN KEY | `FOREIGN KEY (prod_reference) REFERENCES supplier_stricker.products(prod_reference) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| optionals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| optionals_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| supplier_stricker.stocks | fk_stocks_optional | sku | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_stricker_optionals_active | btree | is_active | não | sim |  | `CREATE INDEX idx_stricker_optionals_active ON supplier_stricker.optionals USING btree (is_active)` |
| idx_stricker_optionals_color | btree | color_code | não | sim |  | `CREATE INDEX idx_stricker_optionals_color ON supplier_stricker.optionals USING btree (color_code)` |
| idx_stricker_optionals_ref | btree | prod_reference | não | sim |  | `CREATE INDEX idx_stricker_optionals_ref ON supplier_stricker.optionals USING btree (prod_reference)` |
| idx_stricker_optionals_size | btree | size | não | sim |  | `CREATE INDEX idx_stricker_optionals_size ON supplier_stricker.optionals USING btree (size)` |
| idx_stricker_optionals_synced | btree | synced_at | não | sim |  | `CREATE INDEX idx_stricker_optionals_synced ON supplier_stricker.optionals USING btree (synced_at)` |
| idx_stricker_optionals_websku | btree | web_sku | não | sim |  | `CREATE INDEX idx_stricker_optionals_websku ON supplier_stricker.optionals USING btree (web_sku)` |
| optionals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX optionals_pkey ON supplier_stricker.optionals USING btree (id)` |
| optionals_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX optionals_sku_key ON supplier_stricker.optionals USING btree (sku)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_optionals_updated | BEFORE | UPDATE | ROW | enabled | supplier_stricker.update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
