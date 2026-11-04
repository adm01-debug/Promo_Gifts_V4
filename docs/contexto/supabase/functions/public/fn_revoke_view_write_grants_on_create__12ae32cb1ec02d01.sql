CREATE OR REPLACE FUNCTION public.fn_revoke_view_write_grants_on_create()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  obj record;
  view_name text;
BEGIN
  FOR obj IN
    SELECT object_type, schema_name, object_identity
    FROM pg_event_trigger_ddl_commands()
    WHERE object_type = 'view'
      AND schema_name = 'public'
  LOOP
    view_name := obj.object_identity;
    BEGIN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON %s FROM anon, authenticated',
        view_name
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_revoke_view_write_grants_on_create: could not revoke on %: %',
        view_name, SQLERRM;
    END;
  END LOOP;
END;
$function$
