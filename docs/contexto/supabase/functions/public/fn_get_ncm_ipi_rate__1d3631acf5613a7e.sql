CREATE OR REPLACE FUNCTION public.fn_get_ncm_ipi_rate(p_ncm_code text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT nc.ipi_rate
  FROM public.ncm_codes nc
  WHERE nc.code = TRIM(p_ncm_code)
    AND nc.is_active = TRUE
    AND nc.ipi_rate IS NOT NULL
  LIMIT 1;
$function$
