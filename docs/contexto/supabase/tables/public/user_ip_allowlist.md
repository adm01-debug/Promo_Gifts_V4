# public.user_ip_allowlist

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
| 3 | `ip_address` | `text` | não |  |  |  |
| 4 | `label` | `text` | sim |  |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_ip_allowlist_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| user_ip_allowlist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_ip_allowlist_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_ip_allowlist_user_id_ip_address_key | UNIQUE | `UNIQUE (user_id, ip_address)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_ip_allowlist_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_user_ip_allowlist_created_by ON public.user_ip_allowlist USING btree (created_by)` |
| user_ip_allowlist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_ip_allowlist_pkey ON public.user_ip_allowlist USING btree (id)` |
| user_ip_allowlist_user_id_ip_address_key | btree | user_id, ip_address | sim | sim |  | `CREATE UNIQUE INDEX user_ip_allowlist_user_id_ip_address_key ON public.user_ip_allowlist USING btree (user_id, ip_address)` |


## Policies (RLS)

### `user_ip_allowlist_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |
| WITH CHECK |  |

### `user_ip_allowlist_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |

### `user_ip_allowlist_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |

### `user_ip_allowlist_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
