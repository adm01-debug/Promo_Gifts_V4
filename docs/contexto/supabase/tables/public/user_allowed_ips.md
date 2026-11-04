# public.user_allowed_ips

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
| user_allowed_ips_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| user_allowed_ips_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_allowed_ips_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_allowed_ips_user_ip_unique | UNIQUE | `UNIQUE (user_id, ip_address)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_allowed_ips_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_user_allowed_ips_created_by ON public.user_allowed_ips USING btree (created_by)` |
| user_allowed_ips_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_allowed_ips_pkey ON public.user_allowed_ips USING btree (id)` |
| user_allowed_ips_user_ip_unique | btree | user_id, ip_address | sim | sim |  | `CREATE UNIQUE INDEX user_allowed_ips_user_ip_unique ON public.user_allowed_ips USING btree (user_id, ip_address)` |


## Policies (RLS)

### `user_allowed_ips_delete_own_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `user_allowed_ips_insert_own_or_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `user_allowed_ips_select_own_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `user_allowed_ips_update_own_or_admin`

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
