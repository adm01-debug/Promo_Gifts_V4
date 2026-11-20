# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 5.9 GB |
| schema public | 5.7 GB |
| schema cf_recon | 28.7 MB |
| schema analytics | 27.4 MB |
| schema prod_audit | 12.8 MB |
| schema classification_audit | 3.0 MB |
| schema internal | 2.2 MB |
| schema supplier_stricker | 592.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.stock_daily_summary | ~3.2M | 1.1 GB | 627.8 MB | 450.8 MB | ~25.8k | ~10 | ~1M |  |
| public.stock_snapshots | ~155.2k | 790.0 MB | 657.4 MB | 132.4 MB | 0 | 8 | ~190 | 2026-11-20 |
| public.supplier_products_raw_history_p2026_08 | ~531.6k | 753.5 MB | 723.1 MB | 27.1 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw_history_p2026_09 | ~496k | 704.6 MB | 676.1 MB | 25.4 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw_history_p2026_10 | ~348.4k | 501.6 MB | 480.3 MB | 18.0 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw | ~21k | 373.3 MB | 257.0 MB | 23.6 MB | 0 | ~10 | ~317.1k | 2026-11-20 |
| public.products | ~8.4k | 180.5 MB | 43.8 MB | 43.1 MB | 5 | ~5.7k | ~24.6M | 2026-11-20 |
| public.supplier_customization_options_raw | ~46.6k | 152.3 MB | 142.2 MB | 9.9 MB | 0 | 0 | 0 |  |
| public.product_images | ~72k | 141.4 MB | 81.9 MB | 59.4 MB | 0 | ~5.6k | ~396.3k |  |
| public.bot_detection_log | ~110.6k | 117.9 MB | 108.4 MB | 9.4 MB | 0 | 0 | ~210 |  |
| public.frontend_telemetry | ~128.5k | 88.6 MB | 81.2 MB | 5.9 MB | 0 | ~20 | 0 |  |
| public.image_backfill_queue | ~116.4k | 79.0 MB | 52.3 MB | 26.6 MB | 0 | 0 | ~320 |  |
| public.product_relationships | ~154.8k | 73.7 MB | 28.3 MB | 45.3 MB | 0 | 0 | 4 |  |
| public.variant_supplier_sources | ~20.9k | 69.3 MB | 56.1 MB | 13.1 MB | 0 | ~180 | ~3.8M | 2026-11-20 |
| public.login_attempts | ~43.2k | 46.3 MB | 26.2 MB | 20.0 MB | 0 | ~130 | ~720 |  |
| public.supplier_products_raw_history_p2026_11 | ~23.3k | 42.7 MB | 39.8 MB | 1.2 MB | 0 | 0 | ~30 |  |
| public.produtos_padronizacao_variantes | ~20.9k | 41.7 MB | 33.5 MB | 7.7 MB | 5 | ~30 | ~90.6k | 2026-11-20 |
| public.seo_audit_log | ~93.9k | 37.5 MB | 33.6 MB | 3.9 MB | 0 | 0 | 0 |  |
| public.product_variants | ~20.9k | 35.0 MB | 26.6 MB | 8.3 MB | ~190 | ~7.7k | ~865.3k | 2026-11-20 |
| public.product_customization_prices | ~28.4k | 32.2 MB | 25.3 MB | 6.8 MB | 0 | 1 | 0 |  |
| public.produtos_padronizacao | ~8.4k | 26.8 MB | 23.7 MB | 2.8 MB | 0 | ~50 | ~57.4k | 2026-11-20 |
| public.product_seo | ~7.7k | 25.9 MB | 23.9 MB | 1.6 MB | 0 | 0 | 6 |  |
| public.produto_ramo_atividade | ~54.4k | 25.5 MB | 9.4 MB | 16.1 MB | 0 | 0 | 0 |  |
| cf_recon.cf_image | ~65.5k | 22.2 MB | 14.2 MB | 7.9 MB | 0 | 2 | 0 |  |
| public.product_properties | ~34.2k | 19.9 MB | 13.3 MB | 6.2 MB | 0 | 3 | ~71.7k |  |
| public.admin_audit_log | ~19.7k | 14.7 MB | 12.7 MB | 1.9 MB | 0 | 1 | 5 |  |
| public.product_ai_history | ~8.2k | 13.1 MB | 12.2 MB | 768.0 KB | 0 | 0 | 0 |  |
| public.xbz_upload_mapping | ~42k | 13.0 MB | 9.1 MB | 3.9 MB | 0 | 0 | 0 |  |
| public.xbz_gallery_staging | ~18.6k | 11.6 MB | 7.7 MB | 3.9 MB | 0 | 1 | 3 |  |
| prod_audit.product_features | ~6.1k | 11.4 MB | 4.5 MB | 6.9 MB | 0 | 0 | 0 |  |
| public.product_tags | ~51k | 11.1 MB | 4.2 MB | 6.9 MB | 0 | 0 | ~2.7k |  |
| public.product_ai_content | ~7.3k | 10.9 MB | 10.1 MB | 784.0 KB | 0 | 0 | 3 |  |
| public.product_category_assignments | ~34.1k | 10.1 MB | 4.3 MB | 5.8 MB | 3 | 0 | ~117.8k |  |
| public.print_area_techniques | ~24.4k | 10.1 MB | 5.2 MB | 4.8 MB | 0 | ~500 | ~4.6M |  |
| public.supplier_import_batches | ~1.7k | 9.7 MB | 7.4 MB | 2.3 MB | 5 | 0 | ~270 |  |
| public.supplier_replenishment_events | ~21.8k | 9.5 MB | 4.4 MB | 5.1 MB | 0 | ~20 | ~920 |  |
| public.produtos_site_padronizacao | ~3.2k | 8.8 MB | 7.6 MB | 712.0 KB | 0 | ~30 | ~41k |  |
| public.db_connection_snapshots | ~10.1k | 8.1 MB | 7.1 MB | 968.0 KB | 0 | 0 | 0 |  |
| public.product_commemorative_dates | ~34.8k | 8.0 MB | 4.3 MB | 3.7 MB | 0 | 0 | ~1.2k |  |
| public.kit_component_enrichment_raw | ~6.8k | 7.9 MB | 6.3 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.backup_produto_ramo_atividade_20260625 | ~63.6k | 7.1 MB | 5.1 MB | 1.9 MB | 0 | 0 | 0 |  |
| public.pipeline_run_log | ~2.5k | 6.5 MB | 5.8 MB | 608.0 KB | ~20 | ~30 | ~180 |  |
| public.product_kit_components | ~3.6k | 5.8 MB | 3.4 MB | 2.4 MB | 0 | ~10 | ~130 |  |
| cf_recon.cf_ghost_check_queue | ~17.8k | 5.7 MB | 4.1 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.product_novelties | ~2k | 5.5 MB | 3.3 MB | 2.1 MB | 1 | ~50 | ~22.2k |  |
| public.product_materials | ~13.5k | 4.8 MB | 2.0 MB | 2.8 MB | 0 | 2 | ~3.9k |  |
| public._archive_product_seo_20260626 | ~6.6k | 4.8 MB | 4.5 MB | 224.0 KB | 0 | 0 | 0 |  |
| public.asia_upload_mapping | ~16.2k | 4.7 MB | 3.1 MB | 1.6 MB | ~50 | 0 | ~900 |  |
| public.product_packaging_compatibility | ~10.2k | 4.6 MB | 2.8 MB | 1.7 MB | 0 | 0 | ~7.7k |  |
| public.kit_component_padronizacao | ~6.8k | 4.5 MB | 2.7 MB | 1.8 MB | 0 | 0 | ~90 |  |
| public.supplier_customization_raw | ~330 | 4.3 MB | 4.1 MB | 136.0 KB | 0 | 2 | 2 |  |
| public._archive_supplier_price_tiers_20260626 | ~31.2k | 4.1 MB | 3.1 MB | 976.0 KB | 0 | 0 | 0 |  |
| public.request_rate_limits | ~18.6k | 4.0 MB | 2.0 MB | 1.9 MB | ~120 | 0 | ~1.7k |  |
| public.ai_enrichment_queue | ~7.9k | 4.0 MB | 1.8 MB | 2.1 MB | 0 | ~30 | ~920 | 2026-11-20 |
| public.product_attributes | ~15.6k | 4.0 MB | 2.3 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.qa_image_coverage_log | ~2.7k | 3.6 MB | 3.5 MB | 96.0 KB | 0 | 0 | 0 |  |
| public.workspace_notifications | ~4.5k | 3.3 MB | 2.5 MB | 776.0 KB | 0 | ~4.9k | ~23.2k |  |
| public.b2b_collection_products | ~6.5k | 3.2 MB | 1.2 MB | 2.0 MB | ~10 | 0 | ~2.6k |  |
| classification_audit.category_suggestions | ~6.7k | 3.0 MB | 1.4 MB | 1.5 MB | 0 | 0 | 0 |  |
| public.schema_signature_baseline | ~7.2k | 2.9 MB | 1.9 MB | 992.0 KB | 0 | ~10 | ~20 |  |
| public.tags | ~90 | 2.8 MB | 2.5 MB | 272.0 KB | ~20 | ~440 | ~1.2k |  |
| public.schema_signature_drift_log | ~380 | 2.8 MB | 984.0 KB | 88.0 KB | 0 | 0 | 9 |  |
| public.schema_drift_log | ~420 | 2.7 MB | 752.0 KB | 80.0 KB | 0 | 1 | 0 |  |
| public.audit_log_gravacao | ~1.1k | 2.6 MB | 1.1 MB | 80.0 KB | 0 | 0 | 0 |  |
| public.product_physical | ~8.3k | 2.4 MB | 1.6 MB | 760.0 KB | 1 | 0 | ~320 |  |
| public.magazine_items | ~900 | 2.4 MB | 2.1 MB | 216.0 KB | 0 | 0 | ~6.3k |  |
| public.categories | ~480 | 2.3 MB | 1.6 MB | 672.0 KB | ~10 | ~18.9k | ~100.1k |  |
| public.kit_component_print_areas | ~6.1k | 2.2 MB | 920.0 KB | 1.3 MB | 0 | 2 | 4 |  |
| public.product_similarity_group_members | ~7k | 2.2 MB | 936.0 KB | 1.3 MB | 0 | 0 | 0 |  |
| public.product_fiscal | ~8.4k | 2.0 MB | 1.1 MB | 936.0 KB | ~30 | 0 | ~300 |  |
| public.product_print_positions | ~3.8k | 2.0 MB | 1.5 MB | 512.0 KB | 0 | 0 | 0 |  |
| public.product_supply | ~8k | 2.0 MB | 1.2 MB | 832.0 KB | 0 | 0 | 3 |  |
| public.catalog_analytics | ~2.8k | 1.9 MB | 1.7 MB | 200.0 KB | 0 | 0 | 0 |  |
| public.generated_mockups | 0 | 1.9 MB | 8.0 KB | 96.0 KB | 0 | ~380 | 0 |  |
| public.kit_component_variant_skus | ~4.2k | 1.9 MB | 760.0 KB | 1.1 MB | 0 | 4 | ~17k |  |
| public.product_videos | ~1.1k | 1.8 MB | 1.3 MB | 440.0 KB | 0 | 2 | ~580 |  |
| public.product_packaging | ~6.6k | 1.5 MB | 1.1 MB | 424.0 KB | 0 | 0 | 0 |  |
| public.video_import_queue | ~1k | 1.5 MB | 1.2 MB | 256.0 KB | 0 | ~110 | 0 |  |
| public.asia_image_import_queue | ~60 | 1.5 MB | 24.0 KB | 1.4 MB | ~40 | ~20 | ~170 | 2026-11-20 |
| public.magazines | ~1.5k | 1.4 MB | 832.0 KB | 512.0 KB | ~180 | 0 | ~287.9k | 2026-11-20 |
| public.product_views | ~3.3k | 1.1 MB | 544.0 KB | 568.0 KB | 0 | 5 | ~1.5k |  |
| public.included_packaging_print_areas | ~2.6k | 1.0 MB | 472.0 KB | 528.0 KB | 0 | 0 | 0 |  |
| public.product_included_packagings | ~1.2k | 1008.0 KB | 680.0 KB | 288.0 KB | 0 | 1 | 5 |  |
| public.product_qa_image_alerts | ~360 | 944.0 KB | 600.0 KB | 304.0 KB | 4 | ~50 | ~6.6k |  |
| public.included_packaging_techniques | ~2.8k | 928.0 KB | 448.0 KB | 440.0 KB | 0 | 0 | 0 |  |
| public.video_validation_log | ~2.2k | 912.0 KB | 784.0 KB | 88.0 KB | 0 | 0 | 0 |  |
| public._archive_product_ai_20260626 | ~6.6k | 904.0 KB | 640.0 KB | 224.0 KB | 0 | 0 | 0 |  |
| public._bkp_kcvs_pre_normalize_20260624 | ~4.1k | 904.0 KB | 720.0 KB | 144.0 KB | 0 | 0 | 0 |  |
| public.product_deactivation_requests | ~1.4k | 896.0 KB | 552.0 KB | 304.0 KB | 0 | 0 | 0 |  |
| public.sm_site_url_map | ~1.4k | 840.0 KB | 440.0 KB | 360.0 KB | 0 | ~150 | ~3.3k |  |
| public.magic_up_generations | 0 | 816.0 KB | 8.0 KB | 32.0 KB | 0 | ~130 | 0 |  |
| public.mcp_access_violations | ~1.2k | 752.0 KB | 632.0 KB | 88.0 KB | 0 | 0 | 0 |  |
| public.tabela_preco_gravacao_oficial_faixa | ~950 | 736.0 KB | 128.0 KB | 576.0 KB | 0 | ~20 | ~3k |  |
| prod_audit.category_keywords | ~440 | 712.0 KB | 240.0 KB | 432.0 KB | 0 | 0 | 0 |  |
| public.product_notebook_specs | ~780 | 584.0 KB | 256.0 KB | 288.0 KB | 0 | 1 | 5 |  |
| public.magazine_public_view_events_2026_11 | ~810 | 576.0 KB | 288.0 KB | 256.0 KB | 0 | 2 | ~30 |  |
| public.product_packagings | ~1.4k | 560.0 KB | 224.0 KB | 296.0 KB | 0 | 0 | 0 |  |
| public.product_notebook_features | ~1k | 544.0 KB | 200.0 KB | 304.0 KB | 0 | 0 | 1 |  |
| public.seo_redirects | ~750 | 464.0 KB | 320.0 KB | 112.0 KB | 0 | 0 | 0 |  |
| public.color_variations | ~90 | 448.0 KB | 32.0 KB | 376.0 KB | 0 | ~1k | ~2.2k |  |
| cf_recon.remediation | ~340 | 440.0 KB | 352.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.quotes | 4 | 432.0 KB | 16.0 KB | 376.0 KB | 0 | ~2.5k | ~11.3k |  |
| public.seller_cart_items | ~40 | 432.0 KB | 208.0 KB | 184.0 KB | 0 | 0 | ~40 |  |
| prod_audit.category_suggestions | ~450 | 408.0 KB | 200.0 KB | 176.0 KB | 0 | 0 | 0 |  |
| public.pipeline_health_log | ~40 | 384.0 KB | 312.0 KB | 32.0 KB | 7 | 7 | 0 |  |
| public.supplier_colors | ~290 | 384.0 KB | 120.0 KB | 224.0 KB | 0 | 3 | ~370 | 2026-11-20 |
| public.tabela_preco_gravacao_oficial | ~90 | 368.0 KB | 160.0 KB | 96.0 KB | 0 | ~530 | ~830 |  |
| public.color_equivalences | ~290 | 352.0 KB | 128.0 KB | 184.0 KB | ~20 | 4 | ~20 |  |
| public.category_relationships | ~270 | 344.0 KB | 136.0 KB | 168.0 KB | 0 | 0 | 0 |  |
| public.query_telemetry | ~1000 | 320.0 KB | 232.0 KB | 56.0 KB | 0 | 4 | 0 |  |
| public.e2e_cleanup_audit | ~280 | 304.0 KB | 112.0 KB | 160.0 KB | 0 | 0 | 0 |  |
| cf_recon.action_log | ~480 | 296.0 KB | 232.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.collection_items | 0 | 296.0 KB | 8.0 KB | 264.0 KB | 0 | ~270 | 0 |  |
| public.search_analytics | ~350 | 288.0 KB | 48.0 KB | 200.0 KB | 0 | 0 | ~2.1k |  |
| public.anon_catalog_grant_audit_log | ~310 | 280.0 KB | 216.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.medallion_coverage_snapshots | ~1.2k | 272.0 KB | 184.0 KB | 56.0 KB | 0 | 4 | 0 |  |
| prod_audit.test_results | ~920 | 264.0 KB | 160.0 KB | 72.0 KB | 0 | 0 | 0 |  |
| public.favorite_items | 2 | 264.0 KB | 8.0 KB | 216.0 KB | 0 | ~1.7k | ~1.6k |  |
| public.kit_component_ficha_staging | ~430 | 264.0 KB | 152.0 KB | 72.0 KB | 0 | 0 | ~300 |  |
| public.quote_items | ~10 | 264.0 KB | 16.0 KB | 208.0 KB | 0 | ~2.2k | ~7.7k |  |
| public.profiles | ~80 | 248.0 KB | 96.0 KB | 112.0 KB | 0 | ~60 | ~8.6k |  |
| public.suppliers | 5 | 248.0 KB | 144.0 KB | 64.0 KB | ~10 | ~1.1k | ~6.4M |  |
| public.supplier_categories | ~430 | 240.0 KB | 64.0 KB | 136.0 KB | 0 | 0 | 3 |  |
| public.category_ancestors | ~1k | 224.0 KB | 72.0 KB | 120.0 KB | 0 | 8 | 0 | 2026-11-20 |
| public.ai_routing_decisions | ~20 | 216.0 KB | 120.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.ai_usage_logs | ~60 | 216.0 KB | 80.0 KB | 96.0 KB | 5 | ~20 | ~230 |  |
| public.edge_rate_limits | ~10 | 216.0 KB | 8.0 KB | 184.0 KB | ~10 | ~30 | ~410 | 2026-11-20 |
| public.ncm_codes | ~260 | 216.0 KB | 96.0 KB | 80.0 KB | 0 | 6 | ~4.5k |  |
| public.discount_approval_audit | 0 | 208.0 KB | 8.0 KB | 176.0 KB | 0 | 1 | 0 |  |
| public.discount_approval_requests | 0 | 208.0 KB | 8.0 KB | 160.0 KB | 0 | ~330 | 0 |  |
| public.material_equivalences | ~280 | 208.0 KB | 56.0 KB | 112.0 KB | ~20 | 0 | 1 |  |
| public.price_history | ~210 | 208.0 KB | 128.0 KB | 48.0 KB | 0 | 0 | 3 |  |
| public.video_sim_results | ~1k | 208.0 KB | 104.0 KB | 72.0 KB | 0 | 0 | 0 |  |
| public.product_deactivation_tokens | ~390 | 200.0 KB | 64.0 KB | 104.0 KB | 0 | ~10 | 0 |  |
| public.user_roles | ~80 | 192.0 KB | 8.0 KB | 152.0 KB | 0 | ~8.2k | ~21.3M |  |
| public._bkp_kit_dims_20260619 | ~960 | 184.0 KB | 128.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.seller_discount_limits | ~80 | 184.0 KB | 24.0 KB | 120.0 KB | 0 | 4 | ~140 |  |
| public.category_copywriting_config | ~40 | 176.0 KB | 104.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_category_mappings | ~430 | 176.0 KB | 48.0 KB | 104.0 KB | 0 | 0 | 3 |  |
| public.supplier_materials | ~280 | 176.0 KB | 48.0 KB | 88.0 KB | 0 | 1 | 0 |  |
| public.ip_access_control | ~210 | 168.0 KB | 48.0 KB | 80.0 KB | 2 | 0 | ~2k |  |
| public.product_badge_definitions | ~30 | 168.0 KB | 32.0 KB | 96.0 KB | 0 | 0 | 0 |  |
| public.quote_history | 3 | 168.0 KB | 16.0 KB | 112.0 KB | 0 | 2 | 0 |  |
| public.seller_carts | ~90 | 160.0 KB | 40.0 KB | 80.0 KB | 0 | 0 | ~5.7k |  |
| public.supplier_property_mappings | ~280 | 160.0 KB | 40.0 KB | 88.0 KB | 5 | 0 | 0 |  |
| public.markup_configurations | 3 | 152.0 KB | 8.0 KB | 104.0 KB | 0 | ~90.8k | 0 |  |
| public.product_similarity_groups | ~270 | 152.0 KB | 80.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.quote_item_personalizations | 0 | 152.0 KB | 8.0 KB | 104.0 KB | 0 | ~20 | 4 |  |
| public.ops_grant_audit | ~600 | 144.0 KB | 80.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.orders | 5 | 144.0 KB | 8.0 KB | 96.0 KB | 0 | ~2.4k | ~5.4k |  |
| public.crm_callback_events | ~110 | 136.0 KB | 16.0 KB | 80.0 KB | 0 | 0 | 2 |  |
| public.kit_component_types | ~130 | 136.0 KB | 32.0 KB | 64.0 KB | 0 | 6 | ~10 |  |
| public.smoke_test_runs | ~310 | 136.0 KB | 48.0 KB | 56.0 KB | 0 | 0 | 2 |  |
| public.supplier_field_mappings | ~190 | 136.0 KB | 48.0 KB | 56.0 KB | 0 | 5 | ~380 |  |
| public.webhook_dispatcher_log | 2 | 136.0 KB | 16.0 KB | 80.0 KB | 0 | 6 | ~310 |  |
| public.anon_insert_rate | 1 | 128.0 KB | 8.0 KB | 96.0 KB | 8 | ~100 | 8 |  |
| public.mockup_credit_transactions | 4 | 128.0 KB | 8.0 KB | 80.0 KB | 0 | 0 | 0 |  |
| public.sm_category_pages | ~50 | 128.0 KB | 40.0 KB | 48.0 KB | 0 | 1 | ~100 |  |
| public.variation_values | ~170 | 128.0 KB | 24.0 KB | 64.0 KB | 0 | 1 | 1 |  |
| public.kill_switch_hits | 0 | 120.0 KB | 8.0 KB | 88.0 KB | 0 | 3 | 1 |  |
| public.ai_function_routing | ~20 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | 9 | ~20 |  |
| public.color_groups | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 2 | ~6.9k | ~790 |  |
| public.custom_kits | ~20 | 112.0 KB | 16.0 KB | 40.0 KB | 0 | 8 | ~360 |  |
| public.favorite_lists | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 0 | ~1.6k | ~6.4k |  |
| public.integration_credentials | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 0 | ~3.9k | 2 |  |
| public.material_types | ~90 | 112.0 KB | 24.0 KB | 48.0 KB | 7 | ~410 | ~1.3k |  |
| public._bkp_kit_color_from_name_20260624 | ~450 | 104.0 KB | 64.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.dashboard_insights_cache | 1 | 104.0 KB | 8.0 KB | 48.0 KB | 2 | ~160 | 3 |  |
| public.magazine_reader_state | 0 | 104.0 KB | 8.0 KB | 72.0 KB | 0 | 3 | 0 |  |
| public.navigation_analytics | ~70 | 104.0 KB | 16.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_subtype_category_map | ~100 | 104.0 KB | 24.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.admin_settings | 1 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~48.1k | 0 |  |
| public.attribute_definitions | ~50 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.color_synonym_map | ~10 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | 2 | 0 |  |
| public.commemorative_dates | ~40 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~140 | ~6.3k |  |
| public.enriched_contacts | ~50 | 96.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.import_pipeline_steps | ~50 | 96.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.material_groups | ~10 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.2k | ~1.6k |  |
| public.material_variations | ~20 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.pipeline_known_issues | 8 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.ramo_atividade_filho | ~110 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~1.6k | 0 |  |
| public.role_permissions | ~120 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~5.7k | 0 |  |
| public.supplier_attribute_definitions | ~10 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.supplier_branches | 7 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | ~25.7k | 0 |  |
| public.category_attributes | ~100 | 88.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.collections | ~100 | 88.0 KB | 16.0 KB | 32.0 KB | ~70 | ~140 | ~5.7k |  |
| public.follow_up_reminders | ~150 | 88.0 KB | 40.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.supplier_value_mappings | ~100 | 88.0 KB | 24.0 KB | 32.0 KB | 0 | 1 | 0 |  |
| public.ai_providers | 5 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~10 | ~20 |  |
| public.audit_log | 0 | 80.0 KB | 0 B | 56.0 KB | 0 | 2 | 0 |  |
| public.b2b_collections | 9 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~40 | 0 |  |
| public.category_commemorative_dates | ~50 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.cf_recon_inflight | 0 | 80.0 KB | 8.0 KB | 56.0 KB | 0 | 1 | 0 |  |
| public.color_nuances | 7 | 80.0 KB | 8.0 KB | 32.0 KB | ~10 | ~380 | 0 |  |
| public.inbound_webhook_events | ~60 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | 5 | 0 |  |
| public.mockup_drafts | 3 | 80.0 KB | 16.0 KB | 32.0 KB | 3 | 5 | 3 |  |
| public.organizations | 1 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~4.5k | 0 |  |
| public.property_definitions | ~100 | 80.0 KB | 16.0 KB | 32.0 KB | 2 | 0 | 0 |  |
| public.sm_worker_partitions | ~10 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_settings | 5 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~8.6k | ~180 |  |
| public.supplier_video_requirements | 4 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.user_onboarding | 2 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~5.9k | 0 |  |
| public.variation_types | ~20 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public._qa_pct_results | ~320 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.category_accessory_categories | 3 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.category_variation_types | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.collection_products | ~30 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 2 | 2 |  |
| public.content_articles | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 1 | 0 |  |
| public.ingestion_run_log | ~100 | 72.0 KB | 16.0 KB | 16.0 KB | 0 | 7 | 0 |  |
| public.magazine_public_reactions | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 2 | 0 |  |
| public.mockup_credits | 4 | 72.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.organization_members | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 1 | 0 |  |
| public.spot_health_log | ~100 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 1 | 0 |  |
| public.system_documentation | ~40 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.user_comparisons | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 2 | ~260 | 0 |  |
| public.user_organizations | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~2.7M | ~1.4k |  |
| supplier_stricker.customization_tables | 8 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.optionals | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | 0 | 0 |  |
| public._bkp_kit_pkg_material_20260624 | ~290 | 64.0 KB | 32.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.ai_models | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 5 |  |
| public.auto_tag_rules | ~80 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.collection_items_trash | 0 | 64.0 KB | 0 B | 40.0 KB | 0 | 2 | 0 |  |
| public.edge_function_invocations | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 6 | 0 |  |
| public.endomarketing_themes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 2 | 0 |  |
| public.inbound_webhook_endpoints | 2 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.kit_typical_dims | ~90 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 1 | 4 |  |
| public.magazine_public_view_events_2026_10 | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 2 | 0 |  |
| public.order_items | 9 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~2.4k | 2 |  |
| public.packagings | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.personalization_technique_mappings | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.product_faqs | 6 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~8k | 0 |  |
| public.ramo_atividade | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.6k | 0 |  |
| public.shipping_boxes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~50 | ~10 |  |
| public.supplier_field_priority | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.system_changelog | ~30 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 2 | 0 |  |
| public.target_audiences | ~40 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.voice_command_logs | ~50 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.category_colors | ~30 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 9 | 0 |  |
| public.category_target_audiences | ~10 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.commemorative_date_colors | ~30 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.favorite_items_trash | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~130 | 0 |  |
| public.kit_save_requests | 1 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2026_07 | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 2 | 0 |  |
| public.magazine_view_rollup_watermark | 1 | 56.0 KB | 8.0 KB | 16.0 KB | ~30 | ~50 | 0 |  |
| public.mockup_approval_links | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 1 | 0 |  |
| public.mockup_generation_jobs | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 1 | 0 |  |
| public.outbound_webhooks | 1 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~40 | 0 |  |
| public.product_target_audiences | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 2 | 0 |  |
| public.secret_rotation_log | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~30 | 0 |  |
| public.supplier_packagings | ~10 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.webhook_delivery_locks | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~30 | 0 |  |
| prod_audit.classification_rules | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.attribute_groups | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | 0 | 0 |  |
| public.binding_types | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.city_whitelist | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.classify_functions_registry | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.cover_finishes | 9 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.cover_materials | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.cover_types | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.expert_conversations | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~5.6k | 0 |  |
| public.image_types | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | ~10 |  |
| public.ip_whitelist | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.kit_quote_requests | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | 0 |  |
| public.notebook_features | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.notification_templates | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | 0 |  |
| public.packaging_compatibility_config | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~36.1k | 0 |  |
| public.packaging_types | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_colors | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_formats | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_rulings | 5 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.personalization_techniques | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~1k | 0 |  |
| public.quote_comments | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 5 | 0 |  |
| public.roles | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.schema_signature_drift_allowlist | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 0 |  |
| public.stock_notes | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 2 | 0 |  |
| public.supplier_sub_brands | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | 0 |  |
| public.system_kill_switches | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~460 | 0 |  |
| public.user_2fa_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.video_types | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.webhook_deliveries | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~10 | 0 |  |
| public.webhook_outbox | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 0 |  |
| supplier_stricker.customization_options | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 0 | 0 |  |
| public._bkp_kit_packing_type_20260624 | ~150 | 40.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public._bkp_orphan_active_variants_20260619 | ~50 | 40.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.ai_usage_quotas | 7 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~130 | 0 |  |
| public.binding_colors | 4 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.commemorative_date_exclusions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.enrichment_log | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | 1 | 0 |  |
| public.external_connections | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~50 | 0 |  |
| public.file_scan_logs | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | 1 | 0 |  |
| public.kit_templates | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | ~260 | 0 |  |
| public.magazine_templates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.paper_weights | 9 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.password_reset_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~130 | 0 |  |
| public.supplier_unit_conversions | ~20 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.tecnicas_gravacao | ~20 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.user_token_revocations | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~320 | 0 |  |
| public.variant_commemorative_dates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.product_types | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.stg_optionals | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.sync_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| cf_recon.crawl_run | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 2 | 0 |  |
| cf_recon.metric_snapshot | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.access_blocked_log | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 1 | 0 |  |
| public.analytics_events | 3 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.art_file_attachments | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 4 | 0 |  |
| public.attribute_equivalences | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.cnpj_backfill_audit | 8 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.cron_job_timeout_map | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.e2e_cleanup_rate_limit | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_backfill_log_20260625 | ~20 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_date_reconcile_log_20260626 | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_material_config | 7 | 32.0 KB | 8.0 KB | 16.0 KB | 2 | 6 | 0 |  |
| public.expert_messages | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 1 | 0 |  |
| public.favorite_item_reactions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.feminine_color_config | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~350 | 0 |  |
| public.freight_settings | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~30 | 2 |  |
| public.geo_allowed_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.kit_comments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.kit_ficha_session_log | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.kit_share_tokens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.magazine_duplicate_requests | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.magazine_public_view_events_2026_08 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.magazine_public_view_events_2026_09 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.magazine_public_view_events_2026_12 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.magazine_public_view_events_2027_01 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.magazine_public_view_events_2027_02 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.magazine_public_view_events_default | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.magazine_templates_catalog | ~10 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~250 | 0 |  |
| public.material_reconcile_log_20260626 | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.mcp_api_keys | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.mcp_kv | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 2 | 0 |  |
| public.mcp_sessions | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.mockup_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.optimization_queue | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 2 | 0 |  |
| public.ownership_audit_reports | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.permissions | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.personalization_simulations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.pipeline_control | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~50 | 0 |  |
| public.product_component_location_techniques | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.product_group_members | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.product_price_freshness_overrides | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.quote_approval_tokens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~140 | 0 |  |
| public.quote_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.schema_drift_allowlist | ~20 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.spot_typecode_map | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.step_up_audit_log | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 3 | 0 |  |
| public.system_settings | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~15.1k | 0 |  |
| public.user_allowed_ips | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.user_favorites | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.user_ip_allowlist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.webhook_request_nonces | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~30 | 0 |  |
| supplier_stricker.stg_product_types | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_products | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stocks | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| public.access_security_settings | 1 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | ~250 | 0 |  |
| public.cart_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.collection_item_reactions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.company_email_patterns | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.comparison_reactions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.connection_test_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.crm_seller_identity_links | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.cron_watchdog_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.device_login_notifications | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.kit_collaborators | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.kit_variants | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.magic_up_campaigns | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~130 | 0 |  |
| public.mcp_key_auto_revocations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.optimization_queue_runs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.product_component_locations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.product_endomarketing | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.product_group_components | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.product_group_location_techniques | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.product_group_locations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.quote_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.sales_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.saved_trends_views | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~130 | 0 |  |
| public.scheduled_reports | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~190 | 0 |  |
| public.search_queries | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.step_up_challenges | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~100 | 0 |  |
| public.user_known_devices | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.user_notification_preferences | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.user_search_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.visual_search_feedback | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.canceled_products | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.category_mappings | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.colors | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| supplier_stricker.products | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_colors | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_customizations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_stock | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.ai_usage_events | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.companies | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.component_media | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 6 | 0 |  |
| public.conversation_audit_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.conversation_delivery_status | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.conversation_event_history | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.external_connections_sync_log | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.hardening_health_snapshots | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 6 | 0 |  |
| public.magic_up_brand_kits | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.magic_up_comments | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.magic_up_public_shares | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.magic_up_reactions | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.mcp_full_grantors | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.mockup_prompt_configs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.mockup_prompt_history | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.notification_preferences | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.notifications | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.order_item_personalizations | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.ownership_repair_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.product_components | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |
| public.product_groups | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.product_search_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.product_sync_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 7 | 0 |  |
| public.public_token_failures | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~110 | 0 |  |
| public.push_subscriptions | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.quote_drafts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.recently_viewed_products | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.rls_denial_log | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.role_migration_batches | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.role_migration_items | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.saved_filters | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~420 | 0 |  |
| public.security_settings | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.simulator_wizard_drafts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~130 | 0 |  |
| public.step_up_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~100 | 0 |  |
| public.supplier_products_raw_history_p2026_12 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_01 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_02 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_03 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_04 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_05 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_06 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_07 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_08 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_09 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_10 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_11 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.supplier_products_raw_history_p2027_12 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~30 | 0 |  |
| public.user_filter_presets | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.user_preferences | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.video_variant_links | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.webhook_delivery_metrics | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| supplier_stricker.stg_images | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events | 0 | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |
| public.supplier_products_raw_history | ~1.4M | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_mv_product_intelligence_abc | analytics.mv_product_intelligence | 328.0 KB |
| idx_analytics_mv_stock_velocity_supplier_id | analytics.mv_stock_velocity | 568.0 KB |
| idx_mv_stock_velocity_variant_id | analytics.mv_stock_velocity | 1.1 MB |
| idx_ghost_queue_dispatch | cf_recon.cf_ghost_check_queue | 128.0 KB |
| idx_ghost_queue_status | cf_recon.cf_ghost_check_queue | 248.0 KB |
| idx_cf_recon_cfimg_last_seen | cf_recon.cf_image | 664.0 KB |
| idx_cf_recon_cfimg_uploaded | cf_recon.cf_image | 2.0 MB |
| idx_sug_gap | classification_audit.category_suggestions | 136.0 KB |
| idx_sug_product | classification_audit.category_suggestions | 264.0 KB |
| idx_sug_score | classification_audit.category_suggestions | 152.0 KB |
| idx_mv_product_leaf_category_leaf_id | internal.mv_product_leaf_category | 96.0 KB |
| idx_catkw_name_trgm | prod_audit.category_keywords | 256.0 KB |
| idx_pf_current | prod_audit.product_features | 672.0 KB |
| idx_pf_materials | prod_audit.product_features | 328.0 KB |
| idx_pf_name_trgm | prod_audit.product_features | 4.8 MB |
| idx_pf_tokens | prod_audit.product_features | 656.0 KB |
| idx_ai_queue_product_id | public.ai_enrichment_queue | 496.0 KB |
| idx_categories_path_tpo | public.categories | 168.0 KB |
| idx_db_conn_snapshots_captured | public.db_connection_snapshots | 584.0 KB |
| idx_frontend_telemetry_user_id | public.frontend_telemetry | 976.0 KB |
| idx_backfill_queue_dispatch | public.image_backfill_queue | 1.8 MB |
| idx_ippa_packaging | public.included_packaging_print_areas | 88.0 KB |
| idx_ipt_packaging | public.included_packaging_techniques | 88.0 KB |
| idx_kcer_component | public.kit_component_enrichment_raw | 296.0 KB |
| idx_kcer_kit | public.kit_component_enrichment_raw | 136.0 KB |
| idx_kcer_source | public.kit_component_enrichment_raw | 120.0 KB |
| idx_kit_component_enrichment_raw_promoted_component_id | public.kit_component_enrichment_raw | 184.0 KB |
| idx_kit_component_enrichment_raw_promoted_padronizacao_id | public.kit_component_enrichment_raw | 232.0 KB |
| idx_kcpad_kit | public.kit_component_padronizacao | 168.0 KB |
| idx_kit_component_padronizacao_component_product_id | public.kit_component_padronizacao | 72.0 KB |
| idx_kit_component_padronizacao_raw_id | public.kit_component_padronizacao | 232.0 KB |
| idx_kcpa_component | public.kit_component_print_areas | 224.0 KB |
| idx_kcpa_tabela | public.kit_component_print_areas | 72.0 KB |
| idx_kcvs_kit | public.kit_component_variant_skus | 80.0 KB |
| idx_kcvs_variant | public.kit_component_variant_skus | 96.0 KB |
| idx_login_attempts_email_ip_created | public.login_attempts | 5.8 MB |
| idx_login_attempts_lower_email_ip_created | public.login_attempts | 5.7 MB |
| magazine_public_view_events_2026_11_token_hash_viewed_at_idx | public.magazine_public_view_events_2026_11 | 152.0 KB |
| idx_magazines_published | public.magazines | 72.0 KB |
| idx_mv_pia_prioridade | public.mv_product_images_audit | 1.7 MB |
| idx_mv_stock_rupture_alert_nivel | public.mv_stock_rupture_alert | 536.0 KB |
| idx_mv_stock_rupture_alert_non_ok_prio_score | public.mv_stock_rupture_alert | 632.0 KB |
| idx_mv_stock_rupture_alert_pref_score | public.mv_stock_rupture_alert | 1.8 MB |
| idx_mv_stock_rupture_alert_supplier_id | public.mv_stock_rupture_alert | 584.0 KB |
| idx_mv_stock_rupture_alert_variant_id | public.mv_stock_rupture_alert | 1.1 MB |
| idx_product_ai_content_version | public.product_ai_content | 104.0 KB |
| idx_prod_comm_product | public.product_commemorative_dates | 488.0 KB |
| idx_product_commemorative_dates_category_id | public.product_commemorative_dates | 256.0 KB |
| idx_pcp_product | public.product_customization_prices | 632.0 KB |
| idx_pdr_product_id | public.product_deactivation_requests | 88.0 KB |
| idx_product_fiscal_ncm_code | public.product_fiscal | 120.0 KB |
| idx_product_fiscal_ncm_id | public.product_fiscal | 128.0 KB |
| idx_pi_canonical | public.product_images | 896.0 KB |
| idx_pi_content_hash | public.product_images | 6.4 MB |
| idx_product_images_cf_verified_at | public.product_images | 504.0 KB |
| idx_product_images_color_id | public.product_images | 1.4 MB |
| idx_product_images_image_type_id | public.product_images | 1.8 MB |
| idx_product_images_organization_id | public.product_images | 512.0 KB |
| idx_product_images_product_type_active | public.product_images | 6.1 MB |
| idx_kit_components_name | public.product_kit_components | 176.0 KB |
| idx_pkc_color_id | public.product_kit_components | 96.0 KB |
| idx_product_kit_components_component_product_id | public.product_kit_components | 152.0 KB |
| idx_product_kit_components_padronizacao_id | public.product_kit_components | 128.0 KB |
| idx_product_kit_components_secondary_material_type_id | public.product_kit_components | 152.0 KB |
| idx_product_novelties_expires_sweep | public.product_novelties | 96.0 KB |
| idx_product_packagings_product | public.product_packagings | 88.0 KB |
| idx_ppp_product | public.product_print_positions | 96.0 KB |
| idx_product_properties_property_definition_id | public.product_properties | 472.0 KB |
| idx_product_seo_audit | public.product_seo | 344.0 KB |
| idx_psgm_group | public.product_similarity_group_members | 96.0 KB |
| idx_psgm_product | public.product_similarity_group_members | 312.0 KB |
| idx_product_supply_sync_status | public.product_supply | 136.0 KB |
| idx_variants_capacity_ml | public.product_variants | 504.0 KB |
| idx_variants_color_name_active | public.product_variants | 544.0 KB |
| idx_variants_stock_active | public.product_variants | 616.0 KB |
| idx_product_views_pid_created | public.product_views | 216.0 KB |
| idx_products_color_swatches_gin | public.products | 13.3 MB |
| idx_products_dimensions_source | public.products | 280.0 KB |
| idx_products_keyset_name_id | public.products | 1.0 MB |
| idx_products_price_last_verified_at | public.products | 480.0 KB |
| idx_products_seo_audit_pending | public.products | 320.0 KB |
| idx_products_seo_listing | public.products | 840.0 KB |
| idx_products_slug_active_lookup | public.products | 824.0 KB |
| idx_products_sub_brand_id | public.products | 320.0 KB |
| idx_products_xbz_reliability | public.products | 168.0 KB |
| idx_produto_ramo_atividade_filho | public.produto_ramo_atividade | 1.7 MB |
| idx_produto_ramo_atividade_produto | public.produto_ramo_atividade | 1.3 MB |
| idx_padvar_color_id_2 | public.produtos_padronizacao_variantes | 80.0 KB |
| idx_padvar_pad | public.produtos_padronizacao_variantes | 872.0 KB |
| idx_padvar_sem_colorid | public.produtos_padronizacao_variantes | 120.0 KB |
| idx_produtos_site_padronizacao_raw_id | public.produtos_site_padronizacao | 120.0 KB |
| idx_stock_daily_summary_supplier_branch_id | public.stock_daily_summary | 31.9 MB |
| idx_stock_daily_summary_supplier_id | public.stock_daily_summary | 31.4 MB |
| idx_stock_snapshots_product_id | public.stock_snapshots | 2.1 MB |
| idx_stock_snapshots_supplier_branch_id | public.stock_snapshots | 1.4 MB |
| idx_stock_snapshots_variant_id | public.stock_snapshots | 2.5 MB |
| idx_stock_snapshots_variant_supplier | public.stock_snapshots | 2.2 MB |
| idx_stock_snapshots_variant_supplier_source_id | public.stock_snapshots | 2.5 MB |
| idx_supplier_import_batches_supplier_id | public.supplier_import_batches | 416.0 KB |
| idx_spr_images_pending | public.supplier_products_raw | 376.0 KB |
| idx_spr_import_batch_id | public.supplier_products_raw | 2.4 MB |
| idx_spr_variant_id | public.supplier_products_raw | 2.1 MB |
| idx_sre_supplier_date | public.supplier_replenishment_events | 416.0 KB |
| idx_sre_variant_date | public.supplier_replenishment_events | 416.0 KB |
| idx_variant_supplier_sources_supplier_branch_id | public.variant_supplier_sources | 640.0 KB |
| idx_vss_org_supplier | public.variant_supplier_sources | 1.4 MB |
| idx_vss_supplier_sku_xbz | public.variant_supplier_sources | 1.2 MB |
| idx_viq_youtube_id | public.video_import_queue | 80.0 KB |
| idx_xbz_upload_mapping_created_at | public.xbz_upload_mapping | 504.0 KB |
| idx_xbz_upload_mapping_request_id | public.xbz_upload_mapping | 1.4 MB |
| idx_xbz_upload_mapping_status | public.xbz_upload_mapping | 384.0 KB |


