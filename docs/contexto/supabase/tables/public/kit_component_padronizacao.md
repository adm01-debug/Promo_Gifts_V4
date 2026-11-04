# public.kit_component_padronizacao

> PRATA: Dimensões físicas padronizadas de componentes de kits.
   Alimentada a partir de kit_component_enrichment_raw via fn_standardize_kit_component().
   Requer aprovação (padronizacao_status=approved) antes de promover ao gold.
   Campos length/width/height/diameter/circumference = dimensões do ITEM.
   Campos pkg_* = dimensões da EMBALAGEM (quando is_packaging=TRUE).

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
| usada por views | public.v_kit_pipeline_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_product_id` | `uuid` | não |  |  |  |
| 3 | `kit_component_id` | `uuid` | sim |  |  |  |
| 4 | `raw_id` | `uuid` | sim |  |  |  |
| 5 | `component_name` | `text` | não |  |  |  |
| 6 | `component_type_code` | `character varying(30)` | sim |  |  |  |
| 7 | `material_type_id` | `uuid` | sim |  |  |  |
| 8 | `secondary_material_type_id` | `uuid` | sim |  |  |  |
| 9 | `component_product_id` | `uuid` | sim |  |  |  |
| 10 | `shape_type` | `character varying(30)` | sim | `'rectangular'::character varying` |  |  |
| 11 | `length_mm` | `integer` | sim |  |  |  |
| 12 | `width_mm` | `integer` | sim |  |  |  |
| 13 | `height_mm` | `integer` | sim |  |  |  |
| 14 | `diameter_mm` | `integer` | sim |  |  |  |
| 15 | `circumference_mm` | `integer` | sim |  |  | Para cylindrical: calculado automaticamente como ROUND(π × diameter_mm) por trigger.    Para irregular: medida manual do perímetro. Usado em área de gravação wrap-around. |
| 16 | `weight_g` | `integer` | sim |  |  |  |
| 17 | `is_packaging` | `boolean` | sim | `false` |  |  |
| 18 | `pkg_ext_length_mm` | `integer` | sim |  |  |  |
| 19 | `pkg_ext_width_mm` | `integer` | sim |  |  |  |
| 20 | `pkg_ext_height_mm` | `integer` | sim |  |  |  |
| 21 | `pkg_int_length_mm` | `integer` | sim |  |  | Dimensão interna ÚTIL da embalagem (espaço disponível). Diferente da ext por espessura das paredes. |
| 22 | `pkg_int_width_mm` | `integer` | sim |  |  |  |
| 23 | `pkg_int_height_mm` | `integer` | sim |  |  |  |
| 24 | `pkg_int_diameter_mm` | `integer` | sim |  |  |  |
| 25 | `pkg_weight_g` | `integer` | sim |  |  |  |
| 26 | `pkg_material` | `character varying(100)` | sim |  |  |  |
| 27 | `pkg_color` | `character varying(100)` | sim |  |  |  |
| 28 | `pkg_finish` | `character varying(100)` | sim |  |  |  |
| 29 | `pkg_type_code` | `character varying(30)` | sim |  |  |  |
| 30 | `allows_personalization` | `boolean` | sim | `true` |  |  |
| 31 | `quantity` | `integer` | sim | `1` |  |  |
| 32 | `enrichment_source` | `character varying(50)` | sim |  |  |  |
| 33 | `enrichment_confidence` | `numeric(4,3)` | sim |  |  |  |
| 34 | `notes` | `text` | sim |  |  |  |
| 35 | `padronizacao_status` | `character varying(30)` | sim | `'pending'::character varying` |  |  |
| 36 | `reviewed_by` | `uuid` | sim |  |  |  |
| 37 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 38 | `rejection_reason` | `text` | sim |  |  |  |
| 39 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 40 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 41 | `color` | `character varying(50)` | sim |  |  | Cor do ITEM (distinta de pkg_color, que é da embalagem). Free-text padronizável. Alimenta product_kit_components.color via fn_promote_kit_component_padronizacao. NULL = desconhecida. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_kcpad_cylinder_has_diameter | CHECK | `CHECK (shape_type::text <> 'cylindrical'::text OR diameter_mm IS NOT NULL)` |  |  | sim |
| chk_kcpad_pkg_ext_min2 | CHECK | `CHECK (pkg_ext_length_mm IS NULL AND pkg_ext_width_mm IS NULL AND pkg_ext_height_mm IS NULL OR ( CASE     WHEN pkg_ext_length_mm IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN pkg_ext_width_mm IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN pkg_ext_height_mm IS NOT NULL THEN 1     ELSE 0 END) >= 2)` |  |  | sim |
| chk_kcpad_pkg_only_when_packaging | CHECK | `CHECK (is_packaging = true OR pkg_ext_length_mm IS NULL AND pkg_ext_width_mm IS NULL AND pkg_ext_height_mm IS NULL AND pkg_int_length_mm IS NULL AND pkg_int_width_mm IS NULL AND pkg_int_height_mm IS NULL AND pkg_material IS NULL)` |  |  | sim |
| fk_kcpad_raw_id | FOREIGN KEY | `FOREIGN KEY (raw_id) REFERENCES kit_component_enrichment_raw(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_padronizacao_circumference_mm_check | CHECK | `CHECK (circumference_mm > 0)` |  |  | sim |
| kit_component_padronizacao_component_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_padronizacao_component_type_code_fkey | FOREIGN KEY | `FOREIGN KEY (component_type_code) REFERENCES kit_component_types(code)` | NO ACTION | NO ACTION | sim |
| kit_component_padronizacao_diameter_mm_check | CHECK | `CHECK (diameter_mm > 0)` |  |  | sim |
| kit_component_padronizacao_enrichment_confidence_check | CHECK | `CHECK (enrichment_confidence >= 0::numeric AND enrichment_confidence <= 1::numeric)` |  |  | sim |
| kit_component_padronizacao_height_mm_check | CHECK | `CHECK (height_mm > 0)` |  |  | sim |
| kit_component_padronizacao_kit_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_component_id) REFERENCES product_kit_components(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_padronizacao_kit_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_component_padronizacao_length_mm_check | CHECK | `CHECK (length_mm > 0)` |  |  | sim |
| kit_component_padronizacao_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |
| kit_component_padronizacao_padronizacao_status_check | CHECK | `CHECK (padronizacao_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'promoted'::character varying]::text[]))` |  |  | sim |
| kit_component_padronizacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_component_padronizacao_pkg_ext_height_mm_check | CHECK | `CHECK (pkg_ext_height_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_ext_length_mm_check | CHECK | `CHECK (pkg_ext_length_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_ext_width_mm_check | CHECK | `CHECK (pkg_ext_width_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_int_diameter_mm_check | CHECK | `CHECK (pkg_int_diameter_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_int_height_mm_check | CHECK | `CHECK (pkg_int_height_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_int_length_mm_check | CHECK | `CHECK (pkg_int_length_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_int_width_mm_check | CHECK | `CHECK (pkg_int_width_mm > 0)` |  |  | sim |
| kit_component_padronizacao_pkg_type_code_fkey | FOREIGN KEY | `FOREIGN KEY (pkg_type_code) REFERENCES kit_component_types(code)` | NO ACTION | NO ACTION | sim |
| kit_component_padronizacao_pkg_weight_g_check | CHECK | `CHECK (pkg_weight_g >= 0)` |  |  | sim |
| kit_component_padronizacao_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| kit_component_padronizacao_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| kit_component_padronizacao_secondary_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (secondary_material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |
| kit_component_padronizacao_shape_type_check | CHECK | `CHECK (shape_type::text = ANY (ARRAY['rectangular'::character varying, 'cylindrical'::character varying, 'flat'::character varying, 'irregular'::character varying, 'spherical'::character varying]::text[]))` |  |  | sim |
| kit_component_padronizacao_weight_g_check | CHECK | `CHECK (weight_g >= 0)` |  |  | sim |
| kit_component_padronizacao_width_mm_check | CHECK | `CHECK (width_mm > 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_component_enrichment_raw | kit_component_enrichment_raw_promoted_padronizacao_id_fkey | promoted_padronizacao_id | SET NULL |
| public.product_kit_components | product_kit_components_padronizacao_id_fkey | padronizacao_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kcp_material_type_id | btree | material_type_id | não | sim |  | `CREATE INDEX idx_kcp_material_type_id ON public.kit_component_padronizacao USING btree (material_type_id)` |
| idx_kcpad_approved | btree | padronizacao_status | não | sim | `((padronizacao_status)::text = 'approved'::text)` | `CREATE INDEX idx_kcpad_approved ON public.kit_component_padronizacao USING btree (padronizacao_status) WHERE ((padronizacao_status)::text = 'approved'::text)` |
| idx_kcpad_component | btree | kit_component_id | não | sim |  | `CREATE INDEX idx_kcpad_component ON public.kit_component_padronizacao USING btree (kit_component_id)` |
| idx_kcpad_kit | btree | kit_product_id | não | sim |  | `CREATE INDEX idx_kcpad_kit ON public.kit_component_padronizacao USING btree (kit_product_id)` |
| idx_kcpad_status | btree | padronizacao_status | não | sim |  | `CREATE INDEX idx_kcpad_status ON public.kit_component_padronizacao USING btree (padronizacao_status)` |
| idx_kit_component_padronizacao_component_product_id | btree | component_product_id | não | sim |  | `CREATE INDEX idx_kit_component_padronizacao_component_product_id ON public.kit_component_padronizacao USING btree (component_product_id)` |
| idx_kit_component_padronizacao_component_type_code | btree | component_type_code | não | sim |  | `CREATE INDEX idx_kit_component_padronizacao_component_type_code ON public.kit_component_padronizacao USING btree (component_type_code)` |
| idx_kit_component_padronizacao_pkg_type_code | btree | pkg_type_code | não | sim |  | `CREATE INDEX idx_kit_component_padronizacao_pkg_type_code ON public.kit_component_padronizacao USING btree (pkg_type_code)` |
| idx_kit_component_padronizacao_raw_id | btree | raw_id | não | sim |  | `CREATE INDEX idx_kit_component_padronizacao_raw_id ON public.kit_component_padronizacao USING btree (raw_id)` |
| idx_kit_component_padronizacao_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_kit_component_padronizacao_reviewed_by ON public.kit_component_padronizacao USING btree (reviewed_by)` |
| idx_kit_padronizacao_material_id | btree | secondary_material_type_id | não | sim |  | `CREATE INDEX idx_kit_padronizacao_material_id ON public.kit_component_padronizacao USING btree (secondary_material_type_id)` |
| kit_component_padronizacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_padronizacao_pkey ON public.kit_component_padronizacao USING btree (id)` |


## Policies (RLS)

### `kcpad_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `kcpad_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT auth.uid() AS uid))` |

### `kcpad_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT auth.uid() AS uid))` |

### `kcpad_read_auth`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kcpad_calc_circumference | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_kit_component_calc_circumference |
| trg_kcpad_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
