# public.step_up_challenges

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
| 5 | `otp_hash` | `text` | não |  |  |  |
| 6 | `attempts` | `smallint` | não | `0` |  |  |
| 7 | `max_attempts` | `smallint` | não | `5` |  |  |
| 8 | `password_verified` | `boolean` | não | `false` |  |  |
| 9 | `otp_verified` | `boolean` | não | `false` |  |  |
| 10 | `consumed` | `boolean` | não | `false` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `expires_at` | `timestamp with time zone` | não | `(now() + '00:05:00'::interval)` |  |  |
| 13 | `ip_address` | `inet` | sim |  |  |  |
| 14 | `user_agent` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| step_up_challenges_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_step_up_challenges_expires | btree | expires_at | não | sim | `(consumed = false)` | `CREATE INDEX idx_step_up_challenges_expires ON public.step_up_challenges USING btree (expires_at) WHERE (consumed = false)` |
| step_up_challenges_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX step_up_challenges_pkey ON public.step_up_challenges USING btree (id)` |


## Policies (RLS)

### `Users can view own challenges`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |

### `step_up_challenges_delete_own_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `step_up_challenges_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `step_up_challenges_update_own`

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
