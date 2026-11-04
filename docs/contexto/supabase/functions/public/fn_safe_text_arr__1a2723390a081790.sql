CREATE OR REPLACE FUNCTION public.fn_safe_text_arr(p_value text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.fn_safe_jsonb_arr(p_value) IS NULL THEN NULL
    ELSE (SELECT array_agg(e #>> '{}') FROM jsonb_array_elements(public.fn_safe_jsonb_arr(p_value)) e)
  END;
$function$
