DO $g$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure::text as sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='fn_dequeue_ai_enrichment' LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
  END LOOP;
END $g$;;
