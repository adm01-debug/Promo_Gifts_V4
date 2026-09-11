
-- ============================================================
-- Adicionar get_favorite_list_counts à whitelist do event trigger
-- 
-- CONTEXTO: fn_auto_revoke_secdef_public_execute revoga grants de
-- qualquer SECURITY DEFINER não whitelistada. get_favorite_list_counts
-- é uma função legítima de uso público (authenticated). Sem whitelist,
-- cada CREATE FUNCTION dispara revogação silenciosa de grants.
--
-- A função atual usa DEFAULT NULL::uuid — design correto e superior
-- a dois overloads separados (uma única função serve ambos os casos).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_auto_revoke_secdef_public_execute()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $etbody$
DECLARE
  obj            record;
  func_name      text;
  func_args      text;
  is_secdef      boolean;
  is_whitelisted boolean;
BEGIN
  FOR obj IN
    SELECT object_type, schema_name, object_identity, objid
    FROM pg_event_trigger_ddl_commands()
    WHERE object_type IN ('function', 'procedure')
      AND schema_name = 'public'
  LOOP
    SELECT p.prosecdef INTO is_secdef
    FROM pg_proc p WHERE p.oid = obj.objid;
    IF NOT is_secdef THEN CONTINUE; END IF;

    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    INTO func_name, func_args
    FROM pg_proc p WHERE p.oid = obj.objid;

    is_whitelisted := func_name IN (
      -- Super Filtro (catálogo público)
      'fn_super_filtro', 'fn_super_filtro_facets', 'fn_super_filtro_opcoes',
      'fn_super_filtro_price_range', 'fn_super_filtro_product_ids',
      -- Catálogo e navegação
      'fn_get_all_leaf_categories', 'fn_get_product_intelligence_all',
      'fn_get_category_breadcrumb', 'fn_log_search_analytics',
      'get_promo_sales_ranking', 'get_catalog_bestseller_page',
      'fn_get_catalog_page', 'fn_get_product_detail',
      -- Reposição/análise
      'fn_get_reposicao_listing', 'fn_get_reposicao_metrics',
      'fn_get_recent_restocks', 'fn_get_replenishment_stats',
      -- Pipeline vídeo VPS/n8n
      'fn_video_queue_next', 'fn_xbz_enqueue_videos', 'fn_xbz_link_video',
      'fn_asia_link_video', 'fn_video_link_to_products', 'fn_sm_link_video',
      'fn_spot_enqueue_new_videos', 'fn_spot_enqueue_vimeo_eu', 'fn_spot_link_video',
      'fn_spot_vimeo_daily_sync', 'fn_video_link', 'fn_video_queue_old_uid',
      'fn_video_queue_recover_stuck', 'fn_video_queue_update', 'fn_video_retry_errors',
      'fn_video_set_dimensions', 'fn_video_sim_export', 'fn_video_sim_upsert',
      -- Edge functions via anon key
      'fn_check_login_allowed', 'fn_bulk_update_image_dimensions', 'fn_cf_audit_ingest',
      'fn_save_ai_enrichment_results', 'fn_dequeue_ai_enrichment', 'fn_enqueue_ai_enrichment',
      -- MCP KV
      'mcp_kv_get', 'mcp_kv_set', 'mcp_kv_try_lock',
      -- Auth pública
      'submit_quote_response', 'get_quote_token_by_value', 'check_login_rate_limit',
      -- Color matching
      'fn_match_canonical_color',
      -- *** FAVORITOS — adicionados 2026-06-22 ***
      'get_favorite_list_counts',   -- DEFAULT NULL::uuid; serve calls com e sem _user_id
      'ensure_default_favorite_list',
      -- Meta
      'fn_auto_revoke_secdef_public_execute',
      'fn_revoke_view_write_grants_on_create',
      'audit_security_definer_acl',
      'fn_get_edge_functions_base_url',
      'get_edge_functions_base_url',
      'get_edge_anon_key',
      'get_edge_function_secret'
    );

    IF NOT is_whitelisted THEN
      BEGIN
        IF func_args IS NOT NULL AND func_args != '' THEN
          EXECUTE format(
            'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
            func_name, func_args
          );
        ELSE
          EXECUTE format(
            'REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon',
            func_name
          );
        END IF;
        RAISE NOTICE 'evt_auto_revoke_secdef: revoked EXECUTE on %.%(%) from PUBLIC, anon',
          'public', func_name, COALESCE(func_args, '');
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'evt_auto_revoke_secdef: could not revoke on %.%(%): %',
          'public', func_name, COALESCE(func_args, ''), SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$etbody$;

-- Garantir grants corretos após whitelist (event trigger foi chamado acima)
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts(_user_id uuid) TO authenticated, service_role;

-- Sanity-checks
DO $$
BEGIN
  -- Event trigger inclui get_favorite_list_counts?
  IF NOT (SELECT pg_get_functiondef(p.oid) ILIKE '%get_favorite_list_counts%'
          FROM pg_proc p WHERE p.proname='fn_auto_revoke_secdef_public_execute') THEN
    RAISE EXCEPTION 'FAIL: whitelist não inclui get_favorite_list_counts';
  END IF;
  -- Função tem DEFAULT NULL?
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_favorite_list_counts'
      AND p.pronargdefaults > 0) THEN
    RAISE EXCEPTION 'FAIL: get_favorite_list_counts não tem parâmetro DEFAULT';
  END IF;
  RAISE NOTICE 'PASS: whitelist + função OK';
END $$;
;
