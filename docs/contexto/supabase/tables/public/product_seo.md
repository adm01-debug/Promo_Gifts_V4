# public.product_seo

> [fix_version:satellite_seo_20260627] Satélite 1:1 SEO/OG de products.
 Extrai meta_title, meta_description, meta_keywords, canonical_url, robots_meta,
 og_*, schema_json, seo_score, seo_issues. Sincronizado por trg_sync_product_seo.
 Colunas fonte em products mantidas até refactor do código frontend (DROP = sprint futuro).

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `meta_title` | `text` | sim |  |  |  |
| 4 | `meta_description` | `text` | sim |  |  |  |
| 5 | `meta_keywords` | `text[]` | sim |  |  |  |
| 6 | `canonical_url` | `text` | sim |  |  |  |
| 7 | `robots_meta` | `text` | sim | `'index, follow'::text` |  |  |
| 8 | `og_title` | `text` | sim |  |  |  |
| 9 | `og_description` | `text` | sim |  |  |  |
| 10 | `og_image_url` | `text` | sim |  |  |  |
| 11 | `schema_json` | `jsonb` | sim |  |  |  |
| 12 | `seo_score` | `integer` | sim | `0` |  |  |
| 13 | `seo_issues` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 14 | `seo_last_audit_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_seo_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_seo_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_seo_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_seo_audit | btree | seo_last_audit_at | não | sim |  | `CREATE INDEX idx_product_seo_audit ON public.product_seo USING btree (seo_last_audit_at DESC NULLS LAST)` |
| idx_product_seo_score | btree | seo_score | não | sim |  | `CREATE INDEX idx_product_seo_score ON public.product_seo USING btree (seo_score DESC)` |
| product_seo_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_seo_pkey ON public.product_seo USING btree (id)` |
| product_seo_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_seo_product_id_key ON public.product_seo USING btree (product_id)` |


## Policies (RLS)

### `product_seo_authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_seo_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `rls_restrictive_product_seo`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
