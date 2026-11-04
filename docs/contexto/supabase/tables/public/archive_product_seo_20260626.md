# public._archive_product_seo_20260626

> Backup de product_seo (casca morta removida em 2026-06-26, MELHORIA 1+2 medallion). Retencao ate ~2026-09-26.

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
| 1 | `product_id` | `uuid` | não |  |  |  |
| 2 | `meta_title` | `text` | sim |  |  |  |
| 3 | `meta_description` | `text` | sim |  |  |  |
| 4 | `meta_keywords` | `text[]` | sim |  |  |  |
| 5 | `schema_json` | `jsonb` | sim |  |  |  |
| 6 | `canonical_url` | `text` | sim |  |  |  |
| 7 | `robots_meta` | `text` | sim |  |  |  |
| 8 | `seo_score` | `integer` | sim |  |  |  |
| 9 | `seo_last_audit_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `seo_issues` | `jsonb` | sim |  |  |  |
| 11 | `og_title` | `text` | sim |  |  |  |
| 12 | `og_description` | `text` | sim |  |  |  |
| 13 | `og_image_url` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| archive_product_seo_pkey | PRIMARY KEY | `PRIMARY KEY (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| archive_product_seo_pkey | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX archive_product_seo_pkey ON public._archive_product_seo_20260626 USING btree (product_id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
