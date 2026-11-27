# public.quote_comments

> Quote-scoped internal comments. Visibility inherits quotes RLS; mutations require authorship. Root comments with replies cannot be deleted.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `parent_id` | `uuid` | sim |  |  |  |
| 5 | `content` | `text` | não |  |  |  |
| 6 | `is_edited` | `boolean` | não | `false` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_comments_content_length_check | CHECK | `CHECK (char_length(btrim(content)) >= 1 AND char_length(btrim(content)) <= 5000)` |  |  | sim |
| quote_comments_id_quote_id_key | UNIQUE | `UNIQUE (id, quote_id)` |  |  | sim |
| quote_comments_not_self_parent_check | CHECK | `CHECK (parent_id IS DISTINCT FROM id)` |  |  | sim |
| quote_comments_parent_quote_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id, quote_id) REFERENCES quote_comments(id, quote_id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| quote_comments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_comments_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_comments_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quote_comments | quote_comments_parent_quote_fkey | quote_id, parent_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_quote_comments_parent_id_quote_id | btree | parent_id, quote_id | não | sim |  | `CREATE INDEX idx_fk_quote_comments_parent_id_quote_id ON public.quote_comments USING btree (parent_id, quote_id)` |
| quote_comments_id_quote_id_key | btree | id, quote_id | sim | sim |  | `CREATE UNIQUE INDEX quote_comments_id_quote_id_key ON public.quote_comments USING btree (id, quote_id)` |
| quote_comments_parent_quote_idx | btree | parent_id, quote_id | não | sim | `(parent_id IS NOT NULL)` | `CREATE INDEX quote_comments_parent_quote_idx ON public.quote_comments USING btree (parent_id, quote_id) WHERE (parent_id IS NOT NULL)` |
| quote_comments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_comments_pkey ON public.quote_comments USING btree (id)` |
| quote_comments_quote_created_id_idx | btree | quote_id, created_at, id | não | sim |  | `CREATE INDEX quote_comments_quote_created_id_idx ON public.quote_comments USING btree (quote_id, created_at, id)` |
| quote_comments_user_id_idx | btree | user_id | não | sim |  | `CREATE INDEX quote_comments_user_id_idx ON public.quote_comments USING btree (user_id)` |


## Policies (RLS)

### `quote_comments_delete_own_visible_quote`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (q.id = quote_comments.quote_id))))` |
| WITH CHECK |  |

### `quote_comments_insert_own_visible_quote`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (q.id = quote_comments.quote_id))))` |

### `quote_comments_select_visible_quote`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (q.id = quote_comments.quote_id))))` |
| WITH CHECK |  |

### `quote_comments_update_own_visible_quote`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (q.id = quote_comments.quote_id))))` |
| WITH CHECK | `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (q.id = quote_comments.quote_id))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| quote_comments_enforce_mutation | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_quote_comment_mutation |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
