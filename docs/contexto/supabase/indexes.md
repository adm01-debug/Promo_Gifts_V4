# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| analytics.categories_tree_visual | idx_tree_visual_id_unique | btree | id | sim | sim |  |
| analytics.mv_material_group_stats | idx_mv_material_group_stats_pk | btree | group_id | sim | sim |  |
| analytics.mv_media_health | idx_mv_media_health_supplier | btree | source_supplier | sim | sim |  |
| analytics.mv_product_cards | uidx_mv_product_cards_id | btree | id | sim | sim |  |
| analytics.mv_product_compositions | idx_mv_product_compositions_pk | btree | product_id | sim | sim |  |
| analytics.mv_product_intelligence | idx_mv_product_intelligence_abc | btree | abc_classification | não | sim |  |
| analytics.mv_product_intelligence | idx_mv_product_intelligence_product_id_unique | btree | product_id | sim | sim |  |
| analytics.mv_stock_velocity | idx_analytics_mv_stock_velocity_product_id | btree | product_id | não | sim |  |
| analytics.mv_stock_velocity | idx_analytics_mv_stock_velocity_supplier_id | btree | supplier_id | não | sim |  |
| analytics.mv_stock_velocity | idx_mv_stock_velocity_variant_id | btree | variant_id | não | sim |  |
| analytics.mv_stock_velocity | mv_stock_velocity_pk | btree | variant_supplier_source_id | sim | sim |  |
| cf_recon.action_log | action_log_pkey | btree | id | sim | sim |  |
| cf_recon.cf_ghost_check_queue | cf_ghost_check_queue_pkey | btree | image_id | sim | sim |  |
| cf_recon.cf_ghost_check_queue | idx_ghost_queue_dispatch | btree | enqueued_at | não | sim | `(status = 'pending'::text)` |
| cf_recon.cf_ghost_check_queue | idx_ghost_queue_status | btree | status | não | sim |  |
| cf_recon.cf_image | cf_image_pkey | btree | image_id | sim | sim |  |
| cf_recon.cf_image | idx_cf_recon_cfimg_last_seen | btree | last_seen_at | não | sim |  |
| cf_recon.cf_image | idx_cf_recon_cfimg_uploaded | btree | uploaded_at | não | sim |  |
| cf_recon.crawl_run | crawl_run_pkey | btree | id | sim | sim |  |
| cf_recon.metric_snapshot | metric_snapshot_pkey | btree | id | sim | sim |  |
| cf_recon.remediation | idx_remediation_kind_status | btree | kind, status | não | sim |  |
| cf_recon.remediation | remediation_pkey | btree | id | sim | sim |  |
| classification_audit.category_suggestions | category_suggestions_pkey | btree | id | sim | sim |  |
| classification_audit.category_suggestions | category_suggestions_product_id_category_id_key | btree | product_id, category_id | sim | sim |  |
| classification_audit.category_suggestions | idx_sug_gap | btree | already_assigned, score | não | sim |  |
| classification_audit.category_suggestions | idx_sug_product | btree | product_id | não | sim |  |
| classification_audit.category_suggestions | idx_sug_score | btree | score | não | sim |  |
| internal.mv_product_leaf_category | idx_mv_product_leaf_category_leaf_id | btree | leaf_category_id | não | sim |  |
| internal.mv_product_leaf_category | idx_mv_product_leaf_category_product_id | btree | product_id, leaf_category_id, leaf_category_name, leaf_category_level, leaf_category_slug, leaf_category_id_safe | sim | sim |  |
| prod_audit.category_keywords | category_keywords_pkey | btree | category_id | sim | sim |  |
| prod_audit.category_keywords | idx_catkw_level | btree | level | não | sim |  |
| prod_audit.category_keywords | idx_catkw_name_trgm | gin | name_normalized | não | sim |  |
| prod_audit.category_keywords | idx_catkw_tokens | gin | tokens | não | sim |  |
| prod_audit.category_suggestions | category_suggestions_pkey | btree | id | sim | sim |  |
| prod_audit.category_suggestions | category_suggestions_product_id_suggested_category_id_rule__key | btree | product_id, suggested_category_id, rule_name | sim | sim |  |
| prod_audit.category_suggestions | idx_catsug_confidence | btree | confidence | não | sim |  |
| prod_audit.category_suggestions | idx_catsug_product | btree | product_id | não | sim |  |
| prod_audit.category_suggestions | idx_catsug_rule | btree | rule_name | não | sim |  |
| prod_audit.category_suggestions | idx_catsug_unreviewed | btree | reviewed | não | sim | `(reviewed = false)` |
| prod_audit.classification_rules | classification_rules_pkey | btree | id | sim | sim |  |
| prod_audit.classification_rules | classification_rules_rule_name_key | btree | rule_name | sim | sim |  |
| prod_audit.product_features | idx_pf_current | gin | current_categories | não | sim |  |
| prod_audit.product_features | idx_pf_materials | gin | materials | não | sim |  |
| prod_audit.product_features | idx_pf_name_trgm | gin | name_normalized | não | sim |  |
| prod_audit.product_features | idx_pf_tokens | gin | tokens | não | sim |  |
| prod_audit.product_features | product_features_pkey | btree | product_id | sim | sim |  |
| prod_audit.test_results | idx_test_results_batch_result | btree | batch, result | não | sim |  |
| prod_audit.test_results | idx_test_results_severity_fail | btree | severity | não | sim | `(result = 'fail'::text)` |
| prod_audit.test_results | test_results_pkey | btree | id | sim | sim |  |
| public._archive_product_ai_20260626 | archive_product_ai_pkey | btree | product_id | sim | sim |  |
| public._archive_product_seo_20260626 | archive_product_seo_pkey | btree | product_id | sim | sim |  |
| public._archive_supplier_price_tiers_20260626 | archive_supplier_price_tiers_pkey | btree | id | sim | sim |  |
| public._bkp_kcvs_pre_normalize_20260624 | bkp_kcvs_pre_normalize_pkey | btree | id | sim | sim |  |
| public._bkp_kit_color_from_name_20260624 | bkp_kit_color_from_name_pkey | btree | id | sim | sim |  |
| public._bkp_kit_dims_20260619 | bkp_kit_dims_pkey | btree | id | sim | sim |  |
| public._bkp_kit_packing_type_20260624 | bkp_kit_packing_type_pkey | btree | id | sim | sim |  |
| public._bkp_kit_pkg_material_20260624 | bkp_kit_pkg_material_pkey | btree | id | sim | sim |  |
| public._bkp_orphan_active_variants_20260619 | bkp_orphan_active_variants_pkey | btree | id | sim | sim |  |
| public._qa_pct_results | _qa_pct_results_pkey | btree | id | sim | sim |  |
| public.access_blocked_log | access_blocked_log_pkey | btree | id | sim | sim |  |
| public.access_security_settings | access_security_settings_pkey | btree | id | sim | sim |  |
| public.admin_audit_log | admin_audit_log_pkey | btree | id | sim | sim |  |
| public.admin_audit_log | idx_admin_audit_log_action | btree | action | não | sim |  |
| public.admin_audit_log | idx_admin_audit_log_created_at | btree | created_at | não | sim |  |
| public.admin_settings | admin_settings_key_key | btree | key | sim | sim |  |
| public.admin_settings | admin_settings_pkey | btree | id | sim | sim |  |
| public.admin_settings | idx_admin_settings_updated_by | btree | updated_by | não | sim |  |
| public.ai_enrichment_queue | ai_enrichment_queue_pkey | btree | id | sim | sim |  |
| public.ai_enrichment_queue | idx_ai_queue_locked_at | btree | locked_at | não | sim | `(status = 'processing'::text)` |
| public.ai_enrichment_queue | idx_ai_queue_pending | btree | priority, created_at | não | sim | `(status = 'pending'::text)` |
| public.ai_enrichment_queue | idx_ai_queue_product_id | btree | product_id | não | sim |  |
| public.ai_enrichment_queue | idx_ai_queue_status | btree | status, updated_at | não | sim |  |
| public.ai_enrichment_queue | uq_product_enrichment_type | btree | product_id, enrichment_type | sim | sim |  |
| public.ai_function_routing | ai_function_routing_function_name_key | btree | function_name | sim | sim |  |
| public.ai_function_routing | ai_function_routing_pkey | btree | id | sim | sim |  |
| public.ai_function_routing | idx_ai_function_routing_primary_model_id | btree | primary_model_id | não | sim |  |
| public.ai_function_routing | idx_ai_function_routing_updated_by | btree | updated_by | não | sim |  |
| public.ai_models | ai_models_pkey | btree | id | sim | sim |  |
| public.ai_models | ai_models_provider_id_model_id_key | btree | provider_id, model_id | sim | sim |  |
| public.ai_models | idx_ai_models_provider | btree | provider_id | não | sim |  |
| public.ai_providers | ai_providers_pkey | btree | id | sim | sim |  |
| public.ai_providers | ai_providers_slug_key | btree | slug | sim | sim |  |
| public.ai_providers | idx_ai_providers_created_by | btree | created_by | não | sim |  |
| public.ai_providers | idx_ai_providers_updated_by | btree | updated_by | não | sim |  |
| public.ai_routing_decisions | ai_routing_decisions_pkey | btree | id | sim | sim |  |
| public.ai_routing_decisions | idx_ai_routing_decisions_final_model_id | btree | final_model_id | não | sim |  |
| public.ai_routing_decisions | idx_ai_routing_decisions_final_provider_id | btree | final_provider_id | não | sim |  |
| public.ai_routing_decisions | idx_ai_routing_decisions_user_id | btree | user_id | não | sim |  |
| public.ai_usage_events | ai_usage_events_pkey | btree | id | sim | sim |  |
| public.ai_usage_logs | ai_usage_logs_pkey | btree | id | sim | sim |  |
| public.ai_usage_logs | idx_ai_usage_logs_status_errors | btree | status, created_at | não | sim | `(status <> 'success'::text)` |
| public.ai_usage_logs | idx_ai_usage_logs_user_id | btree | user_id | não | sim |  |
| public.ai_usage_quotas | ai_usage_quotas_pkey | btree | id | sim | sim |  |
| public.ai_usage_quotas | ai_usage_quotas_role_key | btree | role | sim | sim |  |
| public.analytics_events | analytics_events_pkey | btree | id | sim | sim |  |
| public.anon_catalog_grant_audit_log | anon_catalog_grant_audit_log_pkey | btree | id | sim | sim |  |
| public.anon_insert_rate | anon_insert_rate_pkey | btree | bucket_key | sim | sim |  |
| public.art_file_attachments | art_file_attachments_pkey | btree | id | sim | sim |  |
| public.asia_image_import_queue | asia_image_import_queue_pkey | btree | id | sim | sim |  |
| public.asia_image_import_queue | asia_image_import_queue_url_original_key | btree | url_original | sim | sim |  |
| public.asia_image_import_queue | idx_aiq_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` |
| public.asia_image_import_queue | idx_asia_img_queue_product | btree | product_id | não | sim |  |
| public.asia_image_import_queue | idx_asia_img_queue_status | btree | status | não | sim |  |
| public.asia_upload_mapping | asia_upload_mapping_pkey | btree | id | sim | sim |  |
| public.asia_upload_mapping | idx_asia_upload_mapping_request_id | btree | request_id | não | sim |  |
| public.asia_upload_mapping | idx_asia_upload_mapping_status | btree | status | não | sim |  |
| public.attribute_definitions | attribute_definitions_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.attribute_definitions | attribute_definitions_pkey | btree | id | sim | sim |  |
| public.attribute_definitions | idx_attribute_definitions_group_id | btree | group_id | não | sim |  |
| public.attribute_equivalences | attribute_equivalences_pkey | btree | id | sim | sim |  |
| public.attribute_equivalences | attribute_equivalences_supplier_id_supplier_attr_key_suppli_key | btree | supplier_id, supplier_attr_key, supplier_attr_value, promo_attr_key | sim | sim |  |
| public.attribute_equivalences | idx_attribute_equivalences_verified_by | btree | verified_by | não | sim |  |
| public.attribute_groups | attribute_groups_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.attribute_groups | attribute_groups_pkey | btree | id | sim | sim |  |
| public.audit_log | audit_log_pkey | btree | id | sim | sim |  |
| public.audit_log | idx_audit_log_created_at | btree | created_at | não | sim |  |
| public.audit_log | idx_audit_log_entity | btree | entity_type, entity_id, created_at | não | sim |  |
| public.audit_log | idx_audit_log_user_id | btree | user_id | não | sim |  |
| public.audit_log_gravacao | audit_log_gravacao_pkey | btree | id | sim | sim |  |
| public.audit_log_gravacao | idx_audit_log_ts | btree | ts | não | sim |  |
| public.auto_tag_rules | auto_tag_rules_pkey | btree | id | sim | sim |  |
| public.b2b_collection_products | b2b_collection_products_pkey | btree | id | sim | sim |  |
| public.b2b_collection_products | collection_products_collection_id_product_id_key | btree | b2b_collection_id, product_id | sim | sim |  |
| public.b2b_collection_products | idx_collection_products_product_id | btree | product_id | não | sim |  |
| public.b2b_collections | b2b_collections_pkey | btree | id | sim | sim |  |
| public.b2b_collections | collections_slug_key | btree | slug | sim | sim |  |
| public.b2b_collections | idx_b2b_collections_created_by | btree | created_by | não | sim |  |
| public.b2b_collections | idx_b2b_collections_organization_id | btree | organization_id | não | sim |  |
| public.backup_produto_ramo_atividade_20260625 | backup_produto_ramo_atividade_pkey | btree | id | sim | sim |  |
| public.binding_colors | binding_colors_code_key | btree | code | sim | sim |  |
| public.binding_colors | binding_colors_pkey | btree | id | sim | sim |  |
| public.binding_types | binding_types_code_key | btree | code | sim | sim |  |
| public.binding_types | binding_types_pkey | btree | id | sim | sim |  |
| public.bot_detection_log | bot_detection_log_pkey | btree | id | sim | sim |  |
| public.bot_detection_log | idx_bot_detection_log_created_at | btree | created_at | não | sim |  |
| public.cart_templates | cart_templates_pkey | btree | id | sim | sim |  |
| public.cart_templates | idx_cart_templates_user_id | btree | user_id | não | sim |  |
| public.catalog_analytics | catalog_analytics_pkey | btree | id | sim | sim |  |
| public.catalog_analytics | idx_catalog_analytics_user_id | btree | user_id | não | sim |  |
| public.categories | categories_bitrix_id_key | btree | bitrix_id | sim | sim |  |
| public.categories | categories_org_slug_unique | btree | organization_id, slug | sim | sim |  |
| public.categories | categories_pkey | btree | id | sim | sim |  |
| public.categories | idx_cat_parent_nav | btree | parent_id, display_order, id, name, slug, level, is_active, is_visible, icon, children_count | não | sim | `(is_active = true)` |
| public.categories | idx_categories_level | btree | level | não | sim |  |
| public.categories | idx_categories_level_display_order | btree | level, display_order | não | sim | `((is_active = true) AND (deleted_at IS NULL))` |
| public.categories | idx_categories_org_id | btree | organization_id | não | sim |  |
| public.categories | idx_categories_parent_id | btree | parent_id | não | sim | `(parent_id IS NOT NULL)` |
| public.categories | idx_categories_path_tpo | btree | path | não | sim |  |
| public.categories | idx_categories_updated_by | btree | updated_by | não | sim |  |
| public.categories | idx_fk_categories_created_by | btree | created_by | não | sim |  |
| public.categories | uq_categories_slug | btree | slug | sim | sim |  |
| public.category_accessory_categories | category_accessory_categories_pkey | btree | id | sim | sim |  |
| public.category_accessory_categories | idx_cat_acc_category | btree | category_id | não | sim |  |
| public.category_accessory_categories | idx_category_accessory_categories_accessory_category_id | btree | accessory_category_id | não | sim |  |
| public.category_accessory_categories | uq_category_accessory | btree | category_id, accessory_category_id, relationship_type | sim | sim |  |
| public.category_ancestors | cat_ancestors_anc_idx | btree | ancestor_id | não | sim |  |
| public.category_ancestors | category_ancestors_pkey | btree | descendant_id, ancestor_id | sim | sim |  |
| public.category_attributes | category_attributes_category_id_attribute_key_key | btree | category_id, attribute_key | sim | sim |  |
| public.category_attributes | category_attributes_pkey | btree | id | sim | sim |  |
| public.category_colors | category_colors_pkey | btree | id | sim | sim |  |
| public.category_colors | idx_category_colors_color_group_id | btree | color_group_id | não | sim |  |
| public.category_colors | uq_category_color_unique | btree | category_id, color_group_id | sim | sim |  |
| public.category_commemorative_dates | category_commemorative_dates_pkey | btree | id | sim | sim |  |
| public.category_commemorative_dates | idx_cat_comm_category | btree | category_id | não | sim |  |
| public.category_commemorative_dates | idx_category_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  |
| public.category_commemorative_dates | uq_category_commemorative | btree | category_id, commemorative_date_id | sim | sim |  |
| public.category_copywriting_config | category_copywriting_config_pkey | btree | id | sim | sim |  |
| public.category_copywriting_config | idx_category_copywriting_unique | btree | category_id | sim | sim |  |
| public.category_relationships | category_relationships_parent_id_child_id_depth_key | btree | parent_id, child_id, depth | sim | sim |  |
| public.category_relationships | category_relationships_pkey | btree | id | sim | sim |  |
| public.category_target_audiences | category_target_audiences_pkey | btree | id | sim | sim |  |
| public.category_target_audiences | idx_category_target_audiences_target_audience_id | btree | target_audience_id | não | sim |  |
| public.category_target_audiences | uq_category_target_aud | btree | category_id, target_audience_id | sim | sim |  |
| public.category_variation_types | category_variation_types_category_id_variation_type_id_key | btree | category_id, variation_type_id | sim | sim |  |
| public.category_variation_types | category_variation_types_pkey | btree | id | sim | sim |  |
| public.category_variation_types | idx_cvt_category | btree | category_id | não | sim |  |
| public.category_variation_types | idx_cvt_variation | btree | variation_type_id | não | sim |  |
| public.cf_recon_inflight | cf_recon_inflight_pkey | btree | request_id | sim | sim |  |
| public.city_whitelist | city_whitelist_pkey | btree | id | sim | sim |  |
| public.city_whitelist | city_whitelist_unique | btree | city_name, state, country_code | sim | sim |  |
| public.classify_functions_registry | classify_functions_registry_function_name_key | btree | function_name | sim | sim |  |
| public.classify_functions_registry | classify_functions_registry_pkey | btree | id | sim | sim |  |
| public.cnpj_backfill_audit | cnpj_backfill_audit_pkey | btree | id | sim | sim |  |
| public.collection_item_reactions | collection_item_reactions_pkey | btree | id | sim | sim |  |
| public.collection_item_reactions | uq_collection_reactions_anon | btree | item_id, anon_id, emoji | sim | sim |  |
| public.collection_items | collection_items_collection_id_product_id_color_name_key | btree | collection_id, product_id, color_name | sim | sim |  |
| public.collection_items | collection_items_pkey | btree | id | sim | sim |  |
| public.collection_items | idx_collection_items_collection_id | btree | collection_id | não | sim |  |
| public.collection_items | uq_collection_items_no_color | btree | collection_id, product_id | sim | sim | `(color_name IS NULL)` |
| public.collection_items_trash | collection_items_trash_pkey | btree | id | sim | sim |  |
| public.collection_products | collection_products_pkey | btree | id | sim | sim |  |
| public.collection_products | collection_products_unique_pair | btree | collection_id, product_id | sim | sim |  |
| public.collection_products | idx_coll_products_product_id | btree | product_id | não | sim |  |
| public.collection_products | idx_collection_products_display_order | btree | collection_id, display_order | não | sim |  |
| public.collections | collections_pkey | btree | id | sim | sim |  |
| public.collections | idx_collections_user_id | btree | user_id | não | sim |  |
| public.color_equivalences | color_equivalences_organization_id_promo_variation_id_promo_key | btree | organization_id, promo_variation_id, promo_nuance_id, supplier_color_id | sim | sim |  |
| public.color_equivalences | color_equivalences_pkey | btree | id | sim | sim |  |
| public.color_equivalences | idx_color_equivalences_promo_nuance_id | btree | promo_nuance_id | não | sim |  |
| public.color_equivalences | idx_color_equivalences_promo_variation_id | btree | promo_variation_id | não | sim |  |
| public.color_equivalences | unique_supplier_promo_color | btree | supplier_color_id, promo_variation_id | sim | sim |  |
| public.color_equivalences | uq_color_equivalences_one_primary | btree | supplier_color_id | sim | sim | `(is_primary AND is_active)` |
| public.color_groups | color_groups_organization_id_name_key | btree | organization_id, name | sim | sim |  |
| public.color_groups | color_groups_pkey | btree | id | sim | sim |  |
| public.color_groups | color_groups_slug_unique | btree | slug | sim | sim |  |
| public.color_groups | idx_color_groups_internal_code | btree | organization_id, internal_code | sim | sim | `(internal_code IS NOT NULL)` |
| public.color_nuances | color_nuances_organization_id_name_key | btree | organization_id, name | sim | sim |  |
| public.color_nuances | color_nuances_pkey | btree | id | sim | sim |  |
| public.color_synonym_map | color_synonym_map_pkey | btree | id | sim | sim |  |
| public.color_synonym_map | idx_color_synonym_map_canonical_color_id | btree | canonical_color_id | não | sim |  |
| public.color_synonym_map | idx_csm_supplier_name | btree | supplier_id | sim | sim |  |
| public.color_variations | color_variations_organization_id_name_key | btree | organization_id, name | sim | sim |  |
| public.color_variations | color_variations_pkey | btree | id | sim | sim |  |
| public.color_variations | color_variations_slug_unique | btree | slug | sim | sim |  |
| public.color_variations | idx_color_variations_color_group_id | btree | color_group_id | não | sim |  |
| public.color_variations | idx_color_variations_group_id | btree | group_id | não | sim |  |
| public.color_variations | idx_color_variations_hex_upper_active | btree |  | não | sim | `(is_active = true)` |
| public.color_variations | idx_color_variations_internal_code | btree | organization_id, internal_code | sim | sim | `(internal_code IS NOT NULL)` |
| public.color_variations | idx_color_variations_name_upper_active | btree |  | não | sim | `(is_active = true)` |
| public.color_variations | idx_color_variations_nuance_id | btree | nuance_id | não | sim |  |
| public.commemorative_date_colors | commemorative_date_colors_commemorative_date_id_color_group_key | btree | commemorative_date_id, color_group_id | sim | sim |  |
| public.commemorative_date_colors | commemorative_date_colors_pkey | btree | id | sim | sim |  |
| public.commemorative_date_colors | idx_commemorative_date_colors_color_group_id | btree | color_group_id | não | sim |  |
| public.commemorative_date_exclusions | commemorative_date_exclusions_pkey | btree | id | sim | sim |  |
| public.commemorative_date_exclusions | idx_commemorative_date_exclusions_commemorative_date_id | btree | commemorative_date_id | não | sim |  |
| public.commemorative_date_exclusions | idx_commemorative_date_exclusions_product_id | btree | product_id | não | sim |  |
| public.commemorative_date_exclusions | idx_commemorative_date_exclusions_variant_id | btree | variant_id | não | sim |  |
| public.commemorative_dates | commemorative_dates_pkey | btree | id | sim | sim |  |
| public.commemorative_dates | commemorative_dates_slug_key | btree | slug | sim | sim |  |
| public.commemorative_dates | idx_commemorative_dates_organization_id | btree | organization_id | não | sim |  |
| public.companies | companies_pkey | btree | id | sim | sim |  |
| public.company_email_patterns | company_email_patterns_company_domain_pattern_format_key | btree | company_domain, pattern_format | sim | sim |  |
| public.company_email_patterns | company_email_patterns_pkey | btree | id | sim | sim |  |
| public.comparison_reactions | comparison_reactions_pkey | btree | id | sim | sim |  |
| public.comparison_reactions | uq_comparison_reactions_anon | btree | comparison_id, item_index, emoji, anon_id | sim | sim |  |
| public.component_media | component_media_pkey | btree | id | sim | sim |  |
| public.connection_test_history | connection_test_history_pkey | btree | id | sim | sim |  |
| public.connection_test_history | idx_connection_test_history_connection_id | btree | connection_id | não | sim |  |
| public.content_articles | content_articles_pkey | btree | id | sim | sim |  |
| public.content_articles | content_articles_slug_key | btree | slug | sim | sim |  |
| public.content_articles | idx_content_articles_author_id | btree | author_id | não | sim |  |
| public.content_articles | idx_content_articles_category | btree | category_slug | não | sim | `((status = 'published'::text) AND (is_deleted = false))` |
| public.conversation_audit_logs | conversation_audit_logs_pkey | btree | id | sim | sim |  |
| public.conversation_delivery_status | conversation_delivery_status_pkey | btree | id | sim | sim |  |
| public.conversation_event_history | conversation_event_history_pkey | btree | id | sim | sim |  |
| public.cover_finishes | cover_finishes_code_key | btree | code | sim | sim |  |
| public.cover_finishes | cover_finishes_pkey | btree | id | sim | sim |  |
| public.cover_materials | cover_materials_code_key | btree | code | sim | sim |  |
| public.cover_materials | cover_materials_pkey | btree | id | sim | sim |  |
| public.cover_types | cover_types_code_key | btree | code | sim | sim |  |
| public.cover_types | cover_types_pkey | btree | id | sim | sim |  |
| public.crm_callback_events | crm_callback_events_idempotency_uk | btree | external_quote_id, event_type, occurred_at | sim | sim |  |
| public.crm_callback_events | crm_callback_events_pkey | btree | id | sim | sim |  |
| public.crm_callback_events | idx_ccev_occurred_at | btree | occurred_at | não | sim |  |
| public.crm_callback_events | idx_crm_callback_events_result_received | btree | result, received_at | não | sim |  |
| public.cron_job_timeout_map | cron_job_timeout_map_pkey | btree | jobname | sim | sim |  |
| public.cron_watchdog_log | cron_watchdog_log_pkey | btree | id | sim | sim |  |
| public.cron_watchdog_log | idx_cron_watchdog_killed | btree | killed_at | não | sim |  |
| public.custom_kits | custom_kits_one_pinned_per_user_idx | btree | user_id | sim | sim | `is_pinned` |
| public.custom_kits | custom_kits_pkey | btree | id | sim | sim |  |
| public.custom_kits | idx_custom_kits_favorite | btree | user_id, is_favorite | não | sim |  |
| public.dashboard_insights_cache | dashboard_insights_cache_pkey | btree | id | sim | sim |  |
| public.dashboard_insights_cache | idx_dashboard_insights_cache_expires_at | btree | expires_at | não | sim |  |
| public.dashboard_insights_cache | ux_dashboard_insights_cache_user_fn_key | btree | user_id, function_name, cache_key | sim | sim |  |
| public.db_connection_snapshots | db_connection_snapshots_pkey | btree | id | sim | sim |  |
| public.db_connection_snapshots | idx_db_conn_snapshots_captured | btree | captured_at | não | sim |  |
| public.device_login_notifications | device_login_notifications_pkey | btree | id | sim | sim |  |
| public.device_login_notifications | idx_device_login_notifications_user_id | btree | user_id | não | sim |  |
| public.discount_approval_audit | discount_approval_audit_pkey | btree | id | sim | sim |  |
| public.discount_approval_audit | idx_daa_request_created | btree | request_id, created_at | não | sim |  |
| public.discount_approval_audit | idx_discount_approval_audit_actor_id | btree | actor_id | não | sim |  |
| public.discount_approval_requests | discount_approval_requests_pkey | btree | id | sim | sim |  |
| public.discount_approval_requests | idx_dar_pending | btree | created_at | não | sim | `(status = 'pending'::text)` |
| public.discount_approval_requests | idx_dar_quote_id | btree | quote_id | não | sim |  |
| public.discount_approval_requests | idx_dar_status | btree | status, created_at | não | sim |  |
| public.discount_approval_requests | idx_discount_approval_requests_admin_id | btree | admin_id | não | sim |  |
| public.discount_approval_requests | idx_discount_approval_requests_seller_id | btree | seller_id | não | sim |  |
| public.discount_approval_requests | uniq_dar_quote_pending | btree | quote_id | sim | sim | `(status = 'pending'::text)` |
| public.e2e_cleanup_audit | e2e_cleanup_audit_pkey | btree | id | sim | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_created_at | btree | created_at | não | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_email | btree | email, created_at | não | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_seller_id | btree | seller_id, created_at | não | sim | `(seller_id IS NOT NULL)` |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_status | btree | status, created_at | não | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_user_id | btree | user_id, created_at | não | sim | `(user_id IS NOT NULL)` |
| public.e2e_cleanup_rate_limit | e2e_cleanup_rate_limit_pkey | btree | key | sim | sim |  |
| public.eco_backfill_log_20260625 | eco_backfill_log_20260625_pkey | btree | id | sim | sim |  |
| public.eco_date_reconcile_log_20260626 | eco_date_reconcile_log_20260626_pkey | btree | product_id | sim | sim |  |
| public.eco_material_config | eco_material_config_pkey | btree | material_id | sim | sim |  |
| public.edge_function_invocations | edge_function_invocations_pkey | btree | id | sim | sim |  |
| public.edge_function_invocations | idx_edge_function_invocations_invoked_by | btree | invoked_by | não | sim |  |
| public.edge_function_invocations | idx_efi_function_slug | btree | function_slug, invoked_at | não | sim |  |
| public.edge_rate_limits | edge_rate_limits_pkey | btree | key | sim | sim |  |
| public.edge_rate_limits | idx_edge_rate_limits_reset_at | btree | reset_at | não | sim |  |
| public.enriched_contacts | enriched_contacts_linkedin_url_key | btree | linkedin_url | sim | sim |  |
| public.enriched_contacts | enriched_contacts_pkey | btree | id | sim | sim |  |
| public.enrichment_log | enrichment_log_pkey | btree | id | sim | sim |  |
| public.enrichment_log | idx_enrichment_log_contact_id | btree | contact_id | não | sim |  |
| public.expert_conversations | expert_conversations_pkey | btree | id | sim | sim |  |
| public.expert_conversations | idx_expert_conversations_seller_id | btree | seller_id | não | sim |  |
| public.expert_messages | expert_messages_pkey | btree | id | sim | sim |  |
| public.external_connections | external_connections_pkey | btree | id | sim | sim |  |
| public.external_connections | external_connections_type_name_key | btree | type, name | sim | sim |  |
| public.external_connections | external_connections_type_name_no_env_uidx | btree | type, name | sim | sim | `(env_key IS NULL)` |
| public.external_connections | idx_external_connections_envkey_type | btree | env_key, type | sim | sim | `(env_key IS NOT NULL)` |
| public.external_connections_sync_log | external_connections_sync_log_pkey | btree | id | sim | sim |  |
| public.favorite_item_reactions | favorite_item_reactions_item_id_anon_id_emoji_key | btree | item_id, anon_id, emoji | sim | sim |  |
| public.favorite_item_reactions | favorite_item_reactions_pkey | btree | id | sim | sim |  |
| public.favorite_item_reactions | idx_favorite_item_reactions_list_id | btree | list_id | não | sim |  |
| public.favorite_items | favorite_items_pkey | btree | id | sim | sim |  |
| public.favorite_items | idx_favorite_items_product_id | btree | product_id | não | sim |  |
| public.favorite_items | idx_fi_list | btree | list_id, position, added_at | não | sim |  |
| public.favorite_items | idx_fi_user | btree | user_id | não | sim |  |
| public.favorite_items | uniq_fi_list_product_variant | btree | list_id, product_id, variant_id | sim | sim |  |
| public.favorite_items_trash | favorite_items_trash_pkey | btree | id | sim | sim |  |
| public.favorite_items_trash | idx_fit_user_deleted | btree | user_id, deleted_at | não | sim |  |
| public.favorite_lists | favorite_lists_pkey | btree | id | sim | sim |  |
| public.favorite_lists | favorite_lists_shared_token_key | btree | shared_token | sim | sim |  |
| public.favorite_lists | idx_favorite_lists_user | btree | user_id, is_archived, position | não | sim |  |
| public.favorite_lists | uniq_favorite_lists_one_default_per_user | btree | user_id | sim | sim | `(is_default = true)` |
| public.feminine_color_config | feminine_color_config_pkey | btree | color_group_id | sim | sim |  |
| public.file_scan_logs | file_scan_logs_pkey | btree | id | sim | sim |  |
| public.file_scan_logs | idx_file_scan_logs_user_id | btree | user_id | não | sim |  |
| public.follow_up_reminders | follow_up_reminders_pkey | btree | id | sim | sim |  |
| public.frontend_telemetry | frontend_telemetry_pkey | btree | id | sim | sim |  |
| public.frontend_telemetry | idx_frontend_telemetry_user_id | btree | user_id | não | sim |  |
| public.generated_mockups | generated_mockups_pkey | btree | id | sim | sim |  |
| public.generated_mockups | idx_generated_mockups_approved_by_user_id | btree | approved_by_user_id | não | sim |  |
| public.generated_mockups | idx_generated_mockups_job_id | btree | job_id | não | sim |  |
| public.generated_mockups | idx_generated_mockups_product_id | btree | product_id | não | sim |  |
| public.generated_mockups | idx_generated_mockups_technique_id | btree | technique_id | não | sim |  |
| public.generated_mockups | idx_generated_mockups_user_created | btree | user_id, created_at | não | sim |  |
| public.geo_allowed_countries | geo_allowed_countries_country_code_key | btree | country_code | sim | sim |  |
| public.geo_allowed_countries | geo_allowed_countries_pkey | btree | id | sim | sim |  |
| public.geo_allowed_countries | idx_geo_allowed_countries_created_by | btree | created_by | não | sim |  |
| public.hardening_health_snapshots | hardening_health_snapshots_pkey | btree | id | sim | sim |  |
| public.image_backfill_queue | idx_backfill_dispatch_v2 | btree | task, status, priority, created_at | não | sim | `(status = 'pending'::text)` |
| public.image_backfill_queue | idx_backfill_queue_by_task | btree | task, status | não | sim |  |
| public.image_backfill_queue | idx_backfill_queue_dispatch | btree | priority, created_at | não | sim | `(status = 'pending'::text)` |
| public.image_backfill_queue | image_backfill_queue_pkey | btree | id | sim | sim |  |
| public.image_backfill_queue | uq_backfill_one_per_image_task | btree | product_image_id, task | sim | sim |  |
| public.image_types | image_types_pkey | btree | id | sim | sim |  |
| public.image_types | uq_image_types_code | btree | code | sim | sim |  |
| public.import_pipeline_steps | import_pipeline_steps_etapa_key | btree | etapa | sim | sim |  |
| public.import_pipeline_steps | import_pipeline_steps_pkey | btree | id | sim | sim |  |
| public.inbound_webhook_endpoints | idx_inbound_webhook_endpoints_created_by | btree | created_by | não | sim |  |
| public.inbound_webhook_endpoints | inbound_webhook_endpoints_pkey | btree | id | sim | sim |  |
| public.inbound_webhook_endpoints | inbound_webhook_endpoints_slug_key | btree | slug | sim | sim |  |
| public.inbound_webhook_events | idx_webhook_idempotency | btree | endpoint_id, idempotency_key | sim | sim | `(idempotency_key IS NOT NULL)` |
| public.inbound_webhook_events | inbound_webhook_events_pkey | btree | id | sim | sim |  |
| public.included_packaging_print_areas | idx_ippa_packaging | btree | packaging_id | não | sim |  |
| public.included_packaging_print_areas | idx_ippa_packaging_code | btree | packaging_id, area_code | sim | sim | `(area_code IS NOT NULL)` |
| public.included_packaging_print_areas | included_packaging_print_areas_pkey | btree | id | sim | sim |  |
| public.included_packaging_print_areas | uq_ippa_packaging_area_code | btree | packaging_id, area_code | sim | sim |  |
| public.included_packaging_techniques | idx_included_packaging_techniques_technique_id | btree | technique_id | não | sim |  |
| public.included_packaging_techniques | idx_ipt_packaging | btree | packaging_id | não | sim |  |
| public.included_packaging_techniques | idx_ipt_packaging_technique | btree | packaging_id, technique_id | sim | sim | `(technique_id IS NOT NULL)` |
| public.included_packaging_techniques | included_packaging_techniques_pkey | btree | id | sim | sim |  |
| public.included_packaging_techniques | uq_ipt_packaging_technique_code | btree | packaging_id, technique_code | sim | sim |  |
| public.ingestion_run_log | ingestion_run_log_pkey | btree | id | sim | sim |  |
| public.integration_credentials | idx_integration_credentials_created_by | btree | created_by | não | sim |  |
| public.integration_credentials | idx_integration_credentials_updated_by | btree | updated_by | não | sim |  |
| public.integration_credentials | integration_credentials_pkey | btree | id | sim | sim |  |
| public.integration_credentials | integration_credentials_secret_name_key | btree | secret_name | sim | sim |  |
| public.ip_access_control | idx_ip_access_control_created_by | btree | created_by | não | sim |  |
| public.ip_access_control | idx_ip_access_control_expires | btree | expires_at | não | sim | `(expires_at IS NOT NULL)` |
| public.ip_access_control | ip_access_control_ip_address_list_type_key | btree | ip_address, list_type | sim | sim |  |
| public.ip_access_control | ip_access_control_pkey | btree | id | sim | sim |  |
| public.ip_whitelist | ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  |
| public.ip_whitelist | ip_whitelist_pkey | btree | id | sim | sim |  |
| public.kill_switch_hits | idx_kill_switch_hits_occurred_at | btree | occurred_at | não | sim |  |
| public.kill_switch_hits | kill_switch_hits_pkey | btree | id | sim | sim |  |
| public.kit_collaborators | kit_collaborators_kit_id_user_id_key | btree | kit_id, user_id | sim | sim |  |
| public.kit_collaborators | kit_collaborators_pkey | btree | id | sim | sim |  |
| public.kit_comments | idx_kit_comments_kit_id | btree | kit_id | não | sim |  |
| public.kit_comments | idx_kit_comments_parent_id | btree | parent_id | não | sim |  |
| public.kit_comments | kit_comments_pkey | btree | id | sim | sim |  |
| public.kit_component_enrichment_raw | idx_kcer_component | btree | kit_component_id | não | sim |  |
| public.kit_component_enrichment_raw | idx_kcer_kit | btree | kit_product_id | não | sim |  |
| public.kit_component_enrichment_raw | idx_kcer_source | btree | source | não | sim |  |
| public.kit_component_enrichment_raw | idx_kit_component_enrichment_raw_imported_by | btree | imported_by | não | sim |  |
| public.kit_component_enrichment_raw | idx_kit_component_enrichment_raw_promoted_component_id | btree | promoted_component_id | não | sim |  |
| public.kit_component_enrichment_raw | idx_kit_component_enrichment_raw_promoted_padronizacao_id | btree | promoted_padronizacao_id | não | sim |  |
| public.kit_component_enrichment_raw | kit_component_enrichment_raw_pkey | btree | id | sim | sim |  |
| public.kit_component_enrichment_raw | uq_kcer_hash | btree | raw_hash | sim | sim | `(raw_hash IS NOT NULL)` |
| public.kit_component_ficha_staging | ix_kcfs_product | btree | product_sku | não | sim |  |
| public.kit_component_ficha_staging | ix_kcfs_status | btree | match_status | não | sim |  |
| public.kit_component_ficha_staging | kit_component_ficha_staging_pkey | btree | id | sim | sim |  |
| public.kit_component_padronizacao | idx_kcp_material_type_id | btree | material_type_id | não | sim |  |
| public.kit_component_padronizacao | idx_kcpad_approved | btree | padronizacao_status | não | sim | `((padronizacao_status)::text = 'approved'::text)` |
| public.kit_component_padronizacao | idx_kcpad_component | btree | kit_component_id | não | sim |  |
| public.kit_component_padronizacao | idx_kcpad_kit | btree | kit_product_id | não | sim |  |
| public.kit_component_padronizacao | idx_kcpad_status | btree | padronizacao_status | não | sim |  |
| public.kit_component_padronizacao | idx_kit_component_padronizacao_component_product_id | btree | component_product_id | não | sim |  |
| public.kit_component_padronizacao | idx_kit_component_padronizacao_component_type_code | btree | component_type_code | não | sim |  |
| public.kit_component_padronizacao | idx_kit_component_padronizacao_pkg_type_code | btree | pkg_type_code | não | sim |  |
| public.kit_component_padronizacao | idx_kit_component_padronizacao_raw_id | btree | raw_id | não | sim |  |
| public.kit_component_padronizacao | idx_kit_component_padronizacao_reviewed_by | btree | reviewed_by | não | sim |  |
| public.kit_component_padronizacao | idx_kit_padronizacao_material_id | btree | secondary_material_type_id | não | sim |  |
| public.kit_component_padronizacao | kit_component_padronizacao_pkey | btree | id | sim | sim |  |
| public.kit_component_print_areas | idx_kcpa_active | btree | kit_component_id, is_active | não | sim |  |
| public.kit_component_print_areas | idx_kcpa_component | btree | kit_component_id | não | sim |  |
| public.kit_component_print_areas | idx_kcpa_tabela | btree | tabela_preco_id | não | sim |  |
| public.kit_component_print_areas | kit_component_print_areas_pkey | btree | id | sim | sim |  |
| public.kit_component_print_areas | uq_kcpa_component_location_tecnica | btree | kit_component_id, location_code, tabela_preco_id | sim | sim |  |
| public.kit_component_types | idx_kit_component_types_default_material_type_id | btree | default_material_type_id | não | sim |  |
| public.kit_component_types | idx_kit_component_types_secondary_material_type_id | btree | secondary_material_type_id | não | sim |  |
| public.kit_component_types | kit_component_types_code_key | btree | code | sim | sim |  |
| public.kit_component_types | kit_component_types_pkey | btree | id | sim | sim |  |
| public.kit_component_variant_skus | idx_kcvs_component | btree | component_id | não | sim |  |
| public.kit_component_variant_skus | idx_kcvs_kit | btree | kit_product_id | não | sim |  |
| public.kit_component_variant_skus | idx_kcvs_variant | btree | variant_id | não | sim |  |
| public.kit_component_variant_skus | idx_kit_component_variant_skus_item_color_id | btree | item_color_id | não | sim |  |
| public.kit_component_variant_skus | kit_component_variant_skus_pkey | btree | id | sim | sim |  |
| public.kit_component_variant_skus | uq_kcvs_comp_variant | btree | component_id, variant_id | sim | sim |  |
| public.kit_component_variant_skus | uq_kcvs_sku | btree | component_sku | sim | sim |  |
| public.kit_ficha_session_log | kit_ficha_session_log_pkey | btree | id | sim | sim |  |
| public.kit_quote_requests | idx_kit_quote_requests_quote_id | btree | quote_id | não | sim |  |
| public.kit_quote_requests | idx_kit_quote_requests_user_id | btree | user_id | não | sim |  |
| public.kit_quote_requests | kit_quote_requests_pkey | btree | request_id | sim | sim |  |
| public.kit_save_requests | idx_kit_save_requests_kit_id | btree | kit_id | não | sim |  |
| public.kit_save_requests | idx_kit_save_requests_user_id | btree | user_id | não | sim |  |
| public.kit_save_requests | kit_save_requests_pkey | btree | request_id | sim | sim |  |
| public.kit_share_tokens | idx_kit_share_tokens_kit_id | btree | kit_id | não | sim |  |
| public.kit_share_tokens | kit_share_tokens_pkey | btree | id | sim | sim |  |
| public.kit_share_tokens | kit_share_tokens_token_key | btree | token | sim | sim |  |
| public.kit_templates | idx_kit_templates_created_by | btree | created_by | não | sim |  |
| public.kit_templates | kit_templates_pkey | btree | id | sim | sim |  |
| public.kit_typical_dims | kit_typical_dims_pkey | btree | type_code | sim | sim |  |
| public.kit_variants | idx_kit_variants_kit_master_id | btree | kit_master_id | não | sim |  |
| public.kit_variants | kit_variants_pkey | btree | id | sim | sim |  |
| public.login_attempts | idx_login_attempts_email_ip_created | btree | email, ip_address, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_ip | btree | ip_address, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_lower_email_ip_created | btree | ip_address, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_user_id | btree | user_id, created_at | não | sim |  |
| public.login_attempts | login_attempts_pkey | btree | id | sim | sim |  |
| public.magazine_duplicate_requests | idx_magazine_duplicate_requests_magazine_id | btree | magazine_id | não | sim |  |
| public.magazine_duplicate_requests | idx_magazine_duplicate_requests_source_magazine_id | btree | source_magazine_id | não | sim |  |
| public.magazine_duplicate_requests | magazine_duplicate_requests_pkey | btree | actor_id, idempotency_key | sim | sim |  |
| public.magazine_items | magazine_items_pkey | btree | id | sim | sim |  |
| public.magazine_items | magazine_items_position_unique | btree | magazine_id, position | sim | sim |  |
| public.magazine_items | magazine_items_unique_product | btree | magazine_id, product_id | sim | sim |  |
| public.magazine_public_reactions | idx_mag_reactions_item | btree | item_id | não | sim | `(item_id IS NOT NULL)` |
| public.magazine_public_reactions | idx_mag_reactions_mag | btree | magazine_id, kind, created_at | não | sim |  |
| public.magazine_public_reactions | magazine_public_reactions_pkey | btree | id | sim | sim |  |
| public.magazine_public_reactions | reactions_unique_toggle | btree | magazine_id, viewer_fingerprint, kind, page_index, item_id | sim | sim |  |
| public.magazine_public_view_events | idx_mag_view_events_token_hash | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events | idx_magazine_pub_view_events_magazine_id | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events | magazine_public_view_events_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_07 | magazine_public_view_events_2026_07_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_07 | magazine_public_view_events_2026_07_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_07 | magazine_public_view_events_2026_07_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2026_08 | magazine_public_view_events_2026_08_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_08 | magazine_public_view_events_2026_08_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_08 | magazine_public_view_events_2026_08_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2026_09 | magazine_public_view_events_2026_09_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_09 | magazine_public_view_events_2026_09_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_09 | magazine_public_view_events_2026_09_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2026_10 | magazine_public_view_events_2026_10_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_10 | magazine_public_view_events_2026_10_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_10 | magazine_public_view_events_2026_10_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2026_11 | magazine_public_view_events_2026_11_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_11 | magazine_public_view_events_2026_11_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_11 | magazine_public_view_events_2026_11_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2026_12 | magazine_public_view_events_2026_12_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2026_12 | magazine_public_view_events_2026_12_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2026_12 | magazine_public_view_events_2026_12_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2027_01 | magazine_public_view_events_2027_01_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2027_01 | magazine_public_view_events_2027_01_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2027_01 | magazine_public_view_events_2027_01_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_2027_02 | magazine_public_view_events_2027_02_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_2027_02 | magazine_public_view_events_2027_02_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_2027_02 | magazine_public_view_events_2027_02_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_public_view_events_default | magazine_public_view_events_default_magazine_id_idx | btree | magazine_id | não | sim |  |
| public.magazine_public_view_events_default | magazine_public_view_events_default_pkey | btree | id, viewed_at | sim | sim |  |
| public.magazine_public_view_events_default | magazine_public_view_events_default_token_hash_viewed_at_idx | btree | token_hash, viewed_at | não | sim |  |
| public.magazine_reader_state | idx_magazine_reader_state_user_id | btree | user_id | não | sim |  |
| public.magazine_reader_state | idx_reader_state_token_hash | btree | magazine_token_hash | não | sim |  |
| public.magazine_reader_state | idx_reader_state_updated | btree | updated_at | não | sim |  |
| public.magazine_reader_state | magazine_reader_state_magazine_token_hash_viewer_fingerprin_key | btree | magazine_token_hash, viewer_fingerprint | sim | sim |  |
| public.magazine_reader_state | magazine_reader_state_pkey | btree | id | sim | sim |  |
| public.magazine_templates | idx_magazine_templates_organization_id | btree | organization_id | não | sim |  |
| public.magazine_templates | idx_magazine_templates_owner_id | btree | owner_id | não | sim |  |
| public.magazine_templates | idx_magazine_templates_template_id | btree | template_id | não | sim |  |
| public.magazine_templates | magazine_templates_pkey | btree | id | sim | sim |  |
| public.magazine_templates_catalog | magazine_templates_catalog_pkey | btree | template_id | sim | sim |  |
| public.magazine_view_rollup_watermark | magazine_view_rollup_watermark_pkey | btree | id | sim | sim |  |
| public.magazines | idx_magazines_not_deleted | btree | owner_id, updated_at | não | sim | `(deleted_at IS NULL)` |
| public.magazines | idx_magazines_organization_id | btree | organization_id | não | sim |  |
| public.magazines | idx_magazines_published | btree | status, published_at | não | sim | `(status = 'published'::magazine_status)` |
| public.magazines | idx_magazines_template_id | btree | template_id | não | sim |  |
| public.magazines | magazines_pkey | btree | id | sim | sim |  |
| public.magazines | magazines_public_token_key | btree | public_token | sim | sim |  |
| public.magic_up_brand_kits | magic_up_brand_kits_pkey | btree | id | sim | sim |  |
| public.magic_up_campaigns | idx_magic_up_campaigns_user_status | btree | user_id, status, created_at | não | sim |  |
| public.magic_up_campaigns | magic_up_campaigns_pkey | btree | id | sim | sim |  |
| public.magic_up_comments | magic_up_comments_pkey | btree | id | sim | sim |  |
| public.magic_up_generations | idx_magic_up_generations_user_id | btree | user_id | não | sim |  |
| public.magic_up_generations | magic_up_generations_pkey | btree | id | sim | sim |  |
| public.magic_up_public_shares | magic_up_public_shares_pkey | btree | id | sim | sim |  |
| public.magic_up_reactions | magic_up_reactions_pkey | btree | id | sim | sim |  |
| public.markup_configurations | idx_markup_category | btree | category_id | não | sim | `(category_id IS NOT NULL)` |
| public.markup_configurations | idx_markup_configurations_created_by | btree | created_by | não | sim |  |
| public.markup_configurations | idx_markup_configurations_organization_id | btree | organization_id | não | sim |  |
| public.markup_configurations | idx_markup_configurations_product_id | btree | product_id | não | sim |  |
| public.markup_configurations | idx_markup_configurations_supplier_id | btree | supplier_id | não | sim |  |
| public.markup_configurations | idx_markup_variant | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` |
| public.markup_configurations | markup_configurations_pkey | btree | id | sim | sim |  |
| public.material_equivalences | idx_material_equiv_type | btree | promo_type_id | não | sim |  |
| public.material_equivalences | idx_material_equivalences_promo_group_id | btree | promo_group_id | não | sim |  |
| public.material_equivalences | idx_material_equivalences_promo_variation_id | btree | promo_variation_id | não | sim |  |
| public.material_equivalences | material_equivalences_pkey | btree | id | sim | sim |  |
| public.material_equivalences | material_equivalences_supplier_material_id_key | btree | supplier_material_id | sim | sim |  |
| public.material_groups | material_groups_organization_id_name_key | btree | organization_id, name | sim | sim |  |
| public.material_groups | material_groups_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.material_groups | material_groups_pkey | btree | id | sim | sim |  |
| public.material_reconcile_log_20260626 | material_reconcile_log_20260626_pkey | btree | id | sim | sim |  |
| public.material_types | idx_material_types_group | btree | group_id | não | sim |  |
| public.material_types | material_types_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.material_types | material_types_pkey | btree | id | sim | sim |  |
| public.material_variations | idx_material_variations_type_id | btree | type_id | não | sim |  |
| public.material_variations | material_variations_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.material_variations | material_variations_pkey | btree | id | sim | sim |  |
| public.mcp_access_violations | mcp_access_violations_pkey | btree | id | sim | sim |  |
| public.mcp_api_keys | idx_mcp_api_keys_rotated_from | btree | rotated_from | não | sim |  |
| public.mcp_api_keys | mcp_api_keys_key_hash_key | btree | key_hash | sim | sim |  |
| public.mcp_api_keys | mcp_api_keys_pkey | btree | id | sim | sim |  |
| public.mcp_full_grantors | mcp_full_grantors_pkey | btree | user_id | sim | sim |  |
| public.mcp_key_auto_revocations | idx_mcp_key_auto_revocations_key_id | btree | key_id | não | sim |  |
| public.mcp_key_auto_revocations | mcp_key_auto_revocations_pkey | btree | id | sim | sim |  |
| public.mcp_kv | mcp_kv_pkey | btree | k | sim | sim |  |
| public.mcp_sessions | mcp_sessions_pkey | btree | chave | sim | sim |  |
| public.medallion_coverage_snapshots | medallion_coverage_snapshots_pkey | btree | id | sim | sim |  |
| public.mockup_approval_links | idx_mockup_approval_links_job_id | btree | job_id | não | sim |  |
| public.mockup_approval_links | mockup_approval_links_pkey | btree | id | sim | sim |  |
| public.mockup_approval_links | mockup_approval_links_public_token_key | btree | public_token | sim | sim |  |
| public.mockup_credit_transactions | idx_mockup_credit_transactions_credit_account_id | btree | credit_account_id | não | sim |  |
| public.mockup_credit_transactions | idx_mockup_credit_transactions_job_id | btree | job_id | não | sim |  |
| public.mockup_credit_transactions | idx_mockup_credit_transactions_mockup_id | btree | mockup_id | não | sim |  |
| public.mockup_credit_transactions | idx_mockup_credit_transactions_user_id | btree | user_id | não | sim |  |
| public.mockup_credit_transactions | mockup_credit_transactions_pkey | btree | id | sim | sim |  |
| public.mockup_credits | mockup_credits_pkey | btree | id | sim | sim |  |
| public.mockup_credits | mockup_credits_user_id_key | btree | user_id | sim | sim |  |
| public.mockup_drafts | mockup_drafts_pkey | btree | id | sim | sim |  |
| public.mockup_drafts | mockup_drafts_user_id_draft_key_key | btree | user_id, draft_key | sim | sim |  |
| public.mockup_generation_jobs | idx_mockup_generation_jobs_product_id | btree | product_id | não | sim |  |
| public.mockup_generation_jobs | idx_mockup_generation_jobs_technique_id | btree | technique_id | não | sim |  |
| public.mockup_generation_jobs | idx_mockup_generation_jobs_user_id | btree | user_id | não | sim |  |
| public.mockup_generation_jobs | mockup_generation_jobs_pkey | btree | id | sim | sim |  |
| public.mockup_prompt_configs | mockup_prompt_configs_pkey | btree | id | sim | sim |  |
| public.mockup_prompt_history | mockup_prompt_history_pkey | btree | id | sim | sim |  |
| public.mockup_templates | idx_mockup_templates_default_technique_id | btree | default_technique_id | não | sim |  |
| public.mockup_templates | idx_mockup_templates_product_id | btree | product_id | não | sim |  |
| public.mockup_templates | mockup_templates_pkey | btree | id | sim | sim |  |
| public.mv_ema_kpi_by_level | uidx_mv_ema_kpi_by_level_nivel | btree | nivel_alerta | sim | sim |  |
| public.mv_product_images_audit | idx_mv_pia_prioridade | btree | prioridade_correcao | não | sim |  |
| public.mv_product_images_audit | uq_mv_product_images_audit_id | btree | id | sim | sim |  |
| public.mv_stock_rupture_alert | idx_mv_stock_rupture_alert_nivel | btree | nivel_alerta | não | sim |  |
| public.mv_stock_rupture_alert | idx_mv_stock_rupture_alert_non_ok_prio_score | btree | is_preferred, prioridade, score_composto, vss_id | não | sim | `(nivel_alerta <> 'OK'::text)` |
| public.mv_stock_rupture_alert | idx_mv_stock_rupture_alert_pref_score | btree | is_preferred, score_composto | não | sim |  |
| public.mv_stock_rupture_alert | idx_mv_stock_rupture_alert_supplier_id | btree | supplier_id | não | sim |  |
| public.mv_stock_rupture_alert | idx_mv_stock_rupture_alert_variant_id | btree | variant_id | não | sim |  |
| public.mv_stock_rupture_alert | uidx_mv_stock_rupture_alert_vss_id | btree | vss_id | sim | sim |  |
| public.mv_supplier_reliability | mv_supplier_reliability_supplier_id_idx | btree | supplier_id | sim | sim |  |
| public.navigation_analytics | idx_navigation_analytics_user_id | btree | user_id | não | sim |  |
| public.navigation_analytics | navigation_analytics_pkey | btree | id | sim | sim |  |
| public.ncm_codes | idx_ncm_codes_position | btree | position | não | sim |  |
| public.ncm_codes | ncm_codes_code_key | btree | code | sim | sim |  |
| public.ncm_codes | ncm_codes_pkey | btree | id | sim | sim |  |
| public.notebook_features | notebook_features_code_key | btree | code | sim | sim |  |
| public.notebook_features | notebook_features_pkey | btree | id | sim | sim |  |
| public.notification_preferences | notification_preferences_pkey | btree | id | sim | sim |  |
| public.notification_preferences | notification_preferences_user_id_key | btree | user_id | sim | sim |  |
| public.notification_templates | notification_templates_code_key | btree | code | sim | sim |  |
| public.notification_templates | notification_templates_pkey | btree | id | sim | sim |  |
| public.notifications | notifications_pkey | btree | id | sim | sim |  |
| public.ops_grant_audit | ops_grant_audit_pkey | btree | id | sim | sim |  |
| public.optimization_queue | optimization_queue_pkey | btree | id | sim | sim |  |
| public.optimization_queue_runs | idx_optimization_queue_runs_queue_id | btree | queue_id | não | sim |  |
| public.optimization_queue_runs | optimization_queue_runs_pkey | btree | id | sim | sim |  |
| public.order_item_personalizations | order_item_personalizations_pkey | btree | id | sim | sim |  |
| public.order_items | idx_order_items_order_id | btree | order_id | não | sim |  |
| public.order_items | idx_order_items_product | btree | product_id | não | sim |  |
| public.order_items | order_items_pkey | btree | id | sim | sim |  |
| public.orders | idx_orders_created_at | btree | created_at | não | sim |  |
| public.orders | idx_orders_created_by | btree | created_by | não | sim |  |
| public.orders | idx_orders_org | btree | organization_id | não | sim |  |
| public.orders | idx_orders_seller_id | btree | seller_id | não | sim |  |
| public.orders | orders_order_number_key | btree | order_number | sim | sim |  |
| public.orders | orders_pkey | btree | id | sim | sim |  |
| public.organization_members | idx_org_members_org_id | btree | organization_id | não | sim |  |
| public.organization_members | idx_org_members_user_id | btree | user_id | não | sim |  |
| public.organization_members | organization_members_organization_id_user_id_key | btree | organization_id, user_id | sim | sim |  |
| public.organization_members | organization_members_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_slug_key | btree | slug | sim | sim |  |
| public.outbound_webhooks | idx_outbound_webhooks_active_events | gin | events | não | sim | `(active = true)` |
| public.outbound_webhooks | outbound_webhooks_pkey | btree | id | sim | sim |  |
| public.ownership_audit_reports | ownership_audit_reports_pkey | btree | id | sim | sim |  |
| public.ownership_repair_logs | ownership_repair_logs_pkey | btree | id | sim | sim |  |
| public.packaging_compatibility_config | packaging_compatibility_config_config_key_key | btree | config_key | sim | sim |  |
| public.packaging_compatibility_config | packaging_compatibility_config_pkey | btree | id | sim | sim |  |
| public.packaging_types | packaging_types_code_key | btree | code | sim | sim |  |
| public.packaging_types | packaging_types_pkey | btree | id | sim | sim |  |
| public.packagings | idx_packagings_packaging_type_id | btree | packaging_type_id | não | sim |  |
| public.packagings | packagings_code_unique | btree | code | sim | sim |  |
| public.packagings | packagings_pkey | btree | id | sim | sim |  |
| public.paper_colors | paper_colors_code_key | btree | code | sim | sim |  |
| public.paper_colors | paper_colors_pkey | btree | id | sim | sim |  |
| public.paper_formats | paper_formats_code_key | btree | code | sim | sim |  |
| public.paper_formats | paper_formats_pkey | btree | id | sim | sim |  |
| public.paper_rulings | paper_rulings_code_key | btree | code | sim | sim |  |
| public.paper_rulings | paper_rulings_pkey | btree | id | sim | sim |  |
| public.paper_weights | paper_weights_pkey | btree | id | sim | sim |  |
| public.paper_weights | paper_weights_weight_gsm_key | btree | weight_gsm | sim | sim |  |
| public.password_reset_requests | idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_user_id | btree | user_id | não | sim |  |
| public.password_reset_requests | password_reset_requests_one_pending_per_email | btree |  | sim | sim | `(status = 'pending'::text)` |
| public.password_reset_requests | password_reset_requests_pkey | btree | id | sim | sim |  |
| public.permissions | permissions_pkey | btree | code | sim | sim |  |
| public.personalization_simulations | idx_personalization_simulations_product_id | btree | product_id | não | sim |  |
| public.personalization_simulations | idx_personalization_simulations_seller_id | btree | seller_id | não | sim |  |
| public.personalization_simulations | personalization_simulations_pkey | btree | id | sim | sim |  |
| public.personalization_technique_mappings | idx_ptm_tg_codigo | btree | tecnica_gravacao_codigo | não | sim |  |
| public.personalization_technique_mappings | personalization_technique_map_personalization_tech_id_tecni_key | btree | personalization_tech_id, tecnica_gravacao_codigo | sim | sim |  |
| public.personalization_technique_mappings | personalization_technique_mappings_pkey | btree | id | sim | sim |  |
| public.personalization_techniques | personalization_techniques_code_key | btree | code | sim | sim |  |
| public.personalization_techniques | personalization_techniques_pkey | btree | id | sim | sim |  |
| public.pipeline_control | pipeline_control_pkey | btree | name | sim | sim |  |
| public.pipeline_health_log | pipeline_health_log_pkey | btree | id | sim | sim |  |
| public.pipeline_known_issues | idx_pipeline_known_issues_supplier_id | btree | supplier_id | não | sim |  |
| public.pipeline_known_issues | pipeline_known_issues_bug_id_key | btree | bug_id | sim | sim |  |
| public.pipeline_known_issues | pipeline_known_issues_pkey | btree | id | sim | sim |  |
| public.pipeline_run_log | ix_pipeline_run_log_started | btree | started_at | não | sim |  |
| public.pipeline_run_log | pipeline_run_log_pkey | btree | id | sim | sim |  |
| public.price_history | idx_price_history_changed_by | btree | changed_by | não | sim |  |
| public.price_history | idx_price_history_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` |
| public.price_history | price_history_pkey | btree | id | sim | sim |  |
| public.print_area_techniques | idx_pat_location_code | btree | location_code | não | sim |  |
| public.print_area_techniques | idx_pat_product_active | btree | product_id, is_active | não | sim |  |
| public.print_area_techniques | idx_pat_product_location_active | btree | product_id, location_code, is_active | não | sim | `(is_active = true)` |
| public.print_area_techniques | idx_pat_tabela | btree | tabela_preco_id | não | sim |  |
| public.print_area_techniques | print_area_techniques_pkey | btree | id | sim | sim |  |
| public.print_area_techniques | uq_pat_product_location_tecnica | btree | product_id, location_code, tabela_preco_id | sim | sim |  |
| public.product_ai_content | idx_product_ai_content_version | btree | ai_version | não | sim |  |
| public.product_ai_content | product_ai_content_pkey | btree | id | sim | sim |  |
| public.product_ai_content | product_ai_content_product_id_key | btree | product_id | sim | sim |  |
| public.product_ai_history | product_ai_history_pkey | btree | id | sim | sim |  |
| public.product_ai_history | unique_product_version | btree | product_id, version | sim | sim |  |
| public.product_attributes | product_attributes_pkey | btree | id | sim | sim |  |
| public.product_attributes | product_attributes_product_id_attribute_key_key | btree | product_id, attribute_key | sim | sim |  |
| public.product_badge_definitions | idx_pbd_category | btree | category | não | sim |  |
| public.product_badge_definitions | idx_pbd_enabled | btree | is_enabled | não | sim |  |
| public.product_badge_definitions | idx_pbd_sort | btree | sort_order, priority | não | sim |  |
| public.product_badge_definitions | idx_pbd_source_kind | btree | source_kind | não | sim |  |
| public.product_badge_definitions | pbd_badge_key_unique | btree | badge_key | sim | sim |  |
| public.product_badge_definitions | product_badge_definitions_pkey | btree | id | sim | sim |  |
| public.product_category_assignments | idx_pca_product_id_noncovering | btree | product_id | não | sim |  |
| public.product_category_assignments | product_category_assignments_category_id_idx | btree | category_id | não | sim |  |
| public.product_category_assignments | product_category_assignments_pkey | btree | id | sim | sim |  |
| public.product_category_assignments | product_category_assignments_product_id_category_id_key | btree | product_id, category_id | sim | sim |  |
| public.product_category_assignments | product_category_primary_idx | btree | product_id | sim | sim | `(is_primary = true)` |
| public.product_commemorative_dates | idx_prod_comm_product | btree | product_id | não | sim |  |
| public.product_commemorative_dates | idx_product_commemorative_dates_category_id | btree | category_id | não | sim |  |
| public.product_commemorative_dates | idx_product_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  |
| public.product_commemorative_dates | product_commemorative_dates_pkey | btree | id | sim | sim |  |
| public.product_commemorative_dates | uq_product_commemorative_date | btree | product_id, commemorative_date_id | sim | sim |  |
| public.product_component_location_techniques | idx_product_component_location_techniques_technique_id | btree | technique_id | não | sim |  |
| public.product_component_location_techniques | product_component_location_te_component_location_id_techniq_key | btree | component_location_id, technique_id | sim | sim |  |
| public.product_component_location_techniques | product_component_location_techniques_pkey | btree | id | sim | sim |  |
| public.product_component_locations | product_component_locations_component_id_location_code_key | btree | component_id, location_code | sim | sim |  |
| public.product_component_locations | product_component_locations_pkey | btree | id | sim | sim |  |
| public.product_components | product_components_pkey | btree | id | sim | sim |  |
| public.product_customization_prices | idx_pcp_product | btree | product_id | não | sim |  |
| public.product_customization_prices | product_customization_prices_pkey | btree | id | sim | sim |  |
| public.product_customization_prices | product_customization_prices_product_id_service_code_table__key | btree | product_id, service_code, table_code, component, location | sim | sim |  |
| public.product_deactivation_requests | idx_pdr_product_id | btree | product_id | não | sim |  |
| public.product_deactivation_requests | idx_product_deactivation_requests_approved_by | btree | approved_by | não | sim |  |
| public.product_deactivation_requests | idx_product_deactivation_requests_rejected_by | btree | rejected_by | não | sim |  |
| public.product_deactivation_requests | idx_product_deactivation_requests_requested_by | btree | requested_by | não | sim |  |
| public.product_deactivation_requests | idx_product_deactivation_requests_supplier_id | btree | supplier_id | não | sim |  |
| public.product_deactivation_requests | product_deactivation_requests_pkey | btree | id | sim | sim |  |
| public.product_deactivation_tokens | _deactivation_auth_pkey | btree | id | sim | sim |  |
| public.product_deactivation_tokens | idx_product_deactivation_tokens_product_id | btree | product_id | não | sim |  |
| public.product_deactivation_tokens | idx_product_deactivation_tokens_request_id | btree | request_id | não | sim |  |
| public.product_faqs | idx_product_faqs_category_id | btree | category_id | não | sim |  |
| public.product_faqs | idx_product_faqs_product_id | btree | product_id | não | sim |  |
| public.product_faqs | product_faqs_pkey | btree | id | sim | sim |  |
| public.product_fiscal | idx_product_fiscal_ean | btree | ean | sim | sim | `(ean IS NOT NULL)` |
| public.product_fiscal | idx_product_fiscal_ncm_code | btree | ncm_code | não | sim |  |
| public.product_fiscal | idx_product_fiscal_ncm_id | btree | ncm_id | não | sim |  |
| public.product_fiscal | product_fiscal_pkey | btree | id | sim | sim |  |
| public.product_fiscal | product_fiscal_product_id_key | btree | product_id | sim | sim |  |
| public.product_group_components | product_group_components_pkey | btree | id | sim | sim |  |
| public.product_group_components | product_group_components_product_group_id_component_code_key | btree | product_group_id, component_code | sim | sim |  |
| public.product_group_location_techniques | idx_product_group_location_techniques_technique_id | btree | technique_id | não | sim |  |
| public.product_group_location_techniques | product_group_location_techni_group_location_id_technique_i_key | btree | group_location_id, technique_id | sim | sim |  |
| public.product_group_location_techniques | product_group_location_techniques_pkey | btree | id | sim | sim |  |
| public.product_group_locations | product_group_locations_group_component_id_location_code_key | btree | group_component_id, location_code | sim | sim |  |
| public.product_group_locations | product_group_locations_pkey | btree | id | sim | sim |  |
| public.product_group_members | idx_product_group_members_product_group_id | btree | product_group_id | não | sim |  |
| public.product_group_members | idx_product_group_members_product_id | btree | product_id | não | sim |  |
| public.product_group_members | product_group_members_pkey | btree | id | sim | sim |  |
| public.product_groups | product_groups_pkey | btree | id | sim | sim |  |
| public.product_images | idx_pi_canonical | btree | canonical_image_id | não | sim | `(canonical_image_id IS NOT NULL)` |
| public.product_images | idx_pi_cf_sync_status | btree | cf_sync_status | não | sim | `(cf_sync_status <> 'verified'::text)` |
| public.product_images | idx_pi_content_hash | btree | content_hash | não | sim | `(content_hash IS NOT NULL)` |
| public.product_images | idx_product_images_blurhash_null | btree | is_primary, id | não | sim | `((blurhash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL) AND ((format)::text = ANY (ARRAY['jpeg'::text, 'png'::text, 'webp'::text, 'gif'::text])))` |
| public.product_images | idx_product_images_cf_verified_at | btree | cf_verified_at | não | sim | `((cf_sync_status = 'verified'::text) AND (is_active = true))` |
| public.product_images | idx_product_images_color_id | btree | color_id | não | sim | `(color_id IS NOT NULL)` |
| public.product_images | idx_product_images_content_hash_orderby | btree | is_primary, id | não | sim | `((content_hash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL))` |
| public.product_images | idx_product_images_image_type_id | btree | image_type_id | não | sim |  |
| public.product_images | idx_product_images_missing_dimensions_orderby | btree | is_primary, created_at, id | não | sim | `((width_px IS NULL) AND (is_active = true) AND (format IS NOT NULL))` |
| public.product_images | idx_product_images_organization_id | btree | organization_id | não | sim |  |
| public.product_images | idx_product_images_primary | btree | product_id, is_primary | não | sim | `(is_primary = true)` |
| public.product_images | idx_product_images_primary_verified | btree | product_id, is_primary, cf_sync_status | não | sim | `(is_active = true)` |
| public.product_images | idx_product_images_product_id | btree | product_id | não | sim |  |
| public.product_images | idx_product_images_product_type_active | btree | product_id, image_type, display_order | não | sim | `(is_active = true)` |
| public.product_images | idx_product_images_seo | btree | product_id, is_active | não | sim | `(alt_text IS NOT NULL)` |
| public.product_images | idx_product_images_status_active | btree | cf_sync_status | não | sim | `(is_active = true)` |
| public.product_images | idx_product_images_supplier | btree | source_supplier | não | sim |  |
| public.product_images | idx_product_images_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` |
| public.product_images | idx_unique_product_filename | btree | product_id, filename | sim | sim | `((is_active = true) AND (filename IS NOT NULL))` |
| public.product_images | product_images_cloudflare_image_id_key | btree | cloudflare_image_id | sim | sim |  |
| public.product_images | product_images_display_idx | btree | product_id, display_order | não | sim | `(is_active = true)` |
| public.product_images | product_images_pkey | btree | id | sim | sim |  |
| public.product_images | uq_product_images_one_primary_per_product | btree | product_id | sim | sim | `((is_primary = true) AND (is_active = true))` |
| public.product_included_packagings | idx_incl_pkg_product | btree | product_id | não | sim |  |
| public.product_included_packagings | idx_pip_ingest_source | btree | ingest_source | não | sim |  |
| public.product_included_packagings | idx_pip_supplier_id | btree | supplier_id | não | sim |  |
| public.product_included_packagings | product_included_packagings_pkey | btree | id | sim | sim |  |
| public.product_kit_components | idx_kit_components_kit | btree | kit_product_id | não | sim |  |
| public.product_kit_components | idx_kit_components_name | btree | component_name | não | sim |  |
| public.product_kit_components | idx_pkc_color_id | btree | color_id | não | sim |  |
| public.product_kit_components | idx_pkc_component_type | btree | component_type_code | não | sim |  |
| public.product_kit_components | idx_pkc_enrichment_status | btree | enrichment_status | não | sim |  |
| public.product_kit_components | idx_pkc_material | btree | material_type_id | não | sim |  |
| public.product_kit_components | idx_product_kit_components_component_product_id | btree | component_product_id | não | sim |  |
| public.product_kit_components | idx_product_kit_components_padronizacao_id | btree | padronizacao_id | não | sim |  |
| public.product_kit_components | idx_product_kit_components_secondary_material_type_id | btree | secondary_material_type_id | não | sim |  |
| public.product_kit_components | product_kit_components_kit_product_id_component_product_id_key | btree | kit_product_id, component_product_id | sim | sim |  |
| public.product_kit_components | product_kit_components_pkey | btree | id | sim | sim |  |
| public.product_kit_components | uq_pkc_component_code | btree | component_code | sim | sim | `(component_code IS NOT NULL)` |
| public.product_kit_components | uq_pkc_kit_slot | btree | kit_product_id, slot_code | sim | sim |  |
| public.product_materials | idx_product_materials_material_id | btree | material_id | não | sim |  |
| public.product_materials | idx_product_materials_product | btree | product_id | não | sim |  |
| public.product_materials | product_materials_pkey | btree | id | sim | sim |  |
| public.product_materials | product_materials_product_material_unique | btree | product_id, material_id | sim | sim |  |
| public.product_notebook_features | idx_pnf_product_id | btree | product_id | não | sim |  |
| public.product_notebook_features | idx_product_notebook_features_feature_id | btree | feature_id | não | sim |  |
| public.product_notebook_features | product_notebook_features_pkey | btree | id | sim | sim |  |
| public.product_notebook_features | product_notebook_features_product_id_feature_id_key | btree | product_id, feature_id | sim | sim |  |
| public.product_notebook_specs | idx_pns_cover_mat | btree | cover_material_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_binding_color_id | btree | binding_color_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_binding_type_id | btree | binding_type_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_cover_finish_id | btree | cover_finish_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_cover_type_id | btree | cover_type_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_paper_color_id | btree | paper_color_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_paper_format_id | btree | paper_format_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_paper_ruling_id | btree | paper_ruling_id | não | sim |  |
| public.product_notebook_specs | idx_product_notebook_specs_paper_weight_id | btree | paper_weight_id | não | sim |  |
| public.product_notebook_specs | product_notebook_specs_pkey | btree | id | sim | sim |  |
| public.product_notebook_specs | product_notebook_specs_product_id_key | btree | product_id | sim | sim |  |
| public.product_novelties | idx_pn_expires | btree | expires_at | não | sim | `((is_active = true) AND (expires_at IS NOT NULL))` |
| public.product_novelties | idx_pn_highlighted | btree | is_highlighted, detected_at | não | sim | `((is_active = true) AND (is_highlighted = true))` |
| public.product_novelties | idx_pn_source | btree | source, is_active | não | sim |  |
| public.product_novelties | idx_pn_supplier | btree | supplier_id | não | sim | `(is_active = true)` |
| public.product_novelties | idx_product_novelties_created_by | btree | created_by | não | sim |  |
| public.product_novelties | idx_product_novelties_expires_sweep | btree | supplier_id, is_active | não | sim | `(is_active = true)` |
| public.product_novelties | pk_product_novelties | btree | id | sim | sim |  |
| public.product_novelties | uq_pn_product_one_active | btree | product_id | sim | sim | `(is_active = true)` |
| public.product_novelties | uq_product_novelties_product_no_supplier | btree | product_id | sim | sim | `(supplier_id IS NULL)` |
| public.product_novelties | uq_product_novelties_product_supplier | btree | product_id, supplier_id | sim | sim | `(supplier_id IS NOT NULL)` |
| public.product_packaging | product_packaging_pkey | btree | product_id | sim | sim |  |
| public.product_packaging_compatibility | idx_pkg_compat_packaging | btree | packaging_id | não | sim |  |
| public.product_packaging_compatibility | idx_pkg_compat_product | btree | product_id | não | sim |  |
| public.product_packaging_compatibility | product_packaging_compatibility_pkey | btree | id | sim | sim |  |
| public.product_packaging_compatibility | product_packaging_compatibility_product_id_packaging_id_key | btree | product_id, packaging_id | sim | sim |  |
| public.product_packagings | idx_product_packagings_packaging_id | btree | packaging_id | não | sim |  |
| public.product_packagings | idx_product_packagings_product | btree | product_id | não | sim |  |
| public.product_packagings | product_packagings_pkey | btree | id | sim | sim |  |
| public.product_packagings | product_packagings_unique | btree | product_id, packaging_id | sim | sim |  |
| public.product_physical | product_physical_pkey | btree | id | sim | sim |  |
| public.product_physical | product_physical_product_id_key | btree | product_id | sim | sim |  |
| public.product_price_freshness_overrides | idx_product_price_freshness_overrides_updated_by | btree | updated_by | não | sim |  |
| public.product_price_freshness_overrides | product_price_freshness_overrides_pkey | btree | id | sim | sim |  |
| public.product_price_freshness_overrides | product_price_freshness_overrides_product_id_key | btree | product_id | sim | sim |  |
| public.product_print_positions | idx_ppp_product | btree | product_id | não | sim |  |
| public.product_print_positions | product_print_positions_pkey | btree | id | sim | sim |  |
| public.product_print_positions | product_print_positions_product_id_position_index_key | btree | product_id, position_index | sim | sim |  |
| public.product_properties | idx_product_properties_property_definition_id | btree | property_definition_id | não | sim |  |
| public.product_properties | idx_product_properties_source | btree | source | não | sim |  |
| public.product_properties | product_properties_pkey | btree | id | sim | sim |  |
| public.product_properties | product_properties_product_definition_unique | btree | product_id, property_definition_id | sim | sim |  |
| public.product_properties | product_properties_product_id_property_code_key | btree | product_id, property_code | sim | sim |  |
| public.product_qa_image_alerts | idx_pqia_is_resolved | btree | is_resolved | não | sim | `(is_resolved = false)` |
| public.product_qa_image_alerts | idx_pqia_product_id | btree | product_id | não | sim |  |
| public.product_qa_image_alerts | product_qa_image_alerts_pkey | btree | id | sim | sim |  |
| public.product_relationships | idx_product_relationships_canonical_pair | btree | relationship_type | sim | sim |  |
| public.product_relationships | idx_product_relationships_related_product_id | btree | related_product_id | não | sim |  |
| public.product_relationships | product_relationships_pkey | btree | id | sim | sim |  |
| public.product_relationships | product_relationships_product_id_related_product_id_relatio_key | btree | product_id, related_product_id, relationship_type | sim | sim |  |
| public.product_search_logs | product_search_logs_pkey | btree | id | sim | sim |  |
| public.product_seo | idx_product_seo_audit | btree | seo_last_audit_at | não | sim |  |
| public.product_seo | idx_product_seo_score | btree | seo_score | não | sim |  |
| public.product_seo | product_seo_pkey | btree | id | sim | sim |  |
| public.product_seo | product_seo_product_id_key | btree | product_id | sim | sim |  |
| public.product_similarity_group_members | idx_product_similarity_group_members_supplier_id | btree | supplier_id | não | sim |  |
| public.product_similarity_group_members | idx_psgm_group | btree | group_id | não | sim |  |
| public.product_similarity_group_members | idx_psgm_product | btree | product_id | não | sim |  |
| public.product_similarity_group_members | product_similarity_group_members_group_id_product_id_key | btree | group_id, product_id | sim | sim |  |
| public.product_similarity_group_members | product_similarity_group_members_pkey | btree | id | sim | sim |  |
| public.product_similarity_groups | product_similarity_groups_category_id_material_family_capac_key | btree | category_id, material_family, capacity_band | sim | sim |  |
| public.product_similarity_groups | product_similarity_groups_pkey | btree | id | sim | sim |  |
| public.product_supply | idx_product_supply_sync_status | btree | sync_status | não | sim |  |
| public.product_supply | product_supply_pkey | btree | id | sim | sim |  |
| public.product_supply | product_supply_product_id_key | btree | product_id | sim | sim |  |
| public.product_sync_logs | product_sync_logs_pkey | btree | id | sim | sim |  |
| public.product_tags | product_tags_pkey | btree | id | sim | sim |  |
| public.product_tags | product_tags_product_id_idx | btree | product_id | não | sim |  |
| public.product_tags | product_tags_product_id_tag_id_key | btree | product_id, tag_id | sim | sim |  |
| public.product_tags | product_tags_tag_id_idx | btree | tag_id | não | sim |  |
| public.product_target_audiences | idx_product_target_audiences_category_id | btree | category_id | não | sim |  |
| public.product_target_audiences | idx_product_target_audiences_target_audience_id | btree | target_audience_id | não | sim |  |
| public.product_target_audiences | product_target_audiences_pkey | btree | id | sim | sim |  |
| public.product_target_audiences | uq_product_target_aud | btree | product_id, target_audience_id | sim | sim |  |
| public.product_variants | idx_product_variants_product_id | btree | product_id | não | sim |  |
| public.product_variants | idx_product_variants_size_id | btree | size_id | não | sim |  |
| public.product_variants | idx_pv_next_date_1 | btree | next_date_1 | não | sim | `(next_date_1 IS NOT NULL)` |
| public.product_variants | idx_pv_next_entry_date_nonnull | btree | next_entry_date | não | sim | `(next_entry_date IS NOT NULL)` |
| public.product_variants | idx_pv_supplier_sku | btree | supplier_sku | não | sim |  |
| public.product_variants | idx_variants_capacity_ml | btree | capacity_ml | não | sim |  |
| public.product_variants | idx_variants_color_name_active | btree | color_name | não | sim | `((is_active = true) AND (color_name IS NOT NULL))` |
| public.product_variants | idx_variants_size_code | btree | size_code | não | sim |  |
| public.product_variants | idx_variants_stock_active | btree | stock_quantity | não | sim | `(is_active = true)` |
| public.product_variants | product_variants_active_idx | btree | product_id, is_active | não | sim | `(is_active = true)` |
| public.product_variants | product_variants_color_id_idx | btree | color_id | não | sim |  |
| public.product_variants | product_variants_pkey | btree | id | sim | sim |  |
| public.product_variants | product_variants_sku_key | btree | sku | sim | sim |  |
| public.product_videos | idx_product_videos_active | btree | is_active | não | sim | `(is_active = true)` |
| public.product_videos | idx_product_videos_organization_id | btree | organization_id | não | sim |  |
| public.product_videos | idx_product_videos_status | btree | cloudflare_status | não | sim |  |
| public.product_videos | idx_product_videos_video_type_id | btree | video_type_id | não | sim |  |
| public.product_videos | idx_pv_supplier | btree | source_supplier | não | sim |  |
| public.product_videos | product_videos_pkey | btree | id | sim | sim |  |
| public.product_videos | uq_product_video | btree | product_id, cloudflare_video_id | sim | sim |  |
| public.product_views | idx_product_views_created_at | btree | created_at | não | sim |  |
| public.product_views | idx_product_views_pid_created | btree | product_id, created_at | não | sim |  |
| public.product_views | idx_product_views_product_id | btree | product_id | não | sim |  |
| public.product_views | product_views_pkey | btree | id | sim | sim |  |
| public.products | idx_products_active | btree | is_active | não | sim | `(is_active = true)` |
| public.products | idx_products_active_not_deleted | btree | id | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` |
| public.products | idx_products_bestseller_expires | btree | is_bestseller_expires_at | não | sim | `((is_bestseller = true) AND (is_bestseller_expires_at IS NOT NULL))` |
| public.products | idx_products_category | btree | category_id | não | sim |  |
| public.products | idx_products_color_swatches_gin | gin | color_swatches | não | sim |  |
| public.products | idx_products_dimensions_source | btree | dimensions_source | não | sim | `(dimensions_source IS NOT NULL)` |
| public.products | idx_products_featured_expires | btree | is_featured_expires_at | não | sim | `((is_featured = true) AND (is_featured_expires_at IS NOT NULL))` |
| public.products | idx_products_is_active_name | btree | name | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` |
| public.products | idx_products_is_featured | btree | is_featured | não | sim |  |
| public.products | idx_products_is_stockout | btree | is_stockout | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` |
| public.products | idx_products_keyset_name_id | btree | name, id | não | sim | `((is_active = true) AND (is_deleted = false))` |
| public.products | idx_products_main_cat_active | btree | main_category_id, supplier_id | não | sim | `((is_active = true) AND (main_category_id IS NOT NULL))` |
| public.products | idx_products_name_trgm | gin | name | não | sim |  |
| public.products | idx_products_ncm_id | btree | ncm_id | não | sim |  |
| public.products | idx_products_new_active_sort | btree | novelty_detected_at, id, novelty_expires_at, sale_price, stock_quantity, is_stockout, primary_image_url, category_id, supplier_id | não | sim | `(is_new = true)` |
| public.products | idx_products_new_sort | btree | novelty_detected_at | não | sim | `((is_new = true) AND (is_stockout = false) AND (is_active = true))` |
| public.products | idx_products_novelty_expires_count | btree | novelty_expires_at | não | sim | `((is_active = true) AND (is_new = true) AND (is_deleted IS NOT TRUE))` |
| public.products | idx_products_org | btree | organization_id | não | sim |  |
| public.products | idx_products_padronizacao_id | btree | padronizacao_id | não | sim | `(padronizacao_id IS NOT NULL)` |
| public.products | idx_products_price_last_verified_at | btree | price_last_verified_at | não | sim | `((is_active = true) AND (is_deleted = false))` |
| public.products | idx_products_search_vector | gin | search_vector | não | sim |  |
| public.products | idx_products_seo_audit_pending | btree | seo_last_audit_at | não | sim | `((is_active = true) AND (is_deleted = false))` |
| public.products | idx_products_seo_listing | btree | seo_score, name | não | sim | `((is_active = true) AND (is_deleted = false))` |
| public.products | idx_products_sku_promo | btree | sku_promo | sim | sim | `(sku_promo IS NOT NULL)` |
| public.products | idx_products_slug_active_lookup | btree | slug | não | sim | `(is_active = true)` |
| public.products | idx_products_slug_unique | btree | slug | sim | sim | `((slug IS NOT NULL) AND (is_deleted = false))` |
| public.products | idx_products_sub_brand_id | btree | sub_brand_id | não | sim |  |
| public.products | idx_products_supplier | btree | supplier_id | não | sim |  |
| public.products | idx_products_supplier_id_type_code | btree | supplier_id, supplier_type_code | não | sim | `(is_active = true)` |
| public.products | idx_products_surface_finish_gin | gin | surface_finish | não | sim | `((is_active = true) AND (is_deleted = false))` |
| public.products | idx_products_target_audience_gin | gin | target_audience | não | sim | `((is_active = true) AND (is_deleted IS NOT TRUE))` |
| public.products | idx_products_xbz_reliability | btree | xbz_stock_reliability_id | não | sim | `(xbz_stock_reliability_id IS NOT NULL)` |
| public.products | products_main_category_id_idx | btree | main_category_id | não | sim |  |
| public.products | products_pkey | btree | id | sim | sim |  |
| public.products | products_sku_key | btree | sku | sim | sim |  |
| public.products | uq_products_supplier_ref | btree | supplier_id, supplier_reference | sim | sim | `(supplier_reference IS NOT NULL)` |
| public.produto_ramo_atividade | idx_produto_ramo_atividade_filho | btree | ramo_atividade_filho_id | não | sim |  |
| public.produto_ramo_atividade | idx_produto_ramo_atividade_produto | btree | produto_id | não | sim |  |
| public.produto_ramo_atividade | produto_ramo_atividade_pkey | btree | id | sim | sim |  |
| public.produto_ramo_atividade | produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key | btree | produto_id, ramo_atividade_filho_id | sim | sim |  |
| public.produtos_padronizacao | idx_pad_product | btree | product_id | não | sim | `(product_id IS NOT NULL)` |
| public.produtos_padronizacao | idx_pad_promovidos | btree | supplier_id | não | sim | `(product_id IS NOT NULL)` |
| public.produtos_padronizacao | idx_pad_raw | btree | raw_id | não | sim |  |
| public.produtos_padronizacao | idx_pad_rejected | btree | supplier_id | não | sim | `(status = 'rejected'::produtos_padronizacao_status)` |
| public.produtos_padronizacao | idx_pad_to_promote | btree | supplier_id | não | sim | `(status = 'standardized'::produtos_padronizacao_status)` |
| public.produtos_padronizacao | idx_pad_to_standardize | btree | supplier_id | não | sim | `(status = 'pending'::produtos_padronizacao_status)` |
| public.produtos_padronizacao | idx_produtos_padronizacao_sub_brand_id | btree | sub_brand_id | não | sim |  |
| public.produtos_padronizacao | produtos_padronizacao_pkey | btree | id | sim | sim |  |
| public.produtos_padronizacao | uq_pad_supplier_reference | btree | supplier_id, supplier_reference | sim | sim |  |
| public.produtos_padronizacao_variantes | idx_padvar_color_id_2 | btree | color_id_2 | não | sim | `(color_id_2 IS NOT NULL)` |
| public.produtos_padronizacao_variantes | idx_padvar_pad | btree | pad_id | não | sim | `(pad_id IS NOT NULL)` |
| public.produtos_padronizacao_variantes | idx_padvar_parent | btree | supplier_id, parent_reference | não | sim |  |
| public.produtos_padronizacao_variantes | idx_padvar_raw_id | btree | raw_id | não | sim | `(raw_id IS NOT NULL)` |
| public.produtos_padronizacao_variantes | idx_padvar_sem_colorid | btree | supplier_id | não | sim | `(color_id IS NULL)` |
| public.produtos_padronizacao_variantes | idx_padvar_status | btree | supplier_id | não | sim | `(status = 'pending'::produtos_padronizacao_status)` |
| public.produtos_padronizacao_variantes | idx_produtos_padronizacao_variantes_variant_id | btree | variant_id | não | sim |  |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_pkey | btree | id | sim | sim |  |
| public.produtos_padronizacao_variantes | uq_padvar_supplier_variant | btree | supplier_id, variant_reference | sim | sim |  |
| public.produtos_site_padronizacao | idx_produtos_site_padronizacao_raw_id | btree | raw_id | não | sim |  |
| public.produtos_site_padronizacao | ix_site_pad_product | btree | product_id | não | sim |  |
| public.produtos_site_padronizacao | ix_site_pad_status | btree | status | não | sim |  |
| public.produtos_site_padronizacao | produtos_site_padronizacao_pkey | btree | id | sim | sim |  |
| public.produtos_site_padronizacao | uq_site_pad_supplier_ref | btree | supplier_id, supplier_reference | sim | sim |  |
| public.profiles | idx_profiles_bitrix_id | btree | bitrix_id | sim | sim | `(bitrix_id IS NOT NULL)` |
| public.profiles | idx_profiles_organization_id | btree | organization_id | não | sim |  |
| public.profiles | profiles_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_user_id_key | btree | user_id | sim | sim |  |
| public.property_definitions | property_definitions_code_key | btree | code | sim | sim |  |
| public.property_definitions | property_definitions_pkey | btree | id | sim | sim |  |
| public.public_token_failures | public_token_failures_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | push_subscriptions_pkey | btree | id | sim | sim |  |
| public.qa_image_coverage_log | qa_image_coverage_log_pkey | btree | id | sim | sim |  |
| public.query_telemetry | query_telemetry_pkey | btree | id | sim | sim |  |
| public.quote_approval_tokens | idx_quote_approval_tokens_seller_id | btree | seller_id | não | sim |  |
| public.quote_approval_tokens | quote_approval_tokens_pkey | btree | id | sim | sim |  |
| public.quote_approval_tokens | quote_approval_tokens_token_key | btree | token | sim | sim |  |
| public.quote_drafts | quote_drafts_pkey | btree | id | sim | sim |  |
| public.quote_history | idx_quote_history_quote_id_ts | btree | quote_id, created_at | não | sim | `(quote_id IS NOT NULL)` |
| public.quote_history | idx_quote_history_user_id | btree | user_id | não | sim |  |
| public.quote_history | quote_history_pkey | btree | id | sim | sim |  |
| public.quote_item_personalizations | idx_qip_quote_item | btree | quote_item_id | não | sim |  |
| public.quote_item_personalizations | quote_item_personalizations_pkey | btree | id | sim | sim |  |
| public.quote_items | idx_quote_items_product_id | btree | product_id | não | sim |  |
| public.quote_items | idx_quote_items_product_variant_id | btree | product_variant_id | não | sim |  |
| public.quote_items | idx_quote_items_quote_id | btree | quote_id | não | sim |  |
| public.quote_items | idx_quote_items_selected_packaging_id | btree | selected_packaging_id | não | sim |  |
| public.quote_items | quote_items_pkey | btree | id | sim | sim |  |
| public.quote_templates | idx_quote_templates_created_by | btree | created_by | não | sim |  |
| public.quote_templates | quote_templates_pkey | btree | id | sim | sim |  |
| public.quote_versions | idx_quote_versions_created_by | btree | created_by | não | sim |  |
| public.quote_versions | quote_versions_pkey | btree | id | sim | sim |  |
| public.quote_versions | quote_versions_quote_id_version_number_key | btree | quote_id, version_number | sim | sim |  |
| public.quotes | idx_quotes_assigned_to | btree | assigned_to | não | sim |  |
| public.quotes | idx_quotes_client_id | btree | client_id | não | sim | `(client_id IS NOT NULL)` |
| public.quotes | idx_quotes_created_at_desc | btree | created_at | não | sim |  |
| public.quotes | idx_quotes_created_at_status | btree | created_at, status, seller_id | não | sim | `(status = ANY (ARRAY['approved'::text, 'converted'::text]))` |
| public.quotes | idx_quotes_created_by | btree | created_by | não | sim |  |
| public.quotes | idx_quotes_discount_approval_status | btree | discount_approval_status | não | sim | `(discount_approval_status IS NOT NULL)` |
| public.quotes | idx_quotes_organization_id | btree | organization_id | não | sim |  |
| public.quotes | idx_quotes_parent_quote_id | btree | parent_quote_id | não | sim |  |
| public.quotes | idx_quotes_seller_org_status | btree | seller_id, organization_id, status | não | sim |  |
| public.quotes | idx_quotes_valid_until | btree | valid_until | não | sim | `(status <> ALL (ARRAY['expired'::text, 'cancelled'::text, 'converted'::text, 'rejected'::text, 'draft'::text]))` |
| public.quotes | quotes_approval_token_key | btree | approval_token | sim | sim |  |
| public.quotes | quotes_pkey | btree | id | sim | sim |  |
| public.quotes | quotes_quote_number_key | btree | quote_number | sim | sim |  |
| public.ramo_atividade | idx_ramo_atividade_ordem | btree | ordem | não | sim |  |
| public.ramo_atividade | ramo_atividade_pkey | btree | id | sim | sim |  |
| public.ramo_atividade | ramo_atividade_slug_key | btree | slug | sim | sim |  |
| public.ramo_atividade_filho | idx_ramo_atividade_filho_ramo_atividade_id | btree | ramo_atividade_id | não | sim |  |
| public.ramo_atividade_filho | ramo_atividade_filho_pkey | btree | id | sim | sim |  |
| public.ramo_atividade_filho | ramo_atividade_filho_slug_key | btree | slug | sim | sim |  |
| public.recently_viewed_products | recently_viewed_products_pkey | btree | id | sim | sim |  |
| public.request_rate_limits | idx_rate_limits_identifier_endpoint | btree | identifier, endpoint | sim | sim |  |
| public.request_rate_limits | request_rate_limits_pkey | btree | id | sim | sim |  |
| public.rls_denial_log | rls_denial_log_pkey | btree | id | sim | sim |  |
| public.role_migration_batches | role_migration_batches_pkey | btree | id | sim | sim |  |
| public.role_migration_items | role_migration_items_pkey | btree | id | sim | sim |  |
| public.role_permissions | idx_role_permissions_permission_code | btree | permission_code | não | sim |  |
| public.role_permissions | role_permissions_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_role_permission_code_key | btree | role, permission_code | sim | sim |  |
| public.roles | roles_name_key | btree | name | sim | sim |  |
| public.roles | roles_pkey | btree | id | sim | sim |  |
| public.sales_goals | idx_sales_goals_user_id | btree | user_id | não | sim |  |
| public.sales_goals | sales_goals_pkey | btree | id | sim | sim |  |
| public.saved_filters | saved_filters_pkey | btree | id | sim | sim |  |
| public.saved_trends_views | idx_saved_trends_views_user | btree | user_id | não | sim |  |
| public.saved_trends_views | saved_trends_views_pkey | btree | id | sim | sim |  |
| public.scheduled_reports | idx_scheduled_reports_next_run | btree | next_run_at | não | sim | `(is_active = true)` |
| public.scheduled_reports | scheduled_reports_pkey | btree | id | sim | sim |  |
| public.schema_drift_allowlist | schema_drift_allowlist_pkey | btree | table_name | sim | sim |  |
| public.schema_drift_log | idx_sdl_ran_at | btree | ran_at | não | sim |  |
| public.schema_drift_log | schema_drift_log_pkey | btree | id | sim | sim |  |
| public.schema_signature_baseline | schema_signature_baseline_pkey | btree | table_name, column_name | sim | sim |  |
| public.schema_signature_drift_allowlist | schema_signature_drift_allowlist_pkey | btree | id | sim | sim |  |
| public.schema_signature_drift_allowlist | uq_schema_sig_allowlist | btree | table_name | sim | sim |  |
| public.schema_signature_drift_log | idx_schema_sig_drift_log_ran_at | btree | ran_at | não | sim |  |
| public.schema_signature_drift_log | schema_signature_drift_log_pkey | btree | id | sim | sim |  |
| public.search_analytics | idx_search_analytics_created_at | btree | created_at | não | sim |  |
| public.search_analytics | idx_search_analytics_seller_created | btree | seller_id, created_at | não | sim |  |
| public.search_analytics | idx_search_analytics_seller_term_created | btree | seller_id, search_term, created_at | não | sim |  |
| public.search_analytics | idx_search_analytics_term_date | btree | search_term, created_at | não | sim |  |
| public.search_analytics | idx_search_analytics_zero_results_v2 | btree | search_term, created_at | não | sim | `((results_count = 0) AND (results_count <> '-1'::integer))` |
| public.search_analytics | search_analytics_pkey | btree | id | sim | sim |  |
| public.search_queries | idx_search_queries_clicked_product_id | btree | clicked_product_id | não | sim |  |
| public.search_queries | search_queries_pkey | btree | id | sim | sim |  |
| public.secret_rotation_log | idx_secret_rotation_log_rotated_by | btree | rotated_by | não | sim |  |
| public.secret_rotation_log | ix_secret_rotation_log_rotated_at | btree | rotated_at | não | sim |  |
| public.secret_rotation_log | secret_rotation_log_pkey | btree | id | sim | sim |  |
| public.security_settings | security_settings_pkey | btree | setting_key | sim | sim |  |
| public.seller_cart_items | idx_seller_cart_items_cart_id | btree | cart_id | não | sim |  |
| public.seller_cart_items | idx_seller_cart_items_sort_order | btree | cart_id, sort_order | não | sim |  |
| public.seller_cart_items | seller_cart_items_pkey | btree | id | sim | sim |  |
| public.seller_cart_items | unique_cart_item_variant | btree | cart_id, product_id, color_name | sim | sim |  |
| public.seller_carts | idx_seller_carts_seller_id | btree | seller_id | não | sim |  |
| public.seller_carts | seller_carts_pkey | btree | id | sim | sim |  |
| public.seller_discount_limits | idx_seller_discount_limits_set_by | btree | set_by | não | sim |  |
| public.seller_discount_limits | seller_discount_limits_pkey | btree | id | sim | sim |  |
| public.seller_discount_limits | seller_discount_limits_user_id_key | btree | user_id | sim | sim |  |
| public.seo_audit_log | seo_audit_log_pkey | btree | id | sim | sim |  |
| public.seo_redirects | seo_redirects_pkey | btree | id | sim | sim |  |
| public.seo_redirects | uq_seo_redirects_source_active | btree | source_path | sim | sim | `(is_active = true)` |
| public.simulator_wizard_drafts | simulator_wizard_drafts_pkey | btree | id | sim | sim |  |
| public.sm_category_pages | sm_category_pages_pkey | btree | id | sim | sim |  |
| public.sm_category_pages | sm_category_pages_slug_uq | btree | slug | sim | sim |  |
| public.sm_category_pages | sm_category_pages_status_idx | btree | status | não | sim |  |
| public.sm_site_url_map | idx_sm_url_map_no_site_id | btree | codigo | não | sim | `(site_id IS NULL)` |
| public.sm_site_url_map | idx_sm_url_map_supplier_id | btree | supplier_id | não | sim |  |
| public.sm_site_url_map | sm_site_url_map_pkey | btree | id | sim | sim |  |
| public.sm_site_url_map | sm_site_url_map_supplier_id_codigo_key | btree | supplier_id, codigo | sim | sim |  |
| public.sm_worker_partitions | sm_worker_partitions_pkey | btree | id | sim | sim |  |
| public.sm_worker_partitions | sm_worker_partitions_worker_id_key | btree | worker_id | sim | sim |  |
| public.smoke_test_runs | idx_smoke_test_runs_ran_at | btree | ran_at | não | sim |  |
| public.smoke_test_runs | smoke_test_runs_pkey | btree | id | sim | sim |  |
| public.spot_health_log | spot_health_log_pkey | btree | id | sim | sim |  |
| public.spot_typecode_map | spot_typecode_map_pkey | btree | legacy_code | sim | sim |  |
| public.step_up_audit_log | step_up_audit_log_pkey | btree | id | sim | sim |  |
| public.step_up_challenges | idx_step_up_challenges_expires | btree | expires_at | não | sim | `(consumed = false)` |
| public.step_up_challenges | step_up_challenges_pkey | btree | id | sim | sim |  |
| public.step_up_tokens | step_up_tokens_pkey | btree | id | sim | sim |  |
| public.stock_daily_summary | idx_daily_product_date | btree | product_id, summary_date | não | sim |  |
| public.stock_daily_summary | idx_sds_cenario_a | btree | summary_date, stock_open, stock_close | não | sim | `(restock_detected = true)` |
| public.stock_daily_summary | idx_sds_variant_id | btree | variant_id | não | sim |  |
| public.stock_daily_summary | idx_sds_zero_to_positive | btree | summary_date, product_id, supplier_id | não | sim | `(restock_zero_to_positive = true)` |
| public.stock_daily_summary | idx_stock_daily_summary_supplier_branch_id | btree | supplier_branch_id | não | sim |  |
| public.stock_daily_summary | idx_stock_daily_summary_supplier_id | btree | supplier_id | não | sim |  |
| public.stock_daily_summary | stock_daily_summary_pkey | btree | id | sim | sim |  |
| public.stock_daily_summary | uq_stock_daily_vss_date | btree | variant_supplier_source_id, summary_date | sim | sim |  |
| public.stock_notes | stock_notes_active_idx | btree | variant_id | não | sim | `(deleted_at IS NULL)` |
| public.stock_notes | stock_notes_pkey | btree | id | sim | sim |  |
| public.stock_notes | stock_notes_variant_idx | btree | variant_id | não | sim |  |
| public.stock_snapshots | idx_snapshots_captured_at | btree | captured_at | não | sim |  |
| public.stock_snapshots | stock_snapshots_pkey | btree | id | sim | sim |  |
| public.supplier_attribute_definitions | idx_supplier_attribute_definitions_organization_id | btree | organization_id | não | sim |  |
| public.supplier_attribute_definitions | supplier_attribute_definition_supplier_id_api_attribute_key_key | btree | supplier_id, api_attribute_key | sim | sim |  |
| public.supplier_attribute_definitions | supplier_attribute_definitions_pkey | btree | id | sim | sim |  |
| public.supplier_branches | supplier_branches_pkey | btree | id | sim | sim |  |
| public.supplier_branches | supplier_branches_supplier_id_branch_code_key | btree | supplier_id, branch_code | sim | sim |  |
| public.supplier_branches | supplier_branches_supplier_id_cnpj_key | btree | supplier_id, cnpj | sim | sim |  |
| public.supplier_categories | supplier_categories_pkey | btree | id | sim | sim |  |
| public.supplier_categories | supplier_categories_supplier_id_supplier_code_key | btree | supplier_id, supplier_code | sim | sim |  |
| public.supplier_category_mappings | idx_supplier_category_mappings_category_id | btree | category_id | não | sim |  |
| public.supplier_category_mappings | supplier_category_mappings_pkey | btree | id | sim | sim |  |
| public.supplier_category_mappings | supplier_category_mappings_supplier_category_id_category_id_key | btree | supplier_category_id, category_id | sim | sim |  |
| public.supplier_colors | idx_supplier_colors_api_color_id_unique | btree | organization_id, supplier_id, api_color_id | sim | sim | `(api_color_id IS NOT NULL)` |
| public.supplier_colors | idx_supplier_colors_color_variation_id | btree | color_variation_id | não | sim | `(color_variation_id IS NOT NULL)` |
| public.supplier_colors | idx_supplier_colors_name_upper_active | btree |  | não | sim | `(is_active = true)` |
| public.supplier_colors | idx_supplier_colors_supplier_code | btree | supplier_id, code | não | sim | `(code IS NOT NULL)` |
| public.supplier_colors | idx_supplier_colors_supplier_id | btree | supplier_id | não | sim |  |
| public.supplier_colors | supplier_colors_organization_id_supplier_id_name_key | btree | organization_id, supplier_id, name | sim | sim |  |
| public.supplier_colors | supplier_colors_pkey | btree | id | sim | sim |  |
| public.supplier_customization_options_raw | supplier_customization_option_supplier_id_product_reference_key | btree | supplier_id, product_reference, service_code, table_code, component, location | sim | sim |  |
| public.supplier_customization_options_raw | supplier_customization_options_raw_pkey | btree | id | sim | sim |  |
| public.supplier_customization_raw | idx_supplier_customization_raw_import_batch_id | btree | import_batch_id | não | sim |  |
| public.supplier_customization_raw | supplier_customization_raw_pkey | btree | id | sim | sim |  |
| public.supplier_customization_raw | uq_scr_supplier_option | btree | supplier_id, table_code_option | sim | sim |  |
| public.supplier_field_mappings | supplier_field_mappings_pkey | btree | id | sim | sim |  |
| public.supplier_field_mappings | uq_field_mapping | btree | supplier_id, source_field, target_table, target_field | sim | sim |  |
| public.supplier_field_priority | idx_supplier_field_priority_supplier_id | btree | supplier_id | não | sim |  |
| public.supplier_field_priority | supplier_field_priority_pkey | btree | id | sim | sim |  |
| public.supplier_field_priority | uq_field_priority | btree | target_table, target_field, supplier_id | sim | sim |  |
| public.supplier_import_batches | idx_supplier_import_batches_supplier_id | btree | supplier_id | não | sim |  |
| public.supplier_import_batches | supplier_import_batches_pkey | btree | id | sim | sim |  |
| public.supplier_materials | idx_supplier_materials_supplier | btree | supplier_id | não | sim |  |
| public.supplier_materials | supplier_materials_pkey | btree | id | sim | sim |  |
| public.supplier_materials | supplier_materials_supplier_id_api_material_key_key | btree | supplier_id, api_material_key | sim | sim |  |
| public.supplier_packagings | idx_supplier_packagings_packaging_id | btree | packaging_id | não | sim |  |
| public.supplier_packagings | supplier_packagings_pkey | btree | id | sim | sim |  |
| public.supplier_packagings | supplier_packagings_unique | btree | supplier_id, packaging_id | sim | sim |  |
| public.supplier_products_raw | idx_spr_images_pending | btree | supplier_id, imported_at | não | sim | `(images_status <> 'processed'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_images_status_pending | btree | id | não | sim | `(images_status = 'pending'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_import_batch_id | btree | import_batch_id | não | sim |  |
| public.supplier_products_raw | idx_spr_site_status_failed | btree | id | não | sim | `(site_status = 'failed'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_site_status_pending | btree | id | não | sim | `(site_status = 'pending'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_status_failed_quarantined | btree | supplier_id | não | sim | `(status = ANY (ARRAY['failed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` |
| public.supplier_products_raw | idx_spr_status_pending | btree | supplier_id | não | sim | `(status = 'pending'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_stock_pending | btree | supplier_id, stock_synced_at | não | sim | `(stock_status <> 'processed'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_stock_status_pending | btree | id | não | sim | `(stock_status = 'pending'::supplier_raw_status)` |
| public.supplier_products_raw | idx_spr_supplier_source_channel | btree | supplier_id, source_channel | não | sim | `(source_channel <> 'legacy'::text)` |
| public.supplier_products_raw | idx_spr_unprocessed | btree | supplier_id, imported_at | não | sim | `(status <> ALL (ARRAY['processed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` |
| public.supplier_products_raw | idx_spr_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` |
| public.supplier_products_raw | idx_spr_xbz_site_status | btree | supplier_id, site_status | não | sim | `((supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid) AND (site_status IS NOT NULL))` |
| public.supplier_products_raw | idx_supplier_products_raw_product | btree | product_id | não | sim | `(product_id IS NOT NULL)` |
| public.supplier_products_raw | supplier_products_raw_pkey | btree | id | sim | sim |  |
| public.supplier_products_raw | uq_spr_source_event | btree | supplier_id, source_event_id | sim | sim | `(source_event_id IS NOT NULL)` |
| public.supplier_products_raw | uq_spr_supplier_sku | btree | supplier_id, supplier_sku | sim | sim |  |
| public.supplier_products_raw | uq_supplier_product_raw | btree | supplier_id, supplier_reference | sim | sim |  |
| public.supplier_products_raw_history | supplier_products_raw_history_pkey1 | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2026_08 | supplier_products_raw_history_p2026_08_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2026_09 | supplier_products_raw_history_p2026_09_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2026_10 | supplier_products_raw_history_p2026_10_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2026_11 | supplier_products_raw_history_p2026_11_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2026_12 | supplier_products_raw_history_p2026_12_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_01 | supplier_products_raw_history_p2027_01_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_02 | supplier_products_raw_history_p2027_02_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_03 | supplier_products_raw_history_p2027_03_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_04 | supplier_products_raw_history_p2027_04_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_05 | supplier_products_raw_history_p2027_05_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_06 | supplier_products_raw_history_p2027_06_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_07 | supplier_products_raw_history_p2027_07_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_08 | supplier_products_raw_history_p2027_08_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_09 | supplier_products_raw_history_p2027_09_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_10 | supplier_products_raw_history_p2027_10_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_11 | supplier_products_raw_history_p2027_11_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_products_raw_history_p2027_12 | supplier_products_raw_history_p2027_12_pkey | btree | id, captured_at | sim | sim |  |
| public.supplier_property_mappings | idx_supplier_property_mappings_property | btree | property_code | não | sim |  |
| public.supplier_property_mappings | idx_supplier_property_mappings_supplier_id | btree | supplier_id | não | sim |  |
| public.supplier_property_mappings | supplier_property_mappings_pkey | btree | id | sim | sim |  |
| public.supplier_property_mappings | supplier_property_mappings_supplier_code_raw_pattern_key | btree | supplier_code, raw_pattern | sim | sim |  |
| public.supplier_replenishment_events | idx_sre_arrival_snapshot | btree | arrival_snapshot_id | não | sim | `(arrival_snapshot_id IS NOT NULL)` |
| public.supplier_replenishment_events | idx_sre_fulfilled_at | btree | resolved_at | não | sim | `(resolution = 'fulfilled'::text)` |
| public.supplier_replenishment_events | idx_sre_pending | btree | resolution | não | sim | `(resolution = 'pending'::text)` |
| public.supplier_replenishment_events | idx_sre_source_pending | btree | source_id, promised_date | não | sim | `(resolution = 'pending'::text)` |
| public.supplier_replenishment_events | idx_sre_supplier_date | btree | supplier_id, promised_date | não | sim |  |
| public.supplier_replenishment_events | idx_sre_variant_date | btree | variant_id, promised_date | não | sim |  |
| public.supplier_replenishment_events | supplier_replenishment_events_pkey | btree | id | sim | sim |  |
| public.supplier_replenishment_events | uq_sre_promise | btree | source_id, slot, promised_date, promised_quantity, observed_at | sim | sim |  |
| public.supplier_settings | supplier_settings_pkey | btree | id | sim | sim |  |
| public.supplier_settings | supplier_settings_supplier_id_key | btree | supplier_id | sim | sim |  |
| public.supplier_sub_brands | supplier_sub_brands_pkey | btree | id | sim | sim |  |
| public.supplier_sub_brands | supplier_sub_brands_supplier_id_name_key | btree | supplier_id, name | sim | sim |  |
| public.supplier_subtype_category_map | idx_fk_supplier_subtype_category_map_category_id | btree | category_id | não | sim |  |
| public.supplier_subtype_category_map | supplier_subtype_category_map_pkey | btree | id | sim | sim |  |
| public.supplier_subtype_category_map | supplier_subtype_category_map_supplier_id_subtype_desc_key | btree | supplier_id, subtype_desc | sim | sim |  |
| public.supplier_unit_conversions | supplier_unit_conversions_pkey | btree | id | sim | sim |  |
| public.supplier_unit_conversions | uq_unit_conversion | btree | supplier_id, source_unit, target_unit | sim | sim |  |
| public.supplier_value_mappings | supplier_value_mappings_pkey | btree | id | sim | sim |  |
| public.supplier_value_mappings | uq_value_mapping | btree | supplier_id, field_type, source_value | sim | sim |  |
| public.supplier_video_requirements | supplier_video_requirements_pkey | btree | id | sim | sim |  |
| public.supplier_video_requirements | supplier_video_requirements_supplier_code_key | btree | supplier_code | sim | sim |  |
| public.suppliers | idx_suppliers_priority | btree | priority, active | não | sim | `(active = true)` |
| public.suppliers | suppliers_cnpj_org_uniq | btree | organization_id, cnpj | sim | sim | `(cnpj IS NOT NULL)` |
| public.suppliers | suppliers_code_key | btree | code | sim | sim |  |
| public.suppliers | suppliers_pkey | btree | id | sim | sim |  |
| public.system_changelog | system_changelog_pkey | btree | id | sim | sim |  |
| public.system_documentation | system_documentation_pkey | btree | id | sim | sim |  |
| public.system_kill_switches | idx_system_kill_switches_updated_by | btree | updated_by | não | sim |  |
| public.system_kill_switches | system_kill_switches_pkey | btree | switch_name | sim | sim |  |
| public.system_settings | system_settings_pkey | btree | key | sim | sim |  |
| public.tabela_preco_gravacao_oficial | idx_tabela_preco_ativo | btree | ativo | não | sim |  |
| public.tabela_preco_gravacao_oficial | idx_tabela_preco_gravacao_grupo_tecnica | btree | grupo_tecnica | não | sim | `(grupo_tecnica IS NOT NULL)` |
| public.tabela_preco_gravacao_oficial | idx_tpgo_ativo_grupo | btree | ativo, grupo_tecnica | não | sim | `(ativo = true)` |
| public.tabela_preco_gravacao_oficial | tabela_preco_gravacao_oficial_codigo_unique | btree | codigo_tabela | sim | sim |  |
| public.tabela_preco_gravacao_oficial | tabela_preco_gravacao_pkey | btree | id | sim | sim |  |
| public.tabela_preco_gravacao_oficial | uq_codigo_curto | btree | codigo_curto | sim | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | idx_faixa_dimensional | btree | tabela_preco_gravacao_id, largura_min, largura_max, altura_min, altura_max, quantidade_minima | não | sim | `(largura_min IS NOT NULL)` |
| public.tabela_preco_gravacao_oficial_faixa | idx_faixa_preco_qtd | btree | quantidade_minima | não | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | idx_faixa_v11_dim | btree | tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, largura_min, largura_max, altura_min, altura_max | não | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | idx_faixa_v11_qty_max | btree | tabela_preco_gravacao_id, quantidade_maxima | não | sim | `(quantidade_maxima IS NOT NULL)` |
| public.tabela_preco_gravacao_oficial_faixa | idx_tabela_preco_faixa_quantidade | btree | quantidade_minima, quantidade_maxima | não | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | idx_tabela_preco_faixa_tabela | btree | tabela_preco_gravacao_id | não | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | idx_tpgof_tabela_qty | btree | tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, preco_unitario, prazo_dias, largura_min, largura_max, altura_min, altura_max | não | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | tabela_preco_gravacao_faixa_pkey | btree | id | sim | sim |  |
| public.tabela_preco_gravacao_oficial_faixa | uk_faixa_tabela_qtd_dimensional | btree | tabela_preco_gravacao_id, quantidade_minima, largura_min, altura_min | sim | sim |  |
| public.tags | idx_tags_slug_active | btree | slug | não | sim | `(is_active = true)` |
| public.tags | idx_tags_slug_org_unique | btree | slug, organization_id | sim | sim |  |
| public.tags | tags_organization_id_slug_key | btree | organization_id, slug | sim | sim |  |
| public.tags | tags_pkey | btree | id | sim | sim |  |
| public.target_audiences | idx_target_audiences_organization_id | btree | organization_id | não | sim |  |
| public.target_audiences | target_audiences_pkey | btree | id | sim | sim |  |
| public.target_audiences | uq_target_audience_slug | btree | slug | sim | sim |  |
| public.tecnicas_gravacao | tecnicas_gravacao_pkey | btree | codigo | sim | sim |  |
| public.tecnicas_gravacao | uq_tecnicas_gravacao_id | btree | id | sim | sim |  |
| public.user_2fa_settings | user_2fa_settings_pkey | btree | id | sim | sim |  |
| public.user_2fa_settings | user_2fa_settings_user_id_key | btree | user_id | sim | sim |  |
| public.user_allowed_ips | idx_user_allowed_ips_created_by | btree | created_by | não | sim |  |
| public.user_allowed_ips | user_allowed_ips_pkey | btree | id | sim | sim |  |
| public.user_allowed_ips | user_allowed_ips_user_ip_unique | btree | user_id, ip_address | sim | sim |  |
| public.user_comparisons | idx_user_comparisons_public | btree | is_public, share_expires_at | não | sim | `(is_public = true)` |
| public.user_comparisons | idx_user_comparisons_user | btree | user_id, updated_at | não | sim |  |
| public.user_comparisons | user_comparisons_pkey | btree | id | sim | sim |  |
| public.user_comparisons | user_comparisons_share_token_key | btree | share_token | sim | sim |  |
| public.user_favorites | idx_user_favorites_product_id | btree | product_id | não | sim |  |
| public.user_favorites | user_favorites_pkey | btree | id | sim | sim |  |
| public.user_favorites | user_favorites_user_id_product_id_key | btree | user_id, product_id | sim | sim |  |
| public.user_filter_presets | user_filter_presets_pkey | btree | id | sim | sim |  |
| public.user_ip_allowlist | idx_user_ip_allowlist_created_by | btree | created_by | não | sim |  |
| public.user_ip_allowlist | user_ip_allowlist_pkey | btree | id | sim | sim |  |
| public.user_ip_allowlist | user_ip_allowlist_user_id_ip_address_key | btree | user_id, ip_address | sim | sim |  |
| public.user_known_devices | idx_user_known_devices_user_id | btree | user_id | não | sim |  |
| public.user_known_devices | user_known_devices_pkey | btree | id | sim | sim |  |
| public.user_notification_preferences | user_notification_preferences_pkey | btree | id | sim | sim |  |
| public.user_notification_preferences | user_notification_preferences_user_category_key | btree | user_id, category | sim | sim |  |
| public.user_onboarding | user_onboarding_pkey | btree | id | sim | sim |  |
| public.user_onboarding | user_onboarding_user_id_key | btree | user_id | sim | sim |  |
| public.user_organizations | idx_user_organizations_user_org_covering | btree | user_id, organization_id | não | sim |  |
| public.user_organizations | idx_user_orgs_org | btree | organization_id | não | sim |  |
| public.user_organizations | idx_user_orgs_user | btree | user_id | não | sim |  |
| public.user_organizations | user_organizations_pkey | btree | organization_id, user_id | sim | sim |  |
| public.user_preferences | user_preferences_pkey | btree | id | sim | sim |  |
| public.user_roles | idx_user_roles_granted_by | btree | granted_by | não | sim |  |
| public.user_roles | idx_user_roles_user_id | btree | user_id | não | sim |  |
| public.user_roles | idx_user_roles_user_id_role | btree | user_id, role | não | sim | `(role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role, 'manager'::app_role]))` |
| public.user_roles | user_roles_pkey | btree | user_id, role | sim | sim |  |
| public.user_roles | user_roles_role_idx | btree | role | não | sim |  |
| public.user_search_history | uq_user_search_history_user_query | btree | user_id, query_text | sim | sim |  |
| public.user_search_history | user_search_history_pkey | btree | id | sim | sim |  |
| public.user_token_revocations | idx_token_revocations_user_id | btree | user_id, revoked_at | não | sim |  |
| public.user_token_revocations | user_token_revocations_pkey | btree | user_id | sim | sim |  |
| public.variant_commemorative_dates | idx_variant_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  |
| public.variant_commemorative_dates | idx_variant_commemorative_dates_variant_id | btree | variant_id | não | sim |  |
| public.variant_commemorative_dates | variant_commemorative_dates_pkey | btree | id | sim | sim |  |
| public.variant_commemorative_dates | variant_commemorative_dates_product_id_variant_id_commemora_key | btree | product_id, variant_id, commemorative_date_id | sim | sim |  |
| public.variant_supplier_sources | idx_variant_supplier_sources_supplier_branch_id | btree | supplier_branch_id | não | sim |  |
| public.variant_supplier_sources | idx_variant_supplier_sources_supplier_id | btree | supplier_id | não | sim |  |
| public.variant_supplier_sources | idx_vss_cost | btree | variant_id, cost_price | não | sim | `(is_active = true)` |
| public.variant_supplier_sources | idx_vss_org_supplier | btree | organization_id, supplier_id | não | sim |  |
| public.variant_supplier_sources | idx_vss_preferred | btree | variant_id | não | sim | `(is_preferred = true)` |
| public.variant_supplier_sources | idx_vss_supplier_sku_xbz | btree | supplier_sku, supplier_id | não | sim | `(supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid)` |
| public.variant_supplier_sources | idx_vss_variant_supplier_unique | btree | variant_id, supplier_id | sim | sim |  |
| public.variant_supplier_sources | variant_stocks_organization_id_variant_id_supplier_id_key | btree | organization_id, variant_id, supplier_id | sim | sim |  |
| public.variant_supplier_sources | variant_stocks_pkey | btree | id | sim | sim |  |
| public.variation_types | variation_types_organization_id_code_key | btree | organization_id, code | sim | sim |  |
| public.variation_types | variation_types_pkey | btree | id | sim | sim |  |
| public.variation_values | idx_variation_values_variation_type_id | btree | variation_type_id | não | sim |  |
| public.variation_values | variation_values_organization_id_variation_type_id_value_key | btree | organization_id, variation_type_id, value | sim | sim |  |
| public.variation_values | variation_values_pkey | btree | id | sim | sim |  |
| public.video_import_queue | idx_viq_youtube_id | btree | youtube_id | não | sim |  |
| public.video_import_queue | uq_video_queue_ytid_supplier | btree | youtube_id, source_supplier | sim | sim |  |
| public.video_import_queue | video_import_queue_pkey | btree | id | sim | sim |  |
| public.video_sim_results | video_sim_results_pkey | btree | sup, yid | sim | sim |  |
| public.video_types | video_types_code_key | btree | code | sim | sim |  |
| public.video_types | video_types_pkey | btree | id | sim | sim |  |
| public.video_validation_log | video_validation_log_pkey | btree | id | sim | sim |  |
| public.video_variant_links | video_variant_links_pkey | btree | id | sim | sim |  |
| public.visual_search_feedback | idx_visual_search_feedback_user_id | btree | user_id | não | sim |  |
| public.visual_search_feedback | visual_search_feedback_pkey | btree | id | sim | sim |  |
| public.voice_command_logs | voice_command_logs_pkey | btree | id | sim | sim |  |
| public.webhook_deliveries | idx_webhook_deliveries_hash_success | btree | payload_hash | não | sim | `((success = true) AND (payload_hash IS NOT NULL))` |
| public.webhook_deliveries | idx_webhook_deliveries_webhook_id | btree | webhook_id | não | sim |  |
| public.webhook_deliveries | webhook_deliveries_pkey | btree | id | sim | sim |  |
| public.webhook_delivery_locks | idx_webhook_deliveries_hash | btree | webhook_id, payload_hash | não | sim | `(payload_hash IS NOT NULL)` |
| public.webhook_delivery_locks | pk_webhook_delivery_locks | btree | webhook_id, payload_hash | sim | sim |  |
| public.webhook_delivery_metrics | webhook_delivery_metrics_pkey | btree | id | sim | sim |  |
| public.webhook_dispatcher_log | idx_webhook_dispatcher_log_delivery_status | btree | delivery_status, fired_at | não | sim |  |
| public.webhook_dispatcher_log | idx_webhook_dispatcher_log_fired_at | btree | fired_at | não | sim |  |
| public.webhook_dispatcher_log | idx_webhook_dispatcher_log_http_status | btree | http_status, fired_at | não | sim |  |
| public.webhook_dispatcher_log | idx_webhook_dispatcher_log_quote_id | btree | quote_id | não | sim | `(quote_id IS NOT NULL)` |
| public.webhook_dispatcher_log | webhook_dispatcher_log_pkey | btree | id | sim | sim |  |
| public.webhook_outbox | idx_webhook_outbox_pending | btree | next_attempt_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'processing'::text]))` |
| public.webhook_outbox | webhook_outbox_pkey | btree | id | sim | sim |  |
| public.webhook_request_nonces | idx_webhook_request_nonces_expires_at | btree | expires_at | não | sim |  |
| public.webhook_request_nonces | webhook_request_nonces_pkey | btree | id | sim | sim |  |
| public.webhook_request_nonces | webhook_request_nonces_source_nonce_key | btree | source, nonce | sim | sim |  |
| public.workspace_notifications | idx_workspace_notifications_user_unread | btree | user_id, is_read, created_at | não | sim |  |
| public.workspace_notifications | idx_workspace_notifications_user_unread_v2 | btree | user_id, created_at | não | sim | `(is_read = false)` |
| public.workspace_notifications | uq_workspace_notifications_idempotency | btree | idempotency_key | sim | sim |  |
| public.workspace_notifications | workspace_notifications_pkey | btree | id | sim | sim |  |
| public.xbz_gallery_staging | idx_xbz_staging_status | btree | status, created_at | não | sim |  |
| public.xbz_gallery_staging | uq_xbz_staging_cf_id | btree | cf_custom_id | sim | sim | `(cf_custom_id IS NOT NULL)` |
| public.xbz_gallery_staging | uq_xbz_staging_sku_source_url | btree | sku, source_url | sim | sim |  |
| public.xbz_gallery_staging | xbz_gallery_staging_pkey | btree | id | sim | sim |  |
| public.xbz_upload_mapping | idx_xbz_upload_mapping_created_at | btree | created_at | não | sim |  |
| public.xbz_upload_mapping | idx_xbz_upload_mapping_request_id | btree | request_id | não | sim |  |
| public.xbz_upload_mapping | idx_xbz_upload_mapping_status | btree | status | não | sim |  |
| public.xbz_upload_mapping | xbz_upload_mapping_pkey | btree | id | sim | sim |  |
| supplier_stricker.canceled_products | canceled_products_pkey | btree | id | sim | sim |  |
| supplier_stricker.canceled_products | canceled_products_prod_reference_key | btree | prod_reference | sim | sim |  |
| supplier_stricker.canceled_products | idx_stricker_canceled_date | btree | canceled_at | não | sim |  |
| supplier_stricker.category_mappings | category_mappings_pkey | btree | id | sim | sim |  |
| supplier_stricker.category_mappings | category_mappings_unique_idx | btree | type_code | sim | sim |  |
| supplier_stricker.category_mappings | idx_ss_category_mappings_category_id | btree | category_id | não | sim |  |
| supplier_stricker.colors | colors_color_code_key | btree | color_code | sim | sim |  |
| supplier_stricker.colors | colors_pkey | btree | id | sim | sim |  |
| supplier_stricker.colors | idx_stricker_colors_name | btree | color_name | não | sim |  |
| supplier_stricker.customization_options | customization_options_pkey | btree | id | sim | sim |  |
| supplier_stricker.customization_options | customization_options_serv_code_key | btree | serv_code | sim | sim |  |
| supplier_stricker.customization_options | idx_stricker_custom_active | btree | is_active | não | sim |  |
| supplier_stricker.customization_options | idx_stricker_custom_ref | btree | prod_reference | não | sim |  |
| supplier_stricker.customization_options | idx_stricker_custom_tech | btree | technique_code | não | sim |  |
| supplier_stricker.customization_tables | customization_tables_pkey | btree | id | sim | sim |  |
| supplier_stricker.customization_tables | customization_tables_table_code_key | btree | table_code | sim | sim |  |
| supplier_stricker.customization_tables | idx_stricker_tables_active | btree | is_active | não | sim |  |
| supplier_stricker.customization_tables | idx_stricker_tables_tech | btree | technique_code | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_active | btree | is_active | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_color | btree | color_code | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_ref | btree | prod_reference | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_size | btree | size | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_synced | btree | synced_at | não | sim |  |
| supplier_stricker.optionals | idx_stricker_optionals_websku | btree | web_sku | não | sim |  |
| supplier_stricker.optionals | optionals_pkey | btree | id | sim | sim |  |
| supplier_stricker.optionals | optionals_sku_key | btree | sku | sim | sim |  |
| supplier_stricker.product_types | idx_stricker_types_code | btree | type_code | não | sim |  |
| supplier_stricker.product_types | idx_stricker_types_level | btree | level | não | sim |  |
| supplier_stricker.product_types | idx_stricker_types_subtype | btree | subtype_code | não | sim |  |
| supplier_stricker.product_types | product_types_pkey | btree | id | sim | sim |  |
| supplier_stricker.product_types | product_types_type_code_subtype_code_key | btree | type_code, subtype_code | sim | sim |  |
| supplier_stricker.products | products_pkey | btree | id | sim | sim |  |
| supplier_stricker.products | products_prod_reference_key | btree | prod_reference | sim | sim |  |
| supplier_stricker.stg_colors | stg_colors_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_colors | stg_colors_stricker_ref_key | btree | stricker_ref | sim | sim |  |
| supplier_stricker.stg_customizations | stg_customizations_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_customizations | stg_customizations_stricker_ref_key | btree | stricker_ref | sim | sim |  |
| supplier_stricker.stg_images | stg_images_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_optionals | stg_optionals_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_optionals | stg_optionals_processed_idx | btree | processed | não | sim |  |
| supplier_stricker.stg_optionals | stg_optionals_prod_reference_idx | btree | prod_reference | não | sim |  |
| supplier_stricker.stg_optionals | stg_optionals_unique_idx | btree | prod_reference, sku | sim | sim |  |
| supplier_stricker.stg_product_types | idx_ss_stg_product_types_mapped_to_category_id | btree | mapped_to_category_id | não | sim |  |
| supplier_stricker.stg_product_types | stg_product_types_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_product_types | stg_product_types_stricker_ref_key | btree | stricker_ref | sim | sim |  |
| supplier_stricker.stg_products | stg_products_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_products | stg_products_processed_idx | btree | processed | não | sim |  |
| supplier_stricker.stg_products | stg_products_prod_reference_uidx | btree | prod_reference | sim | sim |  |
| supplier_stricker.stg_stock | stg_stock_pkey | btree | id | sim | sim |  |
| supplier_stricker.stg_stock | stg_stock_sku_uidx | btree | sku | sim | sim |  |
| supplier_stricker.stocks | idx_stricker_stocks_qty | btree | stock_quantity | não | sim |  |
| supplier_stricker.stocks | idx_stricker_stocks_synced | btree | last_sync_at | não | sim |  |
| supplier_stricker.stocks | stocks_pkey | btree | id | sim | sim |  |
| supplier_stricker.stocks | stocks_sku_key | btree | sku | sim | sim |  |
| supplier_stricker.sync_log | idx_stricker_synclog_started | btree | started_at | não | sim |  |
| supplier_stricker.sync_log | idx_stricker_synclog_status | btree | status | não | sim |  |
| supplier_stricker.sync_log | idx_stricker_synclog_type | btree | sync_type | não | sim |  |
| supplier_stricker.sync_log | sync_log_pkey | btree | id | sim | sim |  |
