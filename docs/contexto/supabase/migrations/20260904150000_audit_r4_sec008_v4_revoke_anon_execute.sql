REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM PUBLIC;

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
