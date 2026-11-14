# Grants


Roles da API: `anon` (sem login), `authenticated` (logado), `service_role` (bypass RLS). Grants de sistema (postgres, supabase_*) omitidos.

## Tabelas e views

| objeto | role | privilégios |
|---|---|---|
| cf_recon.action_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| cf_recon.cf_ghost_check_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| cf_recon.cf_image | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| cf_recon.crawl_run | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| cf_recon.metric_snapshot | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| cf_recon.remediation | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._archive_product_ai_20260626 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._archive_product_seo_20260626 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._archive_supplier_price_tiers_20260626 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_kcvs_pre_normalize_20260624 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_kit_color_from_name_20260624 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_kit_dims_20260619 | anon | REFERENCES, TRIGGER |
| public._bkp_kit_dims_20260619 | authenticated | REFERENCES, TRIGGER |
| public._bkp_kit_dims_20260619 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_kit_packing_type_20260624 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_kit_pkg_material_20260624 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._bkp_orphan_active_variants_20260619 | anon | REFERENCES, TRIGGER |
| public._bkp_orphan_active_variants_20260619 | authenticated | REFERENCES, TRIGGER |
| public._bkp_orphan_active_variants_20260619 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public._qa_pct_results | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.access_blocked_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.access_blocked_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.access_security_settings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.access_security_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admin_audit_log | authenticated | REFERENCES, SELECT, TRIGGER |
| public.admin_audit_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admin_settings | authenticated | INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.admin_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_enrichment_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_function_routing | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_function_routing | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_function_routing | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_insights_cache | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_models | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_models | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_models | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_providers | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_providers | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_providers | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_routing_decisions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_routing_decisions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_routing_decisions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_usage_events | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_usage_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_usage_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_usage_logs | authenticated | REFERENCES, SELECT, TRIGGER |
| public.ai_usage_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ai_usage_quotas | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ai_usage_quotas | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ai_usage_quotas | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.analytics_events | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.analytics_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.analytics_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.anon_catalog_grant_audit_log | authenticated | SELECT |
| public.anon_catalog_grant_audit_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.anon_insert_rate | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.art_file_attachments | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.art_file_attachments | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.art_file_attachments | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.asia_image_import_queue | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.asia_image_import_queue | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.asia_image_import_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.asia_upload_mapping | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.asia_upload_mapping | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.asia_upload_mapping | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.attribute_definitions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.attribute_definitions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.attribute_definitions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.attribute_equivalences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.attribute_equivalences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.attribute_equivalences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.attribute_groups | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.attribute_groups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.attribute_groups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log | authenticated | INSERT, SELECT |
| public.audit_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_gravacao | anon | INSERT, REFERENCES, TRIGGER |
| public.audit_log_gravacao | authenticated | INSERT, REFERENCES, SELECT, TRIGGER |
| public.audit_log_gravacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auto_tag_rules | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.auto_tag_rules | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.auto_tag_rules | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.b2b_collection_products | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.b2b_collection_products | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.b2b_collection_products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.b2b_collections | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.b2b_collections | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.b2b_collections | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.backup_produto_ramo_atividade_20260625 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bi_quotes_summary | authenticated | SELECT |
| public.bi_quotes_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.binding_colors | anon | REFERENCES, TRIGGER |
| public.binding_colors | authenticated | REFERENCES, SELECT, TRIGGER |
| public.binding_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.binding_types | anon | REFERENCES, TRIGGER |
| public.binding_types | authenticated | REFERENCES, SELECT, TRIGGER |
| public.binding_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bot_detection_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.bot_detection_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cart_templates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.cart_templates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.cart_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalog_analytics | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.catalog_analytics | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.catalog_analytics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.categories | anon | SELECT |
| public.categories | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.categories | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.categories_tree_visual | authenticated | SELECT |
| public.categories_tree_visual | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_accessory_categories | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_accessory_categories | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_accessory_categories | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_ancestors | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_ancestors | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_ancestors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_attributes | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_attributes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_colors | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_colors | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_commemorative_dates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_commemorative_dates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_copywriting_config | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_copywriting_config | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_copywriting_config | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_icons | authenticated | SELECT |
| public.category_icons | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_relationships | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_relationships | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_relationships | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_target_audiences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_target_audiences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_target_audiences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.category_variation_types | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.category_variation_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.category_variation_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cf_recon_inflight | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.city_whitelist | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.city_whitelist | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.classify_functions_registry | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.classify_functions_registry | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.classify_functions_registry | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnpj_backfill_audit | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.cnpj_backfill_audit | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.cnpj_backfill_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.collection_item_reactions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.collection_item_reactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.collection_item_reactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.collection_items | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.collection_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.collection_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.collection_items_trash | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.collection_items_trash | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.collection_items_trash | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.collection_products | anon | SELECT |
| public.collection_products | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.collection_products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.collections | anon | SELECT |
| public.collections | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.collections | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.color_equivalences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_equivalences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.color_groups | anon | SELECT |
| public.color_groups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_groups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.color_nuances | anon | SELECT |
| public.color_nuances | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_nuances | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.color_synonym_map | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_synonym_map | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_synonym_map | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.color_variations | anon | SELECT |
| public.color_variations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.color_variations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.commemorative_date_colors | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.commemorative_date_colors | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.commemorative_date_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.commemorative_date_exclusions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.commemorative_date_exclusions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.commemorative_date_exclusions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.commemorative_dates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.commemorative_dates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.companies | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.companies | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.company_email_patterns | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.company_email_patterns | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.company_email_patterns | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comparison_reactions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.comparison_reactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.comparison_reactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.component_media | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.component_media | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.component_media | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.connection_test_history | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.connection_test_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.connection_test_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.content_articles | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.content_articles | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.content_articles | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conversation_audit_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.conversation_audit_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conversation_delivery_status | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.conversation_delivery_status | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.conversation_delivery_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conversation_event_history | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.conversation_event_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.conversation_event_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cover_finishes | anon | REFERENCES, TRIGGER |
| public.cover_finishes | authenticated | REFERENCES, SELECT, TRIGGER |
| public.cover_finishes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cover_materials | anon | REFERENCES, TRIGGER |
| public.cover_materials | authenticated | REFERENCES, SELECT, TRIGGER |
| public.cover_materials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cover_types | anon | REFERENCES, TRIGGER |
| public.cover_types | authenticated | REFERENCES, SELECT, TRIGGER |
| public.cover_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.crm_callback_events | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.crm_callback_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.crm_callback_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cron_job_timeout_map | anon | REFERENCES, TRIGGER |
| public.cron_job_timeout_map | authenticated | REFERENCES, TRIGGER |
| public.cron_job_timeout_map | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cron_watchdog_log | anon | REFERENCES, TRIGGER |
| public.cron_watchdog_log | authenticated | REFERENCES, TRIGGER |
| public.cron_watchdog_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.custom_kits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.custom_kits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.custom_kits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dashboard_insights_cache | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.dashboard_insights_cache | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.dashboard_insights_cache | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.db_connection_snapshots | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.db_connection_snapshots | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.device_login_notifications | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.device_login_notifications | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.discount_approval_audit | authenticated | SELECT |
| public.discount_approval_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.discount_approval_requests | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.discount_approval_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.e2e_cleanup_audit | authenticated | SELECT |
| public.e2e_cleanup_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.e2e_cleanup_rate_limit | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.e2e_cleanup_rate_limit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eco_backfill_log_20260625 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.eco_backfill_log_20260625 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.eco_backfill_log_20260625 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eco_date_reconcile_log_20260626 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.eco_date_reconcile_log_20260626 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.eco_date_reconcile_log_20260626 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eco_material_config | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.eco_material_config | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.eco_material_config | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.edge_function_invocations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.edge_function_invocations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.edge_function_invocations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.edge_rate_limits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.edge_rate_limits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.edge_rate_limits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.enriched_contacts | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.enriched_contacts | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.enriched_contacts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.enrichment_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.enrichment_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.enrichment_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.expert_conversations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.expert_conversations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.expert_conversations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.expert_messages | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.expert_messages | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.expert_messages | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.external_connections | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.external_connections | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.external_connections_sync_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.external_connections_sync_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.external_connections_sync_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.favorite_item_reactions | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_item_reactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_item_reactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.favorite_items | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.favorite_items_trash | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.favorite_items_trash | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_items_trash | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.favorite_lists | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_lists | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.favorite_lists | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feminine_color_config | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.feminine_color_config | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.feminine_color_config | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.file_scan_logs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.file_scan_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.file_scan_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.follow_up_reminders | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.follow_up_reminders | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.follow_up_reminders | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.frontend_telemetry | anon | INSERT |
| public.frontend_telemetry | authenticated | INSERT, SELECT |
| public.frontend_telemetry | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.generated_mockups | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.generated_mockups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.generated_mockups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_allowed_countries | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.geo_allowed_countries | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.geo_allowed_countries | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.hardening_health_snapshots | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.hardening_health_snapshots | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.hardening_health_snapshots | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.image_backfill_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.image_types | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.image_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.image_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.import_pipeline_steps | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.import_pipeline_steps | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.import_pipeline_steps | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.inbound_webhook_endpoints | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.inbound_webhook_endpoints | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.inbound_webhook_endpoints | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.inbound_webhook_events | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.inbound_webhook_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.inbound_webhook_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.included_packaging_print_areas | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.included_packaging_print_areas | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.included_packaging_print_areas | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.included_packaging_techniques | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.included_packaging_techniques | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.included_packaging_techniques | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ingestion_run_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ingestion_run_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ingestion_run_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integration_credentials | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.integration_credentials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ip_access_control | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ip_access_control | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ip_whitelist | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ip_whitelist | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kill_switch_hits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kill_switch_hits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kill_switch_hits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_collaborators | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_collaborators | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_collaborators | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_comments | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_comments | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_comments | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_enrichment_raw | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_component_enrichment_raw | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_enrichment_raw | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_ficha_staging | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_component_ficha_staging | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_ficha_staging | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_padronizacao | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_component_padronizacao | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_padronizacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_print_areas | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_print_areas | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_component_variant_skus | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_component_variant_skus | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_component_variant_skus | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_ficha_session_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_ficha_session_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_ficha_session_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_quote_requests | anon | REFERENCES, TRIGGER |
| public.kit_quote_requests | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_quote_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_save_requests | anon | REFERENCES, TRIGGER |
| public.kit_save_requests | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_save_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_share_tokens | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_share_tokens | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_share_tokens | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_templates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.kit_templates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_typical_dims | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_typical_dims | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_typical_dims | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.kit_variants | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.kit_variants | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_attempts | anon | REFERENCES, TRIGGER |
| public.login_attempts | authenticated | REFERENCES, SELECT, TRIGGER |
| public.login_attempts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_duplicate_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_reactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_public_reactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_public_view_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_07 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_08 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_09 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_10 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_11 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2026_12 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2027_01 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_2027_02 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_public_view_events_default | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_reader_state | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_reader_state | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_templates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_templates_catalog | authenticated | REFERENCES, SELECT, TRIGGER |
| public.magazine_templates_catalog | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazine_view_rollup_watermark | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magazine_view_rollup_watermark | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazine_view_rollup_watermark | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magazines | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magazines | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_brand_kits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_brand_kits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_brand_kits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_campaigns | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_campaigns | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_campaigns | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_comments | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_comments | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_comments | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_generations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_generations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_generations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_public_shares | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_public_shares | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_public_shares | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.magic_up_reactions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.magic_up_reactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.magic_up_reactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.markup_configurations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.markup_configurations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.markup_configurations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.material_equivalences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.material_equivalences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.material_equivalences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.material_groups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.material_groups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.material_reconcile_log_20260626 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.material_reconcile_log_20260626 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.material_reconcile_log_20260626 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.material_types | anon | SELECT |
| public.material_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.material_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.material_variations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.material_variations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.materials_complete | authenticated | SELECT |
| public.materials_complete | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_access_violations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mcp_access_violations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_api_keys | authenticated | REFERENCES, SELECT, TRIGGER |
| public.mcp_api_keys | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_full_grantors | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mcp_full_grantors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_key_auto_revocations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mcp_key_auto_revocations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_kv | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mcp_sessions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medallion_coverage_snapshots | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.medallion_coverage_snapshots | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.medallion_coverage_snapshots | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_approval_links | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_approval_links | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_credit_transactions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_credit_transactions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_credit_transactions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_credits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_credits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_credits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_drafts | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_drafts | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_drafts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_generation_jobs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_generation_jobs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_generation_jobs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_prompt_configs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_prompt_configs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_prompt_configs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_prompt_history | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_prompt_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_prompt_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mockup_templates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.mockup_templates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.mockup_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_material_group_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_media_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_product_cards | authenticated | SELECT |
| public.mv_product_cards | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_product_compositions | anon | SELECT |
| public.mv_product_compositions | authenticated | SELECT |
| public.mv_product_compositions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_product_intelligence | authenticated | SELECT |
| public.mv_product_intelligence | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.mv_stock_velocity | authenticated | SELECT |
| public.mv_stock_velocity | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.navigation_analytics | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.navigation_analytics | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.navigation_analytics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ncm_codes | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ncm_codes | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ncm_codes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notebook_features | anon | REFERENCES, TRIGGER |
| public.notebook_features | authenticated | REFERENCES, SELECT, TRIGGER |
| public.notebook_features | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notification_preferences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.notification_preferences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.notification_preferences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notification_templates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.notification_templates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.notification_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notifications | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.notifications | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.notifications | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ops_grant_audit | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ops_grant_audit | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ops_grant_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.optimization_queue | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.optimization_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.optimization_queue_runs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.optimization_queue_runs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.optimization_queue_runs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.order_item_personalizations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.order_item_personalizations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.order_item_personalizations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.order_items | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.order_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.order_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.orders | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.orders | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.orders | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.organization_members | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.organization_members | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.organization_members | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.organizations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.organizations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.organizations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.outbound_webhooks | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.outbound_webhooks | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ownership_audit_reports | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ownership_audit_reports | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ownership_audit_reports | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ownership_repair_logs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.ownership_repair_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ownership_repair_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.packaging_compatibility_config | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.packaging_compatibility_config | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.packaging_compatibility_config | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.packaging_types | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.packaging_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.packaging_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.packagings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.packagings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.packagings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paper_colors | anon | REFERENCES, TRIGGER |
| public.paper_colors | authenticated | REFERENCES, SELECT, TRIGGER |
| public.paper_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paper_formats | anon | REFERENCES, TRIGGER |
| public.paper_formats | authenticated | REFERENCES, SELECT, TRIGGER |
| public.paper_formats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paper_rulings | anon | REFERENCES, TRIGGER |
| public.paper_rulings | authenticated | REFERENCES, SELECT, TRIGGER |
| public.paper_rulings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paper_weights | anon | REFERENCES, TRIGGER |
| public.paper_weights | authenticated | REFERENCES, SELECT, TRIGGER |
| public.paper_weights | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_requests | anon | REFERENCES, TRIGGER |
| public.password_reset_requests | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.password_reset_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.permissions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.permissions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personalization_simulations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.personalization_simulations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personalization_technique_mappings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.personalization_technique_mappings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.personalization_technique_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personalization_techniques | anon | SELECT |
| public.personalization_techniques | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.personalization_techniques | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pipeline_control | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.pipeline_control | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.pipeline_control | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pipeline_health_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.pipeline_health_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.pipeline_health_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pipeline_known_issues | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.pipeline_known_issues | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.pipeline_known_issues | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pipeline_run_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.pipeline_run_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.pipeline_run_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.price_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.price_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.print_area_techniques | anon | SELECT |
| public.print_area_techniques | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.print_area_techniques | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_ai_content | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_ai_content | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_ai_content | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_ai_history | anon | REFERENCES, TRIGGER |
| public.product_ai_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_ai_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_attributes | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_attributes | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_attributes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_badge_definitions | anon | REFERENCES, SELECT, TRIGGER |
| public.product_badge_definitions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_badge_definitions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_category_assignments | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_category_assignments | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_commemorative_dates | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_commemorative_dates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_component_location_techniques | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_component_location_techniques | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_component_locations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_component_locations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_component_locations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_components | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_components | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_components | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_customization_prices | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_customization_prices | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_customization_prices | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_deactivation_requests | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_deactivation_requests | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_deactivation_tokens | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_faqs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_faqs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_faqs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_fiscal | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_fiscal | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_fiscal | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_group_components | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_group_components | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_group_location_techniques | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_group_location_techniques | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_group_locations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_group_locations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_group_members | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_group_members | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_groups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_groups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_images | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_included_packagings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_included_packagings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_included_packagings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_kit_components | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_kit_components | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_materials | anon | SELECT |
| public.product_materials | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_materials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_notebook_features | anon | REFERENCES, TRIGGER |
| public.product_notebook_features | authenticated | REFERENCES, SELECT, TRIGGER |
| public.product_notebook_features | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_notebook_specs | anon | REFERENCES, TRIGGER |
| public.product_notebook_specs | authenticated | REFERENCES, SELECT, TRIGGER |
| public.product_notebook_specs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_novelties | anon | SELECT |
| public.product_novelties | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_novelties | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_packaging | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_packaging | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_packaging | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_packaging_compatibility | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_packaging_compatibility | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_packaging_compatibility | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_packagings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_packagings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_packagings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_physical | anon | SELECT |
| public.product_physical | authenticated | SELECT |
| public.product_physical | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_price_freshness_overrides | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_price_freshness_overrides | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_price_freshness_overrides | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_print_positions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_print_positions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_print_positions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_properties | anon | SELECT |
| public.product_properties | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_properties | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_qa_image_alerts | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_qa_image_alerts | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_qa_image_alerts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_relationships | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_relationships | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_search_logs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_search_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_search_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_seo | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_seo | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_seo | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_similarity_group_members | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_similarity_group_members | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_similarity_group_members | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_similarity_groups | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_similarity_groups | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_similarity_groups | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_supply | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_supply | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_supply | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_sync_logs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_sync_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_sync_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_tags | anon | SELECT |
| public.product_tags | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_tags | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_target_audiences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_target_audiences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_target_audiences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_variants | anon | SELECT |
| public.product_variants | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.product_variants | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_videos | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_videos | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.product_views | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.product_views | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.product_views | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.products | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.products_with_materials | authenticated | SELECT |
| public.products_with_materials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.produto_ramo_atividade | anon | SELECT |
| public.produto_ramo_atividade | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.produto_ramo_atividade | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.produtos_padronizacao | authenticated | SELECT |
| public.produtos_padronizacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.produtos_padronizacao_variantes | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.produtos_padronizacao_variantes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.produtos_site_padronizacao | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.produtos_site_padronizacao | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.produtos_site_padronizacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.profiles | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.profiles | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.property_definitions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.property_definitions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.property_definitions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.public_token_failures | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.public_token_failures | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.public_token_failures | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.push_subscriptions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.push_subscriptions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.push_subscriptions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.qa_image_coverage_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.qa_image_coverage_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.qa_image_coverage_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.query_telemetry | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.query_telemetry | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.query_telemetry | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_approval_tokens | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_approval_tokens | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_drafts | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_drafts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_history | authenticated | INSERT, SELECT |
| public.quote_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_item_personalizations | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_item_personalizations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_items | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_templates | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_templates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quote_versions | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quote_versions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.quotes | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.quotes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ramo_atividade | anon | SELECT |
| public.ramo_atividade | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ramo_atividade | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ramo_atividade_filho | anon | SELECT |
| public.ramo_atividade_filho | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.ramo_atividade_filho | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recently_viewed_products | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.recently_viewed_products | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.recently_viewed_products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.request_rate_limits | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.request_rate_limits | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.request_rate_limits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rls_denial_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.rls_denial_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.rls_denial_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_migration_batches | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.role_migration_batches | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.role_migration_batches | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_migration_items | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.role_migration_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.role_migration_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_permissions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.role_permissions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.role_permissions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.roles | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.roles | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sales_goals | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.sales_goals | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.saved_filters | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.saved_filters | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.saved_filters | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.saved_trends_views | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.saved_trends_views | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.saved_trends_views | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.scheduled_reports | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.scheduled_reports | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.scheduled_reports | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.schema_drift_allowlist | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.schema_drift_allowlist | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.schema_drift_allowlist | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.schema_drift_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.schema_drift_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.schema_drift_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.schema_signature_baseline | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.schema_signature_baseline | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.schema_signature_baseline | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.schema_signature_drift_allowlist | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.schema_signature_drift_allowlist | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.schema_signature_drift_allowlist | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.schema_signature_drift_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.schema_signature_drift_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.schema_signature_drift_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.search_analytics | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.search_analytics | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.search_analytics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.search_queries | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.search_queries | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.search_queries | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.secret_rotation_log | authenticated | REFERENCES, SELECT, TRIGGER |
| public.secret_rotation_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.security_settings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.security_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seller_cart_items | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.seller_cart_items | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.seller_cart_items | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seller_carts | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.seller_carts | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.seller_carts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seller_discount_limits | authenticated | DELETE, INSERT, SELECT, UPDATE |
| public.seller_discount_limits | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seo_audit_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.seo_audit_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seo_redirects | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.seo_redirects | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.seo_redirects | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.simulator_wizard_drafts | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.simulator_wizard_drafts | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.simulator_wizard_drafts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sm_category_pages | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.sm_category_pages | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.sm_category_pages | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sm_site_url_map | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.sm_site_url_map | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.sm_site_url_map | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sm_worker_partitions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.sm_worker_partitions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.sm_worker_partitions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.smoke_test_runs | authenticated | SELECT |
| public.smoke_test_runs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.somarcas_catalogo_publico | authenticated | SELECT |
| public.somarcas_catalogo_publico | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.spot_health_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.spot_health_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.spot_health_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.spot_typecode_map | anon | REFERENCES, SELECT, TRIGGER |
| public.spot_typecode_map | authenticated | REFERENCES, SELECT, TRIGGER |
| public.spot_typecode_map | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.step_up_audit_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.step_up_audit_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.step_up_challenges | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.step_up_challenges | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.step_up_tokens | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.step_up_tokens | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.stock_daily_summary | anon | REFERENCES, TRIGGER |
| public.stock_daily_summary | authenticated | REFERENCES, SELECT, TRIGGER |
| public.stock_daily_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.stock_notes | anon | REFERENCES, TRIGGER |
| public.stock_notes | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.stock_notes | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.stock_snapshots | anon | REFERENCES, TRIGGER |
| public.stock_snapshots | authenticated | REFERENCES, SELECT, TRIGGER |
| public.stock_snapshots | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_attribute_definitions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_attribute_definitions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_branches | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_branches | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_categories | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_categories | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_categories | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_category_mappings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_category_mappings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_category_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_colors | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_customization_options_raw | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_customization_options_raw | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_customization_options_raw | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_customization_raw | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_field_mappings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_field_mappings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_field_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_field_priority | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_field_priority | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_field_priority | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_import_batches | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_import_batches | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_import_batches | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_materials | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_materials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_packagings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_packagings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_packagings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw | authenticated | SELECT |
| public.supplier_products_raw | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history | authenticated | SELECT |
| public.supplier_products_raw_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2026_08 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_08 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_08 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2026_09 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_09 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_09 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2026_10 | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_10 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_10 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2026_11 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2026_11 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_11 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2026_12 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2026_12 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2026_12 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_01 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_01 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_01 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_02 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_02 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_02 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_03 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_03 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_03 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_04 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_04 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_04 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_05 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_05 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_05 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_06 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_06 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_06 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_07 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_07 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_07 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_08 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_08 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_08 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_09 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_09 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_09 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_10 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_10 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_10 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_11 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_11 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_11 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_products_raw_history_p2027_12 | anon | REFERENCES, TRIGGER |
| public.supplier_products_raw_history_p2027_12 | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_products_raw_history_p2027_12 | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_property_mappings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_property_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_replenishment_events | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_replenishment_events | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_settings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_settings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_sub_brands | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_sub_brands | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_sub_brands | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_subtype_category_map | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_subtype_category_map | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_subtype_category_map | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_unit_conversions | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_unit_conversions | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_unit_conversions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_value_mappings | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_value_mappings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_value_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.supplier_video_requirements | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.supplier_video_requirements | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.supplier_video_requirements | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.suppliers | authenticated | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.suppliers | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.system_changelog | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.system_changelog | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.system_changelog | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.system_documentation | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.system_documentation | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.system_documentation | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.system_kill_switches | anon | SELECT |
| public.system_kill_switches | authenticated | SELECT |
| public.system_kill_switches | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.system_settings | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.system_settings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.system_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tabela_preco_gravacao_oficial | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.tabela_preco_gravacao_oficial | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tabela_preco_gravacao_oficial_faixa | anon | SELECT |
| public.tabela_preco_gravacao_oficial_faixa | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.tabela_preco_gravacao_oficial_faixa | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tags | anon | SELECT |
| public.tags | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.tags | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.target_audiences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.target_audiences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.target_audiences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tecnicas_gravacao | anon | SELECT |
| public.tecnicas_gravacao | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.tecnicas_gravacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_2fa_settings | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_2fa_settings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_allowed_ips | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_allowed_ips | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_comparisons | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_comparisons | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_comparisons | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_favorites | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_favorites | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_favorites | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_filter_presets | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_filter_presets | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_filter_presets | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_ip_allowlist | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_ip_allowlist | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_ip_allowlist | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_known_devices | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_known_devices | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_known_devices | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_notification_preferences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_notification_preferences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_notification_preferences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_onboarding | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_onboarding | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_onboarding | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_organizations | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_organizations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_organizations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_preferences | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_preferences | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_preferences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_roles | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_roles | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_search_history | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.user_search_history | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_search_history | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_token_revocations | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.user_token_revocations | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ai_function_routing_effective | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_cobertura_tecnicas | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_paradoxos_gravacao | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_blurhash_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_blurhash_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_catalog_stats | authenticated | SELECT |
| public.v_catalog_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_category_keywords | authenticated | SELECT |
| public.v_category_keywords | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_cf_drift_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_cf_image_remediation | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_cf_recon_progress | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_color_coverage_monitor | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_color_nuances_public | anon | SELECT |
| public.v_color_nuances_public | authenticated | SELECT |
| public.v_color_nuances_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_commemorative_dates_calendar | authenticated | SELECT |
| public.v_commemorative_dates_calendar | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_commemorative_dates_with_colors | authenticated | SELECT |
| public.v_commemorative_dates_with_colors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_connection_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_crm_callback_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_db_health_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_db_health_check | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_dimensions_source_divergence | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_enrichment_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_gravacao_cobertura | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_image_quality_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kill_switch_hits_summary | authenticated | SELECT |
| public.v_kill_switch_hits_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_completeness_by_supplier | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_complete | authenticated | SELECT |
| public.v_kit_component_complete | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_completeness | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_identity_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_media_public | anon | SELECT |
| public.v_kit_component_media_public | authenticated | SELECT |
| public.v_kit_component_media_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_print_areas_public | anon | SELECT |
| public.v_kit_component_print_areas_public | authenticated | SELECT |
| public.v_kit_component_print_areas_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_component_skus | authenticated | SELECT |
| public.v_kit_component_skus | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_enrichment_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_ficha_pipeline_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_max_quantity | authenticated | SELECT |
| public.v_kit_max_quantity | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_pipeline_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_kit_with_components | authenticated | SELECT |
| public.v_kit_with_components | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_media_statistics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_media_stats | authenticated | SELECT |
| public.v_media_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_monthly_costs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_my_markup_config | authenticated | SELECT |
| public.v_my_markup_config | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_needs_enrichment | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_performance_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_personalization_techniques_public | anon | SELECT |
| public.v_personalization_techniques_public | authenticated | SELECT |
| public.v_personalization_techniques_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_pipeline_next_step | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_pipeline_progress | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_price_history_safe | authenticated | SELECT |
| public.v_price_history_safe | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_print_area_techniques_public | anon | SELECT |
| public.v_print_area_techniques_public | authenticated | SELECT |
| public.v_print_area_techniques_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_active_badge | authenticated | SELECT |
| public.v_product_active_badge | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_compositions_public | anon | SELECT |
| public.v_product_compositions_public | authenticated | SELECT |
| public.v_product_compositions_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_image_hash_duplicates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_images_cdn | authenticated | SELECT |
| public.v_product_images_cdn | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_images_quality_gap | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_properties_public | anon | SELECT |
| public.v_product_properties_public | authenticated | SELECT |
| public.v_product_properties_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_tags_public | anon | SELECT |
| public.v_product_tags_public | authenticated | SELECT |
| public.v_product_tags_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_tokens | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_videos_cdn | authenticated | SELECT |
| public.v_product_videos_cdn | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_product_videos_ready | authenticated | SELECT |
| public.v_product_videos_ready | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_ai_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_complete | authenticated | SELECT |
| public.v_products_complete | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_dimensions_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_images_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_kit_builder | authenticated | SELECT |
| public.v_products_kit_builder | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_missing_primary_image | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_name_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_pending_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_public | anon | SELECT |
| public.v_products_public | authenticated | SELECT |
| public.v_products_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_public_test | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_with_tags | authenticated | SELECT |
| public.v_products_with_tags | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_without_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_products_without_video | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_quote_seller_kpis | authenticated | SELECT |
| public.v_quote_seller_kpis | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_site_products_public | anon | SELECT |
| public.v_site_products_public | authenticated | SELECT |
| public.v_site_products_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_slow_queries_analysis | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_smoke_tests_latest_run | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_smoke_tests_trend | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_stock_velocity_safe | authenticated | SELECT |
| public.v_stock_velocity_safe | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_super_filtro_options | authenticated | SELECT |
| public.v_super_filtro_options | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_suppliers_public | anon | SELECT |
| public.v_suppliers_public | authenticated | SELECT |
| public.v_suppliers_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_system_alerts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_system_health_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_tabela_preco_gravacao_oficial_public | anon | SELECT |
| public.v_tabela_preco_gravacao_oficial_public | authenticated | SELECT |
| public.v_tabela_preco_gravacao_oficial_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_tags_public | anon | SELECT |
| public.v_tags_public | authenticated | SELECT |
| public.v_tags_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_top_patterns | authenticated | SELECT |
| public.v_top_patterns | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_unmapped_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_variant_sale_prices_public | anon | SELECT |
| public.v_variant_sale_prices_public | authenticated | SELECT |
| public.v_variant_sale_prices_public | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_variants_with_commemorative_dates | authenticated | SELECT |
| public.v_variants_with_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_video_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_video_validation_recent | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_videos_pending | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_videos_with_urls | authenticated | SELECT |
| public.v_videos_with_urls | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_webhook_delivery_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_xbz_ficha_parse_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.variant_commemorative_dates | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.variant_commemorative_dates | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.variant_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.variant_supplier_sources | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.variant_supplier_sources | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.variation_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.variation_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.variation_values | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.variation_values | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.video_import_queue | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.video_import_queue | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_import_queue | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.video_sim_results | anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_sim_results | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_sim_results | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.video_types | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.video_types | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.video_validation_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.video_validation_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_validation_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.video_variant_links | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.video_variant_links | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.video_variant_links | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.visual_search_feedback | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.visual_search_feedback | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.visual_search_feedback | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.voice_command_logs | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.voice_command_logs | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.voice_command_logs | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_active_products_missing_gold_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_ai_enrichment_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_ai_history_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_by_category | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_by_color | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_by_tag | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_errors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_low_stock | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_pending | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_promo | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_asia_products_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_accessories | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_completeness | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_mapping_gaps | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_target_audiences | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_category_variation_types | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_classify_functions_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_color_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_color_mapping | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_component_types_usage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_duplicate_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_image_type_coherence | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_image_type_dropblockers | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_images_pending_dimensions | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_material_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_medallion_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_media_stats_by_type | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_novelties_home_highlights | authenticated | SELECT |
| public.vw_novelties_home_highlights | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_novelty_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_orphan_active_variants | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_packaging_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_packaging_suppliers | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_packagings_catalog | authenticated | SELECT |
| public.vw_packagings_catalog | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_all_packaging_options | authenticated | SELECT |
| public.vw_product_all_packaging_options | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_availability | authenticated | SELECT |
| public.vw_product_availability | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_color_category_links | authenticated | SELECT |
| public.vw_product_color_category_links | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_commemorative_dates | authenticated | SELECT |
| public.vw_product_commemorative_dates | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_images_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_images_variant_gap | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_notebook_complete | authenticated | SELECT |
| public.vw_product_notebook_complete | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_novelties_active | authenticated | SELECT |
| public.vw_product_novelties_active | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_product_packaging_options | authenticated | SELECT |
| public.vw_product_packaging_options | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_ai_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_by_date | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_by_property_category | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_commercial_packing | authenticated | SELECT |
| public.vw_products_commercial_packing | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_min_quantity | authenticated | SELECT |
| public.vw_products_min_quantity | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_packaging_info | authenticated | SELECT |
| public.vw_products_packaging_info | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_pending_variants | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_seo_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_thermal_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_products_with_properties | authenticated | SELECT |
| public.vw_products_with_properties | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_produtos_sem_ncm | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_property_statistics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_qa_products_missing_images | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_rupture_confidence_audit | authenticated | SELECT |
| public.vw_rupture_confidence_audit | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_rupture_gap_purchase | authenticated | SELECT |
| public.vw_rupture_gap_purchase | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_rupture_live_divergence | authenticated | SELECT |
| public.vw_rupture_live_divergence | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_seo_dashboard | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_sitemap_all | authenticated | SELECT |
| public.vw_sitemap_all | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_sitemap_categories | authenticated | SELECT |
| public.vw_sitemap_categories | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_sitemap_products | authenticated | SELECT |
| public.vw_sitemap_products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_somarcas_materials | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_somarcas_pending | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_somarcas_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_somarcas_sync_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_source_channel_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_spot_cf_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_spot_color_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_spot_color_separator_reference | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_spot_image_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_spot_price_alerts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_stock_quantity_outliers | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_super_filtro_health | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_category_coverage | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_color_mappings | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_field_mappings_summary | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_mapping_statistics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_products_raw_errors | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_supplier_products_raw_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_system_health_quick | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_thermal_products | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_variant_sale_prices | authenticated | SELECT |
| public.vw_variant_sale_prices | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_xbz_products_by_category | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_xbz_products_by_color | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_xbz_products_stats | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_xbz_produtos_sem_imagem | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_xbz_scraping_status | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_deliveries | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.webhook_deliveries | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.webhook_deliveries | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_delivery_locks | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.webhook_delivery_locks | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.webhook_delivery_locks | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_delivery_metrics | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.webhook_delivery_metrics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_dispatcher_log | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.webhook_dispatcher_log | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.webhook_dispatcher_log | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_outbox | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.webhook_outbox | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.webhook_outbox | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_request_nonces | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workspace_notifications | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.workspace_notifications | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.xbz_gallery_staging | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.xbz_gallery_staging | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.xbz_upload_mapping | anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| public.xbz_upload_mapping | authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.xbz_upload_mapping | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.bucket_lifecycle_states | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_analytics | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_vectors | anon | SELECT |
| storage.buckets_vectors | authenticated | SELECT |
| storage.buckets_vectors | service_role | SELECT |
| storage.lifecycle_abandoned_artifacts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.objects | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads | anon | SELECT |
| storage.s3_multipart_uploads | authenticated | SELECT |
| storage.s3_multipart_uploads | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads_parts | anon | SELECT |
| storage.s3_multipart_uploads_parts | authenticated | SELECT |
| storage.s3_multipart_uploads_parts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.vector_indexes | anon | SELECT |
| storage.vector_indexes | authenticated | SELECT |
| storage.vector_indexes | service_role | SELECT |
| supplier_stricker.canceled_products | authenticated | SELECT |
| supplier_stricker.canceled_products | service_role | SELECT |
| supplier_stricker.category_mappings | authenticated | SELECT |
| supplier_stricker.colors | authenticated | SELECT |
| supplier_stricker.colors | service_role | SELECT |
| supplier_stricker.customization_options | authenticated | SELECT |
| supplier_stricker.customization_options | service_role | SELECT |
| supplier_stricker.customization_tables | authenticated | SELECT |
| supplier_stricker.customization_tables | service_role | SELECT |
| supplier_stricker.optionals | authenticated | SELECT |
| supplier_stricker.optionals | service_role | SELECT |
| supplier_stricker.product_types | authenticated | SELECT |
| supplier_stricker.product_types | service_role | SELECT |
| supplier_stricker.products | authenticated | SELECT |
| supplier_stricker.products | service_role | SELECT |
| supplier_stricker.stg_optionals | authenticated | SELECT |
| supplier_stricker.stg_products | authenticated | SELECT |
| supplier_stricker.stg_stock | authenticated | SELECT |
| supplier_stricker.stocks | authenticated | SELECT |
| supplier_stricker.stocks | service_role | SELECT |
| supplier_stricker.sync_log | authenticated | SELECT |
| supplier_stricker.sync_log | service_role | SELECT |
| supplier_stricker.v_customization_by_technique | authenticated | SELECT |
| supplier_stricker.v_customization_by_technique | service_role | SELECT |
| supplier_stricker.v_images_by_product | authenticated | SELECT |
| supplier_stricker.v_images_by_product | service_role | SELECT |
| supplier_stricker.v_products_complete | authenticated | SELECT |
| supplier_stricker.v_products_complete | service_role | SELECT |
| supplier_stricker.v_stock_by_product | authenticated | SELECT |
| supplier_stricker.v_stock_by_product | service_role | SELECT |


