-- Reviewed rollback only; never erase trusted user decisions or independently owned schema.
-- transaction: required
-- Refuses dependent objects; DROP COLUMN uses RESTRICT and no CASCADE.

-- REVIEW ONLY: rollback refuses to erase trusted user decisions or unowned columns.
DO $device_trust_rollback$
DECLARE
  target_attnum smallint;
  target_comment text;
BEGIN
  IF to_regclass('public.user_known_devices') IS NULL THEN RETURN; END IF;
  LOCK TABLE public.user_known_devices IN ACCESS EXCLUSIVE MODE;
  SELECT attnum, col_description(attrelid, attnum) INTO target_attnum, target_comment
    FROM pg_attribute WHERE attrelid = 'public.user_known_devices'::regclass
      AND attname = 'is_trusted' AND attnum > 0 AND NOT attisdropped;
  IF NOT FOUND THEN RETURN; END IF;
  IF target_comment IS DISTINCT FROM 'proposal:user-known-devices-is-trusted:created' THEN
    RAISE NOTICE 'Unowned pre-existing is_trusted column preserved';
    RETURN;
  END IF;
  PERFORM set_config('row_security', 'off', true);
  IF EXISTS (
    SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid
    WHERE d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
      AND d.refobjid = 'public.user_known_devices'::regclass AND d.refobjsubid = target_attnum
      AND c.relkind IN ('i', 'I')
  ) OR EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_known_devices'::regclass
      AND target_attnum = ANY(conkey)
  ) THEN
    RAISE EXCEPTION 'Rollback refused: dependent indexes or constraints must be preserved';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_known_devices WHERE is_trusted IS TRUE) THEN
    RAISE EXCEPTION 'Rollback refused: trusted user decisions must be preserved';
  END IF;
  ALTER TABLE public.user_known_devices DROP COLUMN is_trusted RESTRICT;
END;
$device_trust_rollback$;
