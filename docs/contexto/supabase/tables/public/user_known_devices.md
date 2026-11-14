# public.user_known_devices

> Migrado do Lovable em 2026-05-22 (Lote A). Devices reconhecidos (detect-new-device).

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `fingerprint` | `text` | não |  |  |  |
| 4 | `device_name` | `text` | sim |  |  |  |
| 5 | `last_seen_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `is_trusted` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_known_devices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_known_devices_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_known_devices_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_user_known_devices_user_id ON public.user_known_devices USING btree (user_id)` |
| user_known_devices_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_known_devices_pkey ON public.user_known_devices USING btree (id)` |


## Policies (RLS)

### `Users can manage their own devices`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
