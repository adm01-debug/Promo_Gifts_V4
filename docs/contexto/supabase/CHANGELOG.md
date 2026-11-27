# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-27 20:18 UTC

- **functions** alterado (44): `public.admin_execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.check_login_rate_limit(_email text, _ip text)`, `public.claim_next_optimization()`, `public.complete_optimization(_id uuid, _status text, _notes text, _guardrail_status text, _result jsonb, _error text)`, `public.enqueue_optimization(_title text, _description text, _category text, _priority integer)`, `public.fn_admin_ai_quota_summary(_search text, _limit integer)`, `public.fn_admin_anon_access_audit()`, `public.fn_admin_classification_apply(_dry_run boolean, _min_matches integer)`, `public.fn_admin_classification_suggestions(_search text, _somente_gaps boolean, _min_matches integer, _limit integer)`, `public.fn_admin_classification_summary()`, `public.fn_admin_link_crm_seller(_crm_seller_id bigint, _auth_user_id uuid, _email text)`, `public.fn_admin_list_crm_seller_links(_search text, _limit integer)`, `public.fn_admin_run_smoke_tests()`, `public.fn_admin_smoke_tests_dashboard()`, `public.fn_admin_sync_external_connections()`, `public.fn_admin_unlink_crm_seller(_auth_user_id uuid)`, `public.fn_anon_catalog_grant_audit_run()`, `public.fn_auto_assign_org_on_profile()`, `public.fn_dev_medallion_health()`, `public.fn_dev_ops_infra_telemetry(_days integer, _top integer)`, `public.fn_ema_coverage_stats()`, `public.fn_ensure_history_partitions(p_months_ahead integer)`, `public.fn_get_rupture_alerts()`, `public.fn_get_supplier_reliability()`, `public.fn_global_search(p_term text, p_limit integer, p_types text[])`, `public.fn_insights_cache_count(p_function_name text, p_since timestamp with time zone)`, `public.fn_product_active_for_rls(p_id uuid)`, `public.fn_qa_check_image_coverage()`, `public.fn_qa_scan_imageless_products()`, `public.fn_ruptura_forecast_7_15_30()`, `public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text)`, `public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean)`, `public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean)`, `public.fn_supplier_risk_breakdown(p_preferred_only boolean)`, `public.fn_variant_sparkline(p_variant_id uuid, p_days integer)`, `public.fn_verify_anon_catalog_grants()`, `public.fn_whatif_scenario(p_delta_units_per_sku numeric, p_nivel_filter text, p_supplier_id uuid)`, `public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer)`, `public.get_edge_function_secret(_name text)`, `public.get_quote_token_public(_token text)` … (+4)
- **indexes** adicionado (51): `public.idx_fk_asia_image_import_queue_variant_id`, `public.idx_fk_categories_parent_id`, `public.idx_fk_frontend_telemetry_user_id`, `public.idx_fk_inbound_webhook_events_endpoint_id`, `public.idx_fk_kit_component_enrichment_raw_kit_component_id`, `public.idx_fk_kit_component_enrichment_raw_kit_product_id`, `public.idx_fk_kit_component_enrichment_raw_promoted_component_id`, `public.idx_fk_kit_component_enrichment_raw_promoted_padronizacao_id`, `public.idx_fk_kit_component_padronizacao_kit_product_id`, `public.idx_fk_kit_component_padronizacao_raw_id`, `public.idx_fk_magazine_public_reactions_item_id`, `public.idx_fk_magazines_owner_id`, `public.idx_fk_markup_configurations_category_id`, `public.idx_fk_markup_configurations_variant_id`, `public.idx_fk_price_history_variant_id`, `public.idx_fk_print_area_techniques_tabela_preco_id`, `public.idx_fk_product_commemorative_dates_category_id`, `public.idx_fk_product_fiscal_ncm_id`, `public.idx_fk_product_images_canonical_image_id`, `public.idx_fk_product_images_color_id`, `public.idx_fk_product_images_variant_id`, `public.idx_fk_product_kit_components_color_id`, `public.idx_fk_product_kit_components_component_product_id`, `public.idx_fk_product_kit_components_padronizacao_id`, `public.idx_fk_product_kit_components_secondary_material_type_id`, `public.idx_fk_product_novelties_product_id`, `public.idx_fk_product_novelties_supplier_id`, `public.idx_fk_product_properties_property_definition_id`, `public.idx_fk_products_ncm_id`, `public.idx_fk_products_padronizacao_id`, `public.idx_fk_products_sub_brand_id`, `public.idx_fk_produto_ramo_atividade_ramo_atividade_filho_id`, `public.idx_fk_produtos_padronizacao_product_id`, `public.idx_fk_produtos_padronizacao_sub_brand_id`, `public.idx_fk_produtos_padronizacao_variantes_color_id_2`, `public.idx_fk_produtos_padronizacao_variantes_pad_id`, `public.idx_fk_produtos_padronizacao_variantes_raw_id`, `public.idx_fk_produtos_site_padronizacao_raw_id`, `public.idx_fk_quote_comments_parent_id_quote_id`, `public.idx_fk_quote_history_quote_id` … (+11)
- **lints** removido (28): `fk_without_index:public.frontend_telemetry.frontend_telemetry_user_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_component_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_product_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_component_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_padronizacao_id_fkey`, `fk_without_index:public.kit_component_padronizacao.fk_kcpad_raw_id`, `fk_without_index:public.kit_component_padronizacao.kit_component_padronizacao_kit_product_id_fkey`, `fk_without_index:public.print_area_techniques.print_area_techniques_tabela_preco_id_fkey`, `fk_without_index:public.product_commemorative_dates.product_commemorative_dates_category_id_fkey`, `fk_without_index:public.product_fiscal.product_fiscal_ncm_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_color_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_component_product_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_padronizacao_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_secondary_material_type_id_fkey`, `fk_without_index:public.product_properties.product_properties_property_definition_id_fkey`, `fk_without_index:public.products.products_ncm_id_fkey`, `fk_without_index:public.products.products_padronizacao_id_fkey`, `fk_without_index:public.products.products_sub_brand_id_fkey`, `fk_without_index:public.produto_ramo_atividade.produto_ramo_atividade_ramo_atividade_filho_id_fkey`, `fk_without_index:public.produtos_padronizacao.produtos_padronizacao_sub_brand_id_fkey`, `fk_without_index:public.produtos_padronizacao_variantes.produtos_padronizacao_variantes_pad_id_fkey`, `fk_without_index:public.produtos_site_padronizacao.produtos_site_padronizacao_raw_id_fkey`, `fk_without_index:public.stock_daily_summary.stock_daily_summary_supplier_branch_id_fkey`, `fk_without_index:public.stock_daily_summary.stock_daily_summary_supplier_id_fkey`, `fk_without_index:public.supplier_import_batches.supplier_import_batches_supplier_id_fkey`, `fk_without_index:public.supplier_products_raw.supplier_products_raw_import_batch_id_fkey`, `fk_without_index:public.supplier_products_raw.supplier_products_raw_variant_id_fkey`, `fk_without_index:public.variant_supplier_sources.variant_supplier_sources_supplier_branch_id_fkey`
- **migrations** adicionado (1): `20261127010000_perf_fk_indexes_51`
- **roles** adicionado (1): `backup_tmp_20261127`
- **roles** alterado (1): `postgres`

## 2026-11-27 02:24 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_30`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_23`

## 2026-11-27 00:42 UTC

- **migrations** adicionado (1): `20261126230000_doc_mv_product_compositions_refresh_concurrently`
- **views** alterado (1): `public.mv_product_compositions`

## 2026-11-26 23:38 UTC

- **functions** adicionado (3): `public.fn_admin_classification_apply(_dry_run boolean, _min_matches integer)`, `public.fn_admin_classification_suggestions(_search text, _somente_gaps boolean, _min_matches integer, _limit integer)`, `public.fn_admin_classification_summary()`
- **functions** alterado (3): `classification_audit.apply_high_confidence_suggestions(p_dry_run boolean, p_min_matches integer)`, `public.is_admin_or_above(_user_id uuid)`, `public.log_audit(_action text, _resource_type text, _resource_id text, _details jsonb)`
- **migrations** adicionado (1): `20261126211200_admin_classification_audit_rpc`

## 2026-11-26 22:26 UTC

- **functions** adicionado (2): `public.fn_admin_ai_quota_summary(_search text, _limit integer)`, `public.fn_admin_anon_access_audit()`
- **functions** alterado (2): `public.fn_anon_access_audit()`, `public.is_admin_or_above(_user_id uuid)`
- **migrations** adicionado (2): `20261126191200_admin_ai_quota_summary_rpc`, `20261126192900_admin_anon_access_audit_rpc`

## 2026-11-26 21:21 UTC

- **functions** alterado (2): `public.fn_ai_quota_summary()`, `public.is_admin_or_above(_user_id uuid)`

## 2026-11-26 19:18 UTC

- **functions** alterado (2): `public.fn_anon_catalog_grant_audit_run()`, `public.fn_verify_anon_catalog_grants()`

## 2026-11-26 16:21 UTC

- **functions** adicionado (3): `public.fn_admin_link_crm_seller(_crm_seller_id bigint, _auth_user_id uuid, _email text)`, `public.fn_admin_list_crm_seller_links(_search text, _limit integer)`, `public.fn_admin_unlink_crm_seller(_auth_user_id uuid)`
- **functions** alterado (2): `public.is_admin_or_above(_user_id uuid)`, `public.log_audit(_action text, _resource_type text, _resource_id text, _details jsonb)`
- **migrations** adicionado (1): `20261126060000_crm_seller_identity_admin_rpc`

## 2026-11-26 15:25 UTC

- **colunas** adicionado (9): `public.saved_stock_views.created_at`, `public.saved_stock_views.description`, `public.saved_stock_views.filters`, `public.saved_stock_views.id`, `public.saved_stock_views.is_pinned`, `public.saved_stock_views.name`, `public.saved_stock_views.updated_at`, `public.saved_stock_views.use_count`, `public.saved_stock_views.user_id`
- **constraints** adicionado (6): `public.saved_stock_views.saved_stock_views_filters_object_check`, `public.saved_stock_views.saved_stock_views_name_len_check`, `public.saved_stock_views.saved_stock_views_pkey`, `public.saved_stock_views.saved_stock_views_use_count_check`, `public.saved_stock_views.saved_stock_views_user_id_fkey`, `public.saved_stock_views.saved_stock_views_user_name_key`
- **functions** alterado (1): `public.handle_updated_at()`
- **grants** adicionado (2): `public.saved_stock_views:authenticated`, `public.saved_stock_views:service_role`
- **indexes** adicionado (3): `public.saved_stock_views_pkey`, `public.saved_stock_views_user_name_key`, `public.saved_stock_views_user_order_idx`
- **lints** adicionado (4): `policy_auth_fn_not_wrapped:public.saved_stock_views.saved_stock_views_delete_own`, `policy_auth_fn_not_wrapped:public.saved_stock_views.saved_stock_views_insert_own`, `policy_auth_fn_not_wrapped:public.saved_stock_views.saved_stock_views_select_own`, `policy_auth_fn_not_wrapped:public.saved_stock_views.saved_stock_views_update_own`
- **migrations** adicionado (1): `20261126130000_create_saved_stock_views`
- **policies (RLS)** adicionado (4): `public.saved_stock_views.saved_stock_views_delete_own`, `public.saved_stock_views.saved_stock_views_insert_own`, `public.saved_stock_views.saved_stock_views_select_own`, `public.saved_stock_views.saved_stock_views_update_own`
- **tabelas** adicionado (1): `public.saved_stock_views`
- **triggers** adicionado (1): `public.saved_stock_views.set_saved_stock_views_updated_at`

## 2026-11-26 14:19 UTC

- **functions** adicionado (1): `public.fn_dev_ops_infra_telemetry(_days integer, _top integer)`
- **functions** alterado (2): `public.fn_dev_medallion_health()`, `public.is_dev(_user_id uuid)`
- **migrations** adicionado (1): `20261126052000_ops_infra_telemetry_dev_rpc`

