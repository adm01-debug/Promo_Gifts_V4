# public.sm_category_pages

> Páginas de categoria do site Só Marcas a serem scrapeadas para descoberta de site_ids. Cada categoria tem múltiplos produtos — scraping em batch via Jina Reader.

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `category_id` | `integer` | sim |  |  |  |
| 5 | `site_url` | `text` | sim | ` CASE     WHEN (category_id IS NOT NULL) THEN ((('https://www.somarcas.com.br/'::text \|\| (category_id)::text) \|\| '/categorias/'::text) \|\| slug)     ELSE NULL::text END` | s |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `fetch_req_id` | `bigint` | sim |  |  |  |
| 8 | `attempts` | `integer` | não | `0` |  |  |
| 9 | `last_error` | `text` | sim |  |  |  |
| 10 | `last_scraped_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `products_found` | `integer` | sim | `0` |  |  |
| 12 | `current_page` | `integer` | não | `1` |  |  |
| 13 | `has_more_pages` | `boolean` | não | `false` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sm_category_pages_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sm_category_pages_slug_uq | UNIQUE | `UNIQUE (slug)` |  |  | sim |
| sm_category_pages_status_chk | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'partial'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sm_category_pages_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sm_category_pages_pkey ON public.sm_category_pages USING btree (id)` |
| sm_category_pages_slug_uq | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX sm_category_pages_slug_uq ON public.sm_category_pages USING btree (slug)` |
| sm_category_pages_status_idx | btree | status | não | sim |  | `CREATE INDEX sm_category_pages_status_idx ON public.sm_category_pages USING btree (status)` |


## Policies (RLS)

### `sm_cat_auth_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `sm_cat_service_all`

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
| trg_sm_category_updated | BEFORE | UPDATE | ROW | enabled | public.fn_sm_category_set_updated |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
