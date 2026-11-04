# public.step_up_audit_log

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `action` | `step_up_action` | sim |  |  |  |
| 4 | `target_ref` | `text` | sim |  |  |  |
| 5 | `event_type` | `text` | não |  |  |  |
| 6 | `challenge_id` | `uuid` | sim |  |  |  |
| 7 | `token_id` | `uuid` | sim |  |  |  |
| 8 | `ip_address` | `inet` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| step_up_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| step_up_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX step_up_audit_log_pkey ON public.step_up_audit_log USING btree (id)` |


## Policies (RLS)

### `Users can view own audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
