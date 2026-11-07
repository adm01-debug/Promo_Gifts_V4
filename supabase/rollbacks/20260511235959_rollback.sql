-- Documentary rollback for
-- 20260511235959_bootstrap_public_dependencies_for_application_schemas.sql.
--
-- Intentionally a no-op: every relation covered here is canonical application
-- state that pre-dated the migration ledger. Dropping any of them would destroy
-- business data. A rollback must restore from the signed baseline instead.

DO $rollback$
BEGIN
  RAISE NOTICE 'No destructive rollback: restore the signed Supabase baseline if required';
END
$rollback$;
