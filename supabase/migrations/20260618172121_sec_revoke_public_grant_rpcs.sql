
-- MELHORIA 1 (2026-06-18): Revogar GRANT PUBLIC das RPCs de catálogo
-- Risco simulado: REVOKE PUBLIC não afeta anon/authenticated (grants explícitos mantidos)
-- No Supabase, requisições anon usam role 'anon', não 'PUBLIC' — safe to revoke

REVOKE EXECUTE ON FUNCTION public.fn_get_product_intelligence_all() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_get_all_leaf_categories() FROM PUBLIC;

-- Manter apenas anon + authenticated (já existem como grants explícitos)
-- Verificação inline
DO $$
DECLARE
  v_pub_intel int;
  v_pub_leaf  int;
BEGIN
  SELECT COUNT(*) INTO v_pub_intel
  FROM information_schema.routine_privileges
  WHERE routine_name = 'fn_get_product_intelligence_all' AND grantee = 'PUBLIC';

  SELECT COUNT(*) INTO v_pub_leaf
  FROM information_schema.routine_privileges
  WHERE routine_name = 'fn_get_all_leaf_categories' AND grantee = 'PUBLIC';

  IF v_pub_intel > 0 OR v_pub_leaf > 0 THEN
    RAISE EXCEPTION 'REVOKE falhou — PUBLIC grant ainda presente';
  END IF;

  RAISE NOTICE 'OK: PUBLIC grant revogado. anon+authenticated mantidos.';
END;
$$;
;
