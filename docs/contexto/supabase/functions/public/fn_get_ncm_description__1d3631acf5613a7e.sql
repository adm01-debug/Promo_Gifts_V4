CREATE OR REPLACE FUNCTION public.fn_get_ncm_description(p_ncm_code text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT nc.description
  FROM public.ncm_codes nc
  WHERE nc.code = TRIM(p_ncm_code)
    AND nc.is_active = TRUE
  LIMIT 1;
$function$
