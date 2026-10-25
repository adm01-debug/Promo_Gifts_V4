-- Rollback: 20261022100001_security_fn_cron_guard_revoke_anon.sql
-- Restaura EXECUTE em public.fn_cron_guard para PUBLIC e anon.
-- ATENÇÃO: este rollback reintroduz a vulnerabilidade FUNC-NEW-001 (SQL injection via anon).
-- Usar apenas se a migration precisar ser revertida e após avaliação de impacto de segurança.

BEGIN;

GRANT EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) TO PUBLIC;

COMMIT;

-- POST-CHECK (confirmar reversão):
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'fn_cron_guard' AND specific_schema = 'public';
-- Esperado: deve aparecer 'anon' e 'PUBLIC'
