# public.produtos_site_padronizacao

> Silver intermediario (DE->PARA) da VITRINE xbzbrindes (site_data do Bronze). Grao = produto-pai (CodigoAmigavel limpo). Espelha convencoes de produtos_padronizacao. Merge para Gold via promote (fase seguinte).

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
| 2 | `raw_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `supplier_reference` | `text` | não |  |  |  |
| 5 | `product_id` | `uuid` | sim |  |  |  |
| 6 | `status` | `produtos_padronizacao_status` | não | `'pending'::produtos_padronizacao_status` |  |  |
| 7 | `validation_errors` | `jsonb` | sim |  |  |  |
| 8 | `source_url` | `text` | sim |  |  |  |
| 9 | `source_hash` | `text` | sim |  |  |  |
| 10 | `scraper_version` | `text` | sim |  |  |  |
| 11 | `standardized_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `promoted_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `is_active` | `boolean` | não | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `name` | `text` | sim |  |  |  |
| 17 | `description` | `text` | sim |  |  |  |
| 18 | `usage_instructions` | `text` | sim |  |  |  |
| 19 | `supplier_internal_id` | `text` | sim |  |  |  |
| 20 | `availability` | `text` | sim |  |  |  |
| 21 | `disclaimer` | `text` | sim |  |  |  |
| 22 | `weight_g` | `integer` | sim |  |  |  |
| 23 | `height_cm` | `numeric` | sim |  |  |  |
| 24 | `width_cm` | `numeric` | sim |  |  |  |
| 25 | `depth_cm` | `numeric` | sim |  |  |  |
| 26 | `diameter_cm` | `numeric` | sim |  |  |  |
| 27 | `circumference_cm` | `numeric` | sim |  |  |  |
| 28 | `engraving_text` | `text` | sim |  |  |  |
| 29 | `engraving_length_cm` | `numeric` | sim |  |  |  |
| 30 | `engraving_width_cm` | `numeric` | sim |  |  |  |
| 31 | `engraving_location` | `text` | sim |  |  |  |
| 32 | `primary_image_url` | `text` | sim |  |  |  |
| 33 | `datasheet_pdf_url` | `text` | sim |  |  |  |
| 34 | `has_video` | `boolean` | sim |  |  |  |
| 35 | `video_platform` | `text` | sim |  |  |  |
| 36 | `video_embed_id` | `text` | sim |  |  |  |
| 37 | `video_embed_url` | `text` | sim |  |  |  |
| 38 | `video_watch_url` | `text` | sim |  |  |  |
| 39 | `images` | `jsonb` | sim |  |  |  |
| 40 | `colors` | `jsonb` | sim |  |  |  |
| 41 | `categories` | `jsonb` | sim |  |  |  |
| 42 | `related_references` | `jsonb` | sim |  |  |  |
| 43 | `has_view_360` | `boolean` | sim |  |  |  |
| 44 | `view_360_icon_url` | `text` | sim |  |  |  |
| 45 | `video_channel_url` | `text` | sim |  |  |  |
| 46 | `brand` | `text` | sim |  |  | Marca do produto (WP brands taxonomy). XBZ: null. |
| 47 | `moq` | `integer` | sim |  |  | Multiplo minimo de venda (WP add_to_cart.multiple_of). XBZ: null. |
| 48 | `min_quantity` | `integer` | sim |  |  | Quantidade minima de pedido (WP add_to_cart.minimum). XBZ: null. |
| 49 | `regular_price` | `numeric(12,2)` | sim |  |  | Preco normal/lista sem promocao (WP prices.regular_price). XBZ: null. |
| 50 | `sale_price` | `numeric(12,2)` | sim |  |  | Preco promocional (WP prices.sale_price). XBZ: null. |
| 51 | `is_on_sale` | `boolean` | sim |  |  | Produto em promocao (WP on_sale). XBZ: null. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| produtos_site_padronizacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produtos_site_padronizacao_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_site_padronizacao_raw_id_fkey | FOREIGN KEY | `FOREIGN KEY (raw_id) REFERENCES supplier_products_raw(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| uq_site_pad_supplier_ref | UNIQUE | `UNIQUE (supplier_id, supplier_reference)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_produtos_site_padronizacao_raw_id | btree | raw_id | não | sim |  | `CREATE INDEX idx_produtos_site_padronizacao_raw_id ON public.produtos_site_padronizacao USING btree (raw_id)` |
| ix_site_pad_product | btree | product_id | não | sim |  | `CREATE INDEX ix_site_pad_product ON public.produtos_site_padronizacao USING btree (product_id)` |
| ix_site_pad_status | btree | status | não | sim |  | `CREATE INDEX ix_site_pad_status ON public.produtos_site_padronizacao USING btree (status)` |
| produtos_site_padronizacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produtos_site_padronizacao_pkey ON public.produtos_site_padronizacao USING btree (id)` |
| uq_site_pad_supplier_ref | btree | supplier_id, supplier_reference | sim | sim |  | `CREATE UNIQUE INDEX uq_site_pad_supplier_ref ON public.produtos_site_padronizacao USING btree (supplier_id, supplier_reference)` |


## Policies (RLS)

### `produtos_site_padronizacao_auth_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
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
