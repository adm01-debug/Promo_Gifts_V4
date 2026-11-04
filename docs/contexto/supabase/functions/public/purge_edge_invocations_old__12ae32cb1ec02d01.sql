CREATE OR REPLACE FUNCTION public.purge_edge_invocations_old()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.edge_function_invocations 
  WHERE invoked_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$
