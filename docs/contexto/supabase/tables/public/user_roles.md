# public.user_roles

> Source of truth para autorização. Multi-role suportado (1 user pode ter dev+supervisor). PK composto (user_id, role).

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
| 2 | `role` | `app_role` | não |  |  |  |
| 3 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `granted_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_roles_granted_by_fkey | FOREIGN KEY | `FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| user_roles_pkey | PRIMARY KEY | `PRIMARY KEY (user_id, role)` |  |  | sim |
| user_roles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_roles_user_id_profiles_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_roles_granted_by | btree | granted_by | não | sim |  | `CREATE INDEX idx_user_roles_granted_by ON public.user_roles USING btree (granted_by)` |
| idx_user_roles_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id)` |
| idx_user_roles_user_id_role | btree | user_id, role | não | sim | `(role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role, 'manager'::app_role]))` | `CREATE INDEX idx_user_roles_user_id_role ON public.user_roles USING btree (user_id, role) WHERE (role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role, 'manager'::app_role]))` |
| user_roles_pkey | btree | user_id, role | sim | sim |  | `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role)` |
| user_roles_role_idx | btree | role | não | sim |  | `CREATE INDEX user_roles_role_idx ON public.user_roles USING btree (role)` |


## Policies (RLS)

### `Users read own roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |
| WITH CHECK |  |

### `user_roles_delete_guarded`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) END` |
| WITH CHECK |  |

### `user_roles_insert_guarded`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE (EXISTS ( SELECT 1        FROM user_roles ur       WHERE ((ur.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (ur.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role]))))) END` |

### `user_roles_update_guarded`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE (EXISTS ( SELECT 1        FROM user_roles ur       WHERE ((ur.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (ur.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role]))))) END` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ensure_seller_discount_limit | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_ensure_seller_discount_limit |
| user_roles_sync_profile_role | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trg_user_roles_sync_profile_role |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
