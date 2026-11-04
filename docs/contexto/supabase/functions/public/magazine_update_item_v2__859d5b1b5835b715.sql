CREATE OR REPLACE FUNCTION public.magazine_update_item_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_item_id uuid, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch='{}'::JSONB OR pg_column_size(p_patch)>131072 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch)k(key) WHERE key<>ALL(ARRAY['product_snapshot','variant_color_name','position','page_number','overrides'])) THEN RAISE EXCEPTION 'magazine_item_patch_invalid' USING ERRCODE='22023'; END IF;
 IF p_patch?'product_snapshot' AND jsonb_typeof(p_patch->'product_snapshot') IS DISTINCT FROM 'object' OR p_patch?'overrides' AND jsonb_typeof(p_patch->'overrides') IS DISTINCT FROM 'object' OR p_patch?'variant_color_name' AND p_patch->'variant_color_name'<>'null'::JSONB AND (jsonb_typeof(p_patch->'variant_color_name') IS DISTINCT FROM 'string' OR char_length(p_patch->>'variant_color_name')>200) OR p_patch?'position' AND (jsonb_typeof(p_patch->'position') IS DISTINCT FROM 'number' OR (p_patch->>'position')::NUMERIC<0) OR p_patch?'page_number' AND p_patch->'page_number'<>'null'::JSONB AND (jsonb_typeof(p_patch->'page_number') IS DISTINCT FROM 'number' OR (p_patch->>'page_number')::NUMERIC<>trunc((p_patch->>'page_number')::NUMERIC) OR (p_patch->>'page_number')::INT NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'magazine_item_patch_invalid' USING ERRCODE='22023'; END IF;
 UPDATE public.magazine_items SET product_snapshot=CASE WHEN p_patch?'product_snapshot' THEN p_patch->'product_snapshot' ELSE product_snapshot END,variant_color_name=CASE WHEN p_patch?'variant_color_name' THEN NULLIF(p_patch->>'variant_color_name','') ELSE variant_color_name END,position=CASE WHEN p_patch?'position' THEN (p_patch->>'position')::NUMERIC ELSE position END,page_number=CASE WHEN p_patch?'page_number' THEN (p_patch->>'page_number')::INT ELSE page_number END,overrides=CASE WHEN p_patch?'overrides' THEN p_patch->'overrides' ELSE overrides END WHERE magazine_id=p_magazine_id AND id=p_item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'magazine_item_not_found' USING ERRCODE='P0002'; END IF;
 UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('item_id',p_item_id,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $function$
