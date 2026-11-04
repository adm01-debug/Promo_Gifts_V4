CREATE OR REPLACE FUNCTION public.strip_html(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remover tags HTML
  RETURN TRIM(REGEXP_REPLACE(input_text, '<[^>]+>', ' ', 'g'));
END;
$function$
