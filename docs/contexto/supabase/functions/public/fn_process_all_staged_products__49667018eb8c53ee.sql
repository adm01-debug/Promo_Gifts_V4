CREATE OR REPLACE FUNCTION public.fn_process_all_staged_products(p_supplier_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v jsonb;
BEGIN
  IF p_supplier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'supplier_id_obrigatorio');
  END IF;
  v := public.fn_standardize_supplier(p_supplier_id, p_limit);   -- Bronze→Silver
  RETURN jsonb_build_object('success', true, 'adapted', 'bronze->silver', 'standardize', v);
END;
$function$
