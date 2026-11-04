CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    retention_days INT := 90;
    row_limit      INT := 100000;
    current_count  INT;
BEGIN
    -- audit_log movida para archive em 2026-06-15; nunca acumulou dados
    DELETE FROM archive.audit_log
     WHERE created_at < now() - (retention_days || ' days')::interval;
    SELECT count(*) INTO current_count FROM archive.audit_log;
    IF current_count > row_limit THEN
        DELETE FROM archive.audit_log
         WHERE id IN (
             SELECT id FROM archive.audit_log ORDER BY created_at ASC
             LIMIT (current_count - row_limit)
         );
    END IF;
END;
$function$
