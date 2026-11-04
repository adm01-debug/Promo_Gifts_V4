CREATE OR REPLACE FUNCTION public.fn_spot_vimeo_daily_sync(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM fn_spot_enqueue_vimeo_eu(p_items);
  RETURN jsonb_build_object(
    'enfileirados',        v_result.enfileirados,
    'ja_existentes',       v_result.ja_existentes,
    'ref_nao_encontrado',  v_result.ref_nao_encontrado,
    'timestamp',           now()
  );
END;
$function$
