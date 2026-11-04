# public.secret_rotation_log

> Auditoria de set/rotate de secrets. Lookup via secrets-manager.action=rotation_history.

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
| 2 | `secret_name` | `text` | não |  |  |  |
| 3 | `rotated_by` | `uuid` | sim |  |  |  |
| 4 | `previous_suffix` | `text` | sim |  |  |  |
| 5 | `new_suffix` | `text` | sim |  |  |  |
| 6 | `notes` | `text` | sim |  |  |  |
| 7 | `action_type` | `text` | não |  |  |  |
| 8 | `rotated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| secret_rotation_log_action_type_check | CHECK | `CHECK (action_type = ANY (ARRAY['set'::text, 'rotate'::text]))` |  |  | sim |
| secret_rotation_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| secret_rotation_log_rotated_by_fkey | FOREIGN KEY | `FOREIGN KEY (rotated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_secret_rotation_log_rotated_by | btree | rotated_by | não | sim |  | `CREATE INDEX idx_secret_rotation_log_rotated_by ON public.secret_rotation_log USING btree (rotated_by)` |
| ix_secret_rotation_log_rotated_at | btree | rotated_at | não | sim |  | `CREATE INDEX ix_secret_rotation_log_rotated_at ON public.secret_rotation_log USING btree (rotated_at DESC)` |
| secret_rotation_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX secret_rotation_log_pkey ON public.secret_rotation_log USING btree (id)` |


## Policies (RLS)

### `secret_rotation_log_dev_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_dev()` |
| WITH CHECK |  |

### `secret_rotation_log_service_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `false` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
