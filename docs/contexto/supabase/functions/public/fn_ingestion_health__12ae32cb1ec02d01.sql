CREATE OR REPLACE FUNCTION public.fn_ingestion_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'checked_at', now(),
    'por_fornecedor_feed', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'supplier_code', supplier_code, 'feed', feed, 'ultimo_status', status,
               'ultimo_run', started_at,
               'idade_horas', round((extract(epoch from (now()-started_at))/3600)::numeric,2),
               'fetched', fetched, 'upserted', upserted, 'errors', errors) order by supplier_code, feed), '[]'::jsonb)
      from (select distinct on (supplier_code,feed) supplier_code,feed,status,started_at,fetched,upserted,errors
            from ingestion_run_log order by supplier_code,feed,started_at desc) ult),
    'corridas_24h', (select count(*) from ingestion_run_log where started_at > now()-interval '24 hours'),
    'falhas_24h',   (select count(*) from ingestion_run_log where started_at > now()-interval '24 hours'
                                                                and status in ('failed','aborted_rate_limit')))
$function$
