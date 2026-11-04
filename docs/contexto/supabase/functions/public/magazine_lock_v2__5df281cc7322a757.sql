CREATE OR REPLACE FUNCTION public.magazine_lock_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_allow_deleted boolean DEFAULT false)
 RETURNS magazines
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_mag public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_mag FROM public.magazines WHERE id = p_magazine_id FOR UPDATE;
  IF NOT FOUND OR (v_mag.deleted_at IS NOT NULL AND NOT p_allow_deleted) THEN
    RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_mag.owner_id <> v_actor
     AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_expected_edit_version IS NULL OR v_mag.edit_version <> p_expected_edit_version THEN
    RAISE EXCEPTION 'magazine_edit_conflict' USING ERRCODE = '40001';
  END IF;
  RETURN v_mag;
END;
$function$
