-- ============================================================================
-- MELHORIA #5: Event trigger automático para funções SECURITY DEFINER
--
-- Problema: Lovable cria funções SECURITY DEFINER com EXECUTE para PUBLIC/anon
-- por default. Isso cria superfície de ataque desnecessária.
--
-- Solução: Event trigger que executa após CREATE/ALTER FUNCTION e revoga
-- EXECUTE de PUBLIC e anon para qualquer função SECURITY DEFINER nova
-- que não esteja na whitelist de funções com acesso legítimo público.
--
-- Whitelist (não são revogadas):
-- - Catálogo público: fn_super_filtro*, fn_get_*, get_catalog_*, etc.
-- - Pipeline vídeo: fn_video_*, fn_xbz_*, fn_spot_*, etc.
-- - Edge functions: fn_check_login_allowed, fn_bulk_update_*, etc.
-- - MCP KV: mcp_kv_*
-- - Auth pública: submit_quote_response, get_quote_token_by_value, etc.
--
-- Idempotente: REVOKE de privilégio que não existe é no-op.
-- ============================================================================

-- Função do event trigger
CREATE OR REPLACE FUNCTION public.fn_auto_revoke_secdef_public_execute()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  obj          record;
  func_name    text;
  func_args    text;
  is_secdef    boolean;
  is_whitelisted boolean;
BEGIN
  FOR obj IN
    SELECT object_type, schema_name, object_identity, objid
    FROM pg_event_trigger_ddl_commands()
    WHERE object_type IN ('function', 'procedure')
      AND schema_name = 'public'
  LOOP
    -- Verificar se é SECURITY DEFINER
    SELECT p.prosecdef INTO is_secdef
    FROM pg_proc p
    WHERE p.oid = obj.objid;

    IF NOT is_secdef THEN CONTINUE; END IF;

    -- Obter nome e argumentos
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    INTO func_name, func_args
    FROM pg_proc p WHERE p.oid = obj.objid;

    -- Verificar whitelist (funções com acesso público legítimo)
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
      -- Meta (este próprio event trigger)
      'fn_auto_revoke_secdef_public_execute',
      'fn_revoke_view_write_grants_on_create',
      'audit_security_definer_acl'
    );

    -- Se não está na whitelist, revogar EXECUTE de PUBLIC e anon
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
$function$;

-- Criar o event trigger
DROP EVENT TRIGGER IF EXISTS evt_auto_revoke_secdef_public_execute;

CREATE EVENT TRIGGER evt_auto_revoke_secdef_public_execute
  ON ddl_command_end
  WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION', 'CREATE PROCEDURE', 'ALTER PROCEDURE')
  EXECUTE FUNCTION public.fn_auto_revoke_secdef_public_execute();

-- Verificar que foi criado
SELECT 
  evtname, evtevent, evtenabled,
  CASE evtenabled WHEN 'O' THEN '✅ ENABLED (ORIGIN)' ELSE evtenabled::text END AS status
FROM pg_event_trigger
WHERE evtname = 'evt_auto_revoke_secdef_public_execute';
;
