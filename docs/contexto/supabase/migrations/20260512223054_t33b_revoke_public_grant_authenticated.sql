-- T33b: Remove PUBLIC default EXECUTE on all public-schema functions.
-- Explicitly re-grant to authenticated and service_role so app RPC calls work.
-- anon gets no EXECUTE privilege on SECURITY DEFINER functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
