-- Forward-only: status and trigger-issued public token are confirmed atomically.
CREATE OR REPLACE FUNCTION public.magazine_publish_atomic(
  p_magazine_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
  v_title TEXT;
  v_public_token TEXT;
  v_published_at TIMESTAMPTZ;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;

  SELECT owner_id, status::TEXT, title, public_token, published_at, updated_at
    INTO v_owner, v_status, v_title, v_public_token, v_published_at, v_updated_at
    FROM public.magazines
   WHERE id = p_magazine_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_owner <> v_actor AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status = 'published' THEN
    IF v_public_token IS NULL OR BTRIM(v_public_token) = '' THEN
      RAISE EXCEPTION 'magazine_publish_token_missing' USING ERRCODE = '55000';
    END IF;
    RETURN jsonb_build_object(
      'public_token', v_public_token,
      'published_at', v_published_at,
      'updated_at', v_updated_at
    );
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'magazine_not_publishable' USING ERRCODE = '55000';
  END IF;
  IF BTRIM(COALESCE(v_title, '')) = '' OR NOT EXISTS (
    SELECT 1 FROM public.magazine_items WHERE magazine_id = p_magazine_id
  ) THEN
    RAISE EXCEPTION 'magazine_publish_requirements_not_met' USING ERRCODE = '22023';
  END IF;

  UPDATE public.magazines
     SET status = 'published'
   WHERE id = p_magazine_id
   RETURNING public_token, published_at, updated_at
        INTO v_public_token, v_published_at, v_updated_at;

  -- The canonical BEFORE trigger owns token generation. Raising here rolls
  -- the status change back in the same transaction if that contract breaks.
  IF v_public_token IS NULL OR BTRIM(v_public_token) = '' THEN
    RAISE EXCEPTION 'magazine_publish_token_missing' USING ERRCODE = '55000';
  END IF;

  RETURN jsonb_build_object(
    'public_token', v_public_token,
    'published_at', v_published_at,
    'updated_at', v_updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_publish_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_publish_atomic(UUID) TO authenticated, service_role;
