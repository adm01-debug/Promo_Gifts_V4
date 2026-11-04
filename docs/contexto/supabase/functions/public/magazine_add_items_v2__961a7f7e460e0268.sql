CREATE OR REPLACE FUNCTION public.magazine_add_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_inserted INT; v_current INT; v_new INT; v_result public.magazines%ROWTYPE;
BEGIN
  v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE);
  IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 500 OR pg_column_size(p_items)>2097152 THEN RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e(value) WHERE jsonb_typeof(value) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(CASE WHEN jsonb_typeof(value)='object' THEN value ELSE '{}'::JSONB END) k(key) WHERE key<>ALL(ARRAY['product_id','product_snapshot','variant_color_name','page_number','overrides'])) OR (value->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR jsonb_typeof(value->'product_snapshot') IS DISTINCT FROM 'object' OR (value?'overrides' AND jsonb_typeof(value->'overrides') IS DISTINCT FROM 'object') OR (value?'variant_color_name' AND value->'variant_color_name'<>'null'::JSONB AND (jsonb_typeof(value->'variant_color_name') IS DISTINCT FROM 'string' OR char_length(value->>'variant_color_name')>200)) OR (value?'page_number' AND value->'page_number'<>'null'::JSONB AND (jsonb_typeof(value->'page_number') IS DISTINCT FROM 'number' OR (value->>'page_number')::NUMERIC<>trunc((value->>'page_number')::NUMERIC) OR (value->>'page_number')::INT NOT BETWEEN 1 AND 200))) THEN RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_current FROM public.magazine_items WHERE magazine_id=p_magazine_id;
  SELECT count(*) INTO v_new FROM (SELECT DISTINCT (value->>'product_id')::UUID id FROM jsonb_array_elements(p_items)) x WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.product_id=x.id);
  IF v_current+v_new>500 THEN RAISE EXCEPTION 'magazine_item_limit_exceeded' USING ERRCODE='22023'; END IF;
  WITH payload AS (SELECT DISTINCT ON ((value->>'product_id')::UUID) (value->>'product_id')::UUID product_id,value->'product_snapshot' product_snapshot,NULLIF(value->>'variant_color_name','') variant_color_name,CASE WHEN value?'page_number' THEN (value->>'page_number')::INT END page_number,COALESCE(value->'overrides','{}'::JSONB) overrides,ordinality FROM jsonb_array_elements(p_items) WITH ORDINALITY e(value,ordinality) ORDER BY (value->>'product_id')::UUID,ordinality), fresh AS (SELECT *,row_number() OVER(ORDER BY ordinality)-1 off FROM payload p WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.product_id=p.product_id)), base AS (SELECT COALESCE(max(position),-1)+1 pos FROM public.magazine_items WHERE magazine_id=p_magazine_id)
  INSERT INTO public.magazine_items(magazine_id,product_id,product_snapshot,variant_color_name,position,page_number,overrides) SELECT p_magazine_id,product_id,product_snapshot,variant_color_name,base.pos+fresh.off,page_number,overrides FROM fresh CROSS JOIN base ON CONFLICT(magazine_id,product_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  IF v_inserted=0 THEN RETURN jsonb_build_object('inserted',0,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF;
  UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
  RETURN jsonb_build_object('inserted',v_inserted,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $function$
