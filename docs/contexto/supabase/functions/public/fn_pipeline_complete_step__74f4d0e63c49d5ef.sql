CREATE OR REPLACE FUNCTION public.fn_pipeline_complete_step(p_etapa integer, p_resultado jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE import_pipeline_steps 
    SET status = 'done', completed_at = now(), resultado = p_resultado
    WHERE etapa = p_etapa;
END;
$function$
