CREATE OR REPLACE FUNCTION public.marcar_alertas_notificados_bitrix(p_ids uuid[], p_bitrix_task_id character varying DEFAULT NULL::character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE spot_price_change_log
    SET 
        bitrix_notificado = TRUE,
        bitrix_notificado_em = NOW(),
        bitrix_task_id = p_bitrix_task_id
    WHERE id = ANY(p_ids);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$