## Storage

| bucket | objetos (~) | tamanho |
|---|---|---|
| art-files | 3 | 1.3 MB |
| mockup-assets | 2 | 189.5 KB |
| scripts | 1 | 3.5 KB |


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~90 |
| confirmados (~) | ~90 |
| criados últimos 30d (~) | ~70 |

| provider | usuários (~) |
|---|---|
| email | ~90 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| authenticated | ~130 | ~1.6M | 12741.97 | `WITH pgrst_source AS ( SELECT "public"."login_attempts".* FROM "public"."login_attempts" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgr` |
| postgres | ~1.5k | ~1.6M | 1072.12 | `SELECT public.fn_cron_safe_run($1::bigint, $2, $3, $4)` |
| service_role | ~1.3k | ~1.4M | 1031.97 | `WITH pgrst_source AS (INSERT INTO "public"."supplier_products_raw"("raw_data", "source_channel", "source_endpoint", "status", "supplier_id", "supplier_reference", "supplier_sku") SELECT "pgrst_body"."raw_data", "pgrst_bo` |
| postgres | ~30 | ~1.1M | 41517.53 | `SELECT table_schema AS schema, table_name AS "table", column_name AS "column", grantee, string_agg(privilege_type, $1 ORDER BY privilege_type) AS privileges FROM information_schema.column_privileges cp WHERE grantee NOT ` |
| authenticated | ~1.3k | ~1.1M | 792.22 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_variant_id", "p_days" FROM json_to_record(pgrst_payload.json_data) AS _("p_variant_id" uuid, "p_days" integer) L` |
| authenticated | ~5.7k | ~546.6k | 95.98 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT "public"."fn_get_stock_notification_counts"() pgrst_scalar) pgrst_call) SELECT $3::bigint AS total_result_set, $4 AS page_total, coalesce(json_agg(_postgr` |
| authenticated | ~12.3k | ~510.1k | 41.63 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."fn_get_product_intelligence_all"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_` |
| authenticated | ~730 | ~398.5k | 548.16 | `WITH pgrst_source AS ( SELECT "public"."product_images"."id", "public"."product_images"."product_id", "public"."product_images"."variant_id", "public"."product_images"."supplier_code", "public"."product_images"."url_cdn"` |
| authenticated | ~5k | ~359k | 72.39 | `WITH pgrst_source AS ( SELECT "public"."v_products_public"."id", "public"."v_products_public"."name", "public"."v_products_public"."sku", "public"."v_products_public"."supplier_reference", "public"."v_products_public"."s` |
| authenticated | ~390 | ~335.7k | 852.13 | `WITH pgrst_source AS ( SELECT "public"."v_super_filtro_options"."slug_ou_codigo", "public"."v_super_filtro_options"."ordem" FROM "public"."v_super_filtro_options" WHERE "public"."v_super_filtro_options"."filtro_tipo" = $` |
| authenticated | ~17.9k | ~310.2k | 17.32 | `WITH pgrst_source AS ( SELECT "public"."stock_daily_summary"."product_id", "public"."stock_daily_summary"."variant_id", "public"."stock_daily_summary"."summary_date", "public"."stock_daily_summary"."units_depleted", "pub` |
| authenticated | ~5.7k | ~309k | 54.30 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_limit" FROM json_to_record(pgrst_payload.json_data) AS _("p_limit" integer) LIMIT $4) pgrst_body , LATERAL "publ` |
| authenticated | ~5.7k | ~267.4k | 47.01 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_limit" FROM json_to_record(pgrst_payload.json_data) AS _("p_limit" integer) LIMIT $4) pgrst_body , LATERAL "publ` |
| authenticated | ~5.7k | ~258.5k | 45.48 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_limit" FROM json_to_record(pgrst_payload.json_data) AS _("p_limit" integer) LIMIT $4) pgrst_body , LATERAL "publ` |
| service_role | ~20 | ~251k | 10041.26 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_items" FROM json_to_record(pgrst_payload.json_data) AS _("p_items" jsonb) LIMIT $4) pgrst_body , LATERA` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 31 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres |  | 1 |
| supabase_admin | active | 1 |
| supabase_admin | idle | 12 |
| supabase_admin |  | 1 |
