CREATE SCHEMA IF NOT EXISTS backup;

ALTER TABLE public._backup_* SET SCHEMA backup; (17 tabelas)

REVOKE ALL ON SCHEMA backup FROM anon, authenticated, PUBLIC;

GRANT USAGE ON SCHEMA backup TO postgres, service_role;
