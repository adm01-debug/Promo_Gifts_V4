# public.produtos_padronizacao

> SILVER oficial (Medallion). Bronze->Silver via fn_standardize_supplier (de-para supplier_field_mappings + fn_apply_transform); Silver->Gold via fn_promote_supplier. Fonte canonica de padronizacao de produtos.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_system_alerts, public.vw_asia_products_by_category, public.vw_asia_products_by_tag, public.vw_asia_products_low_stock, public.vw_asia_products_pending, public.vw_asia_products_promo, public.vw_asia_products_stats, public.vw_medallion_coverage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `raw_id` | `uuid` | sim |  |  | Origem no bronze (supplier_products_raw). ON DELETE SET NULL — apagar o raw não apaga a equivalência. |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `supplier_reference` | `text` | não |  |  | Referência do PAI no fornecedor (derivada na padronização). Única por supplier_id. |
| 5 | `product_id` | `uuid` | sim |  |  | Vínculo com o gold (products). Preenchido na promoção. SET NULL se o produto do gold for removido. |
| 6 | `name` | `text` | sim |  |  |  |
| 7 | `description` | `text` | sim |  |  |  |
| 8 | `short_description` | `character varying` | sim |  |  |  |
| 9 | `cost_price` | `numeric` | sim |  |  | STAGING. Custo de entrada do fornecedor. Fonte canonica de custo por faixa: supplier_price_tiers. ~80% NULL por design. |
| 10 | `suggested_price` | `numeric` | sim |  |  |  |
| 11 | `stock_quantity` | `integer` | sim |  |  |  |
| 12 | `primary_image_url` | `text` | sim |  |  |  |
| 13 | `images` | `jsonb` | sim |  |  | STAGING jsonb. URLs cruas. Normalizacao canonica: product_images. |
| 14 | `ncm_code` | `character varying` | sim |  |  |  |
| 15 | `weight_g` | `integer` | sim |  |  |  |
| 16 | `height_cm` | `numeric` | sim |  |  |  |
| 17 | `width_cm` | `numeric` | sim |  |  |  |
| 18 | `length_cm` | `numeric` | sim |  |  |  |
| 19 | `dimensions_display` | `character varying` | sim |  |  | Campo CANÔNICO de dimensões para exibição. Fonte: CombinedSizes (SPOT). combined_sizes é alias mantido para compatibilidade. |
| 20 | `box_length_cm` | `numeric` | sim |  |  |  |
| 21 | `box_width_cm` | `numeric` | sim |  |  |  |
| 22 | `box_height_cm` | `numeric` | sim |  |  | Altura da caixa mestre em cm. Convertido de BoxHeightMM (metros×100). Nota: prod 94318 tem valor curado (29 cm) diferente do raw SPOT (22 cm) — raw incorreto. |
| 23 | `box_weight_kg` | `numeric` | sim |  |  |  |
| 24 | `box_volume_cm3` | `numeric` | sim |  |  |  |
| 25 | `box_quantity` | `integer` | sim |  |  |  |
| 26 | `box_inner_quantity` | `integer` | sim |  |  |  |
| 27 | `brand` | `character varying` | sim |  |  | Nome do fornecedor/marca comercial. Para SPOT: "Spot \| Stricker" (comportamento correto e intencional). O campo Brand da API SPOT (hi!dea™, Branve, Ekston, Cerruti 1881) representa sub-linhas internas do fornecedor, não a marca de venda ao catálogo. is_active=FALSE no mapeamento é proposital. |
| 28 | `packing_type` | `character varying` | sim |  |  |  |
| 29 | `repacking_type` | `character varying` | sim |  |  |  |
| 30 | `capacities` | `character varying` | sim |  |  |  |
| 31 | `capacity_ml` | `integer` | sim |  |  |  |
| 32 | `min_quantity` | `integer` | sim |  |  |  |
| 34 | `ipi_rate` | `numeric` | sim |  |  |  |
| 35 | `engraving_type` | `text` | sim |  |  |  |
| 36 | `is_active` | `boolean` | não | `true` |  |  |
| 37 | `colors` | `jsonb` | sim |  |  | STAGING jsonb. Cores cruas do fornecedor. Normalizacao canonica: color_equivalences / supplier_colors. |
| 38 | `status` | `produtos_padronizacao_status` | não | `'pending'::produtos_padronizacao_status` |  | SSOT do ciclo de padronização (enum). Não confundir com is_active (visibilidade do produto). |
| 39 | `validation_errors` | `jsonb` | sim |  |  | jsonb. Erros de validacao acumulados (preenchido quando status=rejected). |
| 40 | `standardized_at` | `timestamp with time zone` | sim |  |  |  |
| 41 | `promoted_at` | `timestamp with time zone` | sim |  |  | Quando foi promovido ao gold. Coerência garantida por CHECK: se preenchido, product_id não é nulo. |
| 42 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 43 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 44 | `product_type` | `text` | sim |  |  |  |
| 45 | `origin_country` | `character varying` | sim |  |  |  |
| 46 | `combined_sizes` | `character varying` | sim |  |  | ALIAS de dimensions_display. Mantido para compatibilidade com fn_standardize_raw e fn_promote_padronizacao. Sincronizado por trigger. |
| 47 | `box_image` | `text` | sim |  |  |  |
| 48 | `is_textil` | `boolean` | sim |  |  |  |
| 49 | `is_stockout` | `boolean` | sim |  |  |  |
| 50 | `is_online_exclusive` | `boolean` | sim |  |  |  |
| 51 | `is_new` | `boolean` | sim |  |  |  |
| 52 | `has_colors` | `boolean` | sim |  |  |  |
| 53 | `has_sizes` | `boolean` | sim |  |  |  |
| 54 | `allows_personalization` | `boolean` | sim |  |  |  |
| 55 | `tags` | `jsonb` | sim |  |  |  |
| 56 | `materials` | `jsonb` | sim |  |  |  |
| 57 | `meta_keywords` | `text[]` | sim |  |  |  |
| 58 | `supplier_type` | `text` | sim |  |  |  |
| 59 | `supplier_type_code` | `text` | sim |  |  |  |
| 60 | `supplier_subtype` | `text` | sim |  |  |  |
| 61 | `supplier_subtype_code` | `text` | sim |  |  |  |
| 62 | `supplier_seo_name` | `text` | sim |  |  |  |
| 63 | `supplier_seo_short_description` | `text` | sim |  |  |  |
| 64 | `certificates` | `jsonb` | sim |  |  |  |
| 65 | `certificate_files` | `jsonb` | sim |  |  |  |
| 67 | `related_references` | `jsonb` | sim |  |  |  |
| 68 | `is_seasonal` | `boolean` | sim |  |  |  |
| 69 | `pvc_free` | `boolean` | sim |  |  |  |
| 70 | `circumference_cm` | `numeric` | sim |  |  | Circunferência em cm. Vem de site_data.dimensoes.circunferencia_cm via fn_xbz_enrich_from_site. Relevante para produtos cilíndricos (garrafas, copos, canecas térm.). |
| 71 | `supplier_categories` | `jsonb` | sim |  |  | Categorias hierárquicas do site do fornecedor XBZ. Estrutura: [{nome, path, nivel (1=raiz, 2=sub), url}]. Alimentada por fn_xbz_enrich_from_site via site_data.categorias. A resolução para category_id interno é feita via De→Para (supplier_category_mappings). |
| 72 | `aliquota_ipi` | `numeric` | sim |  |  |  |
| 73 | `engraving_description` | `text` | sim |  |  |  |
| 74 | `sub_brand` | `text` | sim |  |  | Sub-marca/linha de produto dentro do fornecedor. Para SPOT: hi!dea™ \| Branve \| Ekston \| Cerruti 1881. Fonte: raw_data->>'Brand' (SPOT). Distinto de brand = nome do fornecedor. |
| 75 | `sub_brand_id` | `uuid` | sim |  |  | FK → supplier_sub_brands.id. Normalização da sub_brand para lookups e filtros. |
| 76 | `catalog_schema` | `text` | sim |  |  | Geração/segmento do catálogo SPOT ao qual o produto pertence.   active      = catálogo principal ativo (Catalogs contém "SPOT")   stockout    = esgotado/descontinuado (Catalogs contém "Stockout")   promotional = campanha promocional ex: "TimeVaiBrasil2026"   seasonal    = catálogo sazonal ex: "Agendas 2027" Derivado de supplier_categories. Prioridade: stockout > seasonal > promotional > active. |
| 77 | `optional_packaging_refs` | `jsonb` | sim |  |  | Array jsonb de SKUs de embalagens opcionais extraídas da descrição (fn_extract_packaging_info). Promovido para products.optional_packaging_ref + product_packaging_compatibility. |
| 78 | `included_packaging_mention` | `text` | sim |  |  | Trecho da descrição indicando embalagem original inclusa. Promovido para product_included_packagings. |
| 79 | `diameter_cm` | `numeric(10,2)` | sim |  |  | Diâmetro do produto em cm — adicionado jun/2026 para corrigir fn_promote_padronizacao (record s has no field diameter_cm) |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pad_custo_nao_negativo | CHECK | `CHECK (cost_price IS NULL OR cost_price >= 0::numeric)` |  |  | sim |
| chk_pad_promoted_tem_product | CHECK | `CHECK (promoted_at IS NULL OR product_id IS NOT NULL)` |  |  | sim |
| chk_pad_ref_nao_vazia | CHECK | `CHECK (length(TRIM(BOTH FROM supplier_reference)) > 0)` |  |  | sim |
| chk_promoted_requires_gold | CHECK | `CHECK (status <> 'promoted'::produtos_padronizacao_status OR product_id IS NOT NULL)` |  |  | sim |
| chk_supplier_reference_not_blank | CHECK | `CHECK (btrim(supplier_reference) <> ''::text)` |  |  | sim |
| produtos_padronizacao_catalog_schema_check | CHECK | `CHECK (catalog_schema = ANY (ARRAY['active'::text, 'stockout'::text, 'promotional'::text, 'seasonal'::text]))` |  |  | sim |
| produtos_padronizacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produtos_padronizacao_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_padronizacao_raw_id_fkey | FOREIGN KEY | `FOREIGN KEY (raw_id) REFERENCES supplier_products_raw(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_padronizacao_sub_brand_id_fkey | FOREIGN KEY | `FOREIGN KEY (sub_brand_id) REFERENCES supplier_sub_brands(id)` | NO ACTION | NO ACTION | sim |
| produtos_padronizacao_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| uq_pad_supplier_reference | UNIQUE | `UNIQUE (supplier_id, supplier_reference)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.products | products_padronizacao_id_fkey | padronizacao_id | SET NULL |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_pad_id_fkey | pad_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pad_product | btree | product_id | não | sim | `(product_id IS NOT NULL)` | `CREATE INDEX idx_pad_product ON public.produtos_padronizacao USING btree (product_id) WHERE (product_id IS NOT NULL)` |
| idx_pad_promovidos | btree | supplier_id | não | sim | `(product_id IS NOT NULL)` | `CREATE INDEX idx_pad_promovidos ON public.produtos_padronizacao USING btree (supplier_id) WHERE (product_id IS NOT NULL)` |
| idx_pad_raw | btree | raw_id | não | sim |  | `CREATE INDEX idx_pad_raw ON public.produtos_padronizacao USING btree (raw_id)` |
| idx_pad_rejected | btree | supplier_id | não | sim | `(status = 'rejected'::produtos_padronizacao_status)` | `CREATE INDEX idx_pad_rejected ON public.produtos_padronizacao USING btree (supplier_id) WHERE (status = 'rejected'::produtos_padronizacao_status)` |
| idx_pad_to_promote | btree | supplier_id | não | sim | `(status = 'standardized'::produtos_padronizacao_status)` | `CREATE INDEX idx_pad_to_promote ON public.produtos_padronizacao USING btree (supplier_id) WHERE (status = 'standardized'::produtos_padronizacao_status)` |
| idx_pad_to_standardize | btree | supplier_id | não | sim | `(status = 'pending'::produtos_padronizacao_status)` | `CREATE INDEX idx_pad_to_standardize ON public.produtos_padronizacao USING btree (supplier_id) WHERE (status = 'pending'::produtos_padronizacao_status)` |
| idx_produtos_padronizacao_sub_brand_id | btree | sub_brand_id | não | sim |  | `CREATE INDEX idx_produtos_padronizacao_sub_brand_id ON public.produtos_padronizacao USING btree (sub_brand_id)` |
| produtos_padronizacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produtos_padronizacao_pkey ON public.produtos_padronizacao USING btree (id)` |
| uq_pad_supplier_reference | btree | supplier_id, supplier_reference | sim | sim |  | `CREATE UNIQUE INDEX uq_pad_supplier_reference ON public.produtos_padronizacao USING btree (supplier_id, supplier_reference)` |


## Policies (RLS)

### `pad_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_aa_pad_sync_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pad_sync_status |
| trg_sync_dimensions_display | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_dimensions_display |
| trg_xbz_derivar_campos_editoriais | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_xbz_derivar_campos_editoriais |
| trg_xbz_enrich_from_site | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_xbz_enrich_from_site |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
