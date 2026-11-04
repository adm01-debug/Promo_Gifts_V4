# public.product_kit_components

> Componentes de kits-produtos (catálogo). RLS via organization membership. Bug corrigido na Etapa 4: removida policy public_read que sobrepunha restrição.

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
| usada por views | public.v_kit_component_complete, public.v_kit_component_completeness, public.v_kit_component_media_public, public.v_kit_component_print_areas_public, public.v_kit_component_skus, public.v_kit_enrichment_dashboard, public.v_kit_ficha_pipeline_health, public.v_kit_max_quantity, public.v_kit_pipeline_health, public.v_kit_with_components, public.v_xbz_ficha_parse_queue, public.vw_component_types_usage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_product_id` | `uuid` | não |  |  |  |
| 3 | `component_product_id` | `uuid` | sim |  |  | FK para produto cadastrado (OPCIONAL - pode ser NULL se usar campos inline) |
| 4 | `quantity` | `integer` | não | `1` |  |  |
| 5 | `is_optional` | `boolean` | sim | `false` |  |  |
| 6 | `is_replaceable` | `boolean` | sim | `false` |  |  |
| 7 | `allowed_variant_ids` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `display_order` | `integer` | sim | `0` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `component_code` | `character varying(20)` | sim |  |  | Código interno do componente (ex: 1, ESTOJO) |
| 13 | `component_name` | `character varying(200)` | sim |  |  | Nome do componente quando não há produto cadastrado |
| 14 | `component_description` | `text` | sim |  |  | Descrição detalhada do componente |
| 15 | `component_sku` | `character varying(50)` | sim |  |  | SKU do componente (se houver) |
| 16 | `material` | `character varying(100)` | sim |  |  | Material principal do componente |
| 17 | `color` | `character varying(50)` | sim |  |  | Cor do componente |
| 18 | `weight_g` | `integer` | sim |  |  | Peso em gramas |
| 19 | `length_mm` | `integer` | sim |  |  | Comprimento em milímetros |
| 20 | `width_mm` | `integer` | sim |  |  | Largura em milímetros |
| 21 | `height_mm` | `integer` | sim |  |  | Altura em milímetros |
| 22 | `images` | `jsonb` | sim | `'[]'::jsonb` |  | Array JSON de URLs de imagens |
| 23 | `primary_image_url` | `text` | sim |  |  | URL da imagem principal |
| 24 | `allows_personalization` | `boolean` | sim | `true` |  | Indica se o componente pode ser personalizado |
| 25 | `personalization_notes` | `text` | sim |  |  | Observações sobre personalização do componente |
| 26 | `supplier_component_code` | `character varying(20)` | sim |  |  | Código do componente no fornecedor (Stricker) |
| 27 | `material_type_id` | `uuid` | sim |  |  | Material principal do componente (FK para material_types) |
| 28 | `secondary_material_type_id` | `uuid` | sim |  |  | Material secundário (ex: cabo de madeira em faca de aço) |
| 29 | `component_type_code` | `character varying(30)` | sim |  |  | Tipo padronizado do componente (FK para kit_component_types) |
| 30 | `is_packaging` | `boolean` | sim | `false` |  | True se este componente é a embalagem do kit |
| 31 | `diameter_mm` | `integer` | sim |  |  | Diâmetro em mm para itens cilíndricos (copos, garrafas, canecas). NULL para retangulares. |
| 32 | `circumference_mm` | `integer` | sim |  |  | Circunferência em mm. Cilíndricos: π × diameter_mm (calculado por trigger).    Irregulares: medida manual do perímetro. Usado em área de gravação wrap-around. |
| 33 | `shape_type` | `character varying(30)` | sim | `'rectangular'::character varying` |  | Formato: rectangular\|cylindrical\|flat\|irregular\|spherical. |
| 34 | `pkg_ext_length_mm` | `integer` | sim |  |  | Comprimento EXTERNO da embalagem (mm). Só quando is_packaging=TRUE. |
| 35 | `pkg_ext_width_mm` | `integer` | sim |  |  | Largura EXTERNA da embalagem (mm). Só quando is_packaging=TRUE. |
| 36 | `pkg_ext_height_mm` | `integer` | sim |  |  | Altura EXTERNA da embalagem (mm). Só quando is_packaging=TRUE. |
| 37 | `pkg_int_length_mm` | `integer` | sim |  |  | Comprimento INTERNO ÚTIL da embalagem (mm). O espaço disponível para os itens. |
| 38 | `pkg_int_width_mm` | `integer` | sim |  |  | Largura INTERNA ÚTIL da embalagem (mm). |
| 39 | `pkg_int_height_mm` | `integer` | sim |  |  | Altura INTERNA ÚTIL da embalagem (mm). |
| 40 | `pkg_int_diameter_mm` | `integer` | sim |  |  | Diâmetro INTERNO para embalagens cilíndricas (tubos, cilindros). |
| 41 | `pkg_weight_g` | `integer` | sim |  |  |  |
| 42 | `pkg_material` | `character varying(100)` | sim |  |  |  |
| 43 | `pkg_color` | `character varying(100)` | sim |  |  |  |
| 44 | `pkg_finish` | `character varying(100)` | sim |  |  |  |
| 45 | `enrichment_status` | `character varying(30)` | sim | `'missing'::character varying` |  | ATENÇÃO: mede APENAS completude de dimensão física (peso/medidas), NÃO inclui cor nem imagem. Para completude verídica multi-dimensional, use v_kit_component_completeness (true_status / completude_pct). |
| 46 | `enrichment_source` | `character varying(50)` | sim |  |  |  |
| 47 | `enrichment_confidence` | `numeric(4,3)` | sim |  |  |  |
| 48 | `padronizacao_id` | `uuid` | sim |  |  | FK para kit_component_padronizacao: rastreia de qual registro silver vieram as dimensões. |
| 49 | `color_id` | `uuid` | sim |  |  | Cor do ITEM normalizada (FK color_variations) — MESMA codificação canônica das variações de produto. Resolvida do campo color (texto derivado do nome) via dicionário de equivalência. NULL = cor própria desconhecida. OBS: distinta da cor da VARIANTE do kit (essa vive em product_variants.color_id e alimenta o ref do componente). |
| 50 | `slot_code` | `character varying(6)` | sim |  |  |  |
| 51 | `is_standalone_sellable` | `boolean` | não | `false` |  | Sempre false: componente de kit NUNCA é vendido separadamente. Reforçado por separação de tabela + guarda anti-colisão. |
| 52 | `dim_source` | `character varying(20)` | sim |  |  | Procedencia das medidas do componente: ficha (PDF tecnico do fornecedor = REAL por peca), supplier_api, heuristic (estimado/copiado da caixa do kit), manual. NULL=legado/desconhecido. Politica: parse de ficha so sobrescreve heuristic/NULL/supplier_api, nunca ficha/manual. |
| 53 | `dim_source_url` | `text` | sim |  |  | URL da fonte que originou as medidas (ex.: ficha_tecnica_pdf da XBZ). |
| 54 | `weight_source` | `character varying(30)` | sim |  |  | Procedência do peso por peça: measured_real=medido na ficha técnica; inherited_total=copiado do peso total do produto-pai (NÃO é o peso real da peça); estimated_heuristic=estimativa heurística por volume/proporção; estimated_proportional=peso total do kit dividido igualmente pelos componentes; supplier_api=dado estruturado do fornecedor; manual=revisado manualmente. |
| 55 | `material_source` | `character varying(30)` | sim |  |  | Procedência do material: ficha=ficha técnica verificada; heuristic_type=inferido do component_type_code via kit_component_types; heuristic_name=inferido por keywords do nome do componente; supplier_api=dado estruturado do fornecedor; manual=revisado manualmente. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_display_order_non_negative | CHECK | `CHECK (display_order >= 0)` |  |  | sim |
| check_not_self_reference | CHECK | `CHECK (kit_product_id <> component_product_id)` |  |  | sim |
| check_quantity_positive | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| chk_component_identity | CHECK | `CHECK (component_product_id IS NOT NULL OR component_name IS NOT NULL)` |  |  | sim |
| chk_pkc_confidence_range | CHECK | `CHECK (enrichment_confidence IS NULL OR enrichment_confidence >= 0::numeric AND enrichment_confidence <= 1::numeric)` |  |  | sim |
| chk_pkc_diameter_sane | CHECK | `CHECK (diameter_mm IS NULL OR diameter_mm >= 1 AND diameter_mm <= 800)` |  |  | sim |
| chk_pkc_height_sane | CHECK | `CHECK (height_mm IS NULL OR height_mm >= 1 AND height_mm <= 1500)` |  |  | sim |
| chk_pkc_length_sane | CHECK | `CHECK (length_mm IS NULL OR length_mm >= 1 AND length_mm <= 1500)` |  |  | sim |
| chk_pkc_slot_fmt | CHECK | `CHECK (slot_code IS NULL OR slot_code::text ~ '^(K\|E)[0-9]{1,3}$'::text)` |  |  | sim |
| chk_pkc_slot_kind | CHECK | `CHECK (slot_code IS NULL OR is_packaging AND slot_code::text ~~ 'E%'::text OR NOT is_packaging AND slot_code::text ~~ 'K%'::text)` |  |  | sim |
| chk_pkc_weight_sane | CHECK | `CHECK (weight_g IS NULL OR weight_g >= 1 AND weight_g <= 50000)` |  |  | sim |
| chk_pkc_width_sane | CHECK | `CHECK (width_mm IS NULL OR width_mm >= 1 AND width_mm <= 1500)` |  |  | sim |
| product_kit_components_check | CHECK | `CHECK (kit_product_id <> component_product_id)` |  |  | sim |
| product_kit_components_circumference_mm_check | CHECK | `CHECK (circumference_mm > 0)` |  |  | sim |
| product_kit_components_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_id) REFERENCES color_variations(id)` | NO ACTION | NO ACTION | sim |
| product_kit_components_component_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_kit_components_component_type_code_fkey | FOREIGN KEY | `FOREIGN KEY (component_type_code) REFERENCES kit_component_types(code)` | NO ACTION | NO ACTION | sim |
| product_kit_components_diameter_mm_check | CHECK | `CHECK (diameter_mm > 0)` |  |  | sim |
| product_kit_components_enrichment_confidence_check | CHECK | `CHECK (enrichment_confidence >= 0::numeric AND enrichment_confidence <= 1::numeric)` |  |  | sim |
| product_kit_components_enrichment_status_check | CHECK | `CHECK (enrichment_status::text = ANY (ARRAY['missing'::character varying, 'partial'::character varying, 'complete'::character varying]::text[]))` |  |  | sim |
| product_kit_components_kit_product_id_component_product_id_key | UNIQUE | `UNIQUE (kit_product_id, component_product_id)` |  |  | sim |
| product_kit_components_kit_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_kit_components_material_source_check | CHECK | `CHECK (material_source::text = ANY (ARRAY['ficha'::character varying, 'heuristic_type'::character varying, 'heuristic_name'::character varying, 'supplier_api'::character varying, 'manual'::character varying]::text[]))` |  |  | sim |
| product_kit_components_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |
| product_kit_components_padronizacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (padronizacao_id) REFERENCES kit_component_padronizacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| product_kit_components_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_kit_components_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| product_kit_components_secondary_material_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (secondary_material_type_id) REFERENCES material_types(id)` | NO ACTION | NO ACTION | sim |
| product_kit_components_shape_type_check | CHECK | `CHECK (shape_type::text = ANY (ARRAY['rectangular'::character varying, 'cylindrical'::character varying, 'flat'::character varying, 'irregular'::character varying, 'spherical'::character varying]::text[]))` |  |  | sim |
| product_kit_components_weight_source_check | CHECK | `CHECK (weight_source::text = ANY (ARRAY['measured_real'::character varying, 'inherited_total'::character varying, 'estimated_heuristic'::character varying, 'estimated_proportional'::character varying, 'supplier_api'::character varying, 'manual'::character varying]::text[]))` |  |  | sim |
| uq_pkc_kit_slot | UNIQUE | `UNIQUE (kit_product_id, slot_code)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_component_enrichment_raw | kit_component_enrichment_raw_kit_component_id_fkey | kit_component_id | SET NULL |
| public.kit_component_enrichment_raw | kit_component_enrichment_raw_promoted_component_id_fkey | promoted_component_id | SET NULL |
| public.kit_component_padronizacao | kit_component_padronizacao_kit_component_id_fkey | kit_component_id | SET NULL |
| public.kit_component_print_areas | kit_component_print_areas_kit_component_id_fkey | kit_component_id | CASCADE |
| public.kit_component_variant_skus | kit_component_variant_skus_component_id_fkey | component_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_components_kit | btree | kit_product_id | não | sim |  | `CREATE INDEX idx_kit_components_kit ON public.product_kit_components USING btree (kit_product_id)` |
| idx_kit_components_name | btree | component_name | não | sim |  | `CREATE INDEX idx_kit_components_name ON public.product_kit_components USING btree (component_name)` |
| idx_pkc_color_id | btree | color_id | não | sim |  | `CREATE INDEX idx_pkc_color_id ON public.product_kit_components USING btree (color_id)` |
| idx_pkc_component_type | btree | component_type_code | não | sim |  | `CREATE INDEX idx_pkc_component_type ON public.product_kit_components USING btree (component_type_code)` |
| idx_pkc_enrichment_status | btree | enrichment_status | não | sim |  | `CREATE INDEX idx_pkc_enrichment_status ON public.product_kit_components USING btree (enrichment_status)` |
| idx_pkc_material | btree | material_type_id | não | sim |  | `CREATE INDEX idx_pkc_material ON public.product_kit_components USING btree (material_type_id)` |
| idx_product_kit_components_component_product_id | btree | component_product_id | não | sim |  | `CREATE INDEX idx_product_kit_components_component_product_id ON public.product_kit_components USING btree (component_product_id)` |
| idx_product_kit_components_padronizacao_id | btree | padronizacao_id | não | sim |  | `CREATE INDEX idx_product_kit_components_padronizacao_id ON public.product_kit_components USING btree (padronizacao_id)` |
| idx_product_kit_components_secondary_material_type_id | btree | secondary_material_type_id | não | sim |  | `CREATE INDEX idx_product_kit_components_secondary_material_type_id ON public.product_kit_components USING btree (secondary_material_type_id)` |
| product_kit_components_kit_product_id_component_product_id_key | btree | kit_product_id, component_product_id | sim | sim |  | `CREATE UNIQUE INDEX product_kit_components_kit_product_id_component_product_id_key ON public.product_kit_components USING btree (kit_product_id, component_product_id)` |
| product_kit_components_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_kit_components_pkey ON public.product_kit_components USING btree (id)` |
| uq_pkc_component_code | btree | component_code | sim | sim | `(component_code IS NOT NULL)` | `CREATE UNIQUE INDEX uq_pkc_component_code ON public.product_kit_components USING btree (component_code) WHERE (component_code IS NOT NULL)` |
| uq_pkc_kit_slot | btree | kit_product_id, slot_code | sim | sim |  | `CREATE UNIQUE INDEX uq_pkc_kit_slot ON public.product_kit_components USING btree (kit_product_id, slot_code)` |


## Policies (RLS)

### `product_kit_components_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `product_kit_components_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_kit_components_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_kit_components_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kit_component_inherit_personalization | BEFORE | INSERT | ROW | enabled | public.fn_kit_component_inherit_personalization |
| trg_pkc_auto_enrich_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pkc_auto_enrich_status |
| trg_pkc_auto_inherit_material | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pkc_auto_inherit_material |
| trg_pkc_freeze_slot | BEFORE | UPDATE | ROW | enabled | public.fn_pkc_freeze_slot |
| trg_pkc_guard_not_sellable | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pkc_guard_not_sellable |
| trigger_auto_increment_display_order | BEFORE | INSERT | ROW | enabled | public.auto_increment_display_order |
| update_product_kit_components_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |


Grants por coluna:

| coluna | role | privilégios |
|---|---|---|
| id | anon | SELECT |
| kit_product_id | anon | SELECT |
