# public.material_types

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
| usada por views | analytics.mv_material_group_stats, analytics.mv_product_compositions, public.materials_complete, public.products_with_materials, public.v_products_complete, public.v_super_filtro_options, public.vw_component_types_usage, public.vw_somarcas_materials |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `group_id` | `uuid` | não |  |  |  |
| 4 | `name` | `character varying(100)` | não |  |  |  |
| 5 | `slug` | `character varying(100)` | não |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `properties` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `display_order` | `integer` | sim | `0` |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| material_types_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_id) REFERENCES material_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| material_types_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| material_types_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| material_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.eco_material_config | eco_material_config_material_id_fkey | material_id | CASCADE |
| public.kit_component_padronizacao | kit_component_padronizacao_material_type_id_fkey | material_type_id | NO ACTION |
| public.kit_component_padronizacao | kit_component_padronizacao_secondary_material_type_id_fkey | secondary_material_type_id | NO ACTION |
| public.kit_component_types | kit_component_types_default_material_type_id_fkey | default_material_type_id | NO ACTION |
| public.kit_component_types | kit_component_types_secondary_material_type_id_fkey | secondary_material_type_id | NO ACTION |
| public.material_equivalences | material_equivalences_promo_type_id_fkey | promo_type_id | SET NULL |
| public.material_variations | material_variations_type_id_fkey | type_id | CASCADE |
| public.product_kit_components | product_kit_components_material_type_id_fkey | material_type_id | NO ACTION |
| public.product_kit_components | product_kit_components_secondary_material_type_id_fkey | secondary_material_type_id | NO ACTION |
| public.product_materials | product_materials_material_id_fkey | material_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_material_types_group | btree | group_id | não | sim |  | `CREATE INDEX idx_material_types_group ON public.material_types USING btree (group_id)` |
| material_types_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX material_types_organization_id_slug_key ON public.material_types USING btree (organization_id, slug)` |
| material_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX material_types_pkey ON public.material_types USING btree (id)` |


## Policies (RLS)

### `material_types_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `mt_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `mt_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `mt_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_material_types_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
