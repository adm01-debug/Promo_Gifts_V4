CREATE OR REPLACE FUNCTION public.magazine_reorder_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_ordered_item_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_total INT; v_current UUID[]; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF p_ordered_item_ids IS NULL OR cardinality(p_ordered_item_ids)>500 OR array_position(p_ordered_item_ids,NULL) IS NOT NULL OR (SELECT count(DISTINCT x) FROM unnest(p_ordered_item_ids)x)<>cardinality(p_ordered_item_ids) THEN RAISE EXCEPTION 'magazine_item_ids_invalid' USING ERRCODE='22023'; END IF;
 SELECT count(*),array_agg(id ORDER BY position,id) INTO v_total,v_current FROM public.magazine_items WHERE magazine_id=p_magazine_id;
 IF v_total<>cardinality(p_ordered_item_ids) OR EXISTS(SELECT 1 FROM unnest(p_ordered_item_ids)x(id) WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.id=x.id)) THEN RAISE EXCEPTION 'magazine_reorder_requires_complete_item_set' USING ERRCODE='22023'; END IF;
 IF v_current IS NOT DISTINCT FROM p_ordered_item_ids THEN RETURN jsonb_build_object('reordered',0,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF;
 WITH shifted AS(SELECT id,max(position) OVER()+row_number() OVER(ORDER BY position,id)+1 pos FROM public.magazine_items WHERE magazine_id=p_magazine_id) UPDATE public.magazine_items mi SET position=s.pos FROM shifted s WHERE mi.id=s.id;
 WITH desired AS(SELECT id,ordinality-1 pos FROM unnest(p_ordered_item_ids) WITH ORDINALITY x(id,ordinality)) UPDATE public.magazine_items mi SET position=d.pos FROM desired d WHERE mi.magazine_id=p_magazine_id AND mi.id=d.id;
 UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('reordered',v_total,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $function$
