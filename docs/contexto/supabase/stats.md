# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 5.9 GB |
| schema public | 5.6 GB |
| schema cf_recon | 28.7 MB |
| schema analytics | 27.0 MB |
| schema prod_audit | 12.8 MB |
| schema classification_audit | 3.0 MB |
| schema internal | 2.2 MB |
| schema supplier_stricker | 592.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.stock_daily_summary | ~2.8M | 1.0 GB | 605.0 MB | 436.4 MB | 0 | ~90 | ~134.2k |  |
| public.stock_snapshots | ~149.8k | 777.8 MB | 657.4 MB | 120.2 MB | ~530 | 0 | 4 |  |
| public.supplier_products_raw_history_p2026_08 | ~531.3k | 753.5 MB | 723.1 MB | 27.1 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw_history_p2026_09 | ~495.5k | 704.6 MB | 676.1 MB | 25.4 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw_history_p2026_10 | ~348.1k | 501.6 MB | 480.3 MB | 18.0 MB | 0 | 0 | 0 |  |
| public.supplier_products_raw | ~23.7k | 373.0 MB | 257.0 MB | 23.4 MB | 0 | 0 | ~117.8k | 2026-11-13 |
| public.products | ~10.1k | 178.8 MB | 43.8 MB | 42.5 MB | ~60 | ~4.1k | ~17.1M | 2026-11-13 |
| public.supplier_customization_options_raw | ~46.4k | 152.3 MB | 142.2 MB | 9.9 MB | 0 | 0 | 0 |  |
| public.product_images | ~72k | 141.4 MB | 81.9 MB | 59.4 MB | 0 | ~4.3k | ~284.2k |  |
| public.bot_detection_log | ~110.6k | 111.0 MB | 101.9 MB | 9.0 MB | 0 | ~20 | ~40 |  |
| public.frontend_telemetry | ~99.5k | 84.7 MB | 77.7 MB | 5.6 MB | 5 | 0 | 0 |  |
| public.image_backfill_queue | ~116.4k | 79.0 MB | 52.3 MB | 26.6 MB | 0 | 0 | ~60 |  |
| public.product_relationships | ~154.8k | 73.7 MB | 28.3 MB | 45.3 MB | 0 | 0 | ~40 |  |
| public.variant_supplier_sources | ~22k | 69.3 MB | 56.1 MB | 13.1 MB | ~80 | ~230 | ~1.1M | 2026-11-13 |
| public.login_attempts | ~43.2k | 42.3 MB | 24.0 MB | 18.2 MB | 0 | ~20 | ~760 |  |
| public.produtos_padronizacao_variantes | ~20.7k | 41.7 MB | 33.5 MB | 7.7 MB | ~1k | ~20 | ~20.3k |  |
| public.seo_audit_log | ~93.9k | 37.5 MB | 33.6 MB | 3.9 MB | 0 | 0 | 0 |  |
| public.product_variants | ~20.8k | 34.9 MB | 26.6 MB | 8.3 MB | ~500 | ~5.7k | ~435.6k |  |
| public.product_customization_prices | ~28.4k | 32.2 MB | 25.3 MB | 6.8 MB | 0 | 0 | 4 |  |
| public.produtos_padronizacao | ~8.3k | 26.8 MB | 23.7 MB | 2.8 MB | ~110 | ~20 | ~38.6k | 2026-11-13 |
| public.supplier_products_raw_history_p2026_11 | ~15.9k | 26.6 MB | 24.7 MB | 904.0 KB | ~100 | 0 | 4 |  |
| public.product_seo | ~7.7k | 25.9 MB | 23.9 MB | 1.6 MB | 0 | 0 | 9 |  |
| public.produto_ramo_atividade | ~54.4k | 25.5 MB | 9.4 MB | 16.1 MB | 0 | 0 | 0 |  |
| cf_recon.cf_image | ~65.5k | 22.2 MB | 14.2 MB | 7.9 MB | 0 | 0 | ~20 |  |
| public.product_properties | ~34.1k | 19.9 MB | 13.3 MB | 6.2 MB | 0 | 0 | ~44.5k |  |
| public.product_ai_history | ~8.2k | 13.1 MB | 12.2 MB | 768.0 KB | 0 | 0 | 0 |  |
| public.xbz_upload_mapping | ~42k | 13.0 MB | 9.1 MB | 3.9 MB | 0 | 0 | 6 |  |
| public.admin_audit_log | ~16.5k | 11.6 MB | 10.0 MB | 1.6 MB | 0 | 0 | ~300 |  |
| public.xbz_gallery_staging | ~18.6k | 11.6 MB | 7.7 MB | 3.9 MB | 0 | 0 | 4 |  |
| prod_audit.product_features | ~6.1k | 11.4 MB | 4.5 MB | 6.9 MB | 0 | 0 | 0 |  |
| public.product_tags | ~51k | 11.1 MB | 4.2 MB | 6.9 MB | 0 | 0 | ~1.4k |  |
| public.product_ai_content | ~7.3k | 10.9 MB | 10.1 MB | 784.0 KB | 0 | 0 | 9 |  |
| public.product_category_assignments | ~39.1k | 10.1 MB | 4.3 MB | 5.8 MB | 7 | 0 | ~150.8k |  |
| public.print_area_techniques | ~24.4k | 10.1 MB | 5.2 MB | 4.8 MB | 0 | ~360 | ~1.1M |  |
| public.supplier_import_batches | ~830 | 9.7 MB | 7.4 MB | 2.3 MB | 5 | 0 | ~250 |  |
| public.supplier_replenishment_events | ~21.8k | 9.5 MB | 4.4 MB | 5.1 MB | 0 | ~20 | ~150 |  |
| public.produtos_site_padronizacao | ~3.2k | 8.8 MB | 7.6 MB | 712.0 KB | 0 | ~10 | ~15.4k |  |
| public.db_connection_snapshots | ~10.1k | 8.1 MB | 7.1 MB | 968.0 KB | 0 | 0 | 2 |  |
| public.product_commemorative_dates | ~34.8k | 8.0 MB | 4.3 MB | 3.7 MB | 0 | ~330 | ~680 |  |
| public.kit_component_enrichment_raw | ~6.8k | 7.9 MB | 6.3 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.backup_produto_ramo_atividade_20260625 | ~63.6k | 7.1 MB | 5.1 MB | 1.9 MB | 0 | 0 | 0 |  |
| public.pipeline_run_log | ~3.4k | 6.5 MB | 5.8 MB | 608.0 KB | 3 | 4 | ~30 |  |
| public.product_kit_components | ~3.6k | 5.8 MB | 3.4 MB | 2.4 MB | 0 | 3 | ~140 |  |
| cf_recon.cf_ghost_check_queue | ~17.8k | 5.7 MB | 4.1 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.product_novelties | ~2k | 5.5 MB | 3.3 MB | 2.1 MB | 2 | 8 | ~10.6k |  |
| public.product_materials | ~13.5k | 4.8 MB | 2.0 MB | 2.8 MB | 1 | 8 | ~1.6k |  |
| public._archive_product_seo_20260626 | ~6.6k | 4.8 MB | 4.5 MB | 224.0 KB | 0 | 0 | 0 |  |
| public.asia_upload_mapping | ~16.2k | 4.7 MB | 3.1 MB | 1.6 MB | ~20 | 0 | ~780 |  |
| public.product_packaging_compatibility | ~10.2k | 4.6 MB | 2.8 MB | 1.7 MB | 0 | 0 | ~100 |  |
| public.kit_component_padronizacao | ~6.8k | 4.5 MB | 2.7 MB | 1.8 MB | 0 | 0 | ~20 |  |
| public.supplier_customization_raw | ~330 | 4.3 MB | 4.1 MB | 136.0 KB | 0 | 0 | 0 |  |
| public._archive_supplier_price_tiers_20260626 | ~31.2k | 4.1 MB | 3.1 MB | 976.0 KB | 0 | 0 | 0 |  |
| public.request_rate_limits | ~18.6k | 4.0 MB | 2.0 MB | 1.9 MB | ~560 | 0 | ~5.3k |  |
| public.ai_enrichment_queue | ~7.9k | 4.0 MB | 1.8 MB | 2.1 MB | 0 | 4 | ~810 | 2026-11-13 |
| public.product_attributes | ~15.6k | 4.0 MB | 2.3 MB | 1.6 MB | 0 | 0 | 0 |  |
| public.qa_image_coverage_log | ~2.7k | 3.4 MB | 3.3 MB | 96.0 KB | 0 | 0 | 0 |  |
| public.b2b_collection_products | ~6.5k | 3.2 MB | 1.2 MB | 2.0 MB | 0 | 0 | 8 |  |
| public.workspace_notifications | ~3.8k | 3.0 MB | 2.3 MB | 672.0 KB | ~80 | ~3.7k | ~13.9k |  |
| classification_audit.category_suggestions | ~6.7k | 3.0 MB | 1.4 MB | 1.5 MB | 0 | 0 | 0 |  |
| public.schema_signature_baseline | ~7.2k | 2.9 MB | 1.9 MB | 992.0 KB | 0 | 2 | 3 |  |
| public.tags | ~90 | 2.8 MB | 2.5 MB | 272.0 KB | 1 | ~4.2k | ~1k |  |
| public.audit_log_gravacao | ~1.1k | 2.6 MB | 1.1 MB | 80.0 KB | 0 | 0 | 0 |  |
| public.schema_signature_drift_log | ~380 | 2.6 MB | 928.0 KB | 80.0 KB | 0 | 0 | 1 |  |
| public.schema_drift_log | ~420 | 2.5 MB | 704.0 KB | 80.0 KB | 0 | 0 | 0 |  |
| public.product_physical | ~8.2k | 2.4 MB | 1.6 MB | 760.0 KB | ~160 | 0 | ~290 |  |
| public.categories | ~480 | 2.3 MB | 1.6 MB | 672.0 KB | ~20 | ~19.9k | ~85.2k |  |
| public.kit_component_print_areas | ~6.1k | 2.2 MB | 920.0 KB | 1.3 MB | 0 | 1 | 6 |  |
| public.product_similarity_group_members | ~7k | 2.2 MB | 936.0 KB | 1.3 MB | 0 | 0 | 8 |  |
| public.product_fiscal | ~8.3k | 2.0 MB | 1.1 MB | 928.0 KB | ~220 | 0 | ~280 |  |
| public.product_print_positions | ~3.8k | 2.0 MB | 1.5 MB | 512.0 KB | 0 | 0 | 4 |  |
| public.product_supply | ~8k | 2.0 MB | 1.2 MB | 832.0 KB | 0 | 0 | 9 |  |
| public.catalog_analytics | ~2.8k | 1.9 MB | 1.7 MB | 200.0 KB | 0 | 0 | 0 |  |
| public.generated_mockups | 0 | 1.9 MB | 8.0 KB | 96.0 KB | 0 | ~100 | 0 |  |
| public.kit_component_variant_skus | ~4.2k | 1.9 MB | 760.0 KB | 1.1 MB | 0 | 1 | ~4.3k |  |
| public.product_videos | ~1.1k | 1.8 MB | 1.3 MB | 440.0 KB | 0 | 0 | ~640 |  |
| public.product_packaging | ~6.6k | 1.5 MB | 1.1 MB | 424.0 KB | 0 | 0 | ~10 |  |
| public.video_import_queue | ~1k | 1.5 MB | 1.2 MB | 256.0 KB | 0 | ~20 | ~30 |  |
| public.asia_image_import_queue | ~60 | 1.5 MB | 24.0 KB | 1.4 MB | ~40 | 8 | ~110 |  |
| public.product_views | ~3.1k | 1.1 MB | 528.0 KB | 536.0 KB | 0 | ~40 | ~460 |  |
| public.included_packaging_print_areas | ~2.6k | 1.0 MB | 472.0 KB | 528.0 KB | 0 | 0 | 0 |  |
| public.magazine_items | ~310 | 1016.0 KB | 848.0 KB | 128.0 KB | 0 | 0 | ~1.1k |  |
| public.product_included_packagings | ~1.2k | 1008.0 KB | 680.0 KB | 288.0 KB | 0 | 0 | ~10 |  |
| public.product_qa_image_alerts | ~360 | 944.0 KB | 600.0 KB | 304.0 KB | 7 | ~10 | ~1.3k |  |
| public.included_packaging_techniques | ~2.8k | 928.0 KB | 448.0 KB | 440.0 KB | 0 | 0 | 0 |  |
| public.video_validation_log | ~2.2k | 912.0 KB | 784.0 KB | 88.0 KB | 0 | 0 | 0 |  |
| public._archive_product_ai_20260626 | ~6.6k | 904.0 KB | 640.0 KB | 224.0 KB | 0 | 0 | 0 |  |
| public._bkp_kcvs_pre_normalize_20260624 | ~4.1k | 904.0 KB | 720.0 KB | 144.0 KB | 0 | 0 | 0 |  |
| public.product_deactivation_requests | ~1.4k | 896.0 KB | 552.0 KB | 304.0 KB | 0 | 0 | 0 |  |
| public.sm_site_url_map | ~1.4k | 840.0 KB | 440.0 KB | 360.0 KB | 0 | ~90 | ~30 |  |
| public.magic_up_generations | 0 | 816.0 KB | 8.0 KB | 32.0 KB | 0 | ~40 | 0 |  |
| public.magazines | ~760 | 752.0 KB | 448.0 KB | 264.0 KB | ~30 | 0 | ~41.9k |  |
| public.tabela_preco_gravacao_oficial_faixa | ~950 | 736.0 KB | 128.0 KB | 576.0 KB | 0 | 0 | ~110 |  |
| prod_audit.category_keywords | ~440 | 712.0 KB | 240.0 KB | 432.0 KB | 0 | 0 | 0 |  |
| public.product_notebook_specs | ~780 | 584.0 KB | 256.0 KB | 288.0 KB | 0 | 1 | 9 |  |
| public.product_packagings | ~1.4k | 560.0 KB | 224.0 KB | 296.0 KB | 0 | 0 | 0 |  |
| public.product_notebook_features | ~1k | 544.0 KB | 200.0 KB | 304.0 KB | 0 | 0 | 8 |  |
| public.mcp_access_violations | ~930 | 472.0 KB | 384.0 KB | 56.0 KB | 0 | ~260 | 0 |  |
| public.seo_redirects | ~750 | 464.0 KB | 320.0 KB | 112.0 KB | 0 | 0 | 0 |  |
| public.color_variations | ~90 | 448.0 KB | 32.0 KB | 376.0 KB | 0 | ~700 | ~2.1k |  |
| cf_recon.remediation | ~340 | 440.0 KB | 352.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.quotes | 4 | 432.0 KB | 16.0 KB | 376.0 KB | 0 | ~1.8k | ~5.6k |  |
| public.seller_cart_items | ~40 | 432.0 KB | 208.0 KB | 184.0 KB | 0 | 0 | 4 |  |
| prod_audit.category_suggestions | ~450 | 408.0 KB | 200.0 KB | 176.0 KB | 0 | 0 | 0 |  |
| public.supplier_colors | ~290 | 384.0 KB | 120.0 KB | 224.0 KB | 3 | 3 | ~250 |  |
| public.tabela_preco_gravacao_oficial | ~90 | 368.0 KB | 160.0 KB | 96.0 KB | 0 | ~370 | ~840 |  |
| public.color_equivalences | ~290 | 352.0 KB | 128.0 KB | 184.0 KB | 0 | 4 | ~110 |  |
| public.category_relationships | ~270 | 344.0 KB | 136.0 KB | 168.0 KB | 0 | 0 | 0 |  |
| public.pipeline_health_log | ~40 | 328.0 KB | 272.0 KB | 16.0 KB | 3 | 2 | 0 |  |
| public.query_telemetry | ~1000 | 320.0 KB | 232.0 KB | 56.0 KB | 0 | 0 | 0 |  |
| cf_recon.action_log | ~480 | 296.0 KB | 232.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.collection_items | 0 | 296.0 KB | 8.0 KB | 264.0 KB | 0 | ~280 | 0 |  |
| public.search_analytics | ~350 | 288.0 KB | 48.0 KB | 200.0 KB | 0 | 0 | ~590 |  |
| public.magazine_public_view_events_2026_11 | ~320 | 280.0 KB | 104.0 KB | 144.0 KB | 0 | 0 | 4 |  |
| prod_audit.test_results | ~920 | 264.0 KB | 160.0 KB | 72.0 KB | 0 | 0 | 0 |  |
| public.favorite_items | 2 | 264.0 KB | 8.0 KB | 216.0 KB | 0 | ~780 | ~1k |  |
| public.kit_component_ficha_staging | ~430 | 264.0 KB | 152.0 KB | 72.0 KB | 0 | 0 | ~100 |  |
| public.medallion_coverage_snapshots | ~1.2k | 264.0 KB | 176.0 KB | 56.0 KB | 0 | 0 | 0 |  |
| public.quote_items | ~10 | 264.0 KB | 16.0 KB | 208.0 KB | 0 | ~1.5k | ~5.4k |  |
| public.anon_catalog_grant_audit_log | ~310 | 256.0 KB | 192.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.profiles | ~80 | 248.0 KB | 96.0 KB | 112.0 KB | 0 | ~30 | ~8k |  |
| public.suppliers | 5 | 248.0 KB | 144.0 KB | 64.0 KB | 5 | ~4.6k | ~4.2M |  |
| public.supplier_categories | ~430 | 240.0 KB | 64.0 KB | 136.0 KB | 0 | 0 | 4 |  |
| public.edge_rate_limits | ~30 | 232.0 KB | 8.0 KB | 184.0 KB | ~50 | 4 | ~780 | 2026-11-13 |
| public.category_ancestors | ~1k | 224.0 KB | 72.0 KB | 120.0 KB | 0 | 1 | 0 |  |
| public.ncm_codes | ~260 | 216.0 KB | 96.0 KB | 80.0 KB | 0 | 0 | ~440 |  |
| public.discount_approval_audit | 0 | 208.0 KB | 8.0 KB | 176.0 KB | 0 | 0 | 0 |  |
| public.discount_approval_requests | 0 | 208.0 KB | 8.0 KB | 160.0 KB | 0 | ~220 | 0 |  |
| public.material_equivalences | ~280 | 208.0 KB | 56.0 KB | 112.0 KB | 0 | 0 | 0 |  |
| public.price_history | ~210 | 208.0 KB | 128.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.video_sim_results | ~1k | 208.0 KB | 104.0 KB | 72.0 KB | 0 | 0 | 0 |  |
| public.product_deactivation_tokens | ~390 | 200.0 KB | 64.0 KB | 104.0 KB | 0 | 4 | 0 |  |
| public.ai_usage_logs | ~60 | 192.0 KB | 56.0 KB | 96.0 KB | 0 | 0 | ~60 |  |
| public.user_roles | ~80 | 192.0 KB | 8.0 KB | 152.0 KB | 0 | ~10.2k | ~3.1M |  |
| public._bkp_kit_dims_20260619 | ~960 | 184.0 KB | 128.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.ai_routing_decisions | ~20 | 184.0 KB | 88.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.seller_discount_limits | ~80 | 184.0 KB | 24.0 KB | 120.0 KB | 0 | 0 | ~250 |  |
| public.category_copywriting_config | ~40 | 176.0 KB | 104.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_category_mappings | ~430 | 176.0 KB | 48.0 KB | 104.0 KB | 0 | 0 | 4 |  |
| public.supplier_materials | ~280 | 176.0 KB | 48.0 KB | 88.0 KB | 0 | 0 | 0 |  |
| public.ip_access_control | ~210 | 168.0 KB | 48.0 KB | 80.0 KB | 0 | 0 | ~6.7k |  |
| public.product_badge_definitions | ~30 | 168.0 KB | 32.0 KB | 96.0 KB | 0 | 0 | 0 |  |
| public.quote_history | 3 | 168.0 KB | 16.0 KB | 112.0 KB | 0 | 0 | 0 |  |
| public.anon_insert_rate | ~100 | 160.0 KB | 24.0 KB | 96.0 KB | ~50 | ~20 | ~240 | 2026-11-13 |
| public.seller_carts | ~90 | 160.0 KB | 40.0 KB | 80.0 KB | 0 | 0 | ~3.9k |  |
| public.supplier_property_mappings | ~280 | 160.0 KB | 40.0 KB | 88.0 KB | 0 | 0 | 4 |  |
| public.markup_configurations | 3 | 152.0 KB | 8.0 KB | 104.0 KB | 0 | ~14.7k | 0 |  |
| public.product_similarity_groups | ~270 | 152.0 KB | 80.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.quote_item_personalizations | 0 | 152.0 KB | 8.0 KB | 104.0 KB | 0 | 0 | 4 |  |
| public.ops_grant_audit | ~600 | 144.0 KB | 80.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.orders | 5 | 144.0 KB | 8.0 KB | 96.0 KB | 0 | ~1.8k | ~2k |  |
| public.kit_component_types | ~130 | 136.0 KB | 32.0 KB | 64.0 KB | 0 | 3 | ~10 |  |
| public.smoke_test_runs | ~310 | 136.0 KB | 48.0 KB | 56.0 KB | 0 | 0 | 0 |  |
| public.supplier_field_mappings | ~190 | 136.0 KB | 48.0 KB | 56.0 KB | 0 | 0 | ~360 |  |
| public.webhook_dispatcher_log | 2 | 136.0 KB | 16.0 KB | 80.0 KB | 0 | 0 | ~70 |  |
| public.e2e_cleanup_audit | ~50 | 128.0 KB | 16.0 KB | 80.0 KB | 0 | 0 | 0 |  |
| public.mockup_credit_transactions | 4 | 128.0 KB | 8.0 KB | 80.0 KB | 0 | 0 | 0 |  |
| public.sm_category_pages | ~50 | 128.0 KB | 40.0 KB | 48.0 KB | 0 | 0 | ~50 |  |
| public.variation_values | ~170 | 128.0 KB | 24.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.crm_callback_events | ~110 | 120.0 KB | 16.0 KB | 64.0 KB | 0 | 0 | 2 |  |
| public.kill_switch_hits | 0 | 120.0 KB | 8.0 KB | 88.0 KB | 0 | 0 | 0 |  |
| public.ai_function_routing | ~20 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.color_groups | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 0 | ~9.1k | ~700 |  |
| public.favorite_lists | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 0 | ~730 | ~3.3k |  |
| public.integration_credentials | ~20 | 112.0 KB | 8.0 KB | 64.0 KB | 0 | ~3.5k | 0 |  |
| public.material_types | ~90 | 112.0 KB | 24.0 KB | 48.0 KB | 0 | ~370 | ~1.2k |  |
| public._bkp_kit_color_from_name_20260624 | ~450 | 104.0 KB | 64.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.dashboard_insights_cache | 1 | 104.0 KB | 8.0 KB | 48.0 KB | 0 | ~50 | 1 |  |
| public.magazine_reader_state | 0 | 104.0 KB | 8.0 KB | 72.0 KB | 0 | 0 | 0 |  |
| public.navigation_analytics | ~70 | 104.0 KB | 16.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_subtype_category_map | ~100 | 104.0 KB | 24.0 KB | 48.0 KB | 0 | 0 | 8 |  |
| public.admin_settings | 1 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~19.3k | 0 |  |
| public.attribute_definitions | ~50 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.color_synonym_map | ~10 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.enriched_contacts | ~50 | 96.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.import_pipeline_steps | ~50 | 96.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.material_groups | ~10 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.3k | ~1.4k |  |
| public.material_variations | ~20 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.pipeline_known_issues | 8 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.ramo_atividade_filho | ~110 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~1.2k | 0 |  |
| public.role_permissions | ~120 | 96.0 KB | 16.0 KB | 48.0 KB | 0 | ~4k | 0 |  |
| public.supplier_attribute_definitions | ~10 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.supplier_branches | 7 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.1k | 0 |  |
| public.category_attributes | ~100 | 88.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.collections | ~100 | 88.0 KB | 16.0 KB | 32.0 KB | 0 | ~150 | ~4k |  |
| public.custom_kits | ~20 | 88.0 KB | 8.0 KB | 40.0 KB | 0 | 1 | ~120 |  |
| public.follow_up_reminders | ~150 | 88.0 KB | 40.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.supplier_value_mappings | ~100 | 88.0 KB | 24.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.ai_providers | 5 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.audit_log | 0 | 80.0 KB | 0 B | 56.0 KB | 0 | 0 | 0 |  |
| public.b2b_collections | 9 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.category_commemorative_dates | ~50 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.cf_recon_inflight | 0 | 80.0 KB | 8.0 KB | 56.0 KB | 0 | 0 | 8 |  |
| public.color_nuances | 7 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~240 | 0 |  |
| public.inbound_webhook_events | ~60 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.mockup_drafts | 3 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~20 | 0 |  |
| public.organizations | 1 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~440 | 0 |  |
| public.property_definitions | ~100 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | 0 | 8 |  |
| public.sm_worker_partitions | ~10 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.supplier_settings | 5 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~1.3k | ~80 |  |
| public.supplier_video_requirements | 4 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.user_onboarding | 2 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | ~4k | 0 |  |
| public.variation_types | ~20 | 80.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public._qa_pct_results | ~320 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.category_accessory_categories | 3 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.category_variation_types | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.collection_products | ~30 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.content_articles | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 0 | 0 |  |
| public.ingestion_run_log | ~100 | 72.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_reactions | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 0 | 0 |  |
| public.mockup_credits | 4 | 72.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.organization_members | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| public.spot_health_log | ~100 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.system_documentation | ~40 | 72.0 KB | 24.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.user_comparisons | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | ~90 | 0 |  |
| public.user_organizations | ~20 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~7.7M | ~4.9k |  |
| supplier_stricker.customization_tables | 8 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.optionals | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | 0 | 0 |  |
| public._bkp_kit_pkg_material_20260624 | ~290 | 64.0 KB | 32.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.ai_models | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.auto_tag_rules | ~80 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.collection_items_trash | 0 | 64.0 KB | 0 B | 40.0 KB | 0 | 0 | 0 |  |
| public.commemorative_dates | ~40 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~420 | 0 |  |
| public.edge_function_invocations | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.inbound_webhook_endpoints | 2 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~90 | 0 |  |
| public.kit_typical_dims | ~90 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 8 |  |
| public.magazine_public_view_events_2026_10 | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.order_items | 9 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.5k | ~20 |  |
| public.packagings | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.personalization_technique_mappings | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.product_faqs | 6 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~7.4k | 0 |  |
| public.ramo_atividade | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.3k | 0 |  |
| public.supplier_field_priority | ~10 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.system_changelog | ~30 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.target_audiences | ~40 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.voice_command_logs | ~50 | 64.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.category_colors | ~30 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | 0 |  |
| public.category_target_audiences | ~10 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.commemorative_date_colors | ~30 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.kit_save_requests | 1 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2026_07 | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 0 | 0 |  |
| public.magazine_view_rollup_watermark | 1 | 56.0 KB | 8.0 KB | 16.0 KB | 4 | 8 | 0 |  |
| public.mockup_approval_links | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 0 | 0 |  |
| public.mockup_generation_jobs | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | 0 | 0 |  |
| public.outbound_webhooks | 1 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~20 | 0 |  |
| public.product_target_audiences | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| public.secret_rotation_log | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~20 | 0 |  |
| public.supplier_packagings | ~10 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 0 | 0 |  |
| prod_audit.classification_rules | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.attribute_groups | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.binding_types | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.city_whitelist | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.classify_functions_registry | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.cover_finishes | 9 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.cover_materials | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.cover_types | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.expert_conversations | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~3.7k | 0 |  |
| public.favorite_items_trash | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~50 | 0 |  |
| public.image_types | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | ~30 |  |
| public.ip_whitelist | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.kit_quote_requests | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.notebook_features | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 4 |  |
| public.notification_templates | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.packaging_compatibility_config | ~20 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.packaging_types | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_colors | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_formats | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_rulings | 5 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.personalization_techniques | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~4.9k | 0 |  |
| public.roles | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.schema_signature_drift_allowlist | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 3 | 0 |  |
| public.supplier_sub_brands | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.system_kill_switches | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~520 | 0 |  |
| public.user_2fa_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~40 | 0 |  |
| public.video_types | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.webhook_deliveries | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.webhook_delivery_locks | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | 0 |  |
| public.webhook_outbox | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.customization_options | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 0 | 0 |  |
| public._bkp_kit_packing_type_20260624 | ~150 | 40.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public._bkp_orphan_active_variants_20260619 | ~50 | 40.0 KB | 16.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.ai_usage_quotas | 7 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~40 | 4 |  |
| public.binding_colors | 4 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.commemorative_date_exclusions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| public.enrichment_log | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | 0 | 0 |  |
| public.external_connections | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 0 |  |
| public.file_scan_logs | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | 0 | 0 |  |
| public.kit_templates | 0 | 40.0 KB | 8.0 KB | 24.0 KB | 0 | ~80 | 0 |  |
| public.magazine_templates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| public.paper_weights | 9 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.password_reset_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.supplier_unit_conversions | ~20 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.tecnicas_gravacao | ~20 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 0 | 0 |  |
| public.variant_commemorative_dates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.product_types | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_optionals | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.sync_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| cf_recon.crawl_run | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| cf_recon.metric_snapshot | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.access_blocked_log | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.analytics_events | 3 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.art_file_attachments | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.attribute_equivalences | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.cnpj_backfill_audit | 8 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.cron_job_timeout_map | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.e2e_cleanup_rate_limit | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_backfill_log_20260625 | ~20 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_date_reconcile_log_20260626 | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.eco_material_config | 7 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 1 | ~10 |  |
| public.expert_messages | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.favorite_item_reactions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.feminine_color_config | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~300 | ~30 |  |
| public.geo_allowed_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.kit_comments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.kit_ficha_session_log | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.kit_share_tokens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_duplicate_requests | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2026_08 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2026_09 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2026_12 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2027_01 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_2027_02 | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events_default | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.magazine_templates_catalog | ~10 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~30 | 0 |  |
| public.material_reconcile_log_20260626 | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.mcp_api_keys | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.mcp_kv | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.mcp_sessions | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.mockup_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.optimization_queue | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.ownership_audit_reports | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.permissions | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.personalization_simulations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.pipeline_control | 1 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~10 | 0 |  |
| public.product_component_location_techniques | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.product_group_members | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.product_price_freshness_overrides | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.quote_approval_tokens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.quote_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.schema_drift_allowlist | ~20 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.spot_typecode_map | ~30 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.step_up_audit_log | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 0 | 0 |  |
| public.stock_notes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.system_settings | 2 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~21.3k | 0 |  |
| public.user_allowed_ips | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.user_favorites | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.user_ip_allowlist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.webhook_request_nonces | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 0 |  |
| supplier_stricker.stg_product_types | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_products | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stocks | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | 0 | 0 |  |
| public.access_security_settings | 1 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | ~370 | 0 |  |
| public.cart_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.collection_item_reactions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.company_email_patterns | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.comparison_reactions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.connection_test_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.cron_watchdog_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.device_login_notifications | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.kit_collaborators | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.kit_variants | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.magic_up_campaigns | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~40 | 0 |  |
| public.mcp_key_auto_revocations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.optimization_queue_runs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.product_component_locations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.product_group_components | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.product_group_location_techniques | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| public.product_group_locations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.quote_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.sales_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.saved_trends_views | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~40 | 0 |  |
| public.scheduled_reports | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~60 | 0 |  |
| public.search_queries | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.step_up_challenges | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.user_known_devices | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.user_notification_preferences | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.user_search_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.user_token_revocations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~520 | 0 |  |
| public.visual_search_feedback | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.canceled_products | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.category_mappings | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.colors | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.products | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_colors | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_customizations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_stock | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.ai_usage_events | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.companies | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.component_media | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.conversation_audit_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.conversation_delivery_status | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.conversation_event_history | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.external_connections_sync_log | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.hardening_health_snapshots | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magic_up_brand_kits | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magic_up_comments | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magic_up_public_shares | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magic_up_reactions | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.mcp_full_grantors | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.mockup_prompt_configs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.mockup_prompt_history | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.notification_preferences | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 0 | 0 |  |
| public.notifications | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.order_item_personalizations | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.ownership_repair_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.product_components | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.product_groups | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.product_search_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.product_sync_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.public_token_failures | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.push_subscriptions | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.quote_drafts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.recently_viewed_products | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.rls_denial_log | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.role_migration_batches | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.role_migration_items | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.saved_filters | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~330 | 0 |  |
| public.security_settings | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.simulator_wizard_drafts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~50 | 0 |  |
| public.step_up_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.supplier_products_raw_history_p2026_12 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |
| public.supplier_products_raw_history_p2027_01 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |
| public.supplier_products_raw_history_p2027_02 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_03 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_04 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_05 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_06 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_07 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_08 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_09 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_10 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_11 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.supplier_products_raw_history_p2027_12 | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 4 |  |
| public.user_filter_presets | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.user_preferences | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.video_variant_links | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.webhook_delivery_metrics | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| supplier_stricker.stg_images | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 0 | 0 |  |
| public.magazine_public_view_events | 0 | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |
| public.supplier_products_raw_history | ~1.4M | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_mv_product_intelligence_abc | analytics.mv_product_intelligence | 328.0 KB |
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
| idx_admin_audit_log_action | public.admin_audit_log | 232.0 KB |
| idx_ai_queue_pending | public.ai_enrichment_queue | 160.0 KB |
| idx_ai_queue_product_id | public.ai_enrichment_queue | 496.0 KB |
| idx_categories_path_tpo | public.categories | 168.0 KB |
| idx_frontend_telemetry_user_id | public.frontend_telemetry | 936.0 KB |
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
| idx_login_attempts_email_ip_created | public.login_attempts | 5.3 MB |
| idx_login_attempts_user_id | public.login_attempts | 3.0 MB |
| magazine_public_view_events_2026_11_token_hash_viewed_at_idx | public.magazine_public_view_events_2026_11 | 72.0 KB |
| idx_magazines_not_deleted | public.magazines | 80.0 KB |
| idx_mv_pia_prioridade | public.mv_product_images_audit | 1.7 MB |
| idx_mv_stock_rupture_alert_nivel | public.mv_stock_rupture_alert | 536.0 KB |
| idx_mv_stock_rupture_alert_non_ok_prio_score | public.mv_stock_rupture_alert | 632.0 KB |
| idx_mv_stock_rupture_alert_pref_score | public.mv_stock_rupture_alert | 1.8 MB |
| idx_mv_stock_rupture_alert_supplier_id | public.mv_stock_rupture_alert | 584.0 KB |
| idx_mv_stock_rupture_alert_variant_id | public.mv_stock_rupture_alert | 1.1 MB |
| idx_pat_location_code | public.print_area_techniques | 248.0 KB |
| idx_pat_tabela | public.print_area_techniques | 280.0 KB |
| idx_product_ai_content_version | public.product_ai_content | 104.0 KB |
| idx_prod_comm_product | public.product_commemorative_dates | 488.0 KB |
| idx_product_commemorative_dates_category_id | public.product_commemorative_dates | 256.0 KB |
| idx_product_commemorative_dates_commemorative_date_id | public.product_commemorative_dates | 264.0 KB |
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
| idx_product_images_status_active | public.product_images | 512.0 KB |
| idx_kit_components_name | public.product_kit_components | 176.0 KB |
| idx_pkc_color_id | public.product_kit_components | 96.0 KB |
| idx_product_kit_components_component_product_id | public.product_kit_components | 152.0 KB |
| idx_product_kit_components_padronizacao_id | public.product_kit_components | 128.0 KB |
| idx_product_kit_components_secondary_material_type_id | public.product_kit_components | 152.0 KB |
| idx_product_novelties_expires_sweep | public.product_novelties | 96.0 KB |
| idx_product_packagings_product | public.product_packagings | 88.0 KB |
| idx_product_properties_property_definition_id | public.product_properties | 472.0 KB |
| idx_product_seo_audit | public.product_seo | 344.0 KB |
| idx_product_seo_score | public.product_seo | 224.0 KB |
| idx_psgm_group | public.product_similarity_group_members | 96.0 KB |
| idx_product_supply_sync_status | public.product_supply | 136.0 KB |
| idx_variants_capacity_ml | public.product_variants | 504.0 KB |
| idx_variants_color_name_active | public.product_variants | 544.0 KB |
| idx_products_color_swatches_gin | public.products | 13.3 MB |
| idx_products_dimensions_source | public.products | 280.0 KB |
| idx_products_featured_expires | public.products | 112.0 KB |
| idx_products_is_featured | public.products | 280.0 KB |
| idx_products_is_stockout | public.products | 296.0 KB |
| idx_products_keyset_name_id | public.products | 1.0 MB |
| idx_products_name_trgm | public.products | 7.0 MB |
| idx_products_ncm_id | public.products | 328.0 KB |
| idx_products_padronizacao_id | public.products | 544.0 KB |
| idx_products_price_last_verified_at | public.products | 480.0 KB |
| idx_products_search_vector | public.products | 7.1 MB |
| idx_products_seo_audit_pending | public.products | 320.0 KB |
| idx_products_seo_listing | public.products | 840.0 KB |
| idx_products_slug_active_lookup | public.products | 824.0 KB |
| idx_products_sub_brand_id | public.products | 320.0 KB |
| idx_products_xbz_reliability | public.products | 168.0 KB |
| idx_produto_ramo_atividade_filho | public.produto_ramo_atividade | 1.7 MB |
| idx_produto_ramo_atividade_produto | public.produto_ramo_atividade | 1.3 MB |
| idx_produtos_padronizacao_sub_brand_id | public.produtos_padronizacao | 136.0 KB |
| idx_padvar_color_id_2 | public.produtos_padronizacao_variantes | 80.0 KB |
| idx_padvar_pad | public.produtos_padronizacao_variantes | 872.0 KB |
| idx_padvar_sem_colorid | public.produtos_padronizacao_variantes | 120.0 KB |
| idx_produtos_site_padronizacao_raw_id | public.produtos_site_padronizacao | 120.0 KB |
| idx_sds_variant_id | public.stock_daily_summary | 25.1 MB |
| idx_stock_daily_summary_supplier_branch_id | public.stock_daily_summary | 30.6 MB |
| idx_stock_daily_summary_supplier_id | public.stock_daily_summary | 30.2 MB |
| idx_snapshots_captured_at | public.stock_snapshots | 1.2 MB |
| idx_supplier_import_batches_supplier_id | public.supplier_import_batches | 416.0 KB |
| idx_spr_images_pending | public.supplier_products_raw | 352.0 KB |
| idx_spr_import_batch_id | public.supplier_products_raw | 2.4 MB |
| idx_spr_supplier_source_channel | public.supplier_products_raw | 2.7 MB |
| idx_spr_unprocessed | public.supplier_products_raw | 1.7 MB |
| idx_spr_variant_id | public.supplier_products_raw | 2.1 MB |
| idx_sre_pending | public.supplier_replenishment_events | 144.0 KB |
| idx_sre_supplier_date | public.supplier_replenishment_events | 416.0 KB |
| idx_sre_variant_date | public.supplier_replenishment_events | 416.0 KB |
| idx_tpgof_tabela_qty | public.tabela_preco_gravacao_oficial_faixa | 96.0 KB |
| idx_variant_supplier_sources_supplier_branch_id | public.variant_supplier_sources | 640.0 KB |
| idx_vss_org_supplier | public.variant_supplier_sources | 1.4 MB |
| idx_vss_supplier_sku_xbz | public.variant_supplier_sources | 1.2 MB |
| idx_xbz_staging_status | public.xbz_gallery_staging | 176.0 KB |
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
| usuários (~) | ~80 |
| confirmados (~) | ~80 |
| criados últimos 30d (~) | ~70 |

