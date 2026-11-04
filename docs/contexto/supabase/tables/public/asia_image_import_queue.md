# public.asia_image_import_queue

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
| 2 | `codigo_pai` | `text` | não |  |  |  |
| 3 | `url_original` | `text` | não |  |  |  |
| 4 | `cf_image_id_canonical` | `text` | não |  |  |  |
| 5 | `image_type` | `text` | não |  |  |  |
| 6 | `display_order` | `integer` | não | `1` |  |  |
| 7 | `product_id` | `uuid` | sim |  |  |  |
| 8 | `status` | `text` | não | `'pending'::text` |  |  |
| 9 | `attempts` | `integer` | não | `0` |  |  |
| 10 | `last_error` | `text` | sim |  |  |  |
| 11 | `cloudflare_image_id` | `text` | sim |  |  |  |
| 12 | `cf_url_cdn` | `text` | sim |  |  |  |
| 13 | `cf_filename` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `variant_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| asia_image_import_queue_image_type_check | CHECK | `CHECK (image_type = ANY (ARRAY['main'::text, 'gallery'::text]))` |  |  | sim |
| asia_image_import_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| asia_image_import_queue_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id)` | NO ACTION | NO ACTION | sim |
| asia_image_import_queue_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'uploading'::text, 'done'::text, 'error'::text, 'skipped'::text]))` |  |  | sim |
| asia_image_import_queue_url_original_key | UNIQUE | `UNIQUE (url_original)` |  |  | sim |
| asia_image_import_queue_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| asia_image_import_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX asia_image_import_queue_pkey ON public.asia_image_import_queue USING btree (id)` |
| asia_image_import_queue_url_original_key | btree | url_original | sim | sim |  | `CREATE UNIQUE INDEX asia_image_import_queue_url_original_key ON public.asia_image_import_queue USING btree (url_original)` |
| idx_aiq_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` | `CREATE INDEX idx_aiq_variant_id ON public.asia_image_import_queue USING btree (variant_id) WHERE (variant_id IS NOT NULL)` |
| idx_asia_img_queue_product | btree | product_id | não | sim |  | `CREATE INDEX idx_asia_img_queue_product ON public.asia_image_import_queue USING btree (product_id)` |
| idx_asia_img_queue_status | btree | status | não | sim |  | `CREATE INDEX idx_asia_img_queue_status ON public.asia_image_import_queue USING btree (status)` |


## Policies (RLS)

### `rls_infra_deny_public`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
