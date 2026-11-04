CREATE OR REPLACE FUNCTION public.magazine_remove_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_item_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_removed INT; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF p_item_ids IS NULL OR cardinality(p_item_ids) NOT BETWEEN 1 AND 500 OR array_position(p_item_ids,NULL) IS NOT NULL OR (SELECT count(DISTINCT x) FROM unnest(p_item_ids)x)<>cardinality(p_item_ids) THEN RAISE EXCEPTION 'magazine_item_ids_invalid' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.magazine_items WHERE magazine_id=p_magazine_id AND id=ANY(p_item_ids))<>cardinality(p_item_ids) THEN RAISE EXCEPTION 'magazine_item_not_found' USING ERRCODE='P0002'; END IF;
 DELETE FROM public.magazine_items WHERE magazine_id=p_magazine_id AND id=ANY(p_item_ids); GET DIAGNOSTICS v_removed=ROW_COUNT;
 UPDATE public.magazines SET page_order=public.magazine_page_order_remove_items_v2(page_order,p_item_ids),edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('removed',v_removed,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $function$
