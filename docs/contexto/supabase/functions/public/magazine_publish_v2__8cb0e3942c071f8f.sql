CREATE OR REPLACE FUNCTION public.magazine_publish_v2(p_magazine_id uuid, p_expected_edit_version bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='published' THEN IF v_mag.public_token IS NULL OR v_mag.public_token !~ '^[0-9a-f]{48}$' OR v_mag.published_at IS NULL THEN RAISE EXCEPTION 'magazine_publication_invariant_invalid' USING ERRCODE='55000'; END IF; RETURN jsonb_build_object('public_token',v_mag.public_token,'published_at',v_mag.published_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_publishable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='published',public_token=NULL,edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('public_token',v_result.public_token,'published_at',v_result.published_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $function$
