# public.user_token_revocations

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
| 1 | `user_id` | `uuid` | não |  |  |  |
| 2 | `revoked_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `token_jti` | `text` | sim |  |  |  |
| 4 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 5 | `reason` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_token_revocations_pkey | PRIMARY KEY | `PRIMARY KEY (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_token_revocations_expires | btree | expires_at | não | sim | `(expires_at IS NOT NULL)` | `CREATE INDEX idx_token_revocations_expires ON public.user_token_revocations USING btree (expires_at) WHERE (expires_at IS NOT NULL)` |
| idx_token_revocations_jti | btree | token_jti | não | sim | `(token_jti IS NOT NULL)` | `CREATE INDEX idx_token_revocations_jti ON public.user_token_revocations USING btree (token_jti) WHERE (token_jti IS NOT NULL)` |
| idx_token_revocations_user_id | btree | user_id, revoked_at | não | sim |  | `CREATE INDEX idx_token_revocations_user_id ON public.user_token_revocations USING btree (user_id, revoked_at DESC)` |
| user_token_revocations_pkey | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX user_token_revocations_pkey ON public.user_token_revocations USING btree (user_id)` |


## Policies (RLS)

### `Users can view own revocation`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |

### `revocations_supervisor_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `revocations_supervisor_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `revocations_supervisor_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
