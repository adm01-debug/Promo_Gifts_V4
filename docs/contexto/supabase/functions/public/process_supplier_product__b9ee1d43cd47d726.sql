CREATE OR REPLACE FUNCTION public.process_supplier_product(p_supplier_id uuid, p_raw_data jsonb, p_supplier_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'success', false, 'deprecated', true,
    'error', 'process_supplier_product descontinuada: use o pipeline Medallion (supplier_products_raw -> fn_standardize_supplier -> fn_promote_supplier)',
    'supplier_id', p_supplier_id, 'supplier_reference', p_supplier_reference);
END;
$function$
