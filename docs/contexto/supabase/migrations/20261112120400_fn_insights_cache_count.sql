-- Contagem de cache de insights de IA para a tela /admin/consumo-ia (painel Inteligencia de Mercado).
-- Causa: MarketIntelInsightsUsagePanel.tsx lia a view ai_insights_cache, cujo SELECT de authenticated
--   foi revogado de proposito em 20260716192234_revoke_auth_select_admin_views.sql; o erro era ignorado
--   e o card mostrava sempre 0. Ler a tabela base dashboard_insights_cache tambem nao resolve: a policy
--   SELECT so libera a propria linha ou has_role(uid,'admin'), e a rota e DevRoute (papel dev), entao
--   um dev veria so o proprio cache.
-- Solucao (sem GRANT novo em tabela/view, sem mexer em policy): RPC SECURITY DEFINER que devolve SO a
--   contagem agregada, com guarda can_view_telemetry() — helper declarado para esta rota em
--   src/lib/rbac/route-matrix.ts (rlsHelper: 'can_view_telemetry'; dev/supervisor+). Vendedor recebe 42501.
-- Idempotente: CREATE OR REPLACE + REVOKE/GRANT/COMMENT reexecutaveis.
-- Rollback: DROP FUNCTION IF EXISTS public.fn_insights_cache_count(text, timestamptz);
--   (arquivo: supabase/rollbacks/20261112120400_rollback.sql)

CREATE OR REPLACE FUNCTION public.fn_insights_cache_count(p_function_name text, p_since timestamptz)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT COALESCE(public.can_view_telemetry((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'fn_insights_cache_count: acesso negado'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT count(*)
    FROM public.dashboard_insights_cache c
    WHERE (p_function_name IS NULL OR c.function_name = p_function_name)
      AND c.created_at >= COALESCE(p_since, '-infinity'::timestamptz)
  );
END;
$$

REVOKE EXECUTE ON FUNCTION public.fn_insights_cache_count(text, timestamptz) FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_insights_cache_count(text, timestamptz) TO authenticated

COMMENT ON FUNCTION public.fn_insights_cache_count(text, timestamptz) IS
  'Contagem agregada de dashboard_insights_cache por function_name e periodo (created_at >= p_since). '
  'Restrita a can_view_telemetry() (dev/supervisor+); devolve so o numero, nunca payload. '
  'Consumidor: src/pages/admin/ai-usage/MarketIntelInsightsUsagePanel.tsx (/admin/consumo-ia).'
