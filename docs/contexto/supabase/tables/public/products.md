# public.products

> GOD TABLE principal do catálogo de brindes.
ESTADO (2026-06-23): 152 colunas após refatoração contínua (era 152 em 06/03, stável).
ARQUITETURA: 9 domínios misturados — Core, SEO, AI, Physical, Fiscal, Supply, Counters, Cache, Flags.
MELHORIAS APLICADAS 2026-06-23:
  - dimensions jsonb DROPADA → escalares canônicos (sessions 2+3)
  - dimensions_source adicionada (origin: cm/mm/estimated)
  - sku_promo auto-sync trigger (sempre = sku)
  - ipi_rate, ncm_id, bitrix_product_id, tax_reference_state expostos em v_products_public
  - 12 índices mortos dropados (~5.4MB)
  - CHECKs: robots_meta, price_freshness, name_max_250, sku_promo=sku
BACKLOG:
  - internal_*_cm (kit-builder, 12 refs) — DROP requer refatoração
  - sku_promo → DROP após refatorar gold-relations.ts/types.ts
  - Colunas AI-worker reativação pendente

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
| usada por views | analytics.mv_media_health, analytics.mv_product_cards, analytics.mv_product_compositions, cf_recon.v_products_without_active_image, classification_audit.v_gaps_acionaveis, classification_audit.v_kits_para_revisao, internal.mv_product_leaf_category, public.products_with_materials, public.v_audit_paradoxos_gravacao, public.v_catalog_stats, public.v_cf_image_remediation, public.v_db_health_audit, public.v_dimensions_source_divergence, public.v_gravacao_cobertura, public.v_kit_completeness_by_supplier, public.v_kit_component_complete, public.v_kit_component_identity_health, public.v_kit_component_media_public, public.v_kit_component_print_areas_public, public.v_kit_component_skus, public.v_kit_enrichment_dashboard, public.v_kit_max_quantity, public.v_kit_pipeline_health, public.v_kit_with_components, public.v_product_active_badge, public.v_product_compositions_public, public.v_product_images_cdn, public.v_product_properties_public, public.v_product_tags_public, public.v_product_tokens, public.v_product_videos_cdn, public.v_product_videos_ready, public.v_products_ai_coverage, public.v_products_complete, public.v_products_dimensions_audit, public.v_products_images_summary, public.v_products_kit_builder, public.v_products_missing_primary_image, public.v_products_name_audit, public.v_products_pending_images, public.v_products_public, public.v_products_public_test, public.v_products_with_tags, public.v_products_without_images, public.v_products_without_video, public.v_super_filtro_options, public.v_system_alerts, public.v_system_health_dashboard, public.v_variant_sale_prices_public, public.v_variants_with_commemorative_dates, public.v_video_validation_recent, public.v_videos_pending, public.v_videos_with_urls, public.v_xbz_ficha_parse_queue, public.vw_active_products_missing_gold_images, public.vw_ai_enrichment_status, public.vw_category_completeness, public.vw_color_coverage, public.vw_material_health, public.vw_medallion_coverage, public.vw_novelty_health, public.vw_orphan_active_variants, public.vw_packaging_health, public.vw_packagings_catalog, public.vw_product_all_packaging_options, public.vw_product_availability, public.vw_product_color_category_links, public.vw_product_commemorative_dates, public.vw_product_images_health, public.vw_product_images_variant_gap, public.vw_product_notebook_complete, public.vw_product_novelties_active, public.vw_product_packaging_options, public.vw_products_ai_status, public.vw_products_by_date, public.vw_products_commercial_packing, public.vw_products_min_quantity, public.vw_products_packaging_info, public.vw_products_pending_variants, public.vw_products_seo_status, public.vw_products_thermal_status, public.vw_products_with_properties, public.vw_produtos_sem_ncm, public.vw_qa_products_missing_images, public.vw_seo_dashboard, public.vw_sitemap_products, public.vw_somarcas_materials, public.vw_spot_cf_health, public.vw_spot_color_health, public.vw_spot_image_coverage, public.vw_spot_price_alerts, public.vw_stock_quantity_outliers, public.vw_super_filtro_health, public.vw_thermal_products, public.vw_variant_sale_prices, public.vw_xbz_produtos_sem_imagem |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  | Nome comercial do produto exibido no catálogo e na busca. Tipo: text irrestrito · NOT NULL · sem default · posição ordinal 2. Constraint: chk_products_name_not_empty (length(TRIM(name)) > 0). Origem por fornecedor: XBZ→NomeProduto (avg 24 chars) · Spot→Name (avg 52 chars, max 183) · Asia→nome · Só Marcas→nome. Higiene automática: trg_limpar_nome_produto (BEFORE INS/UPD) chama fn_display_product_name() apenas para Spot (UUID bcfc0d02-...) — preserva siglas (USB, LED, ABS, PVC, RPET…) e formata em Title Case. Downstream do name (cascata de 8 triggers): slug · meta_title · meta_description · og_title · og_description · canonical_url · search_vector (Peso A) · capacity_ml · dimensions · weight_g · meta_keywords · category_id · materials. Proteção manual: trg_aa_capture_manual_edits adiciona "name" a locked_fields quando write_source ≠ pipeline. 33% dos produtos têm name bloqueado. NÃO confundir com product_variants.name que é UPPER(name) via fn_normalize_product_name (design intencional para variantes). 7 índices cobrem esta coluna: 1 GIN trigram (ilike/similarity) + 6 btree compostos (ordenação, paginação, filtros). |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `sku` | `text` | não |  |  |  |
| 5 | `category_id` | `uuid` | não |  |  |  |
| 6 | `supplier_id` | `uuid` | não |  |  |  |
| 7 | `cost_price` | `numeric(10,2)` | sim |  |  | Custo do fornecedor. Null em v_products_public (segurança). Fonte: pipeline. |
| 8 | `sale_price` | `numeric(10,2)` | sim |  |  | Preço de venda (cost × markup). Mantido por trigger. Exibido no frontend. |
| 9 | `stock_quantity` | `integer` | sim | `0` |  | Estoque total denormalizado. Cache da soma de variant_supplier_sources. Mantido por trg_sync_stock_*. |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `suggested_price` | `numeric(10,2)` | sim |  |  | Preço sugerido do fornecedor. ~97% preenchido. Pode diferir do sale_price calculado. |
| 21 | `images` | `jsonb` | sim | `'[]'::jsonb` |  | Cache jsonb galeria. Espelho de product_images (~72k linhas). Prefer product_images para queries completas. |
| 22 | `primary_image_url` | `text` | sim |  |  | URL imagem principal (Cloudflare Images). 99%+ preenchido. Pré-calculado para listagens. |
| 23 | `videos` | `jsonb` | sim | `'[]'::jsonb` |  | Cache jsonb vídeos. Espelho de product_videos. |
| 24 | `allows_personalization` | `boolean` | sim | `false` |  | TRUE se produto aceita personalização (gravação, bordado, etc.). Controla exibição de técnicas. |
| 27 | `colors` | `jsonb` | sim | `'[]'::jsonb` |  | Cache jsonb de cores disponíveis. Espelho de product_variants + canonical_colors. |
| 29 | `materials` | `jsonb` | sim | `'[]'::jsonb` |  | Cache jsonb de materiais. Espelho de product_materials. Prefer product_materials para queries completas. |
| 30 | `tags` | `jsonb` | sim | `'[]'::jsonb` |  | Cache jsonb de tags/categorias adicionais. Espelho de product_tags. GIN index dropado (não usado). |
| 31 | `meta_title` | `text` | sim |  |  | Title SEO gerado por trigger trg_products_seo_autofill a partir de name. Max 60 chars. |
| 32 | `meta_description` | `text` | sim |  |  | Meta description SEO. Gerada por trigger a partir de name+description. Max 160 chars. |
| 33 | `meta_keywords` | `text[]` | sim |  |  | Keywords SEO (array text). Extraídas por extract_keywords() a partir de name+description+category. |
| 34 | `is_featured` | `boolean` | sim | `false` |  | Produto em destaque. Toggle manual. Expira em is_featured_expires_at. |
| 35 | `is_new` | `boolean` | sim | `false` |  | Produto novo. Boolean. Expira em is_new_expires_at. |
| 37 | `view_count` | `integer` | sim | `0` |  | Total visualizações. Cache de product_views. Incrementado por trigger. |
| 38 | `favorite_count` | `integer` | sim | `0` |  | Total favoritos. Cache de favorite_items. Atualizado por trigger. |
| 39 | `order_count` | `integer` | sim | `0` |  | Total pedidos. Cache para ranking de popularidade. |
| 40 | `organization_id` | `uuid` | sim |  |  | FLAG-MORTA: 1 único valor (organização Promo Brindes: 5db5aee1-064b-4ef4-9193-345dcd8274ea). Multi-tenant não exercido; valor constante. Mantida por RLS (policies usam organization_id para controle de acesso). NÃO dropar: RLS depende desta coluna. 2026-06-23: COMMENT adicionado. |
| 41 | `product_type` | `text` | sim | `'product'::text` |  | Tipo de produto (livre). Ex: caneta, caneca, mochila. Diferente de category. |
| 42 | `is_active` | `boolean` | não | `true` |  | Flag principal de produto ativo. Use esta em queries novas. |
| 45 | `sku_promo` | `character varying(50)` | não |  |  | SKU no sistema Promo (legacy). ATENÇÃO: 100% igual ao campo sku (7137/7137 registros). Mantido por compatibilidade com: src/lib/external-db/types.ts, src/integrations/supabase/gold-relations.ts. CHECK chk_products_sku_promo_equals_sku garante que nunca diverge de sku. Candidato a DROP após refatoração dos tipos TypeScript. 2026-06-23: CHECK de igualdade adicionado + descoberta de redundância documentada. |
| 46 | `short_description` | `character varying(500)` | sim |  |  | Descrição curta para cards e listagens. Texto plano. Complementa description. |
| 47 | `main_category_id` | `uuid` | sim |  |  | Categoria canônica (FK→categories). Usada para leaf_category e SEO. Pode diferir de category_id. |
| 48 | `brand` | `character varying(100)` | sim |  |  | Marca do produto. 100% preenchido. Fonte: pipeline de importação. |
| 49 | `is_deleted` | `boolean` | sim | `false` |  | Flag de soft-delete. TRUE = produto marcado para exclusão (aguarda cascade ou hard-delete). Atualmente 0 registros com is_deleted=true (após cleanup 2026-06-23). Padrão: pipelines de importação usam is_deleted=true para staging de remoção. v_products_public filtra WHERE is_deleted IS NOT TRUE (seguro para NULL). NÃO adicionar CHECK is_deleted=false — trigger usa true para marcar antes de cascade. |
| 50 | `deleted_at` | `timestamp with time zone` | sim |  |  | Timestamp do soft-delete (preenchido junto com is_deleted=true). Atualmente 0 registros com deleted_at preenchido (após cleanup 2026-06-23). Par com is_deleted — nunca preenchido sem is_deleted=true. |
| 51 | `is_kit` | `boolean` | sim | `false` |  | TRUE se kit/combo de itens. Afeta layout e cálculo de volume. |
| 52 | `is_bestseller` | `boolean` | sim | `false` |  | Bestseller. Calculado/manual. Expira em is_bestseller_expires_at. |
| 53 | `min_quantity` | `integer` | sim | `1` |  | Quantidade mínima de venda. 15 valores distintos (1,5,10,25,...). |
| 54 | `box_length_mm` | `integer` | sim |  |  | Comprimento da embalagem em mm (inteiro). Ver box_length_cm para valor em cm. |
| 55 | `box_width_mm` | `integer` | sim |  |  |  |
| 56 | `box_height_mm` | `integer` | sim |  |  |  |
| 57 | `box_weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 59 | `has_colors` | `boolean` | sim | `false` |  | TRUE se produto tem variações de cor. Cache de COUNT(product_variants WHERE color_id IS NOT NULL). |
| 60 | `has_sizes` | `boolean` | sim | `false` |  | TRUE se produto tem variações de tamanho. Cache similar a has_colors. |
| 63 | `ncm_code` | `character varying(10)` | sim |  |  | Código NCM fiscal (8 dígitos, sem pontos). Ex: "42022220". Relação com ncm_id: trg_sync_ncm_id (BEFORE INS/UPD) mantém ncm_code ↔ ncm_id sincronizados bidirecionalmente. ncm_id = FK → ncm_codes (tabela mestra); ncm_code = chave natural textual. Ambos preenchidos em 7561/7591 produtos (99.6%). 221 codes distintos, 213 ids distintos (alguns codes mapeiam ao mesmo NCM na tabela mestra). ncm_code é mantido para pipelines de importação que recebem o código textual; após normalização, ncm_id é a referência canônica para joins. Referenciado em 16 funções (ver fn_get_ncm_id, fn_normalize_ncm, fn_standardize_raw). CHECK de formato: ncm_code ~ '^[0-9]{8}$' planejado mas NÃO adicionado por ora   (verificar funções de importação que podem enviar formatos alternativos antes). |
| 64 | `origin_country` | `character varying(100)` | sim |  |  | País de origem ISO 3166-1 alpha-2 (ex: BR, CN). Usado em cálculos fiscais. |
| 68 | `last_stock_update_at` | `timestamp with time zone` | sim |  |  | Último update de estoque. 30% preenchido. Auditoria de frescor. |
| 69 | `supplier_reference` | `character varying(50)` | sim |  |  | Código interno do fornecedor para este produto. Rastreabilidade. |
| 70 | `is_textil` | `boolean` | sim | `false` |  | TRUE se têxtil (camiseta, toalha). Afeta weight_gr e surface_finish. |
| 71 | `has_capacity` | `boolean` | sim | `false` |  | TRUE se produto tem variações de capacidade (ml). Cache de variantes. |
| 72 | `combined_sizes` | `character varying(200)` | sim |  |  | String consolidada de tamanhos disponíveis (ex: "P/M/G/GG"). Cache para display rápido. |
| 73 | `gender` | `character varying(20)` | sim |  |  | Gênero do produto (M/F/U=unissex). Classificação para segmentação. |
| 74 | `is_stockout` | `boolean` | sim | `false` |  | Flag auto-calculado: true quando stock_quantity = 0. Mantido por trigger. |
| 77 | `weight_g` | `integer` | sim |  |  | Peso em gramas SEM embalagem |
| 78 | `length_cm` | `numeric(8,2)` | sim |  |  | Profundidade do produto em cm |
| 79 | `width_cm` | `numeric(8,2)` | sim |  |  | Largura do produto em cm |
| 80 | `height_cm` | `numeric(8,2)` | sim |  |  | Altura do produto em cm |
| 81 | `dimensions_display` | `character varying(255)` | sim |  |  | Campo CANÔNICO de dimensões. Fonte: produtos_padronizacao.dimensions_display. |
| 82 | `box_length_cm` | `numeric(8,2)` | sim |  |  | Comprimento da caixa master em CENTÍMETROS |
| 83 | `box_width_cm` | `numeric(8,2)` | sim |  |  | Largura da caixa master em CENTÍMETROS |
| 84 | `box_height_cm` | `numeric(8,2)` | sim |  |  | Altura da caixa master em CENTÍMETROS |
| 85 | `box_volume_cm3` | `numeric(12,2)` | sim |  |  | Volume da embalagem calculado (length×width×height cm³). |
| 86 | `box_quantity` | `integer` | sim |  |  | Quantidade de produtos por caixa master. |
| 87 | `box_inner_quantity` | `integer` | sim |  |  | Quantidade por caixa interna (inner box). |
| 88 | `packing_type` | `character varying(100)` | sim |  |  | Tipo de embalagem original. Ex: caixa_individual, polybag, granel. |
| 89 | `repacking_type` | `character varying(100)` | sim |  |  | Tipo de embalagem quando produto é personalizado. Origem: raw_data.Repacking |
| 92 | `capacities` | `character varying(255)` | sim |  |  | String de capacidades disponíveis (ex: "250ml/350ml/500ml"). Cache. |
| 93 | `last_sync_at` | `timestamp with time zone` | sim |  |  | Data/hora da última sincronização com fornecedor |
| 94 | `last_sync_supplier_id` | `uuid` | sim |  |  | ID do fornecedor da última sincronização |
| 95 | `sync_status` | `character varying(20)` | sim | `'pending'::character varying` |  | Status: pending, synced, error, manual |
| 96 | `diameter_cm` | `numeric(8,2)` | sim |  |  | Diâmetro em cm (cilíndricos) |
| 98 | `shape_type` | `character varying(20)` | sim | `'rectangular'::character varying` |  | Formato: rectangular, cylindrical, irregular |
| 99 | `internal_height_cm` | `numeric(8,2)` | sim |  |  | Dimensão interna (altura) para kits/embalagens. null_frac=99.8% (9 valores distintos). Usado em 12 arquivos frontend (kit-builder). DROP requer refatoração coordenada. |
| 100 | `internal_width_cm` | `numeric(8,2)` | sim |  |  | Dimensão interna (largura). null_frac=99.8%. Usado em kit-builder. DROP requer refatoração coordenada. |
| 101 | `internal_length_cm` | `numeric(8,2)` | sim |  |  | Dimensão interna (comprimento). null_frac=99.8%. Usado em kit-builder. DROP requer refatoração coordenada. |
| 103 | `packaging_material` | `character varying(100)` | sim |  |  | Material da embalagem. Ex: papel, plástico. |
| 108 | `is_imported` | `boolean` | sim | `true` |  | TRUE se produto importado (vs nacional). Afeta cálculos fiscais. |
| 109 | `lead_time_days` | `integer` | sim |  |  | Prazo de produção em dias úteis. 82% preenchido (NULL=herda fornecedor). Valores: 2 ou 3. |
| 112 | `supply_mode` | `character varying(30)` | sim | `'pronta_entrega_liso'::character varying` |  | Modalidade de fornecimento. FLAG-MORTA: constante pronta_entrega_liso. Futuro uso: diferenciar modos. |
| 113 | `is_thermal` | `boolean` | sim | `false` |  | TRUE se produto térmico (garrafa, caneca). Classificação automática. |
| 114 | `capacity_ml` | `integer` | sim |  |  | Capacidade em ml (para copos, garrafas, canecas). Extraído do name por trigger. |
| 115 | `slug` | `text` | sim |  |  | URL slug. CHECK garante formato a-z0-9-. Trigger trg_products_slug_redirect cria seo_redirects em UPDATE. |
| 116 | `ai_summary` | `text` | sim |  |  | Sumário gerado por IA para product cards. Worker parado desde 2026-04-23. |
| 119 | `target_audience` | `text[]` | sim |  |  | Público-alvo do produto (array). Ex: ["corporativo","executivo"]. |
| 120 | `schema_json` | `jsonb` | sim |  |  | JSON-LD structured data para SEO (Product schema.org). |
| 121 | `canonical_url` | `text` | sim |  |  | URL canônica SEO (/produto/{slug}). Gerada por trigger. |
| 122 | `robots_meta` | `text` | sim | `'index, follow'::text` |  | FLAG-MORTA: constante "index, follow" em 100% dos registros. CHECK chk_products_robots_meta_constant garante imutabilidade. Mantida para compat com v_products_public, vw_sitemap_products e fn_refresh_product_satellites. Candidata a DROP quando essas referências forem refatoradas (hardcode o valor na view/função). 2026-06-23: CHECK de imutabilidade adicionado. |
| 123 | `seo_score` | `integer` | sim | `0` |  | Score SEO 0-100 calculado por fn_refresh_product_satellites. Auditoria. |
| 124 | `seo_last_audit_at` | `timestamp with time zone` | sim |  |  | Timestamp do último audit SEO. |
| 125 | `seo_issues` | `jsonb` | sim | `'[]'::jsonb` |  | Lista de problemas SEO identificados |
| 126 | `og_title` | `text` | sim |  |  | Open Graph title. Default = meta_title. Social sharing. |
| 127 | `og_description` | `text` | sim |  |  | Open Graph description. Default = meta_description. |
| 128 | `og_image_url` | `text` | sim |  |  | Open Graph image. Default = primary_image_url. |
| 129 | `description_packaging_info` | `jsonb` | sim |  |  | Informações de embalagem extraídas automaticamente da descrição |
| 130 | `has_optional_packaging` | `boolean` | sim | `false` |  | Indica se existe embalagem vendida separadamente para este produto |
| 131 | `optional_packaging_ref` | `character varying(20)` | sim |  |  | Referência de embalagem opcional. null_frac=99%+. 1 ref frontend. Candidata a DROP após refatoração. |
| 132 | `packing_classification` | `character varying(20)` | sim |  |  | Classificação semântica da embalagem. Derivada pelo pipeline. |
| 136 | `ipi_rate` | `numeric(5,2)` | sim |  |  | Alíquota IPI do produto (%) |
| 137 | `tax_reference_state` | `character varying(2)` | sim |  |  | UF de referência para cálculo de impostos |
| 138 | `engraving_type` | `text` | sim |  |  | Técnica de gravação principal do produto. Ex: serigrafia, laser, bordado. |
| 139 | `supplier_updated_at` | `timestamp with time zone` | sim |  |  | Última atualização recebida do fornecedor. Frescor de sync. |
| 140 | `has_gift_box` | `boolean` | sim | `false` |  | TRUE se tem caixa presente como padrão ou opção. |
| 141 | `min_order_quantity` | `integer` | sim |  |  | Override de mínimo por produto. 57% preenchido. NULL→herda categoria. |
| 142 | `ai_title` | `text` | sim |  |  | Título gerado por IA. Par com ai_description. Worker parado desde 2026-04-23. |
| 143 | `ai_description` | `text` | sim |  |  | Descrição gerada por IA. null_frac≈63% (worker parado desde 2026-04-23, reativação pendente). Gerado via ai_enrichment_queue. |
| 144 | `ai_version` | `integer` | sim | `0` |  | Versão do modelo de IA que gerou o conteúdo. Inteiro incremental. |
| 145 | `ai_generated_at` | `timestamp with time zone` | sim |  |  | Timestamp de geração do conteúdo de IA. |
| 146 | `ai_model` | `character varying(50)` | sim |  |  | Identificador do modelo de IA (ex: claude-3-sonnet-20240229). |
| 147 | `box_image` | `text` | sim |  |  | URL da imagem da embalagem do produto. Origem: SPOT API BoxImage |
| 148 | `repacking_classification` | `text` | sim |  |  | Classificação da embalagem COM gravação: commercial, protective, none, original |
| 149 | `has_commercial_packaging` | `boolean` | sim | `false` |  | TRUE se tem embalagem comercial própria. |
| 150 | `packaging_context` | `text` | sim |  |  | Contexto da embalagem comercial: always, with_customization, without_customization |
| 151 | `bitrix_product_id` | `integer` | sim |  |  | ID do produto no sistema Bitrix24 (ERP/CRM). 80% preenchido. Integração bidirecional. |
| 152 | `novelty_detected_at` | `timestamp with time zone` | sim |  |  | Quando o produto foi detectado como novidade. Alimenta badge "Novo". |
| 153 | `novelty_expires_at` | `timestamp with time zone` | sim |  |  | Quando expira o badge de novidade. |
| 154 | `ncm_id` | `uuid` | sim |  |  | FK para ncm_codes. Populado automaticamente pelo trigger trg_sync_ncm_id a partir de ncm_code. |
| 155 | `bitrix_images_synced_at` | `timestamp with time zone` | sim |  |  | Timestamp do último sync de imagens com Bitrix24. |
| 156 | `is_featured_expires_at` | `timestamp with time zone` | sim |  |  | Quando expira o status de destaque (is_featured). NULL = permanente. |
| 157 | `is_bestseller_expires_at` | `timestamp with time zone` | sim |  |  | Quando expira o status bestseller. NULL = permanente. |
| 159 | `is_new_expires_at` | `timestamp with time zone` | sim |  |  | Quando expira o status de novo. NULL = permanente. |
| 160 | `supplier_product_url` | `text` | sim |  |  | URL da pagina do produto no site do fornecedor (ex: https://www.xbzbrindes.com.br/09139a). Auto-gerado via padrao do fornecedor + supplier_reference. Pode ser editado manualmente. |
| 162 | `cubic_weight` | `numeric(10,2)` | sim |  |  | Peso cúbico (volume em cm³ / fator de cubagem do frete). Usado no cálculo de frete. |
| 164 | `auto_material` | `text` | sim |  |  | Material detectado automaticamente pelo pipeline de IA. Texto livre. |
| 166 | `price_updated_at` | `timestamp with time zone` | sim |  |  | Timestamp da última atualização de preço (sale_price ou cost_price). |
| 168 | `price_freshness_threshold_days` | `integer` | sim | `60` |  | FLAG-MORTA: constante 60. Threshold de frescor de preço em dias. CHECK range 1-365. 2026-06-23. |
| 169 | `set_image_url` | `text` | sim |  |  | URL da imagem "set" (todas as cores juntas) no Cloudflare Images. Usada como imagem de hover no catálogo. Sem sufixo de variante — concatenar /public. SPOT: image_type=set original. XBZ: imagem d1 reclassificada (2026-06-02). |
| 170 | `search_vector` | `tsvector` | sim |  |  | Vetor tsvector para busca full-text. Mantido por trigger (Weight A=name, B=description, C=tags). Alimenta fn_global_search. |
| 171 | `locked_fields` | `text[]` | não | `'{}'::text[]` |  | Array de nomes de colunas protegidas de sobrescrita pelo pipeline. Gerenciado por trg_aa_capture_manual_edits. |
| 172 | `supplier_type` | `text` | sim |  |  | Tipo do fornecedor deste produto. Derivado de suppliers.type. |
| 173 | `supplier_type_code` | `text` | sim |  |  |  |
| 174 | `supplier_subtype` | `text` | sim |  |  | Subtipo do fornecedor. Derivado de suppliers.subtype. |
| 175 | `supplier_subtype_code` | `text` | sim |  |  |  |
| 176 | `certificates` | `jsonb` | sim |  |  |  |
| 177 | `certificate_files` | `jsonb` | sim |  |  |  |
| 178 | `weight_gr` | `text` | sim |  |  | Gramatura têxtil em g/m² (texto, ex: "80 g/m²"). DIFERENTE de weight_g (peso em gramas). 114 registros (produtos têxteis). |
| 179 | `related_references` | `jsonb` | sim |  |  |  |
| 180 | `is_seasonal` | `boolean` | sim |  |  | Produto sazonal. Classificação de sazionalidade (Natal, Páscoa, etc). |
| 181 | `pvc_free` | `boolean` | sim |  |  | TRUE se produto é livre de PVC. Campo de compliance ambiental. |
| 183 | `price_verified_at` | `timestamp with time zone` | sim |  |  | Timestamp da última verificação manual de preço. |
| 184 | `engraving_description` | `text` | sim |  |  |  |
| 185 | `primary_image_fallback_url` | `text` | sim |  |  |  |
| 186 | `sub_brand` | `text` | sim |  |  | Sub-marca ou linha do produto (ex: Linha Premium, Linha Eco). 15.8% preenchido. |
| 187 | `sub_brand_id` | `uuid` | sim |  |  | FK para a sub-marca (uuid). Par com sub_brand. 15.8% preenchido. |
| 188 | `supplier_categories` | `jsonb` | sim |  |  | Catálogos comerciais do fornecedor (ex: ["SPOT","Our Nature","Stockout"]). Origem: campo Catalogs do OptionalsComplete (SPOT). Fluxo: Bronze raw_data -> Prata (fn_spot_silver_enrich) -> Gold (fn_spot_gold_enrich). |
| 189 | `catalog_schema` | `text` | sim |  |  | Segmento SPOT. Propagado de produtos_padronizacao.catalog_schema.   active \| stockout \| promotional \| seasonal |
| 190 | `circumference_cm` | `numeric` | sim |  |  | Circunferência em cm (calculada de diameter_cm × π para objetos cilíndricos). |
| 191 | `packing_type_canonical` | `text` | sim | `fn_normalize_packing_type((packing_type)::text)` | s | Canônico normalizado de packing_type. Gerado automaticamente por fn_normalize_packing_type(). 21 valores possíveis. Sempre sincronizado com packing_type (coluna gerada). |
| 192 | `surface_finish` | `text[]` | sim | `'{}'::text[]` |  |  |
| 193 | `price_last_verified_at` | `timestamp with time zone` | sim |  |  | Última vez que o preço foi VERIFICADO (independente de ter mudado). Diferente de price_updated_at que só muda quando o preço muda. Usado para o badge #19 Freshness de Preço: stale = NOW()-price_last_verified_at > price_freshness_threshold_days. Atualizado pelo pipeline de sync de cada fornecedor. |
| 194 | `color_swatches` | `jsonb` | sim | `'[]'::jsonb` |  | jsonb de swatches de cor para exibição em grid. Gerado por fn_generate_color_swatches. |
| 195 | `dimensions_source` | `character varying(20)` | sim |  |  | Origem/unidade das dimensões escalares. Valores: cm, mm, estimated, manual, supplier. Migrado de dimensions->unit_detected em 2026-06-23. |
| 196 | `modo_de_uso` | `text` | sim |  |  | Instruções de uso do produto, conforme publicado na página do produto XBZ (site_data.modo_de_uso). Campo informativo, não operacional. |
| 197 | `is_closeout` | `boolean` | não | `false` |  | Indica produto em ponta de estoque / liquidação no fornecedor XBZ (WebTipo=PONTA DE ESTOQUE). Atualizado via sync. Não afeta is_active — produto pode ser ativo e em liquidação simultaneamente. |
| 198 | `xbz_stock_reliability_id` | `smallint` | sim |  |  | ID numérico do status de confiabilidade de estoque XBZ (IdStatusConfiabilidade). Valor conhecido: 10 = estoque confirmado por inventário recente. NULL = não informado ou fornecedor diferente de XBZ. |
| 199 | `xbz_stock_reliability_text` | `text` | sim |  |  | Descrição completa do status de confiabilidade de estoque XBZ (StatusConfiabilidade). Ex.: "Quantidade CONFIÁVEL. Confirmada através de inventário realizado recentemente." Atualizado via sync. |
| 200 | `is_online_exclusive` | `boolean` | não | `false` |  | Indica produto de venda exclusiva pelo canal online no fornecedor Spot/Stricker (OnlineExclusive=true). Atualizado via sync. DEFAULT false para todos os fornecedores que não usam este flag. |
| 201 | `category_name` | `text` | sim |  |  | Cache desnormalizado de categories.name via category_id. Mantido sincronizado por trg_sync_product_category_name. Restaurado em 2026-06-25 após migrations 20260519163704/164522 não terem executado em produção (statements:[]). |
| 202 | `padronizacao_id` | `uuid` | sim |  |  | [fix_version:silver_gold_link_20260627] FK para o registro Silver canônico (produtos_padronizacao)  que originou este produto Gold. Populado pelo medallion promote tick.  NULL = produto criado manualmente sem origem Silver.  ON DELETE SET NULL: remoção do Silver não quebra o Gold.  Para produtos com múltiplos Silver (multi-fornecedor), aponta para o Silver  com promoted_at mais recente. |
| 203 | `ean` | `character varying(20)` | sim |  |  | Código de barras EAN. fix_version=cadastro-produtos-audit-20260627-v1 |
| 204 | `gtin` | `character varying(20)` | sim |  |  | GTIN. fix_version=cadastro-produtos-audit-20260627-v1 |
| 205 | `icms_rate` | `numeric(5,2)` | sim |  |  | Alíquota ICMS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1 |
| 206 | `pis_rate` | `numeric(5,2)` | sim |  |  | Alíquota PIS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1 |
| 207 | `cofins_rate` | `numeric(5,2)` | sim |  |  | Alíquota COFINS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1 |
| 208 | `cfop` | `character varying(10)` | sim |  |  | CFOP. fix_version=cadastro-produtos-audit-20260627-v1 |
| 209 | `csosn` | `character varying(10)` | sim |  |  | CSOSN (Simples). fix_version=cadastro-produtos-audit-20260627-v1 |
| 210 | `cest` | `character varying(10)` | sim |  |  | CEST. fix_version=cadastro-produtos-audit-20260627-v1 |
| 211 | `tax_regime` | `character varying(50)` | sim |  |  | Regime tributário. fix_version=cadastro-produtos-audit-20260627-v1 |
| 212 | `is_on_sale` | `boolean` | não | `false` |  | Flag promoção. SEM requires-expires (evita novo crash). fix_version=cadastro-produtos-audit-20260627-v1 |
| 213 | `is_on_sale_expires_at` | `timestamp with time zone` | sim |  |  | Expiração da promoção. fix_version=cadastro-produtos-audit-20260627-v1 |
| 214 | `internal_diameter_cm` | `numeric(8,2)` | sim |  |  | Diâmetro interno (cm). fix_version=cadastro-produtos-audit-20260627-v1 |
| 215 | `packaging_color` | `character varying(100)` | sim |  |  | Cor da embalagem. fix_version=cadastro-produtos-audit-20260627-v1 |
| 216 | `packaging_finish` | `character varying(100)` | sim |  |  | Acabamento da embalagem. fix_version=cadastro-produtos-audit-20260627-v1 |
| 217 | `key_benefits` | `text[]` | sim |  |  | Benefícios-chave (array). fix_version=cadastro-produtos-audit-20260627-v1 |
| 218 | `use_cases` | `text[]` | sim |  |  | Casos de uso (array). fix_version=cadastro-produtos-audit-20260627-v1 |
| 219 | `warranty_months` | `integer` | sim |  |  | Garantia (meses). fix_version=cadastro-produtos-audit-20260627-v1 |
| 220 | `shipping_weight_kg` | `numeric(10,3)` | sim |  |  | Peso para frete (kg). fix_version=cadastro-produtos-audit-20260627-v1 |
| 221 | `shipping_width_cm` | `numeric(8,2)` | sim |  |  | Largura p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1 |
| 222 | `shipping_height_cm` | `numeric(8,2)` | sim |  |  | Altura p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1 |
| 223 | `shipping_length_cm` | `numeric(8,2)` | sim |  |  | Comprimento p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1 |
| 224 | `freight_class` | `character varying(50)` | sim |  |  | Classe de frete. fix_version=cadastro-produtos-audit-20260627-v1 |
| 225 | `default_carrier` | `character varying(100)` | sim |  |  | Transportadora padrão. fix_version=cadastro-produtos-audit-20260627-v1 |
| 226 | `requires_special_shipping` | `boolean` | não | `false` |  | Exige frete especial. fix_version=cadastro-produtos-audit-20260627-v1 |
| 227 | `shipping_notes` | `character varying(500)` | sim |  |  | Observações de frete. fix_version=cadastro-produtos-audit-20260627-v1 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_cost_price_not_zero | CHECK | `CHECK (cost_price IS NULL OR cost_price > 0::numeric)` |  |  | sim |
| chk_products_active_has_identity | CHECK | `CHECK (NOT (is_active AND sku IS NULL AND supplier_reference IS NULL))` |  |  | sim |
| chk_products_bestseller_requires_expires | CHECK | `CHECK (NOT (is_bestseller = true AND is_bestseller_expires_at IS NULL))` |  |  | sim |
| chk_products_capacity_ml_pos | CHECK | `CHECK (capacity_ml IS NULL OR capacity_ml > 0)` |  |  | sim |
| chk_products_circumference_pos | CHECK | `CHECK (circumference_cm IS NULL OR circumference_cm > 0::numeric)` |  |  | sim |
| chk_products_cofins_rate_range | CHECK | `CHECK (cofins_rate IS NULL OR cofins_rate >= 0::numeric AND cofins_rate <= 100::numeric)` |  |  | sim |
| chk_products_featured_requires_expires | CHECK | `CHECK (NOT (is_featured = true AND is_featured_expires_at IS NULL))` |  |  | sim |
| chk_products_gender_valid | CHECK | `CHECK (gender IS NULL OR (gender::text = ANY (ARRAY['masculino'::character varying, 'feminino'::character varying, 'infantil'::character varying, 'unissex'::character varying]::text[])))` |  |  | sim |
| chk_products_icms_rate_range | CHECK | `CHECK (icms_rate IS NULL OR icms_rate >= 0::numeric AND icms_rate <= 100::numeric)` |  |  | sim |
| chk_products_ipi_rate_range | CHECK | `CHECK (ipi_rate IS NULL OR ipi_rate >= 0::numeric AND ipi_rate <= 100::numeric)` |  |  | sim |
| chk_products_is_new_requires_expires | CHECK | `CHECK (NOT (is_new = true AND is_new_expires_at IS NULL))` |  |  | sim |
| chk_products_lead_time_nonneg | CHECK | `CHECK (lead_time_days IS NULL OR lead_time_days >= 0)` |  |  | sim |
| chk_products_meta_desc_length | CHECK | `CHECK (meta_description IS NULL OR length(meta_description) >= 50 AND length(meta_description) <= 170)` |  |  | sim |
| chk_products_meta_title_length | CHECK | `CHECK (meta_title IS NULL OR length(meta_title) >= 10 AND length(meta_title) <= 70)` |  |  | sim |
| chk_products_min_order_positive | CHECK | `CHECK (min_order_quantity IS NULL OR min_order_quantity >= 1)` |  |  | sim |
| chk_products_min_quantity_pos | CHECK | `CHECK (min_quantity IS NULL OR min_quantity >= 1)` |  |  | sim |
| chk_products_name_max_length | CHECK | `CHECK (length(name) <= 250)` |  |  | sim |
| chk_products_name_not_empty | CHECK | `CHECK (length(TRIM(BOTH FROM name)) > 0)` |  |  | sim |
| chk_products_pis_rate_range | CHECK | `CHECK (pis_rate IS NULL OR pis_rate >= 0::numeric AND pis_rate <= 100::numeric)` |  |  | sim |
| chk_products_price_freshness_constant | CHECK | `CHECK (price_freshness_threshold_days IS NULL OR price_freshness_threshold_days >= 1 AND price_freshness_threshold_days <= 365)` |  |  | sim |
| chk_products_robots_meta_constant | CHECK | `CHECK (robots_meta IS NULL OR robots_meta = 'index, follow'::text)` |  |  | sim |
| chk_products_sale_price_nonneg | CHECK | `CHECK (sale_price IS NULL OR sale_price >= 0::numeric)` |  |  | sim |
| chk_products_seo_score_range | CHECK | `CHECK (seo_score IS NULL OR seo_score >= 0 AND seo_score <= 100)` |  |  | sim |
| chk_products_sku_promo_equals_sku | CHECK | `CHECK (sku_promo::text = sku)` |  |  | sim |
| chk_products_slug_format | CHECK | `CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)` |  |  | sim |
| chk_products_warranty_months_nonneg | CHECK | `CHECK (warranty_months IS NULL OR warranty_months >= 0)` |  |  | sim |
| chk_products_weight_nonneg | CHECK | `CHECK (weight_g IS NULL OR weight_g >= 0)` |  |  | sim |
| products_catalog_schema_check | CHECK | `CHECK (catalog_schema = ANY (ARRAY['active'::text, 'stockout'::text, 'promotional'::text, 'seasonal'::text]))` |  |  | sim |
| products_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| products_cost_price_nonneg | CHECK | `CHECK (cost_price IS NULL OR cost_price >= 0::numeric)` |  |  | sim |
| products_dimensions_source_check | CHECK | `CHECK (dimensions_source IS NULL OR (dimensions_source::text = ANY (ARRAY['cm'::character varying, 'mm'::character varying, 'estimated'::character varying, 'manual'::character varying, 'supplier'::character varying]::text[])))` |  |  | sim |
| products_main_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (main_category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| products_ncm_id_fkey | FOREIGN KEY | `FOREIGN KEY (ncm_id) REFERENCES ncm_codes(id)` | NO ACTION | NO ACTION | sim |
| products_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| products_padronizacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (padronizacao_id) REFERENCES produtos_padronizacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| products_price_freshness_threshold_days_check | CHECK | `CHECK (price_freshness_threshold_days IS NULL OR price_freshness_threshold_days >= 1 AND price_freshness_threshold_days <= 365)` |  |  | sim |
| products_product_type_check | CHECK | `CHECK (product_type = ANY (ARRAY['product'::text, 'packaging'::text, 'accessory'::text, 'kit'::text, 'component'::text]))` |  |  | sim |
| products_shape_type_check | CHECK | `CHECK (shape_type IS NULL OR (shape_type::text = ANY (ARRAY['rectangular'::character varying, 'cylindrical'::character varying, 'irregular'::character varying]::text[])))` |  |  | sim |
| products_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |
| products_sub_brand_id_fkey | FOREIGN KEY | `FOREIGN KEY (sub_brand_id) REFERENCES supplier_sub_brands(id)` | NO ACTION | NO ACTION | sim |
| products_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| products_supply_mode_check | CHECK | `CHECK (supply_mode::text = ANY (ARRAY['pronta_entrega_liso'::character varying, 'fabricado_personalizado'::character varying, 'fabricado_liso'::character varying]::text[]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ai_enrichment_queue | ai_enrichment_queue_product_id_fkey | product_id | CASCADE |
| public.asia_image_import_queue | asia_image_import_queue_product_id_fkey | product_id | NO ACTION |
| public.b2b_collection_products | collection_products_product_id_fkey | product_id | CASCADE |
| public.collection_products | collection_products_product_id_fkey1 | product_id | CASCADE |
| public.commemorative_date_exclusions | commemorative_date_exclusions_product_id_fkey | product_id | CASCADE |
| public.favorite_items | favorite_items_product_id_fkey | product_id | CASCADE |
| public.generated_mockups | generated_mockups_product_id_fkey | product_id | SET NULL |
| public.kit_component_enrichment_raw | kit_component_enrichment_raw_kit_product_id_fkey | kit_product_id | CASCADE |
| public.kit_component_padronizacao | kit_component_padronizacao_component_product_id_fkey | component_product_id | SET NULL |
| public.kit_component_padronizacao | kit_component_padronizacao_kit_product_id_fkey | kit_product_id | CASCADE |
| public.kit_component_variant_skus | kit_component_variant_skus_kit_product_id_fkey | kit_product_id | CASCADE |
| public.markup_configurations | markup_configurations_product_id_fkey | product_id | CASCADE |
| public.mockup_generation_jobs | mockup_generation_jobs_product_id_fkey | product_id | SET NULL |
| public.mockup_templates | mockup_templates_product_id_fkey | product_id | CASCADE |
| public.order_items | order_items_product_id_fkey | product_id | NO ACTION |
| public.personalization_simulations | personalization_simulations_product_id_fkey | product_id | SET NULL |
| public.print_area_techniques | fk_pat_product_id | product_id | NO ACTION |
| public.product_ai_content | product_ai_content_product_id_fkey | product_id | CASCADE |
| public.product_ai_history | product_ai_history_product_id_fkey | product_id | CASCADE |
| public.product_attributes | product_attributes_product_id_fkey | product_id | CASCADE |
| public.product_category_assignments | product_category_assignments_product_id_fkey | product_id | CASCADE |
| public.product_commemorative_dates | product_commemorative_dates_product_id_fkey | product_id | CASCADE |
| public.product_customization_prices | product_customization_prices_product_id_fkey | product_id | CASCADE |
| public.product_deactivation_requests | product_deactivation_requests_product_id_fkey | product_id | CASCADE |
| public.product_deactivation_tokens | fk_auth_product_cascade | product_id | CASCADE |
| public.product_faqs | product_faqs_product_id_fkey | product_id | CASCADE |
| public.product_fiscal | product_fiscal_product_id_fkey | product_id | CASCADE |
| public.product_images | product_images_product_id_fkey | product_id | CASCADE |
| public.product_included_packagings | product_included_packagings_product_id_fkey | product_id | CASCADE |
| public.product_kit_components | product_kit_components_component_product_id_fkey | component_product_id | CASCADE |
| public.product_kit_components | product_kit_components_kit_product_id_fkey | kit_product_id | CASCADE |
| public.product_materials | product_materials_product_id_fkey | product_id | CASCADE |
| public.product_notebook_features | product_notebook_features_product_id_fkey | product_id | CASCADE |
| public.product_notebook_specs | product_notebook_specs_product_id_fkey | product_id | CASCADE |
| public.product_novelties | fk_pn_product | product_id | CASCADE |
| public.product_packaging | product_packaging_fk | product_id | CASCADE |
| public.product_packaging_compatibility | product_packaging_compatibility_packaging_id_fkey | packaging_id | CASCADE |
| public.product_packaging_compatibility | product_packaging_compatibility_product_id_fkey | product_id | CASCADE |
| public.product_packagings | product_packagings_product_id_fkey | product_id | CASCADE |
| public.product_physical | product_physical_product_id_fkey | product_id | CASCADE |
| public.product_print_positions | product_print_positions_product_id_fkey | product_id | CASCADE |
| public.product_properties | product_properties_product_id_fkey | product_id | CASCADE |
| public.product_qa_image_alerts | product_qa_image_alerts_product_id_fkey | product_id | CASCADE |
| public.product_relationships | product_relationships_product_id_fkey | product_id | CASCADE |
| public.product_relationships | product_relationships_related_product_id_fkey | related_product_id | CASCADE |
| public.product_seo | product_seo_product_id_fkey | product_id | CASCADE |
| public.product_similarity_group_members | product_similarity_group_members_product_id_fkey | product_id | NO ACTION |
| public.product_supply | product_supply_product_id_fkey | product_id | CASCADE |
| public.product_tags | product_tags_product_id_fkey | product_id | CASCADE |
| public.product_target_audiences | product_target_audiences_product_id_fkey | product_id | CASCADE |
| public.product_variants | product_variants_product_id_fkey | product_id | CASCADE |
| public.product_videos | product_videos_product_id_fkey | product_id | CASCADE |
| public.product_views | fk_product_views_products | product_id | CASCADE |
| public.produto_ramo_atividade | produto_ramo_atividade_produto_id_fkey | produto_id | CASCADE |
| public.produtos_padronizacao | produtos_padronizacao_product_id_fkey | product_id | SET NULL |
| public.produtos_site_padronizacao | produtos_site_padronizacao_product_id_fkey | product_id | SET NULL |
| public.quote_items | quote_items_product_id_fkey | product_id | SET NULL |
| public.quote_items | quote_items_selected_packaging_id_fkey | selected_packaging_id | SET NULL |
| public.search_queries | search_queries_clicked_product_id_fkey | clicked_product_id | SET NULL |
| public.stock_daily_summary | stock_daily_summary_product_id_fkey | product_id | CASCADE |
| public.stock_snapshots | stock_snapshots_product_id_fkey | product_id | CASCADE |
| public.supplier_products_raw | supplier_products_raw_product_id_fkey | product_id | SET NULL |
| public.user_favorites | user_favorites_product_id_fkey | product_id | CASCADE |
| public.variant_commemorative_dates | variant_commemorative_dates_product_id_fkey | product_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_products_active | btree | is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_products_active ON public.products USING btree (is_active) WHERE (is_active = true)` |
| idx_products_active_created_at_desc | btree | created_at, id | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_active_created_at_desc ON public.products USING btree (created_at DESC, id) WHERE ((is_active = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_active_not_deleted | btree | id | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_active_not_deleted ON public.products USING btree (id) WHERE ((is_active = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_bestseller_expires | btree | is_bestseller_expires_at | não | sim | `((is_bestseller = true) AND (is_bestseller_expires_at IS NOT NULL))` | `CREATE INDEX idx_products_bestseller_expires ON public.products USING btree (is_bestseller_expires_at) WHERE ((is_bestseller = true) AND (is_bestseller_expires_at IS NOT NULL))` |
| idx_products_category | btree | category_id | não | sim |  | `CREATE INDEX idx_products_category ON public.products USING btree (category_id)` |
| idx_products_color_swatches_gin | gin | color_swatches | não | sim |  | `CREATE INDEX idx_products_color_swatches_gin ON public.products USING gin (color_swatches)` |
| idx_products_dimensions_source | btree | dimensions_source | não | sim | `(dimensions_source IS NOT NULL)` | `CREATE INDEX idx_products_dimensions_source ON public.products USING btree (dimensions_source) WHERE (dimensions_source IS NOT NULL)` |
| idx_products_featured_expires | btree | is_featured_expires_at | não | sim | `((is_featured = true) AND (is_featured_expires_at IS NOT NULL))` | `CREATE INDEX idx_products_featured_expires ON public.products USING btree (is_featured_expires_at) WHERE ((is_featured = true) AND (is_featured_expires_at IS NOT NULL))` |
| idx_products_is_active_name | btree | name | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_is_active_name ON public.products USING btree (name) WHERE ((is_active = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_is_featured | btree | is_featured | não | sim |  | `CREATE INDEX idx_products_is_featured ON public.products USING btree (is_featured)` |
| idx_products_is_stockout | btree | is_stockout | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_is_stockout ON public.products USING btree (is_stockout) WHERE ((is_active = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_keyset_name_id | btree | name, id | não | sim | `((is_active = true) AND (is_deleted = false))` | `CREATE INDEX idx_products_keyset_name_id ON public.products USING btree (name, id) WHERE ((is_active = true) AND (is_deleted = false))` |
| idx_products_main_cat_active | btree | main_category_id, supplier_id | não | sim | `((is_active = true) AND (main_category_id IS NOT NULL))` | `CREATE INDEX idx_products_main_cat_active ON public.products USING btree (main_category_id, supplier_id) WHERE ((is_active = true) AND (main_category_id IS NOT NULL))` |
| idx_products_name_trgm | gin | name | não | sim |  | `CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops)` |
| idx_products_ncm_id | btree | ncm_id | não | sim |  | `CREATE INDEX idx_products_ncm_id ON public.products USING btree (ncm_id)` |
| idx_products_new_active_sort | btree | novelty_detected_at, id, novelty_expires_at, sale_price, stock_quantity, is_stockout, primary_image_url, category_id, supplier_id | não | sim | `(is_new = true)` | `CREATE INDEX idx_products_new_active_sort ON public.products USING btree (novelty_detected_at DESC, id) INCLUDE (novelty_expires_at, sale_price, stock_quantity, is_stockout, primary_image_url, category_id, supplier_id) WHERE (is_new = true)` |
| idx_products_new_sort | btree | novelty_detected_at | não | sim | `((is_new = true) AND (is_stockout = false) AND (is_active = true))` | `CREATE INDEX idx_products_new_sort ON public.products USING btree (novelty_detected_at DESC NULLS LAST) WHERE ((is_new = true) AND (is_stockout = false) AND (is_active = true))` |
| idx_products_novelty_expires_count | btree | novelty_expires_at | não | sim | `((is_active = true) AND (is_new = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_novelty_expires_count ON public.products USING btree (novelty_expires_at) WHERE ((is_active = true) AND (is_new = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_products_org ON public.products USING btree (organization_id)` |
| idx_products_padronizacao_id | btree | padronizacao_id | não | sim | `(padronizacao_id IS NOT NULL)` | `CREATE INDEX idx_products_padronizacao_id ON public.products USING btree (padronizacao_id) WHERE (padronizacao_id IS NOT NULL)` |
| idx_products_price_last_verified_at | btree | price_last_verified_at | não | sim | `((is_active = true) AND (is_deleted = false))` | `CREATE INDEX idx_products_price_last_verified_at ON public.products USING btree (price_last_verified_at NULLS FIRST) WHERE ((is_active = true) AND (is_deleted = false))` |
| idx_products_search_vector | gin | search_vector | não | sim |  | `CREATE INDEX idx_products_search_vector ON public.products USING gin (search_vector)` |
| idx_products_seo_audit_pending | btree | seo_last_audit_at | não | sim | `((is_active = true) AND (is_deleted = false))` | `CREATE INDEX idx_products_seo_audit_pending ON public.products USING btree (seo_last_audit_at NULLS FIRST) WHERE ((is_active = true) AND (is_deleted = false))` |
| idx_products_seo_listing | btree | seo_score, name | não | sim | `((is_active = true) AND (is_deleted = false))` | `CREATE INDEX idx_products_seo_listing ON public.products USING btree (seo_score, name) WHERE ((is_active = true) AND (is_deleted = false))` |
| idx_products_sku_promo | btree | sku_promo | sim | sim | `(sku_promo IS NOT NULL)` | `CREATE UNIQUE INDEX idx_products_sku_promo ON public.products USING btree (sku_promo) WHERE (sku_promo IS NOT NULL)` |
| idx_products_slug_active_lookup | btree | slug | não | sim | `(is_active = true)` | `CREATE INDEX idx_products_slug_active_lookup ON public.products USING btree (slug) WHERE (is_active = true)` |
| idx_products_slug_unique | btree | slug | sim | sim | `((slug IS NOT NULL) AND (is_deleted = false))` | `CREATE UNIQUE INDEX idx_products_slug_unique ON public.products USING btree (slug) WHERE ((slug IS NOT NULL) AND (is_deleted = false))` |
| idx_products_sub_brand_id | btree | sub_brand_id | não | sim |  | `CREATE INDEX idx_products_sub_brand_id ON public.products USING btree (sub_brand_id)` |
| idx_products_supplier | btree | supplier_id | não | sim |  | `CREATE INDEX idx_products_supplier ON public.products USING btree (supplier_id)` |
| idx_products_supplier_id_type_code | btree | supplier_id, supplier_type_code | não | sim | `(is_active = true)` | `CREATE INDEX idx_products_supplier_id_type_code ON public.products USING btree (supplier_id, supplier_type_code) WHERE (is_active = true)` |
| idx_products_surface_finish_gin | gin | surface_finish | não | sim | `((is_active = true) AND (is_deleted = false))` | `CREATE INDEX idx_products_surface_finish_gin ON public.products USING gin (surface_finish) WHERE ((is_active = true) AND (is_deleted = false))` |
| idx_products_target_audience_gin | gin | target_audience | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` | `CREATE INDEX idx_products_target_audience_gin ON public.products USING gin (target_audience) WHERE ((is_active = true) AND (is_deleted IS NOT TRUE))` |
| idx_products_xbz_reliability | btree | xbz_stock_reliability_id | não | sim | `(xbz_stock_reliability_id IS NOT NULL)` | `CREATE INDEX idx_products_xbz_reliability ON public.products USING btree (xbz_stock_reliability_id) WHERE (xbz_stock_reliability_id IS NOT NULL)` |
| products_main_category_id_idx | btree | main_category_id | não | sim |  | `CREATE INDEX products_main_category_id_idx ON public.products USING btree (main_category_id)` |
| products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)` |
| products_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku)` |
| uq_products_supplier_ref | btree | supplier_id, supplier_reference | sim | sim | `(supplier_reference IS NOT NULL)` | `CREATE UNIQUE INDEX uq_products_supplier_ref ON public.products USING btree (supplier_id, supplier_reference) WHERE (supplier_reference IS NOT NULL)` |


## Policies (RLS)

### `products_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `((is_active = true) AND (is_deleted IS NOT TRUE))` |
| WITH CHECK |  |

### `products_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(((is_active = true) AND (is_deleted IS NOT TRUE)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `products_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK |  |

### `products_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |

### `products_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_aa_block_product_deactivation | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_block_unauthorized_product_deactivation |
| trg_aa_capture_manual_edits | BEFORE | UPDATE | ROW | enabled | public.fn_products_capture_manual_edits |
| trg_auto_classify_kit | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_auto_classify_kit_product |
| trg_auto_classify_product | BEFORE | UPDATE | ROW | enabled | public.fn_trigger_auto_classify_product |
| trg_auto_extract_attributes | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_auto_extract_attributes |
| trg_calculate_sale_price | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_calculate_sale_price |
| trg_cascade_product_deactivation | AFTER | UPDATE | ROW | enabled | public.fn_cascade_product_deactivation |
| trg_classify_packing | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_classify_packing |
| trg_cleanup_ai_queue | AFTER | UPDATE | ROW | enabled | public.fn_cleanup_ai_queue_on_product_deactivate |
| trg_extract_materials_from_name | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_extract_materials_from_name |
| trg_fill_supplier_subtype | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_fill_supplier_subtype |
| trg_limpar_nome_produto | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trigger_limpar_nome_produto |
| trg_product_automation | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_product_automation |
| trg_product_status_sync_category_count | AFTER | UPDATE | ROW | enabled | public.fn_trigger_product_status_sync_category_count |
| trg_products_auto_materials | AFTER | UPDATE | ROW | enabled | public.trg_auto_process_product_materials |
| trg_products_search_vector | BEFORE | INSERT OR UPDATE | ROW | enabled | public.products_search_vector_update |
| trg_products_seo_autofill | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_products_seo_autofill |
| trg_products_slug_redirect | AFTER | UPDATE | ROW | enabled | public.trg_product_slug_redirect |
| trg_products_sync_ncm | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_sync_ncm_id |
| trg_qa_alert_activate_without_image | BEFORE | UPDATE | ROW | enabled | public.fn_qa_alert_on_activate_without_image |
| trg_recalc_compat_on_dims | AFTER | UPDATE | ROW | enabled | public.fn_recalc_compat_on_dim_change |
| trg_set_has_gift_box | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_set_has_gift_box |
| trg_set_has_optional_packaging | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_set_has_optional_packaging |
| trg_set_min_quantity | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_set_min_quantity |
| trg_set_product_as_new | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_set_product_as_new |
| trg_set_product_defaults | BEFORE | INSERT OR UPDATE | ROW | enabled | public.set_product_defaults_from_supplier |
| trg_sync_category_assignment | AFTER | UPDATE | ROW | enabled | public.fn_trg_sync_category_assignment |
| trg_sync_dimensions_display_gold | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_dimensions_display |
| trg_sync_novelty_expires_at | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_novelty_expires_at |
| trg_sync_pat_on_product_deactivate | AFTER | UPDATE | ROW | enabled | public.fn_sync_pat_on_product_status_change |
| trg_sync_product_ai_content | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_ai_on_change |
| trg_sync_product_category_name | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_category_name |
| trg_sync_product_deactivation_to_similarity | AFTER | UPDATE | ROW | enabled | public.fn_sync_product_deactivation_to_similarity |
| trg_sync_product_fiscal | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_fiscal_on_change |
| trg_sync_product_images_on_product_deactivate | AFTER | UPDATE | ROW | enabled | public.fn_sync_product_images_on_product_deactivate |
| trg_sync_product_physical | AFTER | UPDATE | ROW | enabled | public.fn_trg_sync_physical_on_product_update |
| trg_sync_product_seo | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_seo_on_change |
| trg_sync_product_status_fields | BEFORE | UPDATE | ROW | enabled | public.fn_trigger_sync_product_status_fields |
| trg_sync_product_supply | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_supply_on_change |
| trg_sync_sku_promo | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_sku_promo |
| trg_track_price_updated_products | BEFORE | UPDATE | ROW | enabled | public.fn_trigger_track_price_updated_products |
| trg_update_price_last_verified | BEFORE | UPDATE | ROW | enabled | public.fn_trigger_update_price_last_verified |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |


Grants por coluna:

| coluna | role | privilégios |
|---|---|---|
| id | anon | SELECT |
| is_active | anon | SELECT |
| is_deleted | anon | SELECT |
