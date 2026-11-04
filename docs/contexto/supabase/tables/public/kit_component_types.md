# public.kit_component_types

> Tipos padronizados de componentes para kits (faca, garfo, tábua, estojo, etc)

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
| usada por views | public.v_kit_pipeline_health, public.vw_component_types_usage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `code` | `character varying(30)` | não |  |  | Código único do tipo (FACA, GARFO, TABUA, ESTOJO_ALUMINIO) |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `name_plural` | `character varying(100)` | sim |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `icon` | `character varying(10)` | sim |  |  |  |
| 7 | `default_material_type_id` | `uuid` | sim |  |  |  |
| 8 | `secondary_material_type_id` | `uuid` | sim |  |  |  |
| 9 | `typical_length_mm` | `integer` | sim |  |  | Comprimento típico para referência |
| 10 | `typical_width_mm` | `integer` | sim |  |  |  |
| 11 | `typical_height_mm` | `integer` | sim |  |  |  |
| 12 | `typical_weight_g` | `integer` | sim |  |  |  |
| 13 | `category` | `character varying(30)` | sim | `'utensilio'::character varying` |  |  |
| 14 | `display_order` | `integer` | sim | `0` |  |  |
| 15 | `is_active` | `boolean` | sim | `true` |  |  |
| 16 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `is_personalizable_by_default` | `boolean` | não | `false` |  | Regra-mae: se TRUE, instancias deste tipo em product_kit_components nascem com allows_personalization=true (via trigger). Adicionado em 2026-04 - fase KIT_CHURRASCO_ESTOJO_PERSONALIZACAO. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_component_types_category_check | CHECK | `CHECK (category::text = ANY (ARRAY['utensilio'::character varying, 'embalagem'::character varying, 'acessorio'::character varying, 'complemento'::character varying]::text[]))` |  |  | sim |
| kit_component_types_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| kit_component_types_default_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (default_material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |
| kit_component_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_component_types_secondary_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (secondary_material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_component_padronizacao | kit_component_padronizacao_component_type_code_fkey | component_type_code | NO ACTION |
| public.kit_component_padronizacao | kit_component_padronizacao_pkg_type_code_fkey | pkg_type_code | NO ACTION |
| public.product_kit_components | product_kit_components_component_type_code_fkey | component_type_code | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_component_types_default_material_type_id | btree | default_material_type_id | não | sim |  | `CREATE INDEX idx_kit_component_types_default_material_type_id ON public.kit_component_types USING btree (default_material_type_id)` |
| idx_kit_component_types_secondary_material_type_id | btree | secondary_material_type_id | não | sim |  | `CREATE INDEX idx_kit_component_types_secondary_material_type_id ON public.kit_component_types USING btree (secondary_material_type_id)` |
| kit_component_types_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX kit_component_types_code_key ON public.kit_component_types USING btree (code)` |
| kit_component_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_types_pkey ON public.kit_component_types USING btree (id)` |


## Policies (RLS)

### `auth_read_kit_component_types`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `kct_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kct_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kct_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kct_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
