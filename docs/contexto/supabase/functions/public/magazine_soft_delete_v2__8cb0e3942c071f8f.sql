CREATE OR REPLACE FUNCTION public.magazine_soft_delete_v2(p_magazine_id uuid, p_expected_edit_version bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,TRUE); IF v_mag.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('deleted_at',v_mag.deleted_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; UPDATE public.magazines SET deleted_at=clock_timestamp(),status='archived',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('deleted_at',v_result.deleted_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $function$
