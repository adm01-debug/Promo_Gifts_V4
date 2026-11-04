# public.xbz_gallery_staging

> Staging para pipeline N8N de extração de imagens gallery D1-D10 do site XBZ. Criada em 27/02/2026.

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
| 2 | `sku` | `text` | não |  |  |  |
| 3 | `d_number` | `integer` | sim |  |  |  |
| 4 | `source_url` | `text` | não |  |  |  |
| 5 | `cloudflare_image_id` | `text` | sim |  |  |  |
| 6 | `cloudflare_url` | `text` | sim |  |  |  |
| 7 | `product_id` | `uuid` | sim |  |  |  |
| 8 | `http_status` | `integer` | sim |  |  |  |
| 9 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 10 | `status` | `text` | sim | `'pending'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `variant_id` | `uuid` | sim |  |  |  |
| 15 | `supplier_id` | `uuid` | não | `'d6718a29-e954-4c1b-bd84-03ea24884900'::uuid` |  |  |
| 16 | `image_slug` | `text` | sim |  |  |  |
| 17 | `image_id_site` | `integer` | sim |  |  |  |
| 18 | `image_type` | `text` | não | `'gallery'::text` |  |  |
| 19 | `is_primary` | `boolean` | não | `false` |  |  |
| 20 | `display_order` | `integer` | não | `0` |  |  |
| 21 | `source` | `text` | não | `'site'::text` |  |  |
| 22 | `uploaded_at` | `timestamp with time zone` | sim |  |  |  |
| 23 | `product_image_id` | `uuid` | sim |  |  |  |
| 24 | `populated_at` | `timestamp with time zone` | sim |  |  |  |
| 25 | `partition_id` | `integer` | sim |  |  |  |
| 26 | `retry_count` | `integer` | não | `0` |  |  |
| 27 | `cf_custom_id` | `text` | sim |  |  |  |
| 28 | `cf_filename` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_d_number | CHECK | `CHECK (d_number IS NULL OR d_number >= 1 AND d_number <= 10)` |  |  | sim |
| chk_status | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'uploading'::text, 'uploaded'::text, 'promoted'::text, 'error'::text, 'skipped'::text]))` |  |  | sim |
| uq_xbz_staging_sku_source_url | UNIQUE | `UNIQUE (sku, source_url)` |  |  | sim |
| xbz_gallery_staging_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_xbz_staging_status | btree | status, created_at | não | sim |  | `CREATE INDEX idx_xbz_staging_status ON public.xbz_gallery_staging USING btree (status, created_at)` |
| uq_xbz_staging_cf_id | btree | cf_custom_id | sim | sim | `(cf_custom_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_xbz_staging_cf_id ON public.xbz_gallery_staging USING btree (cf_custom_id) WHERE (cf_custom_id IS NOT NULL)` |
| uq_xbz_staging_sku_source_url | btree | sku, source_url | sim | sim |  | `CREATE UNIQUE INDEX uq_xbz_staging_sku_source_url ON public.xbz_gallery_staging USING btree (sku, source_url)` |
| xbz_gallery_staging_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_gallery_staging_pkey ON public.xbz_gallery_staging USING btree (id)` |


## Policies (RLS)

### `admin_read_xbz_gallery_staging`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
