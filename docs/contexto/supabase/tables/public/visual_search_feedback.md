# public.visual_search_feedback

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
| 2 | `user_id` | `uuid` | sim | `auth.uid()` |  |  |
| 3 | `image_url` | `text` | sim |  |  |  |
| 4 | `original_analysis` | `jsonb` | sim |  |  |  |
| 5 | `is_correct` | `boolean` | sim |  |  |  |
| 6 | `feedback_notes` | `text` | sim |  |  |  |
| 7 | `search_terms` | `jsonb` | sim |  |  |  |
| 8 | `product_id` | `text` | sim |  |  |  |
| 9 | `match_relevance` | `numeric` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| visual_search_feedback_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| visual_search_feedback_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_visual_search_feedback_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_visual_search_feedback_user_id ON public.visual_search_feedback USING btree (user_id)` |
| visual_search_feedback_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX visual_search_feedback_pkey ON public.visual_search_feedback USING btree (id)` |


## Policies (RLS)

### `vsf_insert_authenticated`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `vsf_select_own_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