## 2026-11-26 02:30 UTC

- **colunas** adicionado (21): `ops.pgss_history.calls`, `ops.pgss_history.captured_at`, `ops.pgss_history.fn_name`, `ops.pgss_history.max_exec_time`, `ops.pgss_history.mean_exec_time`, `ops.pgss_history.queryid`, `ops.pgss_history.stddev_exec_time`, `ops.pgss_history.total_exec_time`, `ops.table_size_history.captured_at`, `ops.table_size_history.live_tup`, `ops.table_size_history.schema_name`, `ops.table_size_history.table_name`, `ops.table_size_history.total_bytes`, `ops.wraparound_monitor_log.captured_at`, `ops.wraparound_monitor_log.detail`, `ops.wraparound_monitor_log.id`, `ops.wraparound_monitor_log.metric`, `ops.wraparound_monitor_log.object_name`, `ops.wraparound_monitor_log.unit`, `ops.wraparound_monitor_log.value_numeric`, `ops.wraparound_monitor_log.value_pct`
- **constraints** adicionado (4): `ops.pgss_history.pgss_history_pkey`, `ops.table_size_history.table_size_history_pkey`, `ops.wraparound_monitor_log.wraparound_monitor_log_metric_check`, `ops.wraparound_monitor_log.wraparound_monitor_log_pkey`
- **cron jobs** adicionado (3): `320:table-size-history-daily`, `321:pgss-history-weekly`, `322:wraparound-toast-sequence-monitor`
- **functions** adicionado (2): `public.prevent_non_admin_quote_item_price_change()`, `public.set_quote_sent_at()`
- **functions** alterado (4): `public.can_view_all_sales()`, `public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)`, `public.fn_ensure_history_partitions(p_months_ahead integer)`, `public.has_role(_user_id uuid, _role app_role)`
- **indexes** adicionado (6): `ops.idx_pgss_history_fn_captured`, `ops.idx_table_size_history_table_captured`, `ops.idx_wraparound_monitor_log_metric_captured`, `ops.pgss_history_pkey`, `ops.table_size_history_pkey`, `ops.wraparound_monitor_log_pkey`
- **indexes** removido (48): `public.idx_ai_queue_pending`, `public.idx_ai_queue_product_id`, `public.idx_backfill_queue_dispatch`, `public.idx_faixa_v11_dim`, `public.idx_frontend_telemetry_user_id`, `public.idx_kcer_component`, `public.idx_kcer_kit`, `public.idx_kcer_source`, `public.idx_kcpad_kit`, `public.idx_kit_component_enrichment_raw_promoted_component_id`, `public.idx_kit_component_enrichment_raw_promoted_padronizacao_id`, `public.idx_kit_component_padronizacao_raw_id`, `public.idx_kit_components_name`, `public.idx_padvar_pad`, `public.idx_padvar_sem_colorid`, `public.idx_pat_location_code`, `public.idx_pat_tabela`, `public.idx_pkc_color_id`, `public.idx_prod_comm_product`, `public.idx_product_commemorative_dates_category_id`, `public.idx_product_fiscal_ncm_code`, `public.idx_product_fiscal_ncm_id`, `public.idx_product_kit_components_component_product_id`, `public.idx_product_kit_components_padronizacao_id`, `public.idx_product_kit_components_secondary_material_type_id`, `public.idx_product_properties_property_definition_id`, `public.idx_product_supply_sync_status`, `public.idx_products_ncm_id`, `public.idx_products_padronizacao_id`, `public.idx_products_sub_brand_id`, `public.idx_products_xbz_reliability`, `public.idx_produto_ramo_atividade_filho`, `public.idx_produtos_padronizacao_sub_brand_id`, `public.idx_produtos_site_padronizacao_raw_id`, `public.idx_spr_images_pending`, `public.idx_spr_import_batch_id`, `public.idx_spr_variant_id`, `public.idx_sre_supplier_date`, `public.idx_sre_variant_date`, `public.idx_stock_daily_summary_supplier_branch_id` … (+8)
- **lints** adicionado (28): `fk_without_index:public.frontend_telemetry.frontend_telemetry_user_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_component_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_product_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_component_id_fkey`, `fk_without_index:public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_padronizacao_id_fkey`, `fk_without_index:public.kit_component_padronizacao.fk_kcpad_raw_id`, `fk_without_index:public.kit_component_padronizacao.kit_component_padronizacao_kit_product_id_fkey`, `fk_without_index:public.print_area_techniques.print_area_techniques_tabela_preco_id_fkey`, `fk_without_index:public.product_commemorative_dates.product_commemorative_dates_category_id_fkey`, `fk_without_index:public.product_fiscal.product_fiscal_ncm_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_color_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_component_product_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_padronizacao_id_fkey`, `fk_without_index:public.product_kit_components.product_kit_components_secondary_material_type_id_fkey`, `fk_without_index:public.product_properties.product_properties_property_definition_id_fkey`, `fk_without_index:public.products.products_ncm_id_fkey`, `fk_without_index:public.products.products_padronizacao_id_fkey`, `fk_without_index:public.products.products_sub_brand_id_fkey`, `fk_without_index:public.produto_ramo_atividade.produto_ramo_atividade_ramo_atividade_filho_id_fkey`, `fk_without_index:public.produtos_padronizacao.produtos_padronizacao_sub_brand_id_fkey`, `fk_without_index:public.produtos_padronizacao_variantes.produtos_padronizacao_variantes_pad_id_fkey`, `fk_without_index:public.produtos_site_padronizacao.produtos_site_padronizacao_raw_id_fkey`, `fk_without_index:public.stock_daily_summary.stock_daily_summary_supplier_branch_id_fkey`, `fk_without_index:public.stock_daily_summary.stock_daily_summary_supplier_id_fkey`, `fk_without_index:public.supplier_import_batches.supplier_import_batches_supplier_id_fkey`, `fk_without_index:public.supplier_products_raw.supplier_products_raw_import_batch_id_fkey`, `fk_without_index:public.supplier_products_raw.supplier_products_raw_variant_id_fkey`, `fk_without_index:public.variant_supplier_sources.variant_supplier_sources_supplier_branch_id_fkey`
- **migrations** adicionado (7): `20260620190001_populate_quotes_sent_at`, `20260629142224_7e644177-527b-4b92-93a3-79ffee40ca4a`, `20260916211500_e30_ops_table_size_history`, `20260917150000_e40_ops_pgss_history`, `20260917160000_e33_ops_wraparound_monitor`, `20261101210000_sb0007_drop_noop_restrictive_policies`, `20261126030000_perf005_drop_unused_indexes_concurrently`
- **policies (RLS)** removido (10): `public.ai_usage_quotas.rls_restrictive_ai_usage_quotas`, `public.kit_collaborators.rls_restrictive_kit_collaborators`, `public.notification_preferences.rls_restrictive_notification_preferences`, `public.product_ai_content.rls_restrictive_product_ai_content`, `public.product_fiscal.rls_restrictive_product_fiscal`, `public.product_seo.rls_restrictive_product_seo`, `public.product_supply.rls_restrictive_product_supply`, `public.push_subscriptions.rls_restrictive_push_subscriptions`, `public.recently_viewed_products.rls_restrictive_recently_viewed_products`, `public.system_kill_switches.rls_restrictive_system_kill_switches`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_29`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`
- **tabelas** adicionado (3): `ops.pgss_history`, `ops.table_size_history`, `ops.wraparound_monitor_log`
- **triggers** adicionado (2): `public.quote_items.trg_prevent_non_admin_quote_item_price_change`, `public.quotes.trg_set_quote_sent_at`

## 2026-11-25 23:26 UTC

- **functions** alterado (1): `public.fn_ensure_history_partitions(p_months_ahead integer)`

## 2026-11-25 22:23 UTC

- **indexes** adicionado (1): `public.idx_sds_restock_zero_to_pos_date`
- **migrations** adicionado (1): `20261114160000_perf_idx_sds_restock_counts`

## 2026-11-25 21:18 UTC

- **migrations** adicionado (2): `20261120040000_add_quotes_freight_plan`, `20261125074200_revoke_anon_apply_classification_suggestions`

## 2026-11-25 20:19 UTC

- **cron jobs** removido (1): `235:image-dimensions-backfill`
- **functions** alterado (2): `public.get_edge_function_secret(_name text)`, `public.get_edge_functions_base_url()`
- **migrations** adicionado (2): `20261027230000_cleanup_get_edge_function_secret_allowlist`, `20261108230000_remove_broken_cron_image_dimensions_backfill`

## 2026-11-25 19:15 UTC

- **colunas** adicionado (7): `public.supplier_products_raw_history_default.captured_at`, `public.supplier_products_raw_history_default.content_hash`, `public.supplier_products_raw_history_default.id`, `public.supplier_products_raw_history_default.raw_data`, `public.supplier_products_raw_history_default.raw_id`, `public.supplier_products_raw_history_default.supplier_id`, `public.supplier_products_raw_history_default.supplier_reference`
- **constraints** adicionado (1): `public.supplier_products_raw_history_default.supplier_products_raw_history_default_pkey`
- **cron jobs** adicionado (2): `318:supplier-history-partition-maintenance`, `319:supplier-history-default-partition-alert`
- **functions** adicionado (1): `public.fn_ensure_history_partitions(p_months_ahead integer)`
- **functions** alterado (2): `public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)`, `public.is_admin_or_above(_user_id uuid)`
- **grants** adicionado (3): `public.supplier_products_raw_history_default:anon`, `public.supplier_products_raw_history_default:authenticated`, `public.supplier_products_raw_history_default:service_role`
- **indexes** adicionado (1): `public.supplier_products_raw_history_default_pkey`
- **migrations** adicionado (1): `20260916193000_e25_supplier_history_partition_automation`
- **policies (RLS)** adicionado (2): `public.supplier_products_raw_history_default.hist_all_service`, `public.supplier_products_raw_history_default.hist_select_admin`
- **tabelas** adicionado (1): `public.supplier_products_raw_history_default`

## 2026-11-25 18:20 UTC

- **migrations** adicionado (1): `20261125180000_fix_comment_v_tabela_gravacao_publica`
- **views** alterado (1): `public.v_tabela_preco_gravacao_oficial_public`

## 2026-11-25 17:16 UTC

- **functions** alterado (1): `public.fn_market_intelligence_macro(p_days integer, p_supplier_id uuid)`
- **indexes** adicionado (1): `public.idx_sds_summary_date_supplier`
- **migrations** adicionado (1): `20261125173000_idx_sds_summary_date_supplier_aplicavel`

## 2026-11-25 16:23 UTC

- **colunas** adicionado (1): `public.crm_callback_events.updated_at`
- **functions** adicionado (1): `public.fn_market_intelligence_macro(p_days integer, p_supplier_id uuid)`
- **functions** alterado (2): `public.fn_verify_anon_catalog_grants()`, `public.set_updated_at()`
- **grants** adicionado (1): `public.mv_product_compositions:anon`
- **migrations** adicionado (3): `20261115130100_fn_market_intelligence_macro`, `20261119110500_crm_callback_events_updated_at`, `20261125160000_restaura_grant_anon_mv_product_compositions`
- **triggers** adicionado (1): `public.crm_callback_events.trg_crm_callback_events_updated_at`

## 2026-11-25 15:18 UTC

- **grants** removido (1): `public.mv_product_compositions:anon`

## 2026-11-25 14:19 UTC

- **functions** alterado (2): `public.fn_product_active_for_rls(p_id uuid)`, `public.fn_verify_anon_catalog_grants()`
- **lints** adicionado (1): `rpc_anon_executable:public.fn_product_active_for_rls(p_id uuid)`
- **migrations** adicionado (1): `20261125131000_tripwire_anon_v5_reconcilia`
- **views** alterado (3): `public.v_compras_catalogo`, `public.v_compras_precos_faixa`, `public.v_compras_precos_variante`

## 2026-11-25 12:29 UTC

