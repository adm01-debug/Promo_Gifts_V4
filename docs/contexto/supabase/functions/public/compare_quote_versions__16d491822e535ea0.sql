CREATE OR REPLACE FUNCTION public.compare_quote_versions(_quote_id uuid, _version_a integer, _version_b integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT public.compare_quote_snapshots(_quote_id, _version_a, _version_b); $function$
