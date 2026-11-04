CREATE OR REPLACE FUNCTION public.fn_pipeline_status()
 RETURNS TABLE(total_etapas bigint, concluidas bigint, em_andamento bigint, com_erro bigint, pendentes bigint, pct_completo numeric, proxima_etapa integer, proxima_titulo character varying)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE s.status = 'done')::BIGINT,
        COUNT(*) FILTER (WHERE s.status = 'running')::BIGINT,
        COUNT(*) FILTER (WHERE s.status = 'error')::BIGINT,
        COUNT(*) FILTER (WHERE s.status = 'pending')::BIGINT,
        ROUND(100.0 * COUNT(*) FILTER (WHERE s.status = 'done') / COUNT(*), 1),
        (SELECT MIN(s2.etapa) FROM import_pipeline_steps s2 WHERE s2.status IN ('pending', 'error')),
        (SELECT s3.titulo FROM import_pipeline_steps s3 WHERE s3.status IN ('pending', 'error') ORDER BY s3.etapa LIMIT 1)
    FROM import_pipeline_steps s;
END;
$function$
