-- SB-0007: Corrige isolamento da policy SELECT de ai_usage_quotas
-- Severidade: MÉDIO | Tipo: SEGURANÇA/RLS
-- Evidência: policy ai_usage_quotas_read_authenticated
--   USING ((SELECT auth.uid()) IS NOT NULL)
--   → qualquer usuário autenticado vê TODAS as quotas de TODOS os usuários.
-- Correção: restringir a USING (user_id = (SELECT auth.uid()))
-- Risco de regressão: baixo — usuários só perdem visibilidade das quotas alheias.

DROP POLICY IF EXISTS ai_usage_quotas_read_authenticated ON public.ai_usage_quotas;
CREATE POLICY ai_usage_quotas_read_authenticated
  ON public.ai_usage_quotas
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ROLLBACK:
-- DROP POLICY IF EXISTS ai_usage_quotas_read_authenticated ON public.ai_usage_quotas;
-- CREATE POLICY ai_usage_quotas_read_authenticated
--   ON public.ai_usage_quotas FOR SELECT TO authenticated
--   USING ((SELECT auth.uid()) IS NOT NULL);
