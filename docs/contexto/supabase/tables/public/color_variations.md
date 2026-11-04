# public.color_variations

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
| usada por views | public.v_kit_component_skus, public.v_super_filtro_options, public.vw_color_mapping, public.vw_product_color_category_links, public.vw_product_images_variant_gap, public.vw_supplier_color_mappings |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `group_id` | `uuid` | não |  |  | FK LEGADO — em sincronia com color_group_id. Manter por compatibilidade. Usar color_group_id em queries novas. |
| 4 | `name` | `character varying(100)` | não |  |  |  |
| 5 | `slug` | `character varying(100)` | não |  |  |  |
| 6 | `hex_code` | `character varying(7)` | não |  |  |  |
| 7 | `bitrix_id` | `integer` | sim |  |  | Reservado para ID do enum value da variação no Bitrix24. Não utilizado atualmente (NULL). Variações são resolvidas no front-end via color_groups + color_nuances. |
| 8 | `xml_id` | `character varying(100)` | sim |  |  |  |
| 9 | `image_url` | `text` | sim |  |  |  |
| 10 | `description` | `text` | sim |  |  |  |
| 11 | `sort_order` | `integer` | sim | `100` |  |  |
| 12 | `is_active` | `boolean` | sim | `true` |  |  |
| 13 | `is_available` | `boolean` | sim | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `color_group_id` | `uuid` | não |  |  | FK ATUAL para color_groups. Padrão canônico. Substituirá group_id quando o legado for deprecado. |
| 17 | `nuance_id` | `uuid` | sim |  |  |  |
| 18 | `internal_code` | `character varying(20)` | sim |  |  | Código interno hierárquico da variação (1.1, 1.2, 2.1...). Formato: [grupo].[sequencial] |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| color_variations_color_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_group_id) REFERENCES color_groups(id)` | NO ACTION | NO ACTION | sim |
| color_variations_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_id) REFERENCES color_groups(id)` | NO ACTION | NO ACTION | sim |
| color_variations_hex_code_check | CHECK | `CHECK (hex_code::text ~ '^#[0-9A-Fa-f]{6}$'::text)` |  |  | sim |
| color_variations_nuance_id_fkey | FOREIGN KEY | `FOREIGN KEY (nuance_id) REFERENCES color_nuances(id)` | NO ACTION | NO ACTION | sim |
| color_variations_organization_id_name_key | UNIQUE | `UNIQUE (organization_id, name)` |  |  | sim |
| color_variations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.color_equivalences | color_equivalences_promo_variation_id_fkey | promo_variation_id | CASCADE |
| public.color_synonym_map | color_synonym_map_canonical_color_id_fkey | canonical_color_id | NO ACTION |
| public.kit_component_variant_skus | kit_component_variant_skus_item_color_id_fkey | item_color_id | NO ACTION |
| public.product_images | product_images_color_id_fkey | color_id | SET NULL |
| public.product_kit_components | product_kit_components_color_id_fkey | color_id | NO ACTION |
| public.product_variants | product_variants_color_id_fkey | color_id | NO ACTION |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_color_id_2_fkey | color_id_2 | SET NULL |
| public.supplier_colors | supplier_colors_color_variation_id_fkey | color_variation_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| color_variations_organization_id_name_key | btree | organization_id, name | sim | sim |  | `CREATE UNIQUE INDEX color_variations_organization_id_name_key ON public.color_variations USING btree (organization_id, name)` |
| color_variations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX color_variations_pkey ON public.color_variations USING btree (id)` |
| color_variations_slug_unique | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX color_variations_slug_unique ON public.color_variations USING btree (slug)` |
| idx_color_variations_color_group_id | btree | color_group_id | não | sim |  | `CREATE INDEX idx_color_variations_color_group_id ON public.color_variations USING btree (color_group_id)` |
| idx_color_variations_group_id | btree | group_id | não | sim |  | `CREATE INDEX idx_color_variations_group_id ON public.color_variations USING btree (group_id)` |
| idx_color_variations_hex_upper_active | btree |  | não | sim | `(is_active = true)` | `CREATE INDEX idx_color_variations_hex_upper_active ON public.color_variations USING btree (upper(TRIM(BOTH FROM hex_code))) WHERE (is_active = true)` |
| idx_color_variations_internal_code | btree | organization_id, internal_code | sim | sim | `(internal_code IS NOT NULL)` | `CREATE UNIQUE INDEX idx_color_variations_internal_code ON public.color_variations USING btree (organization_id, internal_code) WHERE (internal_code IS NOT NULL)` |
| idx_color_variations_name_upper_active | btree |  | não | sim | `(is_active = true)` | `CREATE INDEX idx_color_variations_name_upper_active ON public.color_variations USING btree (upper(TRIM(BOTH FROM name))) WHERE (is_active = true)` |
| idx_color_variations_nuance_id | btree | nuance_id | não | sim |  | `CREATE INDEX idx_color_variations_nuance_id ON public.color_variations USING btree (nuance_id)` |


## Policies (RLS)

### `color_variations_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `color_variations_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_variations_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_variations_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `color_variations_service_role`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_propagar_atualizacao_cor | AFTER | UPDATE | ROW | enabled | public.fn_propagar_atualizacao_cor |
| trg_sync_color_variation_group | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_color_variation_group |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
