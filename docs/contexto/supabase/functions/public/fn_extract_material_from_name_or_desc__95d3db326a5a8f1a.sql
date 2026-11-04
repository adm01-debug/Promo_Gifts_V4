CREATE OR REPLACE FUNCTION public.fn_extract_material_from_name_or_desc(p_name text, p_description text DEFAULT NULL::text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN array_length(public.fn_extract_material_from_name(p_name), 1) > 0
      THEN public.fn_extract_material_from_name(p_name)
    ELSE
      public.fn_extract_material_from_name(
        COALESCE(p_description, '')
      )
  END;
$function$
