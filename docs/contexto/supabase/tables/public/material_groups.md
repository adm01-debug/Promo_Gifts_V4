# public.material_groups

> Grupos de materiais para categorização (Metais, Plásticos, Tecidos, etc). Suporta multi-tenancy via organization_id.

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
| usada por views | analytics.mv_material_group_stats, analytics.mv_product_compositions, public.materials_complete, public.products_with_materials, public.v_super_filtro_options, public.vw_somarcas_materials |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `name` | `character varying(200)` | não |  |  |  |
| 4 | `slug` | `character varying(200)` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `sort_order` | `integer` | sim | `100` |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_sort_order_positive_mg | CHECK | `CHECK (sort_order >= 0)` |  |  | sim |
| material_groups_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| material_groups_organization_id_name_key | UNIQUE | `UNIQUE (organization_id, name)` |  |  | sim |
| material_groups_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| material_groups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.material_equivalences | material_equivalences_promo_group_id_fkey | promo_group_id | SET NULL |
| public.material_types | material_types_group_id_fkey | group_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| material_groups_organization_id_name_key | btree | organization_id, name | sim | sim |  | `CREATE UNIQUE INDEX material_groups_organization_id_name_key ON public.material_groups USING btree (organization_id, name)` |
| material_groups_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX material_groups_organization_id_slug_key ON public.material_groups USING btree (organization_id, slug)` |
| material_groups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX material_groups_pkey ON public.material_groups USING btree (id)` |


## Policies (RLS)

### `material_groups_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `material_groups_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `material_groups_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `material_groups_select_own_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_belongs_to_org(organization_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| material_groups_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| set_audit_fields_material_groups | BEFORE | INSERT OR UPDATE | ROW | enabled | public.set_audit_user_fields |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
