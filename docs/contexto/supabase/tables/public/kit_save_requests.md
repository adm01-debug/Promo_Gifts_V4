# public.kit_save_requests

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
| 1 | `request_id` | `uuid` | não |  |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `kit_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_save_requests_kit_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_id) REFERENCES custom_kits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_save_requests_pkey | PRIMARY KEY | `PRIMARY KEY (request_id)` |  |  | sim |
| kit_save_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_save_requests_kit_id | btree | kit_id | não | sim |  | `CREATE INDEX idx_kit_save_requests_kit_id ON public.kit_save_requests USING btree (kit_id)` |
| idx_kit_save_requests_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_kit_save_requests_user_id ON public.kit_save_requests USING btree (user_id)` |
| kit_save_requests_pkey | btree | request_id | sim | sim |  | `CREATE UNIQUE INDEX kit_save_requests_pkey ON public.kit_save_requests USING btree (request_id)` |


## Policies (RLS)

### `kit_save_requests_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |

### `kit_save_requests_select_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
