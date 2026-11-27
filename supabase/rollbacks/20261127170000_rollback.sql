-- Rollback de 20261127170000_security_definer_remove_pg_temp
-- Restaura `pg_temp` como ÚLTIMO elemento do search_path, exatamente como estava
-- antes da migration. Simétrico 44/44. O ALTER não dispara revogação de ACL.

ALTER FUNCTION public.admin_execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean) SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.check_login_rate_limit(_email text, _ip text) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.claim_next_optimization() SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.complete_optimization(_id uuid, _status text, _notes text, _guardrail_status text, _result jsonb, _error text) SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.enqueue_optimization(_title text, _description text, _category text, _priority integer) SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.fn_admin_ai_quota_summary(_search text, _limit integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_admin_anon_access_audit() SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_admin_classification_apply(_dry_run boolean, _min_matches integer) SET search_path TO public, classification_audit, pg_temp;
ALTER FUNCTION public.fn_admin_classification_suggestions(_search text, _somente_gaps boolean, _min_matches integer, _limit integer) SET search_path TO public, classification_audit, pg_temp;
ALTER FUNCTION public.fn_admin_classification_summary() SET search_path TO public, classification_audit, pg_temp;
ALTER FUNCTION public.fn_admin_link_crm_seller(_crm_seller_id bigint, _auth_user_id uuid, _email text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_admin_list_crm_seller_links(_search text, _limit integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_admin_run_smoke_tests() SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.fn_admin_smoke_tests_dashboard() SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.fn_admin_sync_external_connections() SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.fn_admin_unlink_crm_seller(_auth_user_id uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_anon_catalog_grant_audit_run() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_auto_assign_org_on_profile() SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_dev_medallion_health() SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_dev_ops_infra_telemetry(_days integer, _top integer) SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_ema_coverage_stats() SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_ensure_history_partitions(p_months_ahead integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_get_rupture_alerts() SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_get_supplier_reliability() SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_global_search(p_term text, p_limit integer, p_types text[]) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_insights_cache_count(p_function_name text, p_since timestamp with time zone) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_product_active_for_rls(p_id uuid) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_qa_check_image_coverage() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_qa_scan_imageless_products() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_ruptura_forecast_7_15_30() SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_supplier_risk_breakdown(p_preferred_only boolean) SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_variant_sparkline(p_variant_id uuid, p_days integer) SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.fn_verify_anon_catalog_grants() SET search_path TO public, pg_temp;
ALTER FUNCTION public.fn_whatif_scenario(p_delta_units_per_sku numeric, p_nivel_filter text, p_supplier_id uuid) SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer) SET search_path TO pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.get_edge_function_secret(_name text) SET search_path TO vault, public, pg_temp;
ALTER FUNCTION public.get_quote_token_public(_token text) SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.get_sitemap_public(p_limit integer, p_offset integer) SET search_path TO public, pg_catalog, pg_temp;
ALTER FUNCTION public.prevent_non_admin_quote_item_price_change() SET search_path TO public, pg_temp;
ALTER FUNCTION public.request_password_reset(p_email text) SET search_path TO pg_catalog, pg_temp;
ALTER FUNCTION public.set_quote_sent_at() SET search_path TO public, pg_temp;
