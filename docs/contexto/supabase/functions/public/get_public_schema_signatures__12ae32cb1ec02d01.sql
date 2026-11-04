CREATE OR REPLACE FUNCTION public.get_public_schema_signatures()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_object_agg(table_name, sig), '{}'::jsonb)
  FROM (
    SELECT 
      table_name,
      string_agg(column_name || ':' || data_type, ',' ORDER BY column_name) AS sig
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT LIKE '_backup_%'
      AND table_name NOT LIKE 'pg_%'
    GROUP BY table_name
  ) t;
$function$