## Colunas (grants parciais)

| coluna | role | privilégios |
|---|---|---|
| public.kit_component_print_areas.id | anon | SELECT |
| public.kit_component_print_areas.is_active | anon | SELECT |
| public.kit_component_print_areas.is_curved | anon | SELECT |
| public.kit_component_print_areas.kit_component_id | anon | SELECT |
| public.kit_component_print_areas.location_code | anon | SELECT |
| public.kit_component_print_areas.location_name | anon | SELECT |
| public.kit_component_print_areas.location_order | anon | SELECT |
| public.kit_component_print_areas.max_height | anon | SELECT |
| public.kit_component_print_areas.max_width | anon | SELECT |
| public.kit_component_print_areas.shape | anon | SELECT |
| public.kit_component_print_areas.technique_order | anon | SELECT |
| public.product_kit_components.id | anon | SELECT |
| public.product_kit_components.kit_product_id | anon | SELECT |
| public.products.id | anon | SELECT |
| public.products.is_active | anon | SELECT |
| public.products.is_deleted | anon | SELECT |
| public.suppliers.active | authenticated | SELECT |
| public.suppliers.address | authenticated | SELECT |
| public.suppliers.api_base_url | authenticated | SELECT |
| public.suppliers.api_rate_limit_per_hour | authenticated | SELECT |
| public.suppliers.api_requests_current_hour | authenticated | SELECT |
| public.suppliers.api_requests_reset_at | authenticated | SELECT |
| public.suppliers.api_type | authenticated | SELECT |
| public.suppliers.cnpj | authenticated | SELECT |
| public.suppliers.code | authenticated | SELECT |
| public.suppliers.contact_name | authenticated | SELECT |
| public.suppliers.contact_person | authenticated | SELECT |
| public.suppliers.created_at | authenticated | SELECT |
| public.suppliers.default_markup_percent | authenticated | SELECT |
| public.suppliers.delivery_time_days | authenticated | SELECT |
| public.suppliers.email | authenticated | SELECT |
| public.suppliers.id | authenticated | SELECT |
| public.suppliers.inscricao_estadual | authenticated | SELECT |
| public.suppliers.is_engraving_supplier | authenticated | SELECT |
| public.suppliers.is_product_supplier | authenticated | SELECT |
| public.suppliers.last_full_sync_at | authenticated | SELECT |
| public.suppliers.last_sync_error | authenticated | SELECT |
| public.suppliers.last_sync_status | authenticated | SELECT |
| public.suppliers.logo_url | authenticated | SELECT |
| public.suppliers.low_stock_threshold | authenticated | SELECT |
| public.suppliers.min_order_value | authenticated | SELECT |
| public.suppliers.minimum_order_value | authenticated | SELECT |
| public.suppliers.name | authenticated | SELECT |
| public.suppliers.notes | authenticated | SELECT |
| public.suppliers.organization_id | authenticated | SELECT |
| public.suppliers.payment_terms | authenticated | SELECT |
| public.suppliers.phone | authenticated | SELECT |
| public.suppliers.phone2 | authenticated | SELECT |
| public.suppliers.priority | authenticated | SELECT |
| public.suppliers.shipping_terms | authenticated | SELECT |
| public.suppliers.state_uf | authenticated | SELECT |
| public.suppliers.sync_enabled | authenticated | SELECT |
| public.suppliers.sync_interval_minutes | authenticated | SELECT |
| public.suppliers.tax_regime | authenticated | SELECT |
| public.suppliers.trading_name | authenticated | SELECT |
| public.suppliers.updated_at | authenticated | SELECT |
| public.suppliers.website | authenticated | SELECT |


