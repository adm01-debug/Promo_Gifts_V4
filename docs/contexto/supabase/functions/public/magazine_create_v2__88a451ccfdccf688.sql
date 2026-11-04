CREATE OR REPLACE FUNCTION public.magazine_create_v2(p_organization_id uuid, p_title text, p_template_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_result public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(BTRIM(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 200
     OR p_template_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.magazine_templates_catalog
       WHERE template_id = p_template_id
     ) THEN
    RAISE EXCEPTION 'magazine_create_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_organization_id IS NOT NULL
     AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE)
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = p_organization_id AND om.user_id = v_actor
     ) THEN
    RAISE EXCEPTION 'magazine_organization_forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.magazines(
    owner_id, organization_id, title, subtitle, template_id,
    page_order, status, public_token, published_at, archived_at
  ) VALUES (
    v_actor, p_organization_id, BTRIM(p_title), '', p_template_id,
    NULL, 'draft', NULL, NULL, NULL
  ) RETURNING * INTO v_result;
  RETURN jsonb_build_object(
    'magazine_id', v_result.id,
    'edit_version', v_result.edit_version,
    'updated_at', v_result.updated_at
  );
END;
$function$
