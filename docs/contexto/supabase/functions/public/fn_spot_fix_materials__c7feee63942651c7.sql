CREATE OR REPLACE FUNCTION public.fn_spot_fix_materials(p_supplier_id uuid, p_parent_ref text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n integer;
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);
  UPDATE public.produtos_padronizacao pp
  SET materials = public.fn_spot_split_list(spr.raw_data->>'Materials'), updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE pp.raw_id = spr.id
    AND pp.supplier_id = p_supplier_id
    AND nullif(btrim(spr.raw_data->>'Materials'),'') IS NOT NULL
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $function$
