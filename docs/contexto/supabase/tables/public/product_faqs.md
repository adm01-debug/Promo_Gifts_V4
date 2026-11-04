# public.product_faqs

> Perguntas frequentes para SEO (FAQ Schema) e citação por IAs. Podem ser por produto, categoria ou gerais.

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
| 2 | `product_id` | `uuid` | sim |  |  |  |
| 3 | `category_id` | `uuid` | sim |  |  |  |
| 4 | `faq_scope` | `text` | não | `'general'::text` |  |  |
| 5 | `question` | `text` | não |  |  |  |
| 6 | `answer` | `text` | não |  |  |  |
| 7 | `answer_html` | `text` | sim |  |  |  |
| 8 | `keywords` | `text[]` | sim |  |  |  |
| 9 | `display_order` | `integer` | sim | `0` |  |  |
| 10 | `is_featured` | `boolean` | sim | `false` |  |  |
| 11 | `is_active` | `boolean` | sim | `true` |  |  |
| 12 | `view_count` | `integer` | sim | `0` |  |  |
| 13 | `helpful_count` | `integer` | sim | `0` |  |  |
| 14 | `not_helpful_count` | `integer` | sim | `0` |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_faqs_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_faqs_faq_scope_check | CHECK | `CHECK (faq_scope = ANY (ARRAY['product'::text, 'category'::text, 'general'::text, 'personalization'::text, 'shipping'::text, 'payment'::text]))` |  |  | sim |
| product_faqs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_faqs_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_faqs_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_product_faqs_category_id ON public.product_faqs USING btree (category_id)` |
| idx_product_faqs_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_product_faqs_product_id ON public.product_faqs USING btree (product_id)` |
| product_faqs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_faqs_pkey ON public.product_faqs USING btree (id)` |


## Policies (RLS)

### `product_faqs_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_active = true)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_product_faqs_updated | BEFORE | UPDATE | ROW | enabled | public.trg_product_faqs_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
