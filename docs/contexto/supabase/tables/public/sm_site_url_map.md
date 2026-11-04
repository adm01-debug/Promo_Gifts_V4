# public.sm_site_url_map

> Mapa codigo SM → URL canônica (site_id + slug). 1230+ mapeamentos descobertos via bronze_seed, produtos_similares, related_products e category_scrape. Alimenta o SM Jina Scraping Pipeline.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `codigo` | `text` | não |  |  |  |
| 4 | `site_id` | `integer` | sim |  |  |  |
| 5 | `slug` | `text` | sim |  |  |  |
| 6 | `site_url` | `text` | sim | ` CASE     WHEN ((site_id IS NOT NULL) AND (slug IS NOT NULL)) THEN ((('https://www.somarcas.com.br/'::text \|\| (site_id)::text) \|\| '/produto/'::text) \|\| slug)     ELSE NULL::text END` | s |  |
| 7 | `source` | `text` | não | `'unknown'::text` |  |  |
| 8 | `confidence` | `text` | não | `'high'::text` |  |  |
| 9 | `discovered_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `last_verified_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `search_req_id` | `bigint` | sim |  |  |  |
| 12 | `search_status` | `text` | sim |  |  |  |
| 13 | `search_attempts` | `integer` | sim | `0` |  |  |
| 14 | `hex_color` | `text` | sim |  |  | Cor hex do produto neste mapeamento (ex.: #FFFFFF). Extraída dos produtos_similares. |
| 15 | `nome_site` | `text` | sim |  |  | Nome do produto como aparece no site SM. Extraído dos produtos_similares. |
| 16 | `validated` | `boolean` | não | `false` |  | true após 1º scrape bem-sucedido retornar dados do produto correto. |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sm_site_url_map_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sm_site_url_map_source_chk | CHECK | `CHECK (source = ANY (ARRAY['produtos_similares'::text, 'category_scrape'::text, 'jina_search'::text, 'manual'::text, 'unknown'::text, 'bronze_seed'::text, 'related_products'::text]))` |  |  | sim |
| sm_site_url_map_supplier_id_codigo_key | UNIQUE | `UNIQUE (supplier_id, codigo)` |  |  | sim |
| sm_site_url_map_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sm_url_map_no_site_id | btree | codigo | não | sim | `(site_id IS NULL)` | `CREATE INDEX idx_sm_url_map_no_site_id ON public.sm_site_url_map USING btree (codigo) WHERE (site_id IS NULL)` |
| idx_sm_url_map_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_sm_url_map_supplier_id ON public.sm_site_url_map USING btree (supplier_id)` |
| sm_site_url_map_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sm_site_url_map_pkey ON public.sm_site_url_map USING btree (id)` |
| sm_site_url_map_supplier_id_codigo_key | btree | supplier_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX sm_site_url_map_supplier_id_codigo_key ON public.sm_site_url_map USING btree (supplier_id, codigo)` |


## Policies (RLS)

### `sm_url_map_auth_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `sm_url_map_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sm_site_url_map_updated | BEFORE | UPDATE | ROW | enabled | public.fn_sm_url_map_set_updated |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