- **functions** alterado (3): `classification_audit.apply_high_confidence_suggestions(p_dry_run boolean, p_min_matches integer)`, `public.fn_verify_anon_catalog_grants()`, `public.has_role(_user_id uuid, _role app_role)`
- **grants** removido (12): `public.collection_products:anon`, `public.collections:anon`, `public.content_articles:anon`, `public.favorite_items:anon`, `public.favorite_lists:anon`, `public.product_ai_content:anon`, `public.product_fiscal:anon`, `public.product_seo:anon`, `public.product_supply:anon`, `public.system_kill_switches:anon`, `public.system_settings:anon`, `public.video_sim_results:anon`
- **grants** alterado (1): `public.favorite_item_reactions:anon`
- **migrations** adicionado (1): `20261125120000_revoke_anon_internal_grants_public`

## 2026-11-25 11:21 UTC

- **functions** alterado (1): `classification_audit.apply_high_confidence_suggestions(p_dry_run boolean, p_min_matches integer)`

## 2026-11-25 01:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_28`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_21`

## 2026-11-24 19:15 UTC

- **colunas** removido (1): `public.v_print_area_techniques_public.unit_cost`
- **colunas** alterado (2): `public.v_print_area_techniques_public.created_at`, `public.v_print_area_techniques_public.updated_at`
- **functions** alterado (1): `public.fn_verify_anon_catalog_grants()`
- **grants** removido (1): `public.print_area_techniques:anon`
- **migrations** adicionado (1): `20261124163000_revoke_anon_unit_cost_print_areas`
- **views** alterado (1): `public.v_print_area_techniques_public`

## 2026-11-24 18:21 UTC

- **migrations** adicionado (1): `20261124171500_internal_managed_schema_dictionary`

## 2026-11-24 17:17 UTC

- **colunas** adicionado (7): `internal.managed_schema_dictionary.description`, `internal.managed_schema_dictionary.object_name`, `internal.managed_schema_dictionary.object_type`, `internal.managed_schema_dictionary.partition_of`, `internal.managed_schema_dictionary.reviewed_at`, `internal.managed_schema_dictionary.schema_name`, `internal.managed_schema_dictionary.service_name`
- **colunas** alterado (14): `public.products.sale_price`, `public.products.suggested_price`, `public.quote_templates.delivery_time`, `public.quote_templates.discount_amount`, `public.quote_templates.discount_percent`, `public.quote_templates.payment_method`, `public.quote_templates.payment_terms`, `public.quote_templates.shipping_cost`, `public.quote_templates.shipping_type`, `public.quotes.delivery_time`, `public.quotes.payment_method`, `public.quotes.payment_terms`, `public.quotes.shipping_method`, `public.quotes.shipping_type`
- **constraints** adicionado (2): `internal.managed_schema_dictionary.managed_schema_dictionary_object_type_check`, `internal.managed_schema_dictionary.managed_schema_dictionary_pkey`
- **indexes** adicionado (1): `internal.managed_schema_dictionary_pkey`
- **tabelas** adicionado (1): `internal.managed_schema_dictionary`
- **tabelas** alterado (230): `classification_audit.category_suggestions`, `prod_audit.category_keywords`, `prod_audit.category_suggestions`, `prod_audit.classification_rules`, `prod_audit.product_features`, `prod_audit.test_results`, `public._bkp_kcvs_pre_normalize_20260624`, `public._bkp_kit_dims_20260619`, `public._bkp_orphan_active_variants_20260619`, `public._qa_pct_results`, `public.ai_usage_events`, `public.anon_catalog_grant_audit_log`, `public.art_file_attachments`, `public.asia_image_import_queue`, `public.auto_tag_rules`, `public.backup_produto_ramo_atividade_20260625`, `public.binding_colors`, `public.binding_types`, `public.bot_detection_log`, `public.cart_templates`, `public.category_relationships`, `public.collection_item_reactions`, `public.collection_items_trash`, `public.color_equivalences`, `public.color_groups`, `public.color_nuances`, `public.color_variations`, `public.commemorative_date_colors`, `public.commemorative_date_exclusions`, `public.company_email_patterns`, `public.comparison_reactions`, `public.component_media`, `public.connection_test_history`, `public.conversation_audit_logs`, `public.conversation_delivery_status`, `public.conversation_event_history`, `public.cover_finishes`, `public.cover_materials`, `public.cover_types`, `public.cron_job_timeout_map` … (+190)

## 2026-11-24 16:20 UTC

- **colunas** alterado (142): `public.device_login_notifications.created_at`, `public.device_login_notifications.device_id`, `public.device_login_notifications.email_sent`, `public.device_login_notifications.id`, `public.device_login_notifications.ip_address`, `public.device_login_notifications.location`, `public.device_login_notifications.user_agent`, `public.device_login_notifications.user_id`, `public.notification_preferences.created_at`, `public.notification_preferences.email_notifications`, `public.notification_preferences.id`, `public.notification_preferences.marketing`, `public.notification_preferences.order_updates`, `public.notification_preferences.push_notifications`, `public.notification_preferences.quote_updates`, `public.notification_preferences.system_announcements`, `public.notification_preferences.updated_at`, `public.notification_preferences.user_id`, `public.notifications.action_url`, `public.notifications.created_at`, `public.notifications.data`, `public.notifications.id`, `public.notifications.is_read`, `public.notifications.message`, `public.notifications.priority`, `public.notifications.read_at`, `public.notifications.title`, `public.notifications.type`, `public.notifications.user_id`, `public.order_items.discount_amount`, `public.order_items.personalization_cost`, `public.order_items.product_id`, `public.order_items.quote_item_id`, `public.order_items.subtotal`, `public.order_items.unit_price`, `public.orders.delivery_time`, `public.orders.discount_amount`, `public.orders.paid_amount`, `public.orders.payment_method`, `public.orders.payment_terms` … (+102)
- **tabelas** alterado (10): `public.notification_preferences`, `public.notifications`, `public.organization_members`, `public.organizations`, `public.permissions`, `public.profiles`, `public.push_subscriptions`, `public.role_permissions`, `public.user_notification_preferences`, `public.workspace_notifications`

## 2026-11-24 15:18 UTC

- **functions** alterado (1): `public.can_view_all_sales()`
- **grants** removido (154): `public.ai_routing_decisions:anon`, `public.ai_usage_events:anon`, `public.ai_usage_quotas:anon`, `public.art_file_attachments:anon`, `public.attribute_equivalences:anon`, `public.audit_log_gravacao:anon`, `public.auto_tag_rules:anon`, `public.b2b_collection_products:anon`, `public.b2b_collections:anon`, `public.cart_templates:anon`, `public.category_accessory_categories:anon`, `public.category_ancestors:anon`, `public.category_colors:anon`, `public.category_commemorative_dates:anon`, `public.category_copywriting_config:anon`, `public.category_relationships:anon`, `public.category_target_audiences:anon`, `public.category_variation_types:anon`, `public.classify_functions_registry:anon`, `public.collection_items:anon`, `public.component_media:anon`, `public.connection_test_history:anon`, `public.conversation_delivery_status:anon`, `public.conversation_event_history:anon`, `public.crm_callback_events:anon`, `public.custom_kits:anon`, `public.dashboard_insights_cache:anon`, `public.eco_backfill_log_20260625:anon`, `public.eco_date_reconcile_log_20260626:anon`, `public.eco_material_config:anon`, `public.edge_function_invocations:anon`, `public.expert_conversations:anon`, `public.expert_messages:anon`, `public.external_connections_sync_log:anon`, `public.favorite_items_trash:anon`, `public.feminine_color_config:anon`, `public.file_scan_logs:anon`, `public.follow_up_reminders:anon`, `public.generated_mockups:anon`, `public.geo_allowed_countries:anon` … (+114)
- **grants** alterado (13): `public.content_articles:anon`, `public.favorite_items:anon`, `public.favorite_lists:anon`, `public.kit_typical_dims:anon`, `public.product_ai_content:anon`, `public.product_attributes:anon`, `public.product_commemorative_dates:anon`, `public.product_fiscal:anon`, `public.product_seo:anon`, `public.product_supply:anon`, `public.supplier_sub_brands:anon`, `public.system_settings:anon`, `public.video_sim_results:anon`
- **migrations** adicionado (2): `20261124120000_revoke_anon_write_grants_public`, `20261124140000_close_anon_cost_surface`

## 2026-11-24 14:19 UTC

- **roles** alterado (1): `authenticator`

## 2026-11-24 13:19 UTC

- **colunas** alterado (170): `public.attribute_definitions.created_at`, `public.attribute_definitions.data_type`, `public.attribute_definitions.default_value`, `public.attribute_definitions.description`, `public.attribute_definitions.display_name`, `public.attribute_definitions.display_order`, `public.attribute_definitions.group_id`, `public.attribute_definitions.id`, `public.attribute_definitions.is_active`, `public.attribute_definitions.is_comparable`, `public.attribute_definitions.is_filterable`, `public.attribute_definitions.is_required`, `public.attribute_definitions.is_searchable`, `public.attribute_definitions.is_visible`, `public.attribute_definitions.name`, `public.attribute_definitions.organization_id`, `public.attribute_definitions.possible_values`, `public.attribute_definitions.slug`, `public.attribute_definitions.unit`, `public.attribute_definitions.updated_at`, `public.attribute_definitions.validation_rules`, `public.attribute_groups.created_at`, `public.attribute_groups.description`, `public.attribute_groups.display_order`, `public.attribute_groups.icon`, `public.attribute_groups.id`, `public.attribute_groups.is_active`, `public.attribute_groups.name`, `public.attribute_groups.organization_id`, `public.attribute_groups.slug`, `public.attribute_groups.updated_at`, `public.b2b_collection_products.added_at`, `public.b2b_collection_products.b2b_collection_id`, `public.b2b_collection_products.display_order`, `public.b2b_collection_products.id`, `public.b2b_collection_products.product_id`, `public.b2b_collections.created_at`, `public.b2b_collections.created_by`, `public.b2b_collections.description`, `public.b2b_collections.display_order` … (+130)
- **tabelas** alterado (9): `public.attribute_definitions`, `public.attribute_groups`, `public.b2b_collection_products`, `public.b2b_collections`, `public.category_target_audiences`, `public.collection_items`, `public.collections`, `public.product_target_audiences`, `public.target_audiences`

## 2026-11-24 12:25 UTC

- **colunas** alterado (102): `public.product_variants.CodigoXbz`, `public.product_variants.attributes`, `public.product_variants.bitrix_product_id`, `public.product_variants.color_code`, `public.product_variants.color_hex`, `public.product_variants.color_id`, `public.product_variants.color_name`, `public.product_variants.created_at`, `public.product_variants.id`, `public.product_variants.images`, `public.product_variants.is_active`, `public.product_variants.name`, `public.product_variants.next_entry_date`, `public.product_variants.next_entry_quantity`, `public.product_variants.product_id`, `public.product_variants.size_id`, `public.product_variants.sku`, `public.product_variants.sku_promo`, `public.product_variants.stock_quantity`, `public.product_variants.supplier_external_id`, `public.product_variants.supplier_sku`, `public.product_variants.updated_at`, `public.stock_daily_summary.cost_price_close`, `public.stock_daily_summary.cost_price_open`, `public.stock_daily_summary.created_at`, `public.stock_daily_summary.id`, `public.stock_daily_summary.net_change`, `public.stock_daily_summary.price_changed`, `public.stock_daily_summary.product_id`, `public.stock_daily_summary.restock_count`, `public.stock_daily_summary.restock_detected`, `public.stock_daily_summary.restock_quantity`, `public.stock_daily_summary.stock_close`, `public.stock_daily_summary.stock_max`, `public.stock_daily_summary.stock_min`, `public.stock_daily_summary.stock_open`, `public.stock_daily_summary.summary_date`, `public.stock_daily_summary.supplier_branch_id`, `public.stock_daily_summary.supplier_id`, `public.stock_daily_summary.sync_count` … (+62)
- **tabelas** alterado (1): `public.suppliers`

