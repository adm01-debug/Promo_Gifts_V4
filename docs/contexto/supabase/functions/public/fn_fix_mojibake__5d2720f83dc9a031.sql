CREATE OR REPLACE FUNCTION public.fn_fix_mojibake(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  IF p !~ '[ÃÂ]' THEN RETURN p; END IF;
  BEGIN
    v := convert_from(convert_to(p,'WIN1252'),'UTF8');
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    RETURN p;
  END;
END $function$
