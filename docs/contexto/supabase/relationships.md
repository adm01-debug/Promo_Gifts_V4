# Relacionamentos (chaves estrangeiras)


| de | colunas | para | colunas | on delete | on update |
|---|---|---|---|---|---|
| public.admin_settings | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.ai_enrichment_queue | product_id | public.products | id | CASCADE | NO ACTION |
| public.ai_function_routing | primary_model_id | public.ai_models | id | RESTRICT | NO ACTION |
| public.ai_function_routing | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.ai_models | provider_id | public.ai_providers | id | CASCADE | NO ACTION |
| public.ai_providers | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.ai_providers | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.ai_routing_decisions | final_model_id | public.ai_models | id | NO ACTION | NO ACTION |
| public.ai_routing_decisions | final_provider_id | public.ai_providers | id | NO ACTION | NO ACTION |
| public.ai_routing_decisions | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.ai_usage_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.asia_image_import_queue | product_id | public.products | id | NO ACTION | NO ACTION |
| public.asia_image_import_queue | variant_id | public.product_variants | id | NO ACTION | NO ACTION |
| public.attribute_definitions | group_id | public.attribute_groups | id | NO ACTION | NO ACTION |
| public.attribute_definitions | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.attribute_equivalences | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.attribute_equivalences | verified_by | auth.users | id | NO ACTION | NO ACTION |
| public.attribute_groups | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_log | user_id | public.profiles | id | SET NULL | NO ACTION |
| public.b2b_collection_products | b2b_collection_id | public.b2b_collections | id | CASCADE | NO ACTION |
| public.b2b_collection_products | product_id | public.products | id | CASCADE | NO ACTION |
| public.b2b_collections | created_by | auth.users | id | SET NULL | NO ACTION |
| public.b2b_collections | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.cart_templates | user_id | auth.users | id | CASCADE | NO ACTION |
| public.catalog_analytics | user_id | auth.users | id | SET NULL | NO ACTION |
| public.categories | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.categories | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.categories | parent_id | public.categories | id | SET NULL | NO ACTION |
| public.categories | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.category_accessory_categories | accessory_category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_accessory_categories | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_ancestors | ancestor_id | public.categories | id | CASCADE | CASCADE |
| public.category_ancestors | descendant_id | public.categories | id | CASCADE | CASCADE |
| public.category_attributes | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_colors | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_colors | color_group_id | public.color_groups | id | CASCADE | NO ACTION |
| public.category_commemorative_dates | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_commemorative_dates | commemorative_date_id | public.commemorative_dates | id | CASCADE | NO ACTION |
| public.category_copywriting_config | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_target_audiences | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_target_audiences | target_audience_id | public.target_audiences | id | CASCADE | NO ACTION |
| public.category_variation_types | category_id | public.categories | id | CASCADE | NO ACTION |
| public.category_variation_types | variation_type_id | public.variation_types | id | CASCADE | NO ACTION |
| public.collection_items | collection_id | public.collections | id | CASCADE | NO ACTION |
| public.collection_products | collection_id | public.collections | id | CASCADE | NO ACTION |
| public.collection_products | product_id | public.products | id | CASCADE | NO ACTION |
| public.color_equivalences | promo_nuance_id | public.color_nuances | id | SET NULL | NO ACTION |
| public.color_equivalences | promo_variation_id | public.color_variations | id | CASCADE | NO ACTION |
| public.color_equivalences | supplier_color_id | public.supplier_colors | id | CASCADE | NO ACTION |
| public.color_synonym_map | canonical_color_id | public.color_variations | id | NO ACTION | NO ACTION |
| public.color_synonym_map | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.color_variations | color_group_id | public.color_groups | id | NO ACTION | NO ACTION |
| public.color_variations | group_id | public.color_groups | id | NO ACTION | NO ACTION |
| public.color_variations | nuance_id | public.color_nuances | id | NO ACTION | NO ACTION |
| public.commemorative_date_colors | color_group_id | public.color_groups | id | CASCADE | NO ACTION |
| public.commemorative_date_colors | commemorative_date_id | public.commemorative_dates | id | CASCADE | NO ACTION |
| public.commemorative_date_exclusions | commemorative_date_id | public.commemorative_dates | id | CASCADE | NO ACTION |
| public.commemorative_date_exclusions | product_id | public.products | id | CASCADE | NO ACTION |
| public.commemorative_date_exclusions | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.commemorative_dates | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.connection_test_history | connection_id | public.external_connections | id | CASCADE | NO ACTION |
| public.content_articles | author_id | auth.users | id | SET NULL | NO ACTION |
| public.custom_kits | user_id | auth.users | id | CASCADE | NO ACTION |
| public.device_login_notifications | user_id | auth.users | id | CASCADE | NO ACTION |
| public.discount_approval_audit | actor_id | public.profiles | user_id | SET NULL | NO ACTION |
| public.discount_approval_audit | request_id | public.discount_approval_requests | id | CASCADE | NO ACTION |
| public.discount_approval_requests | admin_id | public.profiles | user_id | SET NULL | NO ACTION |
| public.discount_approval_requests | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.discount_approval_requests | seller_id | public.profiles | user_id | NO ACTION | NO ACTION |
| public.eco_material_config | material_id | public.material_types | id | CASCADE | NO ACTION |
| public.edge_function_invocations | invoked_by | auth.users | id | SET NULL | NO ACTION |
| public.enrichment_log | contact_id | public.enriched_contacts | id | SET NULL | NO ACTION |
| public.favorite_item_reactions | item_id | public.favorite_items | id | CASCADE | NO ACTION |
| public.favorite_item_reactions | list_id | public.favorite_lists | id | CASCADE | NO ACTION |
| public.favorite_items | list_id | public.favorite_lists | id | CASCADE | NO ACTION |
| public.favorite_items | product_id | public.products | id | CASCADE | NO ACTION |
| public.favorite_items | user_id | auth.users | id | CASCADE | NO ACTION |
| public.favorite_items_trash | user_id | auth.users | id | CASCADE | NO ACTION |
| public.favorite_lists | user_id | auth.users | id | CASCADE | NO ACTION |
| public.feminine_color_config | color_group_id | public.color_groups | id | CASCADE | NO ACTION |
| public.file_scan_logs | user_id | auth.users | id | CASCADE | NO ACTION |
| public.frontend_telemetry | user_id | auth.users | id | SET NULL | NO ACTION |
| public.generated_mockups | approved_by_user_id | auth.users | id | SET NULL | NO ACTION |
| public.generated_mockups | job_id | public.mockup_generation_jobs | id | CASCADE | NO ACTION |
| public.generated_mockups | product_id | public.products | id | SET NULL | NO ACTION |
| public.generated_mockups | technique_id | public.personalization_techniques | id | SET NULL | NO ACTION |
| public.generated_mockups | user_id | auth.users | id | CASCADE | NO ACTION |
| public.geo_allowed_countries | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.image_backfill_queue | product_image_id | public.product_images | id | CASCADE | NO ACTION |
| public.inbound_webhook_endpoints | created_by | auth.users | id | SET NULL | NO ACTION |
| public.inbound_webhook_events | endpoint_id | public.inbound_webhook_endpoints | id | CASCADE | NO ACTION |
| public.included_packaging_print_areas | packaging_id | public.product_included_packagings | id | CASCADE | NO ACTION |
| public.included_packaging_techniques | packaging_id | public.product_included_packagings | id | CASCADE | NO ACTION |
| public.included_packaging_techniques | technique_id | public.personalization_techniques | id | NO ACTION | NO ACTION |
| public.integration_credentials | created_by | auth.users | id | SET NULL | NO ACTION |
| public.integration_credentials | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.ip_access_control | created_by | auth.users | id | SET NULL | NO ACTION |
| public.kit_collaborators | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_comments | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_comments | parent_id | public.kit_comments | id | CASCADE | NO ACTION |
| public.kit_component_enrichment_raw | imported_by | auth.users | id | NO ACTION | NO ACTION |
| public.kit_component_enrichment_raw | kit_component_id | public.product_kit_components | id | SET NULL | NO ACTION |
| public.kit_component_enrichment_raw | kit_product_id | public.products | id | CASCADE | NO ACTION |
| public.kit_component_enrichment_raw | promoted_component_id | public.product_kit_components | id | SET NULL | NO ACTION |
| public.kit_component_enrichment_raw | promoted_padronizacao_id | public.kit_component_padronizacao | id | SET NULL | NO ACTION |
| public.kit_component_padronizacao | raw_id | public.kit_component_enrichment_raw | id | SET NULL | NO ACTION |
| public.kit_component_padronizacao | component_product_id | public.products | id | SET NULL | NO ACTION |
| public.kit_component_padronizacao | component_type_code | public.kit_component_types | code | NO ACTION | NO ACTION |
| public.kit_component_padronizacao | kit_component_id | public.product_kit_components | id | SET NULL | NO ACTION |
| public.kit_component_padronizacao | kit_product_id | public.products | id | CASCADE | NO ACTION |
| public.kit_component_padronizacao | material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.kit_component_padronizacao | pkg_type_code | public.kit_component_types | code | NO ACTION | NO ACTION |
| public.kit_component_padronizacao | reviewed_by | auth.users | id | NO ACTION | NO ACTION |
| public.kit_component_padronizacao | secondary_material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.kit_component_print_areas | kit_component_id | public.product_kit_components | id | CASCADE | NO ACTION |
| public.kit_component_print_areas | tabela_preco_id | public.tabela_preco_gravacao_oficial | id | NO ACTION | NO ACTION |
| public.kit_component_types | default_material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.kit_component_types | secondary_material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.kit_component_variant_skus | component_id | public.product_kit_components | id | CASCADE | NO ACTION |
| public.kit_component_variant_skus | item_color_id | public.color_variations | id | NO ACTION | NO ACTION |
| public.kit_component_variant_skus | kit_product_id | public.products | id | CASCADE | NO ACTION |
| public.kit_component_variant_skus | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.kit_quote_requests | quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.kit_quote_requests | user_id | auth.users | id | CASCADE | NO ACTION |
| public.kit_save_requests | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_save_requests | user_id | auth.users | id | CASCADE | NO ACTION |
| public.kit_share_tokens | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_templates | created_by | auth.users | id | SET NULL | NO ACTION |
| public.kit_variants | kit_master_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.login_attempts | user_id | auth.users | id | SET NULL | NO ACTION |
| public.magazine_duplicate_requests | actor_id | auth.users | id | CASCADE | NO ACTION |
| public.magazine_duplicate_requests | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_duplicate_requests | source_magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_items | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_reactions | item_id | public.magazine_items | id | CASCADE | NO ACTION |
| public.magazine_public_reactions | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_07 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_08 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_09 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_10 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_11 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2026_12 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2027_01 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_2027_02 | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_public_view_events_default | magazine_id | public.magazines | id | CASCADE | NO ACTION |
| public.magazine_reader_state | user_id | auth.users | id | SET NULL | NO ACTION |
| public.magazine_templates | organization_id | public.organizations | id | SET NULL | NO ACTION |
| public.magazine_templates | owner_id | auth.users | id | CASCADE | NO ACTION |
| public.magazine_templates | template_id | public.magazine_templates_catalog | template_id | NO ACTION | NO ACTION |
| public.magazines | organization_id | public.organizations | id | SET NULL | NO ACTION |
| public.magazines | owner_id | auth.users | id | CASCADE | NO ACTION |
| public.magazines | template_id | public.magazine_templates_catalog | template_id | NO ACTION | NO ACTION |
| public.markup_configurations | category_id | public.categories | id | CASCADE | NO ACTION |
| public.markup_configurations | created_by | public.profiles | id | NO ACTION | NO ACTION |
| public.markup_configurations | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.markup_configurations | product_id | public.products | id | CASCADE | NO ACTION |
| public.markup_configurations | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.markup_configurations | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.material_equivalences | promo_group_id | public.material_groups | id | SET NULL | NO ACTION |
| public.material_equivalences | promo_type_id | public.material_types | id | SET NULL | NO ACTION |
| public.material_equivalences | promo_variation_id | public.material_variations | id | SET NULL | NO ACTION |
| public.material_equivalences | supplier_material_id | public.supplier_materials | id | CASCADE | NO ACTION |
| public.material_groups | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.material_types | group_id | public.material_groups | id | CASCADE | NO ACTION |
| public.material_types | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.material_variations | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.material_variations | type_id | public.material_types | id | CASCADE | NO ACTION |
| public.mcp_api_keys | rotated_from | public.mcp_api_keys | id | SET NULL | NO ACTION |
| public.mcp_key_auto_revocations | key_id | public.mcp_api_keys | id | CASCADE | NO ACTION |
| public.mockup_approval_links | job_id | public.mockup_generation_jobs | id | CASCADE | NO ACTION |
| public.mockup_credit_transactions | credit_account_id | public.mockup_credits | id | CASCADE | NO ACTION |
| public.mockup_credit_transactions | job_id | public.mockup_generation_jobs | id | SET NULL | NO ACTION |
| public.mockup_credit_transactions | mockup_id | public.generated_mockups | id | SET NULL | NO ACTION |
| public.mockup_credit_transactions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.mockup_credits | user_id | auth.users | id | CASCADE | NO ACTION |
| public.mockup_generation_jobs | product_id | public.products | id | SET NULL | NO ACTION |
| public.mockup_generation_jobs | technique_id | public.personalization_techniques | id | SET NULL | NO ACTION |
| public.mockup_generation_jobs | user_id | auth.users | id | CASCADE | NO ACTION |
| public.mockup_templates | default_technique_id | public.personalization_techniques | id | SET NULL | NO ACTION |
| public.mockup_templates | product_id | public.products | id | CASCADE | NO ACTION |
| public.navigation_analytics | user_id | auth.users | id | SET NULL | NO ACTION |
| public.optimization_queue_runs | queue_id | public.optimization_queue | id | CASCADE | NO ACTION |
| public.order_items | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_items | product_id | public.products | id | NO ACTION | NO ACTION |
| public.orders | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.orders | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.orders | seller_id | auth.users | id | SET NULL | NO ACTION |
| public.organization_members | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.packagings | packaging_type_id | public.packaging_types | id | NO ACTION | NO ACTION |
| public.password_reset_requests | reviewed_by | auth.users | id | NO ACTION | NO ACTION |
| public.password_reset_requests | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.personalization_simulations | product_id | public.products | id | SET NULL | NO ACTION |
| public.personalization_simulations | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.personalization_technique_mappings | personalization_tech_id | public.personalization_techniques | id | CASCADE | NO ACTION |
| public.personalization_technique_mappings | tecnica_gravacao_codigo | public.tecnicas_gravacao | codigo | RESTRICT | NO ACTION |
| public.pipeline_known_issues | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.price_history | changed_by | public.profiles | id | NO ACTION | NO ACTION |
| public.price_history | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.print_area_techniques | product_id | public.products | id | NO ACTION | NO ACTION |
| public.print_area_techniques | tabela_preco_id | public.tabela_preco_gravacao_oficial | id | NO ACTION | NO ACTION |
| public.product_ai_content | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_ai_history | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_attributes | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_category_assignments | category_id | public.categories | id | CASCADE | NO ACTION |
| public.product_category_assignments | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_commemorative_dates | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.product_commemorative_dates | commemorative_date_id | public.commemorative_dates | id | CASCADE | NO ACTION |
| public.product_commemorative_dates | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_component_location_techniques | component_location_id | public.product_component_locations | id | CASCADE | NO ACTION |
| public.product_component_location_techniques | technique_id | public.personalization_techniques | id | RESTRICT | NO ACTION |
| public.product_component_locations | component_id | public.product_components | id | CASCADE | NO ACTION |
| public.product_customization_prices | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_deactivation_requests | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.product_deactivation_requests | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_deactivation_requests | rejected_by | auth.users | id | NO ACTION | NO ACTION |
| public.product_deactivation_requests | requested_by | auth.users | id | NO ACTION | NO ACTION |
| public.product_deactivation_requests | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.product_deactivation_tokens | request_id | public.product_deactivation_requests | id | NO ACTION | NO ACTION |
| public.product_deactivation_tokens | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_faqs | category_id | public.categories | id | CASCADE | NO ACTION |
| public.product_faqs | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_fiscal | ncm_id | public.ncm_codes | id | SET NULL | NO ACTION |
| public.product_fiscal | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_group_components | product_group_id | public.product_groups | id | CASCADE | NO ACTION |
| public.product_group_location_techniques | group_location_id | public.product_group_locations | id | CASCADE | NO ACTION |
| public.product_group_location_techniques | technique_id | public.personalization_techniques | id | RESTRICT | NO ACTION |
| public.product_group_locations | group_component_id | public.product_group_components | id | CASCADE | NO ACTION |
| public.product_group_members | product_group_id | public.product_groups | id | CASCADE | NO ACTION |
| public.product_images | image_type_id | public.image_types | id | NO ACTION | NO ACTION |
| public.product_images | canonical_image_id | public.product_images | id | SET NULL | NO ACTION |
| public.product_images | color_id | public.color_variations | id | SET NULL | NO ACTION |
| public.product_images | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.product_images | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_images | variant_id | public.product_variants | id | SET NULL | NO ACTION |
| public.product_included_packagings | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_included_packagings | supplier_id | public.suppliers | id | SET NULL | NO ACTION |
| public.product_kit_components | color_id | public.color_variations | id | NO ACTION | NO ACTION |
| public.product_kit_components | component_product_id | public.products | id | CASCADE | NO ACTION |
| public.product_kit_components | component_type_code | public.kit_component_types | code | NO ACTION | NO ACTION |
| public.product_kit_components | kit_product_id | public.products | id | CASCADE | NO ACTION |
| public.product_kit_components | material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.product_kit_components | padronizacao_id | public.kit_component_padronizacao | id | SET NULL | NO ACTION |
| public.product_kit_components | secondary_material_type_id | public.material_types | id | NO ACTION | NO ACTION |
| public.product_materials | material_id | public.material_types | id | CASCADE | NO ACTION |
| public.product_materials | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_notebook_features | feature_id | public.notebook_features | id | CASCADE | NO ACTION |
| public.product_notebook_features | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_notebook_specs | binding_color_id | public.binding_colors | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | binding_type_id | public.binding_types | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | cover_finish_id | public.cover_finishes | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | cover_material_id | public.cover_materials | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | cover_type_id | public.cover_types | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | paper_color_id | public.paper_colors | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | paper_format_id | public.paper_formats | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | paper_ruling_id | public.paper_rulings | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | paper_weight_id | public.paper_weights | id | NO ACTION | NO ACTION |
| public.product_notebook_specs | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_novelties | created_by | public.profiles | id | SET NULL | NO ACTION |
| public.product_novelties | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_novelties | supplier_id | public.suppliers | id | SET NULL | NO ACTION |
| public.product_packaging | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_packaging_compatibility | packaging_id | public.products | id | CASCADE | NO ACTION |
| public.product_packaging_compatibility | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_packagings | packaging_id | public.packagings | id | CASCADE | NO ACTION |
| public.product_packagings | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_physical | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_price_freshness_overrides | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.product_print_positions | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_properties | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_properties | property_definition_id | public.property_definitions | id | NO ACTION | NO ACTION |
| public.product_qa_image_alerts | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_relationships | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_relationships | related_product_id | public.products | id | CASCADE | NO ACTION |
| public.product_seo | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_similarity_group_members | group_id | public.product_similarity_groups | id | CASCADE | NO ACTION |
| public.product_similarity_group_members | product_id | public.products | id | NO ACTION | NO ACTION |
| public.product_similarity_group_members | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.product_similarity_groups | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.product_supply | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_tags | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_tags | tag_id | public.tags | id | CASCADE | NO ACTION |
| public.product_target_audiences | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.product_target_audiences | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_target_audiences | target_audience_id | public.target_audiences | id | CASCADE | NO ACTION |
| public.product_variants | color_id | public.color_variations | id | NO ACTION | NO ACTION |
| public.product_variants | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_variants | size_id | public.variation_values | id | NO ACTION | NO ACTION |
| public.product_videos | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.product_videos | product_id | public.products | id | CASCADE | NO ACTION |
| public.product_videos | video_type_id | public.video_types | id | NO ACTION | NO ACTION |
| public.product_views | product_id | public.products | id | CASCADE | NO ACTION |
| public.products | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.products | main_category_id | public.categories | id | NO ACTION | NO ACTION |
| public.products | ncm_id | public.ncm_codes | id | NO ACTION | NO ACTION |
| public.products | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.products | padronizacao_id | public.produtos_padronizacao | id | SET NULL | NO ACTION |
| public.products | sub_brand_id | public.supplier_sub_brands | id | NO ACTION | NO ACTION |
| public.products | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.produto_ramo_atividade | produto_id | public.products | id | CASCADE | NO ACTION |
| public.produto_ramo_atividade | ramo_atividade_filho_id | public.ramo_atividade_filho | id | CASCADE | NO ACTION |
| public.produtos_padronizacao | product_id | public.products | id | SET NULL | NO ACTION |
| public.produtos_padronizacao | raw_id | public.supplier_products_raw | id | SET NULL | NO ACTION |
| public.produtos_padronizacao | sub_brand_id | public.supplier_sub_brands | id | NO ACTION | NO ACTION |
| public.produtos_padronizacao | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.produtos_padronizacao_variantes | color_id_2 | public.color_variations | id | SET NULL | NO ACTION |
| public.produtos_padronizacao_variantes | pad_id | public.produtos_padronizacao | id | SET NULL | NO ACTION |
| public.produtos_padronizacao_variantes | raw_id | public.supplier_products_raw | id | SET NULL | NO ACTION |
| public.produtos_padronizacao_variantes | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.produtos_padronizacao_variantes | variant_id | public.product_variants | id | SET NULL | NO ACTION |
| public.produtos_site_padronizacao | product_id | public.products | id | SET NULL | NO ACTION |
| public.produtos_site_padronizacao | raw_id | public.supplier_products_raw | id | SET NULL | NO ACTION |
| public.profiles | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.profiles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.quote_approval_tokens | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.quote_history | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_history | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.quote_item_personalizations | quote_item_id | public.quote_items | id | CASCADE | NO ACTION |
| public.quote_items | product_id | public.products | id | SET NULL | NO ACTION |
| public.quote_items | product_variant_id | public.product_variants | id | SET NULL | NO ACTION |
| public.quote_items | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_items | selected_packaging_id | public.products | id | SET NULL | NO ACTION |
| public.quote_templates | created_by | auth.users | id | SET NULL | NO ACTION |
| public.quote_versions | created_by | auth.users | id | SET NULL | NO ACTION |
| public.quote_versions | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quotes | assigned_to | public.profiles | user_id | SET NULL | NO ACTION |
| public.quotes | created_by | public.profiles | user_id | SET NULL | NO ACTION |
| public.quotes | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.quotes | parent_quote_id | public.quotes | id | SET NULL | NO ACTION |
| public.quotes | seller_id | public.profiles | user_id | NO ACTION | NO ACTION |
| public.ramo_atividade_filho | ramo_atividade_id | public.ramo_atividade | id | CASCADE | NO ACTION |
| public.role_permissions | permission_code | public.permissions | code | CASCADE | NO ACTION |
| public.sales_goals | user_id | auth.users | id | CASCADE | NO ACTION |
| public.search_queries | clicked_product_id | public.products | id | SET NULL | NO ACTION |
| public.secret_rotation_log | rotated_by | auth.users | id | SET NULL | NO ACTION |
| public.seller_cart_items | cart_id | public.seller_carts | id | CASCADE | NO ACTION |
| public.seller_carts | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.seller_discount_limits | set_by | public.profiles | user_id | SET NULL | NO ACTION |
| public.seller_discount_limits | user_id | public.profiles | user_id | CASCADE | NO ACTION |
| public.sm_site_url_map | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.stock_daily_summary | product_id | public.products | id | CASCADE | NO ACTION |
| public.stock_daily_summary | supplier_branch_id | public.supplier_branches | id | NO ACTION | NO ACTION |
| public.stock_daily_summary | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.stock_daily_summary | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.stock_daily_summary | variant_supplier_source_id | public.variant_supplier_sources | id | CASCADE | NO ACTION |
| public.stock_notes | created_by | auth.users | id | CASCADE | NO ACTION |
| public.stock_notes | supplier_id | public.suppliers | id | SET NULL | NO ACTION |
| public.stock_notes | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.stock_snapshots | product_id | public.products | id | CASCADE | NO ACTION |
| public.stock_snapshots | supplier_branch_id | public.supplier_branches | id | NO ACTION | NO ACTION |
| public.stock_snapshots | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.stock_snapshots | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.stock_snapshots | variant_supplier_source_id | public.variant_supplier_sources | id | CASCADE | NO ACTION |
| public.supplier_attribute_definitions | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.supplier_attribute_definitions | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_branches | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_categories | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_category_mappings | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.supplier_category_mappings | supplier_category_id | public.supplier_categories | id | NO ACTION | NO ACTION |
| public.supplier_colors | color_variation_id | public.color_variations | id | NO ACTION | NO ACTION |
| public.supplier_colors | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_customization_raw | import_batch_id | public.supplier_import_batches | id | SET NULL | NO ACTION |
| public.supplier_customization_raw | supplier_id | public.suppliers | id | RESTRICT | NO ACTION |
| public.supplier_field_mappings | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_field_priority | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_import_batches | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_materials | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_packagings | packaging_id | public.packagings | id | CASCADE | NO ACTION |
| public.supplier_packagings | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_products_raw | import_batch_id | public.supplier_import_batches | id | SET NULL | NO ACTION |
| public.supplier_products_raw | product_id | public.products | id | SET NULL | NO ACTION |
| public.supplier_products_raw | supplier_id | public.suppliers | id | RESTRICT | NO ACTION |
| public.supplier_products_raw | variant_id | public.product_variants | id | SET NULL | NO ACTION |
| public.supplier_property_mappings | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_settings | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.supplier_sub_brands | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_subtype_category_map | category_id | public.categories | id | NO ACTION | NO ACTION |
| public.supplier_unit_conversions | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.supplier_value_mappings | supplier_id | public.suppliers | id | NO ACTION | NO ACTION |
| public.suppliers | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.system_kill_switches | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.tabela_preco_gravacao_oficial | grupo_tecnica | public.tecnicas_gravacao | codigo | NO ACTION | NO ACTION |
| public.tabela_preco_gravacao_oficial_faixa | tabela_preco_gravacao_id | public.tabela_preco_gravacao_oficial | id | CASCADE | NO ACTION |
| public.tags | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.target_audiences | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.user_2fa_settings | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_allowed_ips | created_by | auth.users | id | SET NULL | NO ACTION |
| public.user_allowed_ips | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_favorites | product_id | public.products | id | CASCADE | NO ACTION |
| public.user_ip_allowlist | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.user_ip_allowlist | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_known_devices | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_notification_preferences | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_onboarding | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_organizations | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.user_roles | granted_by | auth.users | id | SET NULL | NO ACTION |
| public.user_roles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_roles | user_id | public.profiles | user_id | CASCADE | NO ACTION |
| public.variant_commemorative_dates | commemorative_date_id | public.commemorative_dates | id | CASCADE | NO ACTION |
| public.variant_commemorative_dates | product_id | public.products | id | CASCADE | NO ACTION |
| public.variant_commemorative_dates | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.variant_supplier_sources | supplier_id | public.suppliers | id | CASCADE | NO ACTION |
| public.variant_supplier_sources | variant_id | public.product_variants | id | CASCADE | NO ACTION |
| public.variant_supplier_sources | supplier_branch_id | public.supplier_branches | id | NO ACTION | NO ACTION |
| public.variation_values | variation_type_id | public.variation_types | id | CASCADE | NO ACTION |
| public.visual_search_feedback | user_id | auth.users | id | SET NULL | NO ACTION |
| public.webhook_deliveries | webhook_id | public.outbound_webhooks | id | CASCADE | NO ACTION |
| public.webhook_delivery_locks | webhook_id | public.outbound_webhooks | id | CASCADE | NO ACTION |
| public.webhook_dispatcher_log | quote_id | public.quotes | id | SET NULL | NO ACTION |
| public.workspace_notifications | user_id | auth.users | id | CASCADE | NO ACTION |
| supplier_stricker.category_mappings | category_id | public.categories | id | NO ACTION | NO ACTION |
| supplier_stricker.customization_options | prod_reference | supplier_stricker.products | prod_reference | CASCADE | NO ACTION |
| supplier_stricker.optionals | prod_reference | supplier_stricker.products | prod_reference | CASCADE | NO ACTION |
| supplier_stricker.stg_product_types | mapped_to_category_id | public.categories | id | NO ACTION | NO ACTION |
| supplier_stricker.stocks | sku | supplier_stricker.optionals | sku | CASCADE | NO ACTION |


_Diagrama omitido: mais de 120 tabelas._
