CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'cotacao'
  );
$function$
