-- ============================================================================
-- MIGRATION: security_definer_acl_revoke_public_anon_20260619
-- Codifica em migration formal o REVOKE aplicado via execute_sql direto
-- durante a sessão de hardening de segurança de 2026-06-19.
--
-- Contexto: audit_security_definer_acl() identificou 262 violações onde
-- funções SECURITY DEFINER tinham EXECUTE concedido para PUBLIC/anon sem
-- propósito legítimo. O REVOKE em massa foi aplicado via DO block.
--
-- Esta migration é idempotente: REVOKE de privilégio inexistente é no-op.
--
-- Funções whitelistadas (excluídas do REVOKE — têm acesso legítimo):
-- catálogo público, pipeline VPS/n8n, edge functions via anon key, MCP KV.
-- Ver também: expand_security_definer_acl_whitelist_20260619
-- ============================================================================

-- (1) REVOKE das 2 trigger functions com PUBLIC grant residual
--     Triggers executam como owner — PUBLIC é irrelevante e é superfície desnecessária
REVOKE EXECUTE ON FUNCTION public.fn_handle_canonical_root_soft_delete() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_reset_is_shared_on_canonical_null() FROM PUBLIC, anon;

-- (2) REVOKE em massa via DO block (idempotente)
--     Replica o REVOKE aplicado no DO block de 83 funções em 2026-06-19.
--     Lista de exclusão (whitelist) idêntica à aplicada no DO block original.
DO $$
DECLARE
  r RECORD;
  revoke_sql TEXT;
BEGIN
  FOR r IN (
    SELECT DISTINCT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname NOT IN (
        -- Catálogo público
        'fn_super_filtro','fn_super_filtro_facets','fn_super_filtro_opcoes',
        'fn_super_filtro_price_range','fn_super_filtro_product_ids',
        'fn_get_all_leaf_categories','fn_get_product_intelligence_all',
        'fn_get_category_breadcrumb','fn_log_search_analytics','get_promo_sales_ranking',
        -- Pipeline vídeo VPS/n8n
        'fn_video_queue_next','fn_xbz_enqueue_videos','fn_xbz_link_video',
        'fn_asia_link_video','fn_video_link_to_products','fn_sm_link_video',
        'fn_spot_enqueue_new_videos','fn_spot_enqueue_vimeo_eu','fn_spot_link_video',
        'fn_spot_vimeo_daily_sync','fn_video_link','fn_video_queue_old_uid',
        'fn_video_queue_recover_stuck','fn_video_queue_update','fn_video_retry_errors',
        'fn_video_set_dimensions','fn_video_sim_export','fn_video_sim_upsert',
        -- Edge functions via anon key
        'fn_check_login_allowed','fn_bulk_update_image_dimensions','fn_cf_audit_ingest',
        'fn_save_ai_enrichment_results','fn_dequeue_ai_enrichment','fn_enqueue_ai_enrichment',
        -- MCP KV
        'mcp_kv_get','mcp_kv_set','mcp_kv_try_lock',
        -- Whitelist original do gate
        'submit_quote_response','get_quote_token_by_value','check_login_rate_limit',
        -- Reposição/análise
        'fn_get_reposicao_listing','fn_get_reposicao_metrics',
        'fn_get_recent_restocks','fn_get_replenishment_stats'
      )
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) ace
        WHERE ace.privilege_type = 'EXECUTE'
          AND ace.grantee IN (
            (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
            0 -- PUBLIC
          )
      )
    ORDER BY p.proname
  ) LOOP
    IF r.args IS NOT NULL AND r.args != '' THEN
      revoke_sql := format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    ELSE
      revoke_sql := format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon', r.proname);
    END IF;
    BEGIN
      EXECUTE revoke_sql;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignorar erros (idempotente)
    END;
  END LOOP;
END $$;

-- Verificação: deve retornar 0 ou apenas trigger_normal (ruído esperado)
SELECT COUNT(*) FILTER (WHERE granted_to IN ('PUBLIC','anon')) AS violacoes_restantes,
       COUNT(*) FILTER (WHERE problem LIKE 'trigger function%') AS trigger_noise
FROM public.audit_security_definer_acl();
;
