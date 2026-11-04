CREATE OR REPLACE FUNCTION public.block_ip_temp(_ip text, _reason text, _duration_minutes integer DEFAULT 60)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.ip_access_control (ip_address, list_type, reason, expires_at, created_by)
  VALUES (_ip::inet, 'blocklist', _reason, now() + (_duration_minutes || ' minutes')::interval, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
