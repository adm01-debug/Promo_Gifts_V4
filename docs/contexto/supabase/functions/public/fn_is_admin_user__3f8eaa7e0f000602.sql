CREATE OR REPLACE FUNCTION public.fn_is_admin_user(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin_or_above(COALESCE(p_user_id, auth.uid()));
$function$
