-- SEC: Revoke public access to archive.* and backup.* schemas
REVOKE USAGE ON SCHEMA archive FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA archive FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON TABLES FROM anon, authenticated;

REVOKE USAGE ON SCHEMA backup FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA backup FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA backup REVOKE ALL ON TABLES FROM anon, authenticated;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE table_schema IN ('archive', 'backup')
    AND grantee IN ('anon', 'authenticated');

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'archive/backup schema hardening FAILED — % grants remain for anon/authenticated', v_count;
  END IF;
END;
$$;;
