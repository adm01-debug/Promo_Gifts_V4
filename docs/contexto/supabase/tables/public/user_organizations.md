# public.user_organizations

> Membership user→organização. Backfill na Etapa 6 com 4 users na org única (5db5aee1...). Necessário pras funções user_belongs_to_org/is_org_owner_or_admin retornarem true.

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
| usada por views | public.v_my_markup_config |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `organization_id` | `uuid` | não |  |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `role` | `org_role` | não | `'member'::org_role` |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_organizations_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_organizations_pkey | PRIMARY KEY | `PRIMARY KEY (organization_id, user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_organizations_user_org_covering | btree | user_id, organization_id | não | sim |  | `CREATE INDEX idx_user_organizations_user_org_covering ON public.user_organizations USING btree (user_id, organization_id)` |
| idx_user_orgs_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_user_orgs_org ON public.user_organizations USING btree (organization_id)` |
| idx_user_orgs_user | btree | user_id | não | sim |  | `CREATE INDEX idx_user_orgs_user ON public.user_organizations USING btree (user_id)` |
| user_organizations_pkey | btree | organization_id, user_id | sim | sim |  | `CREATE UNIQUE INDEX user_organizations_pkey ON public.user_organizations USING btree (organization_id, user_id)` |


## Policies (RLS)

### `uo_delete_admins`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |
| WITH CHECK |  |

### `uo_insert_admins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |

### `uo_select_members`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_is_org_member(organization_id)` |
| WITH CHECK |  |

### `uo_update_admins`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_user_org_to_org_members | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.sync_user_org_to_org_members |
| trg_user_orgs_owner_guard | BEFORE | DELETE OR UPDATE | ROW | enabled | public.prevent_removing_last_owner |
| trg_user_orgs_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
