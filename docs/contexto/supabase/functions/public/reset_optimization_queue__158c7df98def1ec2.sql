CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  affected integer;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _only_running THEN
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL
     WHERE status = 'running';
  ELSE
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL, finished_at = NULL, error = NULL
     WHERE status IN ('running', 'failed', 'blocked');
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$
