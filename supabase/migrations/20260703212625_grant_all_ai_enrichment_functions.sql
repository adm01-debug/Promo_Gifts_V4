DO $g$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT p.oid::regprocedure::text as sig FROM pg_proc p JOIN pg_namespace n2 ON n2.oid=p.pronamespace WHERE n2.nspname='public' AND p.proname ILIKE '%ai_enrichment%' LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'grants aplicados em % funcoes', n;
END $g$;;
