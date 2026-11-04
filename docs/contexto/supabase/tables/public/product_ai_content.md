# public.product_ai_content

> [fix_version:satellite_ai_20260627] Satélite 1:1 de conteúdo gerado por AI.
 Colunas: ai_title, ai_description, ai_summary, ai_version, ai_model, ai_generated_at.
 Colunas extras para roadmap: key_benefits[], use_cases[], ai_keywords[].
 Sincronizado por trg_sync_product_ai_content.

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
| 3 | `ai_title` | `text` | sim |  |  |  |
| 4 | `ai_description` | `text` | sim |  |  |  |
| 5 | `ai_summary` | `text` | sim |  |  |  |
| 6 | `ai_version` | `integer` | sim | `0` |  |  |
| 7 | `ai_model` | `character varying(100)` | sim |  |  |  |
| 8 | `ai_generated_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `key_benefits` | `text[]` | sim |  |  |  |
| 10 | `use_cases` | `text[]` | sim |  |  |  |
| 11 | `ai_keywords` | `text[]` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_ai_content_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_ai_content_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_ai_content_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_ai_content_version | btree | ai_version | não | sim |  | `CREATE INDEX idx_product_ai_content_version ON public.product_ai_content USING btree (ai_version DESC NULLS LAST)` |
| product_ai_content_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_ai_content_pkey ON public.product_ai_content USING btree (id)` |
| product_ai_content_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_ai_content_product_id_key ON public.product_ai_content USING btree (product_id)` |


## Policies (RLS)

### `product_ai_content_authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_ai_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `rls_restrictive_product_ai_content`

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
