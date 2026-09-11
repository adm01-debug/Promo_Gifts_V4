-- Adicionar get_catalog_bestseller_page e get_promo_sales_ranking à whitelist
-- Ambas são funções de catálogo público legítimas criadas/atualizadas pelo Lovable.
CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH defs AS (
    SELECT
      p.oid, p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proacl,
      (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
      (p.proname IN (
        'submit_quote_response',
        'get_quote_token_by_value',
        'check_login_rate_limit'
      )) AS public_intent,
      (p.proname IN (
        'fn_video_queue_next','fn_xbz_enqueue_videos','fn_xbz_link_video',
        'fn_asia_link_video','fn_video_link_to_products','fn_sm_link_video',
        'fn_spot_enqueue_new_videos','fn_spot_enqueue_vimeo_eu','fn_spot_link_video',
        'fn_spot_vimeo_daily_sync','fn_video_link','fn_video_queue_old_uid',
        'fn_video_queue_recover_stuck','fn_video_queue_update','fn_video_retry_errors',
        'fn_video_set_dimensions','fn_video_sim_export','fn_video_sim_upsert'
      )) AS anon_pipeline,
      (p.proname IN (
        'fn_check_login_allowed','fn_bulk_update_image_dimensions','fn_cf_audit_ingest',
        'fn_save_ai_enrichment_results','fn_dequeue_ai_enrichment','fn_enqueue_ai_enrichment'
      )) AS anon_edge,
      (p.proname IN (
        'mcp_kv_get','mcp_kv_set','mcp_kv_try_lock'
      )) AS anon_mcp,
      (p.proname IN (
        -- Super Filtro
        'fn_super_filtro','fn_super_filtro_facets','fn_super_filtro_opcoes',
        'fn_super_filtro_price_range','fn_super_filtro_product_ids',
        -- Catálogo público
        'fn_get_all_leaf_categories','fn_get_product_intelligence_all',
        'fn_get_category_breadcrumb','fn_log_search_analytics',
        'get_promo_sales_ranking','get_catalog_bestseller_page',  -- ← NOVO
        -- Reposição/análise
        'fn_get_reposicao_listing','fn_get_reposicao_metrics',
        'fn_get_recent_restocks','fn_get_replenishment_stats'
      )) AS catalog_intent
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT d.oid, d.proname, d.args, d.is_trigger,
           d.public_intent, d.anon_pipeline, d.anon_edge, d.anon_mcp,
           d.catalog_intent,
           a.grantee::regrole::text AS grantee
    FROM defs d
    LEFT JOIN LATERAL (SELECT (aclexplode(d.proacl)).grantee) a ON true
    WHERE a.grantee IS NOT NULL
  ),
  policy_uses AS (
    SELECT DISTINCT d.oid, d.proname, d.args
    FROM defs d
    JOIN pg_policies pp
      ON pp.schemaname = 'public'
      AND (
        COALESCE(pp.qual, '') ~ ('\m' || d.proname || '\M')
        OR COALESCE(pp.with_check, '') ~ ('\m' || d.proname || '\M')
      )
  )
  SELECT proname, args, 'PUBLIC has EXECUTE'::text, 'PUBLIC'::text
  FROM acl_expanded
  WHERE grantee = '-'
    AND NOT (public_intent OR catalog_intent OR anon_pipeline OR anon_edge OR anon_mcp)
  UNION ALL
  SELECT proname, args, 'anon has EXECUTE (not in public-intent whitelist)'::text, 'anon'
  FROM acl_expanded
  WHERE grantee = 'anon'
    AND NOT (public_intent OR catalog_intent OR anon_pipeline OR anon_edge OR anon_mcp)
  UNION ALL
  SELECT proname, args, 'trigger function has EXECUTE for authenticated'::text, 'authenticated'
  FROM acl_expanded
  WHERE grantee = 'authenticated' AND is_trigger
  UNION ALL
  SELECT pu.proname, pu.args,
         'used in RLS policy but missing EXECUTE for authenticated (RLS will fail with 42501)'::text,
         'authenticated (MISSING)'::text
  FROM policy_uses pu
  WHERE NOT EXISTS (
    SELECT 1 FROM acl_expanded a
    WHERE a.oid = pu.oid AND a.grantee = 'authenticated'
  )
  ORDER BY 1, 2;
$function$;

GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl() TO authenticated;

SELECT 
  COUNT(*) FILTER (WHERE granted_to = 'PUBLIC') AS public_violations,
  COUNT(*) FILTER (WHERE granted_to = 'anon') AS anon_violations,
  COUNT(*) AS total
FROM public.audit_security_definer_acl();
;