## Sequences (roles da API)

| sequence | role | privilégios |
|---|---|---|
| public._qa_pct_results_id_seq | anon | USAGE, SELECT, UPDATE |
| public._qa_pct_results_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public._qa_pct_results_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.anon_catalog_grant_audit_log_id_seq | anon | USAGE, SELECT, UPDATE |
| public.anon_catalog_grant_audit_log_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.anon_catalog_grant_audit_log_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.asia_upload_mapping_id_seq | anon | USAGE, SELECT, UPDATE |
| public.asia_upload_mapping_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.asia_upload_mapping_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.audit_log_gravacao_id_seq | anon | USAGE, SELECT, UPDATE |
| public.audit_log_gravacao_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.audit_log_gravacao_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.classify_functions_registry_id_seq | anon | USAGE, SELECT, UPDATE |
| public.classify_functions_registry_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.classify_functions_registry_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.cnpj_backfill_audit_id_seq | anon | USAGE, SELECT, UPDATE |
| public.cnpj_backfill_audit_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.cnpj_backfill_audit_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.cron_watchdog_log_id_seq | anon | USAGE, SELECT, UPDATE |
| public.cron_watchdog_log_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.cron_watchdog_log_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.db_connection_snapshots_id_seq | anon | USAGE, SELECT, UPDATE |
| public.db_connection_snapshots_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.db_connection_snapshots_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.eco_backfill_log_20260625_id_seq | anon | USAGE, SELECT, UPDATE |
| public.eco_backfill_log_20260625_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.eco_backfill_log_20260625_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.import_pipeline_steps_id_seq | anon | USAGE, SELECT, UPDATE |
| public.import_pipeline_steps_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.import_pipeline_steps_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.ingestion_run_log_id_seq | anon | USAGE, SELECT, UPDATE |
| public.ingestion_run_log_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.ingestion_run_log_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.kill_switch_hits_id_seq | anon | USAGE, SELECT, UPDATE |
| public.kill_switch_hits_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.kill_switch_hits_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.magazine_public_view_events_id_seq | anon | USAGE, SELECT, UPDATE |
| public.magazine_public_view_events_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.magazine_public_view_events_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.material_reconcile_log_20260626_id_seq | anon | USAGE, SELECT, UPDATE |
| public.material_reconcile_log_20260626_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.material_reconcile_log_20260626_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.medallion_coverage_snapshots_id_seq | anon | USAGE, SELECT, UPDATE |
| public.medallion_coverage_snapshots_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.medallion_coverage_snapshots_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.ops_grant_audit_id_seq | anon | USAGE, SELECT, UPDATE |
| public.ops_grant_audit_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.ops_grant_audit_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.pipeline_run_log_id_seq | anon | USAGE, SELECT, UPDATE |
| public.pipeline_run_log_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.pipeline_run_log_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.qa_image_coverage_log_id_seq | anon | USAGE, SELECT, UPDATE |
| public.qa_image_coverage_log_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.qa_image_coverage_log_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.schema_signature_drift_allowlist_id_seq | anon | USAGE, SELECT, UPDATE |
| public.schema_signature_drift_allowlist_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.schema_signature_drift_allowlist_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.sm_worker_partitions_id_seq | anon | USAGE, SELECT, UPDATE |
| public.sm_worker_partitions_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.sm_worker_partitions_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.stock_daily_summary_id_seq | anon | USAGE, SELECT, UPDATE |
| public.stock_daily_summary_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.stock_daily_summary_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.stock_snapshots_id_seq | anon | USAGE, SELECT, UPDATE |
| public.stock_snapshots_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.stock_snapshots_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.xbz_upload_mapping_id_seq | anon | USAGE, SELECT, UPDATE |
| public.xbz_upload_mapping_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.xbz_upload_mapping_id_seq | service_role | USAGE, SELECT, UPDATE |


