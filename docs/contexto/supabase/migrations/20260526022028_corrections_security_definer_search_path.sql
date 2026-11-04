ALTER FUNCTION submit_quote_response SET search_path = '';
ALTER FUNCTION get_quote_token_by_value SET search_path = '';
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true AND p.proconfig IS NULL LIMIT 20
  LOOP
    BEGIN EXECUTE format('ALTER FUNCTION %I SET search_path = ''''', r.proname);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;
