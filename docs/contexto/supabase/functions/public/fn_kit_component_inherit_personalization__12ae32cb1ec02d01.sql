CREATE OR REPLACE FUNCTION public.fn_kit_component_inherit_personalization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Só atua se o INSERT veio com allows_personalization NULL
  IF NEW.allows_personalization IS NULL AND NEW.component_type_code IS NOT NULL THEN
    SELECT kct.is_personalizable_by_default 
      INTO NEW.allows_personalization
    FROM public.kit_component_types kct 
    WHERE kct.code = NEW.component_type_code;
  END IF;
  RETURN NEW;
END;
$function$
