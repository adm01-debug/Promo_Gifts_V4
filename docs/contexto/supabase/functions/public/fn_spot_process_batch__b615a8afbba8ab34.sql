CREATE OR REPLACE FUNCTION public.fn_spot_process_batch(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sup uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_ref text; v_ok int := 0; v_err int := 0; v_errs jsonb := '[]'::jsonb;
BEGIN
  FOR v_ref IN
    SELECT DISTINCT raw_data->>'ProdReference' rr
    FROM public.supplier_products_raw
    WHERE supplier_id=v_sup AND raw_data->>'ProdReference' IS NOT NULL
    ORDER BY rr OFFSET p_offset LIMIT p_limit
  LOOP
    BEGIN
      PERFORM public.fn_spot_process_ref(v_ref); v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1; v_errs := v_errs || jsonb_build_object('ref',v_ref,'erro',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('processados',v_ok,'erros',v_err,'detalhe_erros',v_errs,'offset',p_offset,'limit',p_limit);
END $function$
