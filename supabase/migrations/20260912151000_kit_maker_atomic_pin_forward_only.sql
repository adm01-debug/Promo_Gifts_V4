-- Forward-only: one pinned Kit Maker draft per authenticated owner.
-- Replaces the former client-side "unpin then pin" pair, which could race
-- across two tabs and leave no pin or two visible candidates.

DO $precondition$
BEGIN
  IF to_regclass('public.custom_kits') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: public.custom_kits is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'custom_kits' AND column_name = 'is_pinned'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: custom_kits.is_pinned is required';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.custom_kits
    WHERE is_pinned
    GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Precondition failed: existing duplicate pinned kits require explicit reconciliation';
  END IF;
END
$precondition$;

CREATE UNIQUE INDEX IF NOT EXISTS custom_kits_one_pinned_per_user_idx
  ON public.custom_kits (user_id)
  WHERE is_pinned;

CREATE OR REPLACE FUNCTION public.set_custom_kit_pinned(
  _kit_id uuid,
  _is_pinned boolean
)
RETURNS public.custom_kits
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  _actor_id uuid := auth.uid();
  _kit public.custom_kits;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to change a pinned kit'
      USING ERRCODE = '28000';
  END IF;
  IF _kit_id IS NULL THEN
    RAISE EXCEPTION 'A kit id is required'
      USING ERRCODE = '22023';
  END IF;

  -- Serialise all pin changes for one owner before unpinning any row.
  PERFORM pg_advisory_xact_lock(hashtextextended(_actor_id::text || ':custom-kit-pin', 0));

  SELECT *
  INTO _kit
  FROM public.custom_kits
  WHERE id = _kit_id
    AND user_id = _actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kit not found or not owned by the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  IF _is_pinned THEN
    UPDATE public.custom_kits
    SET is_pinned = false
    WHERE user_id = _actor_id
      AND is_pinned
      AND id <> _kit_id;
  END IF;

  UPDATE public.custom_kits
  SET is_pinned = _is_pinned
  WHERE id = _kit_id
    AND user_id = _actor_id
  RETURNING * INTO _kit;

  RETURN _kit;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) IS
  'Atomically pins or unpins one owned Kit Maker draft; serializes concurrent tabs per user.';

DO $postcondition$
BEGIN
  IF to_regprocedure('public.set_custom_kit_pinned(uuid,boolean)') IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = 'custom_kits_one_pinned_per_user_idx'
     )
     OR NOT has_function_privilege(
       'authenticated',
       'public.set_custom_kit_pinned(uuid,boolean)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Postcondition failed: atomic Kit Maker pin contract is incomplete';
  END IF;
END
$postcondition$;