| provider | usuários (~) |
|---|---|
| email | ~80 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| authenticated | ~13k | ~18.5M | 1425.45 | `WITH pgrst_source AS ( SELECT "public"."v_products_public"."id", "public"."v_products_public"."name", "public"."v_products_public"."sku", "public"."v_products_public"."supplier_reference", "public"."v_products_public"."s` |
| authenticated | ~6k | ~9.6M | 1600.51 | `WITH pgrst_source AS ( SELECT "public"."v_products_public"."id", "public"."v_products_public"."name", "public"."v_products_public"."sku", "public"."v_products_public"."supplier_reference", "public"."v_products_public"."s` |
| postgres | ~510 | ~7.7M | 15087.78 | `SELECT public.fn_cron_safe_run($1::bigint, $2, $3, $4)` |
| authenticated | ~4.4k | ~5.7M | 1305.24 | `WITH pgrst_source AS ( SELECT "public"."v_products_public"."id", "public"."v_products_public"."name", "public"."v_products_public"."sku", "public"."v_products_public"."supplier_reference", "public"."v_products_public"."s` |
| authenticated | ~4.2k | ~4.1M | 975.82 | `WITH pgrst_source AS ( SELECT "public"."tags".* FROM "public"."tags" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| authenticated | ~4.2k | ~2.4M | 569.89 | `WITH pgrst_source AS ( SELECT "public"."categories".* FROM "public"."categories" WHERE "public"."categories"."is_active" = $1 LIMIT $2 OFFSET $3 ) SELECT $4::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS ` |
| authenticated | ~3.9k | ~2M | 512.41 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT "public"."fn_get_stock_notification_counts"() pgrst_scalar) pgrst_call) SELECT $3::bigint AS total_result_set, $4 AS page_total, coalesce(json_agg(_postgr` |
| authenticated | ~1.3k | ~1.7M | 1290.16 | `WITH pgrst_source AS ( SELECT "public"."v_products_public"."id", "public"."v_products_public"."name", "public"."v_products_public"."sku", "public"."v_products_public"."supplier_reference", "public"."v_products_public"."s` |
| authenticated | ~6k | ~1.5M | 258.06 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."fn_get_product_intelligence_all"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_` |
| authenticated | ~310 | ~1.4M | 4403.27 | `WITH pgrst_source AS ( SELECT "public"."v_super_filtro_options"."slug_ou_codigo", "public"."v_super_filtro_options"."ordem" FROM "public"."v_super_filtro_options" WHERE "public"."v_super_filtro_options"."filtro_tipo" = $` |
| authenticated | ~3.9k | ~1.1M | 280.21 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_limit" FROM json_to_record(pgrst_payload.json_data) AS _("p_limit" integer) LIMIT $4) pgrst_body , LATERAL "publ` |
| authenticated | ~660 | ~842.9k | 1275.26 | `WITH pgrst_source AS ( SELECT "public"."product_images"."id", "public"."product_images"."product_id", "public"."product_images"."variant_id", "public"."product_images"."supplier_code", "public"."product_images"."url_cdn"` |
| authenticated | ~7.5k | ~840.3k | 112.05 | `WITH pgrst_source AS ( SELECT "public"."categories"."id", "public"."categories"."name" FROM "public"."categories" ORDER BY "public"."categories"."name" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_c` |
| postgres | ~20 | ~820.3k | 54686.42 | `SELECT table_schema AS schema, table_name AS "table", column_name AS "column", grantee, string_agg(privilege_type, $1 ORDER BY privilege_type) AS privileges FROM information_schema.column_privileges cp WHERE grantee NOT ` |
| authenticated | ~1k | ~711.3k | 682.64 | `WITH pgrst_source AS ( SELECT "public"."categories".* FROM "public"."categories" WHERE "public"."categories"."is_active" = $1 ORDER BY "public"."categories"."name" ASC LIMIT $2 OFFSET $3 ) SELECT $4::bigint AS total_resu` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | active | 3 |
| authenticator | idle | 20 |
| authenticator | idle in transaction | 7 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| postgres |  | 1 |
| supabase_admin | active | 1 |
| supabase_admin | idle | 12 |
| supabase_admin |  | 1 |
| supabase_auth_admin | active | 1 |
| supabase_auth_admin | idle | 7 |
