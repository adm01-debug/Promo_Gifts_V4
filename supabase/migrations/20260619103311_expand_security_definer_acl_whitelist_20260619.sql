-- ============================================================================
-- MIGRATION: expand_security_definer_acl_whitelist_20260619
-- Expande a whitelist de public_intent em audit_security_definer_acl()
-- para refletir as funções intencionalmente acessíveis via anon/PUBLIC.
--
-- Contexto: após REVOKE em massa (83 funções), restaram 51 "violações" que
-- são todas intencionais — pipeline VPS/n8n (anon key), catálogo público,
-- AI enrichment, MCP KV. Este gate foi atualizado para reconhecê-las.
--
-- Categorias adicionadas à whitelist:
--   anon_pipeline  → VPS/n8n chamam via anon key (sem sessão de usuário)
--   anon_catalog   → catálogo público (usuários não-logados)
--   anon_edge      → edge functions que usam anon key
--   anon_mcp       → MCP server usa anon key
--   public_catalog → catálogo requer PUBLIC (PostgREST não-autenticado)
-- ============================================================================

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

      -- Whitelist original: funções public-intent por design
      (p.proname IN (
        'submit_quote_response',
        'get_quote_token_by_value',
        'check_login_rate_limit'  -- Onda 20.A — B-6 pre-login rate limit
      )) AS public_intent,

      -- Pipeline VPS/n8n: chamadas via anon key sem sessão de usuário
      (p.proname IN (
        'fn_video_queue_next',          -- VPS: pega próximo item da fila
        'fn_xbz_enqueue_videos',        -- n8n: enfileira vídeos XBZ
        'fn_xbz_link_video',            -- VPS: vincula CF Stream ao produto XBZ
        'fn_asia_link_video',           -- VPS: vincula CF Stream ao produto ASIA
        'fn_video_link_to_products',    -- VPS: vincula vídeo SPOT a produtos
        'fn_sm_link_video',             -- VPS: vincula vídeo SóMarcas
        'fn_spot_link_video',           -- VPS: vincula vídeo Spot
        'fn_spot_enqueue_new_videos',   -- VPS: enfileira novos vídeos Spot
        'fn_spot_enqueue_vimeo_eu',     -- VPS: Vimeo EU enqueue Spot
        'fn_spot_vimeo_daily_sync',     -- VPS: sincronização diária Vimeo
        'fn_video_link',                -- VPS: link genérico de vídeo
        'fn_video_queue_old_uid',       -- VPS: busca UID antigo na fila
        'fn_video_queue_recover_stuck', -- VPS: recupera itens travados
        'fn_video_queue_update',        -- VPS: atualiza status na fila
        'fn_video_retry_errors',        -- VPS: reprocessa erros de vídeo
        'fn_video_set_dimensions',      -- VPS: persiste dimensões do vídeo CF
        'fn_video_sim_export',          -- VPS: exporta dados de simulação
        'fn_video_sim_upsert'           -- VPS: upsert de simulação
      )) AS anon_pipeline,

      -- Edge functions que usam anon key (não service_role)
      (p.proname IN (
        'fn_check_login_allowed',           -- check-login edge: pré-autenticação
        'fn_bulk_update_image_dimensions',  -- backfill-image-dimensions edge
        'fn_cf_audit_ingest',               -- CF audit edge: ingestão de audit
        'fn_save_ai_enrichment_results',    -- AI enrichment edge: salva resultado
        'fn_dequeue_ai_enrichment',         -- AI enrichment edge: consome fila
        'fn_enqueue_ai_enrichment'          -- AI enrichment edge: enfileira
      )) AS anon_edge,

      -- MCP server usa anon key para KV store
      (p.proname IN (
        'mcp_kv_get',      -- MCP: lê valor do KV
        'mcp_kv_set',      -- MCP: grava valor no KV
        'mcp_kv_try_lock'  -- MCP: tenta adquirir lock
      )) AS anon_mcp,

      -- Catálogo público: chamadas por usuários não-logados
      (p.proname IN (
        'fn_super_filtro',              -- Super Filtro principal
        'fn_super_filtro_facets',       -- Super Filtro: facets
        'fn_super_filtro_opcoes',       -- Super Filtro: opções de filtro
        'fn_super_filtro_price_range',  -- Super Filtro: range de preço
        'fn_super_filtro_product_ids',  -- Super Filtro: IDs de produtos
        'fn_get_all_leaf_categories',   -- Catálogo: categorias folha
        'fn_get_product_intelligence_all', -- Catálogo: intelligence
        'fn_get_category_breadcrumb',   -- Catálogo: breadcrumb de categoria
        'fn_log_search_analytics',      -- Analytics de busca (anon permitido)
        'get_promo_sales_ranking',      -- Ranking de vendas público
        -- Reposição/análise: mantidos por precaução (chamados em contextos mistos)
        'fn_get_reposicao_listing',
        'fn_get_reposicao_metrics',
        'fn_get_recent_restocks',
        'fn_get_replenishment_stats'
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

-- Conceder EXECUTE para authenticated (o gate deve ser auditável por admins)
GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl() TO authenticated;

SELECT 'audit_security_definer_acl atualizado com whitelist expandida' AS status,
       now() AS applied_at;
;
