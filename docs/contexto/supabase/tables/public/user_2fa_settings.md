# public.user_2fa_settings

> Configuracoes de 2FA (TOTP) por usuario. Consumida por src/hooks/auth/use2FA.ts.

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
| 3 | `is_enabled` | `boolean` | não | `false` |  |  |
| 4 | `totp_secret` | `text` | sim |  |  |  |
| 5 | `backup_codes` | `text[]` | sim |  |  |  |
| 6 | `enabled_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_2fa_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_2fa_settings_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_2fa_settings_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| user_2fa_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_2fa_settings_pkey ON public.user_2fa_settings USING btree (id)` |
| user_2fa_settings_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX user_2fa_settings_user_id_key ON public.user_2fa_settings USING btree (user_id)` |


## Policies (RLS)

### `user_2fa_delete_own_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `user_2fa_insert_own_or_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `user_2fa_select_own_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `user_2fa_update_own_or_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
