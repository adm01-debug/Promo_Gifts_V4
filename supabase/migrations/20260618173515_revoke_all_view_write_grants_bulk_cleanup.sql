
-- ================================================================
-- MELHORIA 1: Bulk REVOKE de write grants em TODAS as views public
-- ================================================================
-- Contexto: Supabase DEFAULT PRIVILEGES concede INSERT/UPDATE/DELETE/
-- REFERENCES/TRIGGER automaticamente para anon e authenticated em TODOS
-- os novos objetos TABLE/VIEW. Para views, esses grants são dead-code:
--   - Views não-updatable: writes falham com 55000 ("cannot insert into view")
--   - Views updatable simples: zero INSTEAD OF triggers encontrados — nenhuma
--     view usa escrita intencional neste schema
--   - REVOKE é idempotente: REVOKE de grant inexistente é no-op sem erro
-- O event trigger evt_revoke_view_write_grants protege criações FUTURAS.
-- Esta migration limpa as 161 views EXISTENTES com write grants.
-- ================================================================

DO $$
DECLARE
  v_view text;
  v_count integer := 0;
  v_errors integer := 0;
BEGIN
  FOR v_view IN
    SELECT DISTINCT table_name
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('INSERT','UPDATE','DELETE','REFERENCES','TRIGGER')
      AND table_name IN (
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
      )
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',
        v_view
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'bulk_revoke_views: could not revoke on %: %', v_view, SQLERRM;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RAISE NOTICE 'bulk_revoke_views: % views cleaned, % errors', v_count, v_errors;
END;
$$;

-- Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
;