## 2026-11-24 04:21 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`

## 2026-11-24 02:23 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_27`

## 2026-11-24 00:35 UTC

- **functions** alterado (4): `public.fn_anon_catalog_grant_audit_run()`, `public.fn_qa_check_image_coverage()`, `public.fn_qa_scan_imageless_products()`, `public.is_admin_or_above(_user_id uuid)`
- **lints** adicionado (4): `view_security_definer:public.categories_tree_visual`, `view_security_definer:public.mv_product_cards`, `view_security_definer:public.mv_product_intelligence`, `view_security_definer:public.mv_stock_velocity`
- **views** alterado (4): `public.categories_tree_visual`, `public.mv_product_cards`, `public.mv_product_intelligence`, `public.mv_stock_velocity`

## 2026-11-23 23:20 UTC

- **functions** alterado (7): `public.can_view_all_sales()`, `public.check_login_rate_limit(_email text, _ip text)`, `public.fn_product_active_for_rls(p_id uuid)`, `public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text)`, `public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean)`, `public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean)`, `public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer)`
- **lints** removido (7): `policy_auth_fn_not_wrapped:public.order_items.order_items_insert`, `policy_auth_fn_not_wrapped:public.order_items.order_items_select`, `policy_auth_fn_not_wrapped:public.order_items.order_items_update`, `policy_auth_fn_not_wrapped:public.orders.orders_insert`, `policy_auth_fn_not_wrapped:public.orders.orders_select`, `policy_auth_fn_not_wrapped:public.orders.orders_update`, `rpc_anon_executable:public.fn_product_active_for_rls(p_id uuid)`
- **policies (RLS)** alterado (8): `public.order_items.order_items_insert`, `public.order_items.order_items_select`, `public.order_items.order_items_update`, `public.orders.orders_insert`, `public.orders.orders_select`, `public.orders.orders_update`, `public.product_commemorative_dates.pcd_oa_read_all`, `public.product_commemorative_dates.pcd_read_public`
- **views** alterado (3): `public.v_compras_catalogo`, `public.v_compras_precos_faixa`, `public.v_compras_precos_variante`

## 2026-11-23 16:26 UTC

- **indexes** adicionado (2): `public.idx_business_calendar_created_by`, `public.idx_freight_settings_updated_by`
- **lints** removido (2): `fk_without_index:public.business_calendar.business_calendar_created_by_fkey`, `fk_without_index:public.freight_settings.freight_settings_updated_by_fkey`
- **tabelas** alterado (6): `classification_audit.category_suggestions`, `prod_audit.category_keywords`, `prod_audit.category_suggestions`, `prod_audit.classification_rules`, `prod_audit.product_features`, `prod_audit.test_results`

## 2026-11-23 15:34 UTC

- **grants** removido (3): `public.v_compras_catalogo:anon`, `public.v_compras_precos_faixa:anon`, `public.v_compras_precos_variante:anon`

## 2026-11-23 13:01 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-23 11:52 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_26`

## 2026-11-22 19:15 UTC

- **grants** adicionado (2): `public.variant_supplier_sources:anon`, `public.vw_variant_sale_prices:anon`
- **grants** alterado (1): `public.markup_configurations:anon`
- **lints** adicionado (1): `view_security_definer:public.mv_product_compositions`
- **migrations** adicionado (1): `20261122200000_fix_cadeia_views_compras_e_compositions`
- **views** alterado (1): `public.mv_product_compositions`

## 2026-11-22 15:16 UTC

- **lints** adicionado (4): `view_security_definer:public.v_kit_component_media_public`, `view_security_definer:public.v_product_compositions_public`, `view_security_definer:public.v_suppliers_public`, `view_security_definer:public.v_tabela_preco_gravacao_oficial_public`
- **migrations** adicionado (1): `20261122180000_restore_definer_views_p06_e_compras`
- **views** alterado (7): `public.v_compras_catalogo`, `public.v_compras_precos_faixa`, `public.v_compras_precos_variante`, `public.v_kit_component_media_public`, `public.v_product_compositions_public`, `public.v_suppliers_public`, `public.v_tabela_preco_gravacao_oficial_public`

## 2026-11-22 14:17 UTC

- **colunas** adicionado (5): `public.business_calendar.created_at`, `public.business_calendar.created_by`, `public.business_calendar.day`, `public.business_calendar.description`, `public.print_area_techniques.production_days`
- **colunas** alterado (1): `public.products.lead_time_days`
- **constraints** adicionado (4): `public.business_calendar.business_calendar_created_by_fkey`, `public.business_calendar.business_calendar_description_check`, `public.business_calendar.business_calendar_pkey`, `public.print_area_techniques.print_area_techniques_production_days_check`
- **grants** adicionado (2): `public.business_calendar:authenticated`, `public.business_calendar:service_role`
- **indexes** adicionado (1): `public.business_calendar_pkey`
- **lints** adicionado (1): `fk_without_index:public.business_calendar.business_calendar_created_by_fkey`
- **migrations** adicionado (1): `20261120041000_production_lead_time_calendar`
- **policies (RLS)** adicionado (4): `public.business_calendar.business_calendar_delete_admin`, `public.business_calendar.business_calendar_insert_admin`, `public.business_calendar.business_calendar_select_authenticated`, `public.business_calendar.business_calendar_update_admin`
- **tabelas** adicionado (1): `public.business_calendar`

## 2026-11-22 13:16 UTC

- **colunas** adicionado (59): `public.product_variants.supplier_external_id`, `public.products.supplier_external_id`, `public.v_compras_catalogo.color_code`, `public.v_compras_catalogo.color_hex`, `public.v_compras_catalogo.color_id`, `public.v_compras_catalogo.color_name`, `public.v_compras_catalogo.cost_price`, `public.v_compras_catalogo.image_url`, `public.v_compras_catalogo.ipi_rate`, `public.v_compras_catalogo.is_stockout`, `public.v_compras_catalogo.last_stock_update_at`, `public.v_compras_catalogo.lead_time_days`, `public.v_compras_catalogo.min_order_quantity`, `public.v_compras_catalogo.min_order_value`, `public.v_compras_catalogo.min_quantity`, `public.v_compras_catalogo.name`, `public.v_compras_catalogo.ncm_code`, `public.v_compras_catalogo.pim_product_id`, `public.v_compras_catalogo.pim_variant_id`, `public.v_compras_catalogo.price_freshness_threshold_days`, `public.v_compras_catalogo.price_updated_at`, `public.v_compras_catalogo.price_verified_at`, `public.v_compras_catalogo.sale_price`, `public.v_compras_catalogo.size_code`, `public.v_compras_catalogo.sku`, `public.v_compras_catalogo.sku_promo`, `public.v_compras_catalogo.stock_quantity`, `public.v_compras_catalogo.suggested_price`, `public.v_compras_catalogo.supplier_code`, `public.v_compras_catalogo.supplier_external_id`, `public.v_compras_catalogo.supplier_id`, `public.v_compras_catalogo.supplier_name`, `public.v_compras_catalogo.supplier_reference`, `public.v_compras_catalogo.updated_at`, `public.v_compras_catalogo.xbz_stock_reliability_text`, `public.v_compras_precos_faixa.component`, `public.v_compras_precos_faixa.currency`, `public.v_compras_precos_faixa.handling_cost`, `public.v_compras_precos_faixa.hotspot`, `public.v_compras_precos_faixa.location` … (+19)
- **grants** adicionado (9): `public.v_compras_catalogo:anon`, `public.v_compras_catalogo:authenticated`, `public.v_compras_catalogo:service_role`, `public.v_compras_precos_faixa:anon`, `public.v_compras_precos_faixa:authenticated`, `public.v_compras_precos_faixa:service_role`, `public.v_compras_precos_variante:anon`, `public.v_compras_precos_variante:authenticated`, `public.v_compras_precos_variante:service_role`
- **lints** adicionado (3): `view_security_definer:public.v_compras_catalogo`, `view_security_definer:public.v_compras_precos_faixa`, `view_security_definer:public.v_compras_precos_variante`
- **migrations** adicionado (2): `20261121223000_add_supplier_external_id`, `20261122100000_compras_views_canonicas`
- **views** adicionado (3): `public.v_compras_catalogo`, `public.v_compras_precos_faixa`, `public.v_compras_precos_variante`

## 2026-11-22 12:22 UTC

- **functions** alterado (3): `public.create_kit_quote_transactional(_request_id uuid, _quote jsonb, _items jsonb)`, `public.create_quote_transactional(_quote jsonb, _items jsonb)`, `public.fn_check_item_fits(p_packaging_id uuid, p_product_id uuid, p_current_used_liters numeric)`
- **migrations** adicionado (1): `20261121203000_kit_maker_server_revalidation`

## 2026-11-22 00:40 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_25`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_18`

## 2026-11-21 17:15 UTC

- **functions** alterado (3): `public.create_quote_transactional(_quote jsonb, _items jsonb)`, `public.update_quote_transactional(_quote_id uuid, _quote_patch jsonb, _items jsonb, _expected_version integer)`, `public.user_is_org_member(org_id uuid)`
- **migrations** adicionado (1): `20261121120000_fix_quote_rpcs_contract_freight`

## 2026-11-21 16:17 UTC

- **functions** alterado (3): `public.create_quote_transactional(_quote jsonb, _items jsonb)`, `public.update_quote_transactional(_quote_id uuid, _quote_patch jsonb, _items jsonb, _expected_version integer)`, `public.user_is_org_member(org_id uuid)`
- **migrations** adicionado (1): `20261121000000_quote_rpcs_freight_plan`

## 2026-11-21 15:16 UTC

- **colunas** adicionado (3): `public.quotes.freight_mix_mode`, `public.quotes.freight_plan`, `public.quotes.show_freight_plan_to_client`
- **constraints** adicionado (2): `public.quotes.quotes_freight_mix_mode_check`, `public.quotes.quotes_freight_plan_shape_check`

## 2026-11-21 02:22 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_24`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`

## 2026-11-20 19:16 UTC

- **colunas** adicionado (8): `public.quote_comments.content`, `public.quote_comments.created_at`, `public.quote_comments.id`, `public.quote_comments.is_edited`, `public.quote_comments.parent_id`, `public.quote_comments.quote_id`, `public.quote_comments.updated_at`, `public.quote_comments.user_id`
- **constraints** adicionado (7): `public.quote_comments.quote_comments_content_length_check`, `public.quote_comments.quote_comments_id_quote_id_key`, `public.quote_comments.quote_comments_not_self_parent_check`, `public.quote_comments.quote_comments_parent_quote_fkey`, `public.quote_comments.quote_comments_pkey`, `public.quote_comments.quote_comments_quote_id_fkey`, `public.quote_comments.quote_comments_user_id_fkey`
- **functions** adicionado (1): `public.enforce_quote_comment_mutation()`
- **grants** adicionado (2): `public.quote_comments:authenticated`, `public.quote_comments:service_role`
- **indexes** adicionado (5): `public.quote_comments_id_quote_id_key`, `public.quote_comments_parent_quote_idx`, `public.quote_comments_pkey`, `public.quote_comments_quote_created_id_idx`, `public.quote_comments_user_id_idx`
- **migrations** adicionado (1): `20261120180000_restore_quote_comments_scoped_threads`
- **policies (RLS)** adicionado (4): `public.quote_comments.quote_comments_delete_own_visible_quote`, `public.quote_comments.quote_comments_insert_own_visible_quote`, `public.quote_comments.quote_comments_select_visible_quote`, `public.quote_comments.quote_comments_update_own_visible_quote`
- **tabelas** adicionado (1): `public.quote_comments`
- **triggers** adicionado (1): `public.quote_comments.quote_comments_enforce_mutation`

## 2026-11-20 17:15 UTC

- **functions** alterado (1): `public.update_quote_transactional(_quote_id uuid, _quote_patch jsonb, _items jsonb, _expected_version integer)`

## 2026-11-20 16:18 UTC

- **functions** alterado (2): `public.is_admin()`, `public.is_admin(_user_id uuid)`

