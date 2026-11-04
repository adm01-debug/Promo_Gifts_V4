# public.product_materials

> Tabela de relacionamento N:N entre produtos e materiais. Permite especificar parte do produto (corpo, tampa) e percentual de cada material.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | analytics.mv_material_group_stats, analytics.mv_product_compositions, public.materials_complete, public.products_with_materials, public.v_products_complete, public.v_super_filtro_options, public.vw_material_health, public.vw_medallion_coverage, public.vw_somarcas_materials |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | não |  |  |  |
| 4 | `material_id` | `uuid` | não |  |  |  |
| 5 | `part` | `character varying(100)` | sim |  |  |  |
| 6 | `percentage` | `numeric(5,2)` | sim |  |  | Percentual do material no produto (0-100). Validado por trigger para não exceder 100 por cento total. |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `sort_order` | `integer` | sim | `100` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `is_active` | `boolean` | sim | `true` |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_materials_material_id_fkey | FOREIGN KEY | `FOREIGN KEY (material_id) REFERENCES material_types(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_materials_percentage_check | CHECK | `CHECK (percentage IS NULL OR percentage >= 0::numeric AND percentage <= 100::numeric)` |  |  | sim |
| product_materials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_materials_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_materials_product_material_unique | UNIQUE | `UNIQUE (product_id, material_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_materials_material_id | btree | material_id | não | sim |  | `CREATE INDEX idx_product_materials_material_id ON public.product_materials USING btree (material_id)` |
| idx_product_materials_product | btree | product_id | não | sim |  | `CREATE INDEX idx_product_materials_product ON public.product_materials USING btree (product_id)` |
| product_materials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_materials_pkey ON public.product_materials USING btree (id)` |
| product_materials_product_material_unique | btree | product_id, material_id | sim | sim |  | `CREATE UNIQUE INDEX product_materials_product_material_unique ON public.product_materials USING btree (product_id, material_id)` |


## Policies (RLS)

### `product_materials_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `product_materials_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `product_materials_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `product_materials_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_materials_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| product_materials_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| set_audit_fields_product_materials | BEFORE | INSERT OR UPDATE | ROW | enabled | public.set_audit_user_fields |
| trg_auto_link_eco_material | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_auto_link_eco_material |
| trg_sync_pm_to_products_jsonb | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_sync_product_materials_to_jsonb |
| validate_percentages_before_insert | BEFORE | INSERT | ROW | enabled | public.validate_material_percentages |
| validate_percentages_before_update | BEFORE | UPDATE | ROW | enabled | public.validate_material_percentages |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
