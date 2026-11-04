# public.step_up_tokens

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
| 3 | `action` | `step_up_action` | não |  |  |  |
| 4 | `target_ref` | `text` | sim |  |  |  |
| 5 | `token_hash` | `text` | não |  |  |  |
| 6 | `challenge_id` | `uuid` | não |  |  |  |
| 7 | `consumed` | `boolean` | não | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `expires_at` | `timestamp with time zone` | não | `(now() + '00:05:00'::interval)` |  |  |
| 10 | `consumed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| step_up_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| step_up_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX step_up_tokens_pkey ON public.step_up_tokens USING btree (id)` |


## Policies (RLS)

### `Users can view own tokens`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |

### `step_up_tokens_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (expires_at < now())))` |
| WITH CHECK |  |

### `step_up_tokens_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `step_up_tokens_update_own`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (consumed = false) AND (expires_at > now()))` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