## 2026-11-20 12:24 UTC

- **functions** adicionado (1): `public.fn_auto_assign_org_on_profile()`
- **functions** alterado (2): `public.fn_grant_default_role_on_profile()`, `public.user_is_org_member(org_id uuid)`
- **lints** removido (5): `view_security_definer:public.v_kit_component_media_public`, `view_security_definer:public.v_product_compositions_public`, `view_security_definer:public.v_product_tags_public`, `view_security_definer:public.v_suppliers_public`, `view_security_definer:public.v_tabela_preco_gravacao_oficial_public`
- **migrations** adicionado (2): `20261118172500_security_invoker_views_p06_parcial`, `20261119103000_onboarding_auto_assign_org_reemissao`
- **triggers** adicionado (1): `public.profiles.trg_auto_assign_org`
- **views** alterado (5): `public.v_kit_component_media_public`, `public.v_product_compositions_public`, `public.v_product_tags_public`, `public.v_suppliers_public`, `public.v_tabela_preco_gravacao_oficial_public`

## 2026-11-20 11:18 UTC

- **colunas** alterado (2): `public.freight_settings.default_fill_factor`, `public.freight_settings.updated_by`
- **constraints** adicionado (9): `public.freight_settings.freight_settings_cubic_divisor_correios_range`, `public.freight_settings.freight_settings_cubic_divisor_rodoviario_range`, `public.freight_settings.freight_settings_internal_buffer_days_ceiling`, `public.shipping_boxes.shipping_boxes_code_format`, `public.shipping_boxes.shipping_boxes_max_weight_g_ceiling`, `public.shipping_boxes.shipping_boxes_name_format`, `public.shipping_boxes.shipping_boxes_outer_height_cm_range`, `public.shipping_boxes.shipping_boxes_outer_length_cm_range`, `public.shipping_boxes.shipping_boxes_outer_width_cm_range`
- **functions** adicionado (2): `public.guard_freight_settings_row()`, `public.guard_shipping_boxes_row()`
- **functions** alterado (1): `public.update_updated_at_column()`
- **grants** removido (2): `public.freight_settings:anon`, `public.shipping_boxes:anon`
- **grants** alterado (2): `public.freight_settings:authenticated`, `public.shipping_boxes:authenticated`
- **migrations** adicionado (2): `20261120030000_harden_freight_tables`, `20261120030100_seed_shipping_boxes`
- **policies (RLS)** removido (1): `public.shipping_boxes.shipping_boxes_delete_admin`
- **triggers** adicionado (2): `public.freight_settings.guard_freight_settings_row`, `public.shipping_boxes.guard_shipping_boxes_row`

## 2026-11-20 03:20 UTC

- **colunas** adicionado (1): `public.products.ships_separately`
- **migrations** adicionado (1): `20261120013000_add_products_ships_separately`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_23`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_16`

## 2026-11-19 23:16 UTC

- **colunas** adicionado (27): `public.freight_settings.cubic_divisor_correios`, `public.freight_settings.cubic_divisor_rodoviario`, `public.freight_settings.default_fill_factor`, `public.freight_settings.id`, `public.freight_settings.internal_buffer_days`, `public.freight_settings.multi_personalization_rule`, `public.freight_settings.origin_cep`, `public.freight_settings.updated_at`, `public.freight_settings.updated_by`, `public.shipping_boxes.code`, `public.shipping_boxes.created_at`, `public.shipping_boxes.deleted_at`, `public.shipping_boxes.empty_weight_g`, `public.shipping_boxes.fill_factor`, `public.shipping_boxes.id`, `public.shipping_boxes.inner_height_cm`, `public.shipping_boxes.inner_length_cm`, `public.shipping_boxes.inner_width_cm`, `public.shipping_boxes.is_active`, `public.shipping_boxes.max_weight_g`, `public.shipping_boxes.name`, `public.shipping_boxes.outer_height_cm`, `public.shipping_boxes.outer_length_cm`, `public.shipping_boxes.outer_width_cm`, `public.shipping_boxes.sort_order`, `public.shipping_boxes.updated_at`, `public.shipping_boxes.wall_thickness_mm`
- **constraints** adicionado (20): `public.freight_settings.freight_settings_cubic_divisor_correios_check`, `public.freight_settings.freight_settings_cubic_divisor_rodoviario_check`, `public.freight_settings.freight_settings_default_fill_factor_check`, `public.freight_settings.freight_settings_id_check`, `public.freight_settings.freight_settings_internal_buffer_days_check`, `public.freight_settings.freight_settings_multi_personalization_rule_check`, `public.freight_settings.freight_settings_origin_cep_check`, `public.freight_settings.freight_settings_pkey`, `public.freight_settings.freight_settings_updated_by_fkey`, `public.shipping_boxes.shipping_boxes_check`, `public.shipping_boxes.shipping_boxes_empty_weight_g_check`, `public.shipping_boxes.shipping_boxes_fill_factor_check`, `public.shipping_boxes.shipping_boxes_inner_height_positive`, `public.shipping_boxes.shipping_boxes_inner_length_positive`, `public.shipping_boxes.shipping_boxes_inner_width_positive`, `public.shipping_boxes.shipping_boxes_outer_height_cm_check`, `public.shipping_boxes.shipping_boxes_outer_length_cm_check`, `public.shipping_boxes.shipping_boxes_outer_width_cm_check`, `public.shipping_boxes.shipping_boxes_pkey`, `public.shipping_boxes.shipping_boxes_wall_thickness_mm_check`
- **functions** adicionado (3): `public.fn_ema_coverage_stats()`, `public.fn_ruptura_forecast_7_15_30()`, `public.fn_whatif_scenario(p_delta_units_per_sku numeric, p_nivel_filter text, p_supplier_id uuid)`
- **functions** alterado (3): `public.is_admin()`, `public.is_admin(_user_id uuid)`, `public.update_updated_at_column()`
- **grants** adicionado (6): `public.freight_settings:anon`, `public.freight_settings:authenticated`, `public.freight_settings:service_role`, `public.shipping_boxes:anon`, `public.shipping_boxes:authenticated`, `public.shipping_boxes:service_role`
- **indexes** adicionado (4): `public.freight_settings_pkey`, `public.shipping_boxes_active_sort_idx`, `public.shipping_boxes_code_unique_active`, `public.shipping_boxes_pkey`
- **lints** adicionado (1): `fk_without_index:public.freight_settings.freight_settings_updated_by_fkey`
- **migrations** adicionado (3): `20261119213000_create_shipping_boxes`, `20261119213100_create_freight_settings`, `20261119220000_create_ema_sister_functions`
- **policies (RLS)** adicionado (6): `public.freight_settings.freight_settings_select_authenticated`, `public.freight_settings.freight_settings_update_admin`, `public.shipping_boxes.shipping_boxes_delete_admin`, `public.shipping_boxes.shipping_boxes_insert_admin`, `public.shipping_boxes.shipping_boxes_select_authenticated`, `public.shipping_boxes.shipping_boxes_update_admin`
- **tabelas** adicionado (2): `public.freight_settings`, `public.shipping_boxes`
- **triggers** adicionado (2): `public.freight_settings.set_freight_settings_updated_at`, `public.shipping_boxes.set_shipping_boxes_updated_at`

## 2026-11-19 22:16 UTC

- **functions** adicionado (1): `public.fn_variant_sparkline(p_variant_id uuid, p_days integer)`
- **functions** alterado (1): `public.fn_ema_kpi_by_level(p_preferred_only boolean)`
- **migrations** adicionado (1): `20261119212000_fix_f12_sparkline_ema_kpi`

## 2026-11-19 16:19 UTC

- **functions** alterado (1): `public.set_updated_at()`

## 2026-11-19 15:18 UTC

- **migrations** adicionado (1): `20261119094500_reafirma_revogacoes_anteriores_ao_baseline`

## 2026-11-19 11:17 UTC

- **cron jobs** alterado (7): `209:connections-health-check`, `211:connections-auto-test`, `212:refresh-mv-supplier-reliability`, `222:backfill-image-dimensions`, `242:generate-blurhashes`, `243:hash-product-images`, `281:pgrst-schema-reload`
- **functions** alterado (8): `public.confirm_notifications_dispatched(p_ids uuid[])`, `public.fn_backfill_queue_reap_stuck(p_stuck_minutes integer, p_max_attempts integer)`, `public.fn_detect_recurring_errors_last_hour(_min_occurrences integer)`, `public.fn_global_search(p_term text, p_limit integer, p_types text[])`, `public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text, _category text, _action_url text, _metadata jsonb)`, `public.get_quote_token_public(_token text)`, `public.registrar_entrada_estoque(p_variant_sku character varying, p_quantity integer, p_unit_cost numeric, p_supplier_name character varying, p_document_number character varying, p_notes text, p_user_id uuid)`, `public.registrar_saida_estoque(p_variant_sku character varying, p_quantity integer, p_movement_type character varying, p_document_number character varying, p_notes text, p_user_id uuid, p_allow_negative boolean)`
- **migrations** adicionado (3): `20261022000000_revoke_fn_backfill_queue_reap_stuck_public_grant`, `20261022000100_revoke_fn_detect_recurring_errors_public_grant`, `20261114120000_cron004_reduz_frequencia_jobs_ociosos`

## 2026-11-19 10:18 UTC

- **colunas** adicionado (14): `public.endomarketing_themes.created_at`, `public.endomarketing_themes.display_order`, `public.endomarketing_themes.id`, `public.endomarketing_themes.is_active`, `public.endomarketing_themes.name`, `public.endomarketing_themes.slug`, `public.endomarketing_themes.updated_at`, `public.product_endomarketing.created_at`, `public.product_endomarketing.id`, `public.product_endomarketing.is_active`, `public.product_endomarketing.product_id`, `public.product_endomarketing.source`, `public.product_endomarketing.theme_id`, `public.product_endomarketing.updated_at`
- **constraints** adicionado (8): `public.endomarketing_themes.endomarketing_themes_name_key`, `public.endomarketing_themes.endomarketing_themes_pkey`, `public.endomarketing_themes.endomarketing_themes_slug_key`, `public.product_endomarketing.product_endomarketing_pkey`, `public.product_endomarketing.product_endomarketing_product_id_fkey`, `public.product_endomarketing.product_endomarketing_source_check`, `public.product_endomarketing.product_endomarketing_theme_id_fkey`, `public.product_endomarketing.uq_product_endomarketing`
- **functions** alterado (1): `public.set_updated_at()`
- **grants** adicionado (4): `public.endomarketing_themes:authenticated`, `public.endomarketing_themes:service_role`, `public.product_endomarketing:authenticated`, `public.product_endomarketing:service_role`
- **indexes** adicionado (6): `public.endomarketing_themes_name_key`, `public.endomarketing_themes_pkey`, `public.endomarketing_themes_slug_key`, `public.idx_product_endomarketing_theme_id`, `public.product_endomarketing_pkey`, `public.uq_product_endomarketing`
- **migrations** adicionado (1): `20261113140000_marketing_tab_links_rls_and_endomarketing`
- **policies (RLS)** adicionado (12): `public.endomarketing_themes.endomarketing_themes_auth_read`, `public.product_commemorative_dates.pcd_oa_del`, `public.product_commemorative_dates.pcd_oa_ins`, `public.product_commemorative_dates.pcd_oa_read_all`, `public.product_commemorative_dates.pcd_oa_upd`, `public.product_endomarketing.product_endomarketing_auth_read`, `public.product_endomarketing.product_endomarketing_oa_del`, `public.product_endomarketing.product_endomarketing_oa_ins`, `public.product_endomarketing.product_endomarketing_oa_upd`, `public.product_target_audiences.pta_oa_del`, `public.product_target_audiences.pta_oa_ins`, `public.product_target_audiences.pta_oa_upd`
- **tabelas** adicionado (2): `public.endomarketing_themes`, `public.product_endomarketing`
- **triggers** adicionado (2): `public.endomarketing_themes.set_updated_at_trigger`, `public.product_endomarketing.set_updated_at_trigger`

