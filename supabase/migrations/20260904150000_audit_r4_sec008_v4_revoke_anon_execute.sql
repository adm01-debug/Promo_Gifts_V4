-- Auditoria R4 — SEC-008 corretiva v4 (cubic-dev-ai #1829 P1/P1 — review 5118831960)
--
-- cubic P1 (20260904120000 linha 75 + linha 119):
--   A função fn_check_login_allowed permanecia chamável por anon e authenticated.
--   Um cliente anônimo podia omitir p_ip_address (bypass do IP check) ou passar
--   p_city arbitrário (bypass do city check), pois os parâmetros são DEFAULT NULL.
--
--   Fix: REVOKE EXECUTE de anon e authenticated.
--   A Edge Function check-login usa SUPABASE_SERVICE_ROLE_KEY → role service_role,
--   que pode chamar qualquer função SECURITY DEFINER independente de GRANT.
--   Portanto, os GRANTs anteriores (20260904120000, 20260904130000) eram desnecessários
--   e abriam superfície de ataque.

REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM PUBLIC;

-- Validação
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.fn_check_login_allowed(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-008v4: anon ainda tem EXECUTE em fn_check_login_allowed — revoke falhou!';
  END IF;

  IF has_function_privilege('authenticated', 'public.fn_check_login_allowed(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-008v4: authenticated ainda tem EXECUTE em fn_check_login_allowed — revoke falhou!';
  END IF;

  RAISE NOTICE '✓ [SEC-008v4] fn_check_login_allowed: anon e authenticated sem EXECUTE. Apenas service_role pode chamar.';
END;
$$;
