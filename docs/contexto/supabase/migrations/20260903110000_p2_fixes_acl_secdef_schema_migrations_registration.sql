INSERT INTO supabase_migrations.schema_migrations ... ON CONFLICT DO NOTHING

REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON smoke_test_runs FROM authenticated

CREATE OR REPLACE FUNCTION public.fn_run_smoke_tests() SECURITY INVOKER
