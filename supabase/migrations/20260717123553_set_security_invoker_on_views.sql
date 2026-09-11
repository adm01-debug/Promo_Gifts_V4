DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_fail int := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS view_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND NOT (
        c.reloptions IS NOT NULL
        AND 'security_invoker=true' = ANY(c.reloptions)
      )
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER VIEW public.%I SET (security_invoker = true)',
        r.view_name
      );
      v_ok := v_ok + 1;
      RAISE NOTICE '[061] SET security_invoker=true on view: %', r.view_name;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[061] Could not set security_invoker on %: %', r.view_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[061] security_invoker sweep: updated=%, failed=%', v_ok, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[061] % view(s) could not be updated', v_fail;
  END IF;
END;
$$;

DO $$
DECLARE
  v_remaining int;
  v_total     int;
  r           RECORD;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND NOT (
      c.reloptions IS NOT NULL
      AND 'security_invoker=true' = ANY(c.reloptions)
    );

  SELECT count(*) INTO v_total
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v';

  IF v_remaining = 0 THEN
    RAISE NOTICE '[061] All % public views have security_invoker=true — security_definer_view cleared', v_total;
  ELSE
    RAISE WARNING '[061] % of % views still missing security_invoker=true', v_remaining, v_total;

    FOR r IN
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'v'
        AND NOT (
          c.reloptions IS NOT NULL
          AND 'security_invoker=true' = ANY(c.reloptions)
        )
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[061] Missing security_invoker: %', r.relname;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 061 complete.';
END;
$$;;
