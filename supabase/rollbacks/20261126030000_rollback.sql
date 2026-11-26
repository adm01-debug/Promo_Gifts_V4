-- Rollback: 20261126030000_perf005_drop_unused_indexes_concurrently.sql
-- Recria os 48 indices removidos por este lote (48 de 64).
-- Definicoes copiadas byte a byte de supabase/migrations-snapshot/SCHEMA_LIVE.sql
-- (snapshot de 2026-11-26). Use CREATE INDEX CONCURRENTLY em producao se preferir
-- nao bloquear escrita; aqui ficam os statements exatos do catalogo.
-- Metadados: 1 dos 48 indices tinha COMMENT (idx_spr_images_pending);
-- restaurado logo apos o CREATE INDEX, copiado do dump vivo de 2026-11-26.

CREATE INDEX "idx_ai_queue_pending" ON "public"."ai_enrichment_queue" USING "btree" ("priority", "created_at") WHERE ("status" = 'pending'::"text");
CREATE INDEX "idx_ai_queue_product_id" ON "public"."ai_enrichment_queue" USING "btree" ("product_id");
CREATE INDEX "idx_backfill_queue_dispatch" ON "public"."image_backfill_queue" USING "btree" ("priority" DESC, "created_at") WHERE ("status" = 'pending'::"text");
CREATE INDEX "idx_faixa_v11_dim" ON "public"."tabela_preco_gravacao_oficial_faixa" USING "btree" ("tabela_preco_gravacao_id", "quantidade_minima", "quantidade_maxima", "largura_min", "largura_max", "altura_min", "altura_max");
CREATE INDEX "idx_frontend_telemetry_user_id" ON "public"."frontend_telemetry" USING "btree" ("user_id");
CREATE INDEX "idx_kcer_component" ON "public"."kit_component_enrichment_raw" USING "btree" ("kit_component_id");
CREATE INDEX "idx_kcer_kit" ON "public"."kit_component_enrichment_raw" USING "btree" ("kit_product_id");
CREATE INDEX "idx_kcer_source" ON "public"."kit_component_enrichment_raw" USING "btree" ("source");
CREATE INDEX "idx_kcpad_kit" ON "public"."kit_component_padronizacao" USING "btree" ("kit_product_id");
CREATE INDEX "idx_kit_component_enrichment_raw_promoted_component_id" ON "public"."kit_component_enrichment_raw" USING "btree" ("promoted_component_id");
CREATE INDEX "idx_kit_component_enrichment_raw_promoted_padronizacao_id" ON "public"."kit_component_enrichment_raw" USING "btree" ("promoted_padronizacao_id");
CREATE INDEX "idx_kit_component_padronizacao_raw_id" ON "public"."kit_component_padronizacao" USING "btree" ("raw_id");
CREATE INDEX "idx_kit_components_name" ON "public"."product_kit_components" USING "btree" ("component_name");
CREATE INDEX "idx_padvar_pad" ON "public"."produtos_padronizacao_variantes" USING "btree" ("pad_id") WHERE ("pad_id" IS NOT NULL);
CREATE INDEX "idx_padvar_sem_colorid" ON "public"."produtos_padronizacao_variantes" USING "btree" ("supplier_id") WHERE ("color_id" IS NULL);
CREATE INDEX "idx_pat_location_code" ON "public"."print_area_techniques" USING "btree" ("location_code");
CREATE INDEX "idx_pat_tabela" ON "public"."print_area_techniques" USING "btree" ("tabela_preco_id");
CREATE INDEX "idx_pkc_color_id" ON "public"."product_kit_components" USING "btree" ("color_id");
CREATE INDEX "idx_prod_comm_product" ON "public"."product_commemorative_dates" USING "btree" ("product_id");
CREATE INDEX "idx_product_commemorative_dates_category_id" ON "public"."product_commemorative_dates" USING "btree" ("category_id");
CREATE INDEX "idx_product_fiscal_ncm_code" ON "public"."product_fiscal" USING "btree" ("ncm_code");
CREATE INDEX "idx_product_fiscal_ncm_id" ON "public"."product_fiscal" USING "btree" ("ncm_id");
CREATE INDEX "idx_product_kit_components_component_product_id" ON "public"."product_kit_components" USING "btree" ("component_product_id");
CREATE INDEX "idx_product_kit_components_padronizacao_id" ON "public"."product_kit_components" USING "btree" ("padronizacao_id");
CREATE INDEX "idx_product_kit_components_secondary_material_type_id" ON "public"."product_kit_components" USING "btree" ("secondary_material_type_id");
CREATE INDEX "idx_product_properties_property_definition_id" ON "public"."product_properties" USING "btree" ("property_definition_id");
CREATE INDEX "idx_product_supply_sync_status" ON "public"."product_supply" USING "btree" ("sync_status");
CREATE INDEX "idx_products_ncm_id" ON "public"."products" USING "btree" ("ncm_id");
CREATE INDEX "idx_products_padronizacao_id" ON "public"."products" USING "btree" ("padronizacao_id") WHERE ("padronizacao_id" IS NOT NULL);
CREATE INDEX "idx_products_sub_brand_id" ON "public"."products" USING "btree" ("sub_brand_id");
CREATE INDEX "idx_products_xbz_reliability" ON "public"."products" USING "btree" ("xbz_stock_reliability_id") WHERE ("xbz_stock_reliability_id" IS NOT NULL);
CREATE INDEX "idx_produto_ramo_atividade_filho" ON "public"."produto_ramo_atividade" USING "btree" ("ramo_atividade_filho_id");
CREATE INDEX "idx_produtos_padronizacao_sub_brand_id" ON "public"."produtos_padronizacao" USING "btree" ("sub_brand_id");
CREATE INDEX "idx_produtos_site_padronizacao_raw_id" ON "public"."produtos_site_padronizacao" USING "btree" ("raw_id");
CREATE INDEX "idx_spr_images_pending" ON "public"."supplier_products_raw" USING "btree" ("supplier_id", "imported_at") WHERE ("images_status" <> 'processed'::"public"."supplier_raw_status");
COMMENT ON INDEX "public"."idx_spr_images_pending" IS 'Fila do worker de imagens. Espelha idx_spr_unprocessed mas para images_status.';
CREATE INDEX "idx_spr_import_batch_id" ON "public"."supplier_products_raw" USING "btree" ("import_batch_id");
CREATE INDEX "idx_spr_variant_id" ON "public"."supplier_products_raw" USING "btree" ("variant_id") WHERE ("variant_id" IS NOT NULL);
CREATE INDEX "idx_sre_supplier_date" ON "public"."supplier_replenishment_events" USING "btree" ("supplier_id", "promised_date" DESC);
CREATE INDEX "idx_sre_variant_date" ON "public"."supplier_replenishment_events" USING "btree" ("variant_id", "promised_date" DESC);
CREATE INDEX "idx_stock_daily_summary_supplier_branch_id" ON "public"."stock_daily_summary" USING "btree" ("supplier_branch_id");
CREATE INDEX "idx_stock_daily_summary_supplier_id" ON "public"."stock_daily_summary" USING "btree" ("supplier_id");
CREATE INDEX "idx_supplier_import_batches_supplier_id" ON "public"."supplier_import_batches" USING "btree" ("supplier_id");
CREATE INDEX "idx_tpgof_tabela_qty" ON "public"."tabela_preco_gravacao_oficial_faixa" USING "btree" ("tabela_preco_gravacao_id", "quantidade_minima", "quantidade_maxima") INCLUDE ("preco_unitario", "prazo_dias", "largura_min", "largura_max", "altura_min", "altura_max");
CREATE INDEX "idx_variant_supplier_sources_supplier_branch_id" ON "public"."variant_supplier_sources" USING "btree" ("supplier_branch_id");
CREATE INDEX "idx_vss_org_supplier" ON "public"."variant_supplier_sources" USING "btree" ("organization_id", "supplier_id");
CREATE INDEX "idx_vss_supplier_sku_xbz" ON "public"."variant_supplier_sources" USING "btree" ("supplier_sku", "supplier_id") WHERE ("supplier_id" = 'd6718a29-e954-4c1b-bd84-03ea24884900'::"uuid");
CREATE INDEX "idx_xbz_staging_status" ON "public"."xbz_gallery_staging" USING "btree" ("status", "created_at");
CREATE INDEX "idx_xbz_upload_mapping_status" ON "public"."xbz_upload_mapping" USING "btree" ("status");
