CREATE OR REPLACE FUNCTION public.set_custom_kit_pinned(_kit_id uuid, _is_pinned boolean)
 RETURNS custom_kits
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
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
$function$
