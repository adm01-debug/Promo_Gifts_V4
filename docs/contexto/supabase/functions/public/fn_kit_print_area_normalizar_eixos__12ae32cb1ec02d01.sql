CREATE OR REPLACE FUNCTION public.fn_kit_print_area_normalizar_eixos()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_temp numeric;
BEGIN
  IF NEW.max_width IS NOT NULL THEN
    NEW.max_width := ROUND(NEW.max_width::numeric, 2);
  END IF;
  IF NEW.max_height IS NOT NULL THEN
    NEW.max_height := ROUND(NEW.max_height::numeric, 2);
  END IF;

  IF NEW.max_height IS NOT NULL AND NEW.max_width IS NOT NULL
     AND NEW.max_height > NEW.max_width THEN
    v_temp        := NEW.max_width;
    NEW.max_width  := NEW.max_height;
    NEW.max_height := v_temp;
  END IF;

  RETURN NEW;
END
$function$
