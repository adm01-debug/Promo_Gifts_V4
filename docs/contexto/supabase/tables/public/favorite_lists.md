# public.favorite_lists

> Listas de favoritos por usuário. Cada user tem 1 lista default automática (criada via ensure_default_favorite_list). Suporta compartilhamento via shared_token com TTL.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `color` | `text` | não | `'#3B82F6'::text` |  |  |
| 6 | `icon` | `text` | não | `'Heart'::text` |  |  |
| 7 | `is_default` | `boolean` | não | `false` |  |  |
| 8 | `is_archived` | `boolean` | não | `false` |  |  |
| 9 | `client_id` | `uuid` | sim |  |  |  |
| 10 | `client_name` | `text` | sim |  |  |  |
| 11 | `shared_token` | `text` | sim |  |  |  |
| 12 | `shared_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `position` | `integer` | não | `0` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_lists_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| favorite_lists_shared_token_key | UNIQUE | `UNIQUE (shared_token)` |  |  | sim |
| favorite_lists_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.favorite_item_reactions | favorite_item_reactions_list_id_fkey | list_id | CASCADE |
| public.favorite_items | favorite_items_list_id_fkey | list_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_lists_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_lists_pkey ON public.favorite_lists USING btree (id)` |
| favorite_lists_shared_token_key | btree | shared_token | sim | sim |  | `CREATE UNIQUE INDEX favorite_lists_shared_token_key ON public.favorite_lists USING btree (shared_token)` |
| idx_favorite_lists_user | btree | user_id, is_archived, position | não | sim |  | `CREATE INDEX idx_favorite_lists_user ON public.favorite_lists USING btree (user_id, is_archived, "position")` |
| uniq_favorite_lists_one_default_per_user | btree | user_id | sim | sim | `(is_default = true)` | `CREATE UNIQUE INDEX uniq_favorite_lists_one_default_per_user ON public.favorite_lists USING btree (user_id) WHERE (is_default = true)` |


## Policies (RLS)

### `fl_anon_select_via_token`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `((shared_token IS NOT NULL) AND ((shared_expires_at IS NULL) OR (shared_expires_at > now())) AND (is_archived = false))` |
| WITH CHECK |  |

### `fl_delete_own_or_coord`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `fl_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `fl_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `fl_update_own`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fl_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