## Default privileges (aplicam-se a objetos NOVOS)

| schema | owner | tipo | ACL |
|---|---|---|---|
| auth | supabase_auth_admin | functions | postgres=X/supabase_auth_admin, dashboard_user=X/supabase_auth_admin |
| auth | supabase_auth_admin | sequences | postgres=rwU/supabase_auth_admin, dashboard_user=rwU/supabase_auth_admin |
| auth | supabase_auth_admin | tables | postgres=arwdDxtm/supabase_auth_admin, dashboard_user=arwdDxtm/supabase_auth_admin |
| cron | supabase_admin | functions | postgres=X*/supabase_admin |
| cron | supabase_admin | sequences | postgres=r*w*U*/supabase_admin |
| cron | supabase_admin | tables | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| extensions | supabase_admin | functions | postgres=X*/supabase_admin |
| extensions | supabase_admin | sequences | postgres=r*w*U*/supabase_admin |
| extensions | supabase_admin | tables | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| graphql | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| graphql_public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql_public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql_public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| pgmq | postgres | sequences | pg_monitor=r/postgres |
| pgmq | postgres | tables | pg_monitor=r/postgres |
| public | postgres | functions | =X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| public | postgres | sequences | postgres=rwU/postgres, anon=rw/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| public | postgres | tables | postgres=arwdDxtm/postgres, anon=xtm/postgres, authenticated=arwdxtm/postgres, service_role=arwdDxtm/postgres |
| public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| realtime | supabase_admin | functions | postgres=X/supabase_admin, dashboard_user=X/supabase_admin |
| realtime | supabase_admin | sequences | postgres=rwU/supabase_admin, dashboard_user=rwU/supabase_admin |
| realtime | supabase_admin | tables | postgres=a*r*wdDxtm/supabase_admin, dashboard_user=arwdDxtm/supabase_admin |
| repack | supabase_admin | sequences | postgres=rwU/supabase_admin |
| repack | supabase_admin | tables | postgres=arwdDxtm/supabase_admin |
| storage | postgres | functions | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| storage | postgres | sequences | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| storage | postgres | tables | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
| supabase_functions | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| supabase_functions | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| supabase_functions | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
