
-- SEC P1-2: Revoke overly-broad EXECUTE on SECURITY DEFINER functions

-- ─── (A) Revoke pipeline/internal functions from anon ────────────────────────
DO $$
DECLARE
  r record;
  keep_for_anon text[] := ARRAY[
    'check_login_rate_limit',
    'fn_check_login_allowed',
    'enforce_password_reset_rate_limit',
    'get_quote_token_by_value',
    'submit_quote_response',
    'get_catalog_bestseller_page',
    'get_top_collected_products',
    'get_promo_sales_ranking',
    'get_collections_weekly_count',
    'fn_super_filtro',
    'fn_super_filtro_facets',
    'fn_super_filtro_opcoes',
    'fn_super_filtro_price_range',
    'fn_super_filtro_product_ids',
    'fn_get_category_breadcrumb',
    'fn_get_all_leaf_categories',
    'fn_global_search',
    'fn_get_similar_products',
    'fn_get_color_swatches_batch',
    'fn_get_product_customization_options',
    'fn_get_customization_price',
    'fn_log_search_analytics',
    'fn_get_product_intelligence_all',
    'has_role',
    'is_admin',
    'is_admin_or_above',
    'is_coord_or_above',
    'can_view_all_sales',
    'can_manage_org',
    'can_access_quote',
    'is_org_member',
    'is_org_owner_or_admin',
    'user_is_org_member',
    'org_has_any_members',
    'get_organization_id_for_user',
    'get_user_organization_id',
    'mcp_kv_get'
  ];
BEGIN
  FOR r IN
    SELECT DISTINCT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT (p.proname = ANY(keep_for_anon))
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
                     r.proname, r.args);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Could not revoke anon EXECUTE on %.%(%): %',
        'public', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ─── (B) Revoke credential-leaking + destructive functions from authenticated ─
DO $$
DECLARE
  r record;
  revoke_from_auth text[] := ARRAY[
    'fn_get_asia_api_key',
    'fn_get_asia_secret_key',
    'fn_get_cf_api_token',
    'fn_get_cf_credentials',
    'fn_get_cf_account_id',
    'fn_get_sm_session_cookie',
    'fn_get_spot_access_key',
    'get_edge_anon_key',
    'get_vault_secret',
    'fn_audit_and_fix_grants',
    'fn_auto_revoke_secdef_public_execute',
    'fn_revoke_truncate_public',
    'fn_revoke_view_write_grants_on_create',
    'fn_grant_default_role_on_profile',
    'execute_role_migration_batch',
    'fn_pgrst_reload',
    'fn_vacuum_high_dead_tuples',
    'fn_cascade_deactivate_vss',
    'fn_cascade_product_deactivation',
    'fn_admin_sync_external_connections',
    'fn_capture_schema_baseline',
    'fn_run_schema_drift_check',
    'fn_compute_and_record_drift',
    'fn_check_schema_signature_drift',
    'fn_capture_connection_snapshot',
    'fn_bulk_request_deactivation',
    'fn_cleanup_log_tables',
    'fn_cleanup_webhook_dispatcher_log',
    'fn_purge_spr_history',
    'fn_purge_old_stock_snapshots',
    'fn_purge_expired_restock_dates',
    'fn_site_promote_to_gold',
    'fn_asia_site_promote_to_gold'
  ];
BEGIN
  FOR r IN
    SELECT DISTINCT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY(revoke_from_auth)
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
                     r.proname, r.args);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Could not revoke authenticated EXECUTE on %.%(%): %',
        'public', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END;
$$;
;
