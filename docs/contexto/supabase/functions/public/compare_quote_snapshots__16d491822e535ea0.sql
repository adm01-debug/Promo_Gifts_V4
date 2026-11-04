CREATE OR REPLACE FUNCTION public.compare_quote_snapshots(_quote_id uuid, _version_a integer, _version_b integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH va AS (SELECT snapshot FROM public.quote_versions WHERE quote_id = _quote_id AND version_number = _version_a),
       vb AS (SELECT snapshot FROM public.quote_versions WHERE quote_id = _quote_id AND version_number = _version_b)
  SELECT jsonb_build_object('a', (SELECT snapshot FROM va), 'b', (SELECT snapshot FROM vb));
$function$
