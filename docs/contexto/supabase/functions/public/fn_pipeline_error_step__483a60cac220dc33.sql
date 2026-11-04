CREATE OR REPLACE FUNCTION public.fn_pipeline_error_step(p_etapa integer, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE import_pipeline_steps 
    SET status = 'error', error_message = p_error
    WHERE etapa = p_etapa;
END;
$function$
