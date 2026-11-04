CREATE OR REPLACE FUNCTION public.fn_cleanup_webhook_dispatcher_log()
 RETURNS TABLE(deleted_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version=2026-07-10-dispatcher-log-cleanup-v1 ANTI-REGRESSÃO
-- Remove entradas de webhook_dispatcher_log com mais de 90 dias
DECLARE v_deleted bigint;
BEGIN
  DELETE FROM public.webhook_dispatcher_log
  WHERE fired_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT v_deleted;
END;
$function$
