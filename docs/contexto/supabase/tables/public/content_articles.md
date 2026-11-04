# public.content_articles

> SEO M5 (2026-06-27): Artigos de blog para Topical Authority.
Documentada em DOC_MODULO_SEO_COMPLETO.md como "content_articles" mas nunca criada.
fix_version: seo_content_articles_v1_20260627
Lovable bot: NÃO alterar constraints de status nem remover RLS policies.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `title` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `content` | `text` | sim |  |  |  |
| 5 | `excerpt` | `text` | sim |  |  |  |
| 6 | `status` | `text` | não | `'draft'::text` |  |  |
| 7 | `published_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `author_id` | `uuid` | sim |  |  |  |
| 9 | `category_slug` | `text` | sim |  |  |  |
| 10 | `featured_image_url` | `text` | sim |  |  |  |
| 11 | `meta_title` | `text` | sim |  |  |  |
| 12 | `meta_description` | `text` | sim |  |  |  |
| 13 | `schema_json` | `jsonb` | sim |  |  |  |
| 14 | `tags` | `text[]` | sim |  |  |  |
| 15 | `view_count` | `integer` | não | `0` |  |  |
| 16 | `read_time_minutes` | `integer` | sim |  |  |  |
| 17 | `seo_score` | `integer` | sim | `0` |  |  |
| 18 | `is_deleted` | `boolean` | não | `false` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| content_articles_author_id_fkey | FOREIGN KEY | `FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| content_articles_meta_description_check | CHECK | `CHECK (meta_description IS NULL OR length(meta_description) >= 50 AND length(meta_description) <= 170)` |  |  | sim |
| content_articles_meta_title_check | CHECK | `CHECK (meta_title IS NULL OR length(meta_title) >= 10 AND length(meta_title) <= 70)` |  |  | sim |
| content_articles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| content_articles_seo_score_check | CHECK | `CHECK (seo_score >= 0 AND seo_score <= 100)` |  |  | sim |
| content_articles_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |
| content_articles_status_check | CHECK | `CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| content_articles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX content_articles_pkey ON public.content_articles USING btree (id)` |
| content_articles_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX content_articles_slug_key ON public.content_articles USING btree (slug)` |
| idx_content_articles_author_id | btree | author_id | não | sim |  | `CREATE INDEX idx_content_articles_author_id ON public.content_articles USING btree (author_id)` |
| idx_content_articles_category | btree | category_slug | não | sim | `((status = 'published'::text) AND (is_deleted = false))` | `CREATE INDEX idx_content_articles_category ON public.content_articles USING btree (category_slug) WHERE ((status = 'published'::text) AND (is_deleted = false))` |


## Policies (RLS)

### `content_articles_anon_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `((status = 'published'::text) AND (is_deleted = false))` |
| WITH CHECK |  |

### `content_articles_author_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `content_articles_author_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `content_articles_author_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_content_articles_set_updated_at | BEFORE | UPDATE | ROW | enabled | public.trg_content_articles_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
