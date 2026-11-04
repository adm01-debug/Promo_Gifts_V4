CREATE OR REPLACE FUNCTION public.get_edge_anon_key()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT '[REDACTED_JWT]'::text;
$function$
