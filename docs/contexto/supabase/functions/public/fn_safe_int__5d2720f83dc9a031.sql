CREATE OR REPLACE FUNCTION public.fn_safe_int(p text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE v numeric;
BEGIN
  IF p IS NULL OR TRIM(p)='' THEN RETURN NULL; END IF;
  v := replace(TRIM(p), ',', '.')::numeric;
  RETURN trunc(v)::integer;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$function$
