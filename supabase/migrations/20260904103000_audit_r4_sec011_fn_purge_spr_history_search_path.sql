-- Auditoria R4 — SEC-011
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- SEC-011: fn_purge_spr_history — pg_temp no search_path (config: null)
--   Função SECURITY DEFINER sem SET search_path fixo. Risco: search-path
--   injection via objeto temporário homônimo a tabelas usadas internamente.
--   Fix: fixar search_path em 'public'.

ALTER FUNCTION public.fn_purge_spr_history(p_keep_days integer)
  SET search_path = 'public';

-- Validação
DO $$
DECLARE
  v_config text[];
BEGIN
  SELECT p.proconfig INTO v_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_purge_spr_history'
  LIMIT 1;

  IF v_config IS NULL OR NOT ('search_path=public' = ANY(v_config)) THEN
    RAISE EXCEPTION 'SEC-011: fn_purge_spr_history ainda sem search_path fixo!';
  END IF;

  RAISE NOTICE '✓ [SEC-011] fn_purge_spr_history: search_path = public confirmado.';
END;
$$;
