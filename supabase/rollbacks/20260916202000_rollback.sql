-- Rollback de 20260916202000_e23_force_rls_secret_tables.sql
-- Remove FORCE ROW LEVEL SECURITY das 5 tabelas de segredo.
-- Nota: REVOKE ALL FROM anon não precisa de rollback (anon não tinha grant antes da migration).
ALTER TABLE public.integration_credentials NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_connections    NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.secret_rotation_log     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_tokens          NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_token_revocations  NO FORCE ROW LEVEL SECURITY;
