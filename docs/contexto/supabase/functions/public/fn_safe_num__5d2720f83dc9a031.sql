CREATE OR REPLACE FUNCTION public.fn_safe_num(p text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p IS NULL OR TRIM(p)='' THEN RETURN NULL; END IF;
  RETURN replace(TRIM(p), ',', '.')::numeric;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$function$
