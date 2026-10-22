-- SECURITY FIX: FUNC-NEW-001 (CRÍTICO) — fn_cron_guard SQL injection via EXECUTE p_sql
--
-- Evidência coletada em 2026-10-22:
--   SELECT proname, prosrc FROM pg_proc WHERE proname = 'fn_cron_guard';
--   → prosrc contém: EXECUTE p_sql; (sem qualquer validação do input)
--   SELECT grantee FROM information_schema.routine_privileges WHERE routine_name = 'fn_cron_guard';
--   → anon, authenticated, service_role, postgres, PUBLIC
--
-- Impacto: usuário anon pode chamar fn_cron_guard('qualquer_bigint', 'DROP TABLE products')
--   e executar SQL arbitrário com os privilégios do owner da função.
--
-- Fix: Revogar EXECUTE de anon e PUBLIC. A função é usada internamente pelo cron scheduler
--   (que roda como service_role) — não há uso legítimo de anon ou PUBLIC.
--
-- Aplicar via: .github/workflows/db-apply-migration.yml
-- Aprovação: PO obrigatória (REGRA #1/#8 CLAUDE.md)

BEGIN;

-- Revoga de PUBLIC (que inclui todos os roles, incluindo anon)
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM PUBLIC;

-- Revoga explicitamente de anon (defesa em profundidade)
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM anon;

-- Mantém acesso apenas para quem legítimamente precisa:
-- service_role (cron scheduler), postgres (admin), authenticated (se necessário — revisar)
-- GRANT EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) TO service_role; -- já tem

COMMIT;

-- POST-CHECK (executar após aplicação para confirmar):
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'fn_cron_guard' AND specific_schema = 'public';
-- Esperado: NÃO deve aparecer 'anon' nem 'PUBLIC'
