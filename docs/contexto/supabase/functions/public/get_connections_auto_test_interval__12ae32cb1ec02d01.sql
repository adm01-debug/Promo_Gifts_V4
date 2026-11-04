CREATE OR REPLACE FUNCTION public.get_connections_auto_test_interval()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'cron'
AS $function$
DECLARE
  s text; m text;
BEGIN
  SELECT schedule INTO s FROM cron.job WHERE jobname = 'connections-auto-test' LIMIT 1;
  IF s IS NULL THEN RETURN NULL; END IF;
  m := split_part(s, ' ', 1);
  IF m LIKE '*/%' THEN RETURN NULLIF(substring(m FROM 3), '')::int;
  ELSIF m ~ '^[0-9]+$' THEN RETURN 60;
  END IF;
  RETURN NULL;
END;
$function$
