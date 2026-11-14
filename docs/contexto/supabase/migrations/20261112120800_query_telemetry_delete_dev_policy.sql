-- telemetry-cleanup: "Limpar dados antigos" em /admin/telemetria nao apagava nada.
-- Causa: query_telemetry tem RLS ligado e so policies INSERT (query_telemetry_insert_any) e
-- SELECT (query_telemetry_select_admin). A policy DELETE "Devs can delete telemetry"
-- (20260425210505) nao existe mais em producao, entao o DELETE do front afeta 0 linhas sem erro.
-- Correcao: policy DELETE so para dev (a rota e DevRoute; mesmo criterio da 20260425210505),
-- restrita a linhas com mais de 7 dias (unico caso de uso: useTelemetryData.handleCleanup).
-- Sem SECURITY DEFINER e sem GRANT novo: authenticated ja tem DELETE na tabela; anon segue
-- sem policy (bloqueado por RLS).
-- Rollback: DROP POLICY IF EXISTS query_telemetry_delete_dev ON public.query_telemetry;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'query_telemetry'
      AND policyname = 'query_telemetry_delete_dev'
  ) THEN
    CREATE POLICY query_telemetry_delete_dev
      ON public.query_telemetry
      FOR DELETE
      TO authenticated
      USING (
        public.is_dev((SELECT auth.uid()))
        AND created_at < now() - interval '7 days'
      );
  END IF;
END $$

COMMENT ON POLICY query_telemetry_delete_dev ON public.query_telemetry IS
  'telemetry-cleanup (2026-11-12): dev apaga telemetria com mais de 7 dias (botao Limpar dados antigos em /admin/telemetria).'
