
-- ================================================================
-- MELHORIA 4: Event Trigger automático — REVOKE write grants em views public
-- 2026-06-18 — elimina dead-code herdado do Supabase DEFAULT PRIVILEGES
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_revoke_view_write_grants_on_create()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION public.fn_revoke_view_write_grants_on_create()
  IS 'Event trigger: revoga automaticamente INSERT/UPDATE/DELETE/REFERENCES/TRIGGER '
     'de anon e authenticated em novas views public.*, mantendo apenas SELECT. '
     'Criado 2026-06-18 para eliminar dead-code do Supabase DEFAULT PRIVILEGES.';

DROP EVENT TRIGGER IF EXISTS evt_revoke_view_write_grants;

CREATE EVENT TRIGGER evt_revoke_view_write_grants
  ON ddl_command_end
  WHEN TAG IN ('CREATE VIEW')
  EXECUTE FUNCTION public.fn_revoke_view_write_grants_on_create();

COMMENT ON EVENT TRIGGER evt_revoke_view_write_grants
  IS 'Dispara fn_revoke_view_write_grants_on_create() após CREATE [OR REPLACE] VIEW '
     'em public.*, garantindo SELECT-only para anon e authenticated.';
;
