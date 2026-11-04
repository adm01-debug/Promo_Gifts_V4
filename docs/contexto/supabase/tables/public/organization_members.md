# public.organization_members

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
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `role` | `org_role` | não | `'member'::org_role` |  |  |
| 5 | `invited_by` | `uuid` | sim |  |  |  |
| 6 | `joined_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| organization_members_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| organization_members_organization_id_user_id_key | UNIQUE | `UNIQUE (organization_id, user_id)` |  |  | sim |
| organization_members_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_org_members_org_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id)` |
| idx_org_members_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id)` |
| organization_members_organization_id_user_id_key | btree | organization_id, user_id | sim | sim |  | `CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id)` |
| organization_members_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id)` |


## Policies (RLS)

### `Insert org members: org admin/owner, bootstrap or sys admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(has_org_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), organization_id, 'owner'::org_role) OR has_org_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), organization_id, 'admin'::org_role) OR ((NOT org_has_any_members(organization_id)) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (role = 'owner'::org_role)) OR is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `Members view own org memberships`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `org_members_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `org_members_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
