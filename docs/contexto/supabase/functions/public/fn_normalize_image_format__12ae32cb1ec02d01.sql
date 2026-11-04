CREATE OR REPLACE FUNCTION public.fn_normalize_image_format()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v text;
BEGIN
  IF NEW.format IS NOT NULL THEN
    v := lower(NEW.format);
    v := regexp_replace(v, '^.*/', '');     -- remove prefixo mime (até a última '/')
    v := substring(v from '[a-z0-9]+');     -- 1a sequência alfanumérica (ou NULL)
    IF v = 'jpg' THEN v := 'jpeg'; END IF;  -- canonicaliza
    NEW.format := v;                        -- NULL se nada alfanumérico (fail-open)
  END IF;
  RETURN NEW;
END;
$function$
