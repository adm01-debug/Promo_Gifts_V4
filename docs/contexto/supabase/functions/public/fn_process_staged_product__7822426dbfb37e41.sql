CREATE OR REPLACE FUNCTION public.fn_process_staged_product(p_staging_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE r record; v_vres jsonb; v_pres jsonb; v_parent text;
BEGIN
  SELECT supplier_id, supplier_reference, raw_data INTO r
  FROM public.supplier_products_raw WHERE id = p_staging_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'raw_nao_encontrado', 'id', p_staging_id);
  END IF;
  -- ADAPTADO 2026-06-05: Bronze→Silver (de-para), não mais Bronze→Gold direto.
  v_vres   := public.fn_standardize_variant(p_staging_id);
  v_parent := COALESCE(NULLIF(v_vres->>'parent',''),
                       public.fn_derive_parent_ref(r.supplier_id, r.supplier_reference, r.raw_data));
  v_pres   := public.fn_standardize_parent(r.supplier_id, v_parent);
  RETURN jsonb_build_object('success', COALESCE((v_pres->>'success')::boolean, false),
    'adapted', 'bronze->silver', 'staging_id', p_staging_id, 'variant', v_vres, 'parent', v_pres);
END;
$function$
