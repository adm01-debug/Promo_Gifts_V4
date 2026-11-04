CREATE OR REPLACE FUNCTION public.validate_edge_functions_base_url(_environment text)
 RETURNS TABLE(ok boolean, resolved_url text, expected_pattern text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _pattern text;
BEGIN
  _url := public.get_edge_functions_base_url();

  _pattern := CASE lower(coalesce(_environment, ''))
    WHEN 'prod' THEN '^https://doufsxqlfjyuvxuezpln\.supabase\.co$'
    WHEN 'stage' THEN '^https://[a-z0-9-]+\.supabase\.co$'
    WHEN 'dev' THEN '^https://[a-z0-9-]+\.supabase\.co$'
    ELSE '^https://[a-z0-9-]+\.supabase\.co$'
  END;

  RETURN QUERY SELECT (_url ~ _pattern), _url, _pattern;
END;
$function$
