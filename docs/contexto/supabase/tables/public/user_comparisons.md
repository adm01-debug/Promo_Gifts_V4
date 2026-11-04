# public.user_comparisons

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `client_name` | `text` | sim |  |  |  |
| 5 | `name` | `text` | sim |  |  |  |
| 6 | `items` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `share_token` | `text` | sim |  |  |  |
| 8 | `is_public` | `boolean` | não | `false` |  |  |
| 9 | `share_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `view_count` | `integer` | não | `0` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_comparisons_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_comparisons_share_token_key | UNIQUE | `UNIQUE (share_token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_comparisons_public | btree | is_public, share_expires_at | não | sim | `(is_public = true)` | `CREATE INDEX idx_user_comparisons_public ON public.user_comparisons USING btree (is_public, share_expires_at) WHERE (is_public = true)` |
| idx_user_comparisons_user | btree | user_id, updated_at | não | sim |  | `CREATE INDEX idx_user_comparisons_user ON public.user_comparisons USING btree (user_id, updated_at DESC)` |
| user_comparisons_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_comparisons_pkey ON public.user_comparisons USING btree (id)` |
| user_comparisons_share_token_key | btree | share_token | sim | sim |  | `CREATE UNIQUE INDEX user_comparisons_share_token_key ON public.user_comparisons USING btree (share_token)` |


## Policies (RLS)

### `users_delete_own_comparisons`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |

### `users_insert_own_comparisons`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `users_select_own_comparisons`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |
| WITH CHECK |  |

### `users_update_own_comparisons`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
