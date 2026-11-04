DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    VALUES
      ('retry_failed_webhook_deliveries', ''),
      ('cleanup_webhook_logs', ''),
      ('auto_revoke_orphan_full_keys', '_source text'),
      ('cleanup_security_logs', ''),
      ('check_mcp_abuse_threshold', '_user_id uuid, _ip text')
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
        fn.column1, fn.column2
      );
      RAISE NOTICE 'Revoked authenticated from %.%(%)', 'public', fn.column1, fn.column2;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %.%(%): %', 'public', fn.column1, fn.column2, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'T29 complete: authenticated revoked from service-role-only functions.';
END;
$$;