## 2026-11-19 09:19 UTC

- **migrations** adicionado (1): `20261119081500_elevenlabs_credential_reemissao`

## 2026-11-19 08:22 UTC

- **migrations** adicionado (1): `20261119073000_supplier_stricker_rls_deny_all_reemissao`
- **policies (RLS)** adicionado (17): `supplier_stricker.canceled_products.deny_all`, `supplier_stricker.category_mappings.deny_all`, `supplier_stricker.colors.deny_all`, `supplier_stricker.customization_options.deny_all`, `supplier_stricker.customization_tables.deny_all`, `supplier_stricker.optionals.deny_all`, `supplier_stricker.product_types.deny_all`, `supplier_stricker.products.deny_all`, `supplier_stricker.stg_colors.deny_all`, `supplier_stricker.stg_customizations.deny_all`, `supplier_stricker.stg_images.deny_all`, `supplier_stricker.stg_optionals.deny_all`, `supplier_stricker.stg_product_types.deny_all`, `supplier_stricker.stg_products.deny_all`, `supplier_stricker.stg_stock.deny_all`, `supplier_stricker.stocks.deny_all`, `supplier_stricker.sync_log.deny_all`
- **tabelas** alterado (17): `supplier_stricker.canceled_products`, `supplier_stricker.category_mappings`, `supplier_stricker.colors`, `supplier_stricker.customization_options`, `supplier_stricker.customization_tables`, `supplier_stricker.optionals`, `supplier_stricker.product_types`, `supplier_stricker.products`, `supplier_stricker.stg_colors`, `supplier_stricker.stg_customizations`, `supplier_stricker.stg_images`, `supplier_stricker.stg_optionals`, `supplier_stricker.stg_product_types`, `supplier_stricker.stg_products`, `supplier_stricker.stg_stock`, `supplier_stricker.stocks`, `supplier_stricker.sync_log`

## 2026-11-19 07:19 UTC

- **functions** adicionado (1): `public.rpc_sales_assistant_candidates(p_ramo_pai_id uuid, p_color_group_ids uuid[], p_price_min numeric, p_price_max numeric, p_limit integer, p_max_per_category integer, p_min_score integer)`
- **migrations** adicionado (2): `20260916202000_e23_force_rls_secret_tables`, `20261115034500_rpc_sales_assistant_candidates`
- **tabelas** alterado (5): `public.external_connections`, `public.integration_credentials`, `public.secret_rotation_log`, `public.step_up_tokens`, `public.user_token_revocations`

## 2026-11-19 06:28 UTC

- **functions** alterado (1): `public.get_quote_token_public(_token text)`
- **lints** removido (1): `rpc_anon_executable:public.get_quote_token_public(_token text)`
- **migrations** adicionado (1): `20261119051500_fix_get_quote_token_public_expiracao_pg_temp`

## 2026-11-19 05:18 UTC

- **migrations** adicionado (1): `20261108235500_restrict_art_files_public_read_to_quotes`
- **policies (RLS)** adicionado (2): `storage.objects.art_files_auth_read`, `storage.objects.art_files_quotes_public_read`
- **policies (RLS)** removido (1): `storage.objects.art_files_public_read`

## 2026-11-19 01:23 UTC

- **functions** adicionado (1): `public.fn_supplier_risk_breakdown(p_preferred_only boolean)`
- **functions** alterado (2): `public.fn_rupture_by_level(p_nivel text, p_limit integer, p_offset integer, p_preferred boolean)`, `public.is_supervisor_or_above(_user_id uuid)`
- **migrations** adicionado (1): `20261118223000_fn_supplier_risk_breakdown`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`

## 2026-11-18 15:17 UTC

- **functions** alterado (1): `public.fn_global_search(p_term text, p_limit integer, p_types text[])`
- **lints** removido (1): `rpc_anon_executable:public.fn_global_search(p_term text, p_limit integer, p_types text[])`
- **migrations** adicionado (1): `20261115130300_fn_global_search_clamp_limit_hardened`

## 2026-11-18 12:23 UTC

- **functions** alterado (1): `public.get_edge_functions_base_url()`

## 2026-11-18 04:20 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_14`

## 2026-11-18 02:23 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_21`

## 2026-11-17 13:22 UTC

- **functions** alterado (1): `public.fn_get_rupture_alerts()`

## 2026-11-17 09:20 UTC

- **lints** removido (1): `view_security_definer:public.v_product_properties_public`
- **migrations** adicionado (1): `20261117073000_p06_security_invoker_v_product_properties_public`
- **views** alterado (1): `public.v_product_properties_public`

## 2026-11-17 08:22 UTC

- **functions** alterado (2): `public.fn_product_active_for_rls(p_id uuid)`, `public.user_belongs_to_org(org_id uuid)`

## 2026-11-17 07:19 UTC

- **grants** alterado (1): `public.color_synonym_map:anon`
- **migrations** adicionado (1): `20261101000002_revoke_anon_color_synonym_map_p15`
- **policies (RLS)** removido (1): `public.color_synonym_map.rls_anon_read_color_synonym_map`

## 2026-11-17 02:24 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_13`

## 2026-11-16 22:16 UTC

- **cron jobs** alterado (1): `234:refresh-all-materialized-views`
- **migrations** adicionado (1): `20261114120100_cron005_refresh_all_mvs_diario_timeout_real`

## 2026-11-16 10:21 UTC

- **functions** alterado (106): `public.fn_audit_role_changes()`, `public.fn_auto_classify_kit_product()`, `public.fn_auto_classify_packing()`, `public.fn_auto_classify_product_image()`, `public.fn_auto_criar_equivalencia_spot()`, `public.fn_auto_link_eco_material()`, `public.fn_auto_link_feminine_color()`, `public.fn_auto_set_same_supplier()`, `public.fn_auto_vincular_cor_variante()`, `public.fn_block_unauthorized_product_deactivation()`, `public.fn_category_copywriting_updated()`, `public.fn_color_equiv_clear_primary_on_inactive()`, `public.fn_color_equiv_ensure_primary()`, `public.fn_color_equiv_ensure_primary_stmt()`, `public.fn_cor_generate_slug()`, `public.fn_cor_updated_at()`, `public.fn_custom_kits_sync_user_id()`, `public.fn_dar_check_valid_until_future()`, `public.fn_dar_set_snapshot_hash()`, `public.fn_enforce_inactive_variant_zero_stock()`, `public.fn_ensure_single_primary_image()`, `public.fn_force_user_logout()`, `public.fn_hex_to_rgb()`, `public.fn_image_types_check_constraint_reminder()`, `public.fn_inherit_techniques_from_material()`, `public.fn_kit_component_calc_circumference()`, `public.fn_kit_component_inherit_personalization()`, `public.fn_kit_print_area_normalizar_eixos()`, `public.fn_log_login_attempt()`, `public.fn_log_price_change()`, `public.fn_log_step_up_event()`, `public.fn_normalize_image_format()`, `public.fn_normalize_source_supplier()`, `public.fn_normalize_source_supplier_videos()`, `public.fn_order_items_calc_subtotal()`, `public.fn_orders_sync_seller()`, `public.fn_pad_sync_status()`, `public.fn_pbd_before_write()`, `public.fn_pbd_block_system_delete()`, `public.fn_pipeline_steps_updated_at()` … (+66)
- **migrations** adicionado (1): `20261115130200_sec001_revoke_anon_execute_trigger_functions`

## 2026-11-16 03:22 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_12`

## 2026-11-16 00:44 UTC

- **migrations** adicionado (1): `20261115230000_ai_function_routing_mockup_assistant`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-15 16:17 UTC

- **functions** alterado (6): `public.fn_anon_insert_rate_guard()`, `public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)`, `public.fn_get_stock_notification_counts(p_since date)`, `public.fn_global_search(p_term text, p_limit integer, p_types text[])`, `public.fn_product_market_intelligence(p_product_id uuid, p_days integer)`, `public.refresh_all_materialized_views()`

## 2026-11-15 02:57 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_18`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`

## 2026-11-15 02:47 UTC

- **functions** alterado (4): `public.confirm_notifications_dispatched(p_ids uuid[])`, `public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text, _category text, _action_url text, _metadata jsonb)`, `public.registrar_entrada_estoque(p_variant_sku character varying, p_quantity integer, p_unit_cost numeric, p_supplier_name character varying, p_document_number character varying, p_notes text, p_user_id uuid)`, `public.registrar_saida_estoque(p_variant_sku character varying, p_quantity integer, p_movement_type character varying, p_document_number character varying, p_notes text, p_user_id uuid, p_allow_negative boolean)`
- **migrations** adicionado (1): `20260917061500_e18_revoke_authenticated_authz_gaps`

## 2026-11-15 01:59 UTC

- **functions** alterado (1): `public.set_updated_at()`

## 2026-11-15 01:28 UTC

- **functions** alterado (1): `public.get_quote_token_public(_token text)`

## 2026-11-14 23:47 UTC

- **colunas** adicionado (4): `public.crm_seller_identity_links.auth_user_id`, `public.crm_seller_identity_links.created_at`, `public.crm_seller_identity_links.crm_seller_id`, `public.crm_seller_identity_links.link_source`
- **constraints** adicionado (5): `public.crm_seller_identity_links.crm_seller_identity_links_auth_user_id_fkey`, `public.crm_seller_identity_links.crm_seller_identity_links_crm_seller_id_check`, `public.crm_seller_identity_links.crm_seller_identity_links_crm_seller_id_key`, `public.crm_seller_identity_links.crm_seller_identity_links_link_source_check`, `public.crm_seller_identity_links.crm_seller_identity_links_pkey`
- **grants** adicionado (1): `public.crm_seller_identity_links:service_role`
- **indexes** adicionado (2): `public.crm_seller_identity_links_crm_seller_id_key`, `public.crm_seller_identity_links_pkey`
- **lints** adicionado (1): `rls_no_policies:public.crm_seller_identity_links`
- **migrations** adicionado (1): `20261107134429_create_crm_seller_identity_links`
- **tabelas** adicionado (1): `public.crm_seller_identity_links`

## 2026-11-14 22:27 UTC

- **policies (RLS)** alterado (6): `public.order_items.order_items_insert`, `public.order_items.order_items_select`, `public.order_items.order_items_update`, `public.orders.orders_insert`, `public.orders.orders_select`, `public.orders.orders_update`

## 2026-11-14 22:18 UTC

- **lints** adicionado (6): `policy_auth_fn_not_wrapped:public.order_items.order_items_insert`, `policy_auth_fn_not_wrapped:public.order_items.order_items_select`, `policy_auth_fn_not_wrapped:public.order_items.order_items_update`, `policy_auth_fn_not_wrapped:public.orders.orders_insert`, `policy_auth_fn_not_wrapped:public.orders.orders_select`, `policy_auth_fn_not_wrapped:public.orders.orders_update`
- **migrations** adicionado (2): `20261114170845_fix_workspace_notifications_insert_policy_reapply`, `20261114170921_fix_rls_orders_order_items_seller_scope`
- **policies (RLS)** adicionado (1): `public.workspace_notifications.Authenticated can insert own notifications`
- **policies (RLS)** removido (1): `public.workspace_notifications.Authenticated can insert notifications for valid users`

## 2026-11-14 20:13 UTC

- **colunas** adicionado (1): `public.user_known_devices.is_trusted`
- **indexes** adicionado (7): `public.idx_crm_callback_events_type`, `public.idx_fit_expires_at`, `public.idx_stock_snapshots_variant_supplier`, `public.idx_token_revocations_expires`, `public.idx_token_revocations_jti`, `public.idx_webhook_delivery_locks_claimed_at`, `public.idx_workspace_notifications_category`
- **migrations** adicionado (2): `20261114014100_idx_fk_stock_and_missing_perf_indexes`, `20261114031000_fix_user_known_devices_is_trusted`

## 2026-11-14 19:56 UTC

