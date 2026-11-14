-- Fix: card "Pipeline Medallion" (/admin/status, MedallionPipelineCard) sempre em erro 42501.
-- Causa: 20260716192234_revoke_auth_select_admin_views.sql revogou de propósito o SELECT de
--   authenticated em vw_medallion_coverage e v_pipeline_progress (views de saúde admin-only,
--   security_invoker=true). O hook useMedallionHealth.ts continuou lendo as views direto.
-- Solução (menor privilégio, sem desfazer o hardening): RPC SECURITY DEFINER de leitura que só
--   devolve os dados para quem tem papel `dev` (mesma regra do <DevRoute /> que protege
--   /admin/status). As views continuam sem grant para authenticated.
-- Rollback: DROP FUNCTION IF EXISTS public.fn_dev_medallion_health();
--   (arquivo supabase/rollbacks/20261112120300_rollback.sql)

CREATE OR REPLACE FUNCTION public.fn_dev_medallion_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL OR NOT public.is_dev(v_uid) THEN
    RAISE EXCEPTION 'forbidden: requer papel dev' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'coverage',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.fornecedor, c.camada)
         FROM public.vw_medallion_coverage c),
      '[]'::jsonb
    ),
    'progress',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.fase)
         FROM public.v_pipeline_progress p),
      '[]'::jsonb
    )
  );
END;
$$

COMMENT ON FUNCTION public.fn_dev_medallion_health() IS
  'Saúde do pipeline Medallion para o MedallionPipelineCard (/admin/status, DevRoute): '
  '{coverage: vw_medallion_coverage[], progress: v_pipeline_progress[]}. Só papel dev (42501 '
  'para os demais). As views seguem sem SELECT para authenticated (20260716192234).'

REVOKE EXECUTE ON FUNCTION public.fn_dev_medallion_health() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_dev_medallion_health() TO authenticated
