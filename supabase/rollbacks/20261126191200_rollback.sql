-- Rollback de 20261126191200_admin_ai_quota_summary_rpc.sql
-- Remove o wrapper de leitura da cota de IA por usuario. `fn_ai_quota_summary`
-- (original, EXECUTE so de service_role) permanece intacta.

BEGIN;

DROP FUNCTION IF EXISTS public.fn_admin_ai_quota_summary(text, integer);

COMMIT;