- **migrations** adicionado (362): `20260511235900_`, `20260512000000_`, `20260525232003_`, `20260526103000_`, `20260526141234_`, `20260526200904_`, `20260526201213_`, `20260526201551_`, `20260526210100_`, `20260526210206_`, `20260526220000_`, `20260527120000_`, `20260527164916_`, `20260527200232_`, `20260527200532_`, `20260527214038_`, `20260527214425_`, `20260527214510_`, `20260527214617_`, `20260528102501_`, `20260528102502_`, `20260529145000_`, `20260529150000_`, `20260529150200_`, `20260530001500_`, `20260530030000_`, `20260530150000_`, `20260530160000_`, `20260530170000_`, `20260531120000_`, `20260531135255_`, `20260531211352_`, `20260531220000_`, `20260601000001_`, `20260601104248_`, `20260601140000_`, `20260601140100_`, `20260601140841_`, `20260602020000_`, `20260602030000_` … (+322)

## 2026-11-14 19:26 UTC

- **functions** alterado (6): `public.can_view_all_sales()`, `public.convert_quote_to_order(p_quote_id uuid, p_seller_id uuid, p_organization_id uuid)`, `public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text, _category text, _action_url text, _metadata jsonb)`, `public.get_user_org_ids(_user_id uuid)`, `public.has_role(_user_id uuid, _role app_role)`, `public.user_is_org_member(org_id uuid)`

## 2026-11-14 17:39 UTC

- **indexes** adicionado (7): `public.idx_stock_notes_created_by`, `public.idx_stock_notes_supplier_id`, `public.idx_stock_snapshots_product_id`, `public.idx_stock_snapshots_supplier_branch_id`, `public.idx_stock_snapshots_supplier_id`, `public.idx_stock_snapshots_variant_id`, `public.idx_stock_snapshots_variant_supplier_source_id`
- **lints** removido (10): `fk_without_index:public.stock_notes.stock_notes_created_by_fkey`, `fk_without_index:public.stock_notes.stock_notes_supplier_id_fkey`, `fk_without_index:public.stock_snapshots.stock_snapshots_product_id_fkey`, `fk_without_index:public.stock_snapshots.stock_snapshots_supplier_branch_id_fkey`, `fk_without_index:public.stock_snapshots.stock_snapshots_supplier_id_fkey`, `fk_without_index:public.stock_snapshots.stock_snapshots_variant_id_fkey`, `fk_without_index:public.stock_snapshots.stock_snapshots_variant_supplier_source_id_fkey`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_delete_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_insert_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_update_own`
- **policies (RLS)** alterado (3): `public.stock_notes.stock_notes_delete_own`, `public.stock_notes.stock_notes_insert_own`, `public.stock_notes.stock_notes_update_own`

## 2026-11-14 11:38 UTC

- **functions** adicionado (1): `public.request_password_reset(p_email text)`
- **functions** alterado (3): `public.audit_security_definer_acl()`, `public.fn_admin_sync_external_connections()`, `public.is_dev(_user_id uuid)`
- **lints** adicionado (1): `rpc_anon_executable:public.request_password_reset(p_email text)`
- **migrations** adicionado (3): `20261112120700_fix_grant_fn_admin_sync_external_connections`, `20261112120800_query_telemetry_delete_dev_policy`, `20261112120900_fix_password_reset_request_rpc_anon`
- **policies (RLS)** adicionado (1): `public.query_telemetry.query_telemetry_delete_dev`

## 2026-11-14 11:28 UTC

- **functions** adicionado (3): `public.admin_execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.fn_dev_medallion_health()`, `public.fn_insights_cache_count(p_function_name text, p_since timestamp with time zone)`
- **functions** alterado (8): `public.can_view_telemetry(_user_id uuid)`, `public.claim_next_optimization()`, `public.complete_optimization(_id uuid, _status text, _notes text, _guardrail_status text, _result jsonb, _error text)`, `public.enqueue_optimization(_title text, _description text, _category text, _priority integer)`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.has_role(_user_id uuid, _role app_role)`, `public.is_dev(_user_id uuid)`, `public.reset_optimization_queue(_only_running boolean)`
- **grants** adicionado (1): `public.v_kill_switch_hits_summary:authenticated`
- **migrations** adicionado (4): `20261112120300_fix_medallion_health_dev_rpc`, `20261112120400_fn_insights_cache_count`, `20261112120500_fix_optimization_queue_rpcs_dev_access`, `20261112120600_admin_execute_role_migration_batch_rpc`
- **views** alterado (1): `public.v_kill_switch_hits_summary`

## 2026-11-14 11:20 UTC

- **functions** adicionado (3): `public.fn_admin_run_smoke_tests()`, `public.fn_admin_smoke_tests_dashboard()`, `public.fn_get_supplier_reliability()`
- **functions** alterado (15): `public.audit_security_definer_acl()`, `public.can_view_telemetry(_user_id uuid)`, `public.check_telemetry_regression()`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.fn_admin_sync_external_connections()`, `public.fn_auto_revoke_secdef_public_execute()`, `public.fn_run_and_persist_smoke_tests()`, `public.get_quote_token_public(_token text)`, `public.has_role(_user_id uuid, _role app_role)`, `public.is_admin_or_above(_user_id uuid)`, `public.is_dev(_user_id uuid)`, `public.is_supervisor_or_above(_user_id uuid)`, `public.sync_external_connections_from_credentials()`, `public.sync_external_connections_from_credentials(_trigger_secret_name text, _trigger_op text, _trigger_user_id uuid)`, `public.trg_sync_external_connections()`
- **migrations** adicionado (3): `20261112120000_fix_fn_get_supplier_reliability`, `20261112120100_fix_smoke_tests_dashboard_admin_rpc`, `20261112120200_fix_kill_switch_obs_grant_summary_view`

## 2026-11-14 06:26 UTC

- **cron jobs** removido (1): `268:xbz-image-uploader`
- **functions** alterado (2): `public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)`, `public.get_edge_function_secret(_name text)`
- **migrations** adicionado (1): `20261114003000_fix_unschedule_cron_xbz_image_uploader`

## 2026-11-14 05:20 UTC

- **cron jobs** alterado (21): `206:sm-variant-coherence-guard`, `207:sm-stock-guard`, `213:sm-category-enqueue`, `214:sm-category-collect`, `219:sm-url-discover-search`, `224:asia-enqueue-new-products`, `225:spot-relink-family-images`, `234:refresh-all-materialized-views`, `263:sm-url-discover-collect`, `264:sm-site-scrape-auth`, `265:spot-stock-fast-sync`, `266:xbz-enrich-gold-extractors`, `268:xbz-image-uploader`, `269:xbz-site-scrape`, `273:process-pending-products`, `276:sm-site-scrape`, `277:xbz-stock-sync`, `278:asia-image-uploader`, `284:kit-ficha-parse-site`, `285:kit-ficha-fetch`, `58:asia-stock-sync`
- **migrations** adicionado (1): `20261113235800_cron003_reagendamento_noturno_fornecedores`

## 2026-11-14 04:24 UTC

- **migrations** adicionado (1): `20261114040000_fix_authenticator_idle_session_timeout_pgrst_listener`
- **roles** alterado (1): `authenticator`

## 2026-11-14 02:56 UTC

- **indexes** adicionado (1): `public.idx_products_active_created_at_desc`
- **migrations** adicionado (1): `20261113235000_perf_idx_products_active_created_at_desc`

## 2026-11-14 02:34 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`

## 2026-11-14 00:50 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`

## 2026-11-13 18:37 UTC

- **functions** alterado (1): `public.is_admin_or_above(_user_id uuid)`
- **migrations** adicionado (1): `20261112140000_fix_rls_supplier_products_raw_history_p2027`
- **policies (RLS)** adicionado (20): `public.supplier_products_raw_history_p2027_03.hist_all_service`, `public.supplier_products_raw_history_p2027_03.hist_select_admin`, `public.supplier_products_raw_history_p2027_04.hist_all_service`, `public.supplier_products_raw_history_p2027_04.hist_select_admin`, `public.supplier_products_raw_history_p2027_05.hist_all_service`, `public.supplier_products_raw_history_p2027_05.hist_select_admin`, `public.supplier_products_raw_history_p2027_06.hist_all_service`, `public.supplier_products_raw_history_p2027_06.hist_select_admin`, `public.supplier_products_raw_history_p2027_07.hist_all_service`, `public.supplier_products_raw_history_p2027_07.hist_select_admin`, `public.supplier_products_raw_history_p2027_08.hist_all_service`, `public.supplier_products_raw_history_p2027_08.hist_select_admin`, `public.supplier_products_raw_history_p2027_09.hist_all_service`, `public.supplier_products_raw_history_p2027_09.hist_select_admin`, `public.supplier_products_raw_history_p2027_10.hist_all_service`, `public.supplier_products_raw_history_p2027_10.hist_select_admin`, `public.supplier_products_raw_history_p2027_11.hist_all_service`, `public.supplier_products_raw_history_p2027_11.hist_select_admin`, `public.supplier_products_raw_history_p2027_12.hist_all_service`, `public.supplier_products_raw_history_p2027_12.hist_select_admin`
- **tabelas** alterado (10): `public.supplier_products_raw_history_p2027_03`, `public.supplier_products_raw_history_p2027_04`, `public.supplier_products_raw_history_p2027_05`, `public.supplier_products_raw_history_p2027_06`, `public.supplier_products_raw_history_p2027_07`, `public.supplier_products_raw_history_p2027_08`, `public.supplier_products_raw_history_p2027_09`, `public.supplier_products_raw_history_p2027_10`, `public.supplier_products_raw_history_p2027_11`, `public.supplier_products_raw_history_p2027_12`

## 2026-11-13 12:46 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`
- **migrations** adicionado (1): `20261111191000_restore_get_sitemap_public_anon_execute`

## 2026-11-13 08:50 UTC

- **functions** removido (1): `public.perf002_drop_unused_snapshot_indexes()`
- **functions** alterado (3): `public.get_edge_function_secret(_name text)`, `public.get_sitemap_public(p_limit integer, p_offset integer)`, `public.has_role(_user_id uuid, _role app_role)`
- **migrations** adicionado (2): `20260511235950_add_categories_level_drift`, `20261108223100_drop_perf002_incident_ddl_survivor`

## 2026-11-13 05:01 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`
- **lints** adicionado (1): `rpc_anon_executable:public.get_sitemap_public(p_limit integer, p_offset integer)`
- **migrations** adicionado (1): `20261112130000_fix_get_sitemap_public_anon_grant`

## 2026-11-13 04:15 UTC

- **colunas** adicionado (18): `public.e2e_cleanup_audit.created_at`, `public.e2e_cleanup_audit.deleted_by_table`, `public.e2e_cleanup_audit.dry_run`, `public.e2e_cleanup_audit.duration_ms`, `public.e2e_cleanup_audit.email`, `public.e2e_cleanup_audit.errors`, `public.e2e_cleanup_audit.id`, `public.e2e_cleanup_audit.ip`, `public.e2e_cleanup_audit.name_filter_prefix`, `public.e2e_cleanup_audit.reason`, `public.e2e_cleanup_audit.seller_id`, `public.e2e_cleanup_audit.seller_scope`, `public.e2e_cleanup_audit.status`, `public.e2e_cleanup_audit.total_deleted`, `public.e2e_cleanup_audit.total_ms`, `public.e2e_cleanup_audit.totals`, `public.e2e_cleanup_audit.user_agent`, `public.e2e_cleanup_audit.user_id`
- **constraints** adicionado (2): `public.e2e_cleanup_audit.e2e_cleanup_audit_pkey`, `public.e2e_cleanup_audit.e2e_cleanup_audit_status_check`
- **grants** adicionado (2): `public.e2e_cleanup_audit:authenticated`, `public.e2e_cleanup_audit:service_role`
- **indexes** adicionado (6): `public.e2e_cleanup_audit_pkey`, `public.idx_e2e_cleanup_audit_created_at`, `public.idx_e2e_cleanup_audit_email`, `public.idx_e2e_cleanup_audit_seller_id`, `public.idx_e2e_cleanup_audit_status`, `public.idx_e2e_cleanup_audit_user_id`
- **migrations** adicionado (1): `20261108001500_reconcile_e2e_cleanup_audit`
- **policies (RLS)** adicionado (1): `public.e2e_cleanup_audit.admins_select_e2e_cleanup_audit`
- **tabelas** adicionado (1): `public.e2e_cleanup_audit`

