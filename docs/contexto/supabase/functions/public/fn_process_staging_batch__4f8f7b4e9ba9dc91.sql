CREATE OR REPLACE FUNCTION public.fn_process_staging_batch(p_batch_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_std jsonb;
BEGIN
  IF p_supplier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'supplier_id_obrigatorio');
  END IF;
  -- ADAPTADO 2026-06-05: Bronze→Silver via pipeline canônico. Promoção Silver→Gold = cron oficial.
  v_std := public.fn_standardize_supplier(p_supplier_id, NULL);
  RETURN jsonb_build_object('success', true, 'adapted', 'bronze->silver',
    'batch_id', p_batch_id, 'supplier_id', p_supplier_id, 'standardize', v_std);
END;
$function$
