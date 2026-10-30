-- P03: Remover pg_temp do search_path de funções SECURITY DEFINER
-- Achado: SEC-003 (ALTO) + SEC-004 (MÉDIO)
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
--
-- PROBLEMA: 43 funções SECURITY DEFINER têm pg_temp no search_path.
-- Em SECURITY DEFINER (executa como postgres), pg_temp no search_path
-- permite que uma sessão crie objeto temporário com o mesmo nome de
-- uma função interna e execute código com privilégio de postgres.
--
-- PRIORIDADE ALTA: get_edge_function_secret (lê vault como postgres)
-- PRIORIDADE MÉDIA: check_edge_rate_limit, check_login_rate_limit,
--                   fn_anon_insert_rate_guard, fn_audit_and_fix_grants

-- === MIGRATION (aplicar uma por uma, com testes) ===

-- 1. get_edge_function_secret — PRIORIDADE MÁXIMA
-- Buscar o search_path atual:
--   SELECT proconfig FROM pg_proc WHERE proname = 'get_edge_function_secret';
-- Esperado: {search_path=vault,public,pg_temp}
-- Corrigir para remover pg_temp:

/*
ALTER FUNCTION public.get_edge_function_secret(text)
  SET search_path = vault, public;
*/

-- 2. check_edge_rate_limit
/*
ALTER FUNCTION public.check_edge_rate_limit(text, integer, integer)
  SET search_path = public;
*/

-- 3. check_login_rate_limit
/*
ALTER FUNCTION public.check_login_rate_limit(text, integer, integer)
  SET search_path = public;
*/

-- 4. fn_anon_insert_rate_guard
/*
ALTER FUNCTION public.fn_anon_insert_rate_guard()
  SET search_path = public;
*/

-- 5. fn_audit_and_fix_grants
/*
ALTER FUNCTION public.fn_audit_and_fix_grants()
  SET search_path = public;
*/

-- Para listar todas as 43 funções afetadas:
/*
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg
    WHERE cfg LIKE '%pg_temp%'
  )
ORDER BY p.proname;
*/

-- === VERIFICAÇÃO PÓS-APLICAÇÃO ===
/*
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg
    WHERE cfg LIKE '%pg_temp%'
  );
-- Esperado: 0 linhas
*/

-- === ROLLBACK ===
-- Restaurar pg_temp no search_path (não recomendado — manter apenas se funcionalidade depender):
/*
ALTER FUNCTION public.get_edge_function_secret(text)
  SET search_path = vault, public, pg_temp;
*/