## 2026-11-13 00:50 UTC

- **functions** adicionado (1): `public.fn_get_rupture_alerts()`
- **functions** alterado (1): `public.is_supervisor_or_above(_user_id uuid)`
- **migrations** adicionado (1): `20261112011000_fix_sb0003_fn_get_rupture_alerts`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_16`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`

## 2026-11-12 23:03 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`

## 2026-11-12 11:44 UTC

- **functions** alterado (2): `public.admin_revoke_user_sessions(_user_id uuid)`, `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-12 03:44 UTC

- **colunas** adicionado (70): `public.supplier_products_raw_history_p2027_03.captured_at`, `public.supplier_products_raw_history_p2027_03.content_hash`, `public.supplier_products_raw_history_p2027_03.id`, `public.supplier_products_raw_history_p2027_03.raw_data`, `public.supplier_products_raw_history_p2027_03.raw_id`, `public.supplier_products_raw_history_p2027_03.supplier_id`, `public.supplier_products_raw_history_p2027_03.supplier_reference`, `public.supplier_products_raw_history_p2027_04.captured_at`, `public.supplier_products_raw_history_p2027_04.content_hash`, `public.supplier_products_raw_history_p2027_04.id`, `public.supplier_products_raw_history_p2027_04.raw_data`, `public.supplier_products_raw_history_p2027_04.raw_id`, `public.supplier_products_raw_history_p2027_04.supplier_id`, `public.supplier_products_raw_history_p2027_04.supplier_reference`, `public.supplier_products_raw_history_p2027_05.captured_at`, `public.supplier_products_raw_history_p2027_05.content_hash`, `public.supplier_products_raw_history_p2027_05.id`, `public.supplier_products_raw_history_p2027_05.raw_data`, `public.supplier_products_raw_history_p2027_05.raw_id`, `public.supplier_products_raw_history_p2027_05.supplier_id`, `public.supplier_products_raw_history_p2027_05.supplier_reference`, `public.supplier_products_raw_history_p2027_06.captured_at`, `public.supplier_products_raw_history_p2027_06.content_hash`, `public.supplier_products_raw_history_p2027_06.id`, `public.supplier_products_raw_history_p2027_06.raw_data`, `public.supplier_products_raw_history_p2027_06.raw_id`, `public.supplier_products_raw_history_p2027_06.supplier_id`, `public.supplier_products_raw_history_p2027_06.supplier_reference`, `public.supplier_products_raw_history_p2027_07.captured_at`, `public.supplier_products_raw_history_p2027_07.content_hash`, `public.supplier_products_raw_history_p2027_07.id`, `public.supplier_products_raw_history_p2027_07.raw_data`, `public.supplier_products_raw_history_p2027_07.raw_id`, `public.supplier_products_raw_history_p2027_07.supplier_id`, `public.supplier_products_raw_history_p2027_07.supplier_reference`, `public.supplier_products_raw_history_p2027_08.captured_at`, `public.supplier_products_raw_history_p2027_08.content_hash`, `public.supplier_products_raw_history_p2027_08.id`, `public.supplier_products_raw_history_p2027_08.raw_data`, `public.supplier_products_raw_history_p2027_08.raw_id` … (+30)
- **constraints** adicionado (10): `public.supplier_products_raw_history_p2027_03.supplier_products_raw_history_p2027_03_pkey`, `public.supplier_products_raw_history_p2027_04.supplier_products_raw_history_p2027_04_pkey`, `public.supplier_products_raw_history_p2027_05.supplier_products_raw_history_p2027_05_pkey`, `public.supplier_products_raw_history_p2027_06.supplier_products_raw_history_p2027_06_pkey`, `public.supplier_products_raw_history_p2027_07.supplier_products_raw_history_p2027_07_pkey`, `public.supplier_products_raw_history_p2027_08.supplier_products_raw_history_p2027_08_pkey`, `public.supplier_products_raw_history_p2027_09.supplier_products_raw_history_p2027_09_pkey`, `public.supplier_products_raw_history_p2027_10.supplier_products_raw_history_p2027_10_pkey`, `public.supplier_products_raw_history_p2027_11.supplier_products_raw_history_p2027_11_pkey`, `public.supplier_products_raw_history_p2027_12.supplier_products_raw_history_p2027_12_pkey`
- **grants** adicionado (30): `public.supplier_products_raw_history_p2027_03:anon`, `public.supplier_products_raw_history_p2027_03:authenticated`, `public.supplier_products_raw_history_p2027_03:service_role`, `public.supplier_products_raw_history_p2027_04:anon`, `public.supplier_products_raw_history_p2027_04:authenticated`, `public.supplier_products_raw_history_p2027_04:service_role`, `public.supplier_products_raw_history_p2027_05:anon`, `public.supplier_products_raw_history_p2027_05:authenticated`, `public.supplier_products_raw_history_p2027_05:service_role`, `public.supplier_products_raw_history_p2027_06:anon`, `public.supplier_products_raw_history_p2027_06:authenticated`, `public.supplier_products_raw_history_p2027_06:service_role`, `public.supplier_products_raw_history_p2027_07:anon`, `public.supplier_products_raw_history_p2027_07:authenticated`, `public.supplier_products_raw_history_p2027_07:service_role`, `public.supplier_products_raw_history_p2027_08:anon`, `public.supplier_products_raw_history_p2027_08:authenticated`, `public.supplier_products_raw_history_p2027_08:service_role`, `public.supplier_products_raw_history_p2027_09:anon`, `public.supplier_products_raw_history_p2027_09:authenticated`, `public.supplier_products_raw_history_p2027_09:service_role`, `public.supplier_products_raw_history_p2027_10:anon`, `public.supplier_products_raw_history_p2027_10:authenticated`, `public.supplier_products_raw_history_p2027_10:service_role`, `public.supplier_products_raw_history_p2027_11:anon`, `public.supplier_products_raw_history_p2027_11:authenticated`, `public.supplier_products_raw_history_p2027_11:service_role`, `public.supplier_products_raw_history_p2027_12:anon`, `public.supplier_products_raw_history_p2027_12:authenticated`, `public.supplier_products_raw_history_p2027_12:service_role`
- **indexes** adicionado (10): `public.supplier_products_raw_history_p2027_03_pkey`, `public.supplier_products_raw_history_p2027_04_pkey`, `public.supplier_products_raw_history_p2027_05_pkey`, `public.supplier_products_raw_history_p2027_06_pkey`, `public.supplier_products_raw_history_p2027_07_pkey`, `public.supplier_products_raw_history_p2027_08_pkey`, `public.supplier_products_raw_history_p2027_09_pkey`, `public.supplier_products_raw_history_p2027_10_pkey`, `public.supplier_products_raw_history_p2027_11_pkey`, `public.supplier_products_raw_history_p2027_12_pkey`
- **migrations** adicionado (1): `20261104100000_partitions_supplier_products_raw_history_2027`
- **tabelas** adicionado (10): `public.supplier_products_raw_history_p2027_03`, `public.supplier_products_raw_history_p2027_04`, `public.supplier_products_raw_history_p2027_05`, `public.supplier_products_raw_history_p2027_06`, `public.supplier_products_raw_history_p2027_07`, `public.supplier_products_raw_history_p2027_08`, `public.supplier_products_raw_history_p2027_09`, `public.supplier_products_raw_history_p2027_10`, `public.supplier_products_raw_history_p2027_11`, `public.supplier_products_raw_history_p2027_12`

## 2026-11-12 02:07 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`

## 2026-11-11 18:58 UTC

- **functions** alterado (7): `public.audit_rls_coverage()`, `public.check_ai_quota(_user_id uuid)`, `public.ensure_default_favorite_list(_user_id uuid)`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.has_role(_user_id uuid, _role app_role)`, `public.increment_kit_template_usage(_template_id uuid)`, `public.record_platform_failure(p_operation text, p_table text, p_rpc_name text, p_duration_ms integer, p_error_message text, p_is_503 boolean, p_is_cold_start boolean, p_retry_count integer)`

## 2026-11-11 01:14 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_14`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_07`

## 2026-11-10 03:16 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_13`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_06`

## 2026-11-09 19:15 UTC

- **functions** alterado (7): `public.audit_rls_coverage()`, `public.check_ai_quota(_user_id uuid)`, `public.ensure_default_favorite_list(_user_id uuid)`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.has_role(_user_id uuid, _role app_role)`, `public.increment_kit_template_usage(_template_id uuid)`, `public.record_platform_failure(p_operation text, p_table text, p_rpc_name text, p_duration_ms integer, p_error_message text, p_is_503 boolean, p_is_cold_start boolean, p_retry_count integer)`

## 2026-11-09 05:11 UTC

- **functions** alterado (1): `public.fn_check_item_fits(p_packaging_id uuid, p_product_id uuid, p_current_used_liters numeric)`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_12`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_05`

## 2026-11-08 21:01 UTC

- **functions** alterado (2): `public.fn_standardize_supplier(p_supplier_id uuid, p_limit integer)`, `public.is_admin_or_above(_user_id uuid)`

## 2026-11-08 05:24 UTC

- **grants** alterado (1): `public.suppliers:authenticated`
- **migrations** adicionado (1): `20261107180000_security_fix_suppliers_authenticated_credential_leak_v2`

## 2026-11-08 04:17 UTC

- **functions** alterado (1): `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-08 00:40 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_04`

## 2026-11-07 02:05 UTC

- **functions** alterado (1): `public.handle_updated_at()`
- **migrations** adicionado (1): `20261106232045_fix_handle_updated_at_search_path`

## 2026-11-07 01:53 UTC

- **lints** adicionado (1): `view_security_definer:public.vw_system_health_quick`
- **migrations** adicionado (1): `20261101201000_fix_health_view_backup_check`
- **views** alterado (1): `public.vw_system_health_quick`

## 2026-11-07 00:48 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_03`

## 2026-11-06 16:13 UTC

- **colunas** adicionado (9): `public.stock_notes.created_at`, `public.stock_notes.created_by`, `public.stock_notes.deleted_at`, `public.stock_notes.id`, `public.stock_notes.is_pinned`, `public.stock_notes.note`, `public.stock_notes.supplier_id`, `public.stock_notes.updated_at`, `public.stock_notes.variant_id`
- **constraints** adicionado (4): `public.stock_notes.stock_notes_created_by_fkey`, `public.stock_notes.stock_notes_pkey`, `public.stock_notes.stock_notes_supplier_id_fkey`, `public.stock_notes.stock_notes_variant_id_fkey`
- **functions** adicionado (1): `public.handle_updated_at()`
- **grants** adicionado (3): `public.stock_notes:anon`, `public.stock_notes:authenticated`, `public.stock_notes:service_role`
- **indexes** adicionado (3): `public.stock_notes_active_idx`, `public.stock_notes_pkey`, `public.stock_notes_variant_idx`
- **lints** adicionado (5): `fk_without_index:public.stock_notes.stock_notes_created_by_fkey`, `fk_without_index:public.stock_notes.stock_notes_supplier_id_fkey`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_delete_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_insert_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_update_own`
- **migrations** adicionado (1): `20261031000000_create_stock_notes`
- **policies (RLS)** adicionado (4): `public.stock_notes.stock_notes_delete_own`, `public.stock_notes.stock_notes_insert_own`, `public.stock_notes.stock_notes_select_authenticated`, `public.stock_notes.stock_notes_update_own`
- **tabelas** adicionado (1): `public.stock_notes`
- **triggers** adicionado (1): `public.stock_notes.set_stock_notes_updated_at`

## 2026-11-06 01:55 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_02`

## 2026-11-05 07:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_01`

## 2026-11-04 12:22 UTC

- Snapshot inicial.

