-- Rollback: telemetry-cleanup query_telemetry_delete_dev
-- Remove a policy DELETE criada em 20261112120800. Depois disso o botao
-- "Limpar dados antigos" volta a remover 0 linhas (o front mostra o toast informativo).

DROP POLICY IF EXISTS query_telemetry_delete_dev ON public.query_telemetry;
