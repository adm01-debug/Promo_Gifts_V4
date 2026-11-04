# public.category_relationships

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
| 1 | `id` | `uuid` | não | `uuid_generate_v4()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `parent_id` | `uuid` | não |  |  |  |
| 4 | `child_id` | `uuid` | não |  |  |  |
| 5 | `parent_bitrix_id` | `integer` | não |  |  |  |
| 6 | `child_bitrix_id` | `integer` | não |  |  |  |
| 7 | `parent_name` | `text` | não |  |  |  |
| 8 | `child_name` | `text` | não |  |  |  |
| 9 | `depth` | `integer` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_relationships_depth_check | CHECK | `CHECK (depth >= 1)` |  |  | sim |
| category_relationships_parent_id_child_id_depth_key | UNIQUE | `UNIQUE (parent_id, child_id, depth)` |  |  | sim |
| category_relationships_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_relationships_parent_id_child_id_depth_key | btree | parent_id, child_id, depth | sim | sim |  | `CREATE UNIQUE INDEX category_relationships_parent_id_child_id_depth_key ON public.category_relationships USING btree (parent_id, child_id, depth)` |
| category_relationships_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_relationships_pkey ON public.category_relationships USING btree (id)` |


## Policies (RLS)

### `category_relationships_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `category_relationships_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `category_relationships_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `category_relationships_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_belongs_to_org(organization_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
