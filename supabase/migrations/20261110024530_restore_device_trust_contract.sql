-- Restore the previously planned device-trust field without replacing the live minimal table.
-- Status: prepared for owner review; not applied to production.
-- Production application: db-apply-migration.yml only, after the requested review.
-- transaction: required
-- Rollback: supabase/rollbacks/20261110024530_rollback.sql
-- Guard: original rows, columns, RLS, ACL, indexes and constraints remain unchanged.

-- REVIEW ONLY: no production execution authorized.
-- Planned contract existed in 20251231121324 but CREATE TABLE IF NOT EXISTS did not upgrade the live minimal table.
DO $device_trust_forward$
DECLARE
  existing_type oid;
  existing_not_null boolean;
  existing_default text;
BEGIN
  IF to_regclass('public.user_known_devices') IS NULL THEN
    RAISE EXCEPTION 'user_known_devices missing; refusing to create or replace the table';
  END IF;
  LOCK TABLE public.user_known_devices IN ACCESS EXCLUSIVE MODE;
  SELECT a.atttypid, a.attnotnull, pg_get_expr(d.adbin, d.adrelid)
    INTO existing_type, existing_not_null, existing_default
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.user_known_devices'::regclass
      AND a.attname = 'is_trusted' AND a.attnum > 0 AND NOT a.attisdropped;
  IF FOUND THEN
    IF existing_type <> 'boolean'::regtype OR NOT existing_not_null OR existing_default IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'Existing is_trusted contract differs; no overwrite or backfill was authorized';
    END IF;
    RETURN;
  END IF;
  ALTER TABLE public.user_known_devices ADD COLUMN is_trusted boolean NOT NULL DEFAULT false;
  COMMENT ON COLUMN public.user_known_devices.is_trusted IS 'proposal:user-known-devices-is-trusted:created';
END;
$device_trust_forward$;
