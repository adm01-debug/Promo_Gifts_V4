CREATE OR REPLACE FUNCTION public.unblock_ip(_ip text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted int;
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.ip_access_control WHERE ip_address = _ip::inet AND list_type = 'blocklist';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $function$
