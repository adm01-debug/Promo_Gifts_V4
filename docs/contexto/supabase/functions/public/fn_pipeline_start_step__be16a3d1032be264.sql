CREATE OR REPLACE FUNCTION public.fn_pipeline_start_step(p_etapa integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE import_pipeline_steps 
    SET status = 'running', started_at = now()
    WHERE etapa = p_etapa AND status IN ('pending', 'error');
END;
$function$
