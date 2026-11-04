CREATE OR REPLACE FUNCTION public.magazine_archive_v2(p_magazine_id uuid, p_expected_edit_version bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='archived' THEN RETURN jsonb_build_object('archived_at',v_mag.archived_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status NOT IN ('draft','published') THEN RAISE EXCEPTION 'magazine_not_archivable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='archived',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('archived_at',v_result.archived_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $function$
