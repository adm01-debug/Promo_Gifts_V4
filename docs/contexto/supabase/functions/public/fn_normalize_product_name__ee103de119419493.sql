CREATE OR REPLACE FUNCTION public.fn_normalize_product_name(p_nome text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
    SELECT UPPER(
               TRIM(
                   REGEXP_REPLACE(p_nome, '\s+', ' ', 'g')
               )
           )
$function$
