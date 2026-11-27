-- Rollback: supabase/rollbacks/20261127010000_rollback.sql
-- approved-by: adm01-debug
-- transaction: none (CREATE INDEX CONCURRENTLY nao pode rodar dentro de transacao)
--
-- Causa medida: 51 foreign keys do schema public sem indice de suporte, medido
-- no catalogo (pg_constraint x pg_index) em 2026-11-26. Sem indice, cada DELETE/
-- UPDATE na tabela pai faz Seq Scan na tabela filha para checar a FK. Casos de
-- maior volume: stock_daily_summary (41.531 linhas, 2 FKs), supplier_products_raw
-- (20.947, 3 FKs), produtos_padronizacao_variantes (20.915, 3 FKs),
-- variant_supplier_sources (20.947, 1 FK), products (8.402, 3 FKs),
-- produtos_padronizacao (8.396, 2 FKs).
--
-- Origem: proposta P02_fk_indexes.sql da auditoria Supabase (ID-INT-001, nunca
-- aplicada, listava 6 FKs). Reaproveitada e re-medida contra o estado atual do
-- banco: hoje sao 51. Cada CREATE INDEX e independente e idempotente
-- (IF NOT EXISTS). Nenhum indice e parcial e nenhum e unique: nao alteram
-- nenhuma constraint, policy ou resultado de query - so plano de execucao.
--
-- Efeito de negocio: excluir/atualizar produto, variante, fornecedor, cor,
-- categoria, padronizacao ou NCM deixa de varrer dezenas de milhares de linhas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_asia_image_import_queue_variant_id ON asia_image_import_queue USING btree (variant_id)

-- asia_image_import_queue_variant_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_categories_parent_id ON categories USING btree (parent_id)

-- categories_parent_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_frontend_telemetry_user_id ON frontend_telemetry USING btree (user_id)

-- frontend_telemetry_user_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_inbound_webhook_events_endpoint_id ON inbound_webhook_events USING btree (endpoint_id)

-- inbound_webhook_events_endpoint_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_enrichment_raw_kit_component_id ON kit_component_enrichment_raw USING btree (kit_component_id)

-- kit_component_enrichment_raw_kit_component_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_enrichment_raw_kit_product_id ON kit_component_enrichment_raw USING btree (kit_product_id)

-- kit_component_enrichment_raw_kit_product_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_enrichment_raw_promoted_component_id ON kit_component_enrichment_raw USING btree (promoted_component_id)

-- kit_component_enrichment_raw_promoted_component_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_enrichment_raw_promoted_padronizacao_id ON kit_component_enrichment_raw USING btree (promoted_padronizacao_id)

-- kit_component_enrichment_raw_promoted_padronizacao_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_padronizacao_raw_id ON kit_component_padronizacao USING btree (raw_id)

-- fk_kcpad_raw_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_kit_component_padronizacao_kit_product_id ON kit_component_padronizacao USING btree (kit_product_id)

-- kit_component_padronizacao_kit_product_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_magazine_public_reactions_item_id ON magazine_public_reactions USING btree (item_id)

-- magazine_public_reactions_item_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_magazines_owner_id ON magazines USING btree (owner_id)

-- magazines_owner_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_markup_configurations_category_id ON markup_configurations USING btree (category_id)

-- markup_configurations_category_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_markup_configurations_variant_id ON markup_configurations USING btree (variant_id)

-- markup_configurations_variant_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_price_history_variant_id ON price_history USING btree (variant_id)

-- price_history_variant_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_print_area_techniques_tabela_preco_id ON print_area_techniques USING btree (tabela_preco_id)

-- print_area_techniques_tabela_preco_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_commemorative_dates_category_id ON product_commemorative_dates USING btree (category_id)

-- product_commemorative_dates_category_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_fiscal_ncm_id ON product_fiscal USING btree (ncm_id)

-- product_fiscal_ncm_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_images_canonical_image_id ON product_images USING btree (canonical_image_id)

-- product_images_canonical_image_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_images_color_id ON product_images USING btree (color_id)

