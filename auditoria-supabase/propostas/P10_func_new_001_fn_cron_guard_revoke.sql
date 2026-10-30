-- ============================================================
-- PROPOSTA P10 — FUNC-NEW-001: Revogar EXECUTE de fn_cron_guard
-- Severidade: ALTO
-- Achado: FUNC-NEW-001
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   fn_cron_guard(p_job_name, p_sql, p_idempotency_key) é uma função
--   que executa SQL arbitrário via EXECUTE p_sql. Ela é acessível por
--   anon e authenticated, permitindo que qualquer usuário envie SQL
--   arbitrário para execução no banco — vetor de injeção SQL.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT p.proname, has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
--          has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_exec
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND p.proname='fn_cron_guard';
--   → anon_exec=true, auth_exec=true
--
-- SOLUÇÃO:
--   Revogar EXECUTE de anon e authenticated. Somente postgres/service_role
--   devem chamar esta função (via jobs de cron internos).
-- ============================================================

-- === VERIFICAÇÃO PRÉ-APLICAÇÃO ===
-- (Executar e confirmar antes de aplicar)
/*
SELECT has_function_privilege('anon', 'public.fn_cron_guard(text,text,text)', 'EXECUTE');
-- Deve retornar true antes; false após aplicação
*/

-- === APLICAÇÃO ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(text, text, text) FROM authenticated;

COMMENT ON FUNCTION public.fn_cron_guard(text, text, text) IS
  'Uso interno de cron apenas. EXECUTE revogado de anon/authenticated (P10, 2026-10-22).';
*/

-- === ROLLBACK ===
/*
GRANT EXECUTE ON FUNCTION public.fn_cron_guard(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_cron_guard(text, text, text) TO authenticated;
*/

-- === RISCO DE REGRESSÃO ===
-- BAIXO: callers legítimos devem ser apenas jobs internos de cron (postgres role).
-- Verificar antes: grep -r "fn_cron_guard" src/ supabase/functions/ --include="*.ts" --include="*.sql"

-- === ESFORÇO ===
-- Trivial (2 REVOKE + 1 COMMENT + verificação de callers)
