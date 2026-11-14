-- fix(auth): RPC request_password_reset — "Esqueci a senha" volta a funcionar para usuário deslogado
-- Rollback: supabase/rollbacks/20261112120900_rollback.sql
--   (DROP FUNCTION IF EXISTS public.request_password_reset(text) + restaura
--    audit_security_definer_acl() da versão 20261024163500)
--
-- Causa (bug #50, src/hooks/auth/usePasswordResetRequests.ts:160-181):
--   ForgotPasswordForm (tela de login, sempre anon) fazia SELECT de duplicidade e
--   INSERT direto em public.password_reset_requests. Em produção o papel anon NÃO tem
--   SELECT nem INSERT na tabela (grants atuais: anon = REFERENCES, TRIGGER). O SELECT
--   devolve 42501 e o fluxo inteiro aborta; mesmo sem o SELECT, o INSERT também daria
--   42501. Nenhuma solicitação chega ao gestor.
--
-- Por que RPC e não GRANT INSERT/SELECT TO anon:
--   20260524210352_colapso_p1_revoke_anon_sensitive_tables.sql revogou de propósito
--   SELECT/INSERT/UPDATE/DELETE de anon nesta tabela (defesa em profundidade + tira a
--   tabela da introspecção do PostgREST para anon) e 20260717124313 varreu SELECT de
--   anon em todo public. Devolver grant de tabela reverteria esse hardening. A RPC dá a
--   anon só "registrar um pedido pendente para um e-mail válido", sem leitura e sem
--   revelar se já existia pedido (resposta idêntica nos dois casos → sem enumeração).
--
-- O que continua valendo (não muda):
--   - índice único parcial password_reset_requests_one_pending_per_email
--     (lower(email)) WHERE status='pending' → duplicata vira ON CONFLICT DO NOTHING;
--   - trigger trg_password_reset_rate_limit (3 pedidos/e-mail/60 min, check_violation);
--   - trigger trg_anon_rate_guard (10 INSERT/min por IP quando o JWT é anon — o
--     request.jwt.claims da chamada PostgREST continua visível dentro da RPC);
--   - grants de tabela de anon/authenticated e as policies RLS (intocados).
--
-- SECURITY DEFINER: o owner (postgres) ignora RLS (rls_forced=false), por isso a RPC
-- repete as validações da policy "Anyone can request a password reset (validated)":
-- regex de e-mail, 5..254 chars, status='pending', campos administrativos e user_id NULL.
-- search_path = pg_catalog, pg_temp (pg_temp por último, exigido pelo preflight E066) e
-- todos os objetos de public qualificados.
--
-- EXECUTE para anon é intencional (o form roda deslogado): incluída em public_intent
-- de audit_security_definer_acl() abaixo, como get_quote_token_public (SEC-009).
-- O event trigger fn_auto_revoke_secdef_public_execute revoga anon no CREATE; o GRANT
-- posterior não é tocado por ele (mesmo caminho de get_quote_token_public em produção).
--
-- MANUTENÇÃO FUTURA (obrigatório): request_password_reset NÃO está na whitelist de
-- fn_auto_revoke_secdef_public_execute (evt_auto_revoke_secdef_public_execute, WHEN TAG
-- 'CREATE FUNCTION'/'ALTER FUNCTION'/... — 20260619115656, whitelist em 20260623102056).
-- Todo CREATE OR REPLACE FUNCTION ou ALTER FUNCTION futuro nesta RPC executa
-- "REVOKE EXECUTE ... FROM PUBLIC, anon" em silêncio (só NOTICE) e o "Esqueci a senha"
-- volta a quebrar sem erro no deploy. Toda migration que redefinir/alterar esta função
-- PRECISA repetir, DEPOIS do CREATE/ALTER:
--   GRANT EXECUTE ON FUNCTION public.request_password_reset(text) TO anon, authenticated;
-- e manter o DO de pós-checagem (has_function_privilege('anon', ...)). Incluir a função na
-- whitelist do event trigger seria alternativa, mas mexe em guarda de segurança global →
-- migration própria com aprovação do dono (fora do escopo desta).

CREATE OR REPLACE FUNCTION public.request_password_reset(p_email text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
BEGIN
  IF pg_catalog.length(v_email) < 5
     OR pg_catalog.length(v_email) > 254
     OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.password_reset_requests (email, status)
  VALUES (v_email, 'pending')
  ON CONFLICT DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_password_reset(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_password_reset(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.request_password_reset(text) IS
  'Registra pedido pendente de reset de senha (tela de login, anon). Valida e-mail como a '
  'policy de INSERT, duplicata pendente = no-op silencioso (sem enumeração). Rate limit via '
  'triggers trg_password_reset_rate_limit e trg_anon_rate_guard. Bug #50, 2026-11-12. '
  'ATENCAO: fora da whitelist do event trigger evt_auto_revoke_secdef_public_execute — todo '
  'CREATE OR REPLACE/ALTER FUNCTION futuro revoga EXECUTE de anon em silencio; repetir '
  'GRANT EXECUTE ON FUNCTION public.request_password_reset(text) TO anon, authenticated '
  'logo apos a redefinicao.';

-- ────────────────────────────────────────────────────────────────────────────
-- audit_security_definer_acl(): whitelist de request_password_reset(p_email text)
-- Base: 20261024163500_fix_audit_security_definer_acl_regrole_cast.sql (última versão
-- no ledger de produção). Única mudança: novo OR em public_intent.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH defs AS (
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           p.proacl,
           (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
           (p.proname IN (
             'submit_quote_response','get_quote_token_by_value','check_login_rate_limit'
           ) OR (
             p.proname = 'get_quote_token_public'
             AND pg_get_function_identity_arguments(p.oid) = '_token text'
           ) OR (
             p.proname = 'get_sitemap_public'
             AND pg_get_function_identity_arguments(p.oid) = 'p_limit integer, p_offset integer'
           ) OR (
             p.proname = 'request_password_reset'
             AND pg_get_function_identity_arguments(p.oid) = 'p_email text'
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
           (p.proname IN ('mcp_kv_get','mcp_kv_set','mcp_kv_try_lock')) AS anon_mcp,
           (p.proname IN (
             'fn_super_filtro','fn_super_filtro_facets','fn_super_filtro_opcoes',
             'fn_super_filtro_price_range','fn_super_filtro_product_ids',
             'fn_get_all_leaf_categories','fn_get_product_intelligence_all',
             'fn_get_category_breadcrumb','fn_log_search_analytics',
             'get_promo_sales_ranking','get_catalog_bestseller_page',
             'fn_get_reposicao_listing','fn_get_reposicao_metrics',
             'fn_get_recent_restocks','fn_get_replenishment_stats',
             'fn_match_canonical_color','fn_auto_revoke_secdef_public_execute',
             'fn_revoke_view_write_grants_on_create','audit_security_definer_acl',
             'fn_get_edge_functions_base_url','get_edge_functions_base_url',
             'get_edge_anon_key','get_edge_function_secret','fn_get_color_swatches_batch',
             'fn_get_customization_price','fn_get_product_customization_options',
             'fn_get_similar_products','fn_global_search','fn_rpc_exists'
           ) OR (
             p.proname = 'fn_product_active_for_rls'
             AND pg_get_function_identity_arguments(p.oid) = 'p_id uuid'
           )) AS catalog_intent
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT d.oid, d.proname, d.args, d.is_trigger,
           d.public_intent, d.anon_pipeline, d.anon_edge, d.anon_mcp, d.catalog_intent,
           CASE WHEN a.grantee = 0 THEN '-'
                ELSE pg_get_userbyid(a.grantee)
           END AS grantee
    FROM defs d
    LEFT JOIN LATERAL (SELECT (aclexplode(d.proacl)).grantee) a ON true
    WHERE a.grantee IS NOT NULL
      AND (a.grantee = 0 OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid = a.grantee))
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
  ORDER BY 1, 2;
$function$;

-- ────────────────────────────────────────────────────────────────────────────
-- Pós-checagem (falha a transação inteira se algo não bater)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT has_function_privilege('anon', 'public.request_password_reset(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'request_password_reset: anon sem EXECUTE';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.request_password_reset(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'request_password_reset: authenticated sem EXECUTE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p, LATERAL pg_catalog.aclexplode(p.proacl) a
     WHERE p.oid = 'public.request_password_reset(text)'::regprocedure AND a.grantee = 0
  ) THEN
    RAISE EXCEPTION 'request_password_reset: PUBLIC ainda tem EXECUTE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.audit_security_definer_acl() WHERE function_name = 'request_password_reset'
  ) THEN
    RAISE EXCEPTION 'audit_security_definer_acl ainda acusa request_password_reset';
  END IF;
  IF has_table_privilege('anon', 'public.password_reset_requests', 'SELECT')
     OR has_table_privilege('anon', 'public.password_reset_requests', 'INSERT') THEN
    RAISE WARNING 'anon tem SELECT/INSERT direto em password_reset_requests (fora do escopo desta migration)';
  END IF;
  RAISE NOTICE 'request_password_reset: OK (anon/authenticated EXECUTE, PUBLIC sem EXECUTE, ACL audit limpo)';
END $$;

-- Recarrega o schema cache do PostgREST para expor /rpc/request_password_reset (entregue no COMMIT).
NOTIFY pgrst, 'reload schema';
