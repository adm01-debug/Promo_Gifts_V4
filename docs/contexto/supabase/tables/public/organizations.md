# public.organizations

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
| usada por views | public.v_system_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `slug` | `text` | não |  |  | Alinhado ao Lovable em 2026-05-22 (Wave 3.1.B). Identificador URL-safe da organizacao. |
| 5 | `logo_url` | `text` | sim |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `settings` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| organizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| organizations_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.attribute_definitions | attribute_definitions_organization_id_fkey | organization_id | NO ACTION |
| public.attribute_groups | attribute_groups_organization_id_fkey | organization_id | NO ACTION |
| public.b2b_collections | collections_organization_id_fkey | organization_id | CASCADE |
| public.categories | categories_organization_id_fkey | organization_id | CASCADE |
| public.commemorative_dates | commemorative_dates_organization_id_fkey | organization_id | NO ACTION |
| public.magazine_templates | magazine_templates_organization_id_fkey | organization_id | SET NULL |
| public.magazines | magazines_organization_id_fkey | organization_id | SET NULL |
| public.markup_configurations | markup_configurations_organization_id_fkey | organization_id | CASCADE |
| public.material_groups | material_groups_organization_id_fkey | organization_id | CASCADE |
| public.material_types | material_types_organization_id_fkey | organization_id | CASCADE |
| public.material_variations | material_variations_organization_id_fkey | organization_id | CASCADE |
| public.orders | orders_organization_id_fkey | organization_id | CASCADE |
| public.organization_members | organization_members_organization_id_fkey | organization_id | CASCADE |
| public.product_images | product_images_organization_id_fkey | organization_id | NO ACTION |
| public.product_videos | product_videos_organization_id_fkey | organization_id | NO ACTION |
| public.products | products_organization_id_fkey | organization_id | CASCADE |
| public.profiles | profiles_organization_id_fkey | organization_id | NO ACTION |
| public.quotes | quotes_organization_id_fkey | organization_id | CASCADE |
| public.supplier_attribute_definitions | supplier_attribute_definitions_organization_id_fkey | organization_id | NO ACTION |
| public.suppliers | suppliers_organization_id_fkey | organization_id | CASCADE |
| public.tags | tags_organization_id_fkey | organization_id | NO ACTION |
| public.target_audiences | target_audiences_organization_id_fkey | organization_id | NO ACTION |
| public.user_organizations | user_organizations_organization_id_fkey | organization_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| organizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)` |
| organizations_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug)` |


## Policies (RLS)

### `org_delete_admins`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(id)` |
| WITH CHECK |  |

### `org_insert_service`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `org_select_members`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_organizations uo   WHERE ((uo.organization_id = organizations.id) AND (uo.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK |  |

### `org_update_admins`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(id)` |
| WITH CHECK | `is_org_owner_or_admin(id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