-- product_images_color_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_images_variant_id ON product_images USING btree (variant_id)

-- product_images_variant_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_kit_components_color_id ON product_kit_components USING btree (color_id)

-- product_kit_components_color_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_kit_components_component_product_id ON product_kit_components USING btree (component_product_id)

-- product_kit_components_component_product_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_kit_components_padronizacao_id ON product_kit_components USING btree (padronizacao_id)

-- product_kit_components_padronizacao_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_kit_components_secondary_material_type_id ON product_kit_components USING btree (secondary_material_type_id)

-- product_kit_components_secondary_material_type_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_novelties_product_id ON product_novelties USING btree (product_id)

-- fk_pn_product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_novelties_supplier_id ON product_novelties USING btree (supplier_id)

-- fk_pn_supplier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_product_properties_property_definition_id ON product_properties USING btree (property_definition_id)

-- product_properties_property_definition_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_products_ncm_id ON products USING btree (ncm_id)

-- products_ncm_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_products_padronizacao_id ON products USING btree (padronizacao_id)

-- products_padronizacao_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_products_sub_brand_id ON products USING btree (sub_brand_id)

-- products_sub_brand_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produto_ramo_atividade_ramo_atividade_filho_id ON produto_ramo_atividade USING btree (ramo_atividade_filho_id)

-- produto_ramo_atividade_ramo_atividade_filho_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_padronizacao_product_id ON produtos_padronizacao USING btree (product_id)

-- produtos_padronizacao_product_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_padronizacao_sub_brand_id ON produtos_padronizacao USING btree (sub_brand_id)

-- produtos_padronizacao_sub_brand_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_padronizacao_variantes_color_id_2 ON produtos_padronizacao_variantes USING btree (color_id_2)

-- produtos_padronizacao_variantes_color_id_2_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_padronizacao_variantes_pad_id ON produtos_padronizacao_variantes USING btree (pad_id)

-- produtos_padronizacao_variantes_pad_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_padronizacao_variantes_raw_id ON produtos_padronizacao_variantes USING btree (raw_id)

-- produtos_padronizacao_variantes_raw_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_produtos_site_padronizacao_raw_id ON produtos_site_padronizacao USING btree (raw_id)

-- produtos_site_padronizacao_raw_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_quote_comments_parent_id_quote_id ON quote_comments USING btree (parent_id, quote_id)

-- quote_comments_parent_quote_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_quote_history_quote_id ON quote_history USING btree (quote_id)

-- quote_history_quote_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_stock_daily_summary_supplier_branch_id ON stock_daily_summary USING btree (supplier_branch_id)

-- stock_daily_summary_supplier_branch_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_stock_daily_summary_supplier_id ON stock_daily_summary USING btree (supplier_id)

-- stock_daily_summary_supplier_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_supplier_colors_color_variation_id ON supplier_colors USING btree (color_variation_id)

-- supplier_colors_color_variation_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_supplier_import_batches_supplier_id ON supplier_import_batches USING btree (supplier_id)

-- supplier_import_batches_supplier_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_supplier_products_raw_import_batch_id ON supplier_products_raw USING btree (import_batch_id)

-- supplier_products_raw_import_batch_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_supplier_products_raw_product_id ON supplier_products_raw USING btree (product_id)

-- supplier_products_raw_product_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_supplier_products_raw_variant_id ON supplier_products_raw USING btree (variant_id)

-- supplier_products_raw_variant_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_suppliers_organization_id ON suppliers USING btree (organization_id)

-- suppliers_organization_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_tabela_preco_gravacao_oficial_grupo_tecnica ON tabela_preco_gravacao_oficial USING btree (grupo_tecnica)

-- fk_oficial_grupo_tecnica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_variant_supplier_sources_supplier_branch_id ON variant_supplier_sources USING btree (supplier_branch_id)

-- variant_supplier_sources_supplier_branch_id_fkey
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_webhook_dispatcher_log_quote_id ON webhook_dispatcher_log USING btree (quote_id)

-- webhook_dispatcher_log_quote_id_fkey